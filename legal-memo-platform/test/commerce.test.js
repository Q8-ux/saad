'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createCommerce } = require('../commerce');
const { createProviders } = require('../commerce/providers');
const { createStore } = require('../commerce/store');

const draft = { caseType: 'مدني', court: 'المحكمة الكلية', clientName: 'عميل الاختبار', otherParty: 'الخصم', partyRole: 'مدعٍ', facts: 'وقائع اختبار خاصة لا تظهر في السجلات', requests: 'إلزام المدعى عليه بالتنفيذ' };
async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sabeq-commerce-'));
  let postgres, schema, databaseUrl;
  if (process.env.TEST_DATABASE_URL) {
    const { Pool } = require('pg');
    postgres = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    schema = 'test_commerce_' + crypto.randomBytes(12).toString('hex');
    await postgres.query('CREATE SCHEMA ' + schema);
    const url = new URL(process.env.TEST_DATABASE_URL);
    url.searchParams.set('options', '-c search_path=' + schema);
    databaseUrl = url.href;
  }
  let clock = Date.now(), creates = 0, generations = 0;
  const sent = []; const paid = new Set(); const invoices = new Map();
  const realProviders = createProviders();
  const providers = { ...realProviders,
    async sendCode(config, challenge, code) { sent.push({ ...challenge, code }); return 'email-delivery'; },
    async verifyCode(_config, challenge, code) { return sent.some(x => x.id === challenge.id && x.code === code); },
    async createPayment(_config, order) {
      creates++;
      const invoiceId = String(100 + creates); invoices.set(order.id, invoiceId);
      if (options.checkoutFailure) throw new Error('network_timeout_after_creation');
      return { invoiceId, checkoutUrl: 'https://demo.myfatoorah.com/invoice/' + invoiceId };
    },
    async checkPayment(_config, order) {
      const data = { InvoiceId: invoices.get(order.id), CustomerReference: order.id, InvoiceValue: order.amount_fils / 1000,
        InvoiceStatus: paid.has(order.id) ? 'Paid' : 'Pending',
        InvoiceTransactions: paid.has(order.id) ? [{ TransactionStatus: 'Succss', Currency: 'KD', PaymentId: 'payment-' + order.id }] : [] };
      return realProviders.validateStatus(data, order);
    },
  };
  const env = { NODE_ENV: 'test', ...(databaseUrl ? { SABEQ_DATABASE_URL: databaseUrl } : {}), SABEQ_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    SABEQ_ADMIN_BOOTSTRAP_SECRET: crypto.randomBytes(32).toString('hex'), SABEQ_PAYMENT_PROVIDER: 'myfatoorah',
    SABEQ_PAYMENT_ENVIRONMENT: 'test', SABEQ_PAYMENT_KEY: 'test-bank-secret', SABEQ_WEBHOOK_SECRET: 'test-webhook-secret',
    SABEQ_MEMO_PRICE_FILS: '1500', SABEQ_VERIFICATION_CHANNELS: 'email', SABEQ_RESEND_KEY: 'test-email-secret', SABEQ_EMAIL_FROM: 'no-reply@example.test', ...options.env };
  const commerce = createCommerce({ env, directory, providers, now: () => clock, generateMemo: async () => {
    generations++;
    if (options.generationFailure && generations === 1) throw new Error('upstream_unavailable');
    return { memo: 'مسودة محفوظة للطلب فقط', sources: [] };
  } });
  assert.equal(await commerce.ready, true);
  const app = express(); app.use(commerce.router);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  async function api(url, body, token, method, extraHeaders = {}) {
    const response = await fetch(origin + url, { method: method || (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  async function login(email = 'customer@example.test') {
    const requested = await api('/api/auth/request-code', { name: 'مستخدم', email, channel: 'email' });
    assert.equal(requested.status, 200, JSON.stringify(requested.body));
    const challenge = sent.find(x => x.id === requested.body.challengeId);
    const result = await api('/api/auth/verify-code', { challengeId: challenge.id, code: challenge.code });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body;
  }
  async function order(token, data = {}) {
    const result = await api('/api/orders', { draft, requestKey: crypto.randomUUID(), ...data }, token);
    assert.equal(result.status, 201, JSON.stringify(result.body)); return result.body.order;
  }
  t.after(async () => {
    await new Promise(resolve => server.close(resolve)); await commerce.close();
    if (postgres) { await postgres.query('DROP SCHEMA ' + schema + ' CASCADE'); await postgres.end(); }
    await fs.rm(directory, { recursive: true, force: true });
  });
  return { api, login, order, sent, paid, invoices, env, providers, commerce, directory, advance: ms => { clock += ms; }, counts: () => ({ creates, generations }) };
}

test('production refuses ephemeral storage instead of accepting payments into SQLite', async () => {
  await assert.rejects(createStore({ NODE_ENV: 'production' }, '/unused'), /SABEQ_DATABASE_URL/);
});
test('guest tokens and legacy routes cannot generate a memo', async t => {
  const f = await fixture(t);
  assert.equal((await f.api('/api/legal/memo', draft, 'sabeq-temporary-guest-session')).status, 401);
  assert.equal((await f.api('/api/cases/1/generate', {})).status, 410);
  const { token } = await f.login();
  assert.equal((await f.api('/api/legal/memo', draft, token)).status, 402);
  assert.deepEqual(f.counts(), { creates: 0, generations: 0 });
});
test('OTP is delivered, single-use, expires, rate limited and proves only its own contact', async t => {
  const f = await fixture(t);
  const first = await f.api('/api/auth/request-code', { name: 'عميل', email: 'a@example.test', phone: '+96550000000' });
  assert.equal(first.status, 200); assert.equal(first.body.code, undefined);
  assert.equal((await f.api('/api/auth/request-code', { name: 'عميل', email: 'a@example.test' })).status, 429);
  const challenge = f.sent[0];
  const wrong = challenge.code === '000000' ? '111111' : '000000';
  assert.equal((await f.api('/api/auth/verify-code', { challengeId: challenge.id, code: wrong })).status, 400);
  const verified = await f.api('/api/auth/verify-code', { challengeId: challenge.id, code: challenge.code });
  assert.equal(verified.status, 200); assert.equal(verified.body.user.emailVerified, true); assert.equal(verified.body.user.phoneVerified, false);
  assert.equal((await f.api('/api/auth/verify-code', { challengeId: challenge.id, code: challenge.code })).status, 400);
  const stored = (await f.commerce.internals().db.query('SELECT * FROM commerce_challenges WHERE id=$1', [challenge.id])).rows[0];
  assert.notEqual(stored.code_hash, challenge.code);
  f.advance(61000);
  const second = await f.api('/api/auth/request-code', { name: 'عميل', email: 'a@example.test' });
  f.advance(301000);
  assert.equal((await f.api('/api/auth/verify-code', { challengeId: second.body.challengeId, code: f.sent[1].code })).status, 400);
  await f.api('/api/auth/logout', {}, verified.body.token);
  assert.equal((await f.api('/api/auth/session', undefined, verified.body.token)).status, 401);
});
test('five incorrect guesses lock a challenge, including a subsequent correct code', async t => {
  const f = await fixture(t);
  await f.api('/api/auth/request-code', { name: 'عميل', email: 'locked@example.test' });
  const c = f.sent[0]; const wrong = c.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await f.api('/api/auth/verify-code', { challengeId: c.id, code: wrong })).status, 400);
  assert.equal((await f.api('/api/auth/verify-code', { challengeId: c.id, code: c.code })).status, 400);
});
test('concurrent order and checkout retries create exactly one invoice with server pricing', async t => {
  const f = await fixture(t); const { token } = await f.login();
  const body = { draft, requestKey: crypto.randomUUID(), amountFils: 1, paymentStatus: 'paid' };
  const responses = await Promise.all(Array.from({ length: 4 }, () => f.api('/api/orders', body, token)));
  assert.ok(responses.every(x => x.status === 201));
  const id = responses[0].body.order.id;
  assert.ok(responses.every(x => x.body.order.id === id));
  assert.equal(responses[0].body.order.amountFils, 1500);
  assert.equal((await f.api('/api/orders', { ...body, draft: { ...draft, facts: 'changed' } }, token)).status, 409);
  await Promise.all(Array.from({ length: 5 }, () => f.api('/api/orders/' + id + '/checkout', {}, token)));
  assert.equal(f.counts().creates, 1);
  assert.equal((await f.api('/api/orders/' + id + '/generate', {}, token)).status, 402);
});
test('verified payment generates once; duplicate events and browser refresh return the saved result', async t => {
  const f = await fixture(t); const { token } = await f.login(); const order = await f.order(token);
  await f.api('/api/orders/' + order.id + '/checkout', {}, token);
  f.paid.add(order.id);
  await Promise.all([f.api('/api/orders/' + order.id + '/check-payment', {}, token), f.api('/api/orders/' + order.id + '/check-payment', {}, token)]);
  await Promise.all([f.commerce.internals().orders.run(order.id), f.commerce.internals().orders.run(order.id)]);
  const response = await f.api('/api/legal/memo', { orderId: order.id, facts: 'attempt to substitute draft' }, token);
  assert.equal(response.status, 200); assert.equal(response.body.memo, 'مسودة محفوظة للطلب فقط');
  await f.commerce.internals().orders.tick(); assert.equal(f.counts().generations, 1);
  const raw = (await f.commerce.internals().db.query('SELECT draft,result FROM commerce_orders WHERE id=$1', [order.id])).rows[0];
  assert.ok(!raw.draft.includes(draft.facts)); assert.ok(!raw.result.includes(response.body.memo));
});
test('failed generation preserves payment and retries the same order without checkout', async t => {
  const f = await fixture(t, { generationFailure: true }); const { token } = await f.login(); const order = await f.order(token);
  await f.api('/api/orders/' + order.id + '/checkout', {}, token); f.paid.add(order.id);
  await f.api('/api/orders/' + order.id + '/check-payment', {}, token);
  await f.commerce.internals().orders.tick();
  const failed = await f.api('/api/orders/' + order.id, undefined, token);
  assert.equal(failed.body.order.paymentStatus, 'paid'); assert.equal(failed.body.order.canRetry, true);
  await f.api('/api/orders/' + order.id + '/generate', {}, token); await f.commerce.internals().orders.tick();
  assert.deepEqual(f.counts(), { creates: 1, generations: 2 });
});
test('checkout uncertainty never blindly creates a second invoice; reconciliation recovers payment', async t => {
  const f = await fixture(t, { checkoutFailure: true }); const { token } = await f.login(); const order = await f.order(token);
  await f.api('/api/orders/' + order.id + '/checkout', {}, token);
  await f.api('/api/orders/' + order.id + '/checkout', {}, token);
  assert.equal(f.counts().creates, 1);
  f.paid.add(order.id); await f.api('/api/orders/' + order.id + '/check-payment', {}, token);
  assert.equal((await f.api('/api/orders/' + order.id, undefined, token)).body.order.paymentStatus, 'paid');
});
test('order ownership, admin authorization and secret redaction are enforced server-side', async t => {
  const f = await fixture(t); const a = await f.login('owner@example.test'); const b = await f.login('other@example.test');
  const order = await f.order(a.token);
  for (const suffix of ['', '/files/not-a-file']) assert.equal((await f.api('/api/orders/' + order.id + suffix, undefined, b.token)).status, 404);
  assert.equal((await f.api('/api/orders/' + order.id + '/checkout', {}, b.token)).status, 404);
  assert.equal((await f.api('/api/admin/billing/settings', undefined, a.token)).status, 403);
  const admin = await f.api('/api/admin/billing/login', { secret: f.env.SABEQ_ADMIN_BOOTSTRAP_SECRET });
  assert.equal(admin.status, 200);
  const saved = await f.api('/api/admin/billing/settings', { paymentKey: 'replacement-sensitive-key' }, admin.body.token, 'PUT');
  assert.equal(saved.status, 200); assert.equal(saved.body.settings.paymentKey, true);
  assert.ok(!JSON.stringify(saved.body).includes('replacement-sensitive-key'));
  assert.equal((await f.api('/api/admin/billing/settings', { priceFils: '-1' }, admin.body.token, 'PUT')).status, 400);
  const encrypted = (await f.commerce.internals().db.query("SELECT value FROM commerce_settings WHERE name='runtime'")).rows[0].value;
  assert.ok(!encrypted.includes('replacement-sensitive-key'));
});
test('payment adapter rejects mismatched amount, invoice, reference, currency and authorization-only status', () => {
  const provider = createProviders(); const order = { id: 'order-1', invoice_id: '100', amount_fils: 1500 };
  const paid = { InvoiceId: 100, CustomerReference: 'order-1', InvoiceValue: 1.5, InvoiceStatus: 'Paid', InvoiceTransactions: [{ TransactionStatus: 'Succss', Currency: 'KD', PaymentId: 'p1' }] };
  assert.equal(provider.validateStatus(paid, order).status, 'paid');
  for (const change of [{ InvoiceId: 101 }, { CustomerReference: 'other' }, { InvoiceValue: 0.5 }]) assert.throws(() => provider.validateStatus({ ...paid, ...change }, order), /تطابق/);
  for (const transaction of [{ TransactionStatus: 'Authorize', Currency: 'KD' }, { TransactionStatus: 'Succss', Currency: 'USD' }]) assert.notEqual(provider.validateStatus({ ...paid, InvoiceTransactions: [transaction] }, order).status, 'paid');
  assert.throws(() => provider.safeCheckoutUrl('https://myfatoorah.com.evil.test/pay'));
});
test('webhook requires the documented signature and cannot establish payment from posted claims', async t => {
  const f = await fixture(t); const { token } = await f.login(); const order = await f.order(token);
  await f.api('/api/orders/' + order.id + '/checkout', {}, token);
  const event = { Event: { Code: 1, Name: 'PAYMENT_STATUS_CHANGED' }, Data: { Invoice: { Id: f.invoices.get(order.id), Status: 'PAID', ExternalIdentifier: order.id }, Transaction: { Status: 'SUCCESS', PaymentId: 'p1' } } };
  assert.equal((await f.api('/api/payments/webhook', event)).status, 401);
  const payload = `Invoice.Id=${event.Data.Invoice.Id},Invoice.Status=PAID,Transaction.Status=SUCCESS,Transaction.PaymentId=p1,Invoice.ExternalIdentifier=${order.id}`;
  const signature = crypto.createHmac('sha256', f.env.SABEQ_WEBHOOK_SECRET).update(payload).digest('base64');
  assert.equal(f.providers.verifyWebhook(await f.commerce.internals().settings.read(), event, signature), true);
  assert.equal(f.providers.verifyWebhook(await f.commerce.internals().settings.read(), { ...event, Data: { ...event.Data, Invoice: { ...event.Data.Invoice, Id: '999' } } }, signature), false);
  assert.equal((await f.api('/api/orders/' + order.id, undefined, token)).body.order.paymentStatus, 'pending');
  assert.equal((await f.api('/api/payments/webhook', event, undefined, undefined, { 'MyFatoorah-Signature': signature })).status, 200);
  assert.equal((await f.api('/api/orders/' + order.id, undefined, token)).body.order.paymentStatus, 'pending');
  f.paid.add(order.id);
  assert.equal((await f.api('/api/payments/webhook', event, undefined, undefined, { 'MyFatoorah-Signature': signature })).status, 200);
  assert.equal((await f.api('/api/orders/' + order.id, undefined, token)).body.order.paymentStatus, 'paid');
});

test('attachments stay encrypted, reject another owner, and can be reused by their owner', async t => {
  const f = await fixture(t); const a = await f.login('file-owner@example.test'); const b = await f.login('file-other@example.test');
  const filename = path.join(f.directory, 'private.txt'); const content = 'مرفق خاص للاختبار';
  await fs.writeFile(filename, content);
  const uploads = [{ path: filename, originalname: 'case.txt', mimetype: 'text/plain', size: Buffer.byteLength(content) }];
  const draftId = crypto.randomUUID();
  const files = await f.commerce.archiveUploads(a.user.id, draftId, uploads);
  assert.deepEqual(await f.commerce.archiveUploads(a.user.id, draftId, uploads), files);
  assert.equal((await f.api('/api/orders', { draft, fileIds: files, requestKey: crypto.randomUUID() }, b.token)).status, 400);
  const one = await f.order(a.token, { fileIds: files }); const two = await f.order(a.token, { fileIds: files });
  for (const order of [one, two]) assert.equal((await f.api('/api/orders/' + order.id, undefined, a.token)).body.files[0].id, files[0]);
  const stored = (await f.commerce.internals().db.query('SELECT content FROM commerce_files WHERE id=$1', files)).rows[0].content;
  assert.ok(!stored.includes(content));
  assert.equal(Buffer.from(f.commerce.internals().settings.decrypt(stored, 'file:' + files[0]), 'base64').toString(), content);
});
