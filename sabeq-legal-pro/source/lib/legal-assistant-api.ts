export type AssistantLanguage = "ar" | "en" | "ur";
export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantSource = { title: string; excerpt: string; url: string | null };
export type AssistantReply = { answer: string; sources: AssistantSource[] };

export const ASSISTANT_ENDPOINT = "https://sabeq-legal-research-api.onrender.com/api/legal/assistant";
export const MAX_QUESTION_LENGTH = 6000;

export function sourceLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    // Only government source links are clickable; response text never becomes HTML.
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!url.hostname.endsWith(".gov.kw")) return null;
    return url.href;
  } catch { return null; }
}

export function assistantQuestion(question: string, history: AssistantMessage[]): string {
  const text = question.trim();
  if (!text) throw new Error("اكتب سؤالك أولاً.");
  if (text.length > MAX_QUESTION_LENGTH) throw new Error("اختصر السؤال إلى 6000 حرف أو أقل.");
  const context = history.slice(-4).map(message =>
    `${message.role === "user" ? "المستخدم" : "المساعد"}: ${message.content.slice(0, 1000)}`,
  ).join("\n\n");
  return `${context ? `سياق المحادثة السابقة، وليس مصدراً قانونياً معتمداً:\n${context}\n\n` : ""}السؤال الحالي:\n${text}\n\nاطلب توضيح الدولة أو الوقائع المؤثرة عند غموضها. لا تختلق مواد أو مواعيد قانونية، ولا تعتبر ردود المحادثة السابقة مراجع. ميّز بين النص المتاح والاستنتاج، وبيّن ما يحتاج تحققاً.`;
}

export async function requestLegalAssistant(
  question: string,
  history: AssistantMessage[],
  language: AssistantLanguage,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<AssistantReply> {
  const input = assistantQuestion(question, history);
  let response: Response;
  try {
    response = await fetcher(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input, language }),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("تعذّر الاتصال بالمساعد. تحقّق من الإنترنت وأعد المحاولة.");
  }
  if (response.status === 429) throw new Error("المساعد مشغول حالياً. حاول بعد قليل.");
  if (!response.ok) throw new Error("تعذّر الحصول على إجابة الآن. أعد المحاولة.");
  let data: Record<string, unknown>;
  try { data = await response.json(); } catch { throw new Error("لم تصل إجابة صالحة. أعد المحاولة."); }
  if (!data || typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("لم تصل إجابة صالحة. أعد المحاولة.");
  }
  const sources: AssistantSource[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(data.sources) ? data.sources.slice(0, 8) : []) {
    if (!item || typeof item !== "object" || typeof item.title !== "string" || !item.title.trim()) continue;
    const title = item.title.trim().slice(0, 300);
    const url = sourceLink(item.sourceUrl);
    const key = `${title}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ title, url, excerpt: typeof item.excerpt === "string" ? item.excerpt.slice(0, 700) : "" });
  }
  return { answer: data.answer.trim(), sources };
}
