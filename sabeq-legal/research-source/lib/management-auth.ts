import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { RequestError, enforceRateLimit } from "@/lib/request-security";
import { authenticateManagementPassword, managementPasswordSession, normalizeManagementUsername } from "@/lib/management-password";

export const MANAGEMENT_HOME = "https://q8-ux.github.io/saad/sabeq-admin-preview/";
export const MANAGEMENT_ORIGIN = new URL(MANAGEMENT_HOME).origin;
type Manager = { email: string; name: string; username?: string; role: "operator" | "administrator" };
const OPERATOR_SECTIONS = ["overview", "memos", "inbox", "notifications", "users", "legislation", "commands", "updates"];
export function managerProfile(manager: Manager) {
  return { email: manager.email, name: manager.name, ...(manager.username ? { username: manager.username } : {}), role: manager.role,
    sections: manager.role === "operator" ? OPERATOR_SECTIONS : [...OPERATOR_SECTIONS, "programmer", "payments", "mailboxes", "whatsapp", "mail"] };
}
export function assertManagerAction(manager: Manager, action: string, method: "GET" | "POST") {
  if (manager.role !== "operator") return;
  const allowed = method === "GET"
    ? ["session", "snapshot", "memos", "inbox", "users", "updates", "commands", "legislation", "legislation-workbench", "legislation-articles", "legislation-asset", "legislation-report"]
    : ["logout", "users", "read", "inbox", "commands"];
  if (!allowed.includes(action)) throw new RequestError("هذا القسم غير متاح لصلاحيات حساب التشغيل.", 403);
}
type Runtime = { AUTH_SECRET?: string; MANAGEMENT_ALLOWED_EMAILS?: string; MANAGEMENT_OWNER_EMAIL?: string };
export const managementRuntime = () => env as unknown as Runtime;
export function managerAllowed(email: string) {
  const runtime = managementRuntime();
  return `${runtime.MANAGEMENT_ALLOWED_EMAILS || ""},${runtime.MANAGEMENT_OWNER_EMAIL || ""}`.split(/[\s,;]+/).filter(Boolean).map(s => s.toLowerCase()).includes(email.trim().toLowerCase());
}
export function managementJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Access-Control-Allow-Origin": MANAGEMENT_ORIGIN, "Vary": "Origin", "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
export function assertManagementOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== MANAGEMENT_ORIGIN && origin !== new URL(request.url).origin) throw new RequestError("مصدر الطلب غير مسموح.", 403);
}
export async function digest(value: string) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, "0")).join("");
}
export function base64url(data: Uint8Array) { return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function randomToken() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function proofChallenge(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }
export function equalSignature(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
export async function signIntegration(value: string, secret?: string) {
  const source = secret || managementRuntime().AUTH_SECRET || "";
  if (source.length < 32) throw new RequestError("مفتاح حماية الإدارة غير مهيأ.", 503);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(source), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");
}
export async function managerLogin(request: Request) {
  const url = new URL(request.url), challenge = url.searchParams.get("challenge") || "", state = url.searchParams.get("state") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge) || !/^[A-Za-z0-9_-]{32,80}$/.test(state)) throw new RequestError("ابدأ الدخول من رابط لوحة التحكم.");
  const user = await getChatGPTUser(request);
  if (!user) {
    if (url.searchParams.get("auth_return") === "1") {
      const target = new URL(MANAGEMENT_HOME); target.searchParams.set("login_error", "identity_unavailable");
      return new Response(null, { status: 302, headers: { Location: target.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    }
    url.searchParams.set("auth_return", "1");
    return new Response(null, { status: 302, headers: { Location: new URL(chatGPTSignInPath(url.pathname + url.search), url.origin).href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
  if (!managerAllowed(user.email)) {
    const target = new URL(MANAGEMENT_HOME); target.searchParams.set("login_error", "not_authorized");
    return new Response(null, { status: 302, headers: { Location: target.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
  const code = randomToken();
  await getD1().prepare("INSERT INTO management_login_codes (code_hash, email, name, challenge, expires_at) VALUES (?, ?, ?, ?, ?)").bind(await digest(code), user.email.toLowerCase(), user.displayName.slice(0, 160), challenge, Math.floor(Date.now() / 1000) + 60).run();
  const target = new URL(MANAGEMENT_HOME); target.searchParams.set("code", code); target.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: { Location: target.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export async function exchangeManagerCode(data: Record<string, unknown>) {
  const code = typeof data.code === "string" ? data.code : "", verifier = typeof data.verifier === "string" ? data.verifier : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) throw new RequestError("انتهى طلب الدخول. أعد المحاولة.", 401);
  const row = await getD1().prepare("DELETE FROM management_login_codes WHERE code_hash = ? AND challenge = ? AND expires_at > ? RETURNING email, name")
    .bind(await digest(code), await proofChallenge(verifier), Math.floor(Date.now() / 1000)).first<{ email: string; name: string }>();
  if (!row || !managerAllowed(row.email)) throw new RequestError("طلب الدخول غير صالح أو استُخدم سابقاً.", 401);
  const token = randomToken(), expiresAt = Math.floor(Date.now() / 1000) + 12 * 3600;
  await getD1().prepare("INSERT INTO management_sessions (token_hash, email, name, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").bind(await digest(token), row.email, row.name, expiresAt, Math.floor(Date.now() / 1000)).run();
  return { token, expiresAt, manager: row };
}
export async function passwordManagerLogin(request: Request, data: Record<string, unknown>) {
  const rateHeaders = new Headers(request.headers);
  rateHeaders.set("user-agent", "sabeq-control-password");
  const rateRequest = new Request(request.url, { headers: rateHeaders });
  await enforceRateLimit(rateRequest, "management-password-login", 30);
  await enforceRateLimit(rateRequest, `management-password-account:${await digest(normalizeManagementUsername(data.username).slice(0, 64))}`, 8);
  const account = await authenticateManagementPassword(data);
  const now = Math.floor(Date.now() / 1000), token = randomToken(), expiresAt = now + 8 * 3600;
  await getD1().prepare("INSERT INTO management_sessions (token_hash, email, name, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await digest(token), account.sessionPrincipal, account.username, expiresAt, now).run();
  return { token, expiresAt, manager: managerProfile({ email: `staff:${account.username}`, name: account.username, username: account.username, role: "operator" }) };
}
export async function requireManager(request: Request) {
  assertManagementOrigin(request);
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) throw new RequestError("سجّل الدخول إلى الإدارة للمتابعة.", 401);
  const hash = await digest(token), now = Math.floor(Date.now() / 1000);
  const row = await getD1().prepare("SELECT email, name FROM management_sessions WHERE token_hash = ? AND expires_at > ? AND last_seen_at > ?").bind(hash, now, now - 3600).first<{ email: string; name: string }>();
  const staff = row?.email.startsWith("staff:") ? await managementPasswordSession(row.email) : null;
  if (!row || (row.email.startsWith("staff:") ? !staff : !managerAllowed(row.email))) throw new RequestError("انتهت الجلسة الإدارية. سجّل الدخول مجدداً.", 401);
  await getD1().prepare("UPDATE management_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now, hash).run();
  return { email: staff?.identity || row.email, name: staff?.username || row.name, ...(staff ? { username: staff.username } : {}), role: staff ? "operator" as const : "administrator" as const, hash };
}
async function vaultKey() {
  const secret = managementRuntime().AUTH_SECRET || "";
  if (secret.length < 32) throw new RequestError("مفتاح حماية التكامل غير مهيأ.", 503);
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sabeq-management-vault:${secret}`)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealConfig(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vaultKey(), new TextEncoder().encode(JSON.stringify(value)));
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}
export async function openConfig<T>(value: string): Promise<T> {
  try {
    const [iv, ciphertext] = value.split(".").map(part => Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await vaultKey(), ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw new RequestError("تعذرت قراءة إعدادات التكامل المحمية. أعد حفظ المفتاح.", 503); }
}
