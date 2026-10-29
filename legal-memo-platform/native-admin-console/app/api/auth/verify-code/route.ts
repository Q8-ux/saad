import { cookies } from "next/headers";
import { getD1 } from "@/db";
import { ADMIN_SESSION_COOKIE, adminCodeHash, adminResponse, adminTokenHash, getBootstrapRole, normalizeAdminEmail, permissionsForRole, randomAdminToken, secureEqual } from "@/lib/admin-auth";
import { AdminSecurityError, assertAdminOrigin, enforceAdminRateLimit, readAdminJson, recordAdminSecurityEvent } from "@/lib/admin-security";

export async function POST(request: Request) {
  try {
    assertAdminOrigin(request);
    const data = await readAdminJson(request, 4_000);
    await enforceAdminRateLimit(request, "admin-login-verify", 12);
    const challengeId = typeof data.challengeId === "string" ? data.challengeId.trim() : "";
    const code = typeof data.code === "string" ? data.code.trim() : "";
    if (!/^[0-9a-f-]{30,50}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return adminResponse({ error: "رمز التحقق غير صحيح." }, 400);
    const challenge = await getD1().prepare(
      "SELECT id, email, name, code_hash, attempts, expires_at, consumed_at FROM admin_login_challenges WHERE id = ? LIMIT 1",
    ).bind(challengeId).first<{ id: string; email: string; name: string; code_hash: string; attempts: number; expires_at: number; consumed_at: string | null }>();
    if (!challenge || challenge.consumed_at || challenge.expires_at <= Math.floor(Date.now() / 1000) || challenge.attempts >= 5) return adminResponse({ error: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا." }, 400);
    const expected = await adminCodeHash(challenge.id, challenge.email, code);
    if (!secureEqual(expected, challenge.code_hash)) {
      await getD1().prepare("UPDATE admin_login_challenges SET attempts = attempts + 1 WHERE id = ?").bind(challenge.id).run();
      await recordAdminSecurityEvent(request, "admin_code_failed", { severity: "warning", identity: challenge.email, staffEmail: challenge.email, detailCode: "invalid_code" });
      return adminResponse({ error: "رمز التحقق غير صحيح." }, 400);
    }

    const email = normalizeAdminEmail(challenge.email);
    let staff = await getD1().prepare("SELECT id, status FROM admin_staff WHERE email = ? LIMIT 1").bind(email).first<{ id: string; status: string }>();
    if (!staff) {
      const bootstrapRole = getBootstrapRole(email);
      if (!bootstrapRole) return adminResponse({ error: "الحساب غير مصرح له." }, 403);
      const id = crypto.randomUUID();
      await getD1().prepare("INSERT INTO admin_staff (id, email, name, role, status, permissions_json, created_by) VALUES (?, ?, ?, ?, 'active', ?, 'bootstrap')")
        .bind(id, email, challenge.name, bootstrapRole, JSON.stringify(permissionsForRole(bootstrapRole))).run();
      staff = { id, status: "active" };
    }
    if (staff.status !== "active") return adminResponse({ error: "الحساب الإداري موقوف." }, 403);

    const token = randomAdminToken();
    const tokenHash = await adminTokenHash(token);
    const expiresAt = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
    await getD1().batch([
      getD1().prepare("UPDATE admin_login_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(challenge.id),
      getD1().prepare("DELETE FROM admin_sessions WHERE staff_email = ? OR expires_at <= ?").bind(email, Math.floor(Date.now() / 1000)),
      getD1().prepare("INSERT INTO admin_sessions (token_hash, staff_email, expires_at) VALUES (?, ?, ?)").bind(tokenHash, email, expiresAt),
    ]);
    (await cookies()).set(ADMIN_SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 12 * 60 * 60 });
    await recordAdminSecurityEvent(request, "admin_login_succeeded", { severity: "info", identity: email, staffEmail: email });
    return adminResponse({ ok: true });
  } catch (error) {
    const message = error instanceof AdminSecurityError ? error.message : error instanceof SyntaxError ? "صيغة الطلب غير صحيحة." : error instanceof Error && error.message === "ADMIN_AUTH_NOT_CONFIGURED" ? "نظام دخول الإدارة غير مهيأ بعد." : "تعذر التحقق من رمز الدخول.";
    return adminResponse({ error: message }, error instanceof AdminSecurityError ? error.status : error instanceof SyntaxError ? 400 : 503);
  }
}
