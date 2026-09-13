'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const { fail, digest } = require('./settings');

function normalizeDraft(input) {
  const limits = { caseType: 200, caseNumber: 150, court: 200, clientName: 200, phone: 40,
    otherParty: 500, partyRole: 100, facts: 40000, requests: 20000 };
  const draft = {};
  for (const [field, limit] of Object.entries(limits)) {
    draft[field] = String(input[field] || '').trim();
    if (draft[field].length > limit) fail(400, 'draft_too_long', 'بعض حقول المذكرة تتجاوز الحد المسموح.');
  }
  for (const field of ['caseType', 'court', 'clientName', 'otherParty', 'partyRole', 'facts', 'requests']) {
    if (!draft[field]) fail(400, 'incomplete_draft', 'أكمل بيانات القضية والوقائع والطلبات قبل الدفع.');
  }
  draft.legalIssues = (Array.isArray(input.legalIssues) ? input.legalIssues : input.legalIssues ? [input.legalIssues] : []).slice(0, 30).map(x => String(x).slice(0, 500));
  draft.parties = Array.isArray(input.allParties || input.parties) ? (input.allParties || input.parties).slice(0, 50).map(x => ({ name: String(x.name || '').slice(0, 200), role: String(x.role || '').slice(0, 100) })) : [];
  return draft;
}

