import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(import.meta.dirname,'..');
function harness(){
 const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(root+'/drizzle/'+f,'utf8'));
 const db={prepare(query){let args=[];return{bind(...v){args=v;return this;},async first(){return sqlite.prepare(query).get(...args)||null;},async all(){return{results:sqlite.prepare(query).all(...args)};},async run(){return{meta:{changes:Number(sqlite.prepare(query).run(...args).changes)}};}};},async batch(values){return Promise.all(values.map(v=>v.run()));}};
 const runtime={AUTH_SECRET:'synthetic-secret-for-tests-'.repeat(3),ALLOW_GUEST_MEMO:'true'},cache=new Map(),calls=[],invoices=new Map();let next=100,failInsert=false,authFailures=0,clockOffset=0;
 class Clock extends Date { static now(){return Date.now()+clockOffset;} }
 let transport=async(url,init={})=>{
  calls.push({url:String(url),init});assert.equal(init.redirect,'manual');
  const path=new URL(url).pathname;
  if(path.endsWith('GenerateRefreshToken')){if(authFailures){authFailures--;throw Error('synthetic auth failure');}assert.equal(init.method,'POST');assert.match(init.headers.Authorization,/^Basic /);assert.equal(init.body,'{}');assert.equal(init.headers['Content-Type'],'application/json');return Response.json({isValid:true,response:{refreshToken:'synthetic-refresh'}});}
  if(path.endsWith('GenerateAccessToken')){assert.equal(init.method,'POST');assert.equal(init.headers.Authorization,'Bearer synthetic-refresh');assert.equal(init.body,'{}');assert.equal(init.headers['Content-Type'],'application/json');return Response.json({isValid:true,response:{accessToken:'synthetic-access',expiredAfterSeconds:86400}});}
  assert.equal(init.headers.Authorization,'Bearer synthetic-access');
  if(path.endsWith('/Invoice/insert')){const invoice=JSON.parse(init.body).invoices[0],id=String(next++);invoices.set(id,{id:Number(id),key:'synthetic-invoice-key-'+id,ref_Number:invoice.ref_Number,amount:invoice.amount,currency_Code:'KWD',status:'Unpaid',refunded_Amount:0,transactionID:'',transactions:[]});if(failInsert)throw Error('synthetic timeout after insert');return Response.json({isValid:true,response:{invoiceId:id}});}
  if(path.endsWith('/Invoice/getbyid')){assert.equal(init.method,'GET');assert.equal(init.body,undefined);return Response.json({isValid:true,response:invoices.get(new URL(url).searchParams.get('id'))});}
  throw Error('Unexpected external request');
 };
 const load=file=>{file=resolve(root,file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const localRequire=name=>{if(name==='@/db')return{getD1:()=>db};if(name==='cloudflare:workers')return{env:runtime};if(name==='next/headers')return{headers:async()=>new Headers()};if(name==='next/navigation')return{redirect:()=>{throw Error('unexpected redirect');}};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(resolve(dirname(file),name+'.ts'));return require(name);};
  vm.runInNewContext(source,{exports,require:localRequire,crypto:webcrypto,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Headers,Request,Response,AbortSignal,Error,Date:Clock,JSON,btoa,atob,console,fetch:(...args)=>transport(...args)});return exports;
 };
 return{sqlite,db,runtime,calls,invoices,load,failInsert:()=>{failInsert=true;},failAuth:()=>{authFailures++;},advance:ms=>{clockOffset+=ms;},setTransport:f=>{transport=f;},close:()=>sqlite.close()};
}
const input={caseType:'قضية اصطناعية',court:'محكمة اختبار',clientName:'عميل اصطناعي',otherParty:'خصم اصطناعي',partyRole:'مدعٍ',facts:'هذه وقائع اصطناعية للاختبار دون أي بيانات عميل حقيقية.',requests:'طلب اصطناعي للاختبار',interfaceLanguage:'ar',outputLanguage:'ar'};
const newAttempt=()=>({attemptId:webcrypto.randomUUID(),paymentToken:Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url'),input});
async function ready(h){const api=h.load('lib/sadad-payments.ts');await api.sadadManagement({action:'save',environment:'sandbox',clientKey:'synthetic-client-key',clientSecret:'synthetic-client-secret',priceKwd:'2.501',required:false,accountConfirmed:true,callbacksConfirmed:true},'test');await api.sadadManagement({action:'test'},'test');await api.sadadManagement({action:'save',environment:'sandbox',priceKwd:'2.501',required:true,publicCheckoutEnabled:true,accountConfirmed:true,callbacksConfirmed:true},'test');return api;}
async function paid(h,api,attempt){await api.createMemoPayment(attempt);const remote=[...h.invoices.values()].at(-1);remote.status='Paid';remote.transactionID='synthetic-transaction-'+remote.id;return remote;}
const memoInput=a=>({...a.input,paymentId:a.attemptId,paymentToken:a.paymentToken});


export { harness, input, newAttempt, ready, paid, memoInput };
