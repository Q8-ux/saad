const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');
const OpenAI = require('openai');
const { spawn } = require('child_process');
const {
  ensureLegalSchema,
  findRelevantLegalContext,
  getLegalDocument,
  getLegalStats,
  searchLegalDocuments,
  upsertManifest,
} = require('./legal-library');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const databasePath = path.join(dataDir, 'legal-memo.db');
const compressedLibrarySeed = path.join(__dirname, 'seed', 'legal-library.sqlite.gz');
if (!fs.existsSync(databasePath) && fs.existsSync(compressedLibrarySeed)) {
  try {
    const seed = zlib.gunzipSync(fs.readFileSync(compressedLibrarySeed));
    if (!seed.subarray(0, 16).toString('utf8').startsWith('SQLite format 3')) {
      throw new Error('seed is not a SQLite database');
    }
    fs.writeFileSync(databasePath, seed, { mode: 0o600 });
    console.log('Loaded the Ministry legal library seed database.');
  } catch (error) {
    console.error('Legal library seed could not be loaded:', error.message);
  }
}

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lawyer',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    court TEXT,
    case_number TEXT,
    case_type TEXT NOT NULL,
    client_role TEXT NOT NULL,
    facts TEXT NOT NULL,
    claims TEXT NOT NULL,
    opponent_arguments TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
ensureLegalSchema(db);
try {
  const seedPath = path.join(__dirname, 'seed', 'moj-laws-manifest.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  if (Array.isArray(seed.documents) && seed.documents.length) {
    upsertManifest(db, seed.documents, seed.source_page);
  }
} catch (error) {
  console.error('MOJ legal manifest seed could not be loaded:', error.message);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'legal.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  store: new FileStore({ path: path.join(dataDir, 'sessions'), retries: 1, ttl: 60 * 60 * 12 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 12 }
}));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    cb(allowed.has(file.mimetype) ? null : new Error('نوع الملف غير مدعوم'), allowed.has(file.mimetype));
  }
});

function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
  next();
}
function ownedCase(caseId, userId) {
  return db.prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?').get(caseId, userId);
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: true, ai: Boolean(process.env.OPENAI_API_KEY) }));
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user });
});
app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || !email.includes('@') || password.length < 8) return res.status(400).json({ error: 'تحقق من الاسم والبريد وكلمة مرور من 8 أحرف على الأقل' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    req.session.userId = Number(result.lastInsertRowid);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'البريد مسجل مسبقاً' });
    res.status(500).json({ error: 'تعذر إنشاء الحساب' });
  }
});
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  req.session.userId = user.id;
  res.json({ ok: true });
});
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/cases', auth, (req, res) => {
  const cases = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM documents d WHERE d.case_id=c.id) documents_count,
    (SELECT COUNT(*) FROM memos m WHERE m.case_id=c.id) memos_count FROM cases c WHERE c.user_id=? ORDER BY c.id DESC`).all(req.session.userId);
  res.json({ cases });
});
app.post('/api/cases', auth, (req, res) => {
  const b = req.body;
  if (!b.title || !b.caseType || !b.clientRole || !b.facts || !b.claims) return res.status(400).json({ error: 'أكمل الحقول الإلزامية' });
  const result = db.prepare(`INSERT INTO cases (user_id,title,court,case_number,case_type,client_role,facts,claims,opponent_arguments)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(req.session.userId, b.title, b.court || '', b.caseNumber || '', b.caseType, b.clientRole, b.facts, b.claims, b.opponentArguments || '');
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});
app.get('/api/cases/:id', auth, (req, res) => {
  const item = ownedCase(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: 'القضية غير موجودة' });
  const documents = db.prepare('SELECT id, original_name, mime_type, size_bytes, created_at FROM documents WHERE case_id=? AND user_id=? ORDER BY id DESC').all(item.id, req.session.userId);
  const memos = db.prepare('SELECT * FROM memos WHERE case_id=? AND user_id=? ORDER BY id DESC').all(item.id, req.session.userId);
  res.json({ case: item, documents, memos });
});
app.post('/api/cases/:id/documents', auth, upload.array('documents', 8), (req, res) => {
  const item = ownedCase(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: 'القضية غير موجودة' });
  const insert = db.prepare('INSERT INTO documents (case_id,user_id,original_name,stored_name,mime_type,size_bytes) VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN');
  try { (req.files || []).forEach(f => insert.run(item.id, req.session.userId, f.originalname, f.filename, f.mimetype, f.size)); db.exec('COMMIT'); }
  catch (error) { db.exec('ROLLBACK'); throw error; }
  res.status(201).json({ uploaded: (req.files || []).length });
});
app.get('/api/documents/:id/download', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id=? AND user_id=?').get(req.params.id, req.session.userId);
  if (!doc) return res.status(404).json({ error: 'المستند غير موجود' });
  res.download(path.join(uploadDir, doc.stored_name), doc.original_name);
});
app.get('/api/legal-library/stats', auth, (_req, res) => {
  res.json(getLegalStats(db));
});
app.get('/api/legal-library', auth, (req, res) => {
  res.json(searchLegalDocuments(db, {
    query: req.query.q || '',
    category: req.query.category || '',
    year: req.query.year || '',
    documentType: req.query.type || '',
    status: req.query.status || '',
    page: req.query.page || 1,
    limit: req.query.limit || 20,
  }));
});
app.get('/api/legal-library/:id', auth, (req, res) => {
  const document = getLegalDocument(db, Number(req.params.id));
  if (!document) return res.status(404).json({ error: 'المستند القانوني غير موجود' });
  res.json({ document });
});

