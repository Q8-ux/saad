import { getD1 } from "@/db";
import { RequestError, cleanEmail, cleanString } from "@/lib/request-security";
import { digest, equalSignature, openConfig, sealConfig, signIntegration } from "@/lib/management-auth";

export const SERVICE_ORIGIN = "https://sabeq-legal-public.centrino.chatgpt.site";
type WhatsAppConfig = { baseUrl: string; apiKey: string; sessionId: string; officePhone: string; enabled: boolean; webhookId?: string; testedAt?: string; connectionStatus?: string };
type MailConfig = { address: string; apiKey: string; signingSecret: string; webhookId?: string; testedAt?: string };
export async function integrationConfig<T>(name: string): Promise<T | null> {
  const row = await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(name).first<{ sealed: string }>();
  return row ? openConfig<T>(row.sealed) : null;
}
export async function saveIntegration(name: string, value: unknown, actor: string) {
  await getD1().prepare("INSERT INTO management_vault (integration, sealed, updated_by) VALUES (?, ?, ?) ON CONFLICT(integration) DO UPDATE SET sealed = excluded.sealed, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP")
    .bind(name, await sealConfig(value), actor).run();
}
export async function operationEvent(source: string, kind: string, title: string, severity = "info", id = crypto.randomUUID()) {
  await getD1().prepare("INSERT INTO management_events (id, source, kind, title, severity) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(id, source, kind, title, severity).run();
}
export function gatewayUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new RequestError("أدخل عنوان HTTPS صحيحاً لبوابة OpenWA."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || url.search || url.hash || !host.includes(".") || !/^[a-z0-9.-]+$/.test(host) || /^\d/.test(host) || /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host)) throw new RequestError("استخدم نطاق HTTPS عاماً للبوابة، دون بيانات دخول أو عنوان شبكة داخلية.");
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "") + "/api/";
  return url.href;
}
export async function openwaRequest(config: WhatsAppConfig, path: string, method = "GET", data?: unknown) {
  if (!config.apiKey) throw new RequestError("أضف مفتاح OpenWA أولاً.", 409);
  try {
    const response = await fetch(new URL(path, gatewayUrl(config.baseUrl)), { method, redirect: "error", headers: { "X-API-Key": config.apiKey, Accept: "application/json", ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new RequestError(response.status === 401 || response.status === 403 ? "رفضت البوابة المفتاح أو صلاحيات الجلسة." : `تعذر تنفيذ العملية في OpenWA (HTTP ${response.status}).`, 502);
    if (Number(response.headers.get("content-length") || 0) > 400_000) throw new RequestError("استجابة البوابة أكبر من الحد المسموح.", 502);
    const body = await response.text();
    if (body.length > 400_000) throw new RequestError("استجابة البوابة أكبر من الحد المسموح.", 502);
    return body ? JSON.parse(body) : {};
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError("تعذر الوصول إلى بوابة OpenWA. تحقق من العنوان والاستضافة.", 502); }
}
function publicWhatsApp(config: WhatsAppConfig | null) {
  return { provider: "openwa", baseUrl: config?.baseUrl || "", sessionId: config?.sessionId || "", officePhone: config?.officePhone || "", enabled: config?.enabled || false, hasApiKey: !!config?.apiKey, webhookConfigured: !!config?.webhookId, testedAt: config?.testedAt || null, connectionStatus: config?.connectionStatus || "unconfigured", webhookUrl: `${SERVICE_ORIGIN}/api/integrations/whatsapp`, automaticMessaging: false };
}
export async function whatsappAction(data: Record<string, unknown> | null, actor: string) {
  let config = await integrationConfig<WhatsAppConfig>("whatsapp");
  if (!data) return publicWhatsApp(config);
  const action = data.action;
  if (action === "save") {
    const baseUrl = cleanString(data.baseUrl, "عنوان البوابة", { max: 2000 });
    gatewayUrl(baseUrl);
    const sessionId = cleanString(data.sessionId, "معرف الجلسة", { max: 80, required: false });
    if (sessionId && !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new RequestError("معرف الجلسة يجب أن يكون UUID من OpenWA.");
    const suppliedKey = cleanString(data.apiKey, "المفتاح", { max: 500, required: false });
    const unchanged = config?.baseUrl === baseUrl && config?.sessionId === sessionId && !suppliedKey;
    const changedOrigin = !!config && new URL(baseUrl).origin !== new URL(config.baseUrl).origin;
    if (changedOrigin && !suppliedKey) throw new RequestError("عند تغيير نطاق البوابة، أدخل مفتاحها مجدداً.");
    config = { baseUrl, sessionId, apiKey: suppliedKey || config?.apiKey || "", officePhone: cleanString(data.officePhone, "رقم المكتب", { max: 40, required: false }), enabled: data.enabled === true, ...(unchanged ? { webhookId: config?.webhookId, testedAt: config?.testedAt, connectionStatus: config?.connectionStatus } : { connectionStatus: "untested" }) };
    if (!config.apiKey) throw new RequestError("أدخل مفتاح API لبوابة OpenWA.");
    await saveIntegration("whatsapp", config, actor);
    await operationEvent("whatsapp", "configuration", "تم تحديث إعدادات واتساب المكتب");
    return publicWhatsApp(config);
  }
  if (!config) throw new RequestError("احفظ إعدادات OpenWA أولاً.", 409);
  if (action === "test") {
    const sessions = await openwaRequest(config, "sessions?limit=100");
    if (!Array.isArray(sessions)) throw new RequestError("استجابة قائمة الجلسات غير متوقعة.", 502);
    const session = sessions.find(s => s.id === config!.sessionId);
    config.testedAt = new Date().toISOString(); config.connectionStatus = session?.status || "gateway_reachable";
    await saveIntegration("whatsapp", config, actor);
    return { ...publicWhatsApp(config), sessions: sessions.map(s => ({ id: String(s.id || ""), name: String(s.name || ""), status: String(s.status || ""), phone: String(s.phone || "") })) };
  }
  if (action === "create") {
    const session = await openwaRequest(config, "sessions", "POST", { name: "sabeq-office" });
    if (!/^[0-9a-f-]{36}$/i.test(session.id || "")) throw new RequestError("لم تُرجع البوابة جلسة صالحة.", 502);
    config.sessionId = session.id; config.connectionStatus = session.status; await saveIntegration("whatsapp", config, actor);
    return publicWhatsApp(config);
  }
  if (!config.sessionId) throw new RequestError("اختر جلسة من الاختبار أو أنشئ جلسة للمكتب.", 409);
  const path = `sessions/${encodeURIComponent(config.sessionId)}`;
  if (action === "start") { const session = await openwaRequest(config, `${path}/start`, "POST"); return { ...publicWhatsApp(config), connectionStatus: String(session.status || "initializing") }; }
  if (action === "qr") {
    const data = await openwaRequest(config, `${path}/qr`);
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.qrCode || "") || data.qrCode.length > 350_000) throw new RequestError("رمز QR غير جاهز أو أن الرقم متصل بالفعل.", 409);
    return { ...publicWhatsApp(config), qrCode: data.qrCode, connectionStatus: data.status };
  }
  if (action === "webhook") {
    const callback = `${SERVICE_ORIGIN}/api/integrations/whatsapp`;
    const list = await openwaRequest(config, `${path}/webhooks`);
    const existing = Array.isArray(list) ? list.find(w => w.url === callback) : null;
    if (existing && !config.webhookId) throw new RequestError("يوجد Webhook لهذا الرابط بمفتاح غير معروف. احذفه من OpenWA ثم أعد الربط.", 409);
    const result = existing || await openwaRequest(config, `${path}/webhooks`, "POST", { url: callback, events: ["message.received", "message.failed", "session.status", "session.disconnected", "session.restriction"], secret: await signIntegration("openwa-office-events-v1") });
    config.webhookId = String(result.id || "");
    if (!config.webhookId) throw new RequestError("لم تؤكد البوابة تسجيل Webhook.", 502);
    await saveIntegration("whatsapp", config, actor);
    await operationEvent("whatsapp", "webhook", "تم ربط استقبال أحداث واتساب المكتب");
    return publicWhatsApp(config);
  }
  throw new RequestError("عملية واتساب غير مدعومة.");
}
export async function receiveWhatsApp(request: Request) {
  const config = await integrationConfig<WhatsAppConfig>("whatsapp");
  if (!config?.enabled || !config.webhookId) throw new RequestError("التكامل غير مفعّل.", 503);
  const raw = await boundedEventBody(request, 200_000), signature = request.headers.get("x-openwa-signature") || "";
  const secret = await signIntegration("openwa-office-events-v1");
  if (!equalSignature(signature, `sha256=${await signIntegration(raw, secret)}`)) throw new RequestError("توقيع الحدث غير صحيح.", 401);
  let payload; try { payload = JSON.parse(raw); } catch { throw new RequestError("صيغة الحدث غير صحيحة."); }
  if ((payload.sessionId || payload.session?.id) !== config.sessionId) throw new RequestError("جلسة الحدث غير مطابقة.", 403);
  const event = String(payload.event || payload.type || "");
  const titles: Record<string, string> = { "message.received": "وصلت رسالة إلى واتساب المكتب", "message.failed": "تعذر تسليم رسالة واتساب", "session.status": "تغيرت حالة اتصال واتساب", "session.disconnected": "انقطع اتصال واتساب المكتب", "session.restriction": "تقييد على حساب واتساب المكتب" };
  if (!titles[event]) return { ok: true, ignored: true };
  await operationEvent("whatsapp", event, titles[event], /failed|disconnected|restriction/.test(event) ? "warning" : "info", `wa:${await digest(raw)}`);
  return { ok: true };
}
export async function boundedEventBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new RequestError("الحدث أكبر من المسموح.", 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > limit) throw new RequestError("الحدث أكبر من المسموح.", 413);
  return body;
}
async function resendRequest(config: MailConfig, path: string, method = "GET", data?: unknown) {
  try {
    const response = await fetch(`https://api.resend.com/${path}`, { method, redirect: "error", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new RequestError(`رفض مزود البريد الطلب (HTTP ${response.status}).`, 502);
    const text = await response.text();
    if (text.length > 1_000_000) throw new RequestError("رسالة البريد أكبر من الحد المسموح للعرض.", 413);
    return JSON.parse(text);
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError("تعذر الاتصال بمزود البريد.", 502); }
}
function safeMail(config: MailConfig | null) { return { provider: "resend", address: config?.address || "", hasApiKey: !!config?.apiKey, webhookConfigured: !!config?.signingSecret, testedAt: config?.testedAt || null, webhookUrl: `${SERVICE_ORIGIN}/api/integrations/email` }; }
export async function mailAction(data: Record<string, unknown> | null, actor: string) {
  let config = await integrationConfig<MailConfig>("email");
  if (!data) return safeMail(config);
  if (data.action === "save") {
    const address = cleanEmail(data.address).toLowerCase(), apiKey = cleanString(data.apiKey, "مفتاح البريد", { max: 500, required: false }) || config?.apiKey || "";
    if (!apiKey) throw new RequestError("أدخل مفتاح Resend لاستقبال البريد.");
    const signingSecret = cleanString(data.signingSecret, "توقيع Webhook", { max: 500, required: false }) || config?.signingSecret || "";
    config = { address, apiKey, signingSecret, webhookId: config?.webhookId };
    await saveIntegration("email", config, actor); await operationEvent("email", "configuration", "تم تحديث إعدادات بريد المكتب"); return safeMail(config);
  }
  if (!config) throw new RequestError("احفظ إعدادات البريد أولاً.", 409);
  if (data.action === "test") { await resendRequest(config, "emails/receiving?limit=1"); config.testedAt = new Date().toISOString(); await saveIntegration("email", config, actor); return safeMail(config); }
  if (data.action === "webhook") {
    if (config.webhookId && config.signingSecret) return safeMail(config);
    const result = await resendRequest(config, "webhooks", "POST", { endpoint: `${SERVICE_ORIGIN}/api/integrations/email`, events: ["email.received"] });
    if (!result.id || !result.signing_secret) throw new RequestError("لم يرجع مزود البريد مفتاح توقيع Webhook.", 502);
    config.webhookId = result.id; config.signingSecret = result.signing_secret; await saveIntegration("email", config, actor); return safeMail(config);
  }
  throw new RequestError("عملية بريد غير مدعومة.");
}
export async function verifyMailSignature(raw: string, request: Request, secret: string) {
  const id = request.headers.get("svix-id") || "", timestamp = request.headers.get("svix-timestamp") || "";
  if (!id || !/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !secret.startsWith("whsec_")) return false;
  try {
    const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${raw}`)))));
    return (request.headers.get("svix-signature") || "").split(" ").some(item => item.startsWith("v1,") && equalSignature(item.slice(3), signature));
  } catch { return false; }
}
export async function receiveMail(request: Request) {
  const config = await integrationConfig<MailConfig>("email");
  if (!config?.signingSecret) throw new RequestError("استقبال البريد غير مهيأ.", 503);
  const raw = await boundedEventBody(request, 100_000);
  if (!await verifyMailSignature(raw, request, config.signingSecret)) throw new RequestError("توقيع البريد غير صحيح.", 401);
  let event; try { event = JSON.parse(raw); } catch { throw new RequestError("صيغة الحدث غير صحيحة."); }
  if (event.type !== "email.received") return { ok: true, ignored: true };
  const id = String(event.data?.email_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new RequestError("معرف البريد غير صحيح.");
  const existing = await getD1().prepare("SELECT id FROM management_emails WHERE id = ?").bind(id).first();
  if (existing) return { ok: true, duplicate: true };
  const mail = await resendRequest(config, `emails/receiving/${encodeURIComponent(id)}`);
  const recipients = [...(Array.isArray(mail.to) ? mail.to : []), ...(Array.isArray(mail.received_for) ? mail.received_for : [])].map(s => String(s).toLowerCase());
  if (!recipients.includes(config.address)) return { ok: true, ignored: true };
  const plain = typeof mail.text === "string" ? mail.text : String(mail.html || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ");
  await getD1().prepare("INSERT INTO management_emails (id, sender, recipients, subject, body_text) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(id, String(mail.from || "").slice(0, 300), recipients.join(", ").slice(0, 1000), String(mail.subject || "بدون عنوان").slice(0, 500), plain.slice(0, 100_000)).run();
  await operationEvent("email", "received", "وصل بريد جديد إلى صندوق المكتب", "info", `email:${id}`);
  return { ok: true };
}
