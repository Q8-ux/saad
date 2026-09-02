'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const multer = require('multer');
const OpenAI = require('openai');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { searchLegalDocuments, findRelevantLegalContext } = require('./legal-library');

const publicPort = Number(process.env.PORT || 3000);
const appPort = Number(process.env.INTERNAL_APP_PORT || 3001);
const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
const databasePath = path.join(dataDir, 'legal-memo.db');
const uploadDir = path.join(dataDir, 'public-api-uploads');
const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const jsonBody = express.json({ limit: '3mb' });
const upload = multer({
  dest: uploadDir,
  limits: {
    files: 25,
    fileSize: 50 * 1024 * 1024,
  },
});

const allowedOrigins = new Set([
  'https://q8-ux.github.io',
  'https://sabeq.legal',
  'https://www.sabeq.legal',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use((req, res, next) => {
  const origin = String(req.headers.origin || '');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

function aiClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function openDb() {
  if (!fs.existsSync(databasePath)) throw new Error('legal database not initialized');
  return new DatabaseSync(databasePath, { readOnly: true });
}

function normalizeSearchRecord(item) {
  return {
    id: item.id,
    title: item.title || '',
    summary: item.excerpt || item.summary || '',
    sourceUrl: item.source_url || '',
    lawNumber: item.law_number || null,
    lawYear: item.law_year || null,
    category: item.category || '',
    sourceType: item.document_type || 'مستند تشريعي',
    officialSource: item.official_source || 'وزارة العدل الكويتية',
  };
}

function legalContext(query, limit = 8) {
  if (!query || !fs.existsSync(databasePath)) return [];
  let db;
  try {
    db = openDb();
    const raw = findRelevantLegalContext(db, String(query), limit) || [];
    return raw.map(item => ({
      title: item.title || '',
      excerpt: item.excerpt || item.text || item.summary || item.raw_text || '',
      sourceUrl: item.source_url || item.sourceUrl || '',
      reference: item.reference || '',
      lawNumber: item.law_number || item.lawNumber || null,
      lawYear: item.law_year || item.lawYear || null,
    })).filter(item => item.title || item.excerpt);
  } catch (error) {
    console.error('Legal context lookup failed:', error.message);
    return [];
  } finally {
    try { db?.close(); } catch (_) {}
  }
}

function contextText(items) {
  if (!items.length) return 'لا توجد مقتطفات تشريعية مطابقة متاحة في المكتبة المحلية حالياً.';
  return items.map((item, index) => {
    const identity = [item.lawNumber ? `رقم ${item.lawNumber}` : '', item.lawYear ? `لسنة ${item.lawYear}` : ''].filter(Boolean).join(' ');
    return `[${index + 1}] ${item.title}${identity ? ` — ${identity}` : ''}\n${String(item.excerpt || '').slice(0, 3500)}\nالمصدر: ${item.sourceUrl || 'وزارة العدل الكويتية'}`;
  }).join('\n\n');
}

function openAiError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 401 || status === 403) return { status: 503, message: 'مفتاح OpenAI غير صالح أو غير مفعل في الخادم.' };
  if (status === 429) return { status: 503, message: 'تم بلوغ حد استخدام خدمة الذكاء الاصطناعي مؤقتاً. يرجى المحاولة بعد قليل.' };
  return { status: 503, message: 'تعذر تنفيذ الطلب الآن. يرجى المحاولة مجدداً.' };
}

function requireAi(res) {
  const client = aiClient();
  if (client) return client;
  res.status(503).json({ error: 'لم يتم إعداد مفتاح OpenAI على الخادم.' });
  return null;
}

function outputText(response) {
  return String(response?.output_text || '').trim();
}

function cleanJsonText(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseJsonOutput(value) {
  const clean = cleanJsonText(value);
  try { return JSON.parse(clean); } catch (_) {}
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {}
  }
  throw new Error('AI response was not valid JSON');
}

function normalizeAnalysis(value = {}) {
  const list = input => Array.isArray(input) ? input.map(item => String(item || '').trim()).filter(Boolean) : [];
  const parties = Array.isArray(value.parties) ? value.parties.map(item => ({
    name: String(item?.name || '').trim(),
    role: String(item?.role || '').trim(),
  })).filter(item => item.name || item.role) : [];
  return {
    caseType: String(value.caseType || '').trim(),
    caseNumber: String(value.caseNumber || '').trim(),
    court: String(value.court || '').trim(),
    clientName: String(value.clientName || '').trim(),
    phone: String(value.phone || '').trim(),
    partyRole: String(value.partyRole || '').trim(),
    otherParty: String(value.otherParty || '').trim(),
    legalIssues: list(value.legalIssues),
    facts: String(value.facts || '').trim(),
    requests: String(value.requests || '').trim(),
    parties,
    warnings: list(value.warnings),
  };
}

async function removeUploadedFiles(files = []) {
  await Promise.allSettled(files.map(file => fs.promises.unlink(file.path)));
}

async function deleteOpenAiFiles(client, ids = []) {
  await Promise.allSettled(ids.map(async id => {
    if (typeof client.files.del === 'function') return client.files.del(id);
    if (typeof client.files.delete === 'function') return client.files.delete(id);
  }));
}

app.get('/api/legal/health', (req, res) => {
  res.json({
    ok: true,
    ai: Boolean(process.env.OPENAI_API_KEY),
    database: fs.existsSync(databasePath),
    model: AI_MODEL,
  });
});

app.get('/api/legal/search', (req, res) => {
  let db;
  try {
    const q = String(req.query.q || '').trim().slice(0, 4000);
    if (!q) return res.status(400).json({ error: 'query_required', results: [] });
    const requestedLimit = Number(req.query.limit || 20);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 20, 50));
    db = openDb();
    const result = searchLegalDocuments(db, {
      query: q,
      category: String(req.query.category || '').trim().slice(0, 100),
      year: String(req.query.year || '').trim().slice(0, 10),
      documentType: String(req.query.type || '').trim().slice(0, 100),
      status: '',
      page: 1,
      limit,
    });
    const raw = Array.isArray(result) ? result : (result.items || result.documents || result.results || []);
    const results = raw.map(normalizeSearchRecord).filter(item => item.title);
    return res.json({ query: q, count: results.length, results });
  } catch (error) {
    console.error('Public legal search failed:', error.message);
    return res.status(503).json({ error: 'legal_research_unavailable', results: [] });
  } finally {
    try { db?.close(); } catch (_) {}
  }
});

