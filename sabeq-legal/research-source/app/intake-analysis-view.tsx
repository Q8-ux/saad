"use client";

import type { LegalIntakeState } from "@/lib/openai";
import type { AnalysisStage, IntakeResearch } from "@/lib/intake-analysis";
import ProceduralPositionView from "./procedural-position-view";

export type ConnectedIntakeState = LegalIntakeState & { research?: IntakeResearch; analysisStages?: AnalysisStage[] };

const copy = {
  ar: { title: "مسار تحليل القضية", library: "البحث في المكتبة والأحكام", analysis: "فهم الوقائع والاختصاص", source_review: "مطابقة الأسانيد بالنصوص", human_review: "تأكيد الوقائع واعتماد المجموعة", running: "جارٍ التنفيذ", completed: "اكتملت المرحلة", limited: "تحتاج استكمالاً", failed: "تعذرت المرحلة", pending: "بانتظار المراجعة", summary: "ملخص القضية للمراجعة", facts: "الوقائع", requests: "الطلبات", issues: "المسائل القانونية", dates: "التواريخ", missing: "ما يلزم لتحديد المحكمة", contradictions: "نقاط تحتاج توضيحاً", basis: "أسانيد التحليل", retrieved: "النصوص المسترجعة من مكتبة الموقع", archive: "حقول جدول أرشيفي للشرح", legislation: "تشريع", judgment: "حكم أو مبدأ قضائي", original: "فتح المصدر الأصلي", noLink: "رابط المصدر غير متاح", updated: "تحديث الفهرس", searched: "وقت البحث", noBasis: "لم يُعتمد سند نصي مناسب بعد. يستمر جمع الوقائع دون اختلاق مادة أو حكم.", caution: "حدود التحليل", inference: "صلة النص بالقضية — تطبيق مبدئي" },
  en: { title: "Case analysis", library: "Search the legal library and judgments", analysis: "Understand facts and jurisdiction", source_review: "Match citations to retrieved text", human_review: "Confirm facts; legal team approval", running: "In progress", completed: "Stage completed", limited: "Needs more information", failed: "Stage unavailable", pending: "Awaiting review", summary: "Case summary for review", facts: "Facts", requests: "Requested relief", issues: "Legal issues", dates: "Dates", missing: "Details needed for jurisdiction", contradictions: "Points to clarify", basis: "Analysis sources", retrieved: "Texts retrieved from the site library", archive: "Archived table fields for explanation", legislation: "Legislation", judgment: "Judgment or judicial principle", original: "Open original source", noLink: "Source link unavailable", updated: "Index updated", searched: "Searched at", noBasis: "No suitable textual basis has been established yet. Intake continues without inventing a statute or judgment.", caution: "Analysis limitations", inference: "Relevance to this case — provisional application" },
  ur: { title: "مقدمے کا تجزیہ", library: "قانونی لائبریری اور فیصلوں میں تلاش", analysis: "حقائق اور عدالتی اختیار", source_review: "حوالوں کی متن سے مطابقت", human_review: "حقائق کی تصدیق اور قانونی ٹیم کی منظوری", running: "جاری ہے", completed: "مرحلہ مکمل", limited: "مزید معلومات درکار", failed: "مرحلہ دستیاب نہیں", pending: "نظرثانی کا انتظار", summary: "نظرثانی کے لیے مقدمے کا خلاصہ", facts: "حقائق", requests: "مطالبات", issues: "قانونی نکات", dates: "تاریخیں", missing: "عدالت کے تعین کے لیے ضروری تفصیلات", contradictions: "وضاحت طلب نکات", basis: "تجزیے کے ماخذ", retrieved: "ویب سائٹ کی لائبریری سے حاصل متن", archive: "وضاحت کے لیے آرکائیوی جدول", legislation: "قانون", judgment: "عدالتی فیصلہ یا اصول", original: "اصل ماخذ کھولیں", noLink: "ماخذ کا ربط دستیاب نہیں", updated: "اشاریے کی تازہ کاری", searched: "تلاش کا وقت", noBasis: "ابھی مناسب متنی بنیاد نہیں ملی۔ فرضی قانون یا فیصلہ بنائے بغیر حقائق جمع کرنا جاری ہے۔", caution: "تجزیے کی حدود", inference: "مقدمے سے تعلق — ابتدائی اطلاق" },
};

