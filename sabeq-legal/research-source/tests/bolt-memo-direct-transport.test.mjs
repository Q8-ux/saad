import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const origin='https://q8-ux-sabeq-admin-co-u4ma.bolt.host';
function harness(session={valid:true,role:'admin',must_change_password:false}){
 const calls=[],reads=[];const exports={};
 const dependencies={'@/lib/management-data':{managerMemos:async url=>{reads.push(url);return {memos:[{id:'synthetic-record-0001',status:'needs_review',has_output:1,output_text:'synthetic private text'}],hasMore:false,offset:0}}}};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/integrations/bolt-memos/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>dependencies[n],fetch:async(url,init)=>{calls.push({url,init});return Response.json(session)},Request,Response,Headers,URL,TextEncoder,AbortSignal});
 const request=(body={action:'list',offset:0},from=origin)=>new Request('https://source.test/api/integrations/bolt-memos',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic-admin-session-000001',...(from?{Origin:from}:{})},body:JSON.stringify(body)});
 return{api:exports,calls,reads,request};
}
test('the existing Bolt origin receives bounded private current-source data',async()=>{const h=harness();const r=await h.api.POST(h.request());assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);const d=await r.json();assert.equal(d.success,true);assert.equal(d.memos[0].id,'synthetic-record-0001');assert.equal(d.memos[0].has_output,true);assert.equal(Object.hasOwn(d.memos[0],'output_text'),false);assert.equal(h.reads[0].searchParams.get('source'),'current');assert.equal(h.calls.length,1)});
test('preflight permits the exact existing dashboard only',async()=>{const h=harness();const r=await h.api.OPTIONS(new Request('https://source.test/api/integrations/bolt-memos',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal((await h.api.OPTIONS(new Request('https://source.test/api/integrations/bolt-memos',{method:'OPTIONS',headers:{Origin:'https://evil.test'}}))).status,403)});
test('hostile origins and failed sessions never read the ledger',async()=>{const h=harness();assert.equal((await h.api.POST(h.request({},'https://evil.test'))).status,403);assert.equal(h.reads.length,0);assert.equal(h.calls.length,0);for(const session of [{valid:false,role:'admin'},{valid:true,role:'visitor'},{valid:true,role:'admin',must_change_password:true}]){const h=harness(session);assert.equal((await h.api.POST(h.request())).status,401);assert.equal(h.reads.length,0)}});
test('invalid pagination and unknown actions do not read case data',async()=>{const h=harness();for(const body of [{action:'list',offset:-1},{action:'list',offset:0.5},{action:'write'},{action:'get',id:'bad/path'}])assert.equal((await h.api.POST(h.request(body))).status,400);assert.equal(h.reads.length,0)});
