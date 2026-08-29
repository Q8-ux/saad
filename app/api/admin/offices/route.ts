import { getD1 } from "../../../../db";
import { dateValue, requiredText, textValue, validEmail } from "../../../../lib/office-validation";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../../lib/request-security";
import {
  requirePlatformAdmin,
  TenantAccessError,
} from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

const PLANS = new Set(["starter", "professional", "enterprise"]);
const SUBSCRIPTION_STATUSES = new Set(["trial", "active", "suspended"]);
const OFFICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OfficeRow = {
  id: string;
  name: string;
  status: string;
  plan: string;
  subscriptionStatus: string;
  billingMode: string;
  seatLimit: number;
  endsAt: string;
  graceUntil: string;
  ownerEmail: string | null;
  memberCount: number;
  createdAt: string;
};

function allowed(value: unknown, values: Set<string>, fallback: string, label: string) {
  const result = textValue(value, 40) || fallback;
  if (!values.has(result)) throw new RequestValidationError(`${label} غير صحيح.`);
  return result;
}

function seatLimit(value: unknown) {
  const seats = Number(value);
  if (!Number.isSafeInteger(seats) || seats < 1 || seats > 500) {
    throw new RequestValidationError("عدد المقاعد يجب أن يكون بين 1 و500.");
  }
  return seats;
}

function officeId(value: unknown) {
  const id = textValue(value, 80);
  if (!OFFICE_ID_PATTERN.test(id)) throw new RequestValidationError("معرّف المكتب غير صحيح.");
  return id;
}

