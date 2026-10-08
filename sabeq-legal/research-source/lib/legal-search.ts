import { getD1 } from "@/db";
import { attachOfficialVerification, reviewedChunkIds, type SourceVerification } from "./official-legislation";

export type LegalEvidence = {
  chunkId?: number;
  documentId: number;
  title: string;
  category: string;
  lawNumber: number | null;
  lawYear: number | null;
  reference: string | null;
  text: string;
  sourceUrl: string;
  officialSource: string;
  sourceType: string;
  documentType: string;
  qualityScore: number;
  libraryUpdatedAt?: string;
  verification?: SourceVerification;
};

type EvidenceRow = LegalEvidence & { searchTerms: string; documentSearchText: string };

const arabicDigits = new Map(Array.from("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹").map((digit, index) => [digit, String(index % 10)]));
const substitutions: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ؤ": "و", "ئ": "ي", "ة": "ه" };
const stopWords = new Set(["في", "من", "على", "علي", "الي", "عن", "ما", "هو", "هي", "انا", "انني", "اريد", "اطالب", "لدي", "عندي", "هل", "لم", "لا", "بعد", "قبل", "الكويت", "بالكويت", "قضيه", "the", "and", "for", "with", "law", "قانون", "ایک", "کے", "کی", "کا", "میں", "اور"]);
const legalSynonyms: Record<string, string[]> = {
  labor: ["العمل", "عمال"], employment: ["العمل", "عمال"], worker: ["العامل"],
  civil: ["المدني"], commercial: ["التجاره"], criminal: ["الجزاء", "الجرائم"],
  constitution: ["الدستور"], constitutional: ["الدستوريه"], rent: ["الايجار"], lease: ["الايجار"],
  company: ["الشركات"], companies: ["الشركات"], family: ["الاحوال", "الشخصيه"], appeal: ["الاستيناف"],
  cassation: ["التمييز"], evidence: ["الاثبات"], procedure: ["المرافعات"], bankruptcy: ["الافلاس"],
  ملازمت: ["العمل", "عمال"], مزدور: ["العامل", "العمل"], دیوانی: ["المدني"], تجارتی: ["التجاره"],
  فوجداری: ["الجزاء", "الجرائم"], آئین: ["الدستور"], کرایہ: ["الايجار"], کمپنی: ["الشركات"],
  خاندان: ["الاحوال", "الشخصيه"], اپیل: ["الاستيناف"], ثبوت: ["الاثبات"],
};

export function normalizeLegalText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[٠-٩۰-۹]/g, (digit) => arabicDigits.get(digit) || digit)
    .replace(/[أإآٱىؤئة]/g, (letter) => substitutions[letter] || letter)
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function queryTokens(query: string) {
  const base = normalizeLegalText(query).split(" ").filter((token) => token.length >= 2 && !stopWords.has(token));
  const expanded = base.flatMap((token) => {
    // Arabic particles can hide an otherwise exact legal term (بالعامل، وللشركة).
    const withoutParticle = token.replace(/^(?:وال|بال|فال|كال|ولل|فلل|لل)/u, "ال");
    return [token, withoutParticle, ...(legalSynonyms[token] || [])];
  });
  return Array.from(new Set(expanded.map(normalizeLegalText).filter(Boolean))).slice(0, 16);
}

