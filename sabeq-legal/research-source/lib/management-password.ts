import { env } from "cloudflare:workers";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { RequestError } from "@/lib/request-security";

type PasswordAccount = { username: string; salt: string; hash: string; enabled: boolean };
type PasswordRuntime = { MANAGEMENT_PASSWORD_USERS?: string; MANAGEMENT_PASSWORD_PEPPER?: string; MANAGEMENT_ADMIN_PASSWORD_USERS?: string; MANAGEMENT_ADMIN_PASSWORD_PEPPER?: string };
const USERNAME = /^[a-z][a-z0-9_]{2,31}$/;
const ITERATIONS = 600_000;
const INVALID = "اسم المستخدم أو كلمة المرور غير صحيحين.";
const encoder = new TextEncoder();

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
  return toHex(await peppered(`management-session-v1:${account.username}:${account.salt}:${account.hash}`, pepper)).slice(0, 32);
}

export async function authenticateManagementPassword(data: Record<string, unknown>) {
  const username = normalizeManagementUsername(data.username), password = data.password;
  if (!USERNAME.test(username) || typeof password !== "string" || password.length < 10 || password.length > 256) throw new RequestError(INVALID, 401);
  const administrator = configuration("administrator");
  const config = administrator?.accounts.some(row => row.username === username) ? administrator : configuration() || administrator;
  if (!config) throw new RequestError("دخول حسابات التشغيل غير مهيأ حالياً. تواصل مع الإدارة.", 503);
  const account = config.accounts.find(row => row.username === username && row.enabled);
  const salt = fromHex(account?.salt || "00".repeat(16));
  // Workers caps native PBKDF2 below this cost; the server-only implementation preserves 600000.
  const actual = await pbkdf2Async(sha256, await peppered(password, config.pepper), salt, { c: ITERATIONS, dkLen: 32, asyncTick: 10 });
  const valid = sameBytes(actual, fromHex(account?.hash || "00".repeat(32)));
  if (!account || !valid || (config.role === "operator" && password.length < 16)) throw new RequestError(INVALID, 401);
  return { username, role: config.role, sessionPrincipal: `${config.role === "administrator" ? "staff-admin" : "staff"}:${username}:${await credentialTag(account, config.pepper)}` };
}

export async function managementPasswordSession(principal: string) {
  const match = principal.match(/^(staff|staff-admin):([a-z][a-z0-9_]{2,31}):([a-f0-9]{32})$/);
  if (!match) return null;
  const config = configuration(match[1] === "staff-admin" ? "administrator" : "operator");
  const account = config?.accounts.find(row => row.username === match[2] && row.enabled);
  if (!config || !account || !sameBytes(fromHex(match[3]), fromHex(await credentialTag(account, config.pepper)))) return null;
  return { username: account.username, role: config.role, identity: `${match[1]}:${account.username}` };
}
