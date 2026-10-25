import { getD1 } from "@/db";
import { createPublicSession, normalizeEmail, secureEqual, verificationCodeHash } from "@/lib/public-auth";
import { assertSameOrigin, cleanEmail, cleanString, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

type ChallengeRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  consumed_at: string | null;
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = await readJsonObject(request, 8_000);
    await enforceRateLimit(request, "auth-verify-code", 15, "hour");
    const challengeId = cleanString(data.challengeId, "طلب التحقق", { min: 20, max: 80 });
    const email = normalizeEmail(cleanEmail(data.email));
    const code = cleanString(data.code, "رمز التحقق", { min: 6, max: 6 });
    if (!/^\d{6}$/.test(code)) throw new RequestError("رمز التحقق يجب أن يتكون من ستة أرقام.");

    const challenge = await getD1().prepare(
      `SELECT id, name, phone, email, code_hash, attempts, expires_at, consumed_at
       FROM email_verification_challenges
       WHERE id = ? AND email = ?
       LIMIT 1`,
    ).bind(challengeId, email).first<ChallengeRow>();
    const now = Math.floor(Date.now() / 1000);
    if (!challenge || challenge.consumed_at || challenge.expires_at <= now) {
      throw new RequestError("انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.", 410);
    }
    if (challenge.attempts >= 5) throw new RequestError("تم تجاوز عدد المحاولات. اطلب رمزاً جديداً.", 429);

    const expectedHash = await verificationCodeHash(challenge.id, challenge.email, code);
    if (!secureEqual(expectedHash, challenge.code_hash)) {
      await getD1().prepare(
        "UPDATE email_verification_challenges SET attempts = attempts + 1 WHERE id = ?",
      ).bind(challenge.id).run();
      throw new RequestError("رمز التحقق غير صحيح.", 401);
    }

    const consumed = await getD1().prepare(
      `UPDATE email_verification_challenges
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND consumed_at IS NULL`,
    ).bind(challenge.id).run();
    if (!consumed.meta.changes) throw new RequestError("تم استخدام رمز التحقق مسبقاً.", 409);

    const existing = await getD1().prepare(
      "SELECT id, status FROM public_users WHERE email = ? LIMIT 1",
    ).bind(email).first<{ id: string; status: string }>();
    if (existing && existing.status !== "active") throw new RequestError("هذا الحساب موقوف أو محذوف. تواصل مع الإدارة.", 403);
    const userId = existing?.id || crypto.randomUUID();
    await getD1().prepare(
      `INSERT INTO public_users (id, name, phone, email, email_verified_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         email_verified_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(userId, challenge.name, challenge.phone, email).run();
    const session = await createPublicSession(userId);
    await getD1().prepare(
      "DELETE FROM public_user_sessions WHERE expires_at <= ?",
    ).bind(now).run();
    return privateJson({
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: userId, name: challenge.name, phone: challenge.phone, email },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
