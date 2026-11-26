import type { PleadingContent, PleadingInput } from "./pleading-document";

export const memoSubstanceQualityRevision = "formal-memo-substance-2";

export type MemoSubstanceIssueCode =
  | "facts_overcompressed"
  | "insufficient_defense_depth"
  | "thin_individual_defenses"
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

function defenseHeadingPattern() {
  const ordinal = "(?:أولاً|أولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا|ثامناً|ثامنا|تاسعاً|تاسعا|عاشراً|عاشرا)";
  return new RegExp(`^(?:(?:[\\d٠-٩۰-۹]{1,3})\\s*[.)\\-–:]\\s+|${ordinal}\\s*[:：\\-]\\s+)(?=\\p{L})`, "u");
}

function isDefenseHeading(line: string) {
  return line.length <= 220 && (defenseHeadingPattern().test(line) || /^(?:الدفع|السبب)\s+/u.test(line));
}

function defenseSections(value: string) {
  const sections: string[] = [];
  let current: string[] | null = null;
  for (const rawLine of value.split(/\n+/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isDefenseHeading(line)) {
      if (current) sections.push(current.join("\n"));
      current = [line];
    } else if (current) current.push(line);
  }
  if (current) sections.push(current.join("\n"));
  return sections;
}

function numberedDefenseHeadings(value: string) {
  return defenseSections(value).length;
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
  const requiredReasoningChars = inputFactChars >= 3_600
    ? Math.min(9_000, Math.max(650, expectedIssues * 650, Math.floor(inputFactChars * 0.75)))
    : inputFactChars >= 1_600
      ? Math.min(6_500, Math.max(650, expectedIssues * 420, Math.floor(inputFactChars * 0.5)))
      : Math.min(3_500, Math.max(650, expectedIssues * 420, Math.floor(inputFactChars * 0.45)));
  const requiredReasoningForRelief = Math.min(3_000, Math.max(300, Math.floor(reliefChars * 1.5)));
  const requiredParagraphs = expectedIssues * 3;
  const headings = numberedDefenseHeadings(content.grounds || "");
  const minimumDefenseSectionChars = inputFactChars >= 3_600 ? 650 : inputFactChars >= 1_600 ? 320 : 220;
  const defenseSectionLengths = defenseSections(content.grounds || "").map(section => proseLength(reasoningOnly(section)));
  const thinDefenseSections = defenseSectionLengths.slice(0, expectedIssues).filter(length => length < minimumDefenseSectionChars).length;
  const paragraphs = reasoningParagraphs(content.grounds || "");
  const statutoryBlocks = ((content.grounds || "").match(/(?:مقتطف\s+من\s+)?نص\s+المادة\s*[:：]\s*(?:«[^»]+»|“[^”]+”|"[^"\n]+")/gu) || []).length;
  const issues: Array<{code:MemoSubstanceIssueCode;actual:number;required:number}> = [];
  if (outputFactChars < requiredFactChars) issues.push({code:"facts_overcompressed",actual:outputFactChars,required:requiredFactChars});
  if (reasoningChars < requiredReasoningChars) issues.push({code:"insufficient_defense_depth",actual:reasoningChars,required:requiredReasoningChars});
  if (thinDefenseSections > 0) issues.push({code:"thin_individual_defenses",actual:Math.max(0, expectedIssues-thinDefenseSections),required:expectedIssues});
  if (reasoningChars < requiredReasoningForRelief) issues.push({code:"relief_outweighs_reasoning",actual:reasoningChars,required:requiredReasoningForRelief});
  if (headings < expectedIssues || paragraphs < requiredParagraphs) issues.push({code:"insufficient_defense_structure",actual:Math.min(headings,Math.floor(paragraphs/3)),required:expectedIssues});
  if (options.requireStatutoryText && statutoryBlocks < 1) issues.push({code:"missing_verified_statutory_text",actual:statutoryBlocks,required:1});
  return {
    revision:memoSubstanceQualityRevision,
    ok:issues.length === 0,
    issues,
    metrics:{inputFactChars,outputFactChars,reliefChars,reasoningChars,expectedIssues,headings,paragraphs,statutoryBlocks,requiredFactChars,requiredReasoningChars,requiredReasoningForRelief,requiredParagraphs,minimumDefenseSectionChars,defenseSectionLengths,thinDefenseSections},
  };
}
