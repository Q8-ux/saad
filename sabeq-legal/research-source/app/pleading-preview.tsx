"use client";
import { useMemo } from "react";
import { pleadingText, renderPleadingHtml, type PleadingDocument } from "@/lib/pleading-document";
import { interfaceText as tr, interfaceLabel, type InterfaceLanguage } from "@/lib/interface-language";

export default function PleadingPreview({document,text,language="ar"}:{document:PleadingDocument;text:string;language?:InterfaceLanguage}) {
  const html=useMemo(()=>renderPleadingHtml(document),[document]);
  const cleanText=useMemo(()=>pleadingText(document) || text,[document,text]);
  return <section lang={language} dir={language === "en" ? "ltr" : "rtl"} className="pleading-preview" aria-label={tr(language,"معاينة الصحيفة بالقالب المعتمد")}>
    <p className="template-badge">{interfaceLabel(document.title,language)} · {tr(language,"الصيغة المعتمدة")} · {tr(language,"الإصدار")} {document.template.version}</p>
    <iframe srcDoc={html} title={`${interfaceLabel(document.title,language)} — ${tr(language,"معاينة منسقة")}`} sandbox="allow-same-origin allow-modals" />
    <details><summary>{tr(language,"عرض النص الكامل")}</summary><pre lang="ar" dir="rtl">{cleanText}</pre></details>
  </section>;
}
