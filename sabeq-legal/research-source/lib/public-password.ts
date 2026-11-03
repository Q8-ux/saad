import { RequestError } from "@/lib/request-security";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const PASSWORD_ITERATIONS = 310_000;
export type PasswordCredential = { username: string; salt: string; password_hash: string; iterations: number };

export function normalizeUsername(value: unknown) {
  const username = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(username)) {
    throw new RequestError("اسم المستخدم من 3 إلى 32 حرفاً إنجليزياً أو رقماً أو شرطة سفلية، ويبدأ بحرف.");
  }
  return username;
}
function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || !value.trim()) {
    throw new RequestError("كلمة المرور يجب أن تتكون من 12 إلى 128 محرفاً.");
  }
  return value;
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
function fromHex(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
  return new Uint8Array(value.match(/.{2}/g)!.map(pair => parseInt(pair, 16)));
}
async function derive(password: string, salt: Uint8Array, iterations: number) {
  // Cloudflare Workers caps native PBKDF2 iteration counts; use the reviewed
  // server-side implementation already used by management authentication.
  return pbkdf2Async(sha256, new TextEncoder().encode(password), salt, { c: iterations, dkLen: 32, asyncTick: 10 });
}
export async function hashPublicPassword(value: unknown) {
  const password = validatePassword(value);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), password_hash: hex(await derive(password, salt, PASSWORD_ITERATIONS)), iterations: PASSWORD_ITERATIONS };
}
export async function verifyPublicPassword(value: unknown, row: Pick<PasswordCredential, "salt"|"password_hash"|"iterations">) {
  if (typeof value !== "string" || value.length > 128) return false;
  const salt = fromHex(row.salt), expected = fromHex(row.password_hash);
  if (!salt || salt.length !== 16 || !expected || expected.length !== 32 || !Number.isInteger(row.iterations) || row.iterations < 100_000 || row.iterations > 1_000_000) return false;
  const candidate = await derive(value, salt, row.iterations);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= candidate[i] ^ expected[i];
  return diff === 0;
}
export function internalContactEmail(id: string) {
  return `user-${id}@accounts.sabeq.invalid`;
}
