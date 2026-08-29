import { getD1 } from "../db";
import { toD1LikePattern } from "./d1-like";
import {
  cleanArabicLegalText,
  inspectLegalText,
  isUsableIndexedLegalText,
  legalTextFingerprint,
  needsLegalTextFallback,
} from "./legal-text";

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const NON_WORD = /[^a-z0-9\u0621-\u063a\u0641-\u064a]+/gi;
const STOP_WORDS = new Set([
  "في", "من", "على", "الى", "عن", "او", "و", "ما", "هو", "هي",
  "هذا", "هذه", "ذلك", "تلك", "مع", "بشان", "قانون", "القانون",
  "ماده", "الماده",
]);

export type LegalSearchResult = {
  id: number;
  documentId: number;
  chunkIndex: number;
  reference: string | null;
  excerpt: string;
  title: string;
  category: string;
  documentType: string;
  lawNumber: number | null;
  lawYear: number | null;
  sourceUrl: string;
  sourcePage: string;
  officialSource: string;
  summary: string;
  pageCount: number | null;
  articleCount: number;
  sourceType: "official_moj" | "user_library" | "unknown";
  score: number;
  qualityScore: number;
  qualityLabel: "موثوقية مرتفعة" | "موثوقية متوسطة" | "يحتاج مراجعة الأصل";
  amendmentAlert: boolean;
};

type RawSearchRow = {
  id: number;
  document_id: number;
  chunk_index: number;
  reference: string | null;
  text: string;
  title: string;
  category: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  source_url: string;
  source_page: string;
  official_source: string;
  summary: string;
  page_count: number | null;
  article_count: number;
  source_type: string | null;
  transcript_indexed: number;
  score: number;
};

export function normalizeArabic(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(ARABIC_DIACRITICS, "")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function legalQueryTokens(value: string): string[] {
  const normalized = normalizeArabic(value);
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of normalized.split(" ")) {
    if (token.length < 2 || STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
    if (tokens.length === 10) break;
  }
  return tokens;
}

function makeExcerpt(text: string, tokens: string[]): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 1100) return compact;

  const lower = compact.toLowerCase();
  let index = -1;
  for (const token of tokens) {
    index = lower.indexOf(token.toLowerCase());
    if (index >= 0) break;
  }
  if (index < 0) return `${compact.slice(0, 1050)}…`;

  const start = Math.max(0, index - 310);
  const end = Math.min(compact.length, start + 1050);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

function qualityFor(row: RawSearchRow, excerpt: string, usedSummary: boolean) {
  const isOfficial = row.source_type === "official_moj";
  const wasIndexedFromPublicTranscript = Number(row.transcript_indexed) === 1;
  let score = isOfficial ? (wasIndexedFromPublicTranscript ? 82 : 94) : 80;
  const noise = inspectLegalText(excerpt);
  if (noise.replacementCharacters > 0) score -= 28;
  if (noise.latinTokens >= 8) score -= 32;
  else if (noise.latinTokens >= 3) score -= 20;
  if (noise.repeatedArabicRuns >= 2) score -= 14;
  if (usedSummary) score -= 6;
  if (excerpt.length < 180) score -= 8;
  if (wasIndexedFromPublicTranscript) score = Math.min(score, 86);
  score = Math.max(45, Math.min(98, score));
  const label =
    score >= 88
      ? "موثوقية مرتفعة"
      : score >= 68
        ? "موثوقية متوسطة"
        : "يحتاج مراجعة الأصل";
  return { score, label } as const;
}

