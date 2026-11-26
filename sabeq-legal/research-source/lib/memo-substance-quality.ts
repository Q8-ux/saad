import type { PleadingContent, PleadingInput } from "./pleading-document";

export const memoSubstanceQualityRevision = "formal-memo-substance-1";

export type MemoSubstanceIssueCode =
  | "facts_overcompressed"
  | "insufficient_defense_depth"
  | "relief_outweighs_reasoning"
  | "insufficient_defense_structure"
  | "missing_verified_statutory_text";

type ReviewOptions = {
  issueCount?: number;
  requireStatutoryText?: boolean;
};

const proseLength = (value: string) => value.normalize("NFKC").replace(/【[^】]*】|\[[^\]]*\]/gu, " ").replace(/[^\p{L}\p{N}]+/gu, "").length;

function reasoningOnly(value: string) {
  return value
    .replace(/(?:مقتطف\s+من\s+)?نص\s+المادة\s*[:：]\s*(?:«[^»]*»|“[^”]*”|"[^"\n]*")/gu, " ")
    .replace(/【\s*م\d+\s*】|\[\s*م\d+\s*\]/gu, " ");
}

function numberedDefenseHeadings(value: string) {
  const ordinal = "(?:أولاً|أولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا|ثامناً|ثامنا|تاسعاً|تاسعا|عاشراً|عاشرا)";
  const numbered = new RegExp(`^(?:(?:[\\d٠-٩۰-۹]{1,3})\\s*[.)\\-–:]\\s+|${ordinal}\\s*[:：\\-]\\s+)(?=\\p{L})`, "u");
  return value.split(/\n+/u).map(line => line.trim()).filter(line => line.length <= 220 && (numbered.test(line) || /^(?:الدفع|السبب)\s+/u.test(line))).length;
}

function reasoningParagraphs(value: string) {
  return reasoningOnly(value).split(/\n+|(?<=[.!؟؛])\s+/u).map(part => part.trim()).filter(part => proseLength(part) >= 55).length;
}

/**
 * Court-facing quality floor. It measures coverage and structure, not legal
 * correctness; citation and independent-defense reviews remain authoritative.
 * The caps prevent a long or repetitive intake from forcing artificial prose.
 */
export function reviewMemoSubstance(input: Pick<PleadingInput,"facts"|"requests">, content: Pick<PleadingContent,"facts"|"grounds"|"requests">, options: ReviewOptions = {}) {
  const inputFactChars = proseLength(input.facts || "");
  const outputFactChars = proseLength(content.facts || "");
  const reliefChars = proseLength(content.requests || input.requests || "");
  const reasoningChars = proseLength(reasoningOnly(content.grounds || ""));
  const materialIssueFloor = inputFactChars >= 3_600 ? 3 : inputFactChars >= 1_600 ? 2 : 1;
  const expectedIssues = Math.min(8, Math.max(1, options.issueCount || 0, materialIssueFloor));
  const requiredFactChars = inputFactChars <= 500
    ? Math.min(inputFactChars, Math.max(90, Math.floor(inputFactChars * 0.55)))
    : Math.min(1_800, Math.max(300, Math.floor(inputFactChars * 0.35)));
  const requiredReasoningChars = Math.min(5_000, Math.max(650, expectedIssues * 420, Math.min(2_600, Math.floor(inputFactChars * 0.45))));
  const requiredReasoningForRelief = Math.min(3_000, Math.max(300, Math.floor(reliefChars * 1.5)));
  const requiredParagraphs = expectedIssues * 3;
  const headings = numberedDefenseHeadings(content.grounds || "");
  const paragraphs = reasoningParagraphs(content.grounds || "");
  const statutoryBlocks = ((content.grounds || "").match(/(?:مقتطف\s+من\s+)?نص\s+المادة\s*[:：]\s*(?:«[^»]+»|“[^”]+”|"[^"\n]+")/gu) || []).length;
  const issues: Array<{code:MemoSubstanceIssueCode;actual:number;required:number}> = [];
  if (outputFactChars < requiredFactChars) issues.push({code:"facts_overcompressed",actual:outputFactChars,required:requiredFactChars});
  if (reasoningChars < requiredReasoningChars) issues.push({code:"insufficient_defense_depth",actual:reasoningChars,required:requiredReasoningChars});
  if (reasoningChars < requiredReasoningForRelief) issues.push({code:"relief_outweighs_reasoning",actual:reasoningChars,required:requiredReasoningForRelief});
  if (headings < expectedIssues || paragraphs < requiredParagraphs) issues.push({code:"insufficient_defense_structure",actual:Math.min(headings,Math.floor(paragraphs/3)),required:expectedIssues});
  if (options.requireStatutoryText && statutoryBlocks < 1) issues.push({code:"missing_verified_statutory_text",actual:statutoryBlocks,required:1});
  return {
    revision:memoSubstanceQualityRevision,
    ok:issues.length === 0,
    issues,
    metrics:{inputFactChars,outputFactChars,reliefChars,reasoningChars,expectedIssues,headings,paragraphs,statutoryBlocks,requiredFactChars,requiredReasoningChars,requiredReasoningForRelief,requiredParagraphs},
  };
}
