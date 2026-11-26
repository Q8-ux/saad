// The server owns the four-minute generation budget. The client keeps a
// response margin so it can receive the server's structured result/request id.
export const MEMO_GENERATION_TIMEOUT_MS = 270_000;
export class MemoGenerationStopped extends Error {
  constructor(public reason: "cancelled" | "timeout") { super(reason); this.name = "MemoGenerationStopped"; }
}
// Bounds even a transport that ignores abort, including a stalled response body.
export async function runMemoGeneration<T>(operation: (signal: AbortSignal) => Promise<T>, controller: AbortController, timeoutMs = MEMO_GENERATION_TIMEOUT_MS): Promise<T> {
  if (controller.signal.aborted) throw new MemoGenerationStopped("cancelled");
  let expired = false;
  const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
  let detach = () => {};
  const stopped = new Promise<never>((_, reject) => {
    const stop = () => reject(new MemoGenerationStopped(expired ? "timeout" : "cancelled"));
    if (controller.signal.aborted) stop();
    else { controller.signal.addEventListener("abort", stop, { once: true }); detach = () => controller.signal.removeEventListener("abort", stop); }
  });
  try {
    return await Promise.race([stopped, operation(controller.signal)]);
  } finally { clearTimeout(timer); detach(); }
}
export function memoGenerationCopy(language: string) {
  if (language === "en") return { approval: "I confirm the accuracy of the case and contact information, have reviewed the notice above, and approve generating the draft.", required: "Confirm the review below before generating.", pending: "Generating and reviewing the draft…", seconds: "seconds", cancel: "Cancel generation", cancelled: "Generation cancelled. Your case information is still here.", timeout: "Waiting for the result exceeded five minutes. Your information is still here; please try again later.", limit: "You can cancel at any time. Waiting for the result is limited to five minutes." };
  if (language === "ur") return { approval: "میں مقدمے اور رابطے کی معلومات کی درستگی کی تصدیق کرتا ہوں، اوپر کا نوٹس پڑھ لیا ہے اور مسودے کی تیاری منظور کرتا ہوں۔", required: "تیاری سے پہلے نیچے تصدیق کریں۔", pending: "مسودہ تیار اور جانچا جا رہا ہے…", seconds: "سیکنڈ", cancel: "تیاری منسوخ کریں", cancelled: "تیاری منسوخ ہوگئی۔ مقدمے کی معلومات یہاں موجود ہیں۔", timeout: "نتیجے کا انتظار پانچ منٹ سے زیادہ ہوگیا۔ معلومات یہاں موجود ہیں؛ بعد میں دوبارہ کوشش کریں۔", limit: "کسی بھی وقت منسوخ کر سکتے ہیں۔ نتیجے کے انتظار کی حد پانچ منٹ ہے۔" };
  return { approval: "أقر بصحة المعلومات وبيانات التواصل، وراجعت التنبيه أعلاه، وأوافق على توليد المسودة.", required: "ضع علامة الموافقة أدناه قبل التوليد.", pending: "جارٍ توليد المسودة ومراجعتها…", seconds: "ثانية", cancel: "إلغاء التوليد", cancelled: "أُلغي التوليد. بيانات القضية ما زالت موجودة ويمكنك تعديلها.", timeout: "تجاوز انتظار النتيجة خمس دقائق. بياناتك ما زالت موجودة؛ حاول لاحقاً.", limit: "يمكنك الإلغاء في أي وقت. الحد الأقصى لانتظار النتيجة خمس دقائق." };
}
