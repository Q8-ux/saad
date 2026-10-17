import { factualRequirements, researchOwnershipCopy, removeDelegatedResearch } from "./legal-language";
import type { LegalIntakeState } from "./openai";
import { corpusContext, isCassationEvidence, isJudgmentEvidence, normalizeLegalText, type LegalEvidence } from "./legal-search";
import { reviewLegalCitations } from "./legal-citation-review";
import type { SourceVerification } from "./official-legislation";
import {hasReviewedJudgment} from './judgment-evidence';

export type AnalysisSource = {
  id: string; documentId: number; chunkId?: number; title: string; reference: string;
  kind: "legislation" | "judgment"; sourceUrl: string; officialSource: string;
  excerpt: string; libraryUpdatedAt: string | null;
  verification?: SourceVerification;
  corpus?: LegalEvidence["corpus"];
  judgment?:LegalEvidence['judgment'];
};
export type IntakeResearch = {
  owner: "assistant";
  status: "matched" | "empty" | "unavailable";
  legislationCount: number; judgmentCount: number; retrievedAt: string;
  sources: AnalysisSource[]; limitations: string[];
  catalogueSources?: Array<{ id: string; title: string; url: string; lastFetchStatus: string }>;
};
export type AnalysisStage = { id: "library" | "analysis" | "source_review" | "human_review"; status: "running" | "completed" | "limited" | "failed" | "pending"; startedAt: string | null; finishedAt: string | null; durationMs: number | null };

export function intakePassages(evidence: LegalEvidence[]) {
  return evidence.flatMap((source, i) => {
    const passages: Array<{ id: string; sourceId: string; quote: string }> = [];
    let start = 0;
    while (start < source.text.length) {
      let end = Math.min(start + 650, source.text.length);
      if (end < source.text.length) { const space = source.text.lastIndexOf(" ", end); if (space > start + 300) end = space; }
      const quote = source.text.slice(start, end).trim();
      if (quote) passages.push({ id: `م${i + 1}:${passages.length + 1}`, sourceId: `م${i + 1}`, quote });
      start = end;
    }
    return passages;
  });
}
export function formatIntakeEvidence(evidence: LegalEvidence[]) {
  const passages = intakePassages(evidence);
  return evidence.map((source, i) => `المصدر م${i + 1}: ${source.title}\nالنوع: ${isJudgmentEvidence(source) ? "حكم/مبدأ قضائي" : "تشريع"}\nالجهة: ${source.officialSource}\n${corpusContext(source)}${source.verification ? `القانون صاحب المادة: ${source.lawNumber}/${source.lawYear}. المادة: ${source.verification.articleNumber}. صفحة: ${source.verification.page}. مطابقة المصدر: ${source.verification.checkedAt}. لا يثبت ذلك اكتمال التعديلات أو انطباق النص زمنياً.\n` : ""}${passages.filter(p => p.sourceId === `م${i + 1}`).map(p => `[${p.id}] ${p.quote}`).join("\n")}`).join("\n\n");
}

const labels = {
  ar: { empty: "لم يعثر البحث على نص مفهرس مناسب؛ لا توجد أسانيد قانونية مؤكدة لهذا التحليل.", unavailable: "تعذر الاتصال بالمكتبة القانونية. يستمر جمع الوقائع، ويجب إعادة البحث قبل اعتماد الأسانيد.", noJudgments: "لم يعثر هذا البحث على أحكام مفهرسة مطابقة.", indexed: "النصوص من قاعدة الموقع. علامة الفهرسة وجودة الاستخراج لا تثبت سريان التشريع أو اكتمال تعديلاته؛ يتولى المساعد والمجموعة مراجعة المصدر الأصلي.", removed: "استُبعد سند لعدم مطابقة اقتباسه للنص المسترجع.", missing: "لم يثبت سند نصي كافٍ لترشيح المحكمة؛ التوجيه مبدئي ويتطلب مراجعة الاختصاص.", acknowledgement: "حدّثت فهم القضية من المعلومات التي قدمتها." },
  en: { empty: "No suitable indexed text was found; this analysis has no confirmed legal basis.", unavailable: "The legal library could not be reached. Intake can continue; research must be retried before relying on legal grounds.", noJudgments: "This search found no matching indexed judgments.", indexed: "These texts come from the site's corpus. Indexing and extraction quality do not establish current legal validity or complete amendments. Source review belongs to the assistant and legal team.", removed: "A citation was excluded because its quotation did not match the retrieved text.", missing: "A sufficient textual basis for the proposed court was not established. Jurisdiction requires review.", acknowledgement: "I have updated the case details from your information." },
  ur: { empty: "متعلقہ متن نہیں ملا؛ اس تجزیے کے لیے تصدیق شدہ قانونی بنیاد دستیاب نہیں۔", unavailable: "قانونی لائبریری سے رابطہ نہیں ہو سکا۔ حقائق جمع کیے جا سکتے ہیں؛ قانونی بنیاد کے لیے دوبارہ تلاش ضروری ہے۔", noJudgments: "اس تلاش میں متعلقہ عدالتی فیصلے نہیں ملے۔", indexed: "یہ متن ویب سائٹ کے ذخیرے سے ہے۔ اشاریہ بندی قانون کے نافذ ہونے یا تمام ترامیم کی تصدیق نہیں؛ اصل ماخذ کی جانچ ضروری ہے۔", removed: "ماخذ کے متن سے نہ ملنے والا اقتباس ہٹا دیا گیا ہے۔", missing: "عدالت کے اختیار کی کافی متنی بنیاد نہیں ملی؛ سفارش ابتدائی ہے۔", acknowledgement: "آپ کی معلومات کے مطابق مقدمے کی تفصیلات تازہ کر دی ہیں۔" },
};

