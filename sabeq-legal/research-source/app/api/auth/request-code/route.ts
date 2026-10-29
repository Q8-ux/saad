import { getD1 } from "@/db";
import { EmailDeliveryError, sendVerificationCode } from "@/lib/email";
import { normalizeEmail, randomVerificationCode, verificationCodeHash } from "@/lib/public-auth";
import { assertSameOrigin, cleanEmail, cleanLanguage, cleanPhone, cleanString, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  let challengeId = "";
  try {
    assertSameOrigin(request);
    const data = await readJsonObject(request, 8_000);
    await enforceRateLimit(request, "auth-request-code", 5, "hour");
    const name = cleanString(data.name, "الاسم", { min: 2, max: 120 });
    const phone = cleanPhone(data.phone);
    const email = normalizeEmail(cleanEmail(data.email));
    const language = cleanLanguage(data.language);
    const recent = await getD1().prepare(
      `SELECT id FROM email_verification_challenges
       WHERE email = ? AND created_at > datetime('now', '-60 seconds')
       LIMIT 1`,
    ).bind(email).first<{ id: string }>();
    if (recent) throw new RequestError("انتظر دقيقة قبل طلب رمز جديد.", 429);

    challengeId = crypto.randomUUID();
    const code = randomVerificationCode();
    const codeHash = await verificationCodeHash(challengeId, email, code);
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    await getD1().batch([
      getD1().prepare(
        `UPDATE email_verification_challenges
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE email = ? AND consumed_at IS NULL`,
      ).bind(email),
      getD1().prepare(
        `INSERT INTO email_verification_challenges
          (id, name, phone, email, code_hash, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(challengeId, name, phone, email, codeHash, expiresAt),
    ]);
    await sendVerificationCode({ to: email, name, code, language });
    return privateJson({ ok: true, challengeId, expiresIn: 600 });
  } catch (error) {
    if (challengeId) {
      try {
        await getD1().prepare("DELETE FROM email_verification_challenges WHERE id = ?").bind(challengeId).run();
      } catch {
        // The delivery error is the actionable result; cleanup is best effort.
      }
    }
    if (error instanceof EmailDeliveryError) {
      const message = error.kind === "configuration"
        ? "خدمة إرسال رمز التحقق غير مهيأة حالياً."
        : "تعذر إرسال رمز التحقق إلى البريد حالياً. حاول مجدداً.";
      return privateJson({ error: message }, 503);
    }
    return errorResponse(error);
  }
}
