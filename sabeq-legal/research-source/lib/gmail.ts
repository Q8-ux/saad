import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { digest, MANAGEMENT_HOME, openConfig, proofChallenge, randomToken, requireManager, sealConfig } from "@/lib/management-auth";
import { operationEvent, SERVICE_ORIGIN } from "@/lib/management-integrations";
import { cleanEmail, RequestError } from "@/lib/request-security";

export const GMAIL_REDIRECT_URI = `${SERVICE_ORIGIN}/api/integrations/gmail/callback`;
export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/";
type Config = { clientId: string; clientSecret: string; revision: string; refreshToken?: string; accountEmail?: string; connectedAt?: string };
type OAuthState = { expiresAt: number; verifier: string; managerToken: string; revision: string };
type Delivery = { status: "pending" | "sending" | "accepted" | "failed" | "uncertain"; recipients: string[]; messageId?: string; updatedAt: string };
type Entry<T> = { sealed: string; value: T };
class GmailError extends RequestError {
  constructor(message: string, public uncertain = false) { super(message, 502); }
}
function mailboxes() {
  const runtime = env as unknown as { GMAIL_SENDER_EMAIL?: string; MEMO_REVIEW_RECIPIENTS?: string };
  const sender = runtime.GMAIL_SENDER_EMAIL ? cleanEmail(runtime.GMAIL_SENDER_EMAIL).toLowerCase() : "";
  const recipients = [...new Set((runtime.MEMO_REVIEW_RECIPIENTS || "").split(/[,;\s]+/).filter(Boolean).map(value => cleanEmail(value).toLowerCase()))];
  if (recipients.length > 5) throw new RequestError("عدد مراجعي المسودات أكبر من الحد المسموح.", 409);
  return { sender, recipients };
}
async function readEntry<T>(name: string): Promise<Entry<T> | null> {
  const row = await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(name).first<{ sealed: string }>();
  return row ? { sealed: row.sealed, value: await openConfig<T>(row.sealed) } : null;
}
async function writeEntry(name: string, value: unknown, actor: string, previous: string | null) {
  const sealed = await sealConfig(value), db = getD1();
  // Conditional writes also support older vault schemas without a unique index.
  const result = await (previous === null
    ? db.prepare("INSERT INTO management_vault (integration,sealed,updated_by,updated_at) SELECT ?,?,?,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM management_vault WHERE integration = ?)").bind(name, sealed, actor, name)
    : db.prepare("UPDATE management_vault SET sealed = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE integration = ? AND sealed = ?").bind(sealed, actor, name, previous)).run();
  if (result.meta.changes !== 1) throw new RequestError("تغيرت إعدادات Gmail أثناء العملية. حدّث الصفحة.", 409);
  return sealed;
}
async function googleJson(url: string, options: RequestInit = {}, sending = false) {
  let response: Response;
  try { response = await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(12_000) }); }
  catch { throw new GmailError("تعذر تأكيد استجابة Gmail. راجع حالة الإرسال قبل إعادة المحاولة.", sending); }
  if (!response.ok) throw new GmailError(response.status === 401 || response.status === 403
    ? "رفض Google التفويض أو الصلاحيات. أعد ربط الحساب من الإدارة."
    : `رفض Google العملية (HTTP ${response.status}).`, sending && response.status >= 500);
  let text: string;
  try { text = await response.text(); }
  catch { throw new GmailError("تعذر تأكيد قراءة استجابة Gmail.", sending); }
  if (text.length > 1_000_000) throw new GmailError("استجابة Gmail أكبر من الحد المسموح.", sending);
  try { return JSON.parse(text) as Record<string, any>; }
  catch { throw new GmailError("لم يرجع Google نتيجة صالحة.", sending); }
}
async function accessToken() {
  const entry = await readEntry<Config>("gmail"), { sender } = mailboxes();
  if (!sender || !entry?.value.refreshToken || entry.value.accountEmail !== sender) throw new RequestError("اربط حساب Gmail المرسل أولاً.", 409);
  const config = entry.value;
  const result = await googleJson(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken!, grant_type: "refresh_token" }) });
  if (typeof result.access_token !== "string" || !result.access_token) throw new GmailError("لم يؤكد Google تجديد التفويض.");
  if (typeof result.refresh_token === "string" && result.refresh_token !== config.refreshToken) {
    await writeEntry("gmail", { ...config, refreshToken: result.refresh_token }, "google-refresh", entry.sealed);
  }
  return result.access_token as string;
}
export async function gmailSettings() {
  const config = (await readEntry<Config>("gmail"))?.value, boxes = mailboxes();
  const recent = await getD1().prepare("SELECT integration,sealed FROM management_vault WHERE integration LIKE 'gmail-draft:%' ORDER BY updated_at DESC LIMIT 20").all<{ integration: string; sealed: string }>();
  const deliveries = await Promise.all(recent.results.map(async (row: { integration: string; sealed: string }) => {
    const item = await openConfig<Delivery>(row.sealed);
    return { recordId: row.integration.slice(12), status: item.status, updatedAt: item.updatedAt };
  }));
  return { provider: "gmail", ...boxes, redirectUri: GMAIL_REDIRECT_URI, scopes: GMAIL_SCOPES, clientId: config?.clientId || "", hasClientSecret: !!config?.clientSecret,
    connected: !!config?.refreshToken && config?.accountEmail === boxes.sender, connectedAt: config?.connectedAt || null,
    accountEmail: config?.accountEmail || "", automaticDrafts: !!boxes.sender && boxes.recipients.length > 0, deliveries };
}
export async function gmailAction(data: Record<string, unknown>, actor: string, request: Request) {
  const entry = await readEntry<Config>("gmail");
  if (data.action === "save") {
    const clientId = String(data.clientId || "").trim(), suppliedSecret = String(data.clientSecret || "").trim();
    if (!/^[A-Za-z0-9_-]{8,220}\.apps\.googleusercontent\.com$/.test(clientId)) throw new RequestError("أدخل OAuth Client ID الصحيح لتطبيق الويب.");
    const clientSecret = suppliedSecret || (entry?.value.clientId === clientId ? entry.value.clientSecret : "");
    if (!clientSecret || clientSecret.length > 500 || /[\r\n\0]/.test(clientSecret)) throw new RequestError("أدخل Client Secret مباشرة في هذه الصفحة المحمية.");
    const retain = entry?.value.clientId === clientId && entry.value.clientSecret === clientSecret;
    await writeEntry("gmail", { ...(retain ? entry?.value : {}), clientId, clientSecret, revision: crypto.randomUUID() }, actor, entry?.sealed || null);
    return gmailSettings();
  }
  if (data.action === "connect") {
    const { sender } = mailboxes();
    if (!sender || !entry?.value.clientSecret) throw new RequestError("احفظ إعداد حساب المرسل وبيانات OAuth أولاً.", 409);
    const managerToken = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(managerToken)) throw new RequestError("سجّل الدخول إلى الإدارة أولاً.", 401);
    const state = randomToken(), verifier = randomToken();
    await getD1().prepare("DELETE FROM management_vault WHERE integration LIKE 'gmail-oauth:%' AND updated_at < datetime('now','-15 minutes')").run();
    await writeEntry(`gmail-oauth:${await digest(state)}`, { expiresAt: Date.now() + 10 * 60_000, verifier, managerToken, revision: entry.value.revision }, actor, null);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: entry.value.clientId, redirect_uri: GMAIL_REDIRECT_URI, response_type: "code", scope: GMAIL_SCOPES.join(" "), access_type: "offline", prompt: "consent", login_hint: sender, state, code_challenge: await proofChallenge(verifier), code_challenge_method: "S256" }).toString();
    return { authorizationUrl: url.href };
  }
  if (data.action === "inbox") return gmailInbox();
  if (data.action === "read") return gmailRead(String(data.id || ""));
  if (data.action === "send-pending") {
    const { sender } = mailboxes();
    if (!entry?.value.refreshToken || entry.value.accountEmail !== sender) throw new RequestError("أكمل تفويض Gmail أولاً.", 409);
    const rows = await getD1().prepare("SELECT integration,sealed FROM management_vault WHERE integration LIKE 'gmail-draft:%' ORDER BY updated_at DESC LIMIT 100").all<{ integration: string; sealed: string }>();
    let attempted = 0;
    for (const row of rows.results) {
      if (attempted >= 3) break;
      if ((await openConfig<Delivery>(row.sealed)).status !== "pending") continue;
      await sendSavedDraft(row.integration.slice(12), true); attempted++;
    }
    return { ...await gmailSettings(), attempted };
  }
  if (data.action === "send-test") {
    const { sender, recipients } = mailboxes();
    if (!recipients.length) throw new RequestError("لم تُحدد عناوين مراجعي المسودات.", 409);
    const token = await accessToken();
    const result = await googleJson(GMAIL_API + "messages/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: mimeMessage(sender, recipients, "اختبار إرسال مسودات سابق", "هذه رسالة اختبار لربط مسودات سابق القانونية. لا تحتوي بيانات قضية أو مذكرة حقيقية.", `<sabeq-test-${crypto.randomUUID()}@sabeq.legal>`) }) }, true);
    if (typeof result.id !== "string") throw new GmailError("لم يؤكد Gmail قبول الرسالة.", true);
    return { accepted: true, messageId: result.id, recipients };
  }
  throw new RequestError("عملية Gmail غير مدعومة.");
}
export async function gmailCallback(request: Request) {
  const url = new URL(request.url), state = url.searchParams.get("state") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) throw new RequestError("ابدأ ربط Gmail من لوحة الإدارة.");
  const row = await getD1().prepare("DELETE FROM management_vault WHERE integration = ? RETURNING sealed").bind(`gmail-oauth:${await digest(state)}`).first<{ sealed: string }>();
  if (!row) throw new RequestError("طلب ربط Gmail منتهٍ أو استُخدم سابقاً.", 400);
  const pending = await openConfig<OAuthState>(row.sealed);
  if (pending.expiresAt <= Date.now()) throw new RequestError("انتهت مهلة ربط Gmail. أعد المحاولة.", 400);
  const manager = await requireManager(new Request(GMAIL_REDIRECT_URI, { headers: { Authorization: `Bearer ${pending.managerToken}` } }));
  if (url.searchParams.has("error")) throw new RequestError("لم تُمنح صلاحيات Gmail. أعد الربط عند الرغبة.", 400);
  const code = url.searchParams.get("code") || "";
  if (!code || code.length > 4096) throw new RequestError("لم يصل رمز تفويض Google.");
  const entry = await readEntry<Config>("gmail"), { sender } = mailboxes();
  if (!entry || entry.value.revision !== pending.revision || !sender) throw new RequestError("تغير إعداد Gmail. ابدأ الربط مجدداً.", 409);
  const result = await googleJson(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: entry.value.clientId, client_secret: entry.value.clientSecret, redirect_uri: GMAIL_REDIRECT_URI, code_verifier: pending.verifier, code, grant_type: "authorization_code" }) });
  const granted = String(result.scope || "").split(/\s+/);
  if (!result.access_token || !result.refresh_token || !GMAIL_SCOPES.every(scope => granted.includes(scope))) throw new RequestError("يلزم منح صلاحية الإرسال وقراءة الوارد مع تفويض مستمر.", 409);
  const profile = await googleJson(GMAIL_API + "profile", { headers: { Authorization: `Bearer ${result.access_token}` } });
  if (String(profile.emailAddress || "").toLowerCase() !== sender) {
    try { await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: String(result.refresh_token) }), signal: AbortSignal.timeout(8000) }); } catch { /* Never persist a mismatched account. */ }
    throw new RequestError("اختر حساب Gmail المرسل المحدد في لوحة الإدارة.", 409);
  }
  await writeEntry("gmail", { ...entry.value, refreshToken: result.refresh_token, accountEmail: sender, connectedAt: new Date().toISOString() }, manager.email, entry.sealed);
  await operationEvent("email", "gmail-connected", "تم تفويض حساب Gmail المرسل");
  return new Response(null, { status: 303, headers: { Location: `${MANAGEMENT_HOME}?gmail=connected#mail`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
async function gmailInbox() {
  const token = await accessToken(), headers = { Authorization: `Bearer ${token}` };
  const list = await googleJson(GMAIL_API + "messages?labelIds=INBOX&maxResults=10", { headers });
  const items = (Array.isArray(list.messages) ? list.messages : []).slice(0, 10).filter((item: { id: unknown }) => /^[a-f0-9]{1,32}$/i.test(String(item.id)));
  const messages = await Promise.all(items.map(async (item: { id: string }) => {
    const message = await googleJson(GMAIL_API + `messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers });
    const head = (name: string) => String(message.payload?.headers?.find((h: { name: string }) => h.name.toLowerCase() === name)?.value || "").slice(0, 500);
    return { id: message.id, subject: head("subject"), from: head("from"), date: head("date"), snippet: String(message.snippet || "").slice(0, 500) };
  }));
  return { messages };
}
async function gmailRead(id: string) {
  if (!/^[a-f0-9]{1,32}$/i.test(id)) throw new RequestError("معرف رسالة Gmail غير صحيح.");
  const token = await accessToken(), message = await googleJson(GMAIL_API + `messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
  function textPart(part: any): string {
    if (part.mimeType === "text/plain" && typeof part.body?.data === "string") {
      try { return new TextDecoder().decode(Uint8Array.from(atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))).slice(0, 100_000); } catch { return ""; }
    }
    return (Array.isArray(part.parts) ? part.parts : []).map(textPart).filter(Boolean).join("\n").slice(0, 100_000);
  }
  return { body: textPart(message.payload || {}) || String(message.snippet || "لا يوجد نص بسيط للعرض.").slice(0, 1000) };
}
function mimeMessage(sender: string, recipients: string[], subject: string, body: string, messageId: string) {
  const b64 = (value: string) => btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(""));
  const raw = [`From: ${sender}`, `To: ${recipients.join(", ")}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, `Message-ID: ${messageId}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(body).match(/.{1,76}/g)?.join("\r\n") || ""].join("\r\n");
  return b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function sendSavedDraft(id: string, allowPending = false) {
  const row = await getD1().prepare("SELECT id, output_text, status FROM management_memo_requests WHERE id = ?").bind(id).first<{ id: string; output_text: string; status: string }>();
  if (!row?.output_text?.trim() || !["generated", "needs_review"].includes(row.status)) return;
  const { sender, recipients } = mailboxes();
  if (!sender || !recipients.length) return;
  const name = `gmail-draft:${id}`, entry = await readEntry<Delivery>(name);
  if (entry && !(allowPending && entry.value.status === "pending")) return; // Never retry an attempted send blindly.
  const config = (await readEntry<Config>("gmail"))?.value;
  const delivery: Delivery = { status: config?.refreshToken && config.accountEmail === sender ? "sending" : "pending", recipients, updatedAt: new Date().toISOString() };
  let sealed: string;
  try { sealed = await writeEntry(name, delivery, "memo-generator", entry?.sealed || null); }
  catch (error) { if (error instanceof RequestError && error.status === 409) return; throw error; }
  if (delivery.status === "pending") {
    await operationEvent("email", "gmail-draft-pending", "حُفظت مسودة بانتظار تفويض Gmail", "warning", `gmail-pending:${id}`);
    return;
  }
  try {
    const token = await accessToken(), reviewUrl = `${MANAGEMENT_HOME}#memos?record=${encodeURIComponent(id)}`;
    const body = `مسودة مذكرة للمراجعة — مجموعة سابق القانونية\nرقم الطلب: ${id}\n\n${row.output_text}\n\nفتح الطلب في لوحة الإدارة (يتطلب تسجيل الدخول):\n${reviewUrl}`;
    const result = await googleJson(GMAIL_API + "messages/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: mimeMessage(sender, recipients, "مسودة مذكرة سابق للمراجعة", body, `<sabeq-draft-${await digest(id)}@sabeq.legal>`) }) }, true);
    if (typeof result.id !== "string" || !/^[a-f0-9]{1,32}$/i.test(result.id)) throw new GmailError("لم يؤكد Gmail قبول المسودة.", true);
    await writeEntry(name, { ...delivery, status: "accepted", messageId: result.id, updatedAt: new Date().toISOString() }, "gmail", sealed);
    await operationEvent("email", "gmail-draft-accepted", "قبل Gmail مسودة المذكرة للمراجعة", "info", `gmail-accepted:${id}`);
  } catch (error) {
    const status = error instanceof GmailError && error.uncertain ? "uncertain" : "failed";
    await writeEntry(name, { ...delivery, status, updatedAt: new Date().toISOString() }, "gmail", sealed);
    await operationEvent("email", `gmail-draft-${status}`, status === "uncertain" ? "لم تُحسم نتيجة إرسال مسودة Gmail؛ تحتاج مراجعة" : "تعذر إرسال المسودة عبر Gmail؛ النص محفوظ", "warning", `gmail-error:${id}`);
  }
}