app.post('/api/legal/assistant', jsonBody, async (req, res) => {
  const client = requireAi(res);
  if (!client) return;
  const question = String(req.body?.question || '').trim().slice(0, 12000);
  const language = String(req.body?.language || 'ar').trim().toLowerCase();
  if (!question) return res.status(400).json({ error: 'السؤال مطلوب.' });

  try {
    const sources = legalContext(question, 8);
    const languageInstruction = language === 'en'
      ? 'أجب بالإنجليزية مع إبقاء أسماء القوانين والمراجع العربية عند الحاجة.'
      : language === 'ur'
        ? 'أجب بالأردية مع إبقاء أسماء القوانين والمراجع العربية عند الحاجة.'
        : 'أجب بالعربية القانونية الواضحة.';
    const response = await client.responses.create({
      model: AI_MODEL,
      instructions: `أنت المساعد القانوني لمجموعة سابق القانونية في الكويت. ${languageInstruction} اعتمد على النصوص والمراجع المتاحة أدناه، ولا تختلق رقم قانون أو مادة أو حكم. إذا لم تتوافر معلومة موثقة فصرح بذلك. قدم جواباً عملياً ومباشراً، وبيّن أن الجواب معلومات قانونية عامة ولا يغني عن مراجعة محامٍ عند الحاجة.`,
      input: `سؤال المستخدم:\n${question}\n\nالمراجع القانونية المتاحة:\n${contextText(sources)}`,
    });
    const answer = outputText(response);
    if (!answer) throw new Error('Empty OpenAI response');
    return res.json({ answer, sources });
  } catch (error) {
    console.error('Public legal assistant failed:', error?.message || error);
    const mapped = openAiError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/legal/draft-tools', jsonBody, async (req, res) => {
  const client = requireAi(res);
  if (!client) return;
  const action = String(req.body?.action || '').trim();
  const text = String(req.body?.text || '').trim().slice(0, 30000);
  const context = String(req.body?.context || '').trim().slice(0, 12000);
  const caseType = String(req.body?.caseType || '').trim().slice(0, 200);
  if (!text) return res.status(400).json({ error: 'النص مطلوب.' });

  const actionInstructions = {
    improve_facts: 'أعد صياغة الوقائع بصياغة قانونية عربية محكمة ومنظمة زمنياً من دون اختلاق أي واقعة جديدة.',
    extract_requests: 'استخرج الطلبات القانونية من النص وحولها إلى طلبات نهائية واضحة ومرقمة من دون إضافة طلب غير مستفاد من النص.',
    improve_requests: 'حسّن صياغة الطلبات القانونية واجعلها دقيقة ومباشرة وقابلة للإدراج في مذكرة قضائية، من دون تغيير جوهرها.',
  };

  try {
    const sources = legalContext(`${caseType} ${context} ${text}`, 6);
    const response = await client.responses.create({
      model: AI_MODEL,
      instructions: `أنت محرر قانوني كويتي محترف. ${actionInstructions[action] || 'حسّن النص قانونياً ولغوياً من دون اختلاق معلومات.'} لا تختلق نصوص قوانين أو أرقام مواد.`,
      input: `نوع القضية: ${caseType || 'غير محدد'}\nالسياق: ${context || 'غير متاح'}\n\nالنص:\n${text}\n\nمراجع متاحة:\n${contextText(sources)}`,
    });
    const rewritten = outputText(response);
    if (!rewritten) throw new Error('Empty OpenAI response');
    return res.json({ text: rewritten, sources, sourceCount: sources.length });
  } catch (error) {
    console.error('Draft tools failed:', error?.message || error);
    const mapped = openAiError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/legal/memo', jsonBody, async (req, res) => {
  const client = requireAi(res);
  if (!client) return;
  const body = req.body || {};
  const facts = String(body.facts || '').trim().slice(0, 40000);
  const requests = String(body.requests || '').trim().slice(0, 20000);
  const issues = Array.isArray(body.legalIssues) ? body.legalIssues.join('، ') : String(body.legalIssues || '');
  const researchQuery = [body.caseType, issues, facts, requests].filter(Boolean).join(' ').slice(0, 18000);

  try {
    const sources = legalContext(researchQuery, 10);
    const caseData = {
      caseType: body.caseType || '',
      caseNumber: body.caseNumber || '',
      court: body.court || '',
      clientName: body.clientName || '',
      phone: body.phone || '',
      otherParty: body.otherParty || '',
      partyRole: body.partyRole || '',
      allParties: body.allParties || body.parties || [],
      legalIssues: body.legalIssues || [],
      facts,
      requests,
    };
    const response = await client.responses.create({
      model: AI_MODEL,
      instructions: 'أنت محامٍ كويتي متخصص في إعداد المذكرات القضائية. أنشئ مذكرة قانونية عربية احترافية متماسكة، تشمل بيانات الدعوى، الوقائع، الدفوع والأسانيد، ثم الطلبات الختامية. لا تختلق قانوناً أو مادة أو حكماً قضائياً. استخدم فقط المراجع المتاحة عندما تكون ذات صلة، وإذا لم يكف المرجع فصغ الحجة قانونياً دون نسب نص أو رقم غير موثق. لا تضف وقائع لم يقدمها المستخدم.',
      input: `بيانات القضية:\n${JSON.stringify(caseData, null, 2)}\n\nالمراجع القانونية المتاحة:\n${contextText(sources)}\n\nاكتب المذكرة النهائية بالعربية فقط.` ,
    });
    const memo = outputText(response);
    if (!memo) throw new Error('Empty OpenAI response');
    return res.json({ memo, sources });
  } catch (error) {
    console.error('Public memo generation failed:', error?.message || error);
    const mapped = openAiError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/legal/transcribe', upload.single('audio'), async (req, res) => {
  const client = requireAi(res);
  if (!client) {
    if (req.file) await removeUploadedFiles([req.file]);
    return;
  }
  if (!req.file) return res.status(400).json({ error: 'الملف الصوتي مطلوب.' });

  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: TRANSCRIBE_MODEL,
      language: 'ar',
    });
    const text = String(response?.text || '').trim();
    if (!text) throw new Error('Empty transcription');
    return res.json({ text });
  } catch (error) {
    console.error('Public transcription failed:', error?.message || error);
    const mapped = openAiError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  } finally {
    await removeUploadedFiles([req.file]);
  }
});

