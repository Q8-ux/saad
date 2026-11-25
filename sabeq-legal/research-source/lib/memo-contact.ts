export const memoContactCopy = {
  ar: { title: "بيانات التواصل للرد على طلبك", hint: "أدخل رقم الاتصال الذي يمكن للمجموعة التواصل معك من خلاله. رقم الاتصال مطلوب قبل الدفع أو توليد المذكرة، والبريد الإلكتروني اختياري.", email: "البريد الإلكتروني (اختياري)", phone: "رقم الاتصال", emailRequired: "أدخل بريدًا إلكترونيًا صحيحًا أو اترك الحقل فارغًا.", phoneRequired: "أدخل رقم اتصال صحيحًا من 8 إلى 15 رقمًا، مع رمز الدولة عند الحاجة.", confirmationRequired: "أقر بصحة المعلومات وبيانات التواصل قبل الدفع أو توليد المذكرة." },
  en: { title: "Contact details for our reply", hint: "Enter a contact number where our office can reach you. A contact number is required before payment or memo generation; email is optional.", email: "Email address (optional)", phone: "Contact number", emailRequired: "Enter a valid email address or leave it blank.", phoneRequired: "Enter a valid contact number with 8–15 digits, including the country code when needed.", confirmationRequired: "Confirm the accuracy of your information and contact details before payment or memo generation." },
  ur: { title: "جواب کے لیے رابطے کی معلومات", hint: "وہ رابطہ نمبر درج کریں جس پر دفتر آپ سے رابطہ کر سکے۔ ادائیگی یا یادداشت کی تیاری سے پہلے رابطہ نمبر ضروری ہے؛ ای میل اختیاری ہے۔", email: "ای میل (اختیاری)", phone: "رابطہ نمبر", emailRequired: "درست ای میل درج کریں یا خانہ خالی چھوڑ دیں۔", phoneRequired: "8 سے 15 ہندسوں کا درست رابطہ نمبر درج کریں، ضرورت ہو تو ملکی کوڈ بھی شامل کریں۔", confirmationRequired: "ادائیگی یا یادداشت کی تیاری سے پہلے معلومات اور رابطے کی تفصیلات کی درستگی کی تصدیق کریں۔" },
};
export type MemoContactIssue = "emailRequired" | "phoneRequired" | "confirmationRequired";
export function readMemoContact(raw: Record<string, unknown>) {
  const contactEmail = typeof raw.contactEmail === "string" ? raw.contactEmail.trim().toLowerCase() : "";
  const phone = typeof raw.contactPhone === "string" ? raw.contactPhone.trim().normalize("NFKC").replace(/[٠-٩۰-۹]/g, value => String(value.charCodeAt(0) - (value <= "٩" ? 0x660 : 0x6f0))) : "";
  const contactPhone = phone.replace(/[\s().-]/g, "").replace(/^00/, "+");
  if ((raw.contactEmail != null && typeof raw.contactEmail !== "string") || (contactEmail !== "" && (contactEmail.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactEmail)))) return { ok: false as const, issue: "emailRequired" as const, field: "contactEmail" };
  if (phone.length > 60 || !/^[+\d\s().-]+$/.test(phone) || !/^\+?[1-9]\d{7,14}$/.test(contactPhone)) return { ok: false as const, issue: "phoneRequired" as const, field: "contactPhone" };
  if (raw.informationConfirmed !== true) return { ok: false as const, issue: "confirmationRequired" as const, field: "informationConfirmed" };
  return { ok: true as const, contact: { contactEmail, contactPhone, informationConfirmed: true as const } };
}
