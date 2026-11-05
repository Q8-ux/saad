import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { sendManagementRecoveryEmail } from "@/lib/email";
import { managementRecoveryAccount, resetManagementPasswordWithProof, normalizeManagementUsername } from "@/lib/management-password";
import { RequestError } from "@/lib/request-security";

const generic = { ok: true, message: "إذا كان للحساب بريد استرداد معتمد، فستصلك رسالة تحتوي رابطاً مؤقتاً." };
const user = /^[a-z][a-z0-9_]{2,31}$/;
const tokenFormat = /^[A-Za-z0-9_-]{43}$/;
type RecoveryEnvironment = { MANAGEMENT_RECOVERY_EMAILS?: string; MANAGEMENT_OWNER_EMAIL?: string };

export function mappedRecoveryEmail(accountId: string, raw: string | undefined) {
  // Only a server secret may designate a recovery address; no arbitrary
  // address submitted by a visitor can gain authority over an admin account.
  if (!raw || raw.length > 4096) return "";
  try {
    const map: unknown = JSON.parse(raw);
    if (!map || typeof map !== "object" || Array.isArray(map)) return "";
    const value = (map as Record<string, unknown>)[accountId];
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254 ? value.trim().toLowerCase() : "";
  } catch { return ""; }
}

const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2,"0")).join("");

export async function requestManagementRecovery(data: Record<string, unknown>) {
  const username = normalizeManagementUsername(data.username);
  if (!user.test(username)) return generic;
  const account = await managementRecoveryAccount(username);
  const runtime = env as unknown as RecoveryEnvironment;
  // The existing site owner email is already a privileged administrator
  // identity. It may recover administrator accounts if a per-account recovery
  // email has not been explicitly configured. Never apply it to operators.
  const email = account && (
    mappedRecoveryEmail(account.id, runtime.MANAGEMENT_RECOVERY_EMAILS) ||
    (account.role === "administrator" &&
      typeof runtime.MANAGEMENT_OWNER_EMAIL === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(runtime.MANAGEMENT_OWNER_EMAIL.trim())
      ? runtime.MANAGEMENT_OWNER_EMAIL.trim().toLowerCase() : "")
  );
  if (!account || !email) return generic;
  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const now = Math.floor(Date.now()/1000);
  const db = getD1();
  await db.prepare("DELETE FROM management_password_resets WHERE account_id = ? OR expires_at <= ?").bind(account.id, now).run();
  await db.prepare("INSERT INTO management_password_resets (token_hash, account_id, expires_at) VALUES (?, ?, ?)").bind(await hash(token),account.id,now+600).run();
  try {
    await sendManagementRecoveryEmail(email,username,token);
  } catch {
    // Do not disclose account existence, recovery address or provider state.
    await db.prepare("DELETE FROM management_password_resets WHERE token_hash = ?").bind(await hash(token)).run().catch(() => undefined);
  }
  return generic;
}

export async function finishManagementRecovery(data: Record<string, unknown>) {
  const token = data.token, password = data.newPassword, confirm = data.confirmPassword;
  if (typeof token !== "string" || !tokenFormat.test(token)) throw new RequestError("رابط الاسترداد غير صالح أو انتهت صلاحيته.", 401);
  if (typeof password !== "string" || typeof confirm !== "string" || password !== confirm) throw new RequestError("تأكيد كلمة المرور غير مطابق.", 400);
  if (password.length < 16 || password.length > 256 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new RequestError("كلمة المرور الجديدة من 16 محرفاً على الأقل، مع حرف كبير وصغير ورقم ورمز.", 400);
  }
  const db = getD1();
  const row = await db.prepare("DELETE FROM management_password_resets WHERE token_hash = ? AND expires_at > ? RETURNING account_id").bind(await hash(token),Math.floor(Date.now()/1000)).first<{account_id:string}>();
  if (!row) throw new RequestError("رابط الاسترداد منتهي الصلاحية أو مستخدم سابقاً.", 401);
  await resetManagementPasswordWithProof(row.account_id,password);
  return { ok:true, message:"تم تغيير كلمة المرور. سجّل الدخول باستخدام الكلمة الجديدة." };
}
