import { env } from "cloudflare:workers";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { RequestError } from "@/lib/request-security";
import { getD1 } from "@/db";
import { openConfig, sealConfig } from "@/lib/management-vault";

type PasswordAccount = { username: string; salt: string; hash: string; enabled: boolean; sessionVersion?: string };
type AccountOverride = Pick<PasswordAccount, "username" | "salt" | "hash"> & { id: string; sessionVersion: string };
type AccountStore = { version: 1; revision: string; accounts: AccountOverride[]; appliedRecoveryNonce?: string };
type ManagementPasswordRole = "operator" | "administrator" | "memo_supervisor";
type EffectiveAccount = PasswordAccount & { id: string; seedUsername: string; role: ManagementPasswordRole; pepper: string };
type PasswordRuntime = { MANAGEMENT_PASSWORD_USERS?: string; MANAGEMENT_PASSWORD_PEPPER?: string; MANAGEMENT_ADMIN_PASSWORD_USERS?: string; MANAGEMENT_ADMIN_PASSWORD_PEPPER?: string; MANAGEMENT_ADMIN_CREDENTIAL_REPAIR?: string; MANAGEMENT_MEMO_SUPERVISOR_PASSWORD_USERS?: string; MANAGEMENT_MEMO_SUPERVISOR_PASSWORD_PEPPER?: string };
const USERNAME = /^[a-z][a-z0-9_]{2,31}$/;
const ITERATIONS = 600_000;
const INVALID = "اسم المستخدم أو كلمة المرور غير صحيحين.";
const encoder = new TextEncoder();
const VAULT_KEY = "control-accounts";

