import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createLocalApi} from '../github-pages/source/workspace.mjs';
import {createConnector} from '../github-pages/source/connector.mjs';
import {createEdgeHandler} from '../edge/handler.mjs';
import {normalizeRecord} from '../lib/radar-core.mjs';
import {transferLimit} from '../github-pages/source/device-transfer.mjs';

const providerKey='fixture-provider-key-not-a-real-account';
const base='https://fixture.supabase.co/functions/v1/comment-radar';
const spec={mode:'live',query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram'],requestId:'fixture-transfer-search-001'};
const row=normalizeRecord({id:'fixture-comment',text:'أبي استشارة في الكويت',author:'fixture'},'instagram','https://www.instagram.com/p/TEST_ONLY/');
function memoryStore(){const docs=new Map();let batches=0;return {all:async()=>structuredClone([...docs.values()]),put:async d=>docs.set(d.key,structuredClone(d)),remove:async key=>docs.delete(key),putMany:async values=>{batches++;for(const d of values)docs.set(d.key,structuredClone(d));},get batches(){return batches;}};}
async function prepared(){
  let calls=0;const clock={now:Date.now()};
  const handler=createEdgeHandler({sealKey:randomBytes(32).toString('base64url'),now:()=>clock.now,collector:async(s,key)=>{calls++;assert.equal(key,providerKey);return {records:[row],report:{provider:'fixture',calls:1,sources:[{platform:'instagram',records:1,pages:1,status:'completed',remainingCursors:[]}]}};}});
  const remote=createConnector(base,async(url,options)=>handler(new Request(url,{...options,headers:{...options.headers,origin:'https://q8-ux.github.io'}})));
  const source=memoryStore();const api=createLocalApi(source,{remote});
  await api('connect',{apiKey:providerKey});
  const search=await api('search',spec);
  await api('save',{record:search.results[0]});
  await api('tool-job',{id:'01234567-89ab-4cde-8123-456789abcdef',token:'A'.repeat(64),action:'collect'});
  return {api,remote,source,clock,search,get calls(){return calls;}};
}

test('two independent devices transfer sealed access and results, retain existing records and can run a new live search',async()=>{
  const fixture=await prepared();const target=memoryStore();const phone=createLocalApi(target,{remote:fixture.remote});
  await phone('import',{platform:'instagram',records:[{...row,id:'instagram:existing',nativeId:'existing'}]});
  assert.equal((await phone('workspace')).connected,false);
  const packet=await fixture.api('export-transfer');
  const serialized=JSON.stringify(packet);
  assert.ok(!serialized.includes(providerKey));assert.ok(!serialized.includes('A'.repeat(64)));assert.ok(!packet.documents.some(d=>d.kind==='toolJob'));
  const restored=await phone('import-transfer',JSON.parse(serialized));
  assert.equal(restored.records,1);assert.equal(restored.searchId,fixture.search.id);assert.equal(target.batches,1);assert.equal(fixture.calls,1);
  let state=await phone('workspace');assert.equal(state.connected,true);assert.equal(state.datasets.length,2);assert.equal(state.searches[0].results[0].text,row.text);assert.equal(state.searches[0].results[0].geo.status,'mentioned');assert.equal(state.saved.length,1);
  await phone('import-transfer',packet);assert.equal((await phone('workspace')).datasets.length,2);
  const reloaded=createLocalApi(target,{remote:fixture.remote});await reloaded('connection-status');assert.equal((await reloaded('workspace')).connected,true);
  const newSearch=await reloaded('search',{...spec,requestId:'fixture-phone-search-0002'});assert.equal(newSearch.results.length,1);assert.equal(fixture.calls,2);
});

test('tampered or expired capabilities do not overwrite a device or collect provider data',async()=>{
  const fixture=await prepared();const target=memoryStore();const phone=createLocalApi(target,{remote:fixture.remote});
  await phone('import',{platform:'instagram',records:[row]});const before=await target.all();
  const packet=await fixture.api('export-transfer');const broken=structuredClone(packet);broken.documents.find(d=>d.kind==='connector').payload.credential='B'.repeat(120);
  await assert.rejects(()=>phone('import-transfer',broken),/أعد حفظ مفتاح/);assert.deepEqual(await target.all(),before);assert.equal(target.batches,0);
  fixture.clock.now+=366*86400000;
  await assert.rejects(()=>phone('import-transfer',packet),/أعد حفظ مفتاح/);assert.deepEqual(await target.all(),before);assert.equal(fixture.calls,1);
});

test('foreign servers, duplicate keys, unsupported records and unsafe source URLs are rejected before storage',async()=>{
  const fixture=await prepared();const packet=await fixture.api('export-transfer');const target=memoryStore();const phone=createLocalApi(target,{remote:fixture.remote});
  const variants=[
    p=>{p.backend='https://untrusted.example';},
    p=>{p.documents.push(structuredClone(p.documents[0]));},
    p=>{p.documents.push({key:'toolJob:other',kind:'toolJob',payload:{token:'A'.repeat(64)}});},
    p=>{p.documents.find(d=>d.kind==='dataset').payload.records[0].sourceUrl='javascript:alert(1)';},
  ];
  for(const change of variants){const candidate=structuredClone(packet);change(candidate);await assert.rejects(()=>phone('import-transfer',candidate));}
  assert.equal(target.batches,0);assert.deepEqual(await target.all(),[]);assert.equal(fixture.calls,1);
});

test('oversized transfer files and malformed histories are not partially imported',async()=>{
  const fixture=await prepared();const packet=await fixture.api('export-transfer');const target=memoryStore();const phone=createLocalApi(target,{remote:fixture.remote});
  const oversized={...packet,padding:'x'.repeat(transferLimit)};await assert.rejects(()=>phone('import-transfer',oversized),/١٠ ميجابايت/);
  const broken=structuredClone(packet);broken.documents.find(d=>d.kind==='search').payload.spec.country='INVALID';await assert.rejects(()=>phone('import-transfer',broken),/دولة صحيحة/);
  assert.equal(target.batches,0);assert.deepEqual(await target.all(),[]);
});

test('data-only transfers remain disconnected, preserve original text and exclude unexpected credential fields',async()=>{
  const fixture=await prepared();await fixture.api('disconnect');
  await fixture.source.put({key:'metric:fixture-metric',kind:'metric',updatedAt:new Date().toISOString(),payload:{id:'fixture-metric',account:'fixture',platform:'instagram',start:'2026-10-01',end:'2026-10-18',follows:5,unfollows:1,impressions:100,visits:10,apiKey:providerKey}});
  const packet=await fixture.api('export-transfer');assert.ok(!JSON.stringify(packet).includes(providerKey));
  const phone=createLocalApi(memoryStore(),{remote:fixture.remote});await phone('import-transfer',packet);const state=await phone('workspace');assert.equal(state.connected,false);assert.equal(state.datasets[0].count,1);assert.equal(state.metrics[0].net,4);assert.equal(state.searches[0].results[0].text,row.text);
});
