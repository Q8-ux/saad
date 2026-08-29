import { getD1 } from "../db";
import { getApplicationIdentity } from "./local-auth";

export type OfficeRole = "owner" | "admin" | "lawyer" | "secretary" | "finance" | "viewer";
export type OfficeCapability =
  | "manageSettings"
  | "manageMembers"
  | "manageClients"
  | "manageCases"
  | "manageHearings"
  | "manageInvoices"
  | "manageMemos";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  status: string;
};

type MembershipRow = {
  officeId: string;
  officeName: string;
  officeStatus: string;
  role: OfficeRole;
  memberStatus: string;
  plan: string | null;
  subscriptionStatus: string | null;
  billingMode: string | null;
  seatLimit: number | null;
  endsAt: string | null;
  graceUntil: string | null;
};

type TenantRuntime = typeof globalThis & {
  __LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__?: string;
};

const ACTIVE_OFFICE_STATUSES = new Set(["active", "trial"]);
const MANAGEMENT_ROLES = new Set<OfficeRole>(["owner", "admin"]);
const DIRECT_WORKSPACE_PLAN = "open_access";
const DIRECT_WORKSPACE_SEAT_LIMIT = 500;

export class TenantAccessError extends Error {
  public readonly status: 401 | 403;

  constructor(
    message: string,
    status: 401 | 403 = 403,
  ) {
    super(message);
    this.status = status;
  }
}

export type SaaSUser = {
  id: string;
  email: string;
  displayName: string;
  isPlatformAdmin: boolean;
  initialOfficeName?: string;
};

export type TenantContext = SaaSUser & {
  officeId: string;
  officeName: string;
  role: OfficeRole;
  officeStatus: string;
  plan: string;
  subscriptionStatus: string;
  billingMode: string;
  seatLimit: number;
  endsAt: string;
  graceUntil: string;
};

export type TenantMembership = Omit<MembershipRow, "memberStatus">;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string): boolean {
  const configured = (globalThis as TenantRuntime).__LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__ ?? "";
  const allowed = configured
    .split(/[;,\s]+/)
    .map(normalizeEmail)
    .filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

export async function requireSaaSUser(): Promise<SaaSUser> {
  const identity = await getApplicationIdentity();
  if (!identity) {
    throw new TenantAccessError("سجّل الدخول أولاً للوصول إلى بيانات المكتب.", 401);
  }

  const email = normalizeEmail(identity.email);
  if (!email) {
    throw new TenantAccessError("تعذّر التحقق من هوية المستخدم.", 401);
  }

  const db = getD1();
  const newId = crypto.randomUUID();
  const results = await db.batch([
    db
      .prepare(
        "INSERT INTO app_users (id,email,display_name,status,updated_at) VALUES (?,?,?,'active',CURRENT_TIMESTAMP) ON CONFLICT(email) DO UPDATE SET display_name=CASE WHEN excluded.display_name<>'' THEN excluded.display_name ELSE app_users.display_name END,updated_at=CURRENT_TIMESTAMP",
      )
      .bind(newId, email, identity.displayName.slice(0, 180)),
    db
      .prepare(
        "SELECT id,email,display_name AS displayName,status FROM app_users WHERE email=? LIMIT 1",
      )
      .bind(email),
  ]);
  const row = ((results[1] as unknown as { results?: UserRow[] }).results ?? [])[0];
  if (!row) {
    throw new TenantAccessError("تعذّر تهيئة حساب المستخدم.", 403);
  }
  if (row.status !== "active") {
    throw new TenantAccessError("تم إيقاف هذا الحساب. راجع مدير المكتب.", 403);
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName || identity.displayName || row.email,
    isPlatformAdmin: Boolean(identity.isPlatformAdmin) || isPlatformAdminEmail(row.email),
    initialOfficeName:
      identity.authType === "local" ? identity.initialOfficeName : undefined,
  };
}

async function membershipRows(userId: string): Promise<MembershipRow[]> {
  const result = await getD1()
    .prepare(
      "SELECT m.office_id AS officeId,o.name AS officeName,o.status AS officeStatus,m.role,m.status AS memberStatus,s.plan,s.status AS subscriptionStatus,s.billing_mode AS billingMode,s.seat_limit AS seatLimit,s.ends_at AS endsAt,s.grace_until AS graceUntil FROM office_members m JOIN offices o ON o.id=m.office_id LEFT JOIN office_subscriptions s ON s.office_id=o.id WHERE m.user_id=? AND m.status='active' ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, o.created_at ASC",
    )
    .bind(userId)
    .all<MembershipRow>();
  return result.results ?? [];
}

function isActiveMembership(row: MembershipRow): boolean {
  // الاشتراكات مؤجلة حالياً؛ الوصول يعتمد على حالة مساحة العمل فقط.
  return ACTIVE_OFFICE_STATUSES.has(row.officeStatus);
}

/**
 * Every authenticated account needs a tenant context because all office APIs
 * are scoped to an office. Until subscription management is enabled again,
 * create one private workspace automatically on the first visit instead of
 * showing an assignment or subscription screen.
 *
 * The id is derived from the user id so bootstrap stays idempotent if two
 * initial requests arrive together. Each user receives a distinct workspace;
 * data is never shared between accounts.
 */
async function ensureDirectWorkspace(
  user: SaaSUser,
  memberships: MembershipRow[],
): Promise<MembershipRow[]> {
  if (memberships.some(isActiveMembership)) {
    return memberships;
  }

  const officeId = `workspace-${user.id}`;
  const officeName = user.initialOfficeName?.trim().slice(0, 180)
    || (user.isPlatformAdmin ? "مساحة إدارة المنصة" : "مساحة العمل القانونية");
  const db = getD1();

  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO offices (id,name,slug,status) VALUES (?,?,?,'active')")
      .bind(officeId, officeName, `workspace-${user.id}`),
    db
      .prepare(
        "INSERT OR IGNORE INTO office_subscriptions (id,office_id,plan,status,billing_mode,seat_limit,ends_at,grace_until) VALUES (?,?,?,'active','disabled',?,?,?)",
      )
      .bind(`workspace-access-${user.id}`, officeId, DIRECT_WORKSPACE_PLAN, DIRECT_WORKSPACE_SEAT_LIMIT, "", ""),
    db
      .prepare("INSERT OR IGNORE INTO tenant_settings (office_id,office_name,currency) VALUES (?,?,'KWD')")
      .bind(officeId, officeName),
    db
      .prepare(
        "INSERT OR IGNORE INTO office_members (id,office_id,user_id,role,status) VALUES (?,?,?,'owner','active')",
      )
      .bind(`workspace-owner-${user.id}`, officeId, user.id),
    db
      .prepare(
        "INSERT OR IGNORE INTO office_audit_logs (id,office_id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        `workspace-bootstrap-${user.id}`,
        officeId,
        user.id,
        "bootstrap_direct_workspace",
        "office",
        officeId,
        JSON.stringify({ source: "first_authenticated_visit", subscriptionMode: "deferred" }),
      ),
  ]);

  return membershipRows(user.id);
}

