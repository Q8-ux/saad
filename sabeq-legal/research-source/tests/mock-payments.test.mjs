import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { harness, newAttempt, memoInput, ready } from './sadad-harness.mjs';

const origin = 'https://q8-ux.github.io';
function request(path, token = '', data, testToken = '') {
  return new Request('https://service.example/api/' + path, { method: data ? 'POST' : 'GET', headers: { Origin: origin, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(testToken ? { 'X-Sabeq-Payment-Test': testToken } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
}
async function administrator(h, email = 'admin@synthetic.example') {
  h.runtime.MANAGEMENT_ALLOWED_EMAILS = [h.runtime.MANAGEMENT_ALLOWED_EMAILS, email].filter(Boolean).join(',');
  const auth = h.load('lib/management-auth.ts'), token = auth.randomToken(), hash = await auth.digest(token), now = Math.floor(Date.now() / 1000);
  h.sqlite.prepare('INSERT INTO management_sessions VALUES(?,?,?,?,?)').run(hash, email, 'Synthetic administrator', now + 7200, now);
  return { token, hash, email, role: 'administrator' };
}
async function mock(h) {
  const manager = await administrator(h), api = h.load('lib/sadad-payments.ts');
  await api.sadadManagement({ action: 'mode', mode: 'mock', revision: 0 }, manager.email, manager);
  const session = (await api.sadadManagement({ action: 'test-session' }, manager.email, manager)).testSession;
  const testToken = new URLSearchParams(new URL(session.url).hash.slice(1)).get('payment-test');
  return { api, manager, testToken };
}

test('migration preserves old invoices and active integration while restoring only the memo price to 50000 fils', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const files = readdirSync(new URL('../drizzle/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
    for (const f of files.filter(f => Number(f.slice(0, 4)) < 10)) db.exec(readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'));
    db.prepare("UPDATE service_settings SET enabled=1,payment_required=1,price_fils=1000 WHERE service_key='memo'").run();
    db.prepare("INSERT INTO service_settings VALUES('other',0,1,7000,'KWD',CURRENT_TIMESTAMP)").run();
    db.prepare("INSERT INTO sadad_payments(id,token_hash,input_hash,environment,amount_fils,reference) VALUES('synthetic-old','hash','input','live',1000,'old')").run();
    db.prepare("INSERT INTO management_vault(integration,sealed,updated_by) VALUES('sadad','synthetic-encrypted-config','old-admin')").run();
    const old = db.prepare('SELECT * FROM sadad_payments').get();
    for (const f of files.filter(f => Number(f.slice(0, 4)) >= 10)) db.exec(readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'));
    assert.equal(db.prepare("SELECT mode FROM payment_runtime_settings").get().mode, 'real');
    const after = db.prepare('SELECT * FROM sadad_payments').get();
    for (const [key, value] of Object.entries(old)) assert.equal(after[key], value);
    assert.equal(after.provider, 'sadad'); assert.equal(after.amount_fils, 1000);
    assert.equal(db.prepare("SELECT price_fils FROM service_settings WHERE service_key='memo'").get().price_fils, 50000);
    assert.equal(db.prepare("SELECT price_fils FROM service_settings WHERE service_key='other'").get().price_fils, 7000);
    assert.equal(db.prepare("SELECT sealed FROM management_vault").get().sealed, 'synthetic-encrypted-config');
  } finally { db.close(); }
});

test('mock checkout needs no gateway keys, ignores client totals and displays the server fifty-dinar amount', async () => {
  const h = harness(); try {
    h.setTransport(() => assert.fail('mock checkout must not contact any gateway'));
    const { api, testToken } = await mock(h);
    h.runtime.SABEQ_MEMO_TEST_ONE_KWD = 'true';
    const policy = await api.memoPaymentPolicy(testToken);
    assert.equal(policy.priceFils, 50000); assert.equal(policy.provider, 'mock'); assert.equal(policy.required, true); assert.equal(policy.ready, true);
    const attempt = newAttempt(), created = await api.createMemoPayment({ ...attempt, amount: 1, priceFils: 1000, status: 'paid' }, testToken);
    assert.equal(created.priceFils, 50000); assert.equal((created.priceFils / 1000).toFixed(3), '50.000');
    assert.equal(created.status, 'pending'); assert.equal(created.checkoutUrl, null); assert.equal(created.environment, 'mock');
    assert.equal(h.sqlite.prepare('SELECT invoice_id FROM sadad_payments').get().invoice_id, null);
    assert.equal(h.calls.length, 0); assert.equal(h.invoices.size, 0);
  } finally { h.close(); }
});

for (const [outcome, status] of [['success', 'paid'], ['failure', 'failed'], ['cancel', 'cancelled']]) test('HTTP mock flow: ' + outcome, async () => {
  const h = harness(); try {
    h.setTransport(() => assert.fail('no provider request is permitted'));
    const { api, testToken, manager } = await mock(h), a = newAttempt();
    h.runtime.ALLOW_GUEST_MEMO = 'false';
    const checkoutRoute = h.load('app/api/payments/sadad/route.ts'), simulation = h.load('app/api/payments/mock/route.ts');
    let response = await checkoutRoute.POST(request('payments/sadad', '', a, testToken));
    assert.equal(response.status, 200); assert.equal((await response.json()).priceFils, 50000);
    response = await simulation.POST(request('payments/mock', a.paymentToken, { id: a.attemptId, outcome }, testToken));
    assert.equal(response.status, 200); assert.equal((await response.json()).status, status);
    assert.equal(h.sqlite.prepare('SELECT status FROM sadad_payments').get().status, status);
    assert.equal((await api.memoPaymentStatus(a.attemptId, a.paymentToken, testToken)).status, status);
    if (outcome === 'success') {
      const settled = await Promise.allSettled([api.reserveMemoPayment(memoInput(a), testToken), api.reserveMemoPayment(memoInput(a), testToken)]);
      assert.equal(settled.filter(v => v.status === 'fulfilled').length, 1);
      const { lease } = settled.find(v => v.status === 'fulfilled').value;
      assert.equal(lease.provider, 'mock');
      await api.completeMemoPayment(lease, { memo: 'Synthetic test output', paymentMode: 'mock' });
      assert.equal((await api.recoverMemoPayment(a.attemptId, a.paymentToken, testToken)).paymentMode, 'mock');
    } else {
      await assert.rejects(api.reserveMemoPayment(memoInput(a), testToken));
      await assert.rejects(api.simulateMemoPayment({ id: a.attemptId, outcome: 'success' }, a.paymentToken, testToken));
    }
    const report = await api.sadadManagement(null, manager.email, manager);
    assert.equal(report.realRevenueFils, 0); assert.equal(report.payments[0].provider, 'mock');
    assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_memo_requests').get().n, 0);
    assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM service_records').get().n, 0);
    assert.equal(h.calls.length, 0);
  } finally { h.close(); }
});

test('anonymous users cannot switch modes, create/settle mock orders, use a stolen capability or bypass the memo payment gate', async () => {
  const h = harness(); try {
    const { api, testToken } = await mock(h), routes = h.load('app/api/management/[...path]/route.ts'), a = newAttempt();
    assert.equal((await routes.POST(request('management/payments', '', { action: 'mode', mode: 'real', confirmReal: true, role: 'administrator' }))).status, 401);
    await assert.rejects(api.sadadManagement({ action: 'mode', mode: 'real', revision: 1, confirmReal: true }, 'fake', { role: 'operator', hash: 'fake' }));
    const checkout = h.load('app/api/payments/sadad/route.ts');
    assert.equal((await checkout.POST(request('payments/sadad', '', a))).status, 403);
    await api.createMemoPayment(a, testToken);
    const sim = h.load('app/api/payments/mock/route.ts');
    assert.equal((await sim.POST(request('payments/mock', a.paymentToken, { id: a.attemptId, outcome: 'success' }))).status, 403);
    await assert.rejects(api.memoPaymentStatus(a.attemptId, a.paymentToken));
    await assert.rejects(api.reserveMemoPayment(memoInput(a)));
    h.sqlite.prepare("UPDATE service_settings SET payment_required=0 WHERE service_key='memo'").run();
    await assert.rejects(api.reserveMemoPayment({}));
    assert.equal(h.sqlite.prepare('SELECT status FROM sadad_payments').get().status, 'pending');
    assert.equal(h.calls.length, 0);
  } finally { h.close(); }
});

test('test sessions are actor-bound, expire, and cease working after manager logout or revoked privileges', async () => {
  for (const revoke of ['expire', 'logout', 'role']) {
    const h = harness(); try {
      const { api, manager, testToken } = await mock(h), a = newAttempt(); await api.createMemoPayment(a, testToken);
      const other = await administrator(h, 'other@synthetic.example');
      const otherSession = (await api.sadadManagement({ action: 'test-session' }, other.email, other)).testSession;
      const otherToken = new URLSearchParams(new URL(otherSession.url).hash.slice(1)).get('payment-test');
      await assert.rejects(api.simulateMemoPayment({ id: a.attemptId, outcome: 'success' }, a.paymentToken, otherToken));
      if (revoke === 'expire') h.advance(1801_000);
      if (revoke === 'logout') h.sqlite.prepare('DELETE FROM management_sessions WHERE token_hash=?').run(manager.hash);
      if (revoke === 'role') h.runtime.MANAGEMENT_ALLOWED_EMAILS = '';
      await assert.rejects(api.simulateMemoPayment({ id: a.attemptId, outcome: 'success' }, a.paymentToken, testToken));
      assert.equal(h.calls.length, 0);
    } finally { h.close(); }
  }
});

test('mode changes preserve previous orders, require explicit real confirmation, and never turn a tester into a real invoice creator', async () => {
  const h = harness(); try {
    const { api, manager, testToken } = await mock(h), a = newAttempt(); await api.createMemoPayment(a, testToken);
    await api.simulateMemoPayment({ id: a.attemptId, outcome: 'success' }, a.paymentToken, testToken);
    await assert.rejects(api.sadadManagement({ action: 'mode', mode: 'real', revision: 1 }, manager.email, manager));
    assert.equal((await api.sadadManagement(null, manager.email)).mode, 'mock');
    await api.sadadManagement({ action: 'mode', mode: 'real', revision: 1, confirmReal: true }, manager.email, manager);
    await assert.rejects(api.sadadManagement({ action: 'mode', mode: 'mock', revision: 1 }, manager.email, manager));
    assert.equal((await api.createMemoPayment(a, testToken)).provider, 'mock');
    assert.equal((await api.reserveMemoPayment(memoInput(a), testToken)).lease.provider, 'mock');
    await assert.rejects(api.createMemoPayment(newAttempt(), testToken));
    assert.equal(h.calls.length, 0);
    const audit = await api.sadadManagement(null, manager.email);
    assert.equal(audit.modeAudit.length, 2); assert.equal(audit.modeAudit[0].actor, manager.email);
    assert.ok(audit.modeAudit.every(row => row.created_at));
    assert.ok(!JSON.stringify(audit.modeAudit).includes(testToken)); assert.ok(!JSON.stringify(audit.modeAudit).includes(manager.token));
  } finally { h.close(); }
});

test('real pending invoices retain their provider and amount across a mock switch; fake success cannot settle them', async () => {
  const h = harness(); try {
    const api = await ready(h), old = newAttempt(); await api.createMemoPayment(old);
    const before = h.sqlite.prepare('SELECT * FROM sadad_payments').get(), { manager, testToken } = await mock(h), count = h.calls.length;
    await assert.rejects(api.simulateMemoPayment({ id: old.attemptId, outcome: 'success' }, old.paymentToken, testToken));
    await assert.rejects(api.memoPaymentStatus(old.attemptId, old.paymentToken, testToken));
    await assert.rejects(api.createMemoPayment(old, testToken));
    const a = newAttempt(); await api.createMemoPayment(a, testToken); await api.simulateMemoPayment({ id: a.attemptId, outcome: 'success' }, a.paymentToken, testToken);
    assert.equal(h.calls.length, count);
    const after = h.sqlite.prepare('SELECT * FROM sadad_payments WHERE id=?').get(old.attemptId);
    for (const key of ['provider', 'environment', 'amount_fils', 'invoice_id', 'status']) assert.equal(after[key], before[key]);
    const mockRows = await api.sadadManagement(null, manager.email, manager, 'mock');
    assert.equal(mockRows.realRevenueFils, 0); assert.ok(mockRows.payments.every(row => row.provider === 'mock' || row.environment === 'sandbox'));
    const realRows = await api.sadadManagement(null, manager.email, manager, 'real'); assert.equal(realRows.payments.length, 0);
    await assert.rejects(api.sadadManagement({ action: 'reconcile', paymentId: a.attemptId, invoiceId: '100' }, manager.email, manager));
  } finally { h.close(); }
});
test('the protected report filters test operations and sums only confirmed live SADAD amounts', async () => {
  const h=harness();try {
    const {api,manager,testToken}=await mock(h),a=newAttempt();await api.createMemoPayment(a,testToken);await api.simulateMemoPayment({id:a.attemptId,outcome:'success'},a.paymentToken,testToken);
    for(const [id,environment,amount]of [['synthetic-live','live',50000],['synthetic-sandbox','sandbox',9000]])h.sqlite.prepare("INSERT INTO sadad_payments(id,token_hash,input_hash,provider,environment,amount_fils,reference,status) VALUES(?, 'synthetic-hash', 'synthetic-input', 'sadad', ?, ?, ?, 'paid')").run(id,environment,amount,id);
    const routes=h.load('app/api/management/[...path]/route.ts');
    const real=await (await routes.GET(request('management/payments?kind=real',manager.token))).json();
    assert.equal(real.realRevenueFils,50000);assert.equal(real.payments.length,1);assert.equal(real.payments[0].id,'synthetic-live');
    const tests=await (await routes.GET(request('management/payments?kind=mock',manager.token))).json();
    assert.equal(tests.realRevenueFils,50000);assert.equal(tests.payments.length,2);assert.ok(tests.payments.every(row=>row.environment!=='live'));
    assert.equal(h.calls.length,0);
  }finally{h.close();}
});
test('new fifty-dinar mock attempts never reprice an earlier one-dinar mock attempt',async()=>{
  const h=harness();try{
    const {api,testToken}=await mock(h);h.sqlite.prepare("UPDATE service_settings SET price_fils=1000 WHERE service_key='memo'").run();
    const old=newAttempt();await api.createMemoPayment(old,testToken);
    h.sqlite.exec(readFileSync(new URL('../drizzle/0011_restore_memo_fee.sql',import.meta.url),'utf8'));
    const current=await api.createMemoPayment(newAttempt(),testToken);assert.equal(current.priceFils,50000);
    assert.equal((await api.memoPaymentStatus(old.attemptId,old.paymentToken,testToken)).priceFils,1000);assert.equal(h.calls.length,0);
  }finally{h.close();}
});
