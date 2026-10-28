import { getD1 } from "@/db";
import { digest, randomToken, requireManagerSession } from "@/lib/management-auth";
import { RequestError } from "@/lib/request-security";

export type PaymentMode = "real" | "mock";
export type PaymentManager = { role: string; hash: string };
export async function paymentMode() {
  const row = await getD1().prepare("SELECT mode, revision FROM payment_runtime_settings WHERE id = 'memo'").first<{ mode: PaymentMode; revision: number }>();
  if (!row || !["real", "mock"].includes(row.mode)) throw new RequestError("إعداد وضع الدفع يحتاج ترحيل قاعدة البيانات.", 503);
  return row;
}
function assertAdministrator(manager?: PaymentManager) {
  if (manager?.role !== "administrator" || !manager.hash) throw new RequestError("هذه العملية متاحة للمشرف فقط.", 403);
}
export async function savePaymentMode(data: Record<string, unknown>, actor: string, manager?: PaymentManager) {
  assertAdministrator(manager);
  const previous = await paymentMode(), mode = data.mode;
  if (mode !== "real" && mode !== "mock") throw new RequestError("وضع الدفع غير صحيح.");
  if (data.revision !== previous.revision) throw new RequestError("تغير إعداد الدفع. حدّث الصفحة قبل الحفظ.", 409);
  if (mode === previous.mode) return;
  if (mode === "real" && data.confirmReal !== true) throw new RequestError("أكد صراحة تفعيل الدفع الحقيقي قبل الحفظ.", 409);
  const results = await getD1().batch([
    getD1().prepare("UPDATE payment_runtime_settings SET mode = ?, revision = revision + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'memo' AND revision = ?").bind(mode, actor, previous.revision),
    getD1().prepare("INSERT INTO payment_mode_audit (id, previous_mode, next_mode, actor) SELECT ?, ?, ?, ? WHERE changes() = 1").bind(crypto.randomUUID(), previous.mode, mode, actor),
  ]);
  if (results[0].meta.changes !== 1) throw new RequestError("تغير إعداد الدفع. حدّث الصفحة قبل الحفظ.", 409);
}
export async function startPaymentTestSession(actor: string, manager?: PaymentManager) {
  assertAdministrator(manager);
  if ((await paymentMode()).mode !== "mock") throw new RequestError("فعّل الوضع التجريبي أولاً لبدء جلسة اختبار.", 409);
  const token = randomToken(), expiresAt = Math.floor(Date.now() / 1000) + 1800;
  await getD1().prepare("INSERT INTO payment_test_sessions (token_hash, management_session_hash, actor, expires_at) VALUES (?, ?, ?, ?)").bind(await digest(token), manager!.hash, actor, expiresAt).run();
  return { url: `https://q8-ux.github.io/saad/sabeq-legal/#payment-test=${token}`, expiresAt };
}
export async function requirePaymentTestActor(token = "", expectedActor?: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new RequestError("المحاكاة متاحة للمشرف عبر جلسة اختبار مصرح بها فقط.", 403);
  const session = await getD1().prepare("SELECT management_session_hash, actor FROM payment_test_sessions WHERE token_hash = ? AND expires_at > ?").bind(await digest(token), Math.floor(Date.now() / 1000)).first<{ management_session_hash: string; actor: string }>();
  if (!session) throw new RequestError("انتهت جلسة اختبار الدفع أو لم تصدر من الإدارة.", 403);
  const manager = await requireManagerSession(session.management_session_hash);
  if (manager.role !== "administrator" || manager.email !== session.actor || (expectedActor && expectedActor !== manager.email)) throw new RequestError("جلسة الاختبار لا تخص هذا الطلب.", 403);
  return manager.email;
}
