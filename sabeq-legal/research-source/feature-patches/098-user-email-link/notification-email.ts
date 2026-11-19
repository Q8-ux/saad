import { getD1 } from "@/db";
import { waitUntil } from "cloudflare:workers";
import { integrationConfig, operationEvent, saveIntegration } from "@/lib/management-integrations";
import { verificationEmailDelivery } from "@/lib/verification-email-settings";
import { EmailDeliveryError, sendNotificationEmail } from "@/lib/email";
import { cleanEmail, cleanString, RequestError } from "@/lib/request-security";

const INTEGRATION = "notification-email";
const HOME = "https://q8-ux.github.io/saad/sabeq-admin-preview/";
const KEYS = ["userCreated", "memoCreated", "memoUpdated"] as const;
type Settings = { enabled: boolean; recipients: string[]; notifyUsers: boolean; events: Record<typeof KEYS[number], boolean> };
type Message = { from: string; to: string[]; subject: string; text: string };
type Delivery = { id: string; event_type: string; record_id: string; user_id: string | null; audience: string; recipient: string; payload_json: string; status: string; attempts: number; uncertain: number; first_attempt_at: number | null; lease_until: number };
const defaults = (): Settings => ({ enabled: false, recipients: [], notifyUsers: true, events: { userCreated: true, memoCreated: true, memoUpdated: true } });
async function settings() { return await integrationConfig<Settings>(INTEGRATION) || defaults(); }
function eventEnabled(config: Settings, type: string) { return config.events[type.startsWith("user_") ? "userCreated" : type === "memo_created" ? "memoCreated" : "memoUpdated"] === true; }
async function deliveryId(eventKey: string, recipient: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${eventKey}\n${recipient}`));
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join("");
}
async function allowedRecipient(row: Delivery, config: Settings) {
  if (row.audience === "office") return config.recipients.includes(row.recipient);
  if (!config.notifyUsers || !row.user_id) return false;
  const account = await getD1().prepare("SELECT email, status, email_verified_at FROM public_users WHERE id = ?").bind(row.user_id).first<{ email: string; status: string; email_verified_at: string }>();
  return !!account && account.status === "active" && !!account.email_verified_at && account.email.toLowerCase() === row.recipient;
}
export async function deliverNotification(id: string) {
  const db = getD1(), config = await settings();
  const row = await db.prepare("SELECT * FROM notification_email_deliveries WHERE id = ?").bind(id).first<Delivery>();
  if (!row) throw new RequestError("إشعار البريد غير موجود.", 404);
  if (!config.enabled || row.status === "accepted" || row.status === "cancelled") return;
  if (!eventEnabled(config, row.event_type) || !await allowedRecipient(row, config)) {
    await db.prepare("UPDATE notification_email_deliveries SET status = 'cancelled', error_code = 'recipient_or_event_disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status <> 'accepted'").bind(id).run();
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  // Resend keeps idempotency keys for 24 hours. Never resend an uncertain attempt outside that window.
  if ((row.uncertain || row.status === "sending") && row.first_attempt_at && now - row.first_attempt_at >= 23 * 3600) {
    await db.prepare("UPDATE notification_email_deliveries SET status = 'uncertain', error_code = 'idempotency_window_expired', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status <> 'accepted'").bind(id).run();
    return;
  }
  if (row.attempts >= 5 || row.lease_until > now) return;
  const claimed = await db.prepare("UPDATE notification_email_deliveries SET status = 'sending', attempts = attempts + 1, lease_until = ?, first_attempt_at = COALESCE(first_attempt_at, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('pending','failed','uncertain','sending') AND lease_until <= ? AND attempts = ?")
    .bind(now + 60, now, id, now, row.attempts).run();
  if (claimed.meta.changes !== 1) return;
  try {
    const message = JSON.parse(row.payload_json) as Message;
    const providerId = await sendNotificationEmail(message, `sabeq:${id}`);
    await db.prepare("UPDATE notification_email_deliveries SET status = 'accepted', provider_id = ?, error_code = '', lease_until = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(providerId, id).run();
  } catch (error) {
    const uncertain = error instanceof EmailDeliveryError ? error.uncertain : true;
    const reason = error instanceof EmailDeliveryError ? error.reason : "delivery_unconfirmed";
    await db.prepare("UPDATE notification_email_deliveries SET status = ?, uncertain = MAX(uncertain, ?), error_code = ?, lease_until = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'")
      .bind(uncertain ? "uncertain" : "failed", uncertain ? 1 : 0, reason, id).run();
  }
}
async function enqueue(type: string, recordId: string, userId: string | null, status: string, officeTitle: string, userTitle: string) {
  const config = await settings();
  if (!config.enabled || !eventEnabled(config, type)) return;
  const sender = await verificationEmailDelivery();
  if (!sender.fromEmail) return;
  const targets: { recipient: string; audience: string }[] = type === "user_verified" ? [] : config.recipients.map(recipient => ({ recipient, audience: "office" }));
  if (userId && config.notifyUsers && type !== "user_created") {
    const user = await getD1().prepare("SELECT email FROM public_users WHERE id = ? AND status = 'active' AND email_verified_at <> ''").bind(userId).first<{ email: string }>();
    if (user) targets.push({ recipient: cleanEmail(user.email).toLowerCase(), audience: "user" });
  }
  const unique = [...new Map(targets.map(target => [target.recipient, target])).values()];
  const db = getD1(), ids: string[] = [], statements = [];
  for (const target of unique) {
    const eventKey = `${type}:${recordId}:${status}`, id = await deliveryId(eventKey, target.recipient);
    const title = target.audience === "office" ? officeTitle : userTitle;
    const url = target.audience === "office" ? HOME + (type.startsWith("user_") ? "#users" : "#memos?record=" + encodeURIComponent(recordId)) : "https://www.sabeq.legal/";
    const message: Message = { from: sender.fromEmail, to: [target.recipient], subject: `مجموعة سابق القانونية — ${title}`, text: `${title}\n\nرقم السجل: ${recordId}\n\nللمتابعة بعد تسجيل الدخول:\n${url}\n\nلا تتضمن هذه الرسالة نصوص القضايا أو المستندات.` };
    ids.push(id);
    statements.push(db.prepare("INSERT INTO notification_email_deliveries (id,event_key,event_type,record_id,user_id,audience,recipient,payload_json) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(event_key,recipient) DO NOTHING")
      .bind(id, eventKey, type, recordId, userId, target.audience, target.recipient, JSON.stringify(message)));
  }
  if (statements.length) await db.batch(statements);
  const sending = Promise.all(ids.map(id => deliverNotification(id))).catch(() => { console.error("notification_event_failed", { stage: "outbox_delivery" }); });
  if (typeof waitUntil === "function") waitUntil(sending);
  else await sending;
}
export async function notifyUserEvent(id: string, event: "created" | "verified") {
  try {
    const row = await getD1().prepare("SELECT id FROM public_users WHERE id = ?").bind(id).first();
    if (!row) return;
    await operationEvent("user", event === "created" ? "user-created" : "user-verified", event === "created" ? "تم إنشاء حساب مستخدم جديد" : "تم التحقق من بريد حساب مستخدم", "info", `public-user:${event}:${id}`);
    await enqueue(`user_${event}`, id, id, event, "تم إنشاء حساب مستخدم جديد", "مرحباً بك، تم التحقق من حسابك في سابق");
  } catch { console.error("notification_event_failed", { stage: "user_event" }); }
}
const STATUS_LABELS: Record<string, string> = { running: "قيد المعالجة", needs_information: "يحتاج معلومات إضافية", needs_review: "بانتظار المراجعة", generated: "اكتمل إنشاء المذكرة", failed: "تعذر إكمال الطلب", cancelled: "أُلغي الطلب" };
export async function notifyMemoEvent(id: string, event: "created" | "updated") {
  try {
    const row = await getD1().prepare("SELECT user_id, status FROM management_memo_requests WHERE id = ?").bind(id).first<{ user_id: string | null; status: string }>();
    if (!row) return;
    const title = event === "created" ? "تم استلام طلب مذكرة" : `تحديث طلب مذكرة: ${STATUS_LABELS[row.status] || "تغيرت حالة الطلب"}`;
    await enqueue(`memo_${event}`, id, row.user_id, row.status, title, title);
  } catch { console.error("notification_event_failed", { stage: "memo_event" }); }
}
export async function notificationEmailAction(data: Record<string, unknown> | null, actor: string) {
  if (data?.action === "save") {
    if (typeof data.enabled !== "boolean" || typeof data.notifyUsers !== "boolean" || !data.events || typeof data.events !== "object" || Array.isArray(data.events)) throw new RequestError("إعدادات الإشعارات غير صحيحة.");
    const events = data.events as Settings["events"];
    if (KEYS.some(key => typeof events[key] !== "boolean") || Object.keys(events).some(key => !KEYS.includes(key as typeof KEYS[number]))) throw new RequestError("حدد أحداث الإشعارات الصحيحة.");
    const raw = Array.isArray(data.recipients) ? data.recipients : typeof data.recipients === "string" ? data.recipients.split(/[,;،\s]+/).filter(Boolean) : [];
    if (raw.length > 5) throw new RequestError("الحد الأقصى خمسة مستلمين للمكتب.");
    const recipients = [...new Set(raw.map(value => cleanEmail(value).toLowerCase()))];
    if (data.enabled && !recipients.length) throw new RequestError("حدد بريد المكتب لاستقبال الإشعارات.");
    const sender = await verificationEmailDelivery();
    if (data.enabled && (!sender.apiKey || !sender.fromEmail)) throw new RequestError("احفظ إعداد إرسال رموز الدخول أولاً؛ تستخدم الإشعارات المزود نفسه.", 409);
    await saveIntegration(INTEGRATION, { enabled: data.enabled, notifyUsers: data.notifyUsers, recipients, events }, actor);
    await operationEvent("email", "notification-settings", "تم تحديث إعداد إشعارات البريد");
  } else if (data?.action === "retry") {
    await deliverNotification(cleanString(data.id, "الإشعار", { min: 64, max: 64 }));
  } else if (data) throw new RequestError("عملية إشعار البريد غير مدعومة.");
  const config = await settings(), sender = await verificationEmailDelivery();
  const recent = await getD1().prepare("SELECT id, event_type, record_id, audience, recipient, status, attempts, provider_id, error_code, created_at, updated_at FROM notification_email_deliveries ORDER BY created_at DESC, id LIMIT 50").all();
  return { ...config, provider: "resend", sender: sender.fromEmail, deliveryConfigured: !!sender.apiKey && !!sender.fromEmail, deliveryVerified: false, deliveries: recent.results };
}
