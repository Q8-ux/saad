"use client";

import { useEffect, useState } from "react";

// Rounded from the measured 15.041 s to first audio; not a service deadline.
const ESTIMATED_SECONDS = 16;
const copy = {
  ar: { label: "الوقت المتوقع لبدء صوت المساعد", unit: "ثانية", delayed: "تجهيز الصوت يستغرق وقتاً أطول من المتوقع… لا يزال المساعد يعمل." },
  en: { label: "Estimated time until the assistant speaks", unit: "seconds", delayed: "Audio is taking longer than estimated… the assistant is still working." },
  ur: { label: "معاون کے بولنے تک متوقع وقت", unit: "سیکنڈ", delayed: "آواز تیار ہونے میں اندازے سے زیادہ وقت لگ رہا ہے… معاون کام کر رہا ہے۔" },
};

/** Mounted for one continuous processing turn; unmount cancels the timer. */
export default function VoiceCountdown({ language }: { language: "ar" | "en" | "ur" }) {
  const [remaining, setRemaining] = useState(ESTIMATED_SECONDS);
  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil(ESTIMATED_SECONDS - (performance.now() - started) / 1000));
      setRemaining(next);
      if (next === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  const t = copy[language];
  return <div className="assistant-voice-countdown">
    {remaining > 0 ? <>
      <span>{t.label}</span>
      <span className="voice-countdown-value" role="timer" aria-live="off" aria-atomic="true"><b>{new Intl.NumberFormat(language === "ar" ? "ar-KW" : language === "ur" ? "ur-PK" : "en").format(remaining)}</b> {t.unit}</span>
    </> : <span role="status">{t.delayed}</span>}
  </div>;
}
