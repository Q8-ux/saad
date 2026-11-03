import { getD1 } from "@/db";
import { cleanEmail, cleanString, RequestError } from "@/lib/request-security";
import { hashPublicPassword, internalContactEmail, normalizeUsername } from "@/lib/public-password";

export const USER_SERVICE_KEYS = ["memo", "assistant", "consultation", "library"] as const;
export function userPermissions(raw?: unknown): Record<string, boolean> {
  let value = raw;
  if (typeof raw === "string") { try { value = JSON.parse(raw); } catch { return Object.fromEntries(USER_SERVICE_KEYS.map(key => [key, false])); } }
  const object = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const malformed = value == null ? raw != null : typeof value !== "object" || Array.isArray(value);
  if (malformed || Object.entries(object).some(([key, allowed]) => !USER_SERVICE_KEYS.includes(key as typeof USER_SERVICE_KEYS[number]) || typeof allowed !== "boolean")) return Object.fromEntries(USER_SERVICE_KEYS.map(key => [key, false]));
  return Object.fromEntries(USER_SERVICE_KEYS.map(key => [key, object[key] !== false]));
}
function validatePermissions(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new RequestError("حدد صلاحيات الخدمات.");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some(key => !USER_SERVICE_KEYS.includes(key as typeof USER_SERVICE_KEYS[number])) || USER_SERVICE_KEYS.some(key => typeof value[key] !== "boolean")) throw new RequestError("صلاحيات الخدمات غير صحيحة.");
  return userPermissions(value);
}
function usageLimit(raw: unknown, maximum: number, fallback: number) {
  if (raw === undefined) return fallback;
  if (!(typeof raw === "number" || typeof raw === "string" && /^-?\d+$/.test(raw))) throw new RequestError("حدود الاستخدام غير صحيحة.");
  const value = Number(raw);
  if (!Number.isInteger(value) || value < -1 || value > maximum) throw new RequestError("حدود الاستخدام غير صحيحة.");
  return value;
}
export async function listManagedUsers(url: URL, limit = 100) {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120), status = url.searchParams.get("status") || "";
  if (status && !["active", "suspended", "deleted"].includes(status)) throw new RequestError("حالة المستخدم غير صحيحة.");
  const offset = Number(url.searchParams.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) throw new RequestError("رقم الصفحة غير صحيح.");
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const result = await getD1().prepare(`SELECT u.id, u.name, u.phone, u.email, u.status, u.memo_limit, u.assistant_limit, u.email_verified_at, u.created_at, c.username, CASE WHEN c.user_id IS NULL THEN 0 ELSE 1 END AS password_configured,
    COALESCE(p.role, 'user') AS role, COALESCE(p.permissions_json, '{}') AS permissions_json,
    (SELECT COUNT(*) FROM service_records r WHERE r.user_id = u.id AND r.service_type = 'memo' AND r.created_at >= datetime('now','start of month')) AS memo_used,
    (SELECT COUNT(*) FROM service_records r WHERE r.user_id = u.id AND r.service_type = 'assistant' AND r.created_at >= datetime('now','start of month')) AS assistant_used
    FROM public_users u LEFT JOIN user_access_policies p ON p.user_id = u.id
    LEFT JOIN public_user_credentials c ON c.user_id = u.id
    WHERE (? = '' OR u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.phone LIKE ? ESCAPE '\\' OR c.username LIKE ? ESCAPE '\\')
      AND ((? = '' AND u.status <> 'deleted') OR (? <> '' AND u.status = ?))
    ORDER BY u.created_at DESC, u.id LIMIT ? OFFSET ?`).bind(q, pattern, pattern, pattern, pattern, status, status, status, limit + 1, offset).all();
  return { users: result.results.slice(0, limit).map(row => { const { permissions_json, ...safe } = row; return { ...safe, permissions: userPermissions(permissions_json) }; }), hasMore: result.results.length > limit, offset, source: "hosted" };
}
export async function updateManagedUser(data: Record<string, unknown>, actor = "administrator", managerRole: "administrator" | "operator" = "administrator") {
  // Staff may manage ordinary visitors only. Never allow a staff account
  // to create, change, suspend, or delete an administrative identity.
  if (managerRole === "operator" && (data.role !== undefined && data.role !== "user" || data.confirmAdmin === true)) {
    throw new RequestError("صلاحية إدارة الحسابات الإدارية للمشرف فقط.", 403);
  }
  const db = getD1(), action = data.action || "update";
  if (!["create", "update", "delete", "restore"].includes(String(action))) throw new RequestError("عملية المستخدم غير صحيحة.");
  const id = action === "create" ? crypto.randomUUID() : cleanString(data.id, "المستخدم", { min: 20, max: 80 });
  const existing = action === "create" ? null : await db.prepare("SELECT u.*, COALESCE(p.role, 'user') AS role, COALESCE(p.permissions_json, '{}') AS permissions_json FROM public_users u LEFT JOIN user_access_policies p ON p.user_id = u.id WHERE u.id = ?").bind(id).first<{ name: string; phone: string; email: string; status: string; role: string; permissions_json: string; memo_limit: number; assistant_limit: number }>();
  if (action !== "create" && !existing) throw new RequestError("المستخدم غير موجود.", 404);
  if (managerRole === "operator" && existing?.role !== undefined && existing.role !== "user") {
    throw new RequestError("لا يمكن لموظف التشغيل تعديل حساب إداري.", 403);
  }
  if (action === "delete" && data.confirm !== true) throw new RequestError("أكد حذف المستخدم. يمكن استعادته لاحقاً.");
  const status = action === "delete" ? "deleted" : action === "restore" ? "active" : data.status ?? existing?.status ?? "active";
  if (!["active", "suspended", "deleted"].includes(String(status)) || (action === "create" && status === "deleted")) throw new RequestError("حالة المستخدم غير صحيحة.");
  const existingCredential = action === "create" ? null : await db.prepare("SELECT username FROM public_user_credentials WHERE user_id = ?").bind(id).first<{ username: string }>();
  const username = data.username !== undefined ? normalizeUsername(data.username) : existingCredential?.username;
  if (action === "create" && !username) throw new RequestError("أدخل اسم مستخدم للحساب الجديد.");
  const newPassword = data.newPassword;
  const hasNewPassword = typeof newPassword === "string" && newPassword.length > 0;
  if (action === "create" && !hasNewPassword) throw new RequestError("أدخل كلمة مرور للحساب الجديد.");
  if (newPassword !== undefined && typeof newPassword !== "string") throw new RequestError("كلمة المرور غير صحيحة.");
  if (username && !existingCredential && !hasNewPassword) throw new RequestError("عين كلمة مرور لتمكين الحساب من الدخول.");
  const passwordHash = hasNewPassword ? await hashPublicPassword(newPassword) : null;
  const name = data.name === undefined && existing ? existing.name : cleanString(data.name || username, "الاسم", { min: 2, max: 120 });
  const phone = data.phone === undefined ? existing?.phone || "" : cleanString(data.phone, "الهاتف", { max: 40, required: false });
  // Legacy email column stays unique and NOT NULL; no address is required for new accounts.
  const suppliedEmail = data.email === undefined && existing ? existing.email : cleanEmail(data.email, false).toLowerCase();
  const email = suppliedEmail || internalContactEmail(id);
  const memoLimit = usageLimit(data.memoLimit, 500, existing?.memo_limit ?? 3), assistantLimit = usageLimit(data.assistantLimit, 5000, existing?.assistant_limit ?? 20);
  const permissions = data.permissions === undefined ? userPermissions(existing?.permissions_json) : validatePermissions(data.permissions);
  const role = data.role ?? existing?.role ?? "user";
  if (!["user", "administrator"].includes(String(role))) throw new RequestError("دور المستخدم غير صحيح.");
  if (role === "administrator" && (existing?.role !== "administrator" || email !== existing?.email) && data.confirmAdmin !== true) throw new RequestError("أكد منح هذا المستخدم صلاحية إدارة الموقع بالكامل.");
  if (existing?.email === actor && (existing.role === "administrator" && role !== "administrator" || status !== "active" || email !== existing.email)) throw new RequestError("لا يمكنك إلغاء صلاحية حسابك الإداري أو حذفه أثناء استخدامه.", 409);
  const duplicate = await db.prepare("SELECT id FROM public_users WHERE email = ? AND id <> ?").bind(email, id).first();
  if (duplicate) throw new RequestError("البريد مستخدم بالفعل. ابحث عن الحساب أو استعده من المحذوفين.", 409);
  const changedEmail = !!existing && email !== existing.email;
  const statements = action === "create"
    ? [db.prepare("INSERT INTO public_users (id, name, phone, email, status, memo_limit, assistant_limit, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, '')").bind(id, name, phone, email, status, memoLimit, assistantLimit)]
    : [db.prepare("UPDATE public_users SET name = ?, phone = ?, email = ?, status = ?, memo_limit = ?, assistant_limit = ?, email_verified_at = CASE WHEN email <> ? THEN '' ELSE email_verified_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, phone, email, status, memoLimit, assistantLimit, email, id)];
  statements.push(db.prepare("INSERT INTO user_access_policies (user_id, role, permissions_json, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET role = excluded.role, permissions_json = excluded.permissions_json, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP").bind(id, role, JSON.stringify(permissions), actor));
  if (username && (passwordHash || username !== existingCredential?.username)) {
    const old = existingCredential;
    // Preserve a hash when the administrator changes only the username.
    if (passwordHash) {
      statements.push(db.prepare("INSERT INTO public_user_credentials (user_id, username, salt, password_hash, iterations) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, salt = excluded.salt, password_hash = excluded.password_hash, iterations = excluded.iterations, updated_at = CURRENT_TIMESTAMP")
        .bind(id, username, passwordHash.salt, passwordHash.password_hash, passwordHash.iterations));
    } else if (old) {
      statements.push(db.prepare("UPDATE public_user_credentials SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").bind(username, id));
    }
  }
  const credentialsChanged = !!existing && (hasNewPassword || username !== existingCredential?.username);
  const permissionsChanged = !!existing && JSON.stringify(permissions) !== JSON.stringify(userPermissions(existing.permissions_json));
  if (existing && (status !== "active" || changedEmail || credentialsChanged || permissionsChanged || role !== existing.role)) {
    statements.push(db.prepare("DELETE FROM public_user_sessions WHERE user_id = ?").bind(id));
    statements.push(db.prepare("DELETE FROM management_sessions WHERE email = ?").bind(existing.email));
  }
  if (existing && (status !== "active" || changedEmail)) statements.push(db.prepare("DELETE FROM email_verification_challenges WHERE email = ?").bind(existing.email));
  await db.batch(statements);
  return { ok: true, id, action, username: username || null, passwordConfigured: !!username, reversible: action === "delete" };
}
