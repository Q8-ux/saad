"use client";
import { Check } from "lucide-react";
import type { Language } from "./site-content";

// Adapted indicator pattern from React Bits Stepper (David Haz, 2026).
// See THIRD_PARTY_NOTICES.md. The wizard owns validation and navigation.
export default function MemoProgress({ labels, current, label, language }: {
  labels: string[]; current: number; label: string; language: Language;
}) {
  const state = language === "ar" ? ["مرحلة سابقة", "أنت هنا", "لاحقًا"] :
    language === "en" ? ["Previous step", "You are here", "Upcoming"] : ["پچھلا مرحلہ", "آپ یہاں ہیں", "اگلا"];
  const announcement = language === "ar" ? `المرحلة ${current + 1} من ${labels.length}: ${labels[current]}` :
    language === "en" ? `Step ${current + 1} of ${labels.length}: ${labels[current]}` :
    `مرحلہ ${current + 1} از ${labels.length}: ${labels[current]}`;
  return <div className="memo-progress">
    <ol className="memo-progress-track" aria-label={label}>
      {labels.map((title, index) => {
        const status = index < current ? "complete" : index === current ? "active" : "upcoming";
        return <li key={title} data-status={status} aria-current={index === current ? "step" : undefined}>
          <span className="memo-progress-badge" aria-hidden="true">{index < current ? <Check size={17} /> : index + 1}</span>
          <span className="memo-progress-copy"><strong>{title}</strong><small>{state[index < current ? 0 : index === current ? 1 : 2]}</small></span>
        </li>;
      })}
    </ol>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
  </div>;
}

