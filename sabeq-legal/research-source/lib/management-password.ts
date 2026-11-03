import { env } from "cloudflare:workers";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { RequestError } from "@/lib/request-security";
import { getD1 } from "@/db";
import { openConfig, sealConfig } from "@/lib/management-vault";

type PasswordAccount = { username: string; salt: string; hash: string; enabled: boolean; sessionVersion?: string };
type AccountOverride = Pick<PasswordAccount, "username" | "salt" | "hash"> & { id: string; sessionVersion: string };
type AccountStore = { version: 1; revision: string; accounts: AccountOverride[] };
type EffectiveAccount = PasswordAccount & { id: string; seedUsername: string; role: "operator" | "administrator" | "reviewer"; pepper: string };
type PasswordRuntime = { MANAGEMENT_PASSWORD_USERS?: string; MANAGEMENT_PASSWORD_PEPPER?: string; MANAGEMENT_ADMIN_PASSWORD_USERS?: string; MANAGEMENT_ADMIN_PASSWORD_PEPPER?: string };
const USERNAME = /^[a-z][a-z0-9_]{2,31}$/;
const ITERATIONS = 600_000;
const INVALID = "اسم المستخدم أو كلمة المرور غير صحيحين.";
const encoder = new TextEncoder();
const VAULT_KEY = "control-accounts";
// A standalone reviewer's password never enters the repository.
function reviewerPepper() {
  const secret = (env as unknown as { AUTH_SECRET?: string }).AUTH_SECRET || "";
  if (secret.length < 32) throw new RequestError("مفتاح حماية حساب المراجع غير مهيأ.", 503);
  return "sabeq-memo-reviewer-v1:" + secret;
}
function reviewerPasswordValid(value: string) {
  return value.length >= 9 && value.length <= 256 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export function normalizeManagementUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function configuration(role: "operator" | "administrator" = "operator") {
  const runtime = env as unknown as PasswordRuntime;
  const raw = (role === "administrator" ? runtime.MANAGEMENT_ADMIN_PASSWORD_USERS : runtime.MANAGEMENT_PASSWORD_USERS) || "";
  const pepper = (role === "administrator" ? runtime.MANAGEMENT_ADMIN_PASSWORD_PEPPER : runtime.MANAGEMENT_PASSWORD_PEPPER) || "";
  if (!raw && !pepper) return null;
  try {
    if (raw.length > 50_000 || pepper.length < 32) throw Error();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.accounts) || !parsed.accounts.length || parsed.accounts.length > 25) throw Error();
    const seen = new Set<string>();
    const accounts: PasswordAccount[] = parsed.accounts.map((row: PasswordAccount) => {
      if (!row || typeof row.username !== "string" || !USERNAME.test(row.username) || seen.has(row.username) || typeof row.salt !== "string" || !/^[a-f0-9]{32}$/.test(row.salt) || typeof row.hash !== "string" || !/^[a-f0-9]{64}$/.test(row.hash) || typeof row.enabled !== "boolean") throw Error();
      seen.add(row.username);
      return { username: row.username, salt: row.salt, hash: row.hash, enabled: row.enabled };
    });
    return { accounts, pepper, role };
  } catch { throw new RequestError("دخول حسابات التشغيل غير مهيأ حالياً. تواصل مع الإدارة.", 503); }
}

