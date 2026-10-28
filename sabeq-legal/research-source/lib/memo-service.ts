import { apiUrl } from "@/lib/runtime-urls";
import { paymentTestToken } from "@/lib/payment-test-client";

const noReplay = new Set(["/api/legal/memo", "/api/legal/assistant", "/api/legal/transcribe", "/api/legal/speech", "/api/legal/voice-turn", "/api/legal/memo-dictation", "/api/legal/tools"]);

export async function memoFetch(path: string, token: string, init: RequestInit = {}) {
  const route = path.split("?")[0];
  const payment = ["/api/payments/sadad", "/api/payments/mock"].includes(route);
  const method = (init.method || "GET").toUpperCase();
  const canRetry = !noReplay.has(route) && (!payment || method === "GET");
  const headers = new Headers(init.headers);
  const testToken = payment || route === "/api/legal/memo" ? paymentTestToken() : "";
  if (testToken) headers.set("X-Sabeq-Payment-Test", testToken);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", ["/api/legal/assistant", "/api/legal/voice-turn"].includes(route) ? "text/event-stream" : "application/json");
  let lastError: unknown;
  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
    init.signal?.throwIfAborted();
    try {
      // A lost payment POST response can hide a created invoice; retain its
      // capability and let an explicit retry recover the same server attempt.
      const timeout = payment ? AbortSignal.timeout(method === "GET" ? 15_000 : 60_000) : null;
      const signal = timeout ? init.signal ? AbortSignal.any([init.signal, timeout]) : timeout : init.signal;
      const response = await fetch(apiUrl(path), { ...init, signal, headers, mode: "cors", credentials: "omit", cache: "no-store" });
      const retryableResponse = (route === "/api/legal/analyze-documents" || (payment && method === "GET")) && [502, 503, 504].includes(response.status);
      if (!retryableResponse || attempt === 2) return response;
      await response.body?.cancel();
    } catch (error) {
      init.signal?.throwIfAborted();
      if (noReplay.has(route)) throw error;
      lastError = error;
    }
    if (canRetry && attempt < 2) {
      await new Promise<void>((resolve, reject) => {
        const finish = () => { init.signal?.removeEventListener("abort", abort); resolve(); };
        const timer = setTimeout(finish, 550 * (attempt + 1));
        const abort = () => { clearTimeout(timer); init.signal?.removeEventListener("abort", abort); reject(init.signal?.reason); };
        init.signal?.addEventListener("abort", abort, { once: true });
        if (init.signal?.aborted) abort();
      });
    }
  }
  console.error("Memo service request could not be reached", { service: payment ? "payment" : "analysis", method, error: lastError instanceof Error ? lastError.name : "unknown" });
  throw new Error(payment
    ? method === "GET"
      ? "تعذر الاتصال بخدمة الدفع للتحقق من الرسوم أو حالة الطلب. احتفظ بطلبك وأعد المحاولة. لا تدفع مجدداً إذا سبق السداد."
      : "تعذر استلام رد خدمة الدفع. قد يكون الطلب قد وصل؛ احتفظ بهذه الجلسة وأعد المحاولة بنفس الطلب قبل أي دفع جديد."
    : "تعذر الاتصال بخدمة التحليل. بقيت بياناتك ومرفقاتك في هذه الجلسة؛ أعد المحاولة.");
}