export function normalizeManagementUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function configuration(role: ManagementPasswordRole = "operator") {
  const runtime = env as unknown as PasswordRuntime;
  const raw = (role === "administrator" ? runtime.MANAGEMENT_ADMIN_PASSWORD_USERS : role === "memo_supervisor" ? runtime.MANAGEMENT_MEMO_SUPERVISOR_PASSWORD_USERS : runtime.MANAGEMENT_PASSWORD_USERS) || "";
  const pepper = (role === "administrator" ? runtime.MANAGEMENT_ADMIN_PASSWORD_PEPPER : role === "memo_supervisor" ? runtime.MANAGEMENT_MEMO_SUPERVISOR_PASSWORD_PEPPER : runtime.MANAGEMENT_PASSWORD_PEPPER) || "";
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

function accountFailureText(error: unknown) {
  // D1 wraps the useful database error in cause; log only fixed classifications.
  const messages: string[] = [], seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 6 && current && !seen.has(current); depth++) {
    seen.add(current);
    if (typeof current === "string") { messages.push(current); break; }
    if (typeof current !== "object") break;
    if ("message" in current && typeof current.message === "string") messages.push(current.message);
    current = "cause" in current ? current.cause : undefined;
  }
  return messages.join("\n");
}
function accountFailureWords(error: unknown) {
  const allowed = new Set("d1_error d1_exec_error sqlite_error sqlite_auth sqlite_busy error failed failure execute execution executing query queries statement statements batch binding bindings parameter parameters invalid unsupported supported operation method function not cannot could missing found unknown required expected received undefined null object array string number syntax parse parsing malformed database storage transaction begin commit rollback atomic memory limit exceeded many large complex full internal server service request response network timeout closed aborted cancelled denied permission authorized readonly read write insert update delete select returning constraint unique foreign key primary check column table index pattern like escape use prepared sql json body endpoint disabled available".split(" "));
  return [...new Set((accountFailureText(error).toLowerCase().match(/[a-z_]+/g) || []).filter(word => allowed.has(word)))].slice(0, 32);
}
function accountFailureReason(error: unknown) {
  const message = accountFailureText(error);
  return /مفتاح حماية التكامل غير مهيأ/.test(message) ? "vault_key_unconfigured" : /ON CONFLICT|PRIMARY KEY or UNIQUE/i.test(message) ? "missing_unique_key" : /FOREIGN KEY/i.test(message) ? "foreign_key_constraint" : /NOT NULL/i.test(message) ? "required_column_missing" : /CHECK constraint/i.test(message) ? "check_constraint" : /UNIQUE constraint/i.test(message) ? "unique_constraint" : /syntax|near .+error/i.test(message) ? "sql_syntax" : /no such table/i.test(message) ? "missing_table" : /no such column|no column named/i.test(message) ? "missing_column" : /not a function|not implemented|not supported|unsupported.*(?:operation|method)|unimplemented/i.test(message) ? "unsupported_operation" : /D1_TYPE_ERROR|unsupported.*(?:type|bind)|parameter|bindings/i.test(message) ? "unsupported_binding" : /not authorized|permission|read.only|SQLITE_AUTH/i.test(message) ? "database_permission" : /transaction|atomic/i.test(message) ? "transaction_error" : /timeout|timed out/i.test(message) ? "database_timeout" : /locked|SQLITE_BUSY/i.test(message) ? "database_busy" : /too (?:many|large)|limit exceeded/i.test(message) ? "database_limit" : /D1|SQLITE|database/i.test(message) ? "database_error" : /crypto|encrypt|operation|key/i.test(message) ? "cryptography_error" : "unknown";
}
async function changedAccount(account: EffectiveAccount, username: string, password: string): Promise<AccountOverride> {
  try {
    const override: AccountOverride = { id: account.id, username, salt: account.salt, hash: account.hash, sessionVersion: toHex(crypto.getRandomValues(new Uint8Array(16))) };
    if (password) {
      override.salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      override.hash = toHex(await pbkdf2Async(sha256, await peppered(password, account.pepper), fromHex(override.salt), { c: ITERATIONS, dkLen: 32, asyncTick: 10 }));
    }
    return override;
  } catch (error) {
    console.error("management_account_derive_failed", { reason: accountFailureReason(error) });
    throw error;
  }
}
async function saveAccountStore(next: AccountStore, previousSealed: string, actor: string) {
  let stage = "seal";
  try {
    const db = getD1(), sealed = await sealConfig(next);
    stage = "prepare";
    // Conditional writes also support legacy vaults without a unique index.
    const statement = previousSealed
      ? db.prepare("UPDATE management_vault SET sealed = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE integration = ? AND sealed = ?").bind(sealed, actor, VAULT_KEY, previousSealed)
      : db.prepare("INSERT INTO management_vault (integration, sealed, updated_by, updated_at) SELECT ?, ?, ?, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM management_vault WHERE integration = ?)").bind(VAULT_KEY, sealed, actor, VAULT_KEY);
    stage = "write";
    const result = await statement.run();
    if (result.meta.changes !== 1) throw new RequestError("حفظ مشرف آخر تعديلاً متزامناً. حدّث القائمة ثم أعد المحاولة.", 409);
    return sealed;
  } catch (error) {
    console.error("management_account_store_failed", { stage, reason: accountFailureReason(error), words: accountFailureWords(error) });
    throw error;
  }
}
function administratorRepair() {
  const raw = (env as unknown as PasswordRuntime).MANAGEMENT_ADMIN_CREDENTIAL_REPAIR;
  if (!raw) return null;
  try {
    if (raw.length > 2_000) throw Error();
    const value = JSON.parse(raw);
    if (value.version !== 1 || value.username !== "saad" || typeof value.nonce !== "string" || !/^[a-f0-9]{64}$/.test(value.nonce) || typeof value.password !== "string" || value.password.length < 1 || value.password.length > 256) throw Error();
    return value as { version: 1; username: "saad"; nonce: string; password: string };
  } catch {
    console.error("management_administrator_recovery_failed", { stage: "configuration", reason: "invalid_repair_command" });
    throw new RequestError("إعداد استعادة المشرف غير صحيح. تواصل مع مسؤول النشر.", 503);
  }
}