function makeSlug(name: string) {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${ascii || "office"}-${crypto.randomUUID().slice(0, 8)}`;
}

function failure(error: unknown, fallback: string) {
  if (error instanceof TenantAccessError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof RequestValidationError) {
    return privateJson({ error: error.message }, { status: 400 });
  }
  console.error("Platform office management failed", error instanceof Error ? error.message : error);
  return privateJson({ error: fallback }, { status: 500 });
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const result = await getD1()
      .prepare(
        "SELECT o.id,o.name,o.status,COALESCE(s.plan,'starter') AS plan,COALESCE(s.status,'trial') AS subscriptionStatus,COALESCE(s.billing_mode,'manual') AS billingMode,COALESCE(s.seat_limit,1) AS seatLimit,COALESCE(s.ends_at,'') AS endsAt,COALESCE(s.grace_until,'') AS graceUntil,MIN(CASE WHEN m.role='owner' AND m.status='active' THEN u.email END) AS ownerEmail,COUNT(CASE WHEN m.status='active' THEN 1 END) AS memberCount,o.created_at AS createdAt FROM offices o LEFT JOIN office_subscriptions s ON s.office_id=o.id LEFT JOIN office_members m ON m.office_id=o.id LEFT JOIN app_users u ON u.id=m.user_id GROUP BY o.id ORDER BY o.created_at DESC",
      )
      .all<OfficeRow>();
    return privateJson({ offices: result.results ?? [] });
  } catch (error) {
    return failure(error, "تعذّر تحميل اشتراكات المكاتب حالياً.");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const admin = await requirePlatformAdmin();
    const body = await readJsonObject(request);
    const name = requiredText(body.name, "اسم المكتب", 180);
    const ownerEmail = validEmail(body.ownerEmail);
    if (!ownerEmail) throw new RequestValidationError("بريد مالك المكتب مطلوب.");
    const ownerName = textValue(body.ownerName, 180);
    const plan = allowed(body.plan, PLANS, "starter", "الخطة");
    const subscriptionStatus = allowed(body.subscriptionStatus, SUBSCRIPTION_STATUSES, "trial", "حالة الاشتراك");
    const seats = seatLimit(body.seatLimit ?? 3);
    const endsAt = dateValue(body.endsAt, "تاريخ الانتهاء");
    const graceUntil = dateValue(body.graceUntil, "نهاية فترة السماح");
    if (graceUntil && endsAt && graceUntil < endsAt) {
      throw new RequestValidationError("فترة السماح يجب ألا تسبق تاريخ الانتهاء.");
    }

    const db = getD1();
    const existingUser = await db
      .prepare("SELECT id FROM app_users WHERE email=? LIMIT 1")
      .bind(ownerEmail.toLowerCase())
      .first<{ id: string }>();
    const ownerUserId = existingUser?.id ?? crypto.randomUUID();
    const officeId = crypto.randomUUID();
    const officeStatus = subscriptionStatus === "suspended" ? "suspended" : subscriptionStatus;

    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO app_users (id,email,display_name,status) VALUES (?,?,?,'active')",
        )
        .bind(ownerUserId, ownerEmail.toLowerCase(), ownerName),
      db
        .prepare("INSERT INTO offices (id,name,slug,status) VALUES (?,?,?,?)")
        .bind(officeId, name, makeSlug(name), officeStatus),
      db
        .prepare(
          "INSERT INTO office_subscriptions (id,office_id,plan,status,billing_mode,seat_limit,ends_at,grace_until) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(crypto.randomUUID(), officeId, plan, subscriptionStatus, "manual", seats, endsAt, graceUntil),
      db
        .prepare("INSERT INTO tenant_settings (office_id,office_name,currency) VALUES (?,?,'KWD')")
        .bind(officeId, name),
      db
        .prepare(
          "INSERT INTO office_members (id,office_id,user_id,role,status) VALUES (?,?,?,'owner','active')",
        )
        .bind(crypto.randomUUID(), officeId, ownerUserId),
      db
        .prepare(
          "INSERT INTO office_audit_logs (id,office_id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          officeId,
          admin.id,
          "provision_office",
          "office",
          officeId,
          JSON.stringify({ plan, subscriptionStatus, seats, ownerEmail: ownerEmail.toLowerCase() }),
        ),
    ]);

    return privateJson({
      ok: true,
      office: { id: officeId, name, plan, subscriptionStatus, ownerEmail: ownerEmail.toLowerCase() },
    }, { status: 201 });
  } catch (error) {
    return failure(error, "تعذّر إنشاء المكتب المشترك.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedMutation(request);
    const admin = await requirePlatformAdmin();
    const body = await readJsonObject(request);
    const id = officeId(body.id);
    const plan = allowed(body.plan, PLANS, "starter", "الخطة");
    const subscriptionStatus = allowed(body.subscriptionStatus, SUBSCRIPTION_STATUSES, "trial", "حالة الاشتراك");
    const seats = seatLimit(body.seatLimit ?? 3);
    const endsAt = dateValue(body.endsAt, "تاريخ الانتهاء");
    const graceUntil = dateValue(body.graceUntil, "نهاية فترة السماح");
    if (graceUntil && endsAt && graceUntil < endsAt) {
      throw new RequestValidationError("فترة السماح يجب ألا تسبق تاريخ الانتهاء.");
    }
    const exists = await getD1()
      .prepare("SELECT id FROM offices WHERE id=?")
      .bind(id)
      .first<{ id: string }>();
    if (!exists) return privateJson({ error: "لم يُعثر على المكتب المطلوب." }, { status: 404 });

    const officeStatus = subscriptionStatus === "suspended" ? "suspended" : subscriptionStatus;
    await getD1().batch([
      getD1()
        .prepare("UPDATE offices SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(officeStatus, id),
      getD1()
        .prepare(
          "UPDATE office_subscriptions SET plan=?,status=?,seat_limit=?,ends_at=?,grace_until=?,updated_at=CURRENT_TIMESTAMP WHERE office_id=?",
        )
        .bind(plan, subscriptionStatus, seats, endsAt, graceUntil, id),
      getD1()
        .prepare(
          "INSERT INTO office_audit_logs (id,office_id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          admin.id,
          "update_subscription",
          "subscription",
          id,
          JSON.stringify({ plan, subscriptionStatus, seats }),
        ),
    ]);
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error, "تعذّر تحديث اشتراك المكتب.");
  }
}
