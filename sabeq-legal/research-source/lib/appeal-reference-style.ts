import catalog from "@/data/drafting-templates/appeal-reference-style.json";
import type { DraftingFamily, LegalDraftingRoute } from "./legal-drafting-routes";

export type AppealReferenceStyle = typeof catalog;
export const appealReferenceStyle = catalog;
export const appealReferenceJson = JSON.stringify(catalog);

export function approvedAppealReference(value: unknown): AppealReferenceStyle | undefined {
  return JSON.stringify(value) === appealReferenceJson ? appealReferenceStyle : undefined;
}

export function appealReferenceInstructions(route: LegalDraftingRoute, reference?: unknown): string {
  const style = approvedAppealReference(reference);
  if (!style || route.status !== "ready" || route.kind !== "appeal" || route.degree !== "appeal" || route.role !== "appellant" || !route.family) {
    return "";
  }
  const families: Partial<Record<DraftingFamily, readonly string[]>> = style.families;
  const familyRules = families[route.family];
  if (!familyRules) return "";
  return ["قواعد صياغة صحيفة الاستئناف", ...style.common, ...familyRules].join("\n");
}
