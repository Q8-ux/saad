export type SadadCheckout = { id: string; checkoutUrl?: string | null; status: string; priceFils: number; currency: string; environment: string };
export function safeSadadCheckoutUrl(payment: SadadCheckout) {
  try {
    const url = new URL(payment.checkoutUrl || "");
    const host = payment.environment === "sandbox" ? "sandbox.sadadpay.net" : "sadadpay.net";
    return url.protocol === "https:" && url.hostname === host && !url.username && !url.password && !url.port && /^\/pay\/[^/?#]+\/?$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}
export async function readExistingSadadCheckout(request: (path: string, token: string, init?: RequestInit) => Promise<Response>, attempt: { attemptId: string; paymentToken: string }, signal?: AbortSignal): Promise<SadadCheckout> {
  const response = await request(`/api/payments/sadad?id=${encodeURIComponent(attempt.attemptId)}`, attempt.paymentToken, { method: "GET", signal });
  const payment = await response.json();
  if (!response.ok || payment.id !== attempt.attemptId) throw new Error("PAYMENT_STATUS_UNAVAILABLE");
  return payment;
}
export function newPaymentAttempt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { attemptId: crypto.randomUUID(), paymentToken: btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") };
}
const PENDING_KEY = "sabeq-sadad-pending-v1";
export function loadPaymentAttempt(): ReturnType<typeof newPaymentAttempt> | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
    return data && /^[a-f0-9-]{36}$/i.test(data.attemptId) && /^[A-Za-z0-9_-]{43}$/.test(data.paymentToken) ? { attemptId: data.attemptId, paymentToken: data.paymentToken } : null;
  } catch { return null; }
}
export function rememberPaymentAttempt(attempt: ReturnType<typeof newPaymentAttempt>) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(attempt));
}
export function clearPaymentAttempt() { try { sessionStorage.removeItem(PENDING_KEY); } catch { /* no stored capability */ } }
export const paymentCopy = {
  ar: { title: "رسوم إعداد المذكرة", pay: "متابعة إلى دفع الرسوم", verify: "التحقق من الدفع وتوليد المذكرة", open: "فتح صفحة الدفع", waiting: "أكمل الدفع في صفحة الدفع الآمنة، ثم ارجع واضغط التحقق من الدفع. لا تدفع مرة أخرى عند تأخر التأكيد.", checking: "جارٍ التحقق من الدفع…", test: "بيئة اختبار — لا تحصيل فعلي", safety: "تُفتح صفحة الدفع الآمنة لإدخال بيانات الدفع. تبقى بيانات القضية لدى سابق.", changed: "تغيرت بيانات الطلب بعد إنشاء الفاتورة. أعد البيانات السابقة أو تواصل مع المكتب قبل دفع جديد.", policyError: "تعذر التحقق من رسوم الخدمة. أعد المحاولة قبل الدفع." },
  en: { title: "Memo preparation fee", pay: "Continue to payment", verify: "Verify payment and generate", open: "Open secure checkout", waiting: "Pay on the secure checkout page, then return and verify payment. Do not pay again if confirmation is delayed.", checking: "Checking payment…", test: "Test environment — no actual charge", safety: "Enter payment details on the secure checkout page. Your case details stay with Sabeq.", changed: "The case changed after creating the invoice. Restore the original details or contact the office before paying again.", policyError: "Could not check the service fee. Try again before paying." },
  ur: { title: "یادداشت کی تیاری کی فیس", pay: "ادائیگی کی طرف جائیں", verify: "ادائیگی کی تصدیق اور یادداشت بنائیں", open: "ادائیگی کا صفحہ کھولیں", waiting: "محفوظ صفحے پر ادائیگی کریں، پھر واپس آ کر تصدیق کریں۔ تصدیق میں تاخیر پر دوبارہ ادائیگی نہ کریں۔", checking: "ادائیگی کی تصدیق جاری ہے…", test: "آزمائشی ماحول — حقیقی ادائیگی نہیں", safety: "ادائیگی کی معلومات محفوظ صفحے پر دیں۔ مقدمے کی تفصیل سابق کے پاس رہتی ہے۔", changed: "انوائس کے بعد مقدمے کی معلومات بدل گئیں۔ اصل معلومات واپس کریں یا دوبارہ ادائیگی سے پہلے دفتر سے رابطہ کریں۔", policyError: "فیس کی تصدیق نہیں ہو سکی۔ ادائیگی سے پہلے دوبارہ کوشش کریں۔" },
};
