import type { Language } from "./site-content";

const links = {
  ar: {
    link: "سياسة الخصوصية", newTab: "قراءة سياسة الخصوصية في تبويب جديد",
  },
  en: {
    link: "Privacy policy", newTab: "Read the privacy policy in a new tab",
  },
  ur: {
    link: "رازداری کی پالیسی", newTab: "رازداری کی پالیسی نئے ٹیب میں پڑھیں",
  },
};

export function PrivacyLink({ language }: { language: Language }) {
  const text = links[language];
  return <a className="privacy-link" href={`./privacy${language === "ar" ? "" : `-${language}`}.html`} target="_blank" rel="noopener noreferrer" aria-label={text.newTab}>{text.link}</a>;
}