async function accountRoster(repairFor?: string) {
  const accounts: EffectiveAccount[] = [];
  for (const role of ["administrator", "operator", "memo_supervisor"] as const) {
    const config = configuration(role);
    for (const account of config?.accounts || []) accounts.push({ ...account, id: `${role}:${account.username}`, seedUsername: account.username, role, pepper: config!.pepper });
  }
  const row = await getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(VAULT_KEY).first<{ sealed: string }>();
  let saved = row ? await openConfig<AccountStore>(row.sealed) : { version: 1, revision: "environment", accounts: [] } as AccountStore;
  let sealed = row?.sealed || "";
  const invalid = () => { throw new RequestError("تعذرت قراءة حسابات دخول اللوحة المحفوظة. تواصل مع مسؤول النظام.", 503); };
  if (!saved || saved.version !== 1 || typeof saved.revision !== "string" || (row && !/^[a-f0-9]{32}$/.test(saved.revision)) || !Array.isArray(saved.accounts) || saved.accounts.length > 50) invalid();
  if (saved.appliedRecoveryNonce !== undefined && (typeof saved.appliedRecoveryNonce !== "string" || !/^[a-f0-9]{64}$/.test(saved.appliedRecoveryNonce))) invalid();
  const ids = new Set<string>();
  for (const override of saved.accounts) {
    if (!override || typeof override.id !== "string" || !/^(administrator|operator|memo_supervisor):[a-z][a-z0-9_]{2,31}$/.test(override.id) || ids.has(override.id) || typeof override.username !== "string" || !USERNAME.test(override.username) || typeof override.salt !== "string" || !/^[a-f0-9]{32}$/.test(override.salt) || typeof override.hash !== "string" || !/^[a-f0-9]{64}$/.test(override.hash) || typeof override.sessionVersion !== "string" || !/^[a-f0-9]{32}$/.test(override.sessionVersion)) invalid();
    ids.add(override.id);
    const account = accounts.find(a => a.id === override.id);
    if (account) Object.assign(account, { username: override.username, salt: override.salt, hash: override.hash, sessionVersion: override.sessionVersion });
  }
  if (new Set(accounts.map(a => a.username)).size !== accounts.length) invalid();
  const repair = repairFor === "saad" ? administratorRepair() : null;
  if (repair && saved.appliedRecoveryNonce !== repair.nonce) {
    const account = accounts.find(a => a.id === "administrator:saad" && a.enabled);
    if (!account || accounts.some(a => a.id !== account.id && a.username === repair.username)) {
      console.error("management_administrator_recovery_failed", { stage: "target", reason: "existing_active_administrator_missing_or_conflicting" });
      throw new RequestError("حساب saad الإداري غير مهيأ أو موقوف؛ لم تتغير أي حسابات.", 503);
    }
    const override = await changedAccount(account, repair.username, repair.password);
    const next: AccountStore = { ...saved, revision: toHex(crypto.getRandomValues(new Uint8Array(16))), appliedRecoveryNonce: repair.nonce, accounts: [...saved.accounts.filter(a => a.id !== account.id), override] };
    sealed = await saveAccountStore(next, sealed, "deployment-administrator-repair");
    saved = next;
    Object.assign(account, override);
    console.info("management_administrator_recovery_applied");
  }
  return { accounts, saved, sealed };
}
const accountPrefix = (role: ManagementPasswordRole) => role === "administrator" ? "staff-admin" : role === "memo_supervisor" ? "staff-memo" : "staff";
const accountIdentity = (account: EffectiveAccount) => `${accountPrefix(account.role)}:${account.seedUsername}`;
type AccountManager = { role: string; email: string; username?: string };
function safeAccounts(roster: Awaited<ReturnType<typeof accountRoster>>, manager: AccountManager) {
  return { revision: roster.saved.revision, accounts: roster.accounts.map(account => ({ id: account.id, username: account.username, role: account.role, enabled: account.enabled, self: account.role === "administrator" && manager.username === account.username })) };
}
export async function managementAccounts(data: Record<string, unknown> | null, manager: AccountManager) {
  if (manager.role !== "administrator") throw new RequestError("تعديل حسابات دخول اللوحة متاح للمشرف فقط.", 403);
  const roster = await accountRoster();
  if (!data) return safeAccounts(roster, manager);
  if (Object.keys(data).some(key => !["id", "username", "newPassword", "confirmPassword", "revision"].includes(key))) throw new RequestError("يمكن تعديل اسم المستخدم وكلمة المرور فقط.");
  if (typeof data.revision !== "string" || data.revision !== roster.saved.revision) throw new RequestError("تغيرت حسابات اللوحة أثناء التعديل. حدّث القائمة ثم أعد المحاولة.", 409);
  const account = roster.accounts.find(a => a.id === data.id);
  if (!account) throw new RequestError("حساب دخول اللوحة غير موجود.", 404);
  const username = normalizeManagementUsername(data.username);
  if (!USERNAME.test(username)) throw new RequestError("اسم المستخدم من 3 إلى 32 محرفاً، يبدأ بحرف إنجليزي ويحتوي حروفاً وأرقاماً وشرطة سفلية فقط.");
  if (roster.accounts.some(a => a.id !== account.id && a.username === username)) throw new RequestError("اسم المستخدم مستخدم لحساب آخر. اختر اسماً مختلفاً.", 409);
  const password = data.newPassword ?? "", confirmation = data.confirmPassword ?? "";
  if (typeof password !== "string" || typeof confirmation !== "string" || (password && (password.length < 1 || password.length > 256))) throw new RequestError("أدخل كلمة المرور الجديدة.");
  if (password !== confirmation) throw new RequestError("تأكيد كلمة المرور غير مطابق.");
  if (username === account.username && !password) return { ok: true, reauthenticate: false, ...safeAccounts(roster, manager) };
  const override = await changedAccount(account, username, password);
  const next: AccountStore = { ...roster.saved, revision: toHex(crypto.getRandomValues(new Uint8Array(16))), accounts: [...roster.saved.accounts.filter(a => a.id !== account.id), override] };
  await saveAccountStore(next, roster.sealed, manager.email);
  const self = account.role === "administrator" && manager.username === account.username;
  return { ok: true, reauthenticate: self };
}

