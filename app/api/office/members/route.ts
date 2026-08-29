import { getD1 } from "../../../../db";
import { textValue, validEmail } from "../../../../lib/office-validation";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../../lib/request-security";
import {
  requireCapability,
  requireTenantContext,
  TenantAccessError,
  writeAuditLog,
} from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

const ROLES = new Set(["admin", "lawyer", "secretary", "finance", "viewer"]);
const MEMBER_STATUSES = new Set(["active", "inactive"]);
const MEMBER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MemberRow = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
};

function memberId(value: unknown) {
  const id = textValue(value, 80);
  if (!MEMBER_ID_PATTERN.test(id)) throw new RequestValidationError("معرّف العضو غير صحيح.");
  return id;
}

function role(value: unknown, includeOwner = false) {
  const selected = textValue(value, 30);
  const allowed = includeOwner ? new Set([...ROLES, "owner"]) : ROLES;
  if (!allowed.has(selected)) throw new RequestValidationError("دور العضو غير صحيح.");
  return selected;
}

function status(value: unknown) {
  const selected = textValue(value, 30);
  if (!MEMBER_STATUSES.has(selected)) throw new RequestValidationError("حالة العضو غير صحيحة.");
  return selected;
}

function failure(error: unknown, fallback: string) {
  if (error instanceof TenantAccessError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof RequestValidationError) {
    return privateJson({ error: error.message }, { status: 400 });
  }
  console.error("Office member management failed", error instanceof Error ? error.message : error);
  return privateJson({ error: fallback }, { status: 500 });
}

async function activeMemberCount(officeId: string) {
  const row = await getD1()
    .prepare("SELECT COUNT(*) AS count FROM office_members WHERE office_id=? AND status='active'")
    .bind(officeId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function activeOwnerCount(officeId: string) {
  const row = await getD1()
    .prepare("SELECT COUNT(*) AS count FROM office_members WHERE office_id=? AND role='owner' AND status='active'")
    .bind(officeId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function listMembers(officeId: string) {
  const rows = await getD1()
    .prepare(
      "SELECT m.id AS id,m.user_id AS userId,u.email AS email,u.display_name AS displayName,m.role AS role,m.status AS status,m.created_at AS createdAt FROM office_members m JOIN app_users u ON u.id=m.user_id WHERE m.office_id=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, m.created_at ASC",
    )
    .bind(officeId)
    .all<MemberRow>();
  return rows.results ?? [];
}

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    const count = await activeMemberCount(context.officeId);
    return privateJson({
      members: await listMembers(context.officeId),
      seatLimit: context.seatLimit,
      activeMemberCount: count,
      canManageMembers: context.role === "owner" || context.role === "admin",
    });
  } catch (error) {
    return failure(error, "تعذّر تحميل أعضاء المكتب حالياً.");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    requireCapability(context, "manageMembers");
    const body = await readJsonObject(request);
    const email = validEmail(body.email).toLowerCase();
    if (!email) throw new RequestValidationError("البريد الإلكتروني للعضو مطلوب.");
    const displayName = textValue(body.displayName, 180);
    const memberRole = role(body.role);
    const db = getD1();
    const existingUser = await db
      .prepare("SELECT id FROM app_users WHERE email=? LIMIT 1")
      .bind(email)
      .first<{ id: string }>();
    const userId = existingUser?.id ?? crypto.randomUUID();
    const existingMembership = await db
      .prepare("SELECT id,status FROM office_members WHERE office_id=? AND user_id=? LIMIT 1")
      .bind(context.officeId, userId)
      .first<{ id: string; status: string }>();

    if (!existingMembership && (await activeMemberCount(context.officeId)) >= context.seatLimit) {
      return privateJson(
        { error: `تم الوصول إلى الحد الأقصى لأعضاء مساحة العمل (${context.seatLimit}).` },
        { status: 409 },
      );
    }

    await db.batch([
      db
        .prepare(
          "INSERT INTO app_users (id,email,display_name,status,updated_at) VALUES (?,?,?,'active',CURRENT_TIMESTAMP) ON CONFLICT(email) DO UPDATE SET display_name=CASE WHEN excluded.display_name<>'' THEN excluded.display_name ELSE app_users.display_name END,updated_at=CURRENT_TIMESTAMP",
        )
        .bind(userId, email, displayName),
      existingMembership
        ? db
            .prepare("UPDATE office_members SET role=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?")
            .bind(memberRole, existingMembership.id, context.officeId)
        : db
            .prepare("INSERT INTO office_members (id,office_id,user_id,role,status) VALUES (?,?,?,?,'active')")
            .bind(crypto.randomUUID(), context.officeId, userId, memberRole),
    ]);
    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: existingMembership ? "reactivate_member" : "add_member",
      entityType: "office_member",
      entityId: userId,
      metadata: { role: memberRole },
    });

    return privateJson({
      ok: true,
      message: "تمت إضافة العضو. عليه تسجيل الدخول بالعنوان نفسه للوصول إلى المكتب.",
    }, { status: existingMembership ? 200 : 201 });
  } catch (error) {
    return failure(error, "تعذّرت إضافة عضو المكتب.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    requireCapability(context, "manageMembers");
    const body = await readJsonObject(request);
    const id = memberId(body.id);
    const selectedRole = role(body.role, true);
    const selectedStatus = status(body.status);
    const db = getD1();
    const existing = await db
      .prepare("SELECT id,user_id AS userId,role,status FROM office_members WHERE id=? AND office_id=? LIMIT 1")
      .bind(id, context.officeId)
      .first<{ id: string; userId: string; role: string; status: string }>();
    if (!existing) return privateJson({ error: "لم يُعثر على العضو المطلوب." }, { status: 404 });

    const wouldDeactivateOwner = existing.role === "owner" && existing.status === "active" && (selectedRole !== "owner" || selectedStatus !== "active");
    if (wouldDeactivateOwner && (await activeOwnerCount(context.officeId)) <= 1) {
      return privateJson({ error: "لا يمكن إزالة أو تعطيل آخر مالك نشط للمكتب." }, { status: 409 });
    }
    if (selectedRole === "owner" && context.role !== "owner") {
      return privateJson({ error: "نقل ملكية المكتب متاح لمالك المكتب فقط." }, { status: 403 });
    }
    await db
      .prepare("UPDATE office_members SET role=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?")
      .bind(selectedRole, selectedStatus, id, context.officeId)
      .run();
    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: "update_member",
      entityType: "office_member",
      entityId: id,
      metadata: { role: selectedRole, active: selectedStatus === "active" },
    });
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error, "تعذّر تعديل عضو المكتب.");
  }
}
