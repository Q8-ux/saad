import http from 'http';
import crypto from 'crypto';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';

const PORT = Number(process.env.PORT || 10000);
const CHILD_PORT = 10001;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_SHA256 = process.env.ADMIN_PASSWORD_SHA256 || '';
const JWT_SECRET = process.env.JWT_SECRET || 'tamweenat-dev-secret';

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

async function handleAdminLogin(req, res) {
  const headers = corsHeaders(req);
  if (!ADMIN_PASSWORD_SHA256) return json(res, 503, { error: 'admin_password_not_configured' }, headers);
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8') || '{}');
    const username = String(body.username || '');
    const passwordHash = sha256(body.password || '');
    if (username !== ADMIN_USERNAME || !safeEqualHex(passwordHash, ADMIN_PASSWORD_SHA256)) {
      return json(res, 401, { error: 'invalid_credentials' }, headers);
    }
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '12h' });
    return json(res, 200, { token, user: { role: 'admin', username } }, headers);
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
  if (req.method === 'OPTIONS' && req.url === '/api/auth/admin') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/api/auth/admin') {
    return handleAdminLogin(req, res);
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
