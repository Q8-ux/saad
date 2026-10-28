"use client";
import type { ProceduralPosition } from "@/lib/procedural-position";
import { interfaceLabel } from "@/lib/interface-language";

export default function ProceduralPositionView({ position, language }: { position?: ProceduralPosition; language: "ar" | "en" | "ur" }) {
  if (!position) return null;
  const t = {
    ar: { title: "الصفة والمحكمة المستنتجتان", original: "الصفة في أصل الدعوى", role: "الصفة في المرحلة الحالية", court: "المحكمة", unknown: "لم تتضح من الوقائع بعد", actor: "مَن قدّم الاستئناف أو الطعن: أنت أم الطرف الآخر؟", conflict: "توجد صفات متعارضة أو طعون من الطرفين. وضّح صفتك في الطلب الحالي.", note: "تعرّف مبدئي من الوقائع، قابل للتصحيح. لا يثبت قبول الطعن أو الاختصاص أو المواعيد.", evidence: "العبارات التي بُني عليها التعرّف" },
    en: { title: "Recognised role and court", original: "Original role", role: "Role at this stage", court: "Court", unknown: "Not yet clear from the facts", actor: "Who filed the appeal: you or the other party?", conflict: "Conflicting roles or appeals by both parties. Clarify your role in this request.", note: "Provisional recognition from the facts; you can correct it. This does not establish admissibility, jurisdiction or deadlines.", evidence: "Wording supporting recognition" },
    ur: { title: "اخذ شدہ حیثیت اور عدالت", original: "اصل دعوے میں حیثیت", role: "موجودہ مرحلے میں حیثیت", court: "عدالت", unknown: "حقائق سے ابھی واضح نہیں", actor: "اپیل کس نے کی: آپ نے یا دوسرے فریق نے؟", conflict: "حیثیتوں میں تضاد یا دونوں فریقوں کی اپیل ہے۔ موجودہ درخواست میں اپنی حیثیت واضح کریں۔", note: "حقائق سے ابتدائی شناخت؛ ترمیم ممکن ہے۔ اس سے اپیل کی قبولیت، اختیار یا میعاد ثابت نہیں ہوتی۔", evidence: "شناخت کی بنیاد بننے والے الفاظ" },
  }[language];
  return <section className="procedure-summary" aria-label={t.title} aria-live="polite"><h3>{t.title}</h3>
    <dl>{[[t.original, position.originalRole], [t.role, position.partyRole], [t.court, [position.court, position.courtCircuit].filter(Boolean).join(" — ")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ? interfaceLabel(value, language) : t.unknown}</dd></div>)}</dl>
    {(position.conflict || position.needsActor) && <p role="status">{position.conflict ? t.conflict : t.actor}</p>}
    {!!position.evidence.length && <details><summary>{t.evidence}</summary>{position.evidence.map((item, index) => <blockquote key={index}>{item}</blockquote>)}</details>}
    <small>{t.note}</small>
  </section>;
}
