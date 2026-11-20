import test from 'node:test';
import assert from 'node:assert/strict';
import {createGateway} from './server.mjs';
import {createSearchRuntime} from './search-runtime.mjs';
import {EventEmitter} from 'node:events';
test('internal embeddings require a separate server key and reject browser requests',async()=>{
 let calls=0,closed=false;
 const key='fixture-private-search-key-2026-for-tests',body={model:'studio-search-270m-i2s-q8emb-v1',input:['نص اصطناعي']};
 const server=createGateway({authMode:'open',allowedOrigin:'https://studio.test',upstreamOrigin:'https://private.test',siteToken:'fixture',bridgeKey:'fixture',sessionSecret:'fixture',searchKey:key},async()=>{throw Error('Unexpected upstream request');},undefined,()=>({configured:()=>true,embeddings:async value=>{calls++;assert.deepEqual(value,body);return{model:body.model,data:[{index:0,embedding:[1]}]};},forImport:fn=>fn(),close:()=>{closed=true;}}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/_internal/search';
 const send=(headers={},value=body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(value)});
 try{
  assert.equal((await send()).status,403);
  assert.equal((await send({Authorization:'Bearer '+key,Origin:'https://studio.test'})).status,403);
  assert.equal((await send({Authorization:'Bearer wrong'})).status,403);assert.equal(calls,0);
  assert.equal((await send({Authorization:'Bearer '+key},{...body,input:['x'.repeat(651)]})).status,400);assert.equal(calls,0);
  const response=await send({Authorization:'Bearer '+key});assert.equal(response.status,200);assert.equal((await response.json()).model,body.model);assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));assert.equal(closed,true);}
});
test('search loads on demand, serializes requests and releases its process before document extraction',async()=>{
 let spawned=0,killed=0,release;const child=Object.assign(new EventEmitter(),{kill(){killed++;}});
 const runtime=createSearchRuntime({key:'fixture-key-long-enough-for-local-tests',spawnImpl(){spawned++;return child;},fetchImpl:async url=>url.endsWith('/health')?Response.json({status:'ok'}):new Promise(resolve=>{release=()=>resolve(Response.json({data:[]}));})});
 assert.equal(spawned,0);const first=runtime.embeddings({input:['fixture']});
 while(!release)await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(runtime.embeddings({input:['other']}));release();await first;assert.equal(spawned,1);
 await runtime.forImport(async()=>{assert.equal(killed,1);await assert.rejects(runtime.embeddings({input:['during import']}));});runtime.close();
});
