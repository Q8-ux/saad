import { engineeringPathStatus } from "@/lib/engineering-paths";
import { siteAction, servicesAction, bookingsAction } from "@/lib/site-controls";
import { listManagedUsers, updateManagedUser } from "@/lib/user-management";
import { managementAccounts } from "@/lib/management-password";
import { mailboxAction } from "@/lib/management-mailboxes";
import { sadadManagement } from "@/lib/sadad-payments";
import { programmerAction } from "@/lib/management-programmer";
import { searchImportedEdition } from "@/lib/legislation-edition-import";
import { getAuditFile } from "@/lib/legislation-audit";
import { legislationWorkbench, archiveArticles, archiveAsset } from "@/lib/legislation-workbench";
import { getD1 } from "@/db";
import { assertManagementOrigin, assertManagerAction, exchangeManagerCode, managementJson, managerLogin, managerProfile, passwordManagerLogin, requireManager , managementCorsOrigin, withManagementCors } from "@/lib/management-auth";
import { bridgeKeys, managerInbox, managerMemos, managerMemoRecovery, managerSnapshot, managerUpdates } from "@/lib/management-data";
import { mailAction, operationEvent, whatsappAction } from "@/lib/management-integrations";
import { verificationEmailAction } from "@/lib/verification-email-settings";
import { EmailDeliveryError, sendRegistrationInvitation, sendTestEmail } from "@/lib/email";
import { cleanMultiline, cleanString, enforceRateLimit, readJsonObject, RequestError } from "@/lib/request-security";

