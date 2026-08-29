import "server-only";

import { cookies } from "next/headers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { getD1 } from "../db";

export const LOCAL_AUTH_COOKIE = "__Host-legal_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 1000 * 60 * 10;
const PASSWORD_ITERATIONS = 100000;
const DUMMY_SALT = "bGVnYWwtYXV0aC1kdW1teS1zYWx0LXdlLWRvLW5vdC1yZXVzZQ";

type LocalAuthRuntime = typeof globalThis & {
  __LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__?: string;
  __LEGAL_OFFICE_LOCAL_AUTH_PEPPER__?: string;
};

type BootstrapAccount = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isPlatformAdmin: boolean;
  initialOfficeName: string;
  passwordSalt: string;
  passwordHash: string;
  passwordIterations: number;
};

type LocalCredentialRow = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  isPlatformAdmin: number;
  initialOfficeName: string;
  failedAttempts: number;
  lockedUntil: string;
};

export type ApplicationIdentity = {
  authType: "local" | "chatgpt";
  id?: string;
  email: string;
  displayName: string;
  isPlatformAdmin?: boolean;
  initialOfficeName?: string;
};

export type LocalLoginResult =
  | { ok: true; token: string; expiresAt: string; identity: ApplicationIdentity }
  | { ok: false };

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function localAuthPepper(): string {
  return (globalThis as LocalAuthRuntime).__LEGAL_OFFICE_LOCAL_AUTH_PEPPER__ ?? "";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

async function hashPassword(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const saltBytes = Uint8Array.from(fromBase64Url(salt));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${localAuthPepper()}\u0000${password}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations,
    },
    material,
    256,
  );
  return toBase64Url(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function validBootstrapAccount(value: unknown): value is BootstrapAccount {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const account = value as Record<string, unknown>;
  return (
    typeof account.id === "string" &&
    typeof account.username === "string" &&
    typeof account.email === "string" &&
    typeof account.displayName === "string" &&
    typeof account.isPlatformAdmin === "boolean" &&
    typeof account.initialOfficeName === "string" &&
    typeof account.passwordSalt === "string" &&
    typeof account.passwordHash === "string" &&
    typeof account.passwordIterations === "number" &&
    Number.isInteger(account.passwordIterations) &&
    account.passwordIterations === PASSWORD_ITERATIONS
  );
}

function bootstrapAccounts(): BootstrapAccount[] {
  const raw = (globalThis as LocalAuthRuntime).__LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__ ?? "";
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const accounts = parsed.filter(validBootstrapAccount).map((account) => ({
      ...account,
      username: normalizeUsername(account.username),
      email: account.email.trim().toLowerCase(),
      displayName: account.displayName.trim().slice(0, 180),
      initialOfficeName: account.initialOfficeName.trim().slice(0, 180),
    }));
    return accounts.filter(
      (account) => account.username && account.email && account.displayName && account.initialOfficeName,
    );
  } catch {
    return [];
  }
}

export function localAuthConfigured(): boolean {
  return Boolean(localAuthPepper()) && bootstrapAccounts().length > 0;
}

async function ensureLocalAuthBootstrap(): Promise<void> {
  const accounts = bootstrapAccounts();
  if (!accounts.length) return;

  const statements = accounts.flatMap((account) => [
    getD1()
      .prepare(
        "INSERT OR IGNORE INTO app_users (id,email,display_name,status,updated_at) VALUES (?,?,?,'active',CURRENT_TIMESTAMP)",
      )
      .bind(account.id, account.email, account.displayName),
    getD1()
      .prepare(
        "INSERT OR IGNORE INTO local_login_credentials (user_id,username,password_hash,password_salt,password_iterations,is_platform_admin,initial_office_name,failed_attempts,locked_until,updated_at) VALUES (?,?,?,?,?,?,?,0,'',CURRENT_TIMESTAMP)",
      )
      .bind(
        account.id,
        account.username,
        account.passwordHash,
        account.passwordSalt,
        account.passwordIterations,
        account.isPlatformAdmin ? 1 : 0,
        account.initialOfficeName,
      ),
    getD1()
      .prepare(
        "UPDATE local_login_credentials SET password_hash=?,password_salt=?,password_iterations=?,is_platform_admin=?,initial_office_name=?,failed_attempts=0,locked_until='',updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND password_iterations<>?",
      )
      .bind(
        account.passwordHash,
        account.passwordSalt,
        account.passwordIterations,
        account.isPlatformAdmin ? 1 : 0,
        account.initialOfficeName,
        account.id,
        account.passwordIterations,
      ),
  ]);

  await getD1().batch(statements);
}

function asIdentity(row: Pick<LocalCredentialRow, "id" | "email" | "displayName" | "isPlatformAdmin" | "initialOfficeName">): ApplicationIdentity {
  return {
    authType: "local",
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isPlatformAdmin: row.isPlatformAdmin === 1,
    initialOfficeName: row.initialOfficeName,
  };
}