export function reviewIntakeAnalysis(state: LegalIntakeState, evidence: LegalEvidence[], failed: boolean, language: string) {
  const copy = labels[language as keyof typeof labels] || labels.ar;
  for (const key of ["documentsNeeded", "missingInformation", "jurisdictionMissing"] as const) state[key] = factualRequirements(state[key] || []);
  state.nextQuestions = factualRequirements(state.nextQuestions || []);
  state.assistantMessage = removeDelegatedResearch(state.assistantMessage, language);
  state.analysisWarnings = (state.analysisWarnings || []).map(text => removeDelegatedResearch(text, language));
  const sources: AnalysisSource[] = evidence.map((item, i) => ({
    id: `م${i + 1}`, documentId: item.documentId, chunkId: item.chunkId, title: item.title, reference: item.reference || "",
    kind: isJudgmentEvidence(item) ? "judgment" : "legislation", sourceUrl: safeSourceUrl(item.sourceUrl), officialSource: item.officialSource,
    excerpt: item.text, libraryUpdatedAt: item.libraryUpdatedAt || null, verification: item.verification, corpus:item.corpus, judgment:item.judgment,
  }));
  const warnings = [...(state.analysisWarnings || [])];
  const orientation = state.orientation;
  if (language === "ar" && /^(unknown|initial|pending|complaint|challenge|enforcement)$/.test(state.caseStage)) {
    state.caseStage = ({ unknown: "مرحلة القضية تحتاج توضيحًا", initial: "قبل إقامة الدعوى", pending: "قضية منظورة", complaint: "بلاغ أو تحقيق", challenge: "دراسة الطعن في حكم قائم", enforcement: "تنفيذ حكم" } as Record<string, string>)[orientation?.track || state.caseStage];
  }
  if (language === "ar" && orientation?.track === "challenge") {
    state.caseStage = orientation.judgment === "appeal" ? "دراسة الطعن في حكم استئنافي" : orientation.judgment === "first_instance" ? "دراسة الطعن في حكم ابتدائي" : "دراسة الطعن في حكم قائم";
  }
  const judgmentQuote = normalizeLegalText(orientation?.judgmentQuote || "");
  const actualJudgment = /صدر|اصدرت|حكمت|قضت|حكم (?:علي|لي|ضدي)|(?:لدي|عندي|معي|استلمت|خسرت).*(?:حكم|استيناف)|(?:issued|received|have|lost).*(?:judgment|appeal)|court.*ruled|عدالت.*فيصلہ/.test(judgmentQuote);
  const appellate = state.court === "محكمة الاستئناف" || state.court === "محكمة التمييز";
  const unsupportedAppeal = appellate && (!actualJudgment || !orientation || ["unknown", "none"].includes(orientation.judgment) || !["challenge", "pending"].includes(orientation.track) || (state.court === "محكمة التمييز" && orientation.judgment === "first_instance"));
  if (unsupportedAppeal) {
    state.court = ""; state.courtCircuit = ""; state.readyForMemo = false; state.jurisdictionConfidence = "low";
    const missing = language === "en" ? "Details of the existing judgment and its issuing court are needed before choosing a challenge route." : language === "ur" ? "اپیل کا راستہ طے کرنے سے پہلے موجودہ فیصلے اور اسے دینے والی عدالت کی تفصیل درکار ہے۔" : "يلزم التحقق من الحكم السابق والمحكمة التي أصدرته قبل تحديد طريق الطعن.";
    state.jurisdictionMissing = [...new Set([...(state.jurisdictionMissing || []), missing])];
    state.jurisdictionReason = missing;
    if (orientation) orientation.nextAction = missing;
    warnings.push(missing);
  }
  const knownCourts = ["المحكمة الكلية", "المحكمة الجزئية", "محكمة الأسرة", "محكمة الاستئناف", "محكمة التمييز", "المحكمة الدستورية"];
  if (state.court && !knownCourts.includes(state.court.trim())) {
    state.court = ""; state.courtCircuit = ""; state.jurisdictionConfidence = "low";
    state.readyForMemo = false; warnings.push(copy.missing);
  }
  if (!state.court) { state.readyForMemo = false; state.jurisdictionConfidence = "low"; if (state.phase === "ready") state.phase = "review"; }
  // An issuing court mentioned by the visitor is not automatically the forum
  // for challenging its judgment. Leave the route unresolved without a source.
  if (orientation?.track === "challenge" && state.court && judgmentQuote.includes(normalizeLegalText(state.court)) && !(state.legalBasis || []).some(item => item.use === "jurisdiction")) {
    state.court = ""; state.courtCircuit = ""; state.readyForMemo = false;
    state.jurisdictionConfidence = "low";
    state.jurisdictionReason = copy.missing;
    warnings.push(copy.missing);
  }
  const requested = (state.legalBasis || []).slice(0, 4);
  const passages = intakePassages(evidence);
  const legalBasis = requested.flatMap(item => {
    // New responses select an exact server-owned passage. The model never
    // rewrites its quoted text. Keep validation for older response fixtures.
    if (item.passageId) {
      const passage = passages.find(p => p.id === item.passageId);
      return passage ? [{ ...item, sourceId: passage.sourceId, quote: passage.quote }] : [];
    }
    const source = sources.find(source => source.id === item.sourceId);
    const quote = typeof item.quote === "string" ? normalizeLegalText(item.quote) : "";
    return source && quote.length >= 20 && quote.length <= 900 && normalizeLegalText(source.excerpt).includes(quote) ? [item] : [];
  }).filter(item => item.use !== "jurisdiction" || /اختصاص|تختص|محكم|استئناف|تمييز|الطعن/.test(item.quote)).filter(item=>reviewLegalCitations(`${item.application || ""} 【${item.sourceId}】`,evidence).ok);
  const precedentMatches = (state.precedentMatches || []).slice(0, 2).flatMap(item => {
    const passage = passages.find(p => p.id === item.passageId);
    const sourceIndex = passage ? sources.findIndex(s => s.id === passage.sourceId) : -1;
    const original = evidence[sourceIndex];
    if (!passage || !original || !hasReviewedJudgment(original) || !isJudgmentEvidence(original) || !isCassationEvidence(original) || !["analogous", "distinguished", "insufficient"].includes(item.relevance)) return [];
    const similarity = typeof item.similarity === "string" ? item.similarity.slice(0, 250) : "";
    const differences = typeof item.differences === "string" ? item.differences.slice(0, 250) : "";
    if (!similarity || !differences) return [];
    return [{ ...item, similarity, differences, sourceId: passage.sourceId, quote: passage.quote, documentId: original.documentId, chunkId: original.chunkId, title: original.title, sourceUrl: safeSourceUrl(original.sourceUrl) }];
  });
  if (legalBasis.length !== requested.length) warnings.push(copy.removed);
  if (!legalBasis.some(item => item.use === "jurisdiction") || state.jurisdictionMissing?.length) {
    state.jurisdictionConfidence = "low";
    warnings.push(copy.missing);
    state.readyForMemo = false; if (state.phase === "ready") state.phase = "review";
  }
  if (state.jurisdictionMissing?.length) { state.readyForMemo = false; if (state.phase === "ready") state.phase = "review"; }
  const unbacked = !legalBasis.length;
  if (unbacked) {
    warnings.push(failed ? copy.unavailable : copy.empty);
    // Do not preserve fabricated statute/appeal numbers outside the structured
    // citation list when there is no supporting excerpt at all.
    const citation = /(?:الماد[ةه]|الطعن|القانون\s+رقم)\s*(?:رقم\s*)?[\d٠-٩]|[【\[]م\d+[】\]]/;
    if (citation.test(state.assistantMessage)) state.assistantMessage = [copy.acknowledgement, ...state.nextQuestions].join("\n");
    if (citation.test(state.jurisdictionReason || "")) state.jurisdictionReason = copy.missing;
  }
  const research: IntakeResearch = {
    owner: "assistant",
    status: failed ? "unavailable" : sources.length ? "matched" : "empty",
    legislationCount: sources.filter(s => s.kind === "legislation").length, judgmentCount: sources.filter(s => s.kind === "judgment").length,
    retrievedAt: new Date().toISOString(), sources,
    limitations: [researchOwnershipCopy[language as keyof typeof researchOwnershipCopy] || researchOwnershipCopy.ar, copy.indexed, ...(!sources.some(s => s.kind === "judgment") ? [copy.noJudgments] : []), ...(failed ? [copy.unavailable] : !sources.length ? [copy.empty] : [])],
  };
  if(!reviewLegalCitations(state.assistantMessage,evidence).ok) {
    state.assistantMessage=[copy.acknowledgement,...state.nextQuestions].join("\n");
    warnings.push(copy.removed);
  }
  if(!reviewLegalCitations(state.jurisdictionReason || "",evidence).ok) {
    state.jurisdictionReason=copy.missing;state.jurisdictionConfidence="low";state.readyForMemo=false;
  }
  return { ...state, precedentMatches, memoPrefill: { ...state.memoPrefill, court: state.court }, legalBasis, analysisWarnings: [...new Set(warnings)], research };
}

function safeSourceUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