app.post('/api/legal/analyze-documents', upload.array('documents', 25), async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const client = requireAi(res);
  if (!client) {
    await removeUploadedFiles(files);
    return;
  }
  if (!files.length) return res.status(400).json({ error: 'أرفق مستنداً واحداً على الأقل.' });
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (totalBytes > 50 * 1024 * 1024) {
    await removeUploadedFiles(files);
    return res.status(413).json({ error: 'إجمالي المرفقات يتجاوز 50 ميجابايت.' });
  }

  const uploadedIds = [];
  try {
    const content = [{
      type: 'input_text',
      text: `حلل المستندات القانونية المرفقة واستخرج بيانات القضية فقط مما هو ظاهر فيها. أعد JSON فقط بهذه المفاتيح بالإنجليزية: caseType, caseNumber, court, clientName, phone, partyRole, otherParty, legalIssues (array), facts, requests, parties (array of {name,role}), warnings (array). لا تخمن بيانات غير موجودة؛ اتركها فارغة وأضف تنبيهاً في warnings عند الغموض. صغ facts والrequests بالعربية القانونية الواضحة.`,
    }];

    for (const file of files) {
      const mime = String(file.mimetype || '').toLowerCase();
      if (mime.startsWith('image/')) {
        const base64 = await fs.promises.readFile(file.path, { encoding: 'base64' });
        content.push({
          type: 'input_image',
          image_url: `data:${mime || 'image/jpeg'};base64,${base64}`,
        });
      } else {
        const uploaded = await client.files.create({
          file: fs.createReadStream(file.path),
          purpose: 'user_data',
        });
        uploadedIds.push(uploaded.id);
        content.push({ type: 'input_file', file_id: uploaded.id });
      }
    }

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions: 'أنت محلل مستندات قانونية كويتية. التزم بالنص الموجود في الملفات فقط ولا تخترع أسماء أو أرقام أو وقائع.',
      input: [{ role: 'user', content }],
    });

    const analysis = normalizeAnalysis(parseJsonOutput(outputText(response)));
    return res.json({ analysis });
  } catch (error) {
    console.error('Document analysis failed:', error?.message || error);
    const mapped = openAiError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  } finally {
    await deleteOpenAiFiles(client, uploadedIds);
    await removeUploadedFiles(files);
  }
});

function proxy(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${appPort}` };
  delete headers['content-length'];
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: appPort,
    path: req.originalUrl || req.url,
    method: req.method,
    headers,
  }, upstreamRes => {
    res.status(upstreamRes.statusCode || 502);
    Object.entries(upstreamRes.headers).forEach(([key, value]) => {
      if (value !== undefined) res.setHeader(key, value);
    });
    upstreamRes.pipe(res);
  });
  upstream.on('error', error => {
    console.error('Internal app proxy failed:', error.message);
    if (!res.headersSent) res.status(502).json({ error: 'application_unavailable' });
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

app.use((req, res) => proxy(req, res));

const server = app.listen(publicPort, () => {
  console.log(`SABEQ public legal gateway listening on http://localhost:${publicPort}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down gateway.`);
  try { child.kill('SIGTERM'); } catch (_) {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
