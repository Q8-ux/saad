import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const root=resolve(new URL('..',import.meta.url).pathname),require=createRequire(import.meta.url);
const sender='drafts@example.test',recipients=['review.one@example.test','review.two@example.test'];
const clientId='synthetic-client.apps.googleusercontent.com',clientSecret='synthetic-client-secret-only';
const refreshToken='synthetic-refresh-token-only';
function harness(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(root+'/tests/fixtures/dashboard-base-schema.sql','utf8'));
 for(const file of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(root+'/drizzle/'+file,'utf8'));
 const db={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return{success:true,meta:{changes:Number(r.changes)}};}};}};
 const runtime={AUTH_SECRET:'synthetic-gmail-vault-secret-'.repeat(3),MANAGEMENT_ALLOWED_EMAILS:'manager@example.test',GMAIL_SENDER_EMAIL:sender,MEMO_REVIEW_RECIPIENTS:recipients.join(',')};
 const network=[],logs=[],cache=new Map();let transport=async()=>Response.json({error:'offline'},{status:503});
 function load(file){file=resolve(root,file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const localRequire=name=>{if(name==='@/db')return{getD1:()=>db};if(name==='cloudflare:workers')return{env:runtime};if(name==='next/headers')return{headers:async()=>new Headers()};if(name==='next/navigation')return{};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(resolve(dirname(file),name+'.ts'));return require(name);};
  vm.runInNewContext(compiled,{exports,require:localRequire,crypto:webcrypto,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Headers,Request,Response,AbortSignal,Error,Date,JSON,btoa,atob,console:{...console,error:(...args)=>logs.push(args)},fetch:async(url,init={})=>{network.push({url:String(url),init});return transport(String(url),init);}});return exports;
 }
 async function manager(){const auth=load('lib/management-auth.ts'),token=auth.randomToken(),now=Math.floor(Date.now()/1000);sqlite.prepare('INSERT INTO management_sessions VALUES(?,?,?,?,?)').run(await auth.digest(token),'manager@example.test','Synthetic manager',now+3600,now);return token;}
 const request=(token,body)=>new Request('https://sabeq-legal-public.centrino.chatgpt.site/api/management/gmail',{method:body?'POST':'GET',headers:{Origin:'https://q8-ux.github.io',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 async function config(connected=true){const value={clientId,clientSecret,revision:'synthetic-revision',...(connected?{refreshToken,accountEmail:sender}: {})};sqlite.prepare("INSERT OR REPLACE INTO management_vault(integration,sealed,updated_by) VALUES('gmail',?,'synthetic')").run(await load('lib/management-auth.ts').sealConfig(value));}
 function google(profile=sender){return async(url,init)=>{if(url.endsWith('/token'))return Response.json({access_token:'synthetic-access',refresh_token:refreshToken,scope:load('lib/gmail.ts').GMAIL_SCOPES.join(' ')});if(url.endsWith('/profile'))return Response.json({emailAddress:profile});if(url.endsWith('/revoke'))return new Response(null);if(url.endsWith('/messages/send'))return Response.json({id:'abc123def456'});throw Error('Unexpected Google endpoint '+url);};}
 return{sqlite,runtime,network,logs,load,request,manager,config,google,setTransport:f=>transport=f,close:()=>sqlite.close()};
}
const decodeRaw=raw=>{const mime=Buffer.from(raw,'base64url').toString('utf8');const parts=mime.split('\r\n\r\n');return{headers:parts[0],body:Buffer.from(parts.slice(1).join('\r\n\r\n').replace(/\r\n/g,''),'base64').toString('utf8')};};

test('Gmail configuration requires the existing administrator session and never returns secrets',async()=>{const h=harness();try{
 const routes=h.load('app/api/management/[...path]/route.ts');assert.equal((await routes.GET(h.request())).status,401);assert.equal((await routes.POST(h.request(null,{action:'save',clientId,clientSecret}))).status,401);
 const token=await h.manager();const response=await routes.POST(h.request(token,{action:'save',clientId,clientSecret}));assert.equal(response.status,200);
 const status=await response.json();assert.equal(status.sender,sender);assert.deepEqual(status.recipients,recipients);assert.equal(status.redirectUri,'https://sabeq-legal-public.centrino.chatgpt.site/api/integrations/gmail/callback');
 assert.equal(status.hasClientSecret,true);assert.equal(status.connected,false);assert.ok(!JSON.stringify(status).includes(clientSecret));
 const stored=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='gmail'").get();assert.ok(!stored.sealed.includes(clientSecret));assert.equal(h.network.length,0);
}finally{h.close();}});

test('OAuth uses the dedicated redirect, exact scopes, PKCE and one-use encrypted state; successful callback stores the verified account',async()=>{const h=harness();try{
 await h.config(false);const token=await h.manager(),routes=h.load('app/api/management/[...path]/route.ts'),auth=h.load('lib/management-auth.ts');h.setTransport(h.google());
 const started=await (await routes.POST(h.request(token,{action:'connect'}))).json(),url=new URL(started.authorizationUrl),state=url.searchParams.get('state');
 assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('redirect_uri'),h.load('lib/gmail.ts').GMAIL_REDIRECT_URI);assert.equal(url.searchParams.get('login_hint'),sender);assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.deepEqual(url.searchParams.get('scope').split(' '),['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly']);
 const pending=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration LIKE 'gmail-oauth:%'").get();assert.ok(!pending.sealed.includes(token));const unsealed=await auth.openConfig(pending.sealed);assert.equal(await auth.proofChallenge(unsealed.verifier),url.searchParams.get('code_challenge'));
 const callback=h.load('app/api/integrations/gmail/callback/route.ts'),request=new Request(url.searchParams.get('redirect_uri')+'?'+new URLSearchParams({state,code:'synthetic-code'}));const response=await callback.GET(request);assert.equal(response.status,303);assert.ok(response.headers.get('Location').startsWith('https://q8-ux.github.io/saad/sabeq-admin-preview/'));
 const exchange=new URLSearchParams(h.network[0].init.body);assert.equal(exchange.get('redirect_uri'),url.searchParams.get('redirect_uri'));assert.equal(exchange.get('code_verifier'),unsealed.verifier);
 assert.equal((await callback.GET(request)).status,400);const publicSettings=await (await routes.GET(h.request(token))).json();assert.equal(publicSettings.connected,true);assert.equal(publicSettings.accountEmail,sender);assert.ok(!JSON.stringify(publicSettings).includes(refreshToken));assert.ok(!h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='gmail'").get().sealed.includes(refreshToken));
}finally{h.close();}});

test('OAuth rejects another Gmail account and never persists its refresh token',async()=>{const h=harness();try{
 await h.config(false);const token=await h.manager(),routes=h.load('app/api/management/[...path]/route.ts');h.setTransport(h.google('other@example.test'));
 const result=await (await routes.POST(h.request(token,{action:'connect'}))).json(),url=new URL(result.authorizationUrl);
 const response=await h.load('app/api/integrations/gmail/callback/route.ts').GET(new Request(url.searchParams.get('redirect_uri')+'?'+new URLSearchParams({state:url.searchParams.get('state'),code:'synthetic-code'})));
 assert.equal(response.status,409);assert.equal((await h.load('lib/gmail.ts').gmailSettings()).connected,false);assert.ok(h.network.some(r=>r.url.endsWith('/revoke')));assert.equal(h.network.filter(r=>r.url.endsWith('/messages/send')).length,0);
}finally{h.close();}});

test('expired or consumed OAuth state never reaches Google and cannot be replayed',async()=>{const h=harness();try{
 await h.config(false);const token=await h.manager(),routes=h.load('app/api/management/[...path]/route.ts');const result=await (await routes.POST(h.request(token,{action:'connect'}))).json(),url=new URL(result.authorizationUrl),auth=h.load('lib/management-auth.ts');
 const row=h.sqlite.prepare("SELECT integration,sealed FROM management_vault WHERE integration LIKE 'gmail-oauth:%'").get(),pending=await auth.openConfig(row.sealed);pending.expiresAt=Date.now()-1;h.sqlite.prepare('UPDATE management_vault SET sealed=? WHERE integration=?').run(await auth.sealConfig(pending),row.integration);
 const request=new Request(url.searchParams.get('redirect_uri')+'?'+new URLSearchParams({state:url.searchParams.get('state'),code:'synthetic-code'}));assert.equal((await h.load('app/api/integrations/gmail/callback/route.ts').GET(request)).status,400);assert.equal(h.network.length,0);assert.equal(h.sqlite.prepare("SELECT COUNT(*) n FROM management_vault WHERE integration LIKE 'gmail-oauth:%'").get().n,0);
}finally{h.close();}});

test('only the saved original draft is sent to both authorized reviewers; concurrent completion sends once',async()=>{const h=harness();try{
 await h.config();h.setTransport(h.google());const api=h.load('lib/memo-requests.ts'),gmail=h.load('lib/gmail.ts');
 const id=await api.startMemoRequest({clientName:'بيانات اصطناعية فقط'},null,'https://www.sabeq.legal');const original='مسودة اصطناعية للمراجعة\nهذا نص اختبار كما حُفظ، دون أي توليد بديل.';
 await api.finishMemoRequest(id,'needs_review',original,'draft_generated');await Promise.all([gmail.sendSavedDraft(id),gmail.sendSavedDraft(id)]);
 const sent=h.network.filter(r=>r.url.endsWith('/messages/send'));assert.equal(sent.length,1);const decoded=decodeRaw(JSON.parse(sent[0].init.body).raw);assert.ok(decoded.headers.includes('From: '+sender));assert.ok(decoded.headers.includes('To: '+recipients.join(', ')));assert.ok(decoded.body.includes(original));assert.ok(decoded.body.includes('#memos?record='+id));assert.equal(h.sqlite.prepare('SELECT output_text FROM management_memo_requests WHERE id=?').get(id).output_text,original);
 assert.equal((await gmail.gmailSettings()).deliveries[0].status,'accepted');
}finally{h.close();}});

test('a pending saved draft waits for consent and is sent once only after an administrator requests it',async()=>{const h=harness();try{
 const api=h.load('lib/memo-requests.ts'),id=await api.startMemoRequest({clientName:'اختبار انتظار'},null,'https://www.sabeq.legal');await api.finishMemoRequest(id,'needs_review','مسودة اصطناعية معلقة');assert.equal(h.network.length,0);assert.equal((await h.load('lib/gmail.ts').gmailSettings()).deliveries[0].status,'pending');
 await h.config();h.setTransport(h.google());const token=await h.manager(),routes=h.load('app/api/management/[...path]/route.ts');const response=await routes.POST(h.request(token,{action:'send-pending'}));assert.equal(response.status,200);assert.equal((await response.json()).attempted,1);await routes.POST(h.request(token,{action:'send-pending'}));assert.equal(h.network.filter(r=>r.url.endsWith('/messages/send')).length,1);
}finally{h.close();}});

test('Gmail failure preserves the memo and an uncertain send is never blindly repeated',async()=>{const h=harness();try{
 await h.config();h.setTransport(async(url,init)=>{if(url.endsWith('/messages/send'))throw Error('synthetic connection reset');return h.google()(url,init);});const api=h.load('lib/memo-requests.ts'),id=await api.startMemoRequest({},null,'https://www.sabeq.legal');await api.finishMemoRequest(id,'needs_review','نص اصطناعي محفوظ');await h.load('lib/gmail.ts').sendSavedDraft(id,true);
 assert.equal(h.network.filter(r=>r.url.endsWith('/messages/send')).length,1);assert.equal((await h.load('lib/gmail.ts').gmailSettings()).deliveries[0].status,'uncertain');assert.equal(h.sqlite.prepare('SELECT output_text FROM management_memo_requests WHERE id=?').get(id).output_text,'نص اصطناعي محفوظ');assert.ok(!JSON.stringify(h.logs).includes(refreshToken));
}finally{h.close();}});

test('empty, failed and unfinished memo requests never trigger email',async()=>{const h=harness();try{
 await h.config();const api=h.load('lib/memo-requests.ts'),id=await api.startMemoRequest({},null,'https://www.sabeq.legal');await api.finishMemoRequest(id,'needs_review','');await api.finishMemoRequest(id,'failed','نص اصطناعي غير ناجح');assert.equal(h.network.length,0);assert.equal((await h.load('lib/gmail.ts').gmailSettings()).deliveries.length,0);
}finally{h.close();}});

test('simultaneous first attempts claim one delivery even before a provider response exists',async()=>{const h=harness();try{
 await h.config();h.setTransport(h.google());const api=h.load('lib/memo-requests.ts'),id=await api.startMemoRequest({},null,'https://www.sabeq.legal');h.sqlite.prepare("UPDATE management_memo_requests SET output_text=?,status='needs_review' WHERE id=?").run('مسودة اصطناعية لتعارض محاولات الإرسال',id);
 await Promise.all([h.load('lib/gmail.ts').sendSavedDraft(id),h.load('lib/gmail.ts').sendSavedDraft(id),h.load('lib/gmail.ts').sendSavedDraft(id)]);assert.equal(h.network.filter(r=>r.url.endsWith('/messages/send')).length,1);
}finally{h.close();}});

test('long Arabic drafts preserve the entire saved output without an encoding argument-limit failure',async()=>{const h=harness();try{
 await h.config();h.setTransport(h.google());const api=h.load('lib/memo-requests.ts'),id=await api.startMemoRequest({},null,'https://www.sabeq.legal'),original='نص اصطناعي طويل للمراجعة. '.repeat(6000);await api.finishMemoRequest(id,'needs_review',original);
 const sent=h.network.filter(r=>r.url.endsWith('/messages/send'));assert.equal(sent.length,1);const saved=h.sqlite.prepare('SELECT output_text FROM management_memo_requests WHERE id=?').get(id).output_text;assert.ok(decodeRaw(JSON.parse(sent[0].init.body).raw).body.includes(saved));
}finally{h.close();}});
