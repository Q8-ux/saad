import { pleadingFields } from "./pleading-document";
export const MAX_MEMO_STORY_CHARS = 30000;
export const memoStoryText = (facts = "", requests = "") => [facts.trim(), requests.trim()].filter(Boolean).join("\n\n");
export const memoVoiceFields = {...pleadingFields,clientName:"الاسم",caseNumber:"رقم القضية",partyRole:"الصفة",otherParty:"الخصم",caseType:"نوع الدعوى",court:"المحكمة المذكورة",allParties:"الأطراف والصفات",facts:"الوقائع",requests:"الطلبات",legalIssues:"المسائل القانونية"};
export function dictationFields(value: Record<string, unknown>) {
  const result: Record<string,string> = {};
  for (const key of Object.keys(memoVoiceFields)) if (typeof value[key] === "string" && value[key].trim()) result[key] = value[key].trim().slice(0,16000);
  if (Array.isArray(value.parties) && !result.allParties) result.allParties=value.parties.filter(p=>p && typeof p.name==='string' && p.name.trim()).map(p=>`${p.name}${typeof p.role==='string' && p.role ? ` — ${p.role}`:''}`).join('\n').slice(0,4000);
  if (!result.allParties) delete result.allParties;
  return result;
}
export async function understandMemoStory(request: (path: string, init: RequestInit) => Promise<Response>, transcript: string, language: string, signal?: AbortSignal) {
  const response = await request("/api/legal/memo-dictation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, language }), signal });
  const data = await response.json();
  if (!response.ok || !data.analysis || typeof data.analysis !== "object") throw new Error(data.error || "MEMO_STORY_UNAVAILABLE");
  return { fields: dictationFields(data.analysis), text: typeof data.analysis.correctedTranscript === "string" && data.analysis.correctedTranscript.trim() ? data.analysis.correctedTranscript : transcript, warnings: Array.isArray(data.analysis.warnings) ? data.analysis.warnings.filter((warning: unknown): warning is string => typeof warning === "string") : [] };
}
