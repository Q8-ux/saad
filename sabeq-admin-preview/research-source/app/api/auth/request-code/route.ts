import { getD1 } from "@/db";
import { adminCodeHash, adminResponse, getBootstrapRole, normalizeAdminEmail, randomAdminCode } from "@/lib/admin-auth";
import { callPublicService } from "@/lib/public-service";
import { AdminSecurityError, assertAdminOrigin, enforceAdminRateLimit, readAdminJson, recordAdminSecurityEvent } from "@/lib/admin-security";

function cleanName(value: unknown) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : ""; }

export async function POST(request: Request) {
  let challengeId = "";
  try {
    assertAdminOrigin(request);
    const data = await readAdminJson(request, 4_000);
    const email = normalizeAdminEmail(typeof data.email === "string" ? data.email : "");
    const name = cleanName(data.name);
    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2) return adminResponse({ error: "أدخل الاسم والبريد الإلكتروني الصحيحين." }, 400);
    await enforceAdminRateLimit(request, "admin-login-request", 5);
    await enforceAdminRateLimit(request, "admin-login-request-email", 3, email);

    const staff = await getD1().prepare("SELECT name, status FROM admin_staff WHERE email = ? LIMIT 1").bind(email).first<{ name: string; status: string }>();
    const bootstrapRole = staff ? null : getBootstrapRole(email);
    if (!bootstrapRole && (!staff || staff.status !== "active")) {
      await recordAdminSecurityEvent(request, "admin_login_unknown_email", { severity: "warning", identity: email, detailCode: "not_authorized" });
      return adminResponse({ error: "هذا البريد غير مضاف إلى موظفي النظام النشطين." }, 403);
    }

    const recent = await getD1().prepare("SELECT id FROM admin_login_challenges WHERE email = ? AND created_at > datetime('now', '-60 seconds') LIMIT 1").bind(email).first();
    if (recent) return adminResponse({ error: "انتظر دقيقة قبل طلب رمز جديد." }, 429);

    challengeId = crypto.randomUUID();
    const code = randomAdminCode();
    const codeHash = await adminCodeHash(challengeId, email, code);
    await getD1().batch([
      getD1().prepare("UPDATE admin_login_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE email = ? AND consumed_at IS NULL").bind(email),
      getD1().prepare("INSERT INTO admin_login_challenges (id, email, name, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)").bind(challengeId, email, staff?.name || name, codeHash, Math.floor(Date.now() / 1000) + 600),
    ]);
    const delivery = await callPublicService("/api/admin/send-code", { method: "POST", body: JSON.stringify({ email, name: staff?.name || name, code }) });
    if (!delivery.ok) throw new Error("DELIVERY_FAILED");
    await recordAdminSecurityEvent(request, "admin_code_requested", { severity: "info", identity: email, staffEmail: email });
    return adminResponse({ ok: true, challengeId, expiresIn: 600 });
  } catch (error) {
    if (challengeId) await getD1().prepare("DELETE FROM admin_login_challenges WHERE id = ?").bind(challengeId).run().catch(() => undefined);
    const message = error instanceof AdminSecurityError ? error.message : error instanceof SyntaxError ? "صيغة الطلب غير صحيحة." : error instanceof Error && error.message === "ADMIN_AUTH_NOT_CONFIGURED" ? "نظام دخول الإدارة غير مهيأ بعد." : "تعذر إرسال رمز الدخول حالياً.";
    return adminResponse({ error: message }, error instanceof AdminSecurityError ? error.status : error instanceof SyntaxError ? 400 : 503);
  }
}
