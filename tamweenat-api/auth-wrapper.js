import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';

const PORT = Number(process.env.PORT || 10000);
const CHILD_PORT = 10001;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'tamweenat-dev-secret';
const OVERRIDE_FILE = '/tmp/tamweenat-admin-password.sha256';
let adminPasswordHash = process.env.ADMIN_PASSWORD_SHA256 || '';
try {
  const saved = fs.readFileSync(OVERRIDE_FILE, 'utf8').trim();
  if (/^[a-f0-9]{64}$/i.test(saved)) adminPasswordHash = saved;
} catch {}

const child = spawn(process.execPath, ['server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(CHILD_PORT) },
  stdio: 'inherit'
});

child.on('exit', (code) => {
  if (code && code !== 0) console.error(`Tamweenat core API exited with code ${code}`);
});

function allowedOrigin(origin = '') {
  return !origin || origin.startsWith('https://q8-ux.github.io') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
}

function corsHeaders(req) {
  const origin = req.headers.origin || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? (origin || '*') : 'null',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Vary': 'Origin'
  };
}

function json(res, status, body, headers = {}) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    ...headers
  });
  res.end(data);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

async function readBody(req, maxBytes = 64 * 1024) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('request_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyAdminToken(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

async function handleAdminLogin(req, res) {
  const headers = corsHeaders(req);
  if (!adminPasswordHash) return json(res, 503, { error: 'admin_password_not_configured' }, headers);
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8') || '{}');
    const username = String(body.username || '');
    const passwordHash = sha256(body.password || '');
    if (username !== ADMIN_USERNAME || !safeEqualHex(passwordHash, adminPasswordHash)) {
      return json(res, 401, { error: 'invalid_credentials' }, headers);
    }
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '12h' });
    return json(res, 200, { token, user: { role: 'admin', username } }, headers);
  } catch {
    return json(res, 400, { error: 'invalid_request' }, headers);
  }
}

async function handleAdminPasswordChange(req, res) {
  const headers = corsHeaders(req);
  const user = verifyAdminToken(req);
  if (!user) return json(res, 401, { error: 'unauthorized' }, headers);
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8') || '{}');
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (!safeEqualHex(sha256(currentPassword), adminPasswordHash)) {
      return json(res, 400, { error: 'current_password_incorrect' }, headers);
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return json(res, 400, { error: 'password_length_invalid' }, headers);
    }
    if (newPassword === currentPassword) {
      return json(res, 400, { error: 'password_unchanged' }, headers);
    }
    adminPasswordHash = sha256(newPassword);
    try { fs.writeFileSync(OVERRIDE_FILE, adminPasswordHash, { mode: 0o600 }); } catch {}
    console.log(`Admin password changed by ${user.username}`);
    return json(res, 200, { ok: true, changedAt: new Date().toISOString() }, headers);
  } catch {
    return json(res, 400, { error: 'invalid_request' }, headers);
  }
}

function proxy(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: CHILD_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${CHILD_PORT}` }
  };
  const upstream = http.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', (error) => {
    console.error('Tamweenat proxy error', error.message);
    if (!res.headersSent) json(res, 502, { error: 'upstream_unavailable' }, corsHeaders(req));
    else res.end();
  });
  req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  const special = req.url === '/api/auth/admin' || req.url === '/api/admin/change-password';
  if (req.method === 'OPTIONS' && special) {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/api/auth/admin') {
    return handleAdminLogin(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/admin/change-password') {
    return handleAdminPasswordChange(req, res);
  }
  return proxy(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tamweenat secure gateway listening on ${PORT}`);
});

function shutdown() {
  try { child.kill('SIGTERM'); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
