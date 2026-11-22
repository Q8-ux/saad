import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { sendManagementRecoveryCodeEmail } from "@/lib/email";
import { managementRecoveryAccount, managementRecoveryCodeProof, resetManagementPasswordWithProof, normalizeManagementUsername } from "@/lib/management-password";
import { RequestError } from "@/lib/request-security";

const generic = { ok: true, message: "إذا كان للحساب بريد استرداد معتمد فسيصلك رمز التحقق إلى ذلك البريد." };
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
  const email = account && (
    mappedRecoveryEmail(account.id, runtime.MANAGEMENT_RECOVERY_EMAILS) ||
    (account.role === "administrator" && typeof runtime.MANAGEMENT_OWNER_EMAIL === "string" &&
      /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(runtime.MANAGEMENT_OWNER_EMAIL.trim())
      ? runtime.MANAGEMENT_OWNER_EMAIL.trim().toLowerCase() : "")
  );
  if (!account || !email) return generic;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const proof = await managementRecoveryCodeProof(username, code);
  if (!proof) return generic;
  const now = Math.floor(Date.now()/1000), db = getD1();
  await db.prepare("DELETE FROM management_password_resets WHERE account_id = ? OR expires_at <= ?").bind(account.id, now).run();
  await db.prepare("INSERT INTO management_password_resets (token_hash, account_id, expires_at) VALUES (?, ?, ?)").bind(proof.tokenHash,account.id,now+600).run();
  try { await sendManagementRecoveryCodeEmail(email,username,code); }
  catch { await db.prepare("DELETE FROM management_password_resets WHERE token_hash = ?").bind(proof.tokenHash).run().catch(() => undefined); }
  return generic;
}
export async function finishManagementRecovery(data: Record<string, unknown>) {
  const token = data.token, password = data.newPassword, confirm = data.confirmPassword;
  const username = normalizeManagementUsername(data.username), code = data.code;
  const codeFlow = typeof code === "string" && /^[0-9]{6}$/.test(code) && user.test(username);
  if (!(typeof token === "string" && tokenFormat.test(token)) && !codeFlow) throw new RequestError("رمز الاسترداد غير صالح أو انتهت صلاحيته.", 401);
  if (typeof password !== "string" || typeof confirm !== "string" || password !== confirm) throw new RequestError("تأكيد كلمة المرور غير مطابق.", 400);
  if (password.length < 1 || password.length > 256) {
    throw new RequestError("أدخل كلمة المرور الجديدة.", 400);
  }
  const db = getD1();
  const proof = codeFlow ? await managementRecoveryCodeProof(username, code as string) : null;
  const tokenHash = codeFlow ? proof?.tokenHash : await hash(token as string);
  if (!tokenHash) throw new RequestError("رمز الاسترداد غير صالح أو انتهت صلاحيته.", 401);
  const row = await db.prepare("DELETE FROM management_password_resets WHERE token_hash = ? AND expires_at > ? RETURNING account_id").bind(tokenHash,Math.floor(Date.now()/1000)).first<{account_id:string}>();
  if (!row || (codeFlow && row.account_id !== proof?.accountId)) throw new RequestError("رمز الاسترداد منتهي الصلاحية أو مستخدم سابقاً.", 401);
  await resetManagementPasswordWithProof(row.account_id,password);
  return { ok:true, message:"تم تغيير كلمة المرور. سجّل الدخول باستخدام الكلمة الجديدة." };
}
