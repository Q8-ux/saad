import catalog from "@/data/drafting-templates/memorandum-reference-style.json";
import { appealReferenceInstructions, type AppealReferenceStyle } from "./appeal-reference-style";
import type { DraftingFamily, LegalDraftingRoute } from "./legal-drafting-routes";
import type { MemorandumTitle } from "./pleading-document";

export const memorandumReferenceStyle = catalog;
export type MemorandumReferenceStyle = typeof catalog;
export type DraftingReferenceStyle = AppealReferenceStyle | MemorandumReferenceStyle;
type ProcedureContext = { caseStage?: string; court?: string; partyRole?: string; requests?: string };
const approvedJson = JSON.stringify(catalog);

export function approvedMemorandumReference(value: unknown): MemorandumReferenceStyle | undefined {
  return JSON.stringify(value) === approvedJson ? memorandumReferenceStyle : undefined;
}

function normalized(value = "") {
  return value.normalize("NFKC").replace(/[\u064b-\u065f\u0670\u0640]/gu, "")
    .replace(/[أإآٱ]/gu, "ا").replace(/ى/gu, "ي").replace(/ة/gu, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function selectDraftingReference(route: LegalDraftingRoute, value: unknown, context: ProcedureContext): { instructions: string; memorandumTitle?: MemorandumTitle } {
  if (route.kind === "appeal") return { instructions: appealReferenceInstructions(route, value) };
  if (route.kind !== "memorandum" || route.status !== "ready" || route.degree === "cassation" || !route.family) return { instructions: "" };

  const style = approvedMemorandumReference(value);
  if (!style) return { instructions: "" };
  const families: Partial<Record<DraftingFamily, readonly string[]>> = style.families;
  const familyRules = families[route.family];
  if (!familyRules) return { instructions: "" };

  const criminal = route.family === "misdemeanor" || route.family === "felony";
  const stage = normalized(context.caseStage);
  const claimant = route.role === "claimant" || route.role === "complainant";
  const ancillary = criminal && claimant && (
    /(?:^| )مدع(?:ي|يا)? بالحق المدني(?: |$)/u.test(normalized(context.partyRole))
    || /^(?:مذكره )?ادعاء مدني(?: |$)/u.test(stage)
  );
  if (criminal && claimant && !ancillary) return { instructions: "" };

  const expertStage = /(?:^| )(?:امام|لدي) (?:اداره )?(?:الخبره|الخبير|الخبراء)(?: |$)|(?:^| )تعقيب علي (?:تقرير الخبير|اعمال الخبره)(?: |$)/u;
  const expertRequest = /^(?:(?:اعداد|صياغه) )?(?:مذكره )?تعقيب علي (?:تقرير الخبير|اعمال الخبره)(?: |$)/u;
  const expert = (route.family === "civil" || route.family === "commercial" || route.family === "tenancy")
    && (expertStage.test(stage) || /^(?:اداره الخبراء|الخبره)$/u.test(normalized(context.court))
      || expertRequest.test(normalized(context.requests)));
  const procedureRules = expert ? style.procedures.expert_comment
    : route.degree === "appeal" ? style.procedures.appeal_memorandum : [];

  const memorandumTitle = ancillary ? "مذكرة ادعاء مدني" : expert ? "مذكرة تعقيب" : undefined;
  return {
    instructions: [
      "قواعد صياغة المذكرة",
      ...style.common,
      ...(ancillary ? style.procedures.ancillary_civil_claim : familyRules),
      ...procedureRules,
    ].join("\n"),
    memorandumTitle,
  };
}