export async function searchLegalCorpus(options: {
  query: string;
  category?: string;
  documentType?: string;
  year?: number | null;
  limit?: number;
}): Promise<LegalSearchResult[]> {
  const query = options.query.trim();
  const tokens = legalQueryTokens(query);
  if (!query || !tokens.length) return [];

  const db = getD1();
  const scoreParts: string[] = [];
  const scoreBinds: string[] = [];
  const searchParts: string[] = [];
  const searchBinds: string[] = [];

  for (const token of tokens) {
    const value = toD1LikePattern(token);
    if (!value) continue;
    scoreParts.push(
      "(CASE WHEN d.search_text LIKE ? ESCAPE '\\' THEN 5 ELSE 0 END)",
      "(CASE WHEN c.search_terms LIKE ? ESCAPE '\\' THEN 24 ELSE 0 END)",
    );
    scoreBinds.push(value, value);
    searchParts.push(
      "d.search_text LIKE ? ESCAPE '\\'",
      "c.search_terms LIKE ? ESCAPE '\\'",
    );
    searchBinds.push(value, value);
  }

  if (!searchParts.length) return [];

  const compactQuery = normalizeArabic(query);
  const phrasePattern = toD1LikePattern(query);
  if (phrasePattern) {
    scoreParts.push("(CASE WHEN c.text LIKE ? ESCAPE '\\' THEN 36 ELSE 0 END)");
    scoreBinds.push(phrasePattern);
  }

  const filters = [`(${searchParts.join(" OR ")})`];
  const filterBinds: Array<string | number> = [...searchBinds];
  if (options.category) {
    filters.push("d.category = ?");
    filterBinds.push(options.category);
  }
  if (options.documentType) {
    filters.push("d.document_type = ?");
    filterBinds.push(options.documentType);
  }
  if (options.year) {
    filters.push("d.law_year = ?");
    filterBinds.push(options.year);
  }

  const requestedLimit = Number(options.limit ?? 24);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(50, Math.floor(requestedLimit)))
    : 24;
  const sql = `
    SELECT
      c.id, c.document_id, c.chunk_index, c.reference, c.text,
      d.title, d.category, d.document_type, d.law_number, d.law_year,
      d.source_url, d.source_page, d.official_source, d.summary,
      d.page_count, d.article_count,
      COALESCE(
        (SELECT CASE
          WHEN SUM(CASE WHEN s.source_type = 'official_moj' THEN 1 ELSE 0 END) > 0
          THEN 'official_moj'
          WHEN COUNT(*) > 0 THEN 'user_library'
          ELSE 'unknown'
        END FROM legal_document_sources s WHERE s.document_id = d.id),
        'unknown'
      ) AS source_type,
      EXISTS(
        SELECT 1 FROM legal_document_sources s
        WHERE s.document_id = d.id AND s.source_type = 'public_transcript'
      ) AS transcript_indexed,
      (${scoreParts.join(" + ")}) AS score
    FROM legal_chunks c
    JOIN legal_documents d ON d.id = c.document_id
    WHERE ${filters.join(" AND ")}
    ORDER BY score DESC, COALESCE(d.law_year, 0) DESC, c.id ASC
    LIMIT ?
  `;

  const response = await db
    .prepare(sql)
    .bind(...scoreBinds, ...filterBinds, Math.max(limit * 12, 180))
    .all<RawSearchRow>();

  const perDocument = new Map<number, number>();
  const seenPassages = new Set<string>();
  const results: LegalSearchResult[] = [];
  for (const row of response.results ?? []) {
    // Bad OCR may match a query by accident. It must not surface in search,
    // analysis, or memo generation just because its title is official.
    if (!isUsableIndexedLegalText(row.text)) continue;
    const fingerprint = legalTextFingerprint(row.text);
    const passageKey = `${row.document_id}:${fingerprint}`;
    if (!fingerprint || seenPassages.has(passageKey)) continue;
    seenPassages.add(passageKey);

    const seen = perDocument.get(row.document_id) ?? 0;
    if (seen >= 3) continue;
    perDocument.set(row.document_id, seen + 1);

    const rawExcerpt = makeExcerpt(row.text, [query, compactQuery, ...tokens]);
    const rawSearchText = normalizeArabic(rawExcerpt);
    const matchingTokens = tokens.filter((token) => rawSearchText.includes(token));
    const cleanSummary = cleanArabicLegalText(row.summary);
    const usedSummary =
      cleanSummary.length >= 40 &&
      (needsLegalTextFallback(rawExcerpt) || matchingTokens.length === 0);
    const excerpt = usedSummary
      ? cleanSummary
      : cleanArabicLegalText(rawExcerpt);
    const quality = qualityFor(row, rawExcerpt, usedSummary);
    results.push({
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      reference: row.reference,
      excerpt,
      title: cleanArabicLegalText(row.title),
      category: row.category,
      documentType: row.document_type,
      lawNumber: row.law_number,
      lawYear: row.law_year,
      sourceUrl: row.source_url,
      sourcePage: row.source_page,
      officialSource: row.official_source,
      summary: cleanArabicLegalText(row.summary),
      pageCount: row.page_count,
      articleCount: row.article_count,
      sourceType:
        row.source_type === "official_moj"
          ? "official_moj"
          : row.source_type === "user_library"
            ? "user_library"
            : "unknown",
      score: Number(row.score) || 0,
      qualityScore: quality.score,
      qualityLabel: quality.label,
      amendmentAlert: /تعديل|إلغاء|يلغى|ملغي|معدل/.test(
        `${row.title} ${row.summary}`,
      ),
    });
    if (results.length >= limit) break;
  }

  return results;
}

export function buildSearchAnalysis(query: string, results: LegalSearchResult[]) {
  const official = results.filter((result) => result.sourceType === "official_moj");
  const categories = [...new Set(results.map((result) => result.category))];
  const documents = [...new Map(results.map((result) => [result.documentId, result])).values()];
  const amendmentAlerts = results.filter((result) => result.amendmentAlert);
  const averageQuality = results.length
    ? Math.round(
        results.reduce((total, result) => total + result.qualityScore, 0) /
          results.length,
      )
    : 0;

  return {
    query,
    resultCount: results.length,
    documentCount: documents.length,
    officialResultCount: official.length,
    categories,
    averageQuality,
    confidence:
      averageQuality >= 88
        ? "مرتفعة"
        : averageQuality >= 68
          ? "متوسطة"
          : "أولية",
    amendmentWarning:
      amendmentAlerts.length > 0
        ? "توجد نتائج تتعلق بتعديل أو إلغاء تشريعي؛ يجب فحص التسلسل الزمني والنص النافذ."
        : null,
    evidenceNote:
      official.length > 0
        ? "يتضمن الناتج مصادر رسمية، لكن الاقتباس النهائي يجب أن يطابق صفحة الأصل."
        : "النتائج الحالية من ملفات المكتب؛ يلزم مطابقتها مع مصدر رسمي قبل الإيداع.",
    strongestDocuments: documents.slice(0, 4).map((result) => ({
      id: result.documentId,
      title: result.title,
      sourceType: result.sourceType,
      qualityScore: result.qualityScore,
    })),
    nextChecks: [
      "التحقق من سريان النص في تاريخ الواقعة.",
      "مراجعة أي تعديل أو حكم لاحق قد يغيّر التطبيق.",
      "مطابقة رقم المادة والاقتباس مع النسخة الرسمية قبل تقديم المذكرة.",
    ],
  };
}
