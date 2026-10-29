import { inferProceduralPosition } from "./procedural-position";

export const availableEvidenceMode = "available_evidence";
const required = { caseType: "نوع القضية", court: "المحكمة", clientName: "اسم مقدم المذكرة", otherParty: "اسم الطرف الآخر", partyRole: "الصفة", requests: "الطلبات" };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const present = (value: unknown) => text(value) && !/^\[.*غير (?:مذكور|مذكورة|واردة)/.test(text(value));

export function preparationContext(raw: Record<string, unknown>) {
  // Assistant replies and summaries are never evidence for a missing identity.
  return [raw.facts, raw.requests, raw.allParties, raw.caseStory, raw.documentContext].map(text).filter(Boolean).join("\n\n").slice(0, 30000);
}
export function prepareMemoDraft(raw: Record<string, unknown>, extracted: Record<string, unknown> = {}) {
  const input: Record<string, unknown> = { ...raw };
  const context = preparationContext(raw);
  const identity = new Set(["clientName", "otherParty", "caseNumber", "judgmentNumber", "judgmentDate", "notificationDate", "hearingDate"]);
  for (const [key, value] of Object.entries(extracted)) {
    if (present(input[key]) || !text(value)) continue;
    // Reject a model-supplied identity/date that has no literal support.
    if (identity.has(key) && !context.normalize("NFKC").includes(text(value).normalize("NFKC"))) continue;
    input[key] = text(value);
  }
  const position = inferProceduralPosition(`${text(input.facts)}\n${text(input.requests)}`, text(input.clientName), text(input.otherParty));
  if (!position.conflict && !position.needsActor) for (const key of ["partyRole", "court"] as const) if (!present(input[key]) && position[key]) input[key] = position[key];
  const missingFields: string[] = [];
  for (const [key, label] of Object.entries(required)) if (!present(input[key])) {
    missingFields.push(label);
    input[key] = `[${label} غير مذكور في المدخلات]`;
  }
  input.draftMode = availableEvidenceMode;
  if (!text(input.documentKind) && missingFields.length) input.documentKind = "memorandum";
  return { input, missingFields, notes: [
    ...missingFields.map(label => `${label}: غير متاح في المدخلات؛ تتولى المجموعة مراجعته قبل الاعتماد.`),
    ...(position.conflict ? ["توجد صفات إجرائية متعارضة تحتاج مراجعة المجموعة؛ لم تُستنتج صفة بديلة."] : []),
  ] };
}
