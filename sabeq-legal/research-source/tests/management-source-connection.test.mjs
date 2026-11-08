import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
function harness({authenticated=false}={}){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('tests/fixtures/management-source-tables.sql',root),'utf8'));
  sqlite.exec(readFileSync(new URL('drizzle/0005_icy_dark_phoenix.sql',root),'utf8'));
  const db={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};}};
  // Authentication routes and encrypted-vault isolation are covered by the full native management suite.
  const dependencies={'@/db':{getD1:()=>db},'@/lib/gmail':{sendSavedDraft:async()=>{}},'@/lib/management-auth':{base64url:value=>Buffer.from(value).toString('base64url'),sealConfig:async value=>JSON.stringify(value),openConfig:async value=>JSON.parse(value)},'@/lib/management-integrations':{SERVICE_ORIGIN:'https://sabeq-legal-public.centrino.chatgpt.site'},'@/lib/request-security':{RequestError:class extends Error{}}};
  function load(file){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name==='@/lib/management-data')return load('lib/management-data.ts');if(!dependencies[name])throw Error('Unexpected test dependency: '+name);return dependencies[name];},crypto:webcrypto,TextEncoder,URL,URLSearchParams,AbortSignal,Request,Response,Headers,fetch:async url=>authenticated&&String(url)==='https://tuhxdirrffnxtosqaoiq.supabase.co/functions/v1/admin-verify'?Response.json({valid:true,role:'admin',must_change_password:false}):new Response('Not found',{status:404})});return exports;}
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

test('one generated memo reaches the existing dashboard list and details with identical saved text',async()=>{const h=harness({authenticated:true});try{
 const ledger=h.load('lib/memo-requests.ts'),bridge=h.load('app/api/integrations/bolt-memos/route.ts');
 const id=await ledger.startMemoRequest({clientName:'حالة اصطناعية للربط',caseType:'اختبار'},null,'https://q8-ux.github.io');
 const output='مسودة اصطناعية لاختبار المزامنة فقط.\nالدفوع والطلبات محفوظة دون تغيير.';await ledger.finishMemoRequest(id,'needs_review',output);
 const request=body=>new Request('https://sabeq-source.test/api/integrations/bolt-memos',{method:'POST',headers:{Origin:'https://q8-ux-sabeq-admin-co-u4ma.bolt.host',Authorization:'Bearer synthetic-admin-session-000001','Content-Type':'application/json'},body:JSON.stringify(body)});
 const list=await bridge.POST(request({action:'list',offset:0}));assert.equal(list.status,200);const data=await list.json();assert.equal(data.memos[0].id,id);assert.equal(data.memos[0].has_output,true);assert.equal(Object.hasOwn(data.memos[0],'output_text'),false);
 const detail=await bridge.POST(request({action:'get',id}));assert.equal(detail.status,200);const record=await detail.json();assert.equal(record.memo.id,id);assert.equal(record.memo.output_text,output);
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM management_vault WHERE integration='operations-signing'").get().n,0);
}finally{h.close();}});

test('the existing Bolt list reads the shared current ledger without probing the previous archive',async()=>{const h=harness();try{
 const ledger=h.load('lib/memo-requests.ts'),data=h.load('lib/management-data.ts');
 const id=await ledger.startMemoRequest({clientName:'طلب ربط اصطناعي'},null,'https://q8-ux.github.io');await ledger.finishMemoRequest(id,'needs_review','نص اختبار خاص.');
 const list=await data.managerMemos(new URL('https://example.invalid/api/management/memos?source=current'));
 assert.equal(list.memos[0].id,id);assert.equal(Number(list.memos[0].has_output),1);assert.ok(!Object.hasOwn(list.memos[0],'output_text'));
 assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM management_vault WHERE integration='operations-signing'").get().n,0);
}finally{h.close();}});

test('generated memo view follows saved output for guests and users, not a status label',async()=>{const h=harness();try{
 const ledger=h.load('lib/memo-requests.ts'),data=h.load('lib/management-data.ts');
 const guest=await ledger.startMemoRequest({clientName:'ضيف اصطناعي',facts:'وقائع اختبار'},null,'https://q8-ux.github.io');
 await ledger.finishMemoRequest(guest,'needs_review','نص مذكرة اصطناعية كاملة.');
 const user=await ledger.startMemoRequest({clientName:'مستخدم اصطناعي'},{id:'synthetic-user',email:'synthetic@example.test'},'https://q8-ux.github.io');
 await ledger.finishMemoRequest(user,'needs_review','نص مذكرة ثانية للاختبار.');
 const empty=await ledger.startMemoRequest({clientName:'مراجعة دون نص'},null,'https://q8-ux.github.io');
 await ledger.finishMemoRequest(empty,'needs_review',' \n\t\r ','source_review');
 await ledger.startMemoRequest({clientName:'طلب قيد التنفيذ'},null,'https://q8-ux.github.io');
 const generated=await data.managerMemos(new URL('https://test.invalid/api/management/memos?view=generated'));
 assert.deepEqual(new Set(generated.memos.map(r=>r.id)),new Set([guest,user]));
 assert.ok(generated.memos.every(r=>Number(r.has_output)===1));
 assert.ok(generated.memos.every(r=>!Object.hasOwn(r,'output_text')));
 assert.equal((await data.managerMemos(new URL('https://test.invalid/api/management/memos'))).memos.length,4);
 assert.equal((await data.managerMemos(new URL('https://test.invalid/api/management/memos?view=generated&q='+encodeURIComponent('ضيف اصطناعي')))).memos.length,1);
 assert.equal((await data.managerMemos(new URL('https://test.invalid/api/management/memos?id='+guest))).memo.output_text,'نص مذكرة اصطناعية كاملة.');
}finally{h.close();}});

test('the generated view keeps saved historical memos and applies its filter before pagination',async()=>{const h=harness();try{
 const ledger=h.load('lib/memo-requests.ts'),data=h.load('lib/management-data.ts');
 for(let i=0;i<53;i++)await ledger.startMemoRequest({clientName:'محاولة اصطناعية '+i},null,'https://q8-ux.github.io');
 const id=await ledger.startMemoRequest({clientName:'مذكرة اصطناعية'},null,'https://q8-ux.github.io');await ledger.finishMemoRequest(id,'needs_review','مذكرة اختبار.');
 h.sqlite.prepare("INSERT INTO public_users (id,name,phone,email,email_verified_at) VALUES ('synthetic-user','شخص اختبار','000','synthetic@example.test','2026-01-01')").run();
 h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title,output_text) VALUES ('old-test','synthetic-user','memo_archive','أرشيف اصطناعي','نص أرشيف اختبار.')").run();
 const result=await data.managerMemos(new URL('https://test.invalid/api/management/memos?view=generated'));
 assert.deepEqual(new Set(result.memos.map(r=>r.id)),new Set([id,'legacy:old-test']));assert.equal(result.hasMore,false);
}finally{h.close();}});