function isLocked(row: LocalCredentialRow, now: number): boolean {
  if (!row.lockedUntil) return false;
  const until = Date.parse(row.lockedUntil);
  return Number.isFinite(until) && until > now;
}

async function resetExpiredLock(row: LocalCredentialRow, now: number): Promise<LocalCredentialRow> {
  if (!row.lockedUntil || isLocked(row, now)) return row;
  await getD1()
    .prepare(
      "UPDATE local_login_credentials SET failed_attempts=0,locked_until='',updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
    )
    .bind(row.id)
    .run();
  return { ...row, failedAttempts: 0, lockedUntil: "" };
}

async function recordFailedAttempt(row: LocalCredentialRow): Promise<void> {
  const attempts = row.failedAttempts + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
    : "";
  await getD1()
    .prepare(
      "UPDATE local_login_credentials SET failed_attempts=?,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
    )
    .bind(attempts, lockedUntil, row.id)
    .run();
}

async function findCredential(username: string): Promise<LocalCredentialRow | null> {
  return getD1()
    .prepare(
      "SELECT u.id,u.email,u.display_name AS displayName,u.status,c.username,c.password_hash AS passwordHash,c.password_salt AS passwordSalt,c.password_iterations AS passwordIterations,c.is_platform_admin AS isPlatformAdmin,c.initial_office_name AS initialOfficeName,c.failed_attempts AS failedAttempts,c.locked_until AS lockedUntil FROM local_login_credentials c JOIN app_users u ON u.id=c.user_id WHERE c.username=? LIMIT 1",
    )
    .bind(username)
    .first<LocalCredentialRow>();
}

export async function authenticateLocalUser(
  usernameValue: string,
  password: string,
): Promise<LocalLoginResult> {
  await ensureLocalAuthBootstrap();
  const username = normalizeUsername(usernameValue);
  if (!username || !password || username.length > 80 || password.length > 512) {
    return { ok: false };
  }

  let row = await findCredential(username);
  const now = Date.now();
  if (row) row = await resetExpiredLock(row, now);

  // Match the password derivation cost even for unknown accounts to avoid
  // turning the endpoint into a username-discovery oracle.
  const iterations = row?.passwordIterations ?? PASSWORD_ITERATIONS;
  const candidateHash = await hashPassword(password, row?.passwordSalt ?? DUMMY_SALT, iterations);
  if (!row || row.status !== "active" || isLocked(row, now) || !constantTimeEqual(candidateHash, row.passwordHash)) {
    if (row && row.status === "active" && !isLocked(row, now)) {
      await recordFailedAttempt(row);
    }
    return { ok: false };
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
  await getD1().batch([
    getD1()
      .prepare(
        "UPDATE local_login_credentials SET failed_attempts=0,locked_until='',updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
      )
      .bind(row.id),
    getD1()
      .prepare("DELETE FROM local_login_sessions WHERE expires_at<=? OR user_id=? AND revoked_at<>''")
      .bind(new Date(now).toISOString(), row.id),
    getD1()
      .prepare(
        "INSERT INTO local_login_sessions (id,user_id,token_hash,expires_at,revoked_at,last_seen_at) VALUES (?,?,?,?, '',CURRENT_TIMESTAMP)",
      )
      .bind(crypto.randomUUID(), row.id, tokenHash, expiresAt),
  ]);

  return { ok: true, token, expiresAt, identity: asIdentity(row) };
}

export async function getLocalIdentity(): Promise<ApplicationIdentity | null> {
  if (!localAuthConfigured()) return null;
  const token = (await cookies()).get(LOCAL_AUTH_COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;

  await ensureLocalAuthBootstrap();
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await getD1()
    .prepare(
      "SELECT u.id,u.email,u.display_name AS displayName,c.is_platform_admin AS isPlatformAdmin,c.initial_office_name AS initialOfficeName FROM local_login_sessions s JOIN app_users u ON u.id=s.user_id JOIN local_login_credentials c ON c.user_id=u.id WHERE s.token_hash=? AND s.revoked_at='' AND s.expires_at>? AND u.status='active' LIMIT 1",
    )
    .bind(tokenHash, now)
    .first<Pick<LocalCredentialRow, "id" | "email" | "displayName" | "isPlatformAdmin" | "initialOfficeName">>();
  if (!row) return null;

  await getD1()
    .prepare("UPDATE local_login_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?")
    .bind(tokenHash)
    .run();
  return asIdentity(row);
}

export async function revokeCurrentLocalSession(): Promise<void> {
  const token = (await cookies()).get(LOCAL_AUTH_COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return;
  const tokenHash = await sha256(token);
  await getD1()
    .prepare("UPDATE local_login_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=? AND revoked_at=''")
    .bind(tokenHash)
    .run();
}

export async function getApplicationIdentity(): Promise<ApplicationIdentity | null> {
  if (localAuthConfigured()) return getLocalIdentity();

  const user = await getChatGPTUser();
  if (!user) return null;
  return {
    authType: "chatgpt",
    email: user.email,
    displayName: user.displayName,
  };
}
