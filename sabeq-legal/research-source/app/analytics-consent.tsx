"use client";

import { useEffect, useState } from "react";
import { analyticsConsentEvent, analyticsRestricted, getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsent } from "../lib/visitor-analytics";
import { PrivacyLink } from "./privacy-notice";
import type { Language } from "./site-content";

const copy = {
  ar: {
    title: "خصوصيتك وقياس الزيارات", description: "القياس اختياري ومتوقف حتى توافق. بعد الموافقة نستخدم معرّفاً عشوائياً لقياس الأقسام ومصدر الزيارة والجهاز والبلد التقريبي والوقت النشط، دون نص المحادثة أو مستنداتك. المساعد والمذكرات متاحان عند الرفض أيضاً.",
    accept: "أوافق على التحليلات", refuse: "أرفض التحليلات", withdraw: "سحب الموافقة", change: "تغيير إعدادات التحليلات",
    granted: "وافقت على قياس الزيارات. يمكنك سحب الموافقة في أي وقت.", denied: "التحليلات مرفوضة؛ الخدمات الأساسية متاحة.", unset: "التحليلات متوقفة بانتظار اختيارك.", unavailable: "تعذر حفظ إعداد الخصوصية؛ القياس متوقف في هذه الصفحة. تحقق من إعدادات التخزين لحفظ اختيارك للزيارات القادمة.", restricted: "إعداد الخصوصية في متصفحك يمنع القياس.",
  },
  en: {
    title: "Your privacy and site analytics", description: "Analytics are optional and off until you agree. With consent, a random identifier measures sections, visit source, device, approximate country and active time, without your conversation or documents. The assistant and memos remain available if you refuse.",
    accept: "Accept analytics", refuse: "Reject analytics", withdraw: "Withdraw consent", change: "Change analytics settings",
    granted: "You accepted site analytics. You can withdraw consent at any time.", denied: "Analytics rejected. Core services remain available.", unset: "Analytics are off while you make your choice.", unavailable: "Your privacy preference could not be saved. Analytics are off on this page. Check storage settings to save your choice for future visits.", restricted: "Your browser privacy setting prevents analytics.",
  },
  ur: {
    title: "آپ کی رازداری اور ویب پیمائش", description: "پیمائش اختیاری ہے اور رضامندی تک بند رہتی ہے۔ اجازت کے بعد بے ترتیب شناخت سے دیکھے گئے حصے، آمد کا ذریعہ، آلہ، اندازاً ملک اور فعال وقت ناپے جاتے ہیں، گفتگو یا دستاویزات کا متن نہیں۔ انکار پر بھی معاون اور قانونی یادداشت کی خدمات دستیاب ہیں۔",
    accept: "پیمائش قبول کریں", refuse: "پیمائش مسترد کریں", withdraw: "رضامندی واپس لیں", change: "پیمائش کی ترتیبات بدلیں",
    granted: "آپ نے پیمائش کی اجازت دی ہے؛ کسی بھی وقت رضامندی واپس لے سکتے ہیں۔", denied: "پیمائش مسترد ہے؛ بنیادی خدمات دستیاب ہیں۔", unset: "آپ کے انتخاب تک پیمائش بند ہے۔", unavailable: "رازداری کا انتخاب محفوظ نہیں ہو سکا؛ اس صفحے پر پیمائش بند ہے۔ آئندہ وزٹ کے لیے انتخاب محفوظ کرنے کو ذخیرہ کی ترتیبات دیکھیں۔", restricted: "براؤزر کی رازداری ترتیب پیمائش روکتی ہے۔",
  },
};

export default function AnalyticsConsentSettings({ language }: { language: Language }) {
  const t = copy[language];
  const [consent, setConsent] = useState<AnalyticsConsent>("unset");
  const [restricted, setRestricted] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const update = () => { setConsent(getAnalyticsConsent()); setRestricted(analyticsRestricted()); };
    update(); setExpanded(!["granted", "denied"].includes(getAnalyticsConsent()));
    window.addEventListener(analyticsConsentEvent, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(analyticsConsentEvent, update); window.removeEventListener("storage", update); };
  }, []);

  function choose(value: "granted" | "denied") {
    if (setAnalyticsConsent(value)) setExpanded(false);
  }

  return <section className="analytics-consent container" id="analytics-preferences" aria-labelledby="analytics-consent-title" dir={language === "en" ? "ltr" : "rtl"}>
    <h2 id="analytics-consent-title">{t.title}</h2>
    <p role="status" aria-live="polite">{consent === "unavailable" ? t.unavailable : restricted ? t.restricted : t[consent]}</p>
    {expanded ? <>
      <p>{t.description} <PrivacyLink language={language} /></p>
      <div className="analytics-consent-actions"><button type="button" disabled={restricted} onClick={() => choose("granted")}>{t.accept}</button><button type="button" onClick={() => choose("denied")}>{consent === "granted" ? t.withdraw : t.refuse}</button></div>
    </> : <div className="analytics-consent-actions"><button type="button" onClick={() => setExpanded(true)}>{t.change}</button>{consent === "granted" && <button type="button" onClick={() => choose("denied")}>{t.withdraw}</button>}</div>}
  </section>;
}
