import type { Language } from "./site-content";

const notices = {
  ar: {
    link: "سياسة الخصوصية", newTab: "قراءة سياسة الخصوصية في تبويب جديد",
    contact: "نستخدم بياناتك للرد وترتيب الخدمة. أرسل المعلومات اللازمة فقط؛ إرسال الطلب لا يعني قبول القضية أو بدء التمثيل القانوني.",
    account: "نستخدم بياناتك للتحقق من الحساب وتقديم الخدمة، ونستعين بمزوّد لإرسال رمز التحقق إلى بريدك.",
    ai: "تعالج أدوات الذكاء الاصطناعي النص والصوت والمستندات عبر مزوّد خارجي. شارك ما يلزم فقط وما تملك صلاحية مشاركته، وراجع المسودة مع محامٍ قبل الاعتماد.",
    files: "نطلب حذف الملفات المؤقتة بعد التحليل؛ قد تخضع سجلات المعالجة لمدد احتفاظ لدى المزوّد. الحذف من الشاشة لا يحذف السجلات المحفوظة.",
  },
  en: {
    link: "Privacy policy", newTab: "Read the privacy policy in a new tab",
    contact: "We use your details to reply and arrange the service. Share only what is necessary. Sending a request does not establish legal representation or acceptance of a case.",
    account: "We use your details to verify your account and provide the service, with an email provider delivering the verification code.",
    ai: "AI tools process text, audio and documents through an external provider. Share only necessary information that you are authorised to disclose, and have a lawyer review drafts before relying on them.",
    files: "We request deletion of temporary files after analysis; provider processing logs may have separate retention periods. Removing an item on screen does not delete saved records.",
  },
  ur: {
    link: "رازداری کی پالیسی", newTab: "رازداری کی پالیسی نئے ٹیب میں پڑھیں",
    contact: "ہم آپ کی معلومات جواب دینے اور خدمت ترتیب دینے کے لیے استعمال کرتے ہیں۔ صرف ضروری معلومات دیں۔ درخواست بھیجنے سے مقدمہ قبول یا قانونی نمائندگی شروع نہیں ہوتی۔",
    account: "آپ کی معلومات اکاؤنٹ کی تصدیق اور خدمت کے لیے استعمال ہوتی ہیں؛ تصدیقی کوڈ ای میل فراہم کنندہ کے ذریعے بھیجا جاتا ہے۔",
    ai: "مصنوعی ذہانت متن، آواز اور دستاویزات کو بیرونی فراہم کنندہ کے ذریعے پراسیس کرتی ہے۔ صرف ضروری اور مجاز معلومات دیں اور مسودے پر اعتماد کرنے سے پہلے وکیل سے جائزہ لیں۔",
    files: "تجزیے کے بعد عارضی فائلوں کے حذف کی درخواست بھیجی جاتی ہے؛ فراہم کنندہ کے ریکارڈ کی مدت الگ ہو سکتی ہے۔ سکرین سے ہٹانے سے محفوظ ریکارڈ حذف نہیں ہوتا۔",
  },
};

export function PrivacyLink({ language }: { language: Language }) {
  const text = notices[language];
  return <a className="privacy-link" href={`./privacy${language === "ar" ? "" : `-${language}`}.html`} target="_blank" rel="noopener noreferrer" aria-label={text.newTab}>{text.link}</a>;
}

export default function PrivacyNotice({ language, context }: { language: Language; context: "contact" | "account" | "ai" | "files" }) {
  return <aside className="privacy-notice" role="note"><p>{notices[language][context]} <PrivacyLink language={language} /></p></aside>;
}
