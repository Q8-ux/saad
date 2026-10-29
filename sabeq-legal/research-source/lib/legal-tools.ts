import { normalizeLegalText, type LegalEvidence } from "./legal-search";
import { intakePassages } from "./intake-analysis";
import { interfaceLabel } from "./interface-language";
import { reviewLegalCitations } from "./legal-citation-review";
export const TOOL_ACTIONS = ["research", "precedents", "review", "draft", "summary", "requests", "timeline", "updates"] as const;
export type LegalToolAction = typeof TOOL_ACTIONS[number];
export type ToolFinding = { quote: string; issue: string; suggestion: string };
export type ToolSource = { id: string; title: string; quote: string; url: string; kind: string; indexedAt: string | null };
export type LegalToolResult = { action: LegalToolAction; text: string; findings: ToolFinding[]; missing: string[]; sources: ToolSource[]; warnings: string[]; retrievedAt: string; timing: { totalMs: number }; requiresReview: true };
export type RawToolResult = { text: string; findings: ToolFinding[]; missing: string[]; passageIds: string[] };
export function isLegalToolAction(value: unknown): value is LegalToolAction { return typeof value === "string" && TOOL_ACTIONS.includes(value as LegalToolAction); }
export function reviewToolOutput(raw: RawToolResult, inputText: string, evidence: LegalEvidence[], language = "ar") {
  const warnings: string[] = [];
  const passages = intakePassages(evidence);
  const sources = [...new Set(raw.passageIds || [])].flatMap(id => {
    const passage = passages.find(item => item.id === id); if (!passage) { warnings.push("استُبعد مرجع غير موجود في النصوص المسترجعة."); return []; }
    const item = evidence[Number(passage.sourceId.slice(1)) - 1];
    return [{ id, title: item.title, quote: passage.quote, url: item.sourceUrl, kind: item.documentType, indexedAt: item.libraryUpdatedAt || null }];
  });
  const original = normalizeLegalText(inputText);
  const findings = (raw.findings || []).filter(item => {
    const quote = normalizeLegalText(item.quote || "");
    if (quote.length >= 8 && original.includes(quote)) return true;
    warnings.push("استُبعدت ملاحظة لم يطابق اقتباسها نص المستند. راجع المستند الأصلي."); return false;
  }).slice(0, 8);
  const supportedText = normalizeLegalText(sources.map(source => source.quote).join(" "));
  const unsupported = /(?:الماد[ةه]|الطعن|القانون\s+رقم|\barticle|\bsection|\blaw|\b(?:cassation\s+)?appeal|\bjudgment|دفعہ|قانون\s+نمبر|اپیل\s+نمبر)\s*(?:(?:رقم|no\.?|number)\s*)?[\d٠-٩۰-۹]+(?:\s*(?:لسنة|لسنه|\/|لعام|of|سال)\s*[\d٠-٩۰-۹]+)?/gi;
  const guard = (text: string) => String(text || "").replace(unsupported, match => {
    if (supportedText.includes(normalizeLegalText(match))) return match;
    warnings.push("أُزيل رقم مادة أو حكم لم يثبت في السند المختار."); return interfaceLabel("[مرجع يحتاج تحققاً]", language);
  });
  if(!reviewLegalCitations(raw.text,evidence).ok) {
    raw.text=interfaceLabel("تعذر توثيق أرقام المواد في هذه النتيجة؛ تتولى المجموعة استكمال البحث القانوني.",language);
    warnings.push("أُزيل رقم مادة أو حكم لم يثبت في السند المختار.");
  }
  if (!sources.length) warnings.push("لا يوجد سند قانوني معتمد لهذه النتيجة. لا تثبت الملاحظات وحدها البطلان أو صحة الموقف القانوني.");
  return { text: guard(raw.text), findings: findings.map(item => ({ ...item, issue: guard(item.issue), suggestion: guard(item.suggestion) })), missing: (raw.missing || []).slice(0, 10).map(guard), sources, warnings: [...new Set(warnings)].map(warning => interfaceLabel(warning, language)) };
}