// Keep a verbatim window around the best matching paragraph, not always the
// first page of a long extracted chunk. Offsets refer to the original text.
export function relevantExcerpt(text: string, query: string, size = 1800) {
  if (text.length <= size) return text;
  const tokens = queryTokens(query);
  let bestStart = 0, bestScore = -1;
  for (let start = 0; start < text.length; start += 600) {
    const window = normalizeLegalText(text.slice(start, start + size));
    const score = tokens.reduce((sum, token, index) => sum + (window.includes(token) ? 10 - index : 0), 0);
    if (score > bestScore) { bestStart = start; bestScore = score; }
  }
  return text.slice(bestStart, bestStart + size);
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function searchLegalEvidence(query: string, limit = 8, kind?: "legislation" | "judgment", cassationOnly = false): Promise<LegalEvidence[]> {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const clauses = tokens.map(() => "(c.search_terms LIKE ? OR d.search_text LIKE ?)").join(" OR ");
  const bindings = tokens.flatMap((token) => [`%${token.slice(0, 36)}%`, `%${token.slice(0, 36)}%`]);
  const judgment = "(d.title LIKE 'احكام%' OR d.title LIKE 'أحكام%' OR d.title LIKE '%مبادئ%التمييز%' OR d.document_type LIKE '%قضائ%' OR d.document_type LIKE 'حكم%')";
  const kindClause = kind ? ` AND ${kind === "legislation" ? "NOT " : ""}${judgment}${cassationOnly ? " AND (d.title LIKE '%تمييز%' OR d.document_type LIKE '%تمييز%' OR c.reference LIKE '%تمييز%')" : ""}` : "";
  // For intake, match the actual paragraph before the document metadata. Do not
  // let a high OCR score displace a relevant paragraph from the candidate set.
  const order = tokens.map((_, index) => `(CASE WHEN c.search_terms LIKE ? THEN ${index < 2 ? 16 : 4} ELSE 0 END + CASE WHEN d.search_text LIKE ? THEN 1 ELSE 0 END)`).join(" + ");
  const rows = await getD1()
    .prepare(
      `SELECT c.id AS chunkId, c.document_id AS documentId, d.title, d.category, d.document_type AS documentType, d.law_number AS lawNumber,
              d.law_year AS lawYear, c.reference, c.text, c.search_terms AS searchTerms,
              d.search_text AS documentSearchText, d.source_url AS sourceUrl,
              d.official_source AS officialSource, d.source_type AS sourceType,
              c.quality_score AS qualityScore, d.updated_at AS libraryUpdatedAt
       FROM legal_chunks c
       JOIN legal_documents d ON d.id = c.document_id
       WHERE c.verified = 1 AND d.has_verified_text = 1 AND d.status = 'ready' AND (${judgment} OR c.id IN (${reviewedChunkIds.map(Number).join(",") || "NULL"}))${kindClause} AND (${clauses})
       ORDER BY (${order}) DESC, c.quality_score DESC, c.id ASC
       LIMIT 120`,
    )
    .bind(...bindings, ...bindings)
    .all<EvidenceRow>();

  const ranked = (rows.results || []).map((row) => {
    const title = normalizeLegalText(row.title);
    const chunk = normalizeLegalText(`${row.searchTerms} ${row.text}`);
    const metadata = normalizeLegalText(row.documentSearchText);
    let score = row.qualityScore / 100;
    for (const [index, token] of tokens.entries()) {
      if (title.includes(token)) score += 3;
      if (metadata.includes(token)) score += 1;
      if (chunk.includes(token)) score += index < 2 ? 16 : 6;
    }
    // Prefer a dedicated enactment over a very broad multi-law compilation
    // when both match the subject. Extraction quality is not legal authority.
    if (kind === "legislation" && row.documentType === "قانون") score += 5;
    return { row, score };
  }).sort((a, b) => b.score - a.score);

  const perDocument = new Map<number, number>();
  const evidence: LegalEvidence[] = [];
  for (const { row } of ranked) {
    const checked = attachOfficialVerification(row);
    // OCR quality alone does not establish the identity of a statutory article.
    // Keep the old catalogue intact, but only source-reviewed statute passages
    // can become grounds in the assistant or a generated pleading.
    if (!isJudgmentEvidence(row) && !checked.verification) continue;
    const count = perDocument.get(row.documentId) || 0;
    if (count >= 2) continue;
    perDocument.set(row.documentId, count + 1);
    evidence.push({
      chunkId: row.chunkId,
      documentId: row.documentId,
      title: checked.title,
      category: row.category,
      lawNumber: checked.lawNumber,
      lawYear: checked.lawYear,
      reference: row.reference,
      text: relevantExcerpt(row.text, query),
      sourceUrl: safeUrl(row.sourceUrl),
      officialSource: row.officialSource,
      sourceType: row.sourceType,
      documentType: row.documentType,
      qualityScore: row.qualityScore,
      libraryUpdatedAt: row.libraryUpdatedAt,
      verification: checked.verification,
    });
    if (evidence.length >= Math.max(1, Math.min(limit, 12))) break;
  }
  return evidence;
}

export function isCassationEvidence(item: LegalEvidence) {
  return normalizeLegalText(`${item.title} ${item.documentType} ${item.reference || ""}`).includes("تمييز");
}

export function isJudgmentEvidence(item: LegalEvidence) {
  const title = normalizeLegalText(item.title), type = normalizeLegalText(item.documentType);
  return /^احكام\b/u.test(title) || title.startsWith("احكام ") || (title.includes("مبادي") && title.includes("تمييز")) || /قضاي|^حكم/.test(type);
}

// Query only the shared legal corpus. Private case archives/service_records
// are deliberately outside this retrieval boundary.
export async function searchIntakeLibrary(queries: string[]) {
  const unique = [...new Set(queries)].slice(0, 3);
  const groups = await Promise.all((['legislation', 'judgment'] as const).map(async kind => {
    const sets = await Promise.all(unique.map(query => searchLegalEvidence(query, 3, kind, kind === "judgment")));
    const seen = new Set<string>();
    const perDocument = new Map<number, number>();
    // Round-robin keeps both the classified topic and the visitor's specific
    // request represented instead of sorting all results by OCR quality.
    const combined: LegalEvidence[] = [];
    for (let i = 0; i < 3; i++) for (const set of sets) {
      const item = set[i]; if (!item) continue;
      const key = `${item.documentId}:${item.chunkId || item.reference || item.text.slice(0, 80)}`;
      if (!seen.has(key) && (perDocument.get(item.documentId) || 0) < 2) { seen.add(key); perDocument.set(item.documentId, (perDocument.get(item.documentId) || 0) + 1); combined.push(item); }
    }
    return combined.slice(0, 3);
  }));
  return groups.flat();
}

export async function searchCassationEvidenceAcross(queries: string[], limit = 6) {
  const sets = await Promise.all([...new Set(queries.filter(Boolean))].slice(0, 5).map(query => searchLegalEvidence(query, 3, "judgment", true)));
  const found = new Map<string, LegalEvidence>();
  for (let i = 0; i < 3; i++) for (const set of sets) {
    const item = set[i];
    if (item && isJudgmentEvidence(item) && isCassationEvidence(item)) found.set(`${item.documentId}:${item.chunkId}`, item);
  }
  return [...found.values()].slice(0, Math.max(1, Math.min(limit, 8)));
}

/** Re-read only verified PUBLIC corpus chunks; never trust a transferred quote. */
export async function readHandoffEvidence(value: unknown): Promise<LegalEvidence[]> {
  let raw: unknown = value;
  if (typeof value === "string") { try { raw = JSON.parse(value.slice(0, 1200)); } catch { return []; } }
  const ids = Array.isArray(raw) ? [...new Set(raw.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 6) : [];
  if (!ids.length) return [];
  const rows = await getD1().prepare(`SELECT c.id AS chunkId, c.document_id AS documentId, d.title, d.category, d.document_type AS documentType, d.law_number AS lawNumber, d.law_year AS lawYear, c.reference, c.text, d.source_url AS sourceUrl, d.official_source AS officialSource, d.source_type AS sourceType, c.quality_score AS qualityScore, d.updated_at AS libraryUpdatedAt FROM legal_chunks c JOIN legal_documents d ON d.id=c.document_id WHERE c.verified=1 AND d.has_verified_text=1 AND d.status='ready' AND c.id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<LegalEvidence>();
  return (rows.results || []).map((row: LegalEvidence) => attachOfficialVerification({ ...row, sourceUrl: safeUrl(row.sourceUrl) })).filter((row:LegalEvidence)=>isJudgmentEvidence(row)||Boolean(row.verification)).map((row:LegalEvidence)=>({...row,text:row.text.slice(0,1800)}));
}

export async function searchLegalEvidenceAcross(queries: string[], limit = 10) {
  const uniqueQueries = Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean))).slice(0, 16);
  const resultSets = await Promise.all(uniqueQueries.map((query) => searchLegalEvidence(query, Math.min(6, limit))));
  const unique = new Map<string, LegalEvidence>();
  for (const evidence of resultSets.flat()) {
    const key = `${evidence.documentId}:${evidence.reference || evidence.text.slice(0, 80)}`;
    if (!unique.has(key)) unique.set(key, evidence);
  }
  // Preserve query relevance; OCR quality is not topical relevance.
  return Array.from(unique.values()).slice(0, Math.max(1, Math.min(limit, 12)));
}

export async function searchLegalDocuments(query: string, limit = 12) {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const clauses = tokens.map(() => "(search_text LIKE ? OR title LIKE ?)").join(" OR ");
  const bindings = tokens.flatMap((token) => [`%${token.slice(0, 36)}%`, `%${token.slice(0, 36)}%`]);
  const rows = await getD1()
    .prepare(
      `SELECT id, title, category, law_number AS lawNumber, law_year AS lawYear,
              summary, source_url AS sourceUrl, official_source AS officialSource,
              source_type AS sourceType, has_verified_text AS hasVerifiedText
       FROM legal_documents
       WHERE ${clauses}
       ORDER BY has_verified_text DESC, law_year DESC, id ASC
       LIMIT ?`,
    )
    .bind(...bindings, Math.max(1, Math.min(limit, 20)))
    .all<{ id: number; title: string; category: string; lawNumber: number | null; lawYear: number | null; summary: string; sourceUrl: string; officialSource: string; sourceType: string; hasVerifiedText: number }>();
  return (rows.results || []).map((row) => ({ ...row, sourceUrl: safeUrl(row.sourceUrl), hasVerifiedText: Boolean(row.hasVerifiedText) }));
}

export function formatEvidence(evidence: LegalEvidence[]) {
  return evidence.map((item, index) => {
    const number = item.lawNumber && item.lawYear ? `رقم ${item.lawNumber} لسنة ${item.lawYear}` : "";
    return `[م${index + 1}]\nالعنوان: ${item.title}${number ? ` (${number})` : ""}\nنوع المصدر: ${isJudgmentEvidence(item) && isCassationEvidence(item) ? "مبدأ/حكم تمييز" : item.documentType || "تشريع"}\nالتصنيف: ${item.category}\nالمرجع الداخلي: ${item.reference || "غير محدد"}\nالجهة/المصدر: ${item.officialSource}\nرابط الأصل: ${item.sourceUrl || "ملف مفهرس من المكتبة المرفوعة؛ لا يتوفر رابط عام للأصل"}\nتاريخ تحديث الفهرسة (ليس إثبات السريان): ${item.libraryUpdatedAt || "غير متاح"}\n${item.verification ? `المادة المعتمدة: ${item.verification.articleNumber}. القانون صاحب المادة: ${item.lawNumber}/${item.lawYear}. النص المنشور في: ${item.verification.sourceLawNumber}/${item.verification.sourceLawYear}. صفحة المصدر: ${item.verification.page}. تاريخ مطابقة النص: ${item.verification.checkedAt}. الحالة: مطابقة المصدر المنشور؛ اكتمال التعديلات والانطباق الزمني يحتاجان مراجعة.\n` : ""}درجة الجودة: ${item.qualityScore}/100\nالنص الموثق:\n${item.text}`;
  }).join("\n\n---\n\n");
}
