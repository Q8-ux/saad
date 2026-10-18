import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {createEdgeHandler} from '../edge/handler.mjs';import {normalizeRecord} from '../lib/radar-core.mjs';import {createConnector} from '../github-pages/source/connector.mjs';
const origin='https://q8-ux.github.io',base='https://fixture.supabase.co/functions/v1/comment-radar';
const key='fixture-key-never-a-real-account';
const spec={query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram'],requestId:'fixture-edge-search-001'};
function setup(collector){const handler=createEdgeHandler({sealKey:randomBytes(32).toString('base64url'),collector});return {handler,post:async(path,body,requestOrigin=origin)=>{const r=await handler(new Request(base+path,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};}};}
test('edge function health and credential configuration work with a function URL prefix without data-provider calls',async()=>{
  let calls=0;const {handler,post}=setup(async()=>{calls++;throw Error('unexpected');});
  const health=await handler(new Request(base+'/api/status'));assert.equal((await health.json()).ok,true);
  const response=await post('/api/configure',{apiKey:key});assert.equal(response.status,200);assert.equal(response.body.verified,false);assert.ok(!JSON.stringify(response.body).includes(key));assert.equal(calls,0);
  assert.equal((await post('/api/status',{credential:response.body.credential})).body.keyConfigured,true);
});
test('edge search requires a sealed provider capability and refuses another browser origin',async()=>{
  let calls=0;const {post}=setup(async()=>{calls++;throw Error('unexpected');});
  assert.equal((await post('/api/search',spec)).status,424);
  assert.equal((await post('/api/configure',{apiKey:key},'https://example.org')).status,403);
  assert.equal((await post('/api/search',{...spec,credential:'tampered'})).status,401);assert.equal(calls,0);
});
test('edge search yields actual collected records from the collector, enforces budgets, and coalesces duplicate IDs',async()=>{
  let calls=0;const row=normalizeRecord({id:'fixture',text:'أبي استشارة في الكويت'},'instagram','https://www.instagram.com/p/TEST_ONLY/');
  const {post}=setup(async(s,k)=>{calls++;assert.equal(k,key);assert.equal(s.maxRequests,12);assert.equal(s.maxCredits,20);return {records:[row],report:{calls:1,sources:[]}};});
  const credential=(await post('/api/configure',{apiKey:key})).body.credential;
  const body={...spec,credential,maxRequests:30,maxCredits:200};const a=await post('/api/search',body);const b=await post('/api/search',body);
  assert.equal(a.body.results.length,1);assert.equal(b.body.results.length,1);assert.equal(calls,1);assert.equal(a.body.state,'completed');assert.ok(!JSON.stringify(a.body).includes(key));
});
test('edge blocked-source report stays uncollected and does not fabricate a zero-match success',async()=>{
  const {post}=setup(async()=>({records:[],report:{sources:[{platform:'instagram',status:'blocked',error:{code:'HTTP_403'}}]}}));
  const credential=(await post('/api/configure',{apiKey:key})).body.credential;
  const run=(await post('/api/search',{...spec,credential})).body;assert.equal(run.state,'uncollected');assert.equal(run.report.sources[0].error.code,'HTTP_403');
});
test('browser connector preserves the Edge Function prefix and does not send cookies',async()=>{
  const requests=[];const remote=createConnector(base,async(url,options)=>{requests.push({url:String(url),options});return new Response(JSON.stringify({ok:true,credential:'sealed-fixture'}),{status:200});});
  await remote.status();await remote.configure(key);await remote.search(spec,'sealed-fixture');
  assert.deepEqual(requests.map(r=>r.url),[base+'/api/status',base+'/api/configure',base+'/api/search']);assert.ok(requests.every(r=>r.options.credentials==='omit'));
});
