// Case facts are never inferred from another request or from the shared library.
type Fields = Record<string, unknown>;
const value = (input: Fields, key: string) => typeof input[key] === "string" ? input[key] as string : "";
const normal = (text: string) => text.normalize("NFKC").replace(/[\u064b-\u065f\u0670ـ]/gu, "").replace(/[أإآ]/gu, "ا").replace(/ى/gu, "ي").replace(/ة/gu, "ه").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const historicalFields = ["judgmentNumber", "judgmentDate", "judgmentCircuit", "judgmentCourt", "judgmentOperative", "originalRequests", "originalGrounds", "originalPlaintiff", "originalDefendant", "notificationDate", "appealGrounds", "announcementDate", "hearingDate", "hearingTime"];

function supportedParty(name: string, primary: string) {
  const cleaned = normal(name);
  if (!cleaned || /^(?:غير مذكور|غير محدد|لم يذكر|المدعي|المدعي عليه|الخصم|المتهم)$/u.test(cleaned)) return true;
  if (/^(?:النيابه العامه|الادعاء العام)$/u.test(cleaned) && /النيابه العامه|الادعاء العام/u.test(primary)) return true;
  return (` ${primary} `).includes(` ${cleaned} `);
}
export function reviewMemoCaseContext(input: Fields) {
  const primary = normal(["clientName", "otherParty", "allParties", "facts", "requests"].map(key => value(input, key)).join("\n"));
  const conflictingFields = ["originalPlaintiff", "originalDefendant"].filter(key => {
    const names = value(input, key).split(/[،,؛;\n]+/u).map(name => name.trim()).filter(Boolean);
    return names.some(name => !supportedParty(name, primary));
  });
  return { valid: conflictingFields.length === 0, conflictingFields,
    // A proposal only: the administrator reviews these fields before saving.
    suggestedClearFields: conflictingFields.length ? historicalFields.filter(key => value(input, key).trim()) : [] };
}
export function isDifferentMemoCase(current: Fields, incoming: Fields) {
  return ["caseNumber", "clientName"].some(key => value(current, key).trim() && value(incoming, key).trim() && normal(value(current, key)) !== normal(value(incoming, key)));
}
export function mergeMemoCasePatch(current: Record<string, string>, patch: Record<string, string>) {
  if (!isDifferentMemoCase(current, patch)) return { ...current, ...patch };
  return { ...patch };
}
