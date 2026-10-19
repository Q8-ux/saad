import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApi} from '../github-pages/source/workspace.mjs';
import {restoredSearch} from '../github-pages/source/search-state.mjs';

const row={id:'fixture-restore',text:'أبي استشارة في الكويت',author:'fixture',sourceUrl:'https://www.instagram.com/p/TEST_ONLY/'};
const spec={mode:'library',query:'استشارة',terms:'استشارة',country:'KW',platforms:['instagram']};
function memory(){const docs=new Map();return {all:async()=>structuredClone([...docs.values()]),put:async d=>docs.set(d.key,structuredClone(d)),remove:async key=>docs.delete(key)};}

test('a cold page restores the last selected search, including a true zero-match result',async()=>{
  const store=memory();const api=createLocalApi(store);await api('import',{platform:'instagram',records:[row]});
  const first=await api('search',spec);assert.equal(first.results.length,1);
  const last=await api('search',{...spec,query:'طبخ',terms:'طبخ'});assert.equal(last.results.length,0);
  const cold=createLocalApi(store);let workspace=await cold('workspace');
  assert.equal(workspace.selectedSearchId,last.id);assert.equal(restoredSearch(workspace).id,last.id);assert.equal(restoredSearch(workspace).results.length,0);
  await cold('select-search',{id:first.id});workspace=await createLocalApi(store)('workspace');assert.equal(restoredSearch(workspace).id,first.id);
});

test('unknown selections cannot overwrite the saved selection, and deleting it clears its pointer',async()=>{
  const store=memory();const api=createLocalApi(store);await api('import',{platform:'instagram',records:[row]});const result=await api('search',spec);
  await assert.rejects(()=>api('select-search',{id:'missing'}),/غير موجودة/);assert.equal((await api('workspace')).selectedSearchId,result.id);
  await api('delete',{kind:'search',id:result.id});const state=await createLocalApi(store)('workspace');assert.equal(state.selectedSearchId,null);assert.equal(restoredSearch(state),null);
});

test('legacy imported histories expose an existing matching round without inventing records or hiding an explicit empty selection',()=>{
  const matched={id:'matched',state:'completed',spec,scanned:1,results:[row]};
  const empty={id:'empty',state:'completed',spec:{...spec,query:'فحص اتصال'},scanned:10,results:[]};
  const workspace={searches:[empty,matched]};
  assert.equal(restoredSearch(workspace).id,'matched');
  assert.equal(restoredSearch({...workspace,selectedSearchId:'empty'}).id,'empty');
  assert.equal(restoredSearch({}),null);
});

test('a failed backend check does not hide an already saved search',async()=>{
  const store=memory();const api=createLocalApi(store,{remote:{endpoint:'https://fixture.example',status:async()=>{throw Error('fixture offline');}}});
  await api('import',{platform:'instagram',records:[row]});const result=await api('search',spec);await assert.rejects(()=>api('connection-status'));
  const state=await api('workspace');assert.equal(state.connected,false);assert.equal(restoredSearch(state).id,result.id);assert.equal(restoredSearch(state).results.length,1);
});
