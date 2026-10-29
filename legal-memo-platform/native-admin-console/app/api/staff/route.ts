import { getD1 } from "@/db";
import {
  adminResponse,
  permissions,
  permissionsForRole,
  requireAdminPermission,
  type AdminPermission,
  type AdminRole,
  writeAudit,
} from "@/lib/admin-auth";

const roles = new Set<AdminRole>(["owner", "admin", "lawyer", "support", "finance"]);
const statuses = new Set(["active", "suspended"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanPermissions(value: unknown, role: AdminRole) {
  if (role === "owner") return [...permissions];
  if (!Array.isArray(value)) return permissionsForRole(role);
  return [...new Set(value.filter((entry): entry is AdminPermission =>
    typeof entry === "string" && (permissions as readonly string[]).includes(entry),
  ))];
}

export async function GET() {
  const authorization = await requireAdminPermission("staff.view");
  if ("response" in authorization) return authorization.response;
  const rows = await getD1().prepare(
    `SELECT id, email, name, role, status, permissions_json, created_by, created_at, updated_at
     FROM admin_staff ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at`,
  ).all();
  return adminResponse({ staff: rows.results });
}

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("staff.manage");
  if ("response" in authorization) return authorization.response;
  try {
    const raw = await request.text();
    if (raw.length > 16_000) return adminResponse({ error: "الطلب أكبر من الحد المسموح." }, 413);
    const data = JSON.parse(raw) as Record<string, unknown>;
    const id = cleanText(data.id, 80);
    const name = cleanText(data.name, 120);
    const email = cleanText(data.email, 254).toLowerCase();
    const role = cleanText(data.role, 20) as AdminRole;
    const status = cleanText(data.status, 20);
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !roles.has(role) || !statuses.has(status)) {
      return adminResponse({ error: "بيانات الموظف غير مكتملة أو غير صحيحة." }, 400);
    }
    const selectedPermissions = cleanPermissions(data.permissions, role);

    if (id) {
      const existing = await getD1().prepare("SELECT email, role, status FROM admin_staff WHERE id = ?").bind(id).first<{
        email: string; role: string; status: string;
      }>();
      if (!existing) return adminResponse({ error: "الموظف غير موجود." }, 404);
      if (existing.email === authorization.session.staff.email && status !== "active") {
        return adminResponse({ error: "لا يمكنك إيقاف حسابك أثناء استخدامه." }, 400);
      }
      if (existing.role === "owner" && (role !== "owner" || status !== "active")) {
        const otherOwner = await getD1().prepare(
          "SELECT id FROM admin_staff WHERE role = 'owner' AND status = 'active' AND id != ? LIMIT 1",
        ).bind(id).first();
        if (!otherOwner) return adminResponse({ error: "يجب إبقاء مالك نشط واحد على الأقل." }, 400);
      }
      await getD1().prepare(
        `UPDATE admin_staff SET email = ?, name = ?, role = ?, status = ?, permissions_json = ?,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(email, name, role, status, JSON.stringify(selectedPermissions), id).run();
      await writeAudit(authorization.session.staff.email, "staff.updated", "staff", id, { role, status });
      return adminResponse({ ok: true });
    }

    const newId = crypto.randomUUID();
    await getD1().prepare(
      `INSERT INTO admin_staff (id, email, name, role, status, permissions_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      newId,
      email,
      name,
      role,
      status,
      JSON.stringify(selectedPermissions),
      authorization.session.staff.email,
    ).run();
    await writeAudit(authorization.session.staff.email, "staff.created", "staff", newId, { role, status });
    return adminResponse({ ok: true, id: newId }, 201);
  } catch (error) {
    const message = error instanceof SyntaxError
      ? "صيغة الطلب غير صحيحة."
      : error instanceof Error && /UNIQUE/i.test(error.message)
        ? "البريد الإلكتروني مستخدم لموظف آخر."
        : "تعذر حفظ بيانات الموظف.";
    return adminResponse({ error: message }, 400);
  }
}