export function IntakeStages({ stages, language }: { stages: AnalysisStage[]; language: string }) {
  const t = copy[language as keyof typeof copy] || copy.ar;
  return <ol className="intake-stages" aria-live="polite">{stages.map(stage => <li key={stage.id} data-status={stage.status}><span>{t[stage.id]}</span><small>{t[stage.status]}{stage.durationMs !== null && <> · {(stage.durationMs / 1000).toFixed(1)} s</>}</small></li>)}</ol>;
}

export default function IntakeAnalysisView({ state, language }: { state: ConnectedIntakeState; language: string }) {
  const t = copy[language as keyof typeof copy] || copy.ar;
  const routing = language === "en" ? { reason: "Why this classification", next: "Proposed next step", precedents: "Related Court of Cassation material", similar: "Relevant issue", different: "Differences and limits", analogous: "Provisional analogy", distinguished: "Material difference", insufficient: "Insufficient detail", empty: "No sufficiently related Cassation passage has been established in this search. Retrieved results alone do not establish applicability." } : language === "ur" ? { reason: "اس درجہ بندی کی وجہ", next: "مجوزہ اگلا قدم", precedents: "متعلقہ تمییزی عدالتی مواد", similar: "متعلقہ مسئلہ", different: "فرق اور حدود", analogous: "ابتدائی مماثلت", distinguished: "اہم فرق", insufficient: "ناکافی تفصیل", empty: "اس تلاش میں کافی متعلقہ تمییزی اقتباس ثابت نہیں ہوا۔ صرف نتیجہ ملنا اطلاق کی تصدیق نہیں۔" } : { reason: "لماذا هذا التصنيف؟", next: "الخطوة المقترحة", precedents: "أحكام ومبادئ التمييز ذات الصلة", similar: "وجه الصلة بالقضية", different: "الفروق وحدود المقارنة", analogous: "تشابه مبدئي للمراجعة", distinguished: "اختلاف مؤثر", insufficient: "المقتطف لا يكفي", empty: "لم يثبت في هذا البحث مقطع تمييز مناسب للاستناد إليه. ظهور نتيجة بحث وحده لا يثبت انطباقها على قضيتك." };
  const list = (title: string, items?: string[]) => items?.length ? <div><h4>{title}</h4><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div> : null;
  const catalogCopy = language === "en" ? { title: "Official research directory", note: "These are discovery links, not verified citations. Some collections require licensed access. Adding a link does not mean its texts have been imported." } : language === "ur" ? { title: "سرکاری تحقیق کے ذرائع", note: "یہ تلاش کے روابط ہیں، تصدیق شدہ حوالے نہیں۔ بعض مجموعوں کے لیے لائسنس درکار ہے۔ ربط شامل کرنے کا مطلب متن درآمد کرنا نہیں۔" } : { title: "دليل البحث في المصادر الرسمية", note: "هذه روابط لاستكمال البحث وليست أسانيد معتمدة. بعض المجموعات تتطلب وصولاً مرخصاً. إدراج الرابط لا يعني استيراد نصوصه." };
  return <section className="connected-analysis" aria-label={t.title}>
    <h3>{t.title}</h3>
    <ProceduralPositionView position={state.proceduralPosition} language={language === "en" || language === "ur" ? language : "ar"} />
    {state.orientation && <div className="intake-orientation">{state.orientation.categoryReason && <p><strong>{routing.reason}</strong><br />{state.orientation.categoryReason}</p>}{state.orientation.nextAction && <p><strong>{routing.next}</strong><br />{state.orientation.nextAction}</p>}</div>}
    {state.analysisStages && <IntakeStages stages={state.analysisStages} language={language} />}
    <details open><summary>{t.summary}</summary>
      <p>{state.caseSummary}</p>
      {list(t.facts, state.facts)}{list(t.requests, state.requests)}{list(t.issues, state.legalIssues)}
      {!!state.importantDates?.length && <div><h4>{t.dates}</h4><ul>{state.importantDates.map((item, i) => <li key={i}>{item.label}: {item.date}</li>)}</ul></div>}
    </details>
    {!!state.memoReadiness?.missing.length && <details><summary>{language === "en" ? "Details still needed for the memorandum" : language === "ur" ? "یادداشت کے لیے باقی ضروری معلومات" : "البيانات المتبقية لإكمال المذكرة"} ({state.memoReadiness.missing.length})</summary><ul>{state.memoReadiness.missing.map(gap => <li key={gap.key}>{gap.question}</li>)}</ul></details>}
    {list(t.missing, state.jurisdictionMissing)}{list(t.contradictions, state.contradictions)}
    <details open className="intake-precedents"><summary>{routing.precedents}</summary>
      {!state.precedentMatches?.length && <p>{routing.empty}</p>}
      {state.precedentMatches?.map((item, i) => <article className="intake-source" key={`${item.passageId}-${i}`}>
        <strong>{item.title}</strong><p>{routing[item.relevance]}</p>
        <blockquote>{item.quote}</blockquote>
        <p><strong>{routing.similar}</strong><br />{item.similarity}</p><p><strong>{routing.different}</strong><br />{item.differences}</p>
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original}</a>}
      </article>)}
    </details>
    <details open><summary>{t.basis}</summary>
      {!state.legalBasis?.length && <p>{t.noBasis}</p>}
      {state.legalBasis?.map((basis, i) => {
        const source = state.research?.sources.find(item => item.id === basis.sourceId);
        return <article className="intake-source" key={i}><strong>{basis.sourceId} · {source?.title}</strong><blockquote>{basis.quote}</blockquote><small>{t.inference}</small><p>{basis.application}</p>{source?.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original}</a>}</article>;
      })}
    </details>
    {state.research && <details><summary>{t.retrieved} ({state.research.sources.length})</summary>
      <p>{t.legislation}: {state.research.legislationCount} · {t.judgment}: {state.research.judgmentCount}{!!state.research.archivalTableCount && <> · {t.archive}: {state.research.archivalTableCount}</>}</p>
      <small>{t.searched}: <time dateTime={state.research.retrievedAt}>{new Date(state.research.retrievedAt).toLocaleString(language === "ur" ? "ur-PK" : language === "ar" ? "ar-KW" : "en-GB")}</time></small>
      {state.research.sources.map(source => <article className="intake-source" key={source.id}>
        <small>{source.id} · {source.kind === "judgment" ? t.judgment : source.kind === "archival_table"?t.archive:t.legislation}</small><h4>{source.title}</h4>
        <p>{source.reference} · {source.officialSource}</p><blockquote>{source.excerpt}</blockquote>
        {source.verification && <small>{language === "en" ? "Source checked" : language === "ur" ? "ماخذ کی جانچ" : "مطابقة النص للمصدر"}: {source.verification.checkedAt.slice(0,10)} · {language === "en" ? "Page" : language === "ur" ? "صفحہ" : "صفحة"} {source.verification.page}</small>}
        {source.libraryUpdatedAt && <small>{t.updated}: {source.libraryUpdatedAt}</small>}
        {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original}</a> : <p>{t.noLink}</p>}
      </article>)}
    </details>}
    <details className="analysis-limitations"><summary>{t.caution}</summary>{list("", [...new Set([...(state.analysisWarnings || []), ...(state.research?.limitations || [])])])}</details>
    {!!state.research?.catalogueSources?.length && <details><summary>{catalogCopy.title}</summary><p>{catalogCopy.note}</p><ul>{state.research.catalogueSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></details>}
  </section>;
}
