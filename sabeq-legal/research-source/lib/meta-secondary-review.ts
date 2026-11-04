import { env } from "cloudflare:workers";
import { openRouterAsResponses, DEFAULT_FREE_LLAMA_MODEL } from "./llama-openrouter";

/**
 * Meta Llama is an optional second opinion, never the primary model, source
 * of statutes, or an authority to approve court filings.
 * A case's text may leave the primary provider only after a server owner has
 * explicitly approved that external disclosure. Default: OFF.
 */
type SecondaryRuntime = {
  SABEQ_META_SECOND_REVIEW?: string;
  SABEQ_META_CASE_DATA_APPROVED?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_FREE_MODEL?: string;
};
type SecondaryReview = { missingIssueIndexes: number[]; warnings: string[] };
const reviewSchema = {
  type: "object", additionalProperties: false,
  required: ["missingIssueIndexes", "warnings"],
  properties: {
    missingIssueIndexes: { type: "array", items: { type: "integer" } },
    warnings: { type: "array", items: { type: "string" } },
  },
};

export function secondaryReviewConfigured(runtime: SecondaryRuntime) {
  return runtime.SABEQ_META_SECOND_REVIEW === "enabled"
    && runtime.SABEQ_META_CASE_DATA_APPROVED === "approved"
    && Boolean(runtime.OPENROUTER_API_KEY?.trim());
}

export async function reviewMissingLegalIssues(
  issues: Array<{ issue: string; application?: string }>,
  grounds: string,
  signal?: AbortSignal,
): Promise<SecondaryReview | null> {
  const runtime = env as unknown as SecondaryRuntime;
  if (!secondaryReviewConfigured(runtime) || !issues.length || !grounds.trim()) return null;
  const sanitizedIssues = issues.slice(0, 14).map((issue, index) => ({
    index, issue: issue.issue.slice(0, 240), application: (issue.application || "").slice(0, 350),
  }));
  const response = await openRouterAsResponses({
    instructions: "أنت مدقق ثانٍ لمسودة قانونية كويتية، ولست محررها أو مصدر التشريع. اقرأ مسائل خطة الدفاع والدفوع فقط. أرجع فهارس المسائل التي لم تُناقش على نحو جوهري؛ لا تخترع أرقام مواد أو أحكام أو وقائع جديدة. أي اقتراح يحتاج تحققاً من قاعدة قوانين المكتب. أرجع JSON فقط وفق المخطط.",
    input: JSON.stringify({ issues: sanitizedIssues, grounds: grounds.slice(0, 11000) }),
    text: { format: { type: "json_schema", name: "secondary_gap_review", strict: true, schema: reviewSchema } },
    max_output_tokens: 1200,
  }, runtime.OPENROUTER_API_KEY!, runtime.OPENROUTER_FREE_MODEL || DEFAULT_FREE_LLAMA_MODEL, signal);
  if (!response.ok) return null;
  const payload = await response.json() as { output_text?: string };
  if (!payload.output_text || payload.output_text.length > 8000) return null;
  let value: unknown;
  try { value = JSON.parse(payload.output_text); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.missingIssueIndexes) || !Array.isArray(obj.warnings)) return null;
  return {
    missingIssueIndexes: [...new Set(obj.missingIssueIndexes.filter(
      (index): index is number => Number.isInteger(index) && index >= 0 && index < sanitizedIssues.length,
    ))].slice(0, 14),
    warnings: obj.warnings.filter((warning): warning is string => typeof warning === "string")
      .slice(0, 5).map(warning => warning.slice(0, 260)),
  };
}