function createOrders({ db, settings, providers, env, generateMemo, now = Date.now }) {
  const active = new Set();
  const publicOrigin = env.SABEQ_PUBLIC_URL || 'https://www.sabeq.legal/';
  const frontend = new URL(publicOrigin);
  if (frontend.protocol !== 'https:' || frontend.username || frontend.password || frontend.search || frontend.hash) throw new Error('SABEQ_PUBLIC_URL must be a clean HTTPS frontend URL');
  const audit = (tx, actor, action, orderId, detail = {}) => tx.query('INSERT INTO commerce_audit(id,actor_id,action,order_id,detail,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), actor, action, orderId, JSON.stringify(detail), now()]);
  async function find(id, userId, admin = false, tx = db, lock = false) {
    const row = (await tx.query('SELECT * FROM commerce_orders WHERE id=$1' + (admin ? '' : ' AND user_id=$2') + (lock ? tx.lock : ''), admin ? [id] : [id, userId])).rows[0];
    if (!row) fail(404, 'order_not_found', 'الطلب غير موجود.');
    return row;
  }
  function view(row, includeDraft = false) {
    const result = { id: row.id, amountFils: row.amount_fils, currency: row.currency,
      paymentStatus: row.payment_status, generationStatus: row.generation_status,
      environment: row.environment, createdAt: Number(row.created_at), paidAt: row.paid_at ? Number(row.paid_at) : null,
      paymentReference: row.payment_reference || '', lastError: row.last_error || '',
      canRetry: row.payment_status === 'paid' && row.generation_status === 'failed' && row.generation_attempts < 3 };
    if (row.result) result.result = JSON.parse(settings.decrypt(row.result, 'result:' + row.id));
    if (includeDraft) result.draft = JSON.parse(settings.decrypt(row.draft, 'draft:' + row.id));
    return result;
  }
  async function create(user, input) {
    const draft = normalizeDraft(input.draft || input);
    const requestKey = String(input.requestKey || '');
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey)) fail(400, 'request_key_required', 'معرّف الطلب غير صالح.');
    const files = Array.isArray(input.fileIds) ? [...new Set(input.fileIds)].slice(0, 25) : [];
    if (files.some(x => !/^[a-f0-9-]{36}$/.test(String(x)))) fail(400, 'invalid_file', 'معرّف مرفق غير صالح.');
    const draftHash = digest(JSON.stringify({ draft, files: [...files].sort() }));
    return db.transaction(async tx => {
      const config = await settings.read(tx);
      if (!Number.isInteger(config.priceFils) || config.priceFils <= 0) fail(503, 'price_not_configured', 'سعر الخدمة لم يُعتمد بعد.');
      const id = crypto.randomUUID();
      const inserted = await tx.query('INSERT INTO commerce_orders(id,user_id,request_key,draft_hash,draft,amount_fils,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7) ON CONFLICT(user_id,request_key) DO NOTHING RETURNING id', [id, user.id, requestKey, draftHash, settings.encrypt(JSON.stringify(draft), 'draft:' + id), config.priceFils, now()]);
      const row = (await tx.query('SELECT * FROM commerce_orders WHERE user_id=$1 AND request_key=$2' + tx.lock, [user.id, requestKey])).rows[0];
      if (row.draft_hash !== draftHash) fail(409, 'request_changed', 'تغيّرت بيانات الطلب؛ أنشئ طلباً جديداً.');
      if (inserted.rowCount) {
        for (const fileId of files) {
          const attached = await tx.query('INSERT INTO commerce_order_files(order_id,file_id) SELECT $1,id FROM commerce_files WHERE id=$2 AND user_id=$3 RETURNING file_id', [row.id, fileId, user.id]);
          if (!attached.rowCount) fail(400, 'invalid_file', 'أحد المرفقات غير متاح لهذا الطلب.');
        }
        await audit(tx, user.id, 'order_created', row.id);
      }
      return view(row, true);
    });
  }
  async function check(id) {
    const order = await find(id, '', true);
    if (order.payment_status === 'paid' || !order.provider || order.payment_status === 'unpaid') return order;
    const current = await settings.read();
    if (current.paymentProvider !== order.provider || current.environment !== order.environment) fail(409, 'provider_changed', 'تحتاج العملية إلى مراجعة إعدادات بوابة الدفع.');
    const result = await providers.checkPayment(current, order);
    return db.transaction(async tx => {
      const locked = await find(id, '', true, tx, true);
      if (locked.payment_status === 'paid') return locked;
      if (result.status === 'paid') {
        if (locked.invoice_id && locked.invoice_id !== result.invoiceId) fail(409, 'payment_mismatch', 'مرجع الدفع لا يطابق الطلب.');
        await tx.query("UPDATE commerce_orders SET payment_status='paid',invoice_id=$1,payment_reference=$2,paid_at=$3,generation_status='queued',last_error=NULL,updated_at=$3 WHERE id=$4", [result.invoiceId, result.reference, now(), id]);
        await audit(tx, 'payment-provider', 'payment_verified', id, { invoiceId: result.invoiceId });
      } else {
        await tx.query('UPDATE commerce_orders SET payment_status=$1,invoice_id=$2,updated_at=$3 WHERE id=$4', [result.status, result.invoiceId, now(), id]);
      }
      return find(id, '', true, tx);
    });
  }
  async function checkout(user, id) {
    const decision = await db.transaction(async tx => {
      await tx.query("INSERT INTO commerce_settings(name,value,updated_at) VALUES ('settings_lock','',0) ON CONFLICT(name) DO NOTHING");
      await tx.query("SELECT name FROM commerce_settings WHERE name='settings_lock'" + tx.lock);
      const config = await settings.read(tx);
      if (!config.paymentProvider || !config.paymentKey || !config.webhookSecret) fail(503, 'payment_not_configured', 'بوابة الدفع لم تُفعّل بعد.');
      if (!env.OPENAI_API_KEY && env.NODE_ENV !== 'test') fail(503, 'generation_not_configured', 'خدمة التوليد غير جاهزة حالياً؛ لم يتم تحصيل أي مبلغ.');
      if ((env.RENDER === 'true' || env.NODE_ENV === 'production') && config.environment !== 'live' && user.role !== 'admin') fail(503, 'payment_test_mode', 'الدفع ما زال قيد الاختبار.');
      const row = await find(id, user.id, false, tx, true);
      if (row.payment_status === 'paid') return { row };
      if (row.payment_status !== 'unpaid') return { row, existing: true };
      await tx.query("UPDATE commerce_orders SET payment_status='creating',provider=$1,environment=$2,checkout_started_at=$3,updated_at=$3 WHERE id=$4", [config.paymentProvider, config.environment, now(), id]);
      await audit(tx, user.id, 'checkout_started', id);
      return { row, config };
    });
    if (decision.existing) {
      if (decision.row.checkout_url && decision.row.payment_status === 'pending') return { order: view(decision.row), checkoutUrl: providers.safeCheckoutUrl(decision.row.checkout_url) };
      return { order: view(decision.row), pending: ['creating', 'unknown'].includes(decision.row.payment_status) };
    }
    if (!decision.config) return { order: view(decision.row) };
    const returnUrl = new URL(frontend); returnUrl.searchParams.set('sabeqOrder', id);
    try {
      const result = await providers.createPayment(decision.config, decision.row, user, returnUrl.href);
      await db.query("UPDATE commerce_orders SET invoice_id=$1,checkout_url=$2,payment_status=CASE WHEN payment_status='paid' THEN 'paid' ELSE 'pending' END,updated_at=$3 WHERE id=$4", [result.invoiceId, result.checkoutUrl, now(), id]);
      const current = await find(id, user.id);
      return { order: view(current), ...(current.payment_status === 'paid' ? {} : { checkoutUrl: result.checkoutUrl }) };
    } catch (error) {
      // A timeout may occur AFTER the provider creates an invoice. Never automatically create another.
      await db.query("UPDATE commerce_orders SET payment_status='unknown',last_error='payment_confirmation_required',updated_at=$1 WHERE id=$2 AND payment_status='creating'", [now(), id]);
      throw error;
    }
  }
  async function run(id) {
    if (active.has(id)) return;
    active.add(id);
    let token;
    try {
      const row = await db.transaction(async tx => {
        const locked = await find(id, '', true, tx, true);
        if (locked.payment_status !== 'paid' || !['queued', 'waiting'].includes(locked.generation_status) || locked.generation_attempts >= 3) return null;
        token = crypto.randomUUID();
        await tx.query("UPDATE commerce_orders SET generation_status='processing',generation_token=$1,generation_started_at=$2,generation_attempts=generation_attempts+1,updated_at=$2 WHERE id=$3", [token, now(), id]);
        await audit(tx, 'generation-worker', 'generation_started', id);
        return locked;
      });
      if (!row) return;
      const draft = JSON.parse(settings.decrypt(row.draft, 'draft:' + id));
      const result = await generateMemo(draft);
      if (!result || typeof result.memo !== 'string' || !result.memo.trim()) throw new Error('empty_generation');
      await db.transaction(async tx => {
        const saved = await tx.query("UPDATE commerce_orders SET result=$1,generation_status='completed',last_error=NULL,updated_at=$2 WHERE id=$3 AND generation_token=$4 AND generation_status='processing' AND payment_status='paid' RETURNING id", [settings.encrypt(JSON.stringify(result), 'result:' + id), now(), id, token]);
        if (saved.rowCount) await audit(tx, 'generation-worker', 'generation_completed', id);
      });
    } catch (_) {
      if (token) await db.query("UPDATE commerce_orders SET generation_status='failed',last_error='generation_failed',updated_at=$1 WHERE id=$2 AND generation_token=$3 AND generation_status='processing'", [now(), id, token]);
    } finally { active.delete(id); }
  }
  async function enqueue(id, user, admin = false) {
    await db.transaction(async tx => {
      const row = await find(id, user.id, admin, tx, true);
      if (row.payment_status !== 'paid') fail(402, 'payment_required', 'يلزم تأكيد الدفع قبل توليد المذكرة.');
      if (row.generation_status === 'failed') {
        if (!admin && row.generation_attempts >= 3) fail(409, 'support_required', 'يرجى التواصل مع الإدارة؛ مبلغك محفوظ لهذا الطلب.');
        await tx.query("UPDATE commerce_orders SET generation_status='queued',generation_attempts=$1,updated_at=$2 WHERE id=$3", [admin ? 0 : row.generation_attempts, now(), id]);
        await audit(tx, user.id, 'generation_retry', id);
      }
    });
    return view(await find(id, user.id, admin));
  }
  async function tick() {
    // Recover interrupted jobs conservatively; retries remain tied to the paid immutable draft.
    await db.query("UPDATE commerce_orders SET generation_status='failed',last_error='generation_interrupted' WHERE generation_status='processing' AND generation_started_at<$1", [now() - 10 * 60 * 1000]);
    const rows = (await db.query("SELECT id FROM commerce_orders WHERE payment_status='paid' AND generation_status IN ('queued','waiting') ORDER BY created_at LIMIT 2")).rows;
    await Promise.allSettled(rows.map(row => run(row.id)));
  }
  async function reconcile() {
    const rows = (await db.query("SELECT id FROM commerce_orders WHERE payment_status IN ('pending','unknown','creating') AND checkout_started_at<$1 AND created_at>$2 ORDER BY updated_at LIMIT 10", [now() - 30000, now() - 30 * 86400000])).rows;
    for (const row of rows) { try { await check(row.id); } catch (_) { await db.query('UPDATE commerce_orders SET updated_at=$1 WHERE id=$2', [now(), row.id]); } }
  }
  async function archiveFiles(userId, draftId, files) {
    if (!/^[a-f0-9-]{36}$/.test(draftId || '')) fail(400, 'invalid_draft_id', 'معرّف المرفقات غير صالح.');
    if (files.reduce((sum, f) => sum + f.size, 0) > 50 * 1024 * 1024) fail(413, 'files_too_large', 'إجمالي المرفقات يتجاوز 50 ميجابايت.');
    const ids = [];
    for (const file of files) {
      const bytes = await fs.readFile(file.path); const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const id = crypto.randomUUID();
      const found = await db.transaction(async tx => {
        await tx.query('SELECT id FROM commerce_users WHERE id=$1' + tx.lock, [userId]);
        const old = (await tx.query('SELECT id FROM commerce_files WHERE user_id=$1 AND draft_id=$2 AND file_hash=$3', [userId, draftId, hash])).rows[0];
        if (old) return old.id;
        const total = (await tx.query('SELECT COALESCE(SUM(size_bytes),0) AS total FROM commerce_files WHERE user_id=$1', [userId])).rows[0];
        if (Number(total.total) + bytes.length > 200 * 1024 * 1024) fail(413, 'storage_limit', 'وصلت إلى حد حفظ المرفقات؛ تواصل مع الإدارة.');
        await tx.query('INSERT INTO commerce_files(id,user_id,draft_id,file_hash,name,mime,size_bytes,content,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, userId, draftId, hash, file.originalname.slice(0, 200), file.mimetype, bytes.length, settings.encrypt(bytes.toString('base64'), 'file:' + id), now()]);
        return id;
      });
      ids.push(found);
    }
    return ids;
  }
  return { create, find, view, checkout, check, enqueue, run, tick, reconcile, archiveFiles, audit };
}
module.exports = { createOrders, normalizeDraft };
