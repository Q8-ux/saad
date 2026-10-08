// The input budget is shared by the browser and API. Never cut a case message.
export const ASSISTANT_MESSAGE_LIMIT = 16_000;
export const ASSISTANT_CONTEXT_LIMIT = 60_000;
export const ASSISTANT_REQUEST_BYTES = 384_000;
export type AssistantMessage = { role: "user" | "assistant"; content: string };
const copy = {
  ar: { short: "اكتب رسالة من حرفين على الأقل.", long: "الرسالة تتجاوز الحد المسموح: ١٦٬٠٠٠ حرف. اختصرها أو وزّعها على رسائل مع توضيح أنها أجزاء من القضية نفسها. لم يُرسل النص.", history: "سياق المحادثة يتجاوز الحد المسموح: ٦٠٬٠٠٠ حرف. صدّر المحادثة ثم ابدأ محادثة جديدة بملخص الوقائع. لم يُرسل النص.", hint: "الحد الأقصى للرسالة: ١٦٬٠٠٠ حرف." },
  en: { short: "Enter at least two characters.", long: "The message exceeds 16,000 characters. Shorten it or send labelled parts of the same case. The text was not sent.", history: "The conversation context exceeds 60,000 characters. Export it, then start a new conversation with a summary of the facts. The text was not sent.", hint: "Message limit: 16,000 characters." },
  ur: { short: "کم از کم دو حروف لکھیں۔", long: "پیغام ۱۶٬۰۰۰ حروف کی حد سے زیادہ ہے۔ اسے مختصر کریں یا اسی مقدمے کے واضح حصوں میں بھیجیں۔ متن نہیں بھیجا گیا۔", history: "گفتگو کا سیاق ۶۰٬۰۰۰ حروف سے زیادہ ہے۔ گفتگو برآمد کرکے حقائق کے خلاصے کے ساتھ نئی گفتگو شروع کریں۔ متن نہیں بھیجا گیا۔", hint: "پیغام کی حد: ۱۶٬۰۰۰ حروف۔" },
};
export function assistantInputCopy(language: string) { return copy[language === "en" ? "en" : language === "ur" ? "ur" : "ar"]; }
export function normalizeAssistantMessage(value: unknown): string {
  return typeof value === "string" ? value.replace(/\u0000/g, " ").replace(/\r\n?/g, "\n").trim() : "";
}
export function validateAssistantInput(value: unknown, history: unknown, language = "ar"): { message: string; messages: AssistantMessage[] } {
  const text = assistantInputCopy(language);
  const message = normalizeAssistantMessage(value);
  if (message.length < 2) throw new Error(text.short);
  if (message.length > ASSISTANT_MESSAGE_LIMIT) throw new Error(text.long);
  const previous: AssistantMessage[] = Array.isArray(history) ? history.slice(-15).flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const raw = item as Record<string, unknown>;
    if (raw.role !== "user" && raw.role !== "assistant") return [];
    const content = normalizeAssistantMessage(raw.content);
    return content ? [{ role: raw.role, content }] : [];
  }) : [];
  // Assistant replies may be longer than a user input. The total context guard
  // covers both roles, without truncating either one's text.
  if (previous.some(item => item.role === "user" && item.content.length > ASSISTANT_MESSAGE_LIMIT)) throw new Error(text.long);
  const messages: AssistantMessage[] = [...previous, { role: "user", content: message }];
  if (messages.reduce((total, item) => total + item.content.length, 0) > ASSISTANT_CONTEXT_LIMIT) throw new Error(text.history);
  return { message, messages };
}
