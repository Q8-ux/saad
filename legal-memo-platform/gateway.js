'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { searchLegalDocuments } = require('./legal-library');

const publicPort = Number(process.env.PORT || 3000);
const appPort = Number(process.env.INTERNAL_APP_PORT || 3001);
const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
const databasePath = path.join(dataDir, 'legal-memo.db');
const token = String(process.env.LEGAL_RESEARCH_API_TOKEN || '').trim();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

function isAuthorized(req) {
  if (!token) return false;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const headerToken = String(req.headers['x-legal-research-token'] || '').trim();
  return safeEqual(bearer, token) || safeEqual(headerToken, token);
}

function normalizeRecord(item) {
  const status = String(item.status || '');
  const excerpt = String(item.excerpt || item.summary || '').trim();
  const lowConfidence = status && !['ready', 'completed', 'indexed', 'verified'].includes(status.toLowerCase());
  return {
    id: item.id,
    title: item.title || '',
    source_type: item.document_type || 'مستند تشريعي',
    document_number: item.law_number || null,
    year: item.law_year || null,
    category: item.category || '',
    reference: item.reference || null,
    excerpt,
    official_source: item.official_source || 'وزارة العدل الكويتية',
    source_url: item.source_url || '',
    verification_status: lowConfidence ? 'needs_review' : 'verified_source_record',
    quality_note: lowConfidence ? 'يتطلب مراجعة المصدر الأصلي' : null,
  };
}

function openDb() {
  if (!fs.existsSync(databasePath)) throw new Error('legal database not initialized');
  return new DatabaseSync(databasePath, { readOnly: true });
}

function handleLegalSearch(req, res, parsed) {
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const q = String(parsed.searchParams.get('q') || '').trim().slice(0, 4000);
    const category = String(parsed.searchParams.get('category') || '').trim().slice(0, 100);
    const type = String(parsed.searchParams.get('type') || '').trim().slice(0, 100);
    const year = String(parsed.searchParams.get('year') || '').trim().slice(0, 10);
    const requestedLimit = Number(parsed.searchParams.get('limit') || 20);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 20, 50));
    if (!q) return json(res, 400, { error: 'query_required' });

    const db = openDb();
    const result = searchLegalDocuments(db, {
      query: q,
      category,
      year,
      documentType: type,
      status: '',
      page: 1,
      limit,
    });
    db.close();
    const raw = Array.isArray(result) ? result : (result.items || result.documents || result.results || []);
    const records = raw.map(normalizeRecord).filter(x => x.source_url && x.title);
    return json(res, 200, {
      query: q,
      count: records.length,
      records,
      source: 'central_kuwait_legal_library',
      cassation_judgments: [],
      cassation_message: 'لا توجد أحكام تمييز موثقة مطابقة في قاعدة البيانات حالياً.',
    });
  } catch (error) {
    console.error('External legal search failed:', error.message);
    return json(res, 503, { error: 'legal_research_unavailable' });
  }
}

function handleCassation(req, res) {
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });
  return json(res, 200, {
    records: [],
    count: 0,
    message: 'لا توجد أحكام تمييز موثقة مطابقة في قاعدة البيانات حالياً.',
  });
}

function proxy(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${appPort}` };
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: appPort,
    path: req.url,
    method: req.method,
    headers,
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', error => {
    console.error('Internal app proxy failed:', error.message);
    if (!res.headersSent) json(res, 502, { error: 'application_unavailable' });
    else res.end();
  });
  req.pipe(upstream);
}

const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(appPort), MOJ_AUTO_SYNC: process.env.MOJ_AUTO_SYNC || 'true' },
  stdio: 'inherit',
});
child.on('exit', code => {
  console.error(`Internal legal app exited with code ${code}`);
  process.exit(code || 1);
});

const server = http.createServer((req, res) => {
  let parsed;
  try { parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return json(res, 400, { error: 'bad_request' }); }

  if (req.method === 'GET' && parsed.pathname === '/api/legal/search') return handleLegalSearch(req, res, parsed);
  if (req.method === 'GET' && parsed.pathname === '/api/legal/cassation') return handleCassation(req, res);
  if (req.method === 'GET' && parsed.pathname === '/api/legal/health') {
    return json(res, 200, { ok: true, token_configured: Boolean(token), database: fs.existsSync(databasePath) });
  }
  return proxy(req, res);
});

server.listen(publicPort, () => {
  console.log(`Legal research gateway listening on http://localhost:${publicPort}`);
});
