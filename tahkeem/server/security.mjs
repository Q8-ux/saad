import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { one } from './store.mjs';

const scrypt = promisify(derive);
const sessionName = 'tahkeem_session';
const sessionSeconds = 12 * 60 * 60;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireThat(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}

export function textField(value, label, max, min = 0) {
  requireThat(value == null || typeof value === 'string', 400, `تحقق من حقل ${label}.`);
  const text = (value ?? '').trim();
  requireThat(text.length >= min && text.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text), 400,
    `تحقق من طول حقل ${label}.`);
  return text;
}

export function emailField(value) {
  const email = textField(value, 'البريد الإلكتروني', 254, 5).toLowerCase();
  requireThat(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 400, 'أدخل بريدًا إلكترونيًا صالحًا.');
  return email;
}

export function passwordField(value) {
  requireThat(typeof value === 'string' && value.length >= 12 && value.length <= 128 &&
    value.trim().length >= 12, 400, 'كلمة المرور تحتاج إلى 12 حرفًا على الأقل.');
  return value;
}

export function token() {
  return randomBytes(32).toString('base64url');
}

export function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function matchesHash(value, expected) {
  return typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(Buffer.from(sha(value), 'hex'), Buffer.from(expected, 'hex'));
}

async function passwordKey(password, salt) {
  return scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await passwordKey(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = (stored || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const key = await passwordKey(password, salt);
  return timingSafeEqual(key, Buffer.from(hash, 'hex')) && Boolean(stored);
}

function readCookie(request) {
  return request.get('cookie')?.match(/(?:^|;\s*)tahkeem_session=([\w-]{43})(?:;|$)/)?.[1];
}

export function sessionCookie(response, value, secure, age = sessionSeconds) {
  response.cookie(sessionName, value, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: age * 1000 });
}

export async function createSession(db, accountId) {
  const value = token();
  await db.query("INSERT INTO sessions (token_hash, account_id, expires_at) VALUES ($1,$2,now() + interval '12 hours')",
    [sha(value), accountId]);
  return value;
}

export async function removeSession(db, request) {
  const value = readCookie(request);
  if (value) await db.query('DELETE FROM sessions WHERE token_hash = $1', [sha(value)]);
}

export function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id, name: account.name, email: account.email, role: account.role, enabled: account.enabled,
    active: account.enabled && (account.role === 'owner' || account.subscribed === true),
    accessUntil: account.access_until,
  };
}

export async function getSessionAccount(db, request) {
  const value = readCookie(request);
  if (!value) return null;
  return one(db, `SELECT a.*, (a.access_until > now()) AS subscribed FROM accounts a
    JOIN sessions s ON s.account_id = a.id WHERE s.token_hash = $1 AND s.expires_at > now() AND a.enabled`, [sha(value)]);
}

export async function limit(db, key, max) {
  const row = await one(db, `INSERT INTO auth_limits (key) VALUES ($1)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_limits.window_start <= now() - interval '15 minutes' THEN 1
        ELSE LEAST(auth_limits.attempts + 1, 100000) END,
      window_start = CASE WHEN auth_limits.window_start <= now() - interval '15 minutes'
        THEN now() ELSE auth_limits.window_start END
    RETURNING attempts`, [sha(key)]);
  requireThat(row.attempts <= max, 429, 'محاولات كثيرة. أعد المحاولة بعد قليل.');
}

export const isUuid = value => typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
