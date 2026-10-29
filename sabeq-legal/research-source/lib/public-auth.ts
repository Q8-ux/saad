import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { RequestError } from "@/lib/request-security";

type AuthEnvironment = { AUTH_SECRET?: string; ALLOW_GUEST_MEMO?: string };

export type PublicUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  memoLimit: number;
  assistantLimit: number;
};

const SESSION_SECONDS = 60 * 60 * 24 * 30;

function authSecret() {
  const secret = (env as unknown as AuthEnvironment).AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new RequestError("خدمة تسجيل الدخول غير مهيأة حالياً.", 503);
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function randomVerificationCode() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, "0");
}

async function hmac(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function verificationCodeHash(challengeId: string, email: string, code: string) {
  return hmac(`verification:${challengeId}:${normalizeEmail(email)}:${code}`);
}

export async function sessionTokenHash(token: string) {
  return hmac(`session:${token}`);
}

export function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9_-]{32,200})$/);
  return match?.[1] || null;
}

export async function getPublicUser(request: Request): Promise<PublicUser | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await sessionTokenHash(token);
  const now = Math.floor(Date.now() / 1000);
  const user = await getD1().prepare(
    `SELECT u.id, u.name, u.phone, u.email, u.status,
            u.memo_limit AS memoLimit,
            u.assistant_limit AS assistantLimit
     FROM public_user_sessions s
     INNER JOIN public_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
  ).bind(tokenHash, now).first<PublicUser>();
  if (!user) return null;
  await getD1().prepare(
    "UPDATE public_user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
  ).bind(tokenHash).run();
  return user;
}

export async function requirePublicUser(request: Request) {
  const user = await getPublicUser(request);
  if (!user) throw new RequestError("يلزم تسجيل الدخول والتحقق من البريد الإلكتروني للمتابعة.", 401);
  if (user.status !== "active") throw new RequestError("هذا الحساب موقوف مؤقتاً. تواصل مع إدارة مجموعة سابق القانونية.", 403);
  return user;
}

/**
 * Temporary pilot switch for the memo workflow.  Guest requests are deliberately
 * not attached to a user account or written to the service archive.  Set this
 * variable to "false" (or remove it) before the public launch to restore the
 * mandatory email-verified sign-in flow.
 */
export function guestMemoEnabled() {
  return (env as unknown as AuthEnvironment).ALLOW_GUEST_MEMO?.trim().toLowerCase() === "true";
}

export async function requireMemoUserOrGuest(request: Request): Promise<PublicUser | null> {
  const user = await getPublicUser(request);
  if (user) {
    if (user.status !== "active") throw new RequestError("هذا الحساب موقوف مؤقتاً. تواصل مع إدارة مجموعة سابق القانونية.", 403);
    return user;
  }
  if (guestMemoEnabled()) return null;
  throw new RequestError("يلزم تسجيل الدخول والتحقق من البريد الإلكتروني للمتابعة.", 401);
}

export async function createPublicSession(userId: string) {
  const token = randomToken();
  const tokenHash = await sessionTokenHash(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await getD1().prepare(
    `INSERT INTO public_user_sessions (token_hash, user_id, expires_at)
     VALUES (?, ?, ?)`,
  ).bind(tokenHash, userId, expiresAt).run();
  return { token, expiresAt };
}

export async function revokePublicSession(request: Request) {
  const token = bearerToken(request);
  if (!token) return;
  const tokenHash = await sessionTokenHash(token);
  await getD1().prepare("DELETE FROM public_user_sessions WHERE token_hash = ?").bind(tokenHash).run();
}