export async function getSaaSSession() {
  const user = await requireSaaSUser();
  let memberships = await membershipRows(user.id);
  memberships = await ensureDirectWorkspace(user, memberships);
  const active = memberships.find(isActiveMembership) ?? null;
  return {
    user,
    memberships: memberships.map((membership) => ({
      officeId: membership.officeId,
      officeName: membership.officeName,
      officeStatus: membership.officeStatus,
      role: membership.role,
      plan: membership.plan,
      subscriptionStatus: membership.subscriptionStatus,
      billingMode: membership.billingMode,
      seatLimit: membership.seatLimit,
      endsAt: membership.endsAt,
      graceUntil: membership.graceUntil,
    })),
    activeOffice: active
      ? {
          officeId: active.officeId,
          officeName: active.officeName,
          role: active.role,
          plan: active.plan ?? DIRECT_WORKSPACE_PLAN,
          subscriptionStatus: active.subscriptionStatus ?? "active",
          billingMode: active.billingMode ?? "disabled",
          seatLimit: active.seatLimit ?? DIRECT_WORKSPACE_SEAT_LIMIT,
          endsAt: active.endsAt ?? "",
          graceUntil: active.graceUntil ?? "",
        }
      : null,
  };
}

export async function requireTenantContext(request: Request): Promise<TenantContext> {
  const user = await requireSaaSUser();
  const requestedOfficeId = request.headers.get("x-office-id")?.trim() ?? "";
  let memberships = await membershipRows(user.id);
  memberships = await ensureDirectWorkspace(user, memberships);
  const membership = requestedOfficeId
    ? memberships.find((item) => item.officeId === requestedOfficeId) ?? null
    : memberships.find(isActiveMembership) ?? null;

  if (!membership) {
    throw new TenantAccessError("لا يوجد مكتب مفعّل مخصص لهذا الحساب.", 403);
  }
  if (!ACTIVE_OFFICE_STATUSES.has(membership.officeStatus)) {
    throw new TenantAccessError("لا يمكن الوصول إلى مساحة العمل هذه حالياً.", 403);
  }

  return {
    ...user,
    officeId: membership.officeId,
    officeName: membership.officeName,
    role: membership.role,
    officeStatus: membership.officeStatus,
    plan: membership.plan ?? DIRECT_WORKSPACE_PLAN,
    subscriptionStatus: membership.subscriptionStatus ?? "active",
    billingMode: membership.billingMode ?? "disabled",
    seatLimit: membership.seatLimit ?? DIRECT_WORKSPACE_SEAT_LIMIT,
    endsAt: membership.endsAt ?? "",
    graceUntil: membership.graceUntil ?? "",
  };
}

export function can(context: TenantContext, capability: OfficeCapability): boolean {
  if (MANAGEMENT_ROLES.has(context.role)) return true;
  if (context.role === "viewer") return false;
  if (capability === "manageSettings" || capability === "manageMembers") return false;
  if (context.role === "finance") return capability === "manageInvoices";
  if (context.role === "secretary") {
    return ["manageClients", "manageCases", "manageHearings"].includes(capability);
  }
  return ["manageClients", "manageCases", "manageHearings", "manageMemos"].includes(capability);
}

export function requireCapability(context: TenantContext, capability: OfficeCapability) {
  if (!can(context, capability)) {
    throw new TenantAccessError("لا تملك الصلاحية لإجراء هذا التعديل.", 403);
  }
}

export async function requirePlatformAdmin(): Promise<SaaSUser> {
  const user = await requireSaaSUser();
  if (!user.isPlatformAdmin) {
    throw new TenantAccessError("هذه الصفحة مخصصة لإدارة المنصة.", 403);
  }
  return user;
}

export async function writeAuditLog(input: {
  officeId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | number | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const metadata = JSON.stringify(input.metadata ?? {}).slice(0, 3500);
  await getD1()
    .prepare(
      "INSERT INTO office_audit_logs (id,office_id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      input.officeId ?? null,
      input.actorUserId ?? null,
      input.action.slice(0, 120),
      (input.entityType ?? "").slice(0, 120),
      String(input.entityId ?? "").slice(0, 160),
      metadata,
    )
    .run();
}
