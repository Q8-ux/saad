import { verificationEmailDelivery } from "@/lib/verification-email-settings";
import { cleanEmail, RequestError } from "@/lib/request-security";

export class EmailDeliveryError extends Error {
  kind: "configuration" | "delivery";

  constructor(kind: "configuration" | "delivery", public reason = "unknown") {
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

  return deliverEmail(apiKey, {
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
  });
}

async function deliverEmail(apiKey: string, message: { from: string; to: string[]; subject: string; text: string; html?: string }) {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    console.error("verification_email_delivery_failed", { stage: "transport", reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "connection" });
    throw new EmailDeliveryError("delivery", "transport");
  }

  if (!response.ok) {
    let reason = response.status === 401 ? "api_key_rejected" : "provider_rejected";
    if (response.status === 403) {
      try {
        const result = await response.json() as { message?: unknown };
        const message = typeof result.message === "string" ? result.message : "";
        if (/domain is not verified/i.test(message)) reason = "sender_domain_unverified";
        else if (/only send testing emails/i.test(message)) reason = "restricted_test_recipient";
      } catch { /* Provider response details are never logged. */ }
    }
    console.error("verification_email_delivery_failed", { stage: "provider", status: response.status, reason });
    throw new EmailDeliveryError("delivery", reason);
  }
  try {
    const result = await response.json() as { id?: unknown };
    if (typeof result.id !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(result.id)) {
      throw new EmailDeliveryError("delivery");
    }
    return result.id;
  } catch {
    console.error("verification_email_delivery_failed", { stage: "receipt", reason: "invalid_receipt" });
    throw new EmailDeliveryError("delivery");
  }
}


/**
 * Administrative registration invitation, not a verification/activation code.
 * The visitor must request and verify their own one-time code on the public site.
 * A successful provider receipt does not mean delivered or email verified.
 */
export async function sendRegistrationInvitation(recipient: unknown, recipientName: unknown) {
  const to = cleanEmail(recipient).trim().toLowerCase();
  const name = typeof recipientName === "string" ? recipientName.trim().slice(0, 120) : "";
  const config = await verificationEmailDelivery();
  if (!config.apiKey?.trim() || !config.fromEmail?.trim()) throw new EmailDeliveryError("configuration", "missing_settings");
  const website = "https://www.sabeq.legal/";
  const intro = name ? `مرحباً ${name}،` : "مرحباً،";
  const instructions = "أنشئ المكتب حساباً لك في مجموعة سابق القانونية. لإكمال التحقق، افتح الموقع واختر تسجيل الدخول، ثم أدخل اسمك وهاتفك وبريدك الإلكتروني واضغط إرسال رمز التحقق. سيصلك رمز صالح لمدة عشر دقائق؛ لن يُفعّل الحساب حتى تُدخله في الموقع.";
  return deliverEmail(config.apiKey, {
    from: config.fromEmail,
    to: [to],
    subject: "إكمال تسجيل حسابك لدى مجموعة سابق القانونية",
    text: `${intro}\n\n${instructions}\n\n${website}\n\nإذا لم تطلب إنشاء الحساب، تجاهل هذه الرسالة.`,
    html: `<div dir="rtl" style="font:17px/1.9 Tahoma,Arial,sans-serif;color:#173643;background:#f3f8fa;padding:24px">
      <div style="max-width:520px;margin:auto;padding:25px;background:white;border:1px solid #dfebf0;border-radius:16px">
        <h2 style="margin:0 0 12px">دعوة إكمال تسجيل حسابك</h2>
        <p>${escapeHtml(intro)}</p><p>${escapeHtml(instructions)}</p>
        <p><a href="${website}" style="color:#006b79;font-weight:bold">فتح موقع سابق القانونية</a></p>
        <p style="color:#647b83;font-size:14px">إذا لم تطلب إنشاء الحساب، تجاهل هذه الرسالة.</p>
      </div></div>`,
  });
}

export async function sendTestEmail(recipient: unknown, expectedSender: unknown) {
  const to = cleanEmail(recipient), expectedFromEmail = cleanEmail(expectedSender).toLowerCase();
  const config = await verificationEmailDelivery();
  const fromEmail = (config.fromEmail.match(/<([^<>]+)>$/)?.[1] || config.fromEmail).trim().toLowerCase();
  if (!config.apiKey || !fromEmail) throw new RequestError("احفظ إعدادات إرسال البريد أولاً.", 409);
  if (fromEmail !== expectedFromEmail) throw new RequestError("تغير عنوان المرسل المحفوظ. حدّث الإعدادات قبل إرسال الاختبار.", 409);
  try {
    const time = new Intl.DateTimeFormat("ar-KW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" }).format(new Date());
    const messageId = await deliverEmail(config.apiKey, { from: config.fromEmail, to: [to], subject: "رسالة تجريبية من مجموعة سابق القانونية", text: `هذه رسالة اختبار لتأكيد إعدادات الإرسال من مجموعة سابق القانونية.\n\nالمرسل: ${fromEmail}\nوقت الاختبار بتوقيت الكويت: ${time}` });
    return { ok: true, accepted: true, fromEmail, to, messageId };
  } catch (error) {
    const message = error instanceof EmailDeliveryError && error.reason === "sender_domain_unverified"
      ? "رفض مزود البريد الإرسال: نطاق sabeq.legal غير موثّق. يلزم استكمال توثيق النطاق لدى المزود."
      : error instanceof EmailDeliveryError && error.reason === "api_key_rejected"
        ? "رفض مزود البريد مفتاح الإرسال المحفوظ."
        : "لم يؤكد مزود البريد قبول رسالة الاختبار. راجع اتصال المزود وإعداداته قبل إعادة المحاولة.";
    throw new RequestError(message, 502);
  }
}

/** Password recovery links are only sent to a server-side pre-approved address. */
export async function sendManagementRecoveryEmail(to: string, username: string, token: string) {
  const config = await verificationEmailDelivery();
  if (!config.apiKey?.trim() || !config.fromEmail?.trim()) throw new EmailDeliveryError("configuration", "missing_settings");
  const destination = cleanEmail(to).trim().toLowerCase();
  const url = "https://q8-ux.github.io/saad/sabeq-admin-preview/#reset=" + encodeURIComponent(token);
  return deliverEmail(config.apiKey, {
    from: config.fromEmail,
    to: [destination],
    subject: "استعادة كلمة مرور إدارة سابق القانونية",
    text: "تم طلب استعادة كلمة مرور لوحة الإدارة للحساب " + username +
      ".\nافتح الرابط خلال عشر دقائق ثم اختر كلمة مرور جديدة:\n" + url +
      "\nإذا لم تطلب استعادة كلمة المرور فتجاهل هذه الرسالة.",
    html: '<div dir="rtl" style="font:17px/1.9 Tahoma,Arial,sans-serif;padding:25px"><h2>استعادة كلمة مرور إدارة سابق</h2><p>تم طلب استعادة دخول الحساب ' +
      escapeHtml(username) + '.</p><p><a href="' + escapeHtml(url) +
      '">فتح رابط الاستعادة المؤقت</a></p><p>صالح لمدة عشر دقائق ولمرة واحدة فقط. إذا لم تطلبه فتجاهل الرسالة.</p></div>',
  });
}
