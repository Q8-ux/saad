export const memoApprovalNotice = {
  ar: "هذه المذكرة مسودة غير معتمدة، ولا تُعد معتمدة أو صالحة للتقديم إلى المحكمة إلا بعد مراجعتها ومصادقة مجموعة سابق القانونية عليها.",
  en: "This memorandum is an unapproved draft. It is not approved or ready for court submission until Sabeq Legal Group has reviewed and ratified it.",
  ur: "یہ یادداشت غیر منظور شدہ مسودہ ہے۔ سابق لیگل گروپ کے جائزے اور منظوری کے بغیر اسے منظور شدہ یا عدالت میں پیش کرنے کے لیے تیار نہ سمجھیں۔",
};
export const intakeMemoFieldNames = ["caseNumber", "clientAddress", "otherAddress", "judgmentNumber", "judgmentDate", "judgmentCircuit", "judgmentCourt", "judgmentOperative", "originalRequests", "originalGrounds", "originalPlaintiff", "originalDefendant", "notificationDate", "appealGrounds", "announcementDate", "hearingDate", "hearingTime"] as const;
export type IntakeMemoFields = Partial<Record<typeof intakeMemoFieldNames[number], string>>;
export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type MemoPrefill = { caseType: string; court: string; clientName: string; partyRole: string; otherParty: string; allParties: string; facts: string; requests: string; legalIssues: string; conversationTranscript?: string; conversationSummary?: string; assistantSourceIds?: string; assistantResearch?: string; handoffReady?: string; handoffIssues?: string; courtCircuit?: string; caseStage?: string; caseTrack?: string; judgmentStatus?: string; importantDates?: string } & IntakeMemoFields;
type IntakeForMemo = {
  memoPrefill?: Partial<MemoPrefill>; memoFields?: IntakeMemoFields; readyForMemo?: boolean;
  facts?: string[]; requests?: string[]; caseType?: string; caseSummary?: string; caseStage?: string; court?: string; courtCircuit?: string;
  orientation?: { track?: string; judgment?: string }; importantDates?: Array<{ label: string; date: string }>;
  missingInformation?: string[]; jurisdictionMissing?: string[]; contradictions?: string[]; documentsNeeded?: string[];
  parties?: Array<{ name: string; role: string }>;
  proceduralPosition?: { conflict: boolean; needsActor: boolean };
};
export type MemoGap = { key: string; question: string };
const knownValue = (value: unknown, minimum = 2) => typeof value === "string" && value.trim().length >= minimum && !/^(?:غير (?:معروف|معلوم|محدد|متوفر)|لم (?:يذكر|يتحدد)|لا (?:أعرف|اعرف|أعلم|اعلم|أتذكر|اتذكر|أذكر|اذكر)|i (?:do not|don't) know|unknown|not known|معلوم نہیں|n\/a)(?:\s|$)|^[.\s…_-]+$/i.test(value.trim());
const knownName = (value: unknown) => knownValue(value) && !/^(?:المستخدم|الزائر|أنا|انا|الموكل|المدعي|المدعى عليه|المدعية|المدعى عليها|الخصم|الطرف الآخر|الطرف الاخر|مستخدم|خصم|visitor|user|plaintiff|defendant|client)$/i.test(String(value).trim());
export function memoIntakeGaps(state: IntakeForMemo, language = "ar"): MemoGap[] {
  const lang = language === "en" ? 1 : language === "ur" ? 2 : 0;
  const gaps: MemoGap[] = [];
  const add = (key: string, ar: string, en: string, ur: string) => gaps.push({ key, question: [ar, en, ur][lang] });
  const data = { ...state.memoPrefill, ...state.memoFields };
  const track = state.orientation?.track || data.caseTrack || "unknown";
  const judgment = state.orientation?.judgment || data.judgmentStatus || "unknown";
  const role = data.partyRole || "";
  if (!knownValue(state.caseStage || data.caseStage) || track === "unknown" || judgment === "unknown") add("procedure.stage", "ما آخر ما حصل في هذا الموضوع: هل بقي بينكما أم وصلت إليك ورقة من جهة رسمية؟", "What happened most recently: is this still between you, or have you received an official document?", "تازہ پیش رفت کیا ہے: معاملہ آپ دونوں تک ہے یا کوئی سرکاری کاغذ ملا ہے؟");
  if (state.proceduralPosition?.conflict || state.contradictions?.length) add("procedure.conflict", "ما التصحيح الذي نعتمده بشأن المعلومات المتعارضة في ملخص القضية؟", "Which correction should we use for the conflicting case details?", "متضاد معلومات میں کون سی تصحیح درست ہے؟");
  if (state.proceduralPosition?.needsActor) add("procedure.actor", "من طلب تغيير الحكم بعد صدوره، أنت أم الطرف الآخر؟", "Who asked to change the judgment after it was issued: you or the other party?", "فیصلہ بدلنے کی درخواست کس نے دی: آپ نے یا دوسرے فریق نے؟");
  else if (!knownValue(role)) add("client.role", "من بدأ المطالبة بحق من الآخر، وماذا طلب؟", "Who first claimed something from the other person, and what did they ask for?", "دوسرے سے حق کا مطالبہ پہلے کس نے کیا اور کیا مانگا؟");
  if (!knownName(data.clientName)) add("parties.client_name", "ما اسم الشخص الذي نعد المذكرة لمصلحته كما سيظهر فيها؟", "What name should appear for the person this memorandum represents?", "یادداشت کس شخص کے لیے ہے اور اس کا نام کیا لکھیں؟");
  if (!knownName(data.otherParty)) add("parties.other_name", "ما اسم الشخص أو الجهة التي تطالبها أو تطالبك؟", "What is the name of the person or organisation making or facing the claim?", "مطالبہ کرنے یا جس سے مطالبہ ہے اس شخص یا ادارے کا نام کیا ہے؟");
  if (!knownValue(data.facts || state.facts?.join("\n"), 20)) add("facts", "ما الذي حدث بالتسلسل بينك وبين الطرف الآخر؟", "What happened between you and the other party, in order?", "آپ اور دوسرے فریق کے درمیان واقعات کس ترتیب سے ہوئے؟");
  if (!knownValue(data.requests || state.requests?.join("\n"), 5)) add("relief", "ما النتيجة العملية التي تريد الوصول إليها؟", "What practical result do you want?", "آپ کیا عملی نتیجہ چاہتے ہیں؟");
  if (!knownValue(data.caseType || state.caseType)) add("matter.relationship", "ما علاقتك بالطرف الآخر وما سبب الخلاف بينكما؟", "What is your relationship to the other party and what caused the dispute?", "دوسرے فریق سے آپ کا تعلق اور اختلاف کی وجہ کیا ہے؟");
  if (!knownValue(data.court || state.court)) add("jurisdiction.facts", track === "initial" ? "أين حدثت الواقعة أو نُفذ الاتفاق؟" : "ما اسم الجهة المكتوب على آخر ورقة وصلتك عن هذه القضية؟", track === "initial" ? "Where did the event or agreement take place?" : "What authority is named on the latest document you received about this case?", "واقعہ کہاں ہوا یا آخری کاغذ پر کس ادارے کا نام ہے؟");
  const filed = ["pending", "challenge", "enforcement"].includes(track);
  if (filed && !knownValue(data.caseNumber)) add("procedure.case_number", "ما رقم القضية كما هو مكتوب في أوراقها؟", "What case number is printed on the case documents?", "مقدمے کے کاغذات پر نمبر کیا لکھا ہے؟");
  if (filed && !knownValue(state.courtCircuit || data.courtCircuit)) add("procedure.circuit", "ما اسم الدائرة المكتوب على آخر ورقة في القضية؟", "What chamber is printed on the latest case document?", "آخری عدالتی کاغذ پر کس چیمبر کا نام ہے؟");
  const challenging = /مستأنف|مستأنفة|طاعن|طاعنة/.test(role) && !/ضده|ضدها/.test(role);
  const claim = /^(?:ال)?مدع(?:ٍ|ي|ية)?$/.test(role);
  if (claim || challenging) {
    if (!knownValue(data.clientAddress)) add("parties.client_address", "ما العنوان الذي يمكن إعلان الطرف الذي نمثله عليه؟", "At what address can the represented party receive official notices?", "نمائندگی والے فریق کو نوٹس کس پتے پر مل سکتا ہے؟");
    if (!knownValue(data.otherAddress)) add("parties.other_address", "ما عنوان الطرف الآخر الذي يمكن إعلانه عليه؟", "At what address can the other party receive official notices?", "دوسرے فریق کو نوٹس کس پتے پر مل سکتا ہے؟");
  }
  if (track === "challenge" || /مستأنف|مستأنفة|طاعن|طاعنة|مطعون/.test(role)) {
    const fields: Array<[keyof IntakeMemoFields, string, string, string]> = [
      ["judgmentNumber", "ما رقم الحكم الذي نرد عليه أو نطلب تغييره؟", "What is the number of the judgment being answered or challenged?", "متعلقہ فیصلے کا نمبر کیا ہے؟"],
      ["judgmentDate", "ما تاريخ صدور الحكم المكتوب عليه؟", "What issue date is printed on the judgment?", "فیصلے پر اجرا کی تاریخ کیا ہے؟"],
      ["judgmentCourt", "ما اسم المحكمة التي أصدرت الحكم كما هو مكتوب عليه؟", "What issuing court is printed on the judgment?", "فیصلہ دینے والی عدالت کا نام کیا لکھا ہے؟"],
      ["judgmentOperative", "ماذا قضى الحكم بالضبط في نهايته؟", "What exactly did the judgment order?", "فیصلے کے آخر میں کیا حکم دیا گیا ہے؟"],
      ["notificationDate", "متى أُبلغت بالحكم، أو هل لم يصلك إعلان به بعد؟", "When were you notified of the judgment, or has notice not arrived yet?", "فیصلے کی اطلاع کب ملی یا ابھی نوٹس نہیں ملا؟"],
      ...(challenging ? [["appealGrounds", "ما الأمور التي ترى أن الحكم أخطأ فيها؟", "Which parts of the judgment do you believe are wrong?", "فیصلے کے کن حصوں کو آپ غلط سمجھتے ہیں؟"], ["originalRequests", "ماذا كان كل طرف يطلب قبل صدور الحكم؟", "What did each party request before judgment?", "فیصلے سے پہلے ہر فریق نے کیا مانگا تھا؟"], ["originalGrounds", "على أي وقائع ومستندات استندت المطالبة الأصلية؟", "Which facts and documents supported the original claim?", "اصل دعویٰ کن حقائق اور دستاویزات پر تھا؟"], ["originalPlaintiff", "من رفع الدعوى أول مرة وما اسمه؟", "Who filed the original claim and what is their name?", "اصل دعویٰ کس نے دائر کیا اور نام کیا ہے؟"], ["originalDefendant", "ضد من رُفعت الدعوى أول مرة وما اسمه؟", "Who was the original claim against and what is their name?", "اصل دعویٰ کس کے خلاف تھا اور نام کیا ہے؟"], ["judgmentCircuit", "ما الدائرة التي أصدرت الحكم كما هي مكتوبة عليه؟", "What issuing chamber is printed on the judgment?", "فیصلے پر کس چیمبر کا نام ہے؟"]] as Array<[keyof IntakeMemoFields, string, string, string]> : []),
    ];
    for (const [field, ar, en, ur] of fields) if (!knownValue(data[field])) add(`memo.${field}`, ar, en, ur);
  }
  if (!(state.importantDates || []).some(item => knownValue(item.date)) && !knownValue(data.judgmentDate)) add("dates.event", "متى حدثت الواقعة الأساسية التي سببت الخلاف؟", "When did the main event causing the dispute happen?", "اختلاف کا سبب بننے والا واقعہ کب ہوا؟");
  for (const [prefix, values] of [["missing", state.missingInformation], ["jurisdiction", state.jurisdictionMissing], ["document", state.documentsNeeded]] as const) for (const [index, value] of (values || []).entries()) if (value.trim()) add(`${prefix}.${index}`, `ما التفاصيل المتاحة لديك بشأن: ${value.replace(/[؟?]+$/g, "")}؟`, `What details do you have about: ${value.replace(/[؟?]+$/g, "")}?`, `اس بارے میں کیا تفصیل ہے: ${value.replace(/[؟?]+$/g, "")}؟`);
  return gaps;
}
// Conversation essentials differ from fields required on the final court form.
export function memoConversationGaps(state: IntakeForMemo, language = "ar"): MemoGap[] {
  const essential = new Set(["procedure.stage", "procedure.conflict", "procedure.actor", "client.role", "facts", "relief", "matter.relationship", "memo.judgmentOperative"]);
  return memoIntakeGaps(state, language).filter(gap => essential.has(gap.key));
}
export function canPrepareMemoHandoff(state: IntakeForMemo, messages: ConversationMessage[]) {
  return messages.some(message => message.role === "user") && !memoConversationGaps(state).length && conversationTranscript(messages).length <= 30000;
}
export function canOfferMemoHandoff(state: IntakeForMemo, messages?: ConversationMessage[]) {
  return state.readyForMemo === true && !memoIntakeGaps(state).length && (!messages || conversationTranscript(messages).length <= 30000);
}
export function isCompleteMemoHandoff(data?: MemoPrefill | null) {
  if (!data || data.handoffReady !== "review" || data.handoffIssues !== "[]" || (data.conversationTranscript?.length || 0) > 30000) return false;
  let dates: Array<{ label: string; date: string }> = [];
  try { const parsed = JSON.parse(data.importantDates || "[]"); if (Array.isArray(parsed) && parsed.every(item => item && typeof item.label === "string" && typeof item.date === "string")) dates = parsed; else return false; } catch { return false; }
  return !memoIntakeGaps({ memoPrefill: data, caseStage: data.caseStage, courtCircuit: data.courtCircuit, orientation: { track: data.caseTrack, judgment: data.judgmentStatus }, importantDates: dates }).length;
}
export function conversationTranscript(messages: ConversationMessage[], language = "ar") {
  const labels = language === "en" ? ["Visitor", "Legal assistant"] : language === "ur" ? ["صارف", "قانونی معاون"] : ["الزائر", "المساعد القانوني"];
  return messages.map(message => `${labels[message.role === "user" ? 0 : 1]}:\n${message.content}`).join("\n\n");
}
export function buildMemoHandoff(state: IntakeForMemo & { memoPrefill: MemoPrefill; caseSummary: string; facts: string[]; requests: string[]; precedentMatches?: Array<{ sourceId?: string; chunkId?: number; similarity: string; differences: string; relevance: string; title?: string; sourceUrl?: string }>; legalBasis?: Array<{ sourceId: string }>; research?: { sources: Array<{ id: string; chunkId?: number }> } }, messages: ConversationMessage[]): MemoPrefill {
  const ids = new Set([...(state.legalBasis || []).map(b => b.sourceId), ...(state.precedentMatches || []).map(p => p.sourceId)]);
  const sourceIds = (state.research?.sources || []).filter(source => ids.has(source.id)).map(source => source.chunkId).filter(id => Number.isSafeInteger(id)&&!(Number(id)>=4_000_000_001&&Number(id)<=4_000_001_549));
  return {
    ...state.memoPrefill,
    ...Object.fromEntries(intakeMemoFieldNames.flatMap(key => typeof state.memoFields?.[key] === "string" ? [[key, state.memoFields[key]]] : [])),
    facts: state.memoPrefill.facts || state.facts.join("\n"),
    requests: state.memoPrefill.requests || state.requests.join("\n"),
    conversationTranscript: conversationTranscript(messages),
    conversationSummary: state.caseSummary,
    courtCircuit: state.courtCircuit || "",
    caseStage: state.caseStage || "",
    caseTrack: state.orientation?.track || "unknown",
    judgmentStatus: state.orientation?.judgment || "unknown",
    handoffIssues: JSON.stringify(memoIntakeGaps(state).map(gap => gap.key)),
    importantDates: JSON.stringify(state.importantDates || []),
    assistantSourceIds: JSON.stringify([...new Set(sourceIds)].slice(0, 6)),
    assistantResearch: JSON.stringify({ stage: state.caseStage, orientation: state.orientation, dates: state.importantDates || [], comparisons: state.precedentMatches || [] }),
    handoffReady: canOfferMemoHandoff(state, messages) ? "review" : "",
  };
}
