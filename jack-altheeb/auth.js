const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const COOKIE_NAME = 'jack_session';
const JWT_SECRET = process.env.JWT_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } }) : null;

const usernameSchema = z.string().trim().min(3).max(18).regex(/^[\p{L}\p{N}_]+$/u);
const emailSchema = z.string().trim().toLowerCase().email().max(120);
const passwordSchema = z.string().min(8).max(72);

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarIndex: row.avatar_index,
    level: row.level,
    xp: row.xp,
    coins: row.coins,
    wins: row.wins,
    losses: row.losses,
    gamesPlayed: row.games_played,
    createdAt: row.created_at
  };
}

async function initDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(18) NOT NULL,
      username_key VARCHAR(18) UNIQUE NOT NULL,
      email VARCHAR(120) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_index SMALLINT NOT NULL DEFAULT 0 CHECK (avatar_index BETWEEN 0 AND 3),
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      games_played INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS users_leaderboard_idx ON users (wins DESC, xp DESC);
  `);
}

function signToken(user) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ sub: String(user.id), username: user.username }, JWT_SECRET, { expiresIn: '30d', issuer: 'jack-altheeb' });
}

function setSession(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('=');
    return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))];
  }));
}

async function findUserById(id) {
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function requireUser(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token || !JWT_SECRET) return res.status(401).json({ ok: false, error: 'سجّل الدخول أولًا.' });
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'jack-altheeb' });
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ ok: false, error: 'الجلسة غير صالحة.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'انتهت الجلسة، سجّل الدخول مجددًا.' });
  }
}

function setupAuth(app) {
  app.use(cookieParser());
  app.use(require('express').json({ limit: '32kb' }));
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

  app.get('/api/auth/status', async (_req, res) => {
    res.json({ ok: true, ready: Boolean(pool && JWT_SECRET), database: Boolean(pool) });
  });

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    if (!pool || !JWT_SECRET) return res.status(503).json({ ok: false, error: 'نظام الحسابات ينتظر ربط قاعدة البيانات في Render.' });
    const parsed = z.object({ username: usernameSchema, email: emailSchema, password: passwordSchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'تأكد من الاسم والبريد، وكلمة المرور لا تقل عن 8 خانات.' });
    const { username, email, password } = parsed.data;
    const usernameKey = username.toLocaleLowerCase('ar');
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `INSERT INTO users (username, username_key, email, password_hash)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [username, usernameKey, email, passwordHash]
      );
      setSession(res, signToken(rows[0]));
      res.status(201).json({ ok: true, user: publicUser(rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        const field = String(error.constraint || '').includes('username') ? 'اسم المستخدم محجوز.' : 'البريد مستخدم من قبل.';
        return res.status(409).json({ ok: false, error: field });
      }
      console.error('register error', error);
      res.status(500).json({ ok: false, error: 'تعذر إنشاء الحساب الآن.' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    if (!pool || !JWT_SECRET) return res.status(503).json({ ok: false, error: 'نظام الحسابات ينتظر ربط قاعدة البيانات في Render.' });
    const login = String(req.body?.login || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!login || !password) return res.status(400).json({ ok: false, error: 'أدخل اسم المستخدم أو البريد وكلمة المرور.' });
    const { rows } = await pool.query('SELECT * FROM users WHERE username_key = $1 OR email = $1 LIMIT 1', [login]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة.' });
    setSession(res, signToken(user));
    res.json({ ok: true, user: publicUser(user) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/me', requireUser, (req, res) => res.json({ ok: true, user: publicUser(req.user) }));

  app.patch('/api/me/avatar', requireUser, async (req, res) => {
    const avatarIndex = Number(req.body?.avatarIndex);
    if (!Number.isInteger(avatarIndex) || avatarIndex < 0 || avatarIndex > 3) return res.status(400).json({ ok: false, error: 'الصورة غير صحيحة.' });
    const { rows } = await pool.query('UPDATE users SET avatar_index=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [avatarIndex, req.user.id]);
    res.json({ ok: true, user: publicUser(rows[0]) });
  });

  app.get('/api/leaderboard', requireUser, async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY wins DESC, xp DESC LIMIT 50');
    res.json({ ok: true, players: rows.map(publicUser) });
  });
}

async function authenticateSocket(socket, next) {
  try {
    if (!pool || !JWT_SECRET) return next(new Error('نظام الحسابات غير مربوط.'));
    const cookies = parseCookies(socket.handshake.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    if (!token) return next(new Error('سجّل الدخول أولًا.'));
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'jack-altheeb' });
    const user = await findUserById(payload.sub);
    if (!user) return next(new Error('الجلسة غير صالحة.'));
    socket.data.user = publicUser(user);
    next();
  } catch {
    next(new Error('انتهت الجلسة.'));
  }
}

async function recordResult(userId, won) {
  if (!pool || !userId) return;
  const xp = won ? 120 : 35;
  const coins = won ? 100 : 25;
  await pool.query(
    `UPDATE users SET
      games_played = games_played + 1,
      wins = wins + $1,
      losses = losses + $2,
      xp = xp + $3,
      coins = coins + $4,
      level = 1 + FLOOR((xp + $3) / 500.0),
      updated_at = NOW()
     WHERE id = $5`,
    [won ? 1 : 0, won ? 0 : 1, xp, coins, userId]
  );
}

module.exports = { setupAuth, initDatabase, authenticateSocket, recordResult };
