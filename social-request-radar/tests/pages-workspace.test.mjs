import test from 'node:test';import assert from 'node:assert/strict';
import {createLocalApi} from '../github-pages/source/workspace.mjs';
import {searchReadiness,searchOutcome} from '../github-pages/source/search-state.mjs';
const fixture={id:'sample_1',text:'أبي استشارة بالكويت',author:'local_test',sourceUrl:'https://www.instagram.com/p/TEST_ONLY/'};
function setup(options){const map=new Map();return createLocalApi({all:async()=>[...map.values()],put:async d=>map.set(d.key,d),remove:async key=>map.delete(key)},options);}
test('device workspace begins empty without invented leads',async()=>{const s=await setup()('workspace');assert.equal(s.connected,false);assert.equal(s.saved.length,0);assert.equal(s.datasets.length,0);});
test('import, Arabic search, save, refresh and remove work in a browser-local store',async()=>{const api=setup();const imported=await api('import',{platform:'instagram',records:[fixture],name:'test.json'});assert.equal(imported.count,1);const run=await api('search',{mode:'library',query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram']});assert.equal(run.results.length,1);await api('save',{record:run.results[0]});assert.equal((await api('workspace')).saved.length,1);await api('save',{record:run.results[0],remove:true});assert.equal((await api('workspace')).saved.length,0);await api('delete',{kind:'dataset',id:imported.id});assert.equal((await api('workspace')).datasets.length,0);});
test('live search explicitly remains unconnected',async()=>{await assert.rejects(()=>setup()('search',{mode:'live'}),/ربط مصدر البيانات/);});
test('account measurement persists and calculates net followers',async()=>{const api=setup();const m=await api('metrics',{account:'test-account',platform:'instagram',start:'2026-10-01',end:'2026-10-18',impressions:1000,visits:100,follows:12,unfollows:2});assert.equal(m.net,10);assert.equal((await api('workspace')).metrics.length,1);});

test('empty imports never become a completed zero-match search',async()=>{
  const api=setup();
  await assert.rejects(()=>api('search',{mode:'library',query:'استشارة',country:'KW',platforms:['instagram']}),/لم يبدأ البحث/);
  assert.equal((await api('workspace')).searches.length,0);
  const state=searchReadiness(await api('workspace'),'library',['instagram']);
  assert.equal(state.ready,false);assert.equal(state.state,'no_data');assert.equal(state.count,null);
});

test('selected platforms without records are blocked even if another platform has comments',async()=>{
  const api=setup();await api('import',{platform:'instagram',records:[fixture]});
  const workspace=await api('workspace');
  assert.equal(workspace.datasets[0].platformCounts.instagram,1);
  assert.equal(searchReadiness(workspace,'library',['instagram']).ready,true);
  assert.equal(searchReadiness(workspace,'library',['youtube']).ready,false);
  await assert.rejects(()=>api('search',{mode:'library',query:'استشارة',country:'KW',platforms:['youtube']}),/لم يبدأ البحث/);
});

test('legacy empty runs do not display a zero-match result',()=>{
  assert.equal(searchOutcome(null).count,null);
  const empty=searchOutcome({state:'completed',scanned:0,results:[]});
  assert.equal(empty.kind,'uncollected');assert.equal(empty.count,null);
  assert.equal(searchOutcome({state:'completed',scanned:1,results:[]}).kind,'empty');
  assert.equal(searchOutcome({state:'completed',scanned:1,results:[]}).count,0);
});

test('live access remains unconfigured despite imported comments and has no result count',async()=>{
  const api=setup();await api('import',{platform:'instagram',records:[fixture]});
  const readiness=searchReadiness(await api('workspace'),'live',['instagram']);
  assert.equal(readiness.ready,false);assert.equal(readiness.state,'unconfigured');
  assert.equal(readiness.count,null);assert.ok(readiness.platforms.every(p=>p.status==='unconfigured'));
});

test('a genuine country exclusion is distinct from missing data',async()=>{
  const api=setup();await api('import',{platform:'instagram',records:[{...fixture,text:'أبي استشارة قانونية'}]});
  const result=await api('search',{mode:'library',query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram']});
  assert.equal(result.scanned,1);assert.equal(result.results.length,0);assert.equal(result.excluded.country,1);
  const inclusive=await api('search',{mode:'library',query:'استشارة',terms:'استشارة',country:'KW',includeUnknown:true,platforms:['instagram']});
  assert.equal(inclusive.results.length,1);assert.equal(inclusive.results[0].geo.status,'unknown');
});

test('each of the six platforms searches only its imported records and reports missing sources',async()=>{
  const api=setup();const urls={instagram:'https://www.instagram.com/p/TEST_ONLY/',x:'https://x.com/test/status/1',tiktok:'https://www.tiktok.com/@test/video/1',youtube:'https://www.youtube.com/watch?v=TEST_ONLY',reddit:'https://www.reddit.com/r/test/comments/1/',facebook:'https://www.facebook.com/test/posts/1'};
  for(const [platform,sourceUrl]of Object.entries(urls))await api('import',{platform,records:[{...fixture,id:'test-'+platform,sourceUrl}]});
  const workspace=await api('workspace');
  for(const platform of Object.keys(urls)){
    assert.equal(searchReadiness(workspace,'library',[platform]).count,1);
    const run=await api('search',{mode:'library',query:'استشارة',terms:'استشارة',country:'KW',platforms:[platform]});
    assert.equal(run.scanned,1);assert.equal(run.results.length,1);assert.equal(run.results[0].platform,platform);assert.equal(run.report.calls,0);
  }
  const partial=setup();await partial('import',{platform:'instagram',records:[fixture]});
  const result=await partial('search',{mode:'library',query:'استشارة',country:'KW',platforms:['instagram','youtube']});
  assert.equal(result.report.sources.find(p=>p.platform==='youtube').status,'not_collected');
});

test('connector setup stores only a sealed credential, routes live searches and disconnects',async()=>{
  const secret='fixture-plaintext-provider-key';let received;
  const remote={endpoint:'https://example.onrender.com',configure:async key=>{assert.equal(key,secret);return {credential:'sealed-test-packet',verified:false};},search:async(body,credential)=>{received={body,credential};return {id:'remote-run',state:'completed',scanned:1,spec:body,createdAt:'2026-10-18T00:00:00Z',results:[],report:{calls:1},collectedRecords:[{...fixture,platform:'instagram'}]};}};
  const api=setup({remote});assert.equal((await api('workspace')).backendConfigured,true);assert.equal((await api('workspace')).connected,false);
  await api('connect',{apiKey:secret});assert.equal((await api('workspace')).connected,true);
  const run=await api('search',{mode:'live',query:'استشارة'});assert.equal(received.credential,'sealed-test-packet');assert.equal(run.report.calls,1);
  const workspace=await api('workspace');assert.equal(workspace.datasets.length,1);assert.ok(workspace.sourceVerifiedAt);assert.ok(!JSON.stringify(workspace).includes(secret));assert.ok(!JSON.stringify(workspace.searches).includes('sealed-test-packet'));
  await api('disconnect');assert.equal((await api('workspace')).connected,false);
});

test('a configured endpoint is not treated as a running backend and readiness can recover',async()=>{
  let online=false;const remote={endpoint:'https://example.onrender.com',initialBlocker:'fixture: build quota exhausted',status:async()=>{if(!online)throw Error('unavailable');return {ok:true,keyConfigured:false};},configure:async()=>({credential:'sealed-fixture'})};
  const api=setup({remote});let workspace=await api('workspace');
  assert.equal(workspace.backendConfigured,true);assert.equal(workspace.backendReady,false);assert.equal(workspace.connected,false);
  assert.equal(searchReadiness(workspace,'live',['instagram']).ready,false);
  await assert.rejects(()=>api('connection-status'),/unavailable/);
  assert.equal((await api('workspace')).backendError,'fixture: build quota exhausted');
  online=true;await api('connection-status');workspace=await api('workspace');
  assert.equal(workspace.backendReady,true);assert.equal(workspace.backendError,'');assert.equal(workspace.connected,false);
  await api('connect',{apiKey:'fixture-only-key'});assert.equal((await api('workspace')).connected,true);
});