const fromHex = (value: string) => Uint8Array.from(value.match(/../g) || [], part => Number.parseInt(part, 16));
const toHex = (value: Uint8Array) => Array.from(value, byte => byte.toString(16).padStart(2, "0")).join("");
function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function peppered(value: string, pepper: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
async function credentialTag(account: PasswordAccount, pepper: string) {
  return toHex(await peppered(`management-session-v1:${account.username}:${account.salt}:${account.hash}${account.sessionVersion ? `:${account.sessionVersion}` : ""}`, pepper)).slice(0, 32);
}

async function accountRoster() {
  const accounts: EffectiveAccount[] = [];
  for (const role of ["administrator", "operator"] as const) {
    const config = configuration(role);
    for (const account of config?.accounts || []) accounts.push({ ...account, id: `${role}:${account.username}`, seedUsername: account.username, role, pepper: config!.pepper });
  }
  const row = await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(VAULT_KEY).first<{ sealed: string }>();
  const saved = row ? await openConfig<AccountStore>(row.sealed) : { version: 1, revision: "environment", accounts: [] } as AccountStore;
  const invalid = () => { throw new RequestError("تعذرت قراءة حسابات دخول اللوحة المحفوظة. تواصل مع مسؤول النظام.", 503); };
  if (!saved || saved.version !== 1 || typeof saved.revision !== "string" || (row && !/^[a-f0-9]{32}$/.test(saved.revision)) || !Array.isArray(saved.accounts) || saved.accounts.length > 50) invalid();
  const ids = new Set<string>();
  for (const override of saved.accounts) {
    if (!override || typeof override.id !== "string" || !/^(administrator|operator|reviewer):[a-z][a-z0-9_]{2,31}$/.test(override.id) || ids.has(override.id) || typeof override.username !== "string" || !USERNAME.test(override.username) || typeof override.salt !== "string" || !/^[a-f0-9]{32}$/.test(override.salt) || typeof override.hash !== "string" || !/^[a-f0-9]{64}$/.test(override.hash) || typeof override.sessionVersion !== "string" || !/^[a-f0-9]{32}$/.test(override.sessionVersion)) invalid();
    ids.add(override.id);
    const account = accounts.find(a => a.id === override.id);
    if (account) Object.assign(account, { username: override.username, salt: override.salt, hash: override.hash, sessionVersion: override.sessionVersion });
    else if (override.id.startsWith("reviewer:") || override.id.startsWith("operator:")) {
      const role = override.id.startsWith("reviewer:") ? "reviewer" : "operator";
      const pepper = role === "reviewer" ? reviewerPepper() : configuration("operator")?.pepper;
      if (!pepper) invalid();
      accounts.push({ username: override.username, seedUsername: override.id.slice(role.length + 1), role,
        id: override.id, salt: override.salt, hash: override.hash, sessionVersion: override.sessionVersion,
        enabled: true, pepper });
    } else invalid();
  }
  if (new Set(accounts.map(a => a.username)).size !== accounts.length) invalid();
  return { accounts, saved, sealed: row?.sealed || "" };
}
const accountIdentity = (account: EffectiveAccount) => `${account.role === "administrator" ? "staff-admin" : account.role === "reviewer" ? "staff-reviewer" : "staff"}:${account.seedUsername}`;
type AccountManager = { role: string; email: string; username?: string };
function safeAccounts(roster: Awaited<ReturnType<typeof accountRoster>>, manager: AccountManager) {
  return { revision: roster.saved.revision, accounts: roster.accounts.map(account => ({ id: account.id, username: account.username, role: account.role, enabled: account.enabled, self: account.role === "administrator" && manager.username === account.username })) };
}
export async function managementAccounts(data: Record<string, unknown> | null, manager: AccountManager) {
  if (manager.role !== "administrator") throw new RequestError("تعديل حسابات دخول اللوحة متاح للمشرف فقط.", 403);
  const roster = await accountRoster();
  if (!data) return safeAccounts(roster, manager);
  if (Object.keys(data).some(key => !["action", "id", "username", "newPassword", "confirmPassword", "revision"].includes(key))) throw new RequestError("يمكن تعديل اسم المستخدم وكلمة المرور فقط.");
  if (typeof data.revision !== "string" || data.revision !== roster.saved.revision) throw new RequestError("تغيرت حسابات اللوحة أثناء التعديل. حدّث القائمة ثم أعد المحاولة.", 409);
  if (data.action === "create-reviewer" || data.action === "create-operator") {
    if (data.id !== undefined) throw new RequestError("طلب إنشاء الحساب غير صحيح.");
    const username = normalizeManagementUsername(data.username);
    const password = data.newPassword, confirmation = data.confirmPassword;
    const role = data.action === "create-operator" ? "operator" : "reviewer";
    const saltPepper = role === "operator" ? configuration("operator")?.pepper : reviewerPepper();
    if (!saltPepper) throw new RequestError("إعداد حماية حسابات المتابعة غير مكتمل.", 503);
    if (!USERNAME.test(username)) throw new RequestError("اسم المستخدم غير صحيح.");
    if (roster.accounts.some(a => a.username === username)) throw new RequestError("اسم المستخدم مستخدم بالفعل.", 409);
    const passwordValid = role === "reviewer" ? reviewerPasswordValid(password) : typeof password === "string" && password.length >= 16 && password.length <= 256 && /\S/.test(password);
    if (!passwordValid) throw new RequestError("كلمة المرور غير كافية الأمان لهذا الحساب.");
    if (password !== confirmation) throw new RequestError("تأكيد كلمة المرور غير مطابق.");
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = toHex(await pbkdf2Async(sha256, await peppered(password, saltPepper), fromHex(salt), { c: ITERATIONS, dkLen: 32, asyncTick: 10 }));
    const created: AccountOverride = { id: role + ":" + username, username, salt, hash, sessionVersion: toHex(crypto.getRandomValues(new Uint8Array(16))) };
    const next: AccountStore = { version: 1, revision: toHex(crypto.getRandomValues(new Uint8Array(16))), accounts: [...roster.saved.accounts, created] };
    const sealed = await sealConfig(next);
    const result = await getD1().prepare("INSERT INTO management_vault (integration, sealed, updated_by) VALUES (?, ?, ?) ON CONFLICT(integration) DO UPDATE SET sealed = excluded.sealed, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP WHERE management_vault.sealed = ?")
      .bind(VAULT_KEY, sealed, manager.email, roster.sealed).run();
    if (result.meta.changes !== 1) throw new RequestError("حفظ مشرف آخر تعديلاً متزامناً. حدّث القائمة ثم أعد المحاولة.", 409);
    return { ok: true, created: true, username, role };
  }
  if (data.action !== undefined) throw new RequestError("العملية غير مدعومة.");
  const account = roster.accounts.find(a => a.id === data.id);
  if (!account) throw new RequestError("حساب دخول اللوحة غير موجود.", 404);
  const username = normalizeManagementUsername(data.username);
  if (!USERNAME.test(username)) throw new RequestError("اسم المستخدم من 3 إلى 32 محرفاً، يبدأ بحرف إنجليزي ويحتوي حروفاً وأرقاماً وشرطة سفلية فقط.");
  if (roster.accounts.some(a => a.id !== account.id && a.username === username)) throw new RequestError("اسم المستخدم مستخدم لحساب آخر. اختر اسماً مختلفاً.", 409);
  const password = data.newPassword ?? "", confirmation = data.confirmPassword ?? "";
  if (typeof password !== "string" || typeof confirmation !== "string" ||
      (password && (account.role === "reviewer" ? !reviewerPasswordValid(password) : password.length < 16 || password.length > 256 || !/\S/.test(password))))
    throw new RequestError(account.role === "reviewer" ? "كلمة مرور المراجع تحتاج 9 محارف على الأقل وحروفاً كبيرة وصغيرة وأرقاماً ورمزاً." : "كلمة المرور الجديدة من 16 إلى 256 محرفاً.");
  if (password !== confirmation) throw new RequestError("تأكيد كلمة المرور غير مطابق.");
  if (username === account.username && !password) return { ok: true, reauthenticate: false, ...safeAccounts(roster, manager) };
  const override: AccountOverride = { id: account.id, username, salt: account.salt, hash: account.hash, sessionVersion: toHex(crypto.getRandomValues(new Uint8Array(16))) };
  if (password) {
    override.salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    override.hash = toHex(await pbkdf2Async(sha256, await peppered(password, account.pepper), fromHex(override.salt), { c: ITERATIONS, dkLen: 32, asyncTick: 10 }));
  }
  const next: AccountStore = { version: 1, revision: toHex(crypto.getRandomValues(new Uint8Array(16))), accounts: [...roster.saved.accounts.filter(a => a.id !== account.id), override] };
  const sealed = await sealConfig(next);
  const result = await getD1().prepare("INSERT INTO management_vault (integration, sealed, updated_by) VALUES (?, ?, ?) ON CONFLICT(integration) DO UPDATE SET sealed = excluded.sealed, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP WHERE management_vault.sealed = ?")
    .bind(VAULT_KEY, sealed, manager.email, roster.sealed).run();
  if (result.meta.changes !== 1) throw new RequestError("حفظ مشرف آخر تعديلاً متزامناً. حدّث القائمة ثم أعد المحاولة.", 409);
  const self = account.role === "administrator" && manager.username === account.username;
  return { ok: true, reauthenticate: self };
}

export async function authenticateManagementPassword(data: Record<string, unknown>) {
  const username = normalizeManagementUsername(data.username), password = data.password;
  if (!USERNAME.test(username) || typeof password !== "string" || password.length < 9 || password.length > 256) throw new RequestError(INVALID, 401);
  const { accounts } = await accountRoster();
  const account = accounts.find(row => row.username === username && row.enabled), fallback = account || accounts[0];
  if (!fallback) throw new RequestError("دخول حسابات التشغيل غير مهيأ حالياً. تواصل مع الإدارة.", 503);
  const salt = fromHex(account?.salt || "00".repeat(16));
  // Workers caps native PBKDF2 below this cost; the server-only implementation preserves 600000.
  const actual = await pbkdf2Async(sha256, await peppered(password, fallback.pepper), salt, { c: ITERATIONS, dkLen: 32, asyncTick: 10 });
  const valid = sameBytes(actual, fromHex(account?.hash || "00".repeat(32)));
  if (!account || !valid || (account.role === "operator" && password.length < 16) || (account.role === "administrator" && password.length < 10)) throw new RequestError(INVALID, 401);
  return { username, role: account.role, identity: accountIdentity(account), sessionPrincipal: `${account.role === "administrator" ? "staff-admin" : account.role === "reviewer" ? "staff-reviewer" : "staff"}:${username}:${await credentialTag(account, account.pepper)}` };
}

export async function managementPasswordSession(principal: string) {
  const match = principal.match(/^(staff|staff-admin|staff-reviewer):([a-z][a-z0-9_]{2,31}):([a-f0-9]{32})$/);
  if (!match) return null;
  const { accounts } = await accountRoster();
  const account = accounts.find(row => row.username === match[2] && row.enabled && row.role === (match[1] === "staff-admin" ? "administrator" : match[1] === "staff-reviewer" ? "reviewer" : "operator"));
  if (!account || !sameBytes(fromHex(match[3]), fromHex(await credentialTag(account, account.pepper)))) return null;
  return { username: account.username, role: account.role, identity: accountIdentity(account) };
}
