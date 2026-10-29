import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
function harness(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('tests/fixtures/management-source-tables.sql',root),'utf8'));
  sqlite.exec(readFileSync(new URL('drizzle/0005_icy_dark_phoenix.sql',root),'utf8'));
  const db={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};}};
  // Authentication routes and encrypted-vault isolation are covered by the full native management suite.
  const dependencies={'@/db':{getD1:()=>db},'@/lib/management-auth':{base64url:value=>Buffer.from(value).toString('base64url'),sealConfig:async value=>JSON.stringify(value),openConfig:async value=>JSON.parse(value)},'@/lib/management-integrations':{SERVICE_ORIGIN:'https://sabeq-legal-public.centrino.chatgpt.site'},'@/lib/request-security':{RequestError:class extends Error{}}};
  function load(file){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(!dependencies[name])throw Error('Unexpected test dependency: '+name);return dependencies[name];},crypto:webcrypto,TextEncoder,URL,URLSearchParams,AbortSignal,fetch:async()=>new Response('Not found',{status:404})});return exports;}
  return{sqlite,load,close:()=>sqlite.close()};
}
test('the real request ledger and dashboard share current records when the previous archive returns 404',async()=>{const h=harness();try{
  const ledger=h.load('lib/memo-requests.ts'),data=h.load('lib/management-data.ts');
  const id=await ledger.startMemoRequest({clientName:'طلب اختبار اصطناعي',facts:'وقائع اختبار'},null,'https://q8-ux.github.io');
  await ledger.finishMemoRequest(id,'needs_review','مسودة اختبار');
  const snapshot=await data.managerSnapshot('synthetic@example.test');
  assert.equal(snapshot.connection.available,true);assert.equal(snapshot.connection.source,'sabeq-public-service');assert.equal(snapshot.connection.mode,'shared-database');assert.equal(snapshot.connection.checkedAt,snapshot.updatedAt);
  assert.equal(snapshot.memo.total,1);assert.equal(snapshot.official.available,false);assert.equal(snapshot.official.totals,null);assert.equal(snapshot.official.error,'HTTP 404');
  const list=await data.managerMemos(new URL('https://example.invalid/api/management/memos'));assert.equal(list.memos[0].id,id);
  const detail=await data.managerMemos(new URL('https://example.invalid/api/management/memos?id='+id));assert.equal(detail.memo.output_text,'مسودة اختبار');
}finally{h.close();}});
test('a current storage failure rejects the snapshot instead of returning connected metadata',async()=>{const h=harness();try{
  h.sqlite.exec('DROP TABLE consultation_requests');
  await assert.rejects(h.load('lib/management-data.ts').managerSnapshot('synthetic@example.test'));
}finally{h.close();}});