export const dynamic = "force-dynamic";
function actionPath(request: Request) { return new URL(request.url).pathname.replace(/^\/api\/management\//, ""); }
function failure(error: unknown) { return managementJson({ error: error instanceof RequestError ? error.message : "تعذر إكمال طلب الإدارة. أعد المحاولة.", code: error instanceof RequestError ? "request_rejected" : "service_unavailable" }, error instanceof RequestError ? error.status : 503); }
export async function OPTIONS(request: Request) {
  try { assertManagementOrigin(request); return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": managementCorsOrigin(request), "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "600", Vary: "Origin" } }); }
  catch (error) { return failure(error); }
}
export async function GET(request: Request) { return withManagementCors(request, await handleGet(request)); }
async function handleGet(request: Request) {
  try {
    const action = actionPath(request);
    if (action === "login") { await enforceRateLimit(request, "management-login", 20); return await managerLogin(request); }
    if (action === "jwks") { const keys = await bridgeKeys(); return managementJson({ keys: [keys.publicKey] }); }
    const manager = await requireManager(request), url = new URL(request.url);
    assertManagerAction(manager, action, "GET");
    if (action === "control-accounts") return managementJson(await managementAccounts(null, manager));
    if (action === "verification-email") return managementJson(await verificationEmailAction(null, manager.email));
    if (action === "site") return managementJson(await siteAction(null, manager.email));
    if (action === "services") return managementJson(await servicesAction(null));
    if (action === "bookings") return managementJson(await bookingsAction(null));
    if (action === "users") return managementJson(await listManagedUsers(url, 50));
    if (action === "legislation") return managementJson(await searchImportedEdition(url));
    if (action === "legislation-workbench") return managementJson(await legislationWorkbench());
    if (action === "legislation-articles") return managementJson(await archiveArticles(url));
    if (action === "legislation-asset") return archiveAsset(url,"https://q8-ux.github.io");
    if (action === "legislation-report") return getAuditFile(url.searchParams.get("id") || "", "https://q8-ux.github.io");
    if (action === "paths") return managementJson(await engineeringPathStatus());
    if (action === "programmer") return managementJson(await programmerAction(null, manager.email));
    if (action === "payments") return managementJson(await sadadManagement(null, manager.email));
    if (action === "mailboxes") return managementJson(await mailboxAction(null, manager.email, Number(url.searchParams.get("offset") || 0)));
    if (action === "session") return managementJson({ manager: managerProfile(manager) });
    if (action === "snapshot") return managementJson(await managerSnapshot(manager.email));
    if (action === "memos") return managementJson(await managerMemos(url));
    if (action === "memo-recovery") return managementJson(await managerMemoRecovery(url));
    if (action === "inbox") return managementJson(await managerInbox(url));
    if (action === "updates") return managementJson(await managerUpdates());
    if (action === "whatsapp") return managementJson(await whatsappAction(null, manager.email));
    if (action === "mail") return managementJson(await mailAction(null, manager.email));
    if (action === "commands") return managementJson({ commands: (await getD1().prepare("SELECT * FROM management_commands ORDER BY created_at DESC LIMIT 200").all()).results });
    throw new RequestError("القسم غير موجود.", 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) { return withManagementCors(request, await handlePost(request)); }
async function handlePost(request: Request) {
  try {
    assertManagementOrigin(request);
    const action = actionPath(request), data = await readJsonObject(request, action === "password-login" ? 4_096 : action === "site" ? 200_000 : 20_000);
    if (action === "exchange") { await enforceRateLimit(request, "management-exchange", 30); return managementJson(await exchangeManagerCode(data)); }
    if (action === "password-login") return managementJson(await passwordManagerLogin(request, data));
    const manager = await requireManager(request);
    assertManagerAction(manager, action, "POST");
    await enforceRateLimit(request, "management-write", 150);
    if (action === "control-accounts") return managementJson(await managementAccounts(data, manager));
    if (action === "site") return managementJson(await siteAction(data, manager.email));
    if (action === "services") return managementJson(await servicesAction(data));
    if (action === "bookings") return managementJson(await bookingsAction(data));
    if (action === "programmer") {
      if (data.action === "run") await enforceRateLimit(request, "management-programmer", 20);
      return managementJson(await programmerAction(data, manager.email, request.signal));
    }
    if (action === "logout") { await getD1().prepare("DELETE FROM management_sessions WHERE token_hash = ?").bind(manager.hash).run(); return managementJson({ ok: true }); }
    if (action === "users") {
      if (data.action === "send-invitation") {
        if (manager.role !== "administrator") throw new RequestError("إرسال دعوات التسجيل متاح للمشرف فقط.", 403);
        if (Object.keys(data).some(key => !["action", "id"].includes(key))) throw new RequestError("بيانات طلب الدعوة غير صحيحة.");
        const id = cleanString(data.id, "المستخدم", { min: 20, max: 80 });
        const account = await getD1().prepare("SELECT id, name, email, status, email_verified_at FROM public_users WHERE id = ?").bind(id).first<{ id: string; name: string; email: string; status: string; email_verified_at: string }>();
        if (!account) throw new RequestError("الحساب غير موجود.", 404);
        if (account.status !== "active" || account.email_verified_at) throw new RequestError("لا يمكن إرسال دعوة لحساب موقوف أو بريده متحقق بالفعل.", 409);
        await enforceRateLimit(request, "management-registration-invite", 5);
        try {
          const messageId = await sendRegistrationInvitation(account.email, account.name);
          return managementJson({ ok: true, accepted: true, messageId, email: account.email, delivered: false, verificationPending: true });
        } catch (error) {
          const reason = error instanceof EmailDeliveryError ? error.reason : "unknown";
          throw new RequestError(
            reason === "sender_domain_unverified" ? "رفض Resend الإرسال: نطاق sabeq.legal غير موثق للإرسال. أصلح سجلات النطاق في Resend." :
            reason === "api_key_rejected" ? "رفض Resend مفتاح إرسال البريد المحفوظ." :
            reason === "missing_settings" ? "إعدادات إرسال بريد التحقق غير مكتملة. افتح إعدادات البريد في لوحة المشرف." :
            "تعذر قبول رسالة الدعوة لدى مزود البريد. افتح إعدادات البريد واختبر الإرسال.", 502);
        }
      }
      const result = await updateManagedUser(data, manager.email, manager.role);
      await operationEvent("admin", "user-updated", "تم تحديث حساب مستخدم وخدماته");
      if (manager.role !== "administrator" || !result.emailVerificationRequired) return managementJson(result);
      const account = await getD1().prepare("SELECT name, email, status FROM public_users WHERE id = ?").bind(result.id).first<{ name: string; email: string; status: string }>();
      if (!account || account.status !== "active") return managementJson({ ...result, invitation: { accepted: false, reason: "not_active" } });
      try {
        await enforceRateLimit(request, "management-registration-invite", 5);
        const messageId = await sendRegistrationInvitation(account.email, account.name);
        return managementJson({ ...result, invitation: { accepted: true, delivered: false, messageId } });
      } catch (error) {
        // User creation/edit succeeded and stays unverified. Never claim a message
        // was sent on provider failure, and do not roll back or duplicate the user.
        const reason = error instanceof EmailDeliveryError ? error.reason : error instanceof RequestError && error.status === 429 ? "rate_limited" : "delivery_unavailable";
        return managementJson({ ...result, invitation: { accepted: false, reason } });
      }
    }
    if (action === "payments") return managementJson(await sadadManagement(data, manager.email));
    if (action === "mailboxes") return managementJson(await mailboxAction(data, manager.email));
    if (action === "whatsapp") return managementJson(await whatsappAction(data, manager.email));
    if (action === "verification-email") {
      if (data.action === "check" || data.action === "send-test") {
        const rateHeaders = new Headers(request.headers);
        rateHeaders.set("user-agent", "sabeq-management-email");
        await enforceRateLimit(new Request(request.url, { headers: rateHeaders }), data.action === "check" ? "management-email-check" : "management-email-send-test", data.action === "check" ? 20 : 5);
      }
      if (data.action === "send-test") {
        return managementJson(await sendTestEmail(data.to, data.expectedFromEmail));
      }
      return managementJson(await verificationEmailAction(data, manager.email));
    }
    if (action === "mail") return managementJson(await mailAction(data, manager.email));
    if (action === "read") {
      if (!Array.isArray(data.ids) || data.ids.length > 100 || data.ids.some(id => typeof id !== "string" || id.length > 200)) throw new RequestError("قائمة التنبيهات غير صحيحة.");
      if (data.ids.length) await getD1().batch(data.ids.map(id => getD1().prepare("INSERT INTO management_read_states (id, email, event_id) VALUES (?, ?, ?) ON CONFLICT(email, event_id) DO NOTHING").bind(crypto.randomUUID(), manager.email, id)));
      return managementJson({ ok: true });
    }
    if (action === "inbox") {
      const id = cleanString(data.id, "معرف الرسالة", { max: 100 }), status = cleanString(data.status, "الحالة", { max: 20 });
      if (!["new", "read", "archived"].includes(status)) throw new RequestError("حالة الرسالة غير صحيحة.");
      if (id.startsWith("official:")) throw new RequestError("حالة رسائل المصدر الرسمي تعرض حالياً من مصدرها دون تعديل.", 409);
      const result = id.startsWith("contact:") ? await getD1().prepare("UPDATE contact_messages SET status = ? WHERE id = ?").bind(status, id.slice(8)).run() : await getD1().prepare("UPDATE management_emails SET status = ? WHERE id = ?").bind(status, id).run();
      if (!result.meta.changes) throw new RequestError("الرسالة غير موجودة.", 404);
      return managementJson({ ok: true });
    }
    if (action === "commands") {
      const id = cleanString(data.id, "معرف الأمر", { max: 80, required: false });
      const status = cleanString(data.status || "pending", "الحالة", { max: 30 });
      if (!["pending", "running", "completed", "blocked"].includes(status)) throw new RequestError("حالة الأمر غير صحيحة.");
      if (id) {
        const result = await getD1().prepare("UPDATE management_commands SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, id).run();
        if (!result.meta.changes) throw new RequestError("الأمر غير موجود.", 404);
      } else {
        const title = cleanString(data.title, "عنوان الأمر", { min: 3, max: 240 }), details = cleanMultiline(data.details, "التفاصيل", { max: 6000, required: false });
        const priority = data.priority === "urgent" ? "urgent" : "normal";
        await getD1().prepare("INSERT INTO management_commands (id, title, details, status, priority, created_by) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), title, details, status, priority, manager.email).run();
      }
      await operationEvent("admin", "command", id ? "تم تحديث حالة أمر متابعة" : "تم تسجيل أمر متابعة جديد");
      return managementJson({ ok: true });
    }
    throw new RequestError("العملية غير موجودة.", 404);
  } catch (error) { return failure(error); }
}
