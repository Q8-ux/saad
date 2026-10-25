"use client";
import { useEffect, useRef, useState } from "react";
import { paymentCopy, safeSadadCheckoutUrl, readExistingSadadCheckout, type SadadCheckout } from "@/lib/sadad-client";

export default function MemoPaymentDialog({ payment, paymentToken, language, request, onPayment, onClose }: {
  payment: SadadCheckout; paymentToken: string; language: "ar" | "en" | "ur";
  request: (path: string, token: string, init?: RequestInit) => Promise<Response>;
  onPayment: (payment: SadadCheckout) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const callbacks = useRef({ request, onPayment }); callbacks.current = { request, onPayment };
  const inFlight = useRef(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const ui = paymentCopy[language];
  const copy = {
    ar: { title: "إتمام الدفع", back: "العودة إلى مراجعة الطلب", check: "التحقق من حالة الدفع", paid: "تأكد الدفع. ارجع إلى المراجعة لمتابعة توليد المذكرة.", status: "حالة الدفع", pending: "بانتظار تأكيد الدفع", failed: "لم يتأكد الدفع. راجع حالة الطلب قبل أي محاولة أخرى.", held: "الطلب قيد المعالجة؛ تحقق من حالته قبل أي محاولة أخرى.", refresh: "يُعاد التحقق تلقائياً عند رجوعك من صفحة الدفع. لا تحتاج إلى دفع جديد." },
    en: { title: "Complete payment", back: "Back to order review", check: "Check payment status", paid: "Payment verified. Return to review to generate the memo.", status: "Payment status", pending: "Awaiting payment confirmation", failed: "Payment is not confirmed. Check the order before another attempt.", held: "The order is being processed. Check its status before another attempt.", refresh: "Status is checked automatically when you return from checkout. No new payment is needed." },
    ur: { title: "ادائیگی مکمل کریں", back: "درخواست کے جائزے پر واپس", check: "ادائیگی کی حالت جانچیں", paid: "ادائیگی کی تصدیق ہوگئی۔ یادداشت بنانے کے لیے جائزے پر واپس جائیں۔", status: "ادائیگی کی حالت", pending: "ادائیگی کی تصدیق کا انتظار", failed: "ادائیگی کی تصدیق نہیں ہوئی۔ دوبارہ کوشش سے پہلے درخواست کی حالت جانچیں۔", held: "درخواست پر کارروائی جاری ہے۔ دوبارہ کوشش سے پہلے حالت جانچیں۔", refresh: "ادائیگی کے صفحے سے واپسی پر حالت خود جانچی جاتی ہے۔ نئی ادائیگی ضروری نہیں۔" },
  }[language];
  const paid = ["paid", "consumed"].includes(payment.status);
  const checkoutUrl = safeSadadCheckoutUrl(payment);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (inFlight.current || controller.signal.aborted) return;
      inFlight.current = true; setChecking(true); setError("");
      try {
        const data = await readExistingSadadCheckout(callbacks.current.request, { attemptId: payment.id, paymentToken }, controller.signal);
        if (!controller.signal.aborted) callbacks.current.onPayment(data);
      } catch { if (!controller.signal.aborted) setError(ui.policyError); }
      finally { inFlight.current = false; if (!controller.signal.aborted) setChecking(false); }
    }
    refreshRef.current = () => { void refresh(); };
    const focus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", focus);
    const end = Date.now() + 120000;
    const interval = window.setInterval(() => { if (Date.now() < end && document.visibilityState === "visible") void refresh(); }, 15000);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, [payment.id, paymentToken, ui.policyError]);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="memo-payment-dialog" aria-labelledby="payment-dialog-title" dir={language === "en" ? "ltr" : "rtl"} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="payment-dialog-content"><h2 id="payment-dialog-title">{copy.title}</h2><p>{ui.title}</p><strong className="payment-dialog-price"><bdi>{new Intl.NumberFormat(language === "ar" ? "ar-KW" : "en-KW", { style: "currency", currency: "KWD" }).format(payment.priceFils / 1000)}</bdi></strong>
    {payment.environment === "sandbox" && <p className="form-notice">{ui.test}</p>}
    <p>{ui.safety}</p><p role="status">{copy.status}: {paid ? copy.paid : ["failed", "cancelled", "expired"].includes(payment.status) ? copy.failed : payment.status === "generating" ? copy.held : copy.pending}</p>
    {!paid && checkoutUrl && <a className="button button-primary button-block" href={checkoutUrl} target="_blank" rel="noopener noreferrer">{ui.open}</a>}
    <p><small>{copy.refresh}</small></p><button type="button" className="button button-outline button-block" disabled={checking} onClick={() => refreshRef.current()}>{checking ? ui.checking : copy.check}</button>
    {error && <p className="form-notice error" role="alert">{error}</p>}
    <button type="button" className="button button-primary button-block" onClick={onClose}>{copy.back}</button></div>
  </dialog>;
}