export async function authenticateManagementPassword(data: Record<string, unknown>) {
  const username = normalizeManagementUsername(data.username), password = data.password;
  if (!USERNAME.test(username) || typeof password !== "string" || password.length < 1 || password.length > 256) throw new RequestError(INVALID, 401);
  const { accounts } = await accountRoster(username);
  const account = accounts.find(row => row.username === username && row.enabled), fallback = account || accounts[0];
  if (!fallback) throw new RequestError("دخول حسابات التشغيل غير مهيأ حالياً. تواصل مع الإدارة.", 503);
  const salt = fromHex(account?.salt || "00".repeat(16));
  // Workers caps native PBKDF2 below this cost; the server-only implementation preserves 600000.
  const actual = await pbkdf2Async(sha256, await peppered(password, fallback.pepper), salt, { c: ITERATIONS, dkLen: 32, asyncTick: 10 });
  const valid = sameBytes(actual, fromHex(account?.hash || "00".repeat(32)));
  if (!account || !valid) throw new RequestError(INVALID, 401);
  return { username, role: account.role, identity: accountIdentity(account), sessionPrincipal: `${accountPrefix(account.role)}:${username}:${await credentialTag(account, account.pepper)}` };
}

export async function managementPasswordSession(principal: string) {
  const match = principal.match(/^(staff|staff-admin|staff-memo):([a-z][a-z0-9_]{2,31}):([a-f0-9]{32})$/);
  if (!match) return null;
  const { accounts } = await accountRoster(match[2]);
  const account = accounts.find(row => row.username === match[2] && row.enabled && row.role === (match[1] === "staff-admin" ? "administrator" : match[1] === "staff-memo" ? "memo_supervisor" : "operator"));
  if (!account || !sameBytes(fromHex(match[3]), fromHex(await credentialTag(account, account.pepper)))) return null;
  return { username: account.username, role: account.role, identity: accountIdentity(account) };
}
