import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRadarServer,credentialVault} from '../server/api.mjs';
import {normalizeRecord} from '../lib/radar-core.mjs';
const origin='https://q8-ux.github.io',fakeKey='fixture-key-not-an-account-credential';
const input={requestId:'fixture-request-0001',query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram']};
const row=normalizeRecord({id:'test-only',text:'أبي استشارة في الكويت',author:'fixture'},'instagram','https://www.instagram.com/p/TEST_ONLY/');
function result(records=[row]){return {records,report:{calls:1,creditsUsed:1,sources:[{platform:'instagram',status:records.length?'completed':'blocked',records:records.length,pages:1,remainingCursors:[],error:records.length?null:{code:'HTTP_403',message:'تعذر الوصول إلى المصدر (403).'}}],coverage:'test fixture',collectedAt:'2026-10-18T00:00:00Z'}};}
async function app(t,options={}){
  const secret=randomBytes(32).toString('base64url');
  const server=createRadarServer({sealKey:secret,...options});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base='http://127.0.0.1:'+server.address().port;
  async function post(path,body,headers={}){const r=await fetch(base+path,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
  return {post,base,secret};
}
test('sealed credential survives restart with the same server secret and rejects tampering or another secret',()=>{
  const key=randomBytes(32).toString('base64url');const vault=credentialVault(key);const token=vault.seal(fakeKey);
  assert.ok(!token.includes(fakeKey));assert.equal(credentialVault(key).open(token),fakeKey);
  const bytes=Buffer.from(token,'base64url');bytes[35]^=1;
  assert.throws(()=>vault.open(bytes.toString('base64url')),/أعد حفظ/);
  assert.throws(()=>credentialVault(randomBytes(32).toString('base64url')).open(token),/أعد حفظ/);
});
test('health and configuration perform no provider calls; source access is not asserted',async t=>{
  let calls=0;const a=await app(t,{collector:async()=>{calls++;throw Error('unexpected');}});
  const health=await(await fetch(a.base+'/health')).json();assert.equal(health.ok,true);assert.equal(health.keyConfigured,false);
  const configured=await a.post('/api/configure',{apiKey:fakeKey});
  assert.equal(configured.status,200);assert.equal(configured.body.verified,false);assert.equal(calls,0);
  assert.ok(!JSON.stringify(configured).includes(fakeKey));
  const status=await a.post('/api/status',{credential:configured.body.credential});assert.equal(status.body.keyConfigured,true);
});
test('unconfigured search and another origin cannot make a provider call',async t=>{
  let calls=0;const a=await app(t,{collector:async()=>{calls++;return result();}});
  assert.equal((await a.post('/api/search',input)).status,424);
  assert.equal((await a.post('/api/configure',{apiKey:fakeKey},{origin:'https://example.org'})).status,403);
  assert.equal(calls,0);
});
test('live search forwards only the decrypted key and enforces per-search request and credit limits',async t=>{
  let received;const a=await app(t,{collector:async(spec,key)=>{received={spec,key};return result();}});
  const credential=(await a.post('/api/configure',{apiKey:fakeKey})).body.credential;
  const search=await a.post('/api/search',{...input,credential,maxRequests:30,maxCredits:200});
  assert.equal(search.status,200);assert.equal(search.body.state,'completed');assert.equal(search.body.scanned,1);assert.equal(search.body.results.length,1);
  assert.equal(received.key,fakeKey);assert.equal(received.spec.maxRequests,12);assert.equal(received.spec.maxCredits,20);
  assert.ok(!JSON.stringify(search.body).includes(fakeKey));assert.ok(!Object.hasOwn(search.body.spec,'credential'));
});
test('concurrent duplicate submissions do not run collection twice and changed requests are refused',async t=>{
  let calls=0;const a=await app(t,{collector:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,15));return result();}});
  const credential=(await a.post('/api/configure',{apiKey:fakeKey})).body.credential;
  const body={...input,credential};const replies=await Promise.all([a.post('/api/search',body),a.post('/api/search',body)]);
  assert.ok(replies.every(r=>r.status===200));assert.equal(calls,1);
  assert.equal((await a.post('/api/search',{...body,query:'محامي'})).status,409);assert.equal(calls,1);
});
test('a blocked source preserves diagnostics and never becomes a completed zero-match search',async t=>{
  const a=await app(t,{collector:async()=>result([])});
  const credential=(await a.post('/api/configure',{apiKey:fakeKey})).body.credential;
  const response=await a.post('/api/search',{...input,credential});
  assert.equal(response.body.state,'uncollected');assert.equal(response.body.report.sources[0].error.code,'HTTP_403');assert.equal(response.body.collectedRecords.length,0);
});
test('bad credentials and internal errors do not disclose plaintext keys',async t=>{
  const a=await app(t,{collector:async()=>{throw Error(fakeKey);}});
  assert.equal((await a.post('/api/search',{...input,credential:'tampered'})).status,401);
  const credential=(await a.post('/api/configure',{apiKey:fakeKey})).body.credential;
  const response=await a.post('/api/search',{...input,credential});
  assert.ok(!JSON.stringify(response.body).includes(fakeKey));assert.equal(response.body.code,'SEARCH_FAILED');
});
