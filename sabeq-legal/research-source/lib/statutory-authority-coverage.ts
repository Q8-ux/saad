import type { LegalEvidence } from "./legal-search";
import { draftStatutoryText } from "./statutory-text";

type PlannedIssue = { sourceMarkers?: string[]; application?: string; missing?: string };
type CheckedPlan = { issues?: PlannedIssue[] };

/**
 * An approved case plan can identify a relevant reviewed article, yet the
 * model may omit its marker. Without the marker, preparation cannot insert
 * the literal text, and the ordinary citation gate sees no citation to check.
 *
 * Check only articles explicitly attached to an applicable issue. We never
 * assume all retrieved sources apply to the case, and we never create a new
 * legal ground or supply statutory wording from a model.
 */
export function missingPlannedStatutoryCitations(
  plan: CheckedPlan,
  evidence: LegalEvidence[],
  grounds: string,
): string[] {
  const required = new Set<string>();
  for (const issue of plan.issues || []) {
    if (!issue || !issue.application?.trim() || issue.missing?.trim()) continue;
    for (const rawMarker of issue.sourceMarkers || []) {
      const marker = String(rawMarker).replace(/[【】\[\]\s]/g, "");
      const match = /^م([1-9]\d*)$/.exec(marker);
      if (!match) continue;
      const index = Number(match[1]) - 1;
      const source = evidence[index];
      if (source && draftStatutoryText(source)) required.add(marker);
    }
  }
  return [...required].filter(marker => {
    const source = evidence[Number(marker.slice(1)) - 1];
    const article = source && draftStatutoryText(source);
    // The article wording must be next to the actual citation in the same
    // defense paragraph; a detached list elsewhere is not sufficient.
    const citation = new RegExp(`[【\\[]\\s*${marker}\\s*[】\\]]`, "u");
    const adjacent = !!article && grounds.split(/\\n+/u)
      .some(paragraph => citation.test(paragraph) && paragraph.includes(article.quote));
    return !adjacent;
  });
}
