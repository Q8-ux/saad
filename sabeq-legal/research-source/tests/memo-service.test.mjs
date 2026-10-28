import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function transport(fetcher, options = {}) {
  const calls = [], logs = [], timeouts = [], exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../lib/memo-service.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    exports, require: name => name.endsWith('payment-test-client') ? { paymentTestToken: () => options.testToken || '' } : { apiUrl: path => `https://service.example${path}` },
    Headers, Error, console: { error: (...args) => logs.push(args) }, clearTimeout,
    setTimeout: (fn, ms) => setTimeout(() => { options.onBackoff?.(); fn(); }, options.slowBackoff ? ms : 0),
    AbortSignal: { any: AbortSignal.any.bind(AbortSignal), timeout: ms => { timeouts.push(ms); return AbortSignal.timeout(options.timeoutMs || ms); } },
    fetch: async (url, init) => { calls.push({ url, init }); return fetcher(url, init, calls.length); },
  });
  return { request: exports.memoFetch, calls, logs, timeouts };
}

test('payment status GET recovers a transient connection loss with the same capability and no case data', async () => {
  const h = transport((_url, _init, n) => { if (n === 1) throw new TypeError('network'); return Response.json({ status: 'pending' }); });
  const response = await h.request('/api/payments/sadad?id=synthetic-attempt', 'synthetic-capability');
  assert.equal(response.status, 200); assert.equal(h.calls.length, 2);
  for (const { url, init } of h.calls) {
    assert.equal(url, 'https://service.example/api/payments/sadad?id=synthetic-attempt');
    assert.equal(init.headers.get('Authorization'), 'Bearer synthetic-capability');
    assert.equal(init.mode, 'cors'); assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store');
    assert.equal(init.body, undefined);
  }
  assert.deepEqual(h.timeouts, [15000, 15000]);
});

test('temporary payment-read 502/503/504 responses retry, permanent validation errors remain visible', async () => {
  for (const status of [502, 503, 504]) {
    const h = transport((_url, _init, n) => new Response('{}', { status: n === 1 ? status : 200 }));
    assert.equal((await h.request('/api/payments/sadad', '')).status, 200); assert.equal(h.calls.length, 2);
  }
  const h = transport(() => Response.json({ error: 'synthetic rejected capability' }, { status: 403 }));
  const response = await h.request('/api/payments/sadad?id=test', '');
  assert.equal(response.status, 403); assert.equal(h.calls.length, 1);
  assert.equal((await response.json()).error, 'synthetic rejected capability');
});

test('lost payment creation response never replays POST and does not claim that the order never arrived', async () => {
  const h = transport(() => { throw new TypeError('network'); });
  const body = JSON.stringify({ attemptId: 'synthetic-attempt', paymentToken: 'synthetic-capability' });
  await assert.rejects(h.request('/api/payments/sadad', '', { method: 'POST', body }), error => /قد يكون الطلب قد وصل/.test(error.message) && !/التحليل|الملفات/.test(error.message));
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].init.body, body); assert.deepEqual(h.timeouts, [60000]);
  assert.doesNotMatch(JSON.stringify(h.logs), /synthetic-attempt|synthetic-capability/);
});

test('provider payment creation error returns unchanged without a second POST', async () => {
  const h = transport(() => Response.json({ error: 'synthetic provider unavailable' }, { status: 502 }));
  const response = await h.request('/api/payments/sadad', '', { method: 'post' });
  assert.equal(response.status, 502); assert.equal(h.calls.length, 1);
  assert.equal((await response.json()).error, 'synthetic provider unavailable');
});

test('payment reads have bounded attempts and stage-specific errors without leaking query tokens', async () => {
  const h = transport(() => { throw new TypeError('network'); });
  await assert.rejects(h.request('/api/payments/sadad?id=synthetic-private-id', 'synthetic-private-capability'), error => /خدمة الدفع/.test(error.message) && !/الملفات/.test(error.message));
  assert.equal(h.calls.length, 3); assert.doesNotMatch(JSON.stringify(h.logs), /synthetic-private/);
});

test('payment request timeouts finish even when a response never arrives', async () => {
  const h = transport((_url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }), { timeoutMs: 5 });
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(h.request('/api/payments/sadad', ''), /خدمة الدفع/);
    assert.equal(h.calls.length, 3);
  } finally { clearTimeout(keepAlive); }
});

