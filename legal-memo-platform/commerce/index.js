'use strict';
const express = require('express');
const crypto = require('node:crypto');
const { createStore } = require('./store');
const { createSettings, CommerceError, fail, channels } = require('./settings');
const { createProviders } = require('./providers');
const { createAuth } = require('./auth');
const { createOrders } = require('./orders');

function createCommerce({ env = process.env, directory, generateMemo, providers: injectedProviders, now = Date.now }) {
  const router = express.Router(); const json = express.json({ limit: '500kb' });
  let db, settings, auth, orders, initializationError;
  const providers = injectedProviders || createProviders();
  const ready = (async () => {
    try {
      db = await createStore(env, directory);
      settings = createSettings(db, env);
      auth = createAuth({ db, settings, providers, env, now });
      orders = createOrders({ db, settings, providers, env, generateMemo, now });
      return true;
    } catch (error) {
      initializationError = error.code || 'commerce_setup_required';
      // No connection strings or provider responses are logged.
      console.error('SABEQ commerce setup required:', initializationError);
      return false;
    }
  })();
  const guard = async () => { if (!await ready) fail(503, 'commerce_setup_required', 'خدمة الحسابات والدفع قيد الإعداد. لم يتم تحصيل أي مبلغ.'); };
  const wrap = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);
  // Express middleware needs to call next after authenticating.
  function authenticated(req, res, next) { guard().then(() => auth.userForSession(req)).then(user => { req.commerceUser = user; next(); }).catch(next); }
  function admin(req, res, next) { authenticated(req, res, error => {
    if (error) return next(error);
    if (req.commerceUser.role !== 'admin') return next(new CommerceError(403, 'admin_required', 'هذه الصفحة خاصة بالإدارة.'));
    next();
  }); }
  async function summary() {
    if (!await ready) return { ready: false, setupRequired: true, channels: [], paymentReady: false, priceFils: null, currency: 'KWD' };
    const config = await settings.read();
    return { ready: true, setupRequired: false, channels: channels(config), priceFils: config.priceFils > 0 ? config.priceFils : null,
      currency: 'KWD', environment: config.environment,
      paymentReady: Boolean(config.paymentProvider && config.paymentKey && config.webhookSecret && config.priceFils > 0 && (env.OPENAI_API_KEY || env.NODE_ENV === 'test')) };
  }
  router.get('/api/commerce/config', wrap(async (_req, res) => res.json(await summary())));
  router.post('/api/auth/request-code', json, wrap(async (req, res) => { await guard(); res.json(await auth.requestCode(req.body, req.ip)); }));
  router.post('/api/auth/verify-code', json, wrap(async (req, res) => { await guard(); res.json(await auth.verifyCode(req.body, req.ip)); }));
  router.get('/api/auth/session', authenticated, (req, res) => res.json({ user: req.commerceUser, authenticated: true, verified: true }));
  router.post('/api/auth/logout', wrap(async (req, res) => { await guard(); await auth.logout(req); res.json({ ok: true }); }));
  router.post('/api/admin/billing/login', json, wrap(async (req, res) => { await guard(); res.json(await auth.bootstrap(String(req.body.secret || ''), req.ip)); }));
  router.get('/api/admin/billing/settings', admin, wrap(async (_req, res) => res.json({ settings: settings.redact(await settings.read()), status: await summary(), storage: { durable: db.durable, kind: db.kind } })));
  router.put('/api/admin/billing/settings', json, admin, wrap(async (req, res) => { await settings.save(req.body, req.commerceUser.id); res.json({ ok: true, settings: settings.redact(await settings.read()), status: await summary() }); }));

  router.post('/api/orders', json, authenticated, wrap(async (req, res) => {
    await auth.rate('new-order:' + req.commerceUser.id, 30, 3600000);
    res.status(201).json({ order: await orders.create(req.commerceUser, req.body) });
  }));
  router.get('/api/orders', authenticated, wrap(async (req, res) => {
    const rows = (await db.query('SELECT * FROM commerce_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.commerceUser.id])).rows;
    res.json({ orders: rows.map(row => orders.view(row)) });
  }));
  router.get('/api/orders/:id', authenticated, wrap(async (req, res) => {
    const row = await orders.find(req.params.id, req.commerceUser.id);
    const files = (await db.query('SELECT f.id,f.name,f.mime,f.size_bytes FROM commerce_files f JOIN commerce_order_files ofi ON ofi.file_id=f.id WHERE ofi.order_id=$1 AND f.user_id=$2', [row.id, req.commerceUser.id])).rows;
    const refunds = (await db.query('SELECT id,status,provider_reference,created_at FROM commerce_refunds WHERE order_id=$1 AND user_id=$2 ORDER BY created_at DESC', [row.id, req.commerceUser.id])).rows;
    res.json({ order: orders.view(row, true), files, refunds });
  }));
  router.post('/api/orders/:id/checkout', json, authenticated, wrap(async (req, res) => {
    await auth.rate('checkout:' + req.commerceUser.id, 20, 3600000);
    res.json(await orders.checkout(req.commerceUser, req.params.id));
  }));
  router.post('/api/orders/:id/check-payment', json, authenticated, wrap(async (req, res) => {
    await orders.find(req.params.id, req.commerceUser.id);
    await auth.rate('check-payment:' + req.params.id, 10, 60000);
    res.json({ order: orders.view(await orders.check(req.params.id)) });
  }));
  router.post('/api/orders/:id/generate', json, authenticated, wrap(async (req, res) => res.status(202).json({ order: await orders.enqueue(req.params.id, req.commerceUser) })));
  router.post('/api/legal/memo', json, authenticated, wrap(async (req, res) => {
    if (!req.body.orderId) fail(402, 'payment_required', 'أنشئ طلب مذكرة وأكمل الدفع أولاً.');
    const order = await orders.enqueue(String(req.body.orderId), req.commerceUser);
    res.status(order.result ? 200 : 202).json(order.result || { order });
  }));
  // Retired prototype generation cannot bypass the paid, verified order path.
  router.post('/api/cases/:id/generate', (_req, res) => res.status(410).json({ error: 'استخدم خدمة المذكرات المرتبطة بحسابك والدفع.', code: 'use_verified_orders' }));
  router.get('/api/orders/:id/files/:fileId', authenticated, wrap(async (req, res) => {
    await orders.find(req.params.id, req.commerceUser.id);
    const file = (await db.query('SELECT f.* FROM commerce_files f JOIN commerce_order_files ofi ON ofi.file_id=f.id WHERE f.id=$1 AND ofi.order_id=$2 AND f.user_id=$3', [req.params.fileId, req.params.id, req.commerceUser.id])).rows[0];
    if (!file) fail(404, 'file_not_found', 'المرفق غير موجود.');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(file.name));
    res.send(Buffer.from(settings.decrypt(file.content, 'file:' + file.id), 'base64'));
  }));
  router.post('/api/orders/:id/refund-request', json, authenticated, wrap(async (req, res) => {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 3 || reason.length > 1000) fail(400, 'invalid_reason', 'اكتب سبب طلب الاسترداد.');
    await db.transaction(async tx => {
      const order = await orders.find(req.params.id, req.commerceUser.id, false, tx, true);
      if (order.payment_status !== 'paid') fail(409, 'not_paid', 'لا توجد دفعة مؤكدة لهذا الطلب.');
      const previous = (await tx.query("SELECT id FROM commerce_refunds WHERE order_id=$1 AND status IN ('requested','reviewing','submitted_to_bank')", [order.id])).rows[0];
      if (!previous) {
        await tx.query('INSERT INTO commerce_refunds(id,order_id,user_id,reason,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)', [crypto.randomUUID(), order.id, req.commerceUser.id, reason, now()]);
        await orders.audit(tx, req.commerceUser.id, 'refund_requested', order.id);
      }
    });
    res.json({ ok: true, message: 'تم تسجيل طلب الاسترداد للمراجعة. لم يُنفّذ استرداد مالي بعد.' });
  }));
  router.get('/api/admin/billing/orders', admin, wrap(async (_req, res) => {
    const rows = (await db.query('SELECT o.*,u.name FROM commerce_orders o JOIN commerce_users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 200')).rows;
    res.json({ orders: rows.map(row => ({ ...orders.view({ ...row, result: null }), customer: row.name })) });
  }));
  router.post('/api/admin/billing/orders/:id/retry', json, admin, wrap(async (req, res) => res.status(202).json({ order: await orders.enqueue(req.params.id, req.commerceUser, true) })));
  router.post('/api/admin/billing/orders/:id/check-payment', json, admin, wrap(async (req, res) => res.json({ order: orders.view(await orders.check(req.params.id)) })));
  router.get('/api/admin/billing/refunds', admin, wrap(async (_req, res) => res.json({ refunds: (await db.query('SELECT * FROM commerce_refunds ORDER BY created_at DESC LIMIT 200')).rows })));
  router.patch('/api/admin/billing/refunds/:id', json, admin, wrap(async (req, res) => {
    const status = String(req.body.status || ''); const reference = String(req.body.reference || '').trim().slice(0, 200);
    if (!['reviewing', 'declined', 'submitted_to_bank'].includes(status)) fail(400, 'invalid_refund_status', 'حالة المراجعة غير صالحة.');
    if (status === 'submitted_to_bank' && !reference) fail(400, 'reference_required', 'أدخل مرجع طلب الاسترداد لدى البنك.');
    const result = await db.query('UPDATE commerce_refunds SET status=$1,provider_reference=$2,updated_at=$3 WHERE id=$4 RETURNING order_id', [status, reference, now(), req.params.id]);
    if (!result.rowCount) fail(404, 'refund_not_found', 'طلب الاسترداد غير موجود.');
    await orders.audit(db, req.commerceUser.id, 'refund_reviewed', result.rows[0].order_id, { status, reference });
    res.json({ ok: true });
  }));
  router.get('/api/admin/billing/audit', admin, wrap(async (_req, res) => res.json({ events: (await db.query('SELECT * FROM commerce_audit ORDER BY created_at DESC LIMIT 200')).rows })));
  router.post('/api/payments/webhook', json, wrap(async (req, res) => {
    await guard(); const config = await settings.read();
    if (!providers.verifyWebhook(config, req.body, req.headers['myfatoorah-signature'])) fail(401, 'invalid_signature', 'توقيع الإشعار غير صالح.');
    const invoice = String(req.body.Data?.Invoice?.Id || '');
    const row = (await db.query('SELECT id FROM commerce_orders WHERE invoice_id=$1', [invoice])).rows[0];
    if (!row) fail(503, 'invoice_pending', 'لم تُحفظ العملية بعد؛ أعد إرسال الإشعار.');
    await auth.rate('webhook:' + invoice, 30, 60000);
    // Signature authenticates the notification; the authenticated API establishes payment facts.
    await orders.check(row.id);
    res.json({ received: true });
  }));
  function errorHandler(error, _req, res, next) {
    if (res.headersSent) return next(error);
    if (error instanceof CommerceError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'الطلب غير صالح.' });
    if (error?.type === 'entity.too.large' || error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'حجم الطلب يتجاوز الحد المسموح.', code: 'request_too_large' });
    if (error?.code === 'LIMIT_UNEXPECTED_FILE' || error?.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'عدد المرفقات أو نوع الحقل غير صالح.', code: 'invalid_files' });
    console.error('SABEQ commerce request failed:', error?.code || 'internal_error');
    res.status(500).json({ error: 'تعذر تنفيذ الطلب. بياناتك محفوظة؛ أعد المحاولة.', code: 'internal_error' });
  }
  router.use(errorHandler);
  let worker, reconciler, cleanup, ticking = false, reconciling = false;
  function startWorkers() {
    worker = setInterval(async () => { if (ticking || !await ready) return; ticking = true; try { await orders.tick(); } catch (_) {} finally { ticking = false; } }, 3000);
    reconciler = setInterval(async () => { if (reconciling || !await ready) return; reconciling = true; try { await orders.reconcile(); } catch (_) {} finally { reconciling = false; } }, 60000);
    cleanup = setInterval(async () => {
      if (!await ready) return;
      try {
        await db.query('DELETE FROM commerce_challenges WHERE expires_at<$1', [now() - 86400000]);
        await db.query('DELETE FROM commerce_sessions WHERE expires_at<$1', [now()]);
        await db.query('DELETE FROM commerce_limits WHERE expires_at<$1', [now()]);
        await db.query('DELETE FROM commerce_files WHERE id NOT IN (SELECT file_id FROM commerce_order_files) AND created_at<$1', [now() - 7 * 86400000]);
      } catch (_) {}
    }, 3600000);
    worker.unref(); reconciler.unref(); cleanup.unref();
  }
  return { router, ready, summary, requireUser: authenticated, errorHandler, startWorkers,
    limitAi: (req, _res, next) => auth.rate('ai:' + req.commerceUser.id, 40, 3600000).then(() => next()).catch(next),
    archiveUploads: async (userId, draftId, files) => { await guard(); return orders.archiveFiles(userId, draftId, files); },
    // Exposed to local integration tests and graceful shutdown, never through HTTP.
    internals: () => ({ db, settings, auth, orders }),
    async close() { clearInterval(worker); clearInterval(reconciler); clearInterval(cleanup); await ready; if (db) await db.close(); },
  };
}
module.exports = { createCommerce };
