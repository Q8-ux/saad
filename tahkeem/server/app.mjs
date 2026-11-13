import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import * as accounts from './accounts.mjs';
import { arbitratorReply } from './arbitrator.mjs';
import { attachmentPartSize, beginAttachment, downloadAttachment, listAttachments, removeAttachment, savePart } from './attachments.mjs';
import { catalog, libraryPage, saveReference, selectedSources, setReferenceApproval } from './library.mjs';
import { corpusByIds, corpusStats } from './corpus.mjs';
import { memoInput } from './memo-draft.mjs';
import { changeMemo, generateMemo, getMemo, memoDocx, needsCitationReview } from './memos.mjs';
import { getSessionAccount, HttpError, isUuid, limit, publicAccount, removeSession, requireThat,
  sessionCookie, textField } from './security.mjs';
import { one } from './store.mjs';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const methodsWithBody = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createApp({ db, origin, setupHash = '', setupUntil, model = null, storage = null, trustProxy = false }) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);
  const secureCookie = new URL(origin).protocol === 'https:';
  const canSetup = () => Boolean(setupHash) && (!setupUntil || Date.parse(setupUntil) > Date.now());
  const modelAvailable = async () => Boolean(model) && (!model.available || await model.available());

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Frame-Options': 'DENY',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    if (secureCookie) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.get('/healthz', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    await db.query('SELECT 1');
    res.json({ ok: true, app: 'tahkeem', release: '2.0.0', attachmentsConfigured: Boolean(storage) });
  });

  const api = express.Router();
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (methodsWithBody.has(req.method)) {
      requireThat(req.get('origin') === origin, 403, 'تعذر التحقق من مصدر الطلب.');
      if (req.method !== 'DELETE' && !(req.method === 'PUT' && req.is('application/octet-stream'))) {
        requireThat(req.is('application/json'), 415, 'صيغة الطلب غير مدعومة.');
      }
    }
    next();
  });
  api.use(express.json({ limit: '512kb', strict: true }));
  api.use((req, res, next) => {
    if (methodsWithBody.has(req.method) && req.method !== 'DELETE' && req.is('application/json')) {
      requireThat(req.body && !Array.isArray(req.body), 400, 'الطلب غير صالح.');
    }
    next();
  });

  api.get('/session', async (req, res) => {
    const account = await getSessionAccount(db, req);
    res.json({ account: publicAccount(account), modelAvailable: Boolean(account) && await modelAvailable(),
      attachmentsAvailable: Boolean(storage),
      setupAvailable: canSetup() && !account && !await accounts.ownerExists(db) });
  });

  async function sendSession(res, { account, session }) {
    sessionCookie(res, session, secureCookie);
    res.json({ account, modelAvailable: account.active && await modelAvailable(), attachmentsAvailable: Boolean(storage) });
  }

  api.post('/setup', async (req, res) => sendSession(res, await accounts.createOwner(db, req.body, canSetup() ? setupHash : '', req.ip)));
  api.post('/login', async (req, res) => sendSession(res, await accounts.login(db, req.body, req.ip)));
  api.post('/invite', async (req, res) => sendSession(res, await accounts.acceptInvite(db, req.body, req.ip)));
  api.post('/logout', async (req, res) => {
    await removeSession(db, req);
    sessionCookie(res, '', secureCookie, 0);
    res.json({ ok: true });
  });

  api.use(async (req, res, next) => {
    req.account = await getSessionAccount(db, req);
    requireThat(req.account, 401, 'سجّل الدخول للمتابعة.');
    next();
  });

  api.get('/subscription', async (req, res) => res.json({
    account: publicAccount(req.account), records: await accounts.renewals(db, req.account.id, req.account.role === 'owner'),
  }));

  api.use((req, res, next) => {
    requireThat(publicAccount(req.account).active, 403, 'الاشتراك غير نشط. تواصل مع مسؤول الحساب لتجديده.');
    next();
  });

  api.get('/overview', async (req, res) => {
    const counts = await one(db, `SELECT count(*) FILTER(WHERE status <> 'archived')::int AS open,
      count(*) FILTER(WHERE status='review')::int AS review,
      count(*) FILTER(WHERE status='approved')::int AS approved FROM memos WHERE account_id=$1`, [req.account.id]);
    const recent = await db.query(`SELECT id,title,memo_type,case_number,status,updated_at
      FROM memos WHERE account_id=$1 AND status <> 'archived' ORDER BY updated_at DESC LIMIT 5`, [req.account.id]);
    const [references, corpus] = await Promise.all([catalog(db),corpusStats(db)]);
    res.json({ counts, recent: recent.rows, references: {
      laws: references.filter(ref => ref.kind === 'law').length,
      articles: references.filter(ref => ref.kind === 'article').length + corpus.articles,
      corpus,
      judgments: references.filter(ref => ref.kind === 'judgment').length,
    } });
  });

  api.get('/library', async (req, res) => {
    const kind = textField(req.query.kind, 'نوع المرجع', 20);
    requireThat(['','law','article','judgment'].includes(kind), 400, 'نوع المرجع غير صالح.');
    const query = textField(req.query.q, 'البحث', 150);
    const category = textField(req.query.category, 'التصنيف', 80);
    const page = Number(req.query.page ?? 1);
    requireThat(Number.isInteger(page) && page >= 1 && page <= 1000, 400, 'الصفحة غير صالحة.');
    res.json(await libraryPage(db,{kind,query,category,page,pageSize:18}));
  });

  api.get('/corpus/:id', async (req, res) => {
    const id = textField(req.params.id, 'معرّف المرجع', 90, 3);
    const [record] = await corpusByIds(db,[id],true);
    requireThat(record,404,'المرجع غير موجود.');
    res.json(record);
  });

  api.post('/arbitrator', async (req, res) => {
    await limit(db, `arbitrator:${req.account.id}`, 36);
    if (req.body.allowModel === true) await limit(db, `model:${req.account.id}`, 12);
    res.json(await arbitratorReply(db, req.body, model));
  });

  api.get('/attachments', async (req, res) => res.json(await listAttachments(db, req.account.id, req.query.memoId)));
  api.post('/attachments', async (req, res) => {
    res.status(201).json(await beginAttachment(db, storage, req.account, req.body));
  });
  api.put('/attachments/:id/parts/:part', express.raw({ type: 'application/octet-stream', limit: attachmentPartSize, inflate: false }),
    async (req, res) => {
      requireThat(req.is('application/octet-stream'), 415, 'صيغة جزء الملف غير مدعومة.');
      requireThat(/^\d+$/.test(req.params.part), 400, 'رقم جزء الملف غير صالح.');
      res.json(await savePart(db, storage, req.account, req.params.id, Number(req.params.part), req.body));
    });
  api.delete('/attachments/:id', async (req, res) => {
    await removeAttachment(db, storage, req.account, req.params.id);
    res.sendStatus(204);
  });
  api.get('/attachments/:id/download', async (req, res) => {
    const { headers, stream } = await downloadAttachment(db, storage, req, req.params.id);
    res.set(headers);
    if (stream) await pipeline(stream, res);
    else res.end();
  });

  api.get('/memos', async (req, res) => {
    const query = textField(req.query.q, 'البحث', 140);
    const status = textField(req.query.status, 'الحالة', 20);
    requireThat(['','review','approved','archived'].includes(status), 400, 'حالة المذكرة غير صالحة.');
    const page = Number(req.query.page ?? 1);
    requireThat(Number.isInteger(page) && page >= 1 && page <= 100000, 400, 'الصفحة غير صالحة.');
    const params = [req.account.id, status, query];
    const where = `WHERE account_id=$1 AND ($2='' OR status=$2)
      AND ($3='' OR strpos(lower(title),lower($3)) > 0 OR strpos(case_number,$3) > 0)`;
    const [count, result] = await Promise.all([
      one(db, `SELECT count(*)::int AS total FROM memos ${where}`, params),
      db.query(`SELECT id,title,memo_type,case_number,status,updated_at FROM memos ${where}
        ORDER BY updated_at DESC, id LIMIT 30 OFFSET $4`, [...params,(page-1)*30]),
    ]);
    res.json({ items: result.rows, total: count.total, page, pageSize: 30 });
  });

  api.post('/memos', async (req, res) => {
    const input = memoInput(req.body);
    const ids = req.body.sourceIds ?? [];
    requireThat(Array.isArray(ids) && ids.length <= 8 && ids.every(id => typeof id === 'string' && id.length <= 90),
      400, 'اختر ثمانية مراجع أو أقل.');
    const method = req.body.method ?? 'template';
    requireThat(['template','model'].includes(method), 400, 'طريقة التوليد غير صالحة.');
    if (method === 'model') {
      requireThat(req.body.allowModel === true, 400, 'أكد إرسال ملخص القضية إلى خدمة الصياغة المهيأة.');
      await limit(db, `model:${req.account.id}`, 12);
    }
    const sources = await selectedSources(db, [...new Set(ids)]);
    const result = await generateMemo(db, req.account, req.body.id || randomUUID(), input, sources, method, model);
    res.status(201).json(result);
  });
  api.get('/memos/:id', async (req, res) => {
    const memo = await getMemo(db, req.account.id, req.params.id);
    res.json({ ...memo, needsCitationReview: needsCitationReview(memo), attachments: await listAttachments(db, req.account.id, memo.id) });
  });
  api.patch('/memos/:id', async (req, res) => res.json(await changeMemo(db, req.account.id, req.params.id, req.body)));
  api.get('/memos/:id/word', async (req, res) => {
    const memo = await getMemo(db, req.account.id, req.params.id);
    const doc = await memoDocx(memo);
    res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', `attachment; filename="Tahkeem-${memo.id}.docx"; filename*=UTF-8''${encodeURIComponent(memo.title + '.docx').replace(/'/g,'%27')}`);
    res.send(doc);
  });

  const owner = express.Router();
  owner.use((req, res, next) => {
    requireThat(req.account.role === 'owner', 403, 'هذه الصلاحية مخصصة للمالك.');
    next();
  });
  owner.get('/clients', async (req, res) => res.json(await accounts.listClients(db)));
  owner.post('/clients', async (req, res) => res.status(201).json(await accounts.createClient(db, req.body, origin)));
  owner.patch('/clients/:id', async (req, res) => res.json(await accounts.setClientState(db, req.params.id, req.body.enabled)));
  owner.post('/clients/:id/invite', async (req, res) => res.json(await accounts.issueInvite(db, req.params.id, origin)));
  owner.post('/clients/:id/renewals', async (req, res) => res.status(201).json(await accounts.renew(db, req.params.id, req.account.id, req.body)));
  owner.post('/references', async (req, res) => res.status(201).json(await saveReference(db, req.body)));
  owner.patch('/references/:id', async (req, res) => {
    requireThat(isUuid(req.params.id), 404, 'المرجع غير موجود.');
    requireThat(typeof req.body.approved === 'boolean' && (!req.body.approved || req.body.checked === true), 400,
      'أكد مراجعة النسخة والموضع قبل إتاحة المرجع للاستشهاد.');
    res.json(await setReferenceApproval(db, req.params.id, req.body.approved));
  });
  api.use('/owner', owner);
  api.use((req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));
  app.use('/api', api);
  app.use(express.static(publicDir, { dotfiles: 'ignore', index: 'index.html',
    setHeaders: (res, file) => res.set('Cache-Control', file.endsWith('.html') ? 'no-store' : 'public, max-age=900') }));
  app.use((req, res) => res.sendStatus(404));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'حجم الطلب أكبر من الحد المسموح.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'صيغة البيانات غير صالحة.' });
    console.error('Request failed', error.code || error.name);
    res.status(500).json({ error: 'تعذر تنفيذ الطلب. أعد المحاولة.' });
  });
  return app;
}
