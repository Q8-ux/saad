import { verificationEmailDelivery } from "@/lib/verification-email-settings";

export class EmailDeliveryError extends Error {
  kind: "configuration" | "delivery";

  constructor(kind: "configuration" | "delivery") {
    super(`EMAIL_${kind.toUpperCase()}`);
    this.name = "EmailDeliveryError";
    this.kind = kind;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

export async function sendVerificationCode(options: {
  to: string;
  name: string;
  code: string;
  language: "ar" | "en" | "ur";
}) {
  let settings;
  try { settings = await verificationEmailDelivery(); }
  catch { throw new EmailDeliveryError("configuration"); }
  const apiKey = settings.apiKey?.trim();
  const from = settings.fromEmail?.trim();
  if (!apiKey || !from) throw new EmailDeliveryError("configuration");

  const isEnglish = options.language === "en";
  const direction = isEnglish ? "ltr" : "rtl";
  const safeName = escapeHtml(options.name);
  const subject = isEnglish
    ? "Your Sabeq Legal verification code"
    : options.language === "ur"
      ? "سابق لیگل تصدیقی کوڈ"
      : "رمز التحقق من مجموعة سابق القانونية";
  const greeting = isEnglish
    ? `Hello ${safeName},`
    : options.language === "ur"
      ? `${safeName}، خوش آمدید`
      : `مرحباً ${safeName}،`;
  const instruction = isEnglish
    ? "Use this code to verify your email and continue to the requested service:"
    : options.language === "ur"
      ? "اپنا ای میل تصدیق کرکے مطلوبہ خدمت جاری رکھنے کے لیے یہ کوڈ استعمال کریں:"
      : "استخدم هذا الرمز للتحقق من بريدك الإلكتروني والمتابعة إلى الخدمة المطلوبة:";
  const expiry = isEnglish
    ? "The code expires in 10 minutes. If you did not request it, ignore this email."
    : options.language === "ur"
      ? "یہ کوڈ 10 منٹ میں ختم ہو جائے گا۔ اگر آپ نے درخواست نہیں کی تو اس پیغام کو نظر انداز کریں۔"
      : "تنتهي صلاحية الرمز خلال 10 دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.";

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject,
        text: `${greeting}\n\n${instruction}\n\n${options.code}\n\n${expiry}`,
        html: `<div dir="${direction}" style="font-family:Arial,Tahoma,sans-serif;background:#f4f8fa;padding:28px;color:#102331">
          <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dbe5eb;border-radius:18px;padding:28px">
            <h2 style="margin:0 0 12px;color:#071d2a">${greeting}</h2>
            <p style="font-size:17px;line-height:1.8;margin:0 0 20px">${instruction}</p>
            <div dir="ltr" style="font-size:34px;letter-spacing:10px;font-weight:800;text-align:center;color:#0e7dba;background:#e8f5fb;border-radius:14px;padding:16px">${options.code}</div>
            <p style="font-size:14px;line-height:1.8;color:#667784;margin:20px 0 0">${expiry}</p>
          </div>
        </div>`,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new EmailDeliveryError("delivery");
  }

  if (!response.ok) {
    throw new EmailDeliveryError("delivery");
  }
  try {
    const result = await response.json() as { id?: unknown };
    if (typeof result.id !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(result.id)) {
      throw new EmailDeliveryError("delivery");
    }
  } catch {
    throw new EmailDeliveryError("delivery");
  }
}
