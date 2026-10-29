type Message = { role: "user" | "assistant"; content: string };
type Previous = { missingInformation?: unknown; contradictions?: unknown };
export const PROJECT_CONTEXT_REVISION = "project-context-1";
export const projectContextInstructions = `سياق المشروع محصور في القضية الحالية. conversation هو السجل المصدر، ولكل رسالة sourceId. كلام الزائر ادعاء مقدم منه وليس حقيقة قضائية مثبتة؛ كلام المساعد وتحليله السابق ليسا دليلاً ولا مصدراً قانونياً. قدّم التصحيح الصريح الأحدث على الملخص الأقدم، مع حفظ ما لا يمسه التصحيح. إن تعارضت روايتان دون تصحيح صريح فبيّن التعارض ولا تحسمه بالتخمين. احتفظ بالمعلومة المذكورة ولا تعِد طلبها. النقص يُسجّل ولا يُملأ باسم أو تاريخ أو مستند متخيّل. verifiedLegalSources وحدها تُراجع للأسانيد؛ سجل السياق لا يضيف مصدراً قانونياً. معرّفات السياق والملخصات وملاحظات المراجعة تبقى خارج نص المذكرة النهائية.`;

// A change tag for this request, never an identity, signature or access token.
function tag(value: unknown) {
  const text = JSON.stringify(value); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${(hash >>> 0).toString(16)}-${text.length}`;
}
const list = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string").map(x => x.replace(/\u0000/g, " ").trim()).filter(Boolean).slice(0, 16) : [];

export function prepareCaseContext(messages: Message[], previous: Previous | null = null) {
  const conversation = messages.map((message, index) => ({ ...message, sourceId: `turn-${index + 1}`, sourceKind: message.role === "user" ? "visitor-statement" : "prior-analysis" }));
  const userSources = conversation.filter(message => message.role === "user");
  const corrections = userSources.filter(message => /(?:^|\n)\s*(?:تصحيح|للتصحيح|الصحيح|أقصد|اقصد|correction|actually)(?=\s|[:：])/iu.test(message.content));
  return {
    conversation,
    projectContext: {
      revision: PROJECT_CONTEXT_REVISION, project: "sabeq", scope: "current-case-only",
      sourceFingerprint: tag([conversation, previous]),
      visitorSourceIds: userSources.map(message => message.sourceId),
      explicitCorrectionSourceIds: corrections.map(message => message.sourceId),
      latestCorrectionSourceId: corrections.at(-1)?.sourceId || null,
      priorAnalysisIsEvidence: false, suppliedStatementsAreProvenFacts: false,
      missingInformation: list(previous?.missingInformation), contradictions: list(previous?.contradictions),
      legalAuthoritySource: "verifiedLegalSources-only", persistentCrossCaseMemory: false,
    },
  };
}
