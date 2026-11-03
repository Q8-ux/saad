import { getD1 } from "@/db";
import { createPublicSession } from "@/lib/public-auth";
import { normalizeUsername, verifyPublicPassword } from "@/lib/public-password";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;
const INVALID = "اسم المستخدم أو كلمة المرور غير صحيحين.";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "public-password-login", 10, "hour");
    const data = await readJsonObject(request, 4_096);
    const username = normalizeUsername(data.username);
    if (typeof data.password !== "string" || data.password.length > 128) throw new RequestError(INVALID, 401);
    const record = await getD1().prepare(`SELECT c.salt, c.password_hash, c.iterations,
      u.id, u.name, u.phone, u.email, u.status, u.memo_limit AS memoLimit, u.assistant_limit AS assistantLimit
      FROM public_user_credentials c JOIN public_users u ON u.id = c.user_id
      WHERE c.username = ? COLLATE NOCASE LIMIT 1`).bind(username).first<{
      salt: string; password_hash: string; iterations: number;
      id: string; name: string; phone: string; email: string; status: string; memoLimit: number; assistantLimit: number;
    }>();
    // No public registration and no automatic password migration: accounts
    // are provisioned by authorised management staff only.
    if (!record || !(await verifyPublicPassword(data.password, record))) throw new RequestError(INVALID, 401);
    if (record.status !== "active") throw new RequestError("هذا الحساب موقوف؛ تواصل مع إدارة سابق.", 403);
    const session = await createPublicSession(record.id);
    const { id, name, phone, email, status, memoLimit, assistantLimit } = record;
    return privateJson({ ok: true, token: session.token, expiresAt: session.expiresAt, user: { id, name, phone, email, status, memoLimit, assistantLimit } });
  } catch (error) { return errorResponse(error); }
}
