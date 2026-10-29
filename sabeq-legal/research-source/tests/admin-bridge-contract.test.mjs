import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto,createHmac,createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const secret='synthetic-bridge-secret-'.repeat(3);
function harness(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE api_rate_limits (key TEXT,bucket TEXT,count INTEGER,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(key,bucket))');
 const db={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){return sqlite.prepare(sql).run(...args);}};}};
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/admin-service-auth.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='cloudflare:workers'?{env:{ADMIN_SERVICE_TOKEN:secret}}:{getD1:()=>db},Response,URL,TextEncoder,crypto:webcrypto,Date});
 return{verify:exports.requireAdminService,close:()=>sqlite.close()};
}
function signed({path='/api/admin/engineering-paths',method='GET',body='',timestamp=String(Date.now()),nonce=randomUUID()}={}){
 const payload=[timestamp,nonce,method,path,createHash('sha256').update(body).digest('hex')].join('\n');
 return new Request('https://sabeq.example'+path,{method,headers:{'X-Sabeq-Timestamp':timestamp,'X-Sabeq-Nonce':nonce,'X-Sabeq-Signature':createHmac('sha256',secret).update(payload).digest('hex')},...(method==='POST'?{body}:{} )});
}
test('signed GET and POST authenticate without consuming the original request body',async()=>{const h=harness();try{assert.equal(await h.verify(signed()),null);const request=signed({method:'POST',path:'/api/admin/sadad',body:'{"action":"test"}'});assert.equal(await h.verify(request),null);assert.equal(await request.text(),'{"action":"test"}');}finally{h.close();}});
test('replayed, expired, altered path and altered body requests are rejected',async()=>{const h=harness();try{const request=signed();assert.equal(await h.verify(request.clone()),null);assert.equal((await h.verify(request.clone())).status,401);assert.equal((await h.verify(signed({timestamp:String(Date.now()-120000)}))).status,401);const original=signed({method:'POST',path:'/api/admin/sadad',body:'{"action":"test"}'});assert.equal((await h.verify(new Request('https://sabeq.example/api/admin/users',{method:'POST',headers:original.headers,body:'{"action":"test"}'}))).status,401);assert.equal((await h.verify(new Request(original.url,{method:'POST',headers:original.headers,body:'{"action":"save"}'}))).status,401);}finally{h.close();}});
test('concurrent replay reserves the nonce once and wrong bearer credentials do not authorize',async()=>{const h=harness();try{const request=signed();const result=await Promise.all([h.verify(request.clone()),h.verify(request.clone())]);assert.equal(result.filter(x=>x===null).length,1);assert.equal((await h.verify(new Request('https://sabeq.example/api/admin/sadad',{headers:{Authorization:'Bearer '+'wrong'.repeat(10)}}))).status,401);}finally{h.close();}});
