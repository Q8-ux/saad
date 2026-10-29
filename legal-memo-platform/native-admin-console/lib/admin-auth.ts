import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { getD1 } from "@/db";

export const permissions = [
  "dashboard.view", "users.view", "users.manage", "records.view", "ai.use", "archive.view",
  "appointments.view", "appointments.manage", "services.view", "services.manage",
  "payments.view", "payments.manage", "security.view",
  "staff.view", "staff.manage", "audit.view",
] as const;
export type AdminPermission = (typeof permissions)[number];
export type AdminRole = "owner" | "admin" | "lawyer" | "support" | "finance";

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  owner: [...permissions],
  admin: permissions.filter((permission) => permission !== "staff.manage"),
  lawyer: ["dashboard.view", "users.view", "records.view", "ai.use", "archive.view", "appointments.view", "appointments.manage"],
  support: ["dashboard.view", "users.view", "appointments.view", "appointments.manage"],
  finance: ["dashboard.view", "users.view", "services.view", "services.manage", "payments.view", "payments.manage"],
};

type AuthEnvironment = {
  ADMIN_AUTH_SECRET?: string;
  ADMIN_OWNER_EMAIL?: string;
  ADMIN_BOOTSTRAP_ADMIN_EMAILS?: string;
};
type StaffRow = { id: string; email: string; name: string; role: AdminRole; status: string; permissions_json: string; created_at: string; updated_at: string };
export type AdminStaff = { id: string; email: string; name: string; role: AdminRole; status: "active" | "suspended"; permissions: AdminPermission[]; createdAt: string; updatedAt: string };
export type AdminSession = { staff: AdminStaff };
export const ADMIN_SESSION_COOKIE = "__Host-sabeq_admin_session";

export function normalizeAdminEmail(value: string) { return value.trim().toLowerCase(); }
export function getConfiguredOwnerEmail() { return normalizeAdminEmail((env as unknown as AuthEnvironment).ADMIN_OWNER_EMAIL || ""); }
export function getBootstrapRole(email: string): AdminRole | null {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return null;
  if (normalized === getConfiguredOwnerEmail()) return "owner";
  const additionalAdmins = String((env as unknown as AuthEnvironment).ADMIN_BOOTSTRAP_ADMIN_EMAILS || "")
    .split(/[\s,;]+/)
    .map(normalizeAdminEmail)
    .filter(Boolean);
  return additionalAdmins.includes(normalized) ? "admin" : null;
}
function getAuthSecret() {
  const secret = (env as unknown as AuthEnvironment).ADMIN_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  return secret;
}
function isPermission(value: unknown): value is AdminPermission { return typeof value === "string" && (permissions as readonly string[]).includes(value); }
export function permissionsForRole(role: AdminRole) { return [...rolePermissions[role]]; }
export function parsePermissions(value: string, role: AdminRole) {
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(isPermission); } catch { /* use role defaults */ }
  return permissionsForRole(role);
}
function mapStaff(row: StaffRow): AdminStaff {
  const role = Object.hasOwn(rolePermissions, row.role) ? row.role : "support";
  return { id: row.id, email: row.email, name: row.name, role, status: row.status === "suspended" ? "suspended" : "active", permissions: role === "owner" ? [...permissions] : parsePermissions(row.permissions_json, role), createdAt: row.created_at, updatedAt: row.updated_at };
}
export function hasPermission(staff: AdminStaff, permission: AdminPermission) { return staff.role === "owner" || staff.permissions.includes(permission); }

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(getAuthSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function randomAdminCode() { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return String(100000 + (bytes[0] % 900000)); }
export function randomAdminToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function adminCodeHash(challengeId: string, email: string, code: string) { return hmac(`code:${challengeId}:${normalizeAdminEmail(email)}:${code}`); }
export function adminTokenHash(token: string) { return hmac(`session:${token}`); }
export function secureEqual(left: string, right: string) { if (left.length !== right.length) return false; let difference = 0; for (let i = 0; i < left.length; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i); return difference === 0; }

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  let tokenHash: string;
  try { tokenHash = await adminTokenHash(token); } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  const row = await getD1().prepare(
    `SELECT s.id, s.email, s.name, s.role, s.status, s.permissions_json, s.created_at, s.updated_at
     FROM admin_sessions a JOIN admin_staff s ON s.email = a.staff_email
     WHERE a.token_hash = ? AND a.expires_at > ? AND s.status = 'active'
       AND a.last_seen_at > datetime('now', '-60 minutes') LIMIT 1`,
  ).bind(tokenHash, now).first<StaffRow>();
  if (!row) return null;
  await getD1().prepare("UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?").bind(tokenHash).run();
  return { staff: mapStaff(row) };
}

export async function requireAdminPermission(permission: AdminPermission) {
  const session = await getAdminSession();
  if (!session) return { response: adminResponse({ error: "انتهت الجلسة أو لم يتم تسجيل الدخول." }, 401) } as const;
  if (!hasPermission(session.staff, permission)) return { response: adminResponse({ error: "لا تملك صلاحية تنفيذ هذا الإجراء." }, 403) } as const;
  return { session } as const;
}

export function adminResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

export async function writeAudit(staffEmail: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  await getD1().prepare(`INSERT INTO admin_audit (staff_email, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?)`)
    .bind(normalizeAdminEmail(staffEmail), action.slice(0, 80), targetType.slice(0, 60), targetId.slice(0, 160), JSON.stringify(details).slice(0, 12_000)).run();
}
