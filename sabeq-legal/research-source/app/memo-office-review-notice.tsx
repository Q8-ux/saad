type Props = { paymentStatus?: string; language: "ar" | "en" | "ur" };

export default function MemoOfficeReviewNotice({ paymentStatus, language }: Props) {
  if (!paymentStatus || !["paid", "generating", "consumed"].includes(paymentStatus)) return null;
  const copy = {
    ar: {
      title: "مراجعة المذكرة واعتمادها",
      review: "ستتولى مجموعة سابق القانونية مراجعة مذكرتكم وتدقيقها واعتمادها خلال يومي عمل من تاريخ إتمام الدفع.",
      collection: "يُرجى التواصل مع المكتب بعد انقضاء هذه المدة لاستلام النسخة النهائية المختومة والموقعة، تمهيدًا لتقديمها إلى المحكمة.",
    },
    en: {
      title: "Office review and approval",
      review: "Sabeq Legal Group will review, check and approve your memorandum within two business days of payment.",
      collection: "Please contact the office after this period to collect the final stamped and signed copy for submission to the court.",
    },
    ur: {
      title: "یادداشت کا جائزہ اور منظوری",
      review: "سابق لیگل گروپ ادائیگی مکمل ہونے کے بعد دو کاروباری دنوں کے اندر آپ کی یادداشت کا جائزہ لے گا، جانچ کرے گا اور منظوری دے گا۔",
      collection: "اس مدت کے بعد عدالت میں پیش کرنے کے لیے حتمی مہر شدہ اور دستخط شدہ نقل وصول کرنے کی غرض سے دفتر سے رابطہ کریں۔",
    },
  }[language];
  return <section className="form-notice memo-office-review" role="status" dir={language === "en" ? "ltr" : "rtl"}>
    <strong>{copy.title}</strong><p>{copy.review}</p><p>{copy.collection}</p>
  </section>;
}