app.post('/api/cases/:id/generate', auth, async (req, res) => {
  const item = ownedCase(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: 'القضية غير موجودة' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'لم يتم إعداد مفتاح OpenAI' });
  const docs = db.prepare('SELECT original_name FROM documents WHERE case_id=? AND user_id=?').all(item.id, req.session.userId).map(x => x.original_name);
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const instructions = String(req.body.instructions || 'حلل نقاط القوة والضعف وصغ مذكرة متوازنة وقوية.');
  const legalQuery = [item.case_type, item.facts, item.claims, item.opponent_arguments, instructions].filter(Boolean).join(' ');
  const legalSources = findRelevantLegalContext(db, legalQuery, 10);
  const legalContext = legalSources.length
    ? legalSources.map((source, index) => `[مصدر ${index + 1}] ${source.title}${source.reference ? ` - ${source.reference}` : ''}\n${source.excerpt}\nالرابط الرسمي: ${source.source_url}`).join('\n\n')
    : 'لا توجد مقتطفات مسترجعة من المكتبة القانونية بعد.';
  const system = `أنت مساعد صياغة قانونية كويتي. اكتب مسودة مذكرة دفاع مهنية بالعربية الفصحى، ولا تختلق مواد أو أحكاماً أو وقائع. ميّز بوضوح بين الوقائع المقدمة والاستنتاج القانوني. إذا نقصت معلومة مؤثرة فاذكرها في قسم مستقل بعنوان البيانات المطلوب استكمالها. استخدم الهيكل: الديباجة، الموضوع، موجز الوقائع، نقاط النزاع، الدفوع مرتبة، مناقشة مستندات الخصم، الطلبات، التحفظات. لا تدّع أن المسودة بديل عن مراجعة محامٍ مرخص.`;
  const prompt = `عنوان القضية: ${item.title}\nالمحكمة: ${item.court || 'غير محددة'}\nرقم القضية: ${item.case_number || 'غير محدد'}\nالنوع: ${item.case_type}\nصفة العميل: ${item.client_role}\nالوقائع: ${item.facts}\nالطلبات: ${item.claims}\nدفوع الخصم: ${item.opponent_arguments || 'غير مدخلة'}\nأسماء المرفقات المتاحة: ${docs.join('، ') || 'لا يوجد'}\nتعليمات إضافية: ${instructions}\n\nمقتطفات من مكتبة وزارة العدل المفهرسة آلياً:\n${legalContext}\n\nتعليمات الاستشهاد: لا تنسب مادة أو حكمًا إلا إذا ورد نصه في المقتطفات أعلاه، واذكر اسم المصدر الرسمي ورابطه، ونبّه إلى ضرورة التحقق من النفاذ وآخر التعديلات قبل الإيداع.`;
  try {
    const response = await client.responses.create({ model, instructions: system, input: prompt, temperature: 0.2 });
    const content = response.output_text?.trim();
    if (!content) throw new Error('empty response');
    const title = `مذكرة دفاع — ${item.title}`;
    const result = db.prepare('INSERT INTO memos (case_id,user_id,title,content,model) VALUES (?,?,?,?,?)').run(item.id, req.session.userId, title, content, model);
    res.status(201).json({ memo: { id: Number(result.lastInsertRowid), title, content, model } });
  } catch (error) {
    console.error('AI generation failed:', error.status || error.code || error.message);
    res.status(502).json({ error: 'تعذر توليد المذكرة حالياً. تحقق من رصيد وحالة مشروع OpenAI.' });
  }
});

app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || 'تعذر تنفيذ الطلب' }));
app.listen(port, () => {
  console.log(`Legal Memo Platform running on http://localhost:${port}`);
  if (process.env.MOJ_AUTO_SYNC === 'true') {
    const ingest = spawn(process.execPath, [path.join(__dirname, 'scripts', 'ingest-moj-laws.js')], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
    });
    ingest.on('error', error => console.error('MOJ legal library sync could not start:', error.message));
    ingest.on('exit', code => console.log(`MOJ legal library sync finished with code ${code}`));
  }
});
