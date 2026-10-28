import type { LegalIntakeState } from "./openai";
import { memoIntakeGaps, memoConversationGaps } from "./memo-handoff";
import { hasAsked, inferQuestionKey, validIntakeQuestion, type QuestionMemory } from "./intake-context";

/** A model readiness flag cannot bypass missing case facts or the source review. */
export function applyIntakeReadiness(state: LegalIntakeState, previous: QuestionMemory, language = "ar", analysisMessage = state.assistantMessage) {
  const gaps = memoIntakeGaps(state, language);
  state.memoReadiness = { complete: gaps.length === 0, missing: gaps };
  const conversationGaps = memoConversationGaps(state, language);
  if (gaps.length) {
    state.readyForMemo = false;
    state.phase = conversationGaps.length ? "gathering" : "review";
    state.progress = Math.min(state.progress, 90);
  }
  const memory: QuestionMemory = {
    asked: [...previous.asked],
    resolved: [...new Set([...previous.resolved, ...(state.questionMemory?.resolved || [])])],
    unavailable: [...new Set([...previous.unavailable, ...(state.questionMemory?.unavailable || [])])],
  };
  const gap = conversationGaps.find(item => !hasAsked(memory, item.key, item.question) && (!/^(?:missing|jurisdiction|document)\.\d+$/.test(item.key) || !hasAsked(memory, inferQuestionKey(item.question), item.question)));
  const candidate = gap && state.nextQuestions.find(question => validIntakeQuestion(question) && inferQuestionKey(question) === gap.key && !hasAsked(memory, gap.key, question));
  const question = candidate || gap?.question;
  state.questionKey = gap?.key || "";
  state.nextQuestions = question ? [question] : [];
  // Earlier stages may have selected a different, undisplayed question.
  // Record only the question that the visitor actually sees.
  if (question) memory.asked.push({ key: gap!.key, text: question });
  memory.asked = memory.asked.slice(-64);
  state.questionMemory = memory;
  state.resolvedTopics = memory.resolved;
  state.unavailableTopics = memory.unavailable;
  const acknowledgement = language === "en" ? "I have updated the case details." : language === "ur" ? "مقدمے کی تفصیلات تازہ کر دی گئی ہیں۔" : "حدّثت بيانات القضية من إجاباتك.";
  const unresolved = language === "en" ? "Essential details are still missing; they must be completed before transfer." : language === "ur" ? "اہم معلومات ابھی نامکمل ہیں؛ منتقلی سے پہلے انہیں مکمل کرنا ضروری ہے۔" : "لا تزال بيانات مؤثرة ناقصة؛ يلزم استكمالها قبل نقلها للمذكرة.";
  const analysis = analysisMessage.split(/(?<=[.؟?])|\n/).filter(part => !/[؟?]/.test(part)).join(" ").trim() || acknowledgement;
  const readyToPrepare = language === "en" ? "You can now open memorandum preparation and review the remaining form details there." : language === "ur" ? "اب یادداشت کی تیاری کھولیں اور باقی فارم کی تفصیلات وہاں دیکھیں۔" : "يمكنك الآن الانتقال لإعداد المذكرة ومراجعة البيانات الشكلية في نموذجها.";
  state.assistantMessage = `${analysis}\n${question || (conversationGaps.length ? unresolved : readyToPrepare)}`;
  return state;
}