test('cancellation before the request or during retry backoff prevents further network calls', async () => {
  const controller = new AbortController(); controller.abort(new Error('synthetic cancelled'));
  const before = transport(() => assert.fail('must not send'));
  await assert.rejects(before.request('/api/payments/sadad', '', { signal: controller.signal }), /synthetic cancelled/);
  assert.equal(before.calls.length, 0);
  const during = new AbortController();
  const h = transport(() => { during.abort(new Error('synthetic cancelled in request')); throw during.signal.reason; });
  await assert.rejects(h.request('/api/payments/sadad', '', { signal: during.signal }), /synthetic cancelled/);
  assert.equal(h.calls.length, 1);
  const backoff = new AbortController();
  const waiting = transport(() => { setTimeout(() => backoff.abort(new Error('synthetic cancelled in backoff')), 5); throw new TypeError('network'); }, { slowBackoff: true });
  await assert.rejects(waiting.request('/api/payments/sadad', '', { signal: backoff.signal }), /synthetic cancelled/);
  assert.equal(waiting.calls.length, 1);
});

test('memo generation is never replayed, while document extraction retains recoverable retries and its files', async () => {
  const memo = transport(() => { throw new TypeError('synthetic disconnected'); });
  await assert.rejects(memo.request('/api/legal/memo', '', { method: 'POST' }), /synthetic disconnected/);
  assert.equal(memo.calls.length, 1);
  const form = new FormData(); form.set('documents', new Blob(['synthetic document']), 'synthetic.txt');
  const analysis = transport((_url, _init, n) => new Response('{}', { status: n === 1 ? 503 : 200 }));
  assert.equal((await analysis.request('/api/legal/analyze-documents', '', { method: 'POST', body: form })).status, 200);
  assert.equal(analysis.calls.length, 2); assert.ok(analysis.calls.every(call => call.init.body === form));
});

test('verified creation result opens checkout without another blocking status read; server still verifies before generation', () => {
  const ui = readFileSync(new URL('../app/sabeq-site.tsx', import.meta.url), 'utf8');
  const checkout = ui.slice(ui.indexOf('if (created.id)'), ui.indexOf('setCheckingPayment(false);', ui.indexOf('if (created.id)')));
  assert.match(checkout, /setCheckout\(created\)/); assert.match(checkout, /created.status/); assert.match(checkout, /setPaymentOpen\(true\)/);
  assert.doesNotMatch(checkout, /memoFetch|clearPaymentAttempt/);
  const backend = readFileSync(new URL('../lib/sadad-payments.ts', import.meta.url), 'utf8');
  assert.match(backend, /return publicPayment\(await refreshPayment/);
  const reserve = backend.slice(backend.indexOf('export async function reserveMemoPayment'));
  assert.match(reserve, /refreshPayment\(row\)/);
});

test('payment and transport failure messages stay specific in all three interface languages', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/interface-language.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Error });
  const rows = exports.interfaceCopy.filter(row => /تعذر الاتصال بخدمة الدفع|تعذر استلام رد خدمة الدفع|بقيت بياناتك ومرفقاتك|تعذر قراءة رد الخدمة/.test(row[0]));
  assert.equal(rows.length, 4);
  for (const row of rows) for (const [index, language] of ['ar', 'en', 'ur'].entries()) {
    assert.equal(exports.interfaceError(new Error(row[0]), language, 'fallback'), row[index]);
  }
});
test('the scoped test token reaches only payment and memo services; mock outcomes are never automatically replayed', async () => {
  const h=transport(()=>Response.json({ok:true}),{testToken:'synthetic-test-session'});
  for(const path of ['/api/payments/sadad','/api/payments/mock','/api/legal/memo','/api/legal/analyze-documents'])await h.request(path,'');
  for(const call of h.calls)assert.equal(call.init.headers.get('X-Sabeq-Payment-Test'),call.url.endsWith('analyze-documents')?null:'synthetic-test-session');
  const failed=transport(()=>{throw new TypeError('network');},{testToken:'synthetic-test-session'});
  await assert.rejects(failed.request('/api/payments/mock','synthetic-proof',{method:'POST'}));assert.equal(failed.calls.length,1);
  assert.ok(!JSON.stringify(failed.logs).includes('synthetic-test-session'));
});
