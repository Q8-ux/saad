import type { LegalIntakeState } from "./openai";
import { memoIntakeGaps } from "./memo-handoff";
import { hasAsked, inferQuestionKey, validIntakeQuestion, type QuestionMemory } from "./intake-context";

/** A model readiness flag cannot bypass missing case facts or the source review. */
export function applyIntakeReadiness(state: LegalIntakeState, previous: QuestionMemory, language = "ar") {
  const gaps = memoIntakeGaps(state, language);
  state.memoReadiness = { complete: gaps.length === 0, missing: gaps };
  if (!gaps.length) return state;
  state.readyForMemo = false;
  state.phase = "gathering";
  state.progress = Math.min(state.progress, 90);
  const memory: QuestionMemory = {
    asked: [...previous.asked],
    resolved: [...new Set([...previous.resolved, ...(state.questionMemory?.resolved || [])])],
    unavailable: [...new Set([...previous.unavailable, ...(state.questionMemory?.unavailable || [])])],
  };
  const gap = gaps.find(item => !hasAsked(memory, item.key, item.question) && (!/^(?:missing|jurisdiction|document)\.\d+$/.test(item.key) || !hasAsked(memory, inferQuestionKey(item.question), item.question)));
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
  state.assistantMessage = `${acknowledgement}\n${question || unresolved}`;
  return state;
}
