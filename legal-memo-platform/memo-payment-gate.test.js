'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { memoPaymentGate, legacyMemoPaymentGate } = require('./memo-payment-gate');

async function run(transport, body = {}, headers = {}) {
  let status = 200, data, next = false;
  const res = { status(value) { status = value; return this; }, json(value) { data = value; return this; } };
  await memoPaymentGate(transport)({ body, headers }, res, () => { next = true; });
  return { status, data, next };
}
test('unpaid rollout retains the existing generator only when the authoritative policy allows it', async () => {
  const allowed = await run(async () => Response.json({ required: false, enabled: true }));
  assert.equal(allowed.next, true);
  for (const policy of [{ required: false, enabled: false }, {}, { required: 'false', enabled: true }]) {
    assert.equal((await run(async () => Response.json(policy))).next, false);
  }
});
test('paid generation cannot bypass the authoritative service and a missing entitlement remains 402', async () => {
  const calls = [];
  const result = await run(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/api/payments/sadad')) return Response.json({ required: true, enabled: true });
    return Response.json({ error: 'يلزم الدفع' }, { status: 402 });
  }, { facts: 'وقائع اصطناعية' });
  assert.equal(result.status, 402); assert.equal(result.next, false);
  assert.ok(calls[1].url.endsWith('/api/legal/memo'));
  assert.equal(JSON.parse(calls[1].options.body).facts, 'وقائع اصطناعية');
});
test('an unreachable policy fails closed and an existing paid entitlement uses recovery after payments are disabled', async () => {
  assert.equal((await run(async () => { throw Error('synthetic offline'); })).status, 503);
  const result = await run(async url => url.endsWith('/api/payments/sadad') ? Response.json({ required: false, enabled: true }) : Response.json({ memo: 'نتيجة اصطناعية محفوظة' }), { paymentId: 'synthetic-paid-order' });
  assert.equal(result.next, false); assert.equal(result.data.memo, 'نتيجة اصطناعية محفوظة');
});
test('the older case generator refuses unpaid access when payment is required', async () => {
  for (const required of [false, true]) {
    let next = false, status = 200;
    const res = { status(value) { status = value; return this; }, json() { return this; } };
    await legacyMemoPaymentGate(async () => Response.json({ required, enabled: true }))({}, res, () => { next = true; });
    assert.equal(next, !required); assert.equal(status, required ? 402 : 200);
  }
});

test('mock mode and test-session requests always use authoritative reservation, forwarding scoped proof only to Sabeq',async()=>{
 for(const mode of ['mock','real']){
  const calls=[];const result=await run(async(url,options)=>{calls.push({url,options});return url.endsWith('/api/payments/sadad')?Response.json({required:false,enabled:true,mode}):Response.json({paymentMode:'mock',memo:'synthetic test result'});},{paymentId:'synthetic-test-order'},{'x-sabeq-payment-test':'synthetic-test-session'});
  assert.equal(result.next,false);assert.equal(result.data.paymentMode,'mock');assert.equal(calls.length,2);
  for(const call of calls){assert.match(call.url,/^https:\/\/sabeq-legal-public\.centrino\.chatgpt\.site\//);assert.equal(call.options.headers['X-Sabeq-Payment-Test'],'synthetic-test-session');}
 }
});
test('legacy generation stays closed in mock mode even if the old required flag is false',async()=>{
 let next=false,status=200;const res={status(value){status=value;return this;},json(){return this;}};
 await legacyMemoPaymentGate(async()=>Response.json({required:false,enabled:true,mode:'mock'}))({},res,()=>{next=true;});assert.equal(next,false);assert.equal(status,402);
});
