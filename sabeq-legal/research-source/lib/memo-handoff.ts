export const memoApprovalNotice = {
  ar: "هذه المذكرة مسودة غير معتمدة، ولا تُعد معتمدة أو صالحة للتقديم إلى المحكمة إلا بعد مراجعتها ومصادقة مجموعة سابق القانونية عليها.",
  en: "This memorandum is an unapproved draft. It is not approved or ready for court submission until Sabeq Legal Group has reviewed and ratified it.",
  ur: "یہ یادداشت غیر منظور شدہ مسودہ ہے۔ سابق لیگل گروپ کے جائزے اور منظوری کے بغیر اسے منظور شدہ یا عدالت میں پیش کرنے کے لیے تیار نہ سمجھیں۔",
};
export function canOfferMemoHandoff(state: { facts?: string[]; caseSummary?: string; readyForMemo?: boolean }) {
  return !!state.readyForMemo || !!(state.facts?.some(fact => fact.trim().length >= 10) && state.caseSummary?.trim());
}
export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type MemoPrefill = { caseType: string; court: string; clientName: string; partyRole: string; otherParty: string; allParties: string; facts: string; requests: string; legalIssues: string; conversationTranscript?: string; conversationSummary?: string; assistantSourceIds?: string; assistantResearch?: string; handoffReady?: string; courtCircuit?: string; caseStage?: string; importantDates?: string };
export function isCompleteMemoHandoff(data?: MemoPrefill | null) {
  return !!data && data.handoffReady === "review" && [data.caseType, data.court, data.clientName, data.partyRole, data.otherParty].every(value => value?.trim().length >= 2) && data.facts.trim().length >= 20 && data.requests.trim().length >= 5 && (data.conversationTranscript?.length || 0) <= 30000;
}
export function conversationTranscript(messages: ConversationMessage[], language = "ar") {
  const labels = language === "en" ? ["Visitor", "Legal assistant"] : language === "ur" ? ["صارف", "قانونی معاون"] : ["الزائر", "المساعد القانوني"];
  return messages.map(message => `${labels[message.role === "user" ? 0 : 1]}:\n${message.content}`).join("\n\n");
}
export function buildMemoHandoff(state: { memoPrefill: MemoPrefill; caseSummary: string; facts: string[]; requests: string[]; readyForMemo?: boolean; caseStage?: string; courtCircuit?: string; orientation?: unknown; importantDates?: unknown[]; precedentMatches?: Array<{ sourceId?: string; chunkId?: number; similarity: string; differences: string; relevance: string; title?: string; sourceUrl?: string }>; legalBasis?: Array<{ sourceId: string }>; research?: { sources: Array<{ id: string; chunkId?: number }> } }, messages: ConversationMessage[]): MemoPrefill {
  const ids = new Set([...(state.legalBasis || []).map(b => b.sourceId), ...(state.precedentMatches || []).map(p => p.sourceId)]);
  const sourceIds = (state.research?.sources || []).filter(source => ids.has(source.id)).map(source => source.chunkId).filter(id => Number.isSafeInteger(id)&&!(Number(id)>=4_000_000_001&&Number(id)<=4_000_001_549));
  return {
    ...state.memoPrefill,
    facts: state.memoPrefill.facts || state.facts.join("\n"),
    requests: state.memoPrefill.requests || state.requests.join("\n"),
    conversationTranscript: conversationTranscript(messages),
    conversationSummary: state.caseSummary,
    courtCircuit: state.courtCircuit || "",
    caseStage: state.caseStage || "",
    importantDates: JSON.stringify(state.importantDates || []),
    assistantSourceIds: JSON.stringify([...new Set(sourceIds)].slice(0, 6)),
    assistantResearch: JSON.stringify({ stage: state.caseStage, orientation: state.orientation, dates: state.importantDates || [], comparisons: state.precedentMatches || [] }),
    handoffReady: state.readyForMemo ? "review" : "",
  };
}
