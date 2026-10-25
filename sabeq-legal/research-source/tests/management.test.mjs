import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto,createHmac,pbkdf2Sync } from 'node:crypto';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=resolve(new URL('..',import.meta.url).pathname);
function harness(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(root+'/drizzle/'+file,'utf8'));
 const statements=query=>{let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(query).get(...args)||null;},async all(){return{results:sqlite.prepare(query).all(...args)};},async run(){const result=sqlite.prepare(query).run(...args);return{success:true,meta:{changes:Number(result.changes)}};}};};
 const db={prepare:statements,async batch(values){const out=[];for(const v of values)out.push(await v.run());return out;}};
 const runtime={AUTH_SECRET:'synthetic-management-secret-'.repeat(3),MANAGEMENT_ALLOWED_EMAILS:'manager@example.test'};
 const cache=new Map(),network=[],identity={value:null};let transport=async()=>Response.json({error:'offline'},{status:503});
 // Copy noble options into its module realm; the actual KDF runs unchanged across the VM boundary.
 const load=file=>{file=resolve(root,file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const localRequire=name=>{if(name==='@/db')return{getD1:()=>db};if(name==='cloudflare:workers')return{env:runtime};if(name==='next/headers')return{headers:async()=>new Headers(identity.value?{'oai-authenticated-user-id':'synthetic-id','oai-authenticated-user-email':identity.value}: {})};if(name==='next/navigation')return{redirect:()=>{throw Error('unexpected redirect helper');}};if(name==='@noble/hashes/pbkdf2.js'){const real=require(name);return {...real,pbkdf2Async:(hash,password,salt,opts)=>real.pbkdf2Async(hash,password,salt,{...opts})};}if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(resolve(dirname(file),name+'.ts'));return require(name);};
  vm.runInNewContext(source,{exports,require:localRequire,crypto:webcrypto,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,Headers,Request,Response,AbortSignal,Error,Date,JSON,btoa,atob,console,fetch:async(url,init={})=>{network.push({url:String(url),init});return transport(url,init);}});return exports;
 };
 return{sqlite,db,runtime,load,network,identity,setTransport:f=>transport=f,close:()=>sqlite.close()};
}
const request=(path,token,body,origin='https://q8-ux.github.io')=>new Request('https://sabeq-legal-public.centrino.chatgpt.site/api/management/'+path,{method:body?'POST':'GET',headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});

const staffNames=['user1','user2','user3','user5','it_user'];
const staffPepper='synthetic-only-management-pepper-'.repeat(2);
const staffPasswords=Object.fromEntries(staffNames.map((name,i)=>[name,`Synthetic-${name}-Password-${i}-2026!`]));
const staffAccounts=staffNames.map((username,i)=>{const salt=Buffer.alloc(16,i+1);return {username,salt:salt.toString('hex'),hash:pbkdf2Sync(createHmac('sha256',staffPepper).update(staffPasswords[username]).digest(),salt,600000,32,'sha256').toString('hex'),enabled:true};});
function configureStaff(h){h.runtime.MANAGEMENT_PASSWORD_PEPPER=staffPepper;h.runtime.MANAGEMENT_PASSWORD_USERS=JSON.stringify({version:1,accounts:staffAccounts});}
async function staffLogin(h,username='user1'){const response=await h.load('app/api/management/[...path]/route.ts').POST(request('password-login',null,{username,password:staffPasswords[username]}));assert.equal(response.status,200);return response.json();}

const adminPassword='AdminTest#11';
const adminPepper='synthetic-admin-pepper-'.repeat(3);
const adminSalt=Buffer.alloc(16,77);
const adminAccount={username:'saad',salt:adminSalt.toString('hex'),hash:pbkdf2Sync(createHmac('sha256',adminPepper).update(adminPassword).digest(),adminSalt,600000,32,'sha256').toString('hex'),enabled:true};
function configureAdministrator(h){h.runtime.MANAGEMENT_ADMIN_PASSWORD_PEPPER=adminPepper;h.runtime.MANAGEMENT_ADMIN_PASSWORD_USERS=JSON.stringify({version:1,accounts:[adminAccount]});}
async function adminLogin(h,username='Saad'){const response=await h.load('app/api/management/[...path]/route.ts').POST(request('password-login',null,{username,password:adminPassword,role:'user'}));assert.equal(response.status,200);return response.json();}

test('password verifier preserves the independent PBKDF2 vector while staff no longer enter the administration',async()=>{const h=harness();try{configureStaff(h);const result=await h.load('lib/management-password.ts').authenticateManagementPassword({username:' USER1 ',password:staffPasswords.user1});assert.equal(result.username,'user1');assert.match(result.sessionPrincipal,/^staff:user1:[a-f0-9]{32}$/);assert.equal((await h.load('app/api/management/[...path]/route.ts').POST(request('password-login',null,{username:'user1',password:staffPasswords.user1,role:'administrator'}))).status,403);}finally{h.close();}});

test('five legacy staff accounts cannot create administrator sessions even with correct distinct passwords',async()=>{const h=harness();try{configureStaff(h);const routes=h.load('app/api/management/[...path]/route.ts');for(const username of staffNames){const response=await routes.POST(request('password-login',null,{username,password:staffPasswords[username],role:'administrator'}));assert.equal(response.status,403);assert.ok(!(await response.json()).token);}assert.equal(h.sqlite.prepare('SELECT count(*) n FROM management_sessions').get().n,0);}finally{h.close();}});

test('Saad uses the server configured administrator role and no credential appears in responses or sessions',async()=>{const h=harness();try{configureStaff(h);configureAdministrator(h);const session=await adminLogin(h);assert.equal(session.manager.username,'saad');assert.equal(session.manager.role,'administrator');for(const key of ['users','site','services','bookings','programmer','payments'])assert.ok(session.manager.sections.includes(key));const stored=JSON.stringify(h.sqlite.prepare('SELECT * FROM management_sessions').all());const response=JSON.stringify(session);for(const secret of [adminPassword,adminPepper,adminAccount.hash,session.token])assert.ok(!stored.includes(secret));for(const secret of [adminPassword,adminPepper,adminAccount.hash])assert.ok(!response.includes(secret));assert.match(stored,/staff-admin:saad:/);const routes=h.load('app/api/management/[...path]/route.ts');assert.equal((await routes.GET(request('session',session.token))).status,200);assert.equal((await routes.GET(request('programmer',session.token))).status,200);}finally{h.close();}});

test('legacy operator sessions are rejected on every protected control-center action',async()=>{const h=harness();try{configureStaff(h);const auth=h.load('lib/management-auth.ts'),account=await h.load('lib/management-password.ts').authenticateManagementPassword({username:'user1',password:staffPasswords.user1});const token=auth.randomToken(),now=Math.floor(Date.now()/1000);h.sqlite.prepare('INSERT INTO management_sessions VALUES(?,?,?,?,?)').run(await auth.digest(token),account.sessionPrincipal,'user1',now+3600,now);const routes=h.load('app/api/management/[...path]/route.ts');for(const path of ['session','snapshot','users','site','services','bookings','programmer','payments']){assert.equal((await routes.GET(request(path,token))).status,403);assert.equal((await routes.POST(request(path,token,{action:'save',role:'administrator'}))).status,403);}assert.equal(h.network.length,0);}finally{h.close();}});

test('administrator disable, credential rotation, idle expiry and logout revoke access',async()=>{const h=harness();try{configureAdministrator(h);const routes=h.load('app/api/management/[...path]/route.ts');let session=await adminLogin(h);await routes.POST(request('logout',session.token,{}));assert.equal((await routes.GET(request('session',session.token))).status,401);session=await adminLogin(h);h.runtime.MANAGEMENT_ADMIN_PASSWORD_USERS=JSON.stringify({version:1,accounts:[{...adminAccount,enabled:false}]});assert.equal((await routes.GET(request('session',session.token))).status,401);configureAdministrator(h);session=await adminLogin(h);h.runtime.MANAGEMENT_ADMIN_PASSWORD_USERS=JSON.stringify({version:1,accounts:[{...adminAccount,hash:'0'.repeat(64)}]});assert.equal((await routes.GET(request('session',session.token))).status,401);configureAdministrator(h);session=await adminLogin(h);h.sqlite.prepare('UPDATE management_sessions SET last_seen_at=0').run();assert.equal((await routes.GET(request('session',session.token))).status,401);}finally{h.close();}});

test('password throttling and same-origin protection apply to administrator login',async()=>{const h=harness();try{configureAdministrator(h);const routes=h.load('app/api/management/[...path]/route.ts');for(let i=0;i<9;i++){const response=await routes.POST(request('password-login',null,{username:'Saad',password:'short'}));assert.equal(response.status,i<8?401:429);}assert.equal((await routes.POST(request('password-login',null,{username:'Saad',password:adminPassword},'https://other.example'))).status,403);assert.equal((await routes.POST(request('password-login',null,{username:'Saad',password:'x'.repeat(5000)}))).status,413);}finally{h.close();}});

async function login(h){const auth=h.load('lib/management-auth.ts'),verifier=auth.randomToken(),code=auth.randomToken();h.sqlite.prepare('INSERT INTO management_login_codes VALUES (?,?,?,?,?)').run(await auth.digest(code),'manager@example.test','مدير اصطناعي',await auth.proofChallenge(verifier),Math.floor(Date.now()/1000)+60);return{...(await auth.exchangeManagerCode({code,verifier})),code,verifier};}

test('new migration adds isolated management tables without dropping the original service tables',()=>{const h=harness();try{const names=h.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);for(const name of ['management_memo_requests','management_vault','management_sessions','contact_messages','public_users','service_records'])assert.ok(names.includes(name));assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM public_users').get().n,0);}finally{h.close();}});
test('unauthenticated and cross-origin management reads/writes never reach client data or external services',async()=>{const h=harness();try{const routes=h.load('app/api/management/[...path]/route.ts');for(const path of ['snapshot','memos','inbox','commands','whatsapp','mail','legislation','legislation-report','legislation-workbench','legislation-articles','legislation-asset']){assert.equal((await routes.GET(request(path))).status,401);}const session=await login(h);assert.equal((await routes.POST(request('commands',session.token,{title:'أمر اصطناعي'},'https://other.example'))).status,403);assert.equal(h.network.length,0);}finally{h.close();}});
test('PKCE code is single use, wrong proof does not consume it, expired sessions and revoked allowlist fail closed',async()=>{const h=harness();try{const auth=h.load('lib/management-auth.ts');const verifier=auth.randomToken(),code=auth.randomToken();h.sqlite.prepare('INSERT INTO management_login_codes VALUES(?,?,?,?,?)').run(await auth.digest(code),'manager@example.test','اختبار',await auth.proofChallenge(verifier),Math.floor(Date.now()/1000)+60);await assert.rejects(auth.exchangeManagerCode({code,verifier:auth.randomToken()}));const result=await auth.exchangeManagerCode({code,verifier});await assert.rejects(auth.exchangeManagerCode({code,verifier}));assert.equal((await auth.requireManager(request('session',result.token))).email,'manager@example.test');h.runtime.MANAGEMENT_ALLOWED_EMAILS='';await assert.rejects(auth.requireManager(request('session',result.token)));h.runtime.MANAGEMENT_ALLOWED_EMAILS='manager@example.test';h.sqlite.prepare('UPDATE management_sessions SET expires_at=0').run();await assert.rejects(auth.requireManager(request('session',result.token)));}finally{h.close();}});
test('login uses the actual platform Request, prevents redirect loops and ignores a conflicting render identity',async()=>{const h=harness();try{
 const auth=h.load('lib/management-auth.ts'),challenge=await auth.proofChallenge(auth.randomToken()),state=auth.randomToken();
 const req=request('login?'+new URLSearchParams({challenge,state,return_to:'https://attacker.example'}));
 const first=await auth.managerLogin(req),signin=new URL(first.headers.get('location'));
 assert.equal(signin.pathname,'/signin-with-chatgpt');assert.equal(first.headers.get('cache-control'),'no-store');
 const returnPath=signin.searchParams.get('return_to');assert.equal(new URL(returnPath,req.url).searchParams.get('auth_return'),'1');
 const bounded=await auth.managerLogin(new Request(new URL(returnPath,req.url)));
 assert.equal(new URL(bounded.headers.get('location')).searchParams.get('login_error'),'identity_unavailable');
 h.identity.value='manager@example.test';
 const anonymous=await auth.managerLogin(req);assert.equal(new URL(anonymous.headers.get('location')).pathname,'/signin-with-chatgpt');
 const platformRequest=email=>{const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','synthetic-platform-id');headers.set('oai-authenticated-user-email',email);return new Request(req,{headers});};
 const denied=await auth.managerLogin(platformRequest('unknown@example.test'));assert.equal(new URL(denied.headers.get('location')).searchParams.get('login_error'),'not_authorized');
 h.identity.value='unknown@example.test';
 const accepted=await auth.managerLogin(platformRequest('manager@example.test'));assert.ok(accepted.headers.get('location').startsWith(auth.MANAGEMENT_HOME));assert.equal(accepted.headers.get('referrer-policy'),'no-referrer');assert.ok(!accepted.headers.get('location').includes('attacker'));
 assert.equal(new URL(accepted.headers.get('location')).searchParams.get('state'),state);
}finally{h.close();}});
test('owner and existing administrators complete route login, PKCE exchange, session and logout without render identity',async()=>{const h=harness();try{
 h.runtime.MANAGEMENT_OWNER_EMAIL='owner@example.test';
 const auth=h.load('lib/management-auth.ts'),routes=h.load('app/api/management/[...path]/route.ts');
 for(const email of ['manager@example.test','owner@example.test']){
  const verifier=auth.randomToken(),state=auth.randomToken(),challenge=await auth.proofChallenge(verifier);
  const req=request('login?'+new URLSearchParams({challenge,state}));req.headers.set('oai-authenticated-user-id','synthetic-platform-id');req.headers.set('oai-authenticated-user-email',email);
  const response=await routes.GET(req);assert.equal(response.status,302);
  const target=new URL(response.headers.get('location'));assert.equal(target.origin,'https://q8-ux.github.io');assert.equal(target.searchParams.get('state'),state);
  const exchange=await routes.POST(request('exchange',null,{code:target.searchParams.get('code'),verifier}));assert.equal(exchange.status,200);
  const session=await exchange.json();assert.equal(session.manager.email,email);
  const read=await routes.GET(request('session',session.token));assert.equal(read.status,200);assert.equal((await read.json()).manager.email,email);
  if(email==='owner@example.test'){h.runtime.MANAGEMENT_OWNER_EMAIL='';assert.equal((await routes.GET(request('session',session.token))).status,401);h.runtime.MANAGEMENT_OWNER_EMAIL=email;}
  assert.equal((await routes.POST(request('logout',session.token,{}))).status,200);assert.equal((await routes.GET(request('session',session.token))).status,401);
 }
 assert.equal(h.runtime.MANAGEMENT_ALLOWED_EMAILS,'manager@example.test');assert.equal(h.network.length,0);
}finally{h.close();}});

test('the shipped GitHub client completes a real code exchange and clears callback state before showing the dashboard',async()=>{const h=harness();try{
 const auth=h.load('lib/management-auth.ts'),routes=h.load('app/api/management/[...path]/route.ts'),verifier=auth.randomToken(),state=auth.randomToken();
 const req=request('login?'+new URLSearchParams({challenge:await auth.proofChallenge(verifier),state}));req.headers.set('oai-authenticated-user-id','synthetic-platform-id');req.headers.set('oai-authenticated-user-email','manager@example.test');
 const callback=(await routes.GET(req)).headers.get('location');
 const storage=new Map([['sabeq-admin-proof',verifier],['sabeq-admin-state',state]]),nodes=new Map(),calls=[];let cleanPath='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},replaceChildren(){this.innerHTML='';}});return nodes.get(id);};
 const context=vm.createContext({URL,URLSearchParams,Headers,Request,Response,TextEncoder,TextDecoder,Uint8Array,AbortSignal,crypto:webcrypto,btoa,atob,console,
  document:{getElementById:node,addEventListener(){}},location:{href:callback,pathname:'/saad/sabeq-admin-preview/'},history:{replaceState(_s,_t,path){cleanPath=path;}},
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},setInterval(){},setTimeout,clearTimeout,
  fetch:async(url,init)=>{const headers=new Headers(init.headers);headers.set('Origin','https://q8-ux.github.io');const request=new Request(url,{...init,headers});calls.push(new URL(url).pathname);return request.method==='POST'?routes.POST(request):routes.GET(request);}
 });
 const client=readFileSync(root+'/public/management/admin.js','utf8').replace('void boot();','globalThis.bootPromise=boot();');
 vm.runInContext(client,context);await context.bootPromise;
 assert.equal(cleanPath,'/saad/sabeq-admin-preview/');assert.equal(storage.has('sabeq-admin-proof'),false);assert.equal(storage.has('sabeq-admin-state'),false);
 assert.match(storage.get('sabeq-management-session'),/^[A-Za-z0-9_-]{43}$/);assert.match(node('app').innerHTML,/class="sidebar"/);assert.match(node('workspace').innerHTML,/مصادر المتابعة/);
 assert.deepEqual(calls,['/api/management/exchange','/api/management/session','/api/management/snapshot']);
}finally{h.close();}});
test('the Payments deep link survives the real PKCE exchange and only loads protected payment administration',async()=>{const h=harness();try{
 const auth=h.load('lib/management-auth.ts'),routes=h.load('app/api/management/[...path]/route.ts'),verifier=auth.randomToken(),state=auth.randomToken();
 const req=request('login?'+new URLSearchParams({challenge:await auth.proofChallenge(verifier),state}));req.headers.set('oai-authenticated-user-id','synthetic-platform-id');req.headers.set('oai-authenticated-user-email','manager@example.test');
 const callback=(await routes.GET(req)).headers.get('location');
 const storage=new Map([['sabeq-admin-section','payments'],['sabeq-admin-proof',verifier],['sabeq-admin-state',state]]),nodes=new Map(),calls=[];let cleanPath='';
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},replaceChildren(){this.innerHTML='';}});return nodes.get(id);};
 const context=vm.createContext({URL,URLSearchParams,Headers,Request,Response,TextEncoder,TextDecoder,Uint8Array,AbortSignal,crypto:webcrypto,btoa,atob,console,
  document:{getElementById:node,addEventListener(){}},location:{href:callback,pathname:'/saad/sabeq-admin-preview/'},history:{replaceState(_s,_t,path){cleanPath=path;}},
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},setInterval(){},setTimeout,clearTimeout,
  fetch:async(url,init)=>{const headers=new Headers(init.headers);headers.set('Origin','https://q8-ux.github.io');const request=new Request(url,{...init,headers});calls.push(new URL(url).pathname);return request.method==='POST'?routes.POST(request):routes.GET(request);}
 });
 const client=readFileSync(root+'/public/management/admin.js','utf8').replace('void boot();','globalThis.bootPromise=boot();');
 vm.runInContext(client,context);await context.bootPromise;
 assert.equal(cleanPath,'/saad/sabeq-admin-preview/#payments');assert.equal(storage.has('sabeq-admin-proof'),false);assert.equal(storage.has('sabeq-admin-state'),false);
 assert.match(storage.get('sabeq-management-session'),/^[A-Za-z0-9_-]{43}$/);assert.match(node('app').innerHTML,/class="sidebar"/);assert.match(node('workspace').innerHTML,/إدارة فقط/);assert.match(node('workspace').innerHTML,/name="publicCheckoutEnabled"/);assert.match(node('workspace').innerHTML,/name="required" type="checkbox" disabled/);assert.ok(!node('workspace').innerHTML.includes('synthetic-management-secret'));
 assert.deepEqual(calls,['/api/management/exchange','/api/management/session','/api/management/payments']);
}finally{h.close();}});
test('guest and signed-in memo requests persist their distinct outcomes and stay behind the admin boundary',async()=>{const h=harness();try{const ledger=h.load('lib/memo-requests.ts');const id=await ledger.startMemoRequest({clientName:'عميل اصطناعي',caseType:'اختبار',facts:'وقائع اصطناعية فقط'},null,'https://www.sabeq.legal');assert.equal(h.sqlite.prepare('SELECT status FROM management_memo_requests WHERE id=?').get(id).status,'running');await ledger.finishMemoRequest(id,'needs_review','مسودة اصطناعية للمراجعة','draft_generated');const auth=await login(h),routes=h.load('app/api/management/[...path]/route.ts');assert.equal((await routes.GET(request('memos?id='+id))).status,401);const result=await(await routes.GET(request('memos?id='+id,auth.token))).json();assert.equal(result.memo.output_text,'مسودة اصطناعية للمراجعة');assert.equal(result.memo.user_id,null);const id2=await ledger.startMemoRequest({clientName:'مستخدم اصطناعي',caseType:'اختبار'},{id:'synthetic-user',email:'user@example.test'},'https://q8-ux.github.io');await ledger.finishMemoRequest(id2,'failed','','request_422');assert.equal(h.sqlite.prepare('SELECT user_id,status,error_code FROM management_memo_requests WHERE id=?').get(id2).user_id,'synthetic-user');}finally{h.close();}});
test('commands and notification read states survive independent requests; raw customer text is never required in events',async()=>{const h=harness();try{const session=await login(h),routes=h.load('app/api/management/[...path]/route.ts');let response=await routes.POST(request('commands',session.token,{title:'متابعة طلب اصطناعي',details:'تفاصيل اختبار',priority:'urgent'}));assert.equal(response.status,200);let rows=(await(await routes.GET(request('commands',session.token))).json()).commands;assert.equal(rows.length,1);response=await routes.POST(request('commands',session.token,{id:rows[0].id,status:'completed'}));assert.equal(response.status,200);rows=(await(await routes.GET(request('commands',session.token))).json()).commands;assert.equal(rows[0].status,'completed');await routes.POST(request('read',session.token,{ids:['memo:synthetic:needs_review']}));await routes.POST(request('read',session.token,{ids:['memo:synthetic:needs_review']}));assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_read_states').get().n,1);assert.equal((await routes.POST(request('commands',session.token,{id:rows[0].id,status:'shell_exec'}))).status,400);}finally{h.close();}});
const sessionId='11111111-1111-4111-8111-111111111111';
const programmerKey='synthetic-fcc-proxy-credential-123456';
const programmerConfig={action:'save',mode:'fcc',baseUrl:'https://fcc.vendor.com',apiKey:programmerKey,model:'nvidia_nim/test/model'};
const programmerReply=()=>Response.json({content:[{type:'text',text:'السبب جمع نصوص. استخدم Number(a) + Number(b)، وتحقق من أن الناتج 15.'}],stop_reason:'end_turn',usage:{input_tokens:60,output_tokens:30}});

test('FCC installation distinguishes a missing provider key from a successful model catalog without fallback',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');
  const empty=await api.programmerAction(null,'test');assert.equal(empty.connectorInstalled,true);assert.equal(empty.gatewayConfigured,false);assert.equal(empty.providerConfigured,null);
  await api.programmerAction(programmerConfig,'test');
  h.setTransport(async(url)=>String(url).includes('/models')?Response.json({data:[{id:programmerConfig.model}],sabeq:{providerConfigured:false}}):Response.json({error:{code:'provider_not_configured'}},{status:409}));
  const catalog=await api.programmerAction({action:'models'},'test');assert.equal(catalog.providerConfigured,false);assert.equal(catalog.testedAt,null);assert.ok(catalog.catalogCheckedAt);
  assert.equal((await api.programmerAction(null,'test')).providerConfigured,false);
  await assert.rejects(api.programmerAction({action:'run',task:'trial'},'test'),error=>error.message.includes('مفتاح مزود الذكاء الاصطناعي'));
  assert.equal(h.network.length,2);assert.ok(!h.network.some(call=>call.url.includes('api.openai.com')));
 }finally{h.close();}
});

test('removing the gateway provider key clears old inference readiness and keeps credentials private',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');await api.programmerAction(programmerConfig,'test');
  h.setTransport(async()=>programmerReply());assert.ok((await api.programmerAction({action:'run',task:'trial'},'test')).testedAt);
  h.setTransport(async()=>Response.json({data:[{id:programmerConfig.model}],sabeq:{providerConfigured:false}}));
  const catalog=await api.programmerAction({action:'models'},'test');assert.equal(catalog.testedAt,null);assert.equal(catalog.testedModel,null);assert.ok(!JSON.stringify(catalog).includes(programmerKey));
 }finally{h.close();}
});

test('programmer endpoints enforce manager identity and origin before configuration or inference',async()=>{
 const h=harness();try{const routes=h.load('app/api/management/[...path]/route.ts');
  assert.equal((await routes.GET(request('programmer'))).status,401);
  assert.equal((await routes.POST(request('programmer',null,programmerConfig))).status,401);
  const session=await login(h);
  assert.equal((await routes.POST(request('programmer',session.token,programmerConfig,'https://attacker.example'))).status,403);
  const view=await(await routes.GET(request('programmer',session.token))).json();assert.equal(view.hasApiKey,false);assert.equal(view.testedAt,null);assert.equal(h.network.length,0);
 }finally{h.close();}
});
test('programmer encrypts and redacts keys, rejects unsafe gateways and requires key re-entry for a changed destination',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');
  const saved=await api.programmerAction(programmerConfig,'test');assert.equal(saved.baseUrl,'https://fcc.vendor.com/');assert.equal(saved.hasApiKey,true);assert.ok(!JSON.stringify(saved).includes(programmerKey));
  const sealed=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='programmer'").get().sealed;assert.ok(!sealed.includes(programmerKey));
  await api.programmerAction({...programmerConfig,apiKey:''},'test');
  for(const baseUrl of ['http://fcc.vendor.com','https://127.0.0.1','https://[::1]','https://localhost','https://service.internal','https://user:password@fcc.vendor.com','https://fcc.vendor.com?secret=x','https://fcc.vendor.com:8443'])await assert.rejects(api.programmerAction({...programmerConfig,baseUrl},'test'));
  await assert.rejects(api.programmerAction({...programmerConfig,baseUrl:'https://other.vendor.com',apiKey:''},'test'));
  await assert.rejects(api.programmerAction({...programmerConfig,apiKey:'freecc'},'test'));
  const current=await api.programmerAction(null,'test');assert.equal(current.baseUrl,'https://fcc.vendor.com/');assert.equal(h.network.length,0);
 }finally{h.close();}
});
test('FCC catalog success does not mark inference tested and only messages endpoint returns a measured review',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');await api.programmerAction(programmerConfig,'test');
  h.setTransport(async(url,init)=>String(url).includes('/models')?Response.json({data:[{id:'nvidia_nim/test/model'},{id:'<script>bad</script>'}]}):programmerReply());
  const catalog=await api.programmerAction({action:'models'},'test');assert.equal(catalog.catalogOnly,true);assert.equal(catalog.models.length,1);assert.equal(catalog.testedAt,null);
  const result=await api.programmerAction({action:'run',task:'trial'},'test');assert.match(result.text,/Number/);assert.equal(result.source,'fcc');assert.equal(result.applied,false);assert.equal(result.usage.inputTokens,60);assert.ok(result.testedAt);
  const call=h.network.at(-1);assert.equal(call.url,'https://fcc.vendor.com/v1/messages');assert.equal(call.init.headers.Authorization,'Bearer '+programmerKey);assert.equal(call.init.redirect,'error');const body=JSON.parse(call.init.body);assert.equal(body.stream,false);assert.equal(body.max_tokens,1800);assert.equal(body.model,programmerConfig.model);assert.match(body.messages[0].content,/اصطناعي/);
  assert.ok(!h.sqlite.prepare('SELECT title FROM management_events').all().some(row=>row.title.includes('Number')));
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_commands').get().n,0);
 }finally{h.close();}
});
test('a completed old test cannot restore rotated programmer credentials',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');await api.programmerAction(programmerConfig,'test');
  h.setTransport(async()=>{await api.programmerAction({...programmerConfig,apiKey:'rotated-synthetic-proxy-key-123456'},'other-test');return programmerReply();});
  await api.programmerAction({action:'run',task:'trial'},'test');
  const vault=await h.load('lib/management-integrations.ts').integrationConfig('programmer');assert.equal(vault.apiKey,'rotated-synthetic-proxy-key-123456');assert.equal(vault.testedAt,undefined);
 }finally{h.close();}
});
test('FCC incomplete, tool-only, oversized, malformed and rejected responses fail without using the project provider',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');h.runtime.OPENAI_API_KEY='synthetic-project-key';await api.programmerAction(programmerConfig,'test');
  for(const response of [Response.json({stop_reason:'max_tokens',content:[{type:'text',text:'partial'}]}),Response.json({stop_reason:'tool_use',content:[]}),Response.json({stop_reason:'end_turn',content:[]}),Response.json({stop_reason:'end_turn',content:[{type:'text',text:'x'.repeat(100_001)}]}),new Response('not-json'),new Response(programmerKey,{status:401})]){
   h.setTransport(async()=>response);const before=h.network.length;await assert.rejects(api.programmerAction({action:'run',task:'trial'},'test'),e=>!e.message.includes(programmerKey));assert.equal(h.network.length,before+1);assert.ok(!h.network.some(call=>call.url.includes('api.openai.com')));
  }
  assert.equal((await api.programmerAction(null,'test')).testedAt,null);
 }finally{h.close();}
});
test('programmer rejects secrets and invalid or oversized work before any external call; cancellation remains explicit',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');await api.programmerAction(programmerConfig,'test');
  for(const data of [{task:'shell_exec',prompt:'تشغيل أمر'},{task:'review',prompt:'x'.repeat(2001)},{task:'review',prompt:'وصف اصطناعي',code:'x'.repeat(4001)},{task:'review',prompt:'راجع هذا الكود الاصطناعي',code:'const api_key = "abcdefghijklmno";'}])await assert.rejects(api.programmerAction({action:'run',...data},'test'));
  const abort=new AbortController();abort.abort();await assert.rejects(api.programmerAction({action:'run',task:'trial'},'test',abort.signal),e=>e.status===499);assert.equal(h.network.length,0);
 }finally{h.close();}
});
test('project mode must be explicitly selected and uses the existing generation helper without exposing its key',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');
  await assert.rejects(api.programmerAction({action:'save',mode:'project'},'test'));
  h.runtime.OPENAI_API_KEY='synthetic-project-key';h.runtime.OPENAI_MODEL='gpt-5.6';
  const saved=await api.programmerAction({action:'save',mode:'project'},'test');assert.equal(saved.mode,'project');assert.equal(saved.projectAvailable,true);assert.ok(!JSON.stringify(saved).includes(h.runtime.OPENAI_API_KEY));
  h.setTransport(async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'اقتراح اصطناعي مكتمل'}]}]}));
  const response=await api.programmerAction({action:'run',task:'trial'},'test');assert.equal(response.source,'project');assert.equal(response.usage,null);assert.equal(response.applied,false);assert.equal(h.network.length,1);assert.equal(h.network[0].url,'https://api.openai.com/v1/responses');assert.equal(JSON.parse(h.network[0].init.body).store,false);
 }finally{h.close();}
});
test('programmer inference is rate limited separately and advice is saved as a command only through an explicit action',async()=>{
 const h=harness();try{const api=h.load('lib/management-programmer.ts');await api.programmerAction(programmerConfig,'test');h.setTransport(async()=>programmerReply());const routes=h.load('app/api/management/[...path]/route.ts'),session=await login(h);
  for(let i=0;i<20;i++)assert.equal((await routes.POST(request('programmer',session.token,{action:'run',task:'trial'}))).status,200);
  assert.equal((await routes.POST(request('programmer',session.token,{action:'run',task:'trial'}))).status,429);assert.equal(h.network.length,20);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_commands').get().n,0);
  assert.equal((await routes.POST(request('commands',session.token,{title:'مراجعة مقترح اصطناعي',details:'اقتراح محفوظ باختيار المدير'}))).status,200);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_commands').get().n,1);
 }finally{h.close();}
});
test('OpenWA credentials are encrypted and masked, endpoints are bounded, and connection tests never send messages',async()=>{const h=harness();try{const api=h.load('lib/management-integrations.ts');const key='synthetic-openwa-key';for(const bad of ['http://gateway.example.com','https://localhost','https://127.0.0.1','https://secret@wa.example.com','https://wa.example.com:9999','https://service.internal'])assert.throws(()=>api.gatewayUrl(bad));await api.whatsappAction({action:'save',baseUrl:'https://wa.example.com',apiKey:key,sessionId,officePhone:'+96500000000',enabled:true},'manager@example.test');const stored=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='whatsapp'").get().sealed;assert.ok(!stored.includes(key));const safe=await api.whatsappAction(null,'manager@example.test');assert.equal(safe.hasApiKey,true);assert.ok(!JSON.stringify(safe).includes(key));h.setTransport(async(url,init)=>{assert.equal(init.headers['X-API-Key'],key);assert.equal(init.redirect,'error');assert.ok(!String(url).includes('/messages'));return Response.json([{id:sessionId,name:'جلسة اختبار',status:'ready'}]);});const result=await api.whatsappAction({action:'test'},'manager@example.test');assert.equal(result.connectionStatus,'ready');assert.equal(result.automaticMessaging,false);await assert.rejects(api.whatsappAction({action:'save',baseUrl:'https://other.example.com',sessionId,enabled:true},'manager@example.test'));}finally{h.close();}});
test('OpenWA signed callback is session scoped, deduplicated and stores no conversation text',async()=>{const h=harness();try{const api=h.load('lib/management-integrations.ts'),auth=h.load('lib/management-auth.ts');await api.saveIntegration('whatsapp',{baseUrl:'https://wa.example.com',apiKey:'synthetic',sessionId,enabled:true,webhookId:'test-hook'},'test');const payload=JSON.stringify({sessionId,event:'message.received',data:{body:'نص عميل اصطناعي لا يحفظ في التنبيهات'}});const secret=await auth.signIntegration('openwa-office-events-v1'),signature='sha256='+await auth.signIntegration(payload,secret);const req=sig=>new Request('https://example.org/api/integrations/whatsapp',{method:'POST',headers:{'X-OpenWA-Signature':sig},body:payload});await assert.rejects(api.receiveWhatsApp(req('sha256=forged')));await api.receiveWhatsApp(req(signature));await api.receiveWhatsApp(req(signature));const rows=h.sqlite.prepare('SELECT * FROM management_events').all();assert.equal(rows.length,1);assert.ok(!JSON.stringify(rows).includes('نص عميل'));const other=payload.replace(sessionId,'22222222-2222-4222-8222-222222222222'),sig2='sha256='+await auth.signIntegration(other,secret);await assert.rejects(api.receiveWhatsApp(new Request('https://example.org',{method:'POST',headers:{'X-OpenWA-Signature':sig2},body:other})));}finally{h.close();}});
test('mail signatures use raw body and reject stale, forged or differently addressed email',async()=>{const h=harness();try{const api=h.load('lib/management-integrations.ts'),secret='whsec_'+Buffer.from('synthetic-mail-secret-32-bytes-123').toString('base64');await api.saveIntegration('email',{address:'office@example.test',apiKey:'synthetic-resend',signingSecret:secret},'test');const raw=JSON.stringify({type:'email.received',data:{email_id:sessionId}}),timestamp=String(Math.floor(Date.now()/1000)),id='synthetic-message';const signed=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');const make=(signature='v1,'+signed,stamp=timestamp)=>new Request('https://example.org',{method:'POST',headers:{'svix-id':id,'svix-timestamp':stamp,'svix-signature':signature},body:raw});assert.equal(await api.verifyMailSignature(raw,make(),secret),true);assert.equal(await api.verifyMailSignature(raw,make('v1,forged'),secret),false);assert.equal(await api.verifyMailSignature(raw,make('v1,'+signed,'1000000000'),secret),false);h.setTransport(async()=>Response.json({to:['other@example.test'],from:'sender@example.test',subject:'اختبار',text:'نص اصطناعي'}));await api.receiveMail(make());assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_emails').get().n,0);h.setTransport(async()=>Response.json({to:['office@example.test'],from:'sender@example.test',subject:'رسالة اصطناعية',text:'<script>plain text only</script>'}));await api.receiveMail(make());await api.receiveMail(make());assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM management_emails').get().n,1);}finally{h.close();}});
test('official-source failure is explicit and cannot become a false zero-activity report',async()=>{const h=harness();try{const data=h.load('lib/management-data.ts');const result=await data.managerSnapshot('manager@example.test');assert.equal(result.official.available,false);assert.equal(result.official.totals,null);assert.ok(result.revision);const keys=await data.bridgeKeys();assert.equal(keys.publicKey.d,undefined);const vault=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='operations-signing'").get().sealed;assert.ok(!vault.includes(keys.privateKey.d));}finally{h.close();}});

test('user administration preserves verified email and records, validates limits and revokes suspended sessions',async()=>{const h=harness();try{
 const routes=h.load('app/api/management/[...path]/route.ts'),auth=await login(h),id='synthetic-user-000000000001';
 h.sqlite.prepare("INSERT INTO public_users(id,name,phone,email,email_verified_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").run(id,'عميل اصطناعي','00000000','client@example.test');
 h.sqlite.prepare("INSERT INTO public_user_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").run('synthetic-session',id,Math.floor(Date.now()/1000)+1000);
 h.sqlite.prepare("INSERT INTO service_records(id,user_id,service_type,title) VALUES(?,?,?,?)").run('synthetic-record',id,'memo','مسودة اصطناعية');
 assert.equal((await routes.GET(request('users'))).status,401);
 const found=await(await routes.GET(request('users?q=client',auth.token))).json();assert.equal(found.users.length,1);assert.equal(found.users[0].memo_used,1);assert.equal(found.source,'hosted');
 for(const patch of [{memoLimit:-2},{memoLimit:1.5},{memoLimit:null},{memoLimit:''},{assistantLimit:false},{status:'admin'},{email:'invalid-email'},{role:'admin'}])assert.equal((await routes.POST(request('users',auth.token,{id,...patch}))).status,400);
 const saved=await routes.POST(request('users',auth.token,{id,name:'اسم اصطناعي معدّل',phone:'00000001',status:'suspended',memoLimit:5,assistantLimit:30}));assert.equal(saved.status,200);
 const row=h.sqlite.prepare('SELECT * FROM public_users WHERE id=?').get(id);assert.equal(row.email,'client@example.test');assert.equal(row.status,'suspended');assert.equal(row.memo_limit,5);assert.ok(row.email_verified_at);
 assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM public_user_sessions WHERE user_id=?').get(id).n,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM service_records WHERE user_id=?').get(id).n,1);
 assert.equal((await routes.POST(request('users',auth.token,{id,status:'active',memoLimit:-1}))).status,200);
 assert.equal((await routes.GET(request('users?offset=-1',auth.token))).status,400);
 assert.equal((await routes.POST(request('users',auth.token,{id,status:'suspended'},'https://other.example'))).status,403);
}finally{h.close();}});
const zohoConfig={region:'com',orgId:'12345678',clientId:'synthetic-client',clientSecret:'synthetic-client-secret',refreshToken:'synthetic-refresh-token'};
const zohoRow={accountId:'12345678901234',zuid:'123456789',primaryEmailAddress:'info@sabeq.legal',displayName:'حساب اصطناعي',role:'member',enabled:true,status:true,mxStatus:false};
async function saveZoho(h,extra={}){await h.load('lib/management-integrations.ts').saveIntegration('zoho-mail-admin',{...zohoConfig,...extra},'manager@example.test');}
test('mailbox management is protected and missing credentials never create fake mailboxes',async()=>{const h=harness();try{
 const routes=h.load('app/api/management/[...path]/route.ts'),session=await login(h);assert.equal((await routes.GET(request('mailboxes'))).status,401);
 const data=await(await routes.GET(request('mailboxes',session.token))).json();assert.equal(data.hasCredentials,false);assert.equal(data.loaded,false);assert.deepEqual(data.accounts,[]);
 assert.equal((await routes.POST(request('mailboxes',session.token,{action:'create',email:'info@sabeq.legal'}))).status,409);assert.equal(h.network.length,0);
 assert.equal((await routes.POST(request('mailboxes',session.token,{action:'save',...zohoConfig},'https://other.example'))).status,403);
}finally{h.close();}});
test('mailbox credentials stay encrypted and refresh in a POST body; listing exposes only the office domain',async()=>{const h=harness();try{
 const api=h.load('lib/management-mailboxes.ts');const safe=await api.mailboxAction({action:'save',...zohoConfig},'manager@example.test');assert.equal(safe.hasCredentials,true);assert.ok(!JSON.stringify(safe).includes(zohoConfig.clientSecret));
 const sealed=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='zoho-mail-admin'").get().sealed;assert.ok(!sealed.includes(zohoConfig.refreshToken));
 h.setTransport(async(url,init)=>{if(String(url).includes('/oauth/v2/token')){assert.equal(String(url),'https://accounts.zoho.com/oauth/v2/token');assert.equal(init.method,'POST');assert.equal(new URLSearchParams(init.body).get('refresh_token'),zohoConfig.refreshToken);return Response.json({access_token:'synthetic-access-token',expires_in:3600});}assert.equal(init.headers.Authorization,'Zoho-oauthtoken synthetic-access-token');assert.equal(init.redirect,'error');return Response.json({status:{code:200},data:[zohoRow,{...zohoRow,primaryEmailAddress:'other@another.test'}]});});
 const result=await api.mailboxAction({action:'test'},'manager@example.test');assert.equal(result.accounts.length,1);assert.equal(result.accounts[0].deliveryReady,false);assert.equal(result.loaded,true);assert.ok(!JSON.stringify(result).includes('synthetic-access-token'));
 await api.mailboxAction(null,'manager@example.test');assert.equal(h.network.filter(n=>n.url.includes('/oauth/v2/token')).length,1);
 await assert.rejects(api.mailboxAction({action:'save',...zohoConfig,orgId:'87654321',clientSecret:'',refreshToken:''},'manager@example.test'));
 await assert.rejects(api.mailboxAction({action:'save',...zohoConfig,region:'https://attacker.test'},'manager@example.test'));
}finally{h.close();}});
test('mailbox creation forces a member account and a first-login password change without persisting or echoing the password',async()=>{const h=harness();try{
 await saveZoho(h,{accessToken:'synthetic-access-token',expiresAt:Date.now()+3600000});const api=h.load('lib/management-mailboxes.ts'),password='SyntheticPassword123!';
 await assert.rejects(api.mailboxAction({action:'create',email:'person@another.test',name:'اسم اصطناعي',password},'manager@example.test'));await assert.rejects(api.mailboxAction({action:'create',email:'info@sabeq.legal',name:'اسم اصطناعي',password:'short'},'manager@example.test'));assert.equal(h.network.length,0);
 h.setTransport(async(url,init)=>{assert.equal(String(url),'https://mail.zoho.com/api/organization/12345678/accounts');assert.equal(init.method,'POST');const data=JSON.parse(init.body);assert.equal(data.role,'member');assert.equal(data.oneTimePassword,true);assert.equal(data.password,password);return Response.json({status:{code:201},data:zohoRow});});
 const result=await api.mailboxAction({action:'create',email:'info@sabeq.legal',name:'اسم اصطناعي',password,role:'super_admin'},'manager@example.test');assert.equal(result.ok,true);assert.equal(result.account.deliveryReady,false);assert.ok(!JSON.stringify(result).includes(password));assert.ok(!JSON.stringify(h.sqlite.prepare('SELECT * FROM management_events').all()).includes(password));assert.ok(!JSON.stringify(h.sqlite.prepare('SELECT * FROM management_vault').all()).includes(password));assert.ok(h.network.every(n=>!n.url.includes('subscription')&&!n.url.includes('messages')));
}finally{h.close();}});
test('mailbox status changes require confirmation and a verified member; administrators and foreign-domain accounts are protected',async()=>{const h=harness();try{
 await saveZoho(h,{accessToken:'synthetic-access-token',expiresAt:Date.now()+3600000});const api=h.load('lib/management-mailboxes.ts');let row={...zohoRow};
 const change={action:'status',id:row.accountId,zuid:row.zuid,enabled:false,confirm:true};
 h.setTransport(async(url,init)=>{if(init.method==='GET')return Response.json({status:{code:200},data:row});const body=JSON.parse(init.body);assert.equal(body.mode,'disableUser');assert.equal(body.removeAlias,false);assert.equal(body.removeGroupMembership,false);assert.equal(body.removeMailforward,false);return Response.json({status:{code:200}});});
 await assert.rejects(api.mailboxAction({...change,confirm:false},'manager@example.test'));assert.equal(h.network.length,0);
 row={...zohoRow,role:'admin'};await assert.rejects(api.mailboxAction(change,'manager@example.test'));assert.equal(h.network.filter(n=>n.init.method==='PUT').length,0);
 row={...zohoRow,primaryEmailAddress:'other@another.test'};await assert.rejects(api.mailboxAction(change,'manager@example.test'));
 row={...zohoRow};await assert.rejects(api.mailboxAction(change,'info@sabeq.legal'));const result=await api.mailboxAction(change,'manager@example.test');assert.equal(result.ok,true);assert.equal(h.network.filter(n=>n.init.method==='PUT').length,1);
}finally{h.close();}});
test('a mailbox provider error preserves the configuration screen and cannot become a successful empty list',async()=>{const h=harness();try{
 await saveZoho(h,{accessToken:'synthetic-access-token',expiresAt:Date.now()+3600000});h.setTransport(async()=>Response.json({error:'synthetic-provider-error'},{status:503}));const api=h.load('lib/management-mailboxes.ts');const result=await api.mailboxAction(null,'manager@example.test');assert.equal(result.loaded,false);assert.equal(result.hasCredentials,true);assert.ok(result.error);assert.ok(!JSON.stringify(result).includes('synthetic-provider-error'));await assert.rejects(api.mailboxAction({action:'test'},'manager@example.test'));
}finally{h.close();}});

test('a direct Payments bookmark cannot fetch dashboard records before sign-in',async()=>{
 for(const hash of ['payments','unknown-section']){
  const nodes=new Map(),storage=new Map();let requests=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},replaceChildren(){}});return nodes.get(id);};
  const context=vm.createContext({URL,URLSearchParams,crypto:webcrypto,document:{getElementById:node,addEventListener(){}},location:{href:'https://q8-ux.github.io/saad/sabeq-admin-preview/#'+hash,pathname:'/saad/sabeq-admin-preview/'},history:{replaceState(){}},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval(){},setTimeout,clearTimeout,fetch:async()=>{requests++;throw Error('unexpected request before login');}});
  vm.runInContext(readFileSync(root+'/public/management/admin.js','utf8').replace('void boot();','globalThis.bootPromise=boot();'),context);await context.bootPromise;
  assert.equal(requests,0);assert.match(node('app').innerHTML,/الدخول بالحساب الإداري/);assert.ok(!node('app').innerHTML.includes('name="clientSecret"'));
  assert.equal(storage.get('sabeq-admin-section'),hash==='payments'?'payments':undefined);
 }
});

const verificationConfig={action:'save',fromEmail:'noreply@sabeq.legal',apiKey:'re_synthetic_verification_key_12345'};
const publicAuthRequest=(action,body)=>new Request('https://sabeq-legal-public.centrino.chatgpt.site/api/auth/'+action,{method:'POST',headers:{Origin:'https://q8-ux.github.io','Content-Type':'application/json'},body:JSON.stringify(body)});
const syntheticApplicant={name:'مستخدم اصطناعي',phone:'00000000',email:'applicant@example.test',language:'ar'};

test('the admin mail screen saves the outgoing key through the protected route, clears it and never stores it in browser storage',async()=>{const h=harness();try{
 const session=await login(h),routes=h.load('app/api/management/[...path]/route.ts'),storage=new Map([['sabeq-management-session',session.token],['sabeq-admin-section','mail']]),nodes=new Map(),listeners=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},replaceChildren(){}});return nodes.get(id);};
 const context=vm.createContext({URL,URLSearchParams,Headers,Request,Response,TextEncoder,TextDecoder,Uint8Array,AbortSignal,crypto:webcrypto,btoa,atob,console,
  FormData:class{constructor(form){this.values=Object.entries(form.values);}[Symbol.iterator](){return this.values[Symbol.iterator]();}},
  document:{getElementById:node,addEventListener:(name,handler)=>listeners.set(name,handler)},location:{href:'https://q8-ux.github.io/saad/sabeq-admin-preview/#mail',pathname:'/saad/sabeq-admin-preview/'},history:{replaceState(){}},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval(){},setTimeout(){},clearTimeout(){},
  fetch:async(url,init)=>{const headers=new Headers(init.headers);headers.set('Origin','https://q8-ux.github.io');const req=new Request(url,{...init,headers});return req.method==='POST'?routes.POST(req):routes.GET(req);}
 });
 vm.runInContext(readFileSync(root+'/public/management/admin.js','utf8').replace('void boot();','globalThis.bootPromise=boot();'),context);await context.bootPromise;
 assert.match(node('workspace').innerHTML,/إرسال رموز الدخول/);assert.match(node('workspace').innerHTML,/data-form="verification-email"/);assert.match(node('workspace').innerHTML,/name="apiKey" value="" type="password"/);
 let reset=false;const button={disabled:false};
 const form={dataset:{form:'verification-email'},values:verificationConfig,matches:()=>true,querySelector:()=>button,reset(){reset=true;}};
 await listeners.get('submit')({target:form,preventDefault(){}});
 assert.equal(reset,true);assert.equal(button.disabled,false);assert.match(node('workspace').innerHTML,/إعدادات الإرسال محفوظة/);assert.ok(!node('workspace').innerHTML.includes(verificationConfig.apiKey));assert.ok(!JSON.stringify([...storage]).includes(verificationConfig.apiKey));
 assert.equal((await h.load('lib/verification-email-settings.ts').verificationEmailDelivery()).apiKey,verificationConfig.apiKey);assert.equal(h.network.length,0);
}finally{h.close();}});

test('verification email configuration is admin-only, encrypted and independent of inbound mail',async()=>{const h=harness();try{
 const routes=h.load('app/api/management/[...path]/route.ts');
 assert.equal((await routes.GET(request('verification-email'))).status,401);
 assert.equal((await routes.POST(request('verification-email',null,verificationConfig))).status,401);
 const session=await login(h);
 assert.equal((await routes.POST(request('verification-email',session.token,verificationConfig,'https://other.example'))).status,403);
 const initial=await(await routes.GET(request('verification-email',session.token))).json();assert.equal(initial.configured,false);
 for(const patch of [{fromEmail:'sender@other.example'},{apiKey:'bad'},{apiKey:''}])assert.equal((await routes.POST(request('verification-email',session.token,{...verificationConfig,...patch}))).status,400);
 const saved=await routes.POST(request('verification-email',session.token,verificationConfig));assert.equal(saved.status,200);
 const safe=await saved.json();assert.equal(safe.configured,true);assert.equal(safe.source,'management');assert.ok(!JSON.stringify(safe).includes(verificationConfig.apiKey));
 const row=h.sqlite.prepare("SELECT sealed FROM management_vault WHERE integration='verification-email'").get();assert.ok(row.sealed);assert.ok(!row.sealed.includes(verificationConfig.apiKey));
 const retained=await routes.POST(request('verification-email',session.token,{...verificationConfig,apiKey:''}));assert.equal(retained.status,200);
 assert.equal((await h.load('lib/verification-email-settings.ts').verificationEmailDelivery()).apiKey,verificationConfig.apiKey);
 assert.equal(h.sqlite.prepare("SELECT count(*) n FROM management_vault WHERE integration='email'").get().n,0);
 assert.ok(!JSON.stringify(h.sqlite.prepare('SELECT * FROM management_events').all()).includes(verificationConfig.apiKey));assert.equal(h.network.length,0);
}finally{h.close();}});

test('verification email retains environment support and explicitly saved settings take precedence',async()=>{const h=harness();try{
 h.runtime.RESEND_API_KEY='re_synthetic_environment_key_123';h.runtime.AUTH_FROM_EMAIL='Sabeq Legal <noreply@sabeq.legal>';
 const settings=h.load('lib/verification-email-settings.ts');
 const initial=await settings.verificationEmailAction(null,'test');assert.equal(initial.configured,true);assert.equal(initial.source,'environment');assert.equal(initial.fromEmail,'noreply@sabeq.legal');assert.ok(!JSON.stringify(initial).includes(h.runtime.RESEND_API_KEY));
 await settings.verificationEmailAction(verificationConfig,'test');assert.equal((await settings.verificationEmailDelivery()).apiKey,verificationConfig.apiKey);
}finally{h.close();}});

test('request and verify execute the real database flow; a wrong or reused code cannot create another session',async()=>{const h=harness();try{
 await h.load('lib/verification-email-settings.ts').verificationEmailAction(verificationConfig,'test');
 let code='';h.setTransport(async(url,init)=>{assert.equal(String(url),'https://api.resend.com/emails');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer '+verificationConfig.apiKey);const body=JSON.parse(init.body);assert.equal(body.from,'noreply@sabeq.legal');assert.deepEqual(body.to,[syntheticApplicant.email]);code=body.text.match(/\n\n(\d{6})\n\n/)[1];return Response.json({id:'synthetic-delivery-id'});});
 const requestRoute=h.load('app/api/auth/request-code/route.ts');
 const response=await requestRoute.POST(publicAuthRequest('request-code',syntheticApplicant));assert.equal(response.status,200);const challenge=await response.json();assert.equal(challenge.expiresIn,600);assert.ok(!JSON.stringify(challenge).includes(code));assert.ok(!JSON.stringify(challenge).includes(verificationConfig.apiKey));
 const row=h.sqlite.prepare('SELECT * FROM email_verification_challenges WHERE id=?').get(challenge.challengeId);assert.notEqual(row.code_hash,code);assert.equal(row.attempts,0);
 const verify=h.load('app/api/auth/verify-code/route.ts');const check=value=>verify.POST(publicAuthRequest('verify-code',{challengeId:challenge.challengeId,email:syntheticApplicant.email,code:value}));
 assert.equal((await check(code==='000000'?'000001':'000000')).status,401);
 const accepted=await check(code);assert.equal(accepted.status,200);const session=await accepted.json();assert.equal(session.user.email,syntheticApplicant.email);assert.match(session.token,/^[A-Za-z0-9_-]{43}$/);
 assert.equal((await check(code)).status,410);assert.equal(h.sqlite.prepare('SELECT count(*) n FROM public_user_sessions').get().n,1);
 assert.ok(h.sqlite.prepare('SELECT email_verified_at FROM public_users').get().email_verified_at);
 const caller=new Request('https://example.test',{headers:{Authorization:'Bearer '+session.token}});assert.equal((await h.load('lib/public-auth.ts').requirePublicUser(caller)).email,syntheticApplicant.email);
 assert.equal((await requestRoute.POST(publicAuthRequest('request-code',syntheticApplicant))).status,429);
}finally{h.close();}});

test('missing credentials, network failures and unconfirmed provider responses never return a challenge or create an account',async()=>{
 for(const failure of ['configuration','network','rejected','invalid-receipt']){const h=harness();try{
  if(failure!=='configuration')await h.load('lib/verification-email-settings.ts').verificationEmailAction(verificationConfig,'test');
  h.setTransport(async()=>{if(failure==='network')throw Error('private provider detail '+verificationConfig.apiKey);if(failure==='rejected')return Response.json({message:'private provider detail'},{status:403});return Response.json({message:'not a delivery receipt'});});
  const route=h.load('app/api/auth/request-code/route.ts'),response=await route.POST(publicAuthRequest('request-code',syntheticApplicant));assert.equal(response.status,503);const body=await response.json();assert.ok(body.error);assert.ok(!body.challengeId);assert.ok(!JSON.stringify(body).includes('private provider detail'));assert.ok(!JSON.stringify(body).includes(verificationConfig.apiKey));
  assert.equal(h.sqlite.prepare('SELECT count(*) n FROM email_verification_challenges').get().n,0);assert.equal(h.sqlite.prepare('SELECT count(*) n FROM public_users').get().n,0);assert.equal(h.sqlite.prepare('SELECT count(*) n FROM public_user_sessions').get().n,0);if(failure==='configuration')assert.equal(h.network.length,0);
 }finally{h.close();}}
});

test('an expired challenge and five incorrect attempts cannot establish a public session',async()=>{
 for(const expired of [true,false]){const h=harness();try{
  const auth=h.load('lib/public-auth.ts'),id=webcrypto.randomUUID(),code='123456';
  h.sqlite.prepare('INSERT INTO email_verification_challenges(id,name,phone,email,code_hash,expires_at) VALUES(?,?,?,?,?,?)').run(id,syntheticApplicant.name,syntheticApplicant.phone,syntheticApplicant.email,await auth.verificationCodeHash(id,syntheticApplicant.email,code),expired?0:Math.floor(Date.now()/1000)+600);
  const route=h.load('app/api/auth/verify-code/route.ts'),verify=value=>route.POST(publicAuthRequest('verify-code',{challengeId:id,email:syntheticApplicant.email,code:value}));
  if(expired)assert.equal((await verify(code)).status,410);else{for(let i=0;i<5;i++)assert.equal((await verify('000000')).status,401);assert.equal((await verify(code)).status,429);}
  assert.equal(h.sqlite.prepare('SELECT count(*) n FROM public_user_sessions').get().n,0);assert.equal(h.sqlite.prepare('SELECT count(*) n FROM public_users').get().n,0);
 }finally{h.close();}}
});

test('administrator creates a user without inventing email verification and applies service permissions on the server',async()=>{const h=harness();try{configureAdministrator(h);const manager=await adminLogin(h),routes=h.load('app/api/management/[...path]/route.ts');const created=await routes.POST(request('users',manager.token,{action:'create',name:'مستخدم اختبار الصلاحيات',email:'permissions@example.test',phone:'00000000',permissions:{memo:false,assistant:true,consultation:false,library:true},memoLimit:4,assistantLimit:12}));assert.equal(created.status,200);const {id}=await created.json();const row=h.sqlite.prepare('SELECT * FROM public_users WHERE id=?').get(id);assert.equal(row.email_verified_at,'');assert.equal(row.memo_limit,4);assert.equal(h.sqlite.prepare('SELECT role FROM user_access_policies WHERE user_id=?').get(id).role,'user');const session=await h.load('lib/public-auth.ts').createPublicSession(id);const helper=h.load('lib/service-settings.ts');await assert.rejects(helper.requireServiceEnabled('memo',request('session',session.token)),error=>error.status===403);await assert.rejects(helper.requireServiceEnabled('consultation',request('session',session.token)),error=>error.status===403);await helper.requireServiceEnabled('assistant',request('session',session.token));assert.equal((await routes.GET(request('users',session.token))).status,401);assert.equal(h.network.length,0);}finally{h.close();}});

test('email edits reset verification, duplicates fail and deletion preserves legal records while supporting restore',async()=>{const h=harness();try{const routes=h.load('app/api/management/[...path]/route.ts'),manager=await login(h),api=h.load('lib/user-management.ts');const result=await api.updateManagedUser({action:'create',name:'عميل اصطناعي',email:'first@example.test'},'manager@example.test');const id=result.id;h.sqlite.prepare("UPDATE public_users SET email_verified_at=CURRENT_TIMESTAMP WHERE id=?").run(id);h.sqlite.prepare("INSERT INTO service_records (id,user_id,service_type,title) VALUES ('preserved-record',?,'memo','مسودة')").run(id);await h.load('lib/public-auth.ts').createPublicSession(id);assert.equal((await routes.POST(request('users',manager.token,{id,email:'changed@example.test'}))).status,200);assert.equal(h.sqlite.prepare('SELECT email_verified_at FROM public_users WHERE id=?').get(id).email_verified_at,'');assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM public_user_sessions WHERE user_id=?').get(id).n,0);assert.equal((await routes.POST(request('users',manager.token,{action:'create',name:'عميل آخر',email:'changed@example.test'}))).status,409);assert.equal((await routes.POST(request('users',manager.token,{action:'delete',id}))).status,400);assert.equal((await routes.POST(request('users',manager.token,{action:'delete',id,confirm:true}))).status,200);assert.equal(h.sqlite.prepare('SELECT status FROM public_users WHERE id=?').get(id).status,'deleted');assert.equal(h.sqlite.prepare('SELECT count(*) n FROM service_records WHERE user_id=?').get(id).n,1);assert.equal((await(await routes.GET(request('users',manager.token))).json()).users.length,0);assert.equal((await(await routes.GET(request('users?status=deleted',manager.token))).json()).users.length,1);assert.equal((await routes.POST(request('users',manager.token,{action:'restore',id}))).status,200);assert.equal(h.sqlite.prepare('SELECT status FROM public_users WHERE id=?').get(id).status,'active');}finally{h.close();}});

test('administrator grants and revokes delegated administration while a delegate cannot remove their own access',async()=>{const h=harness();try{const routes=h.load('app/api/management/[...path]/route.ts'),owner=await login(h),auth=h.load('lib/management-auth.ts');const created=await(await routes.POST(request('users',owner.token,{action:'create',name:'مسؤول مفوض',email:'delegate@example.test'}))).json();assert.equal((await routes.POST(request('users',owner.token,{id:created.id,role:'administrator'}))).status,400);assert.equal((await routes.POST(request('users',owner.token,{id:created.id,role:'administrator',confirmAdmin:true}))).status,200);assert.equal(await auth.managerAllowed('delegate@example.test'),true);const verifier=auth.randomToken(),req=request('login?'+new URLSearchParams({challenge:await auth.proofChallenge(verifier),state:auth.randomToken()}));req.headers.set('oai-authenticated-user-id','test-delegate');req.headers.set('oai-authenticated-user-email','delegate@example.test');const callback=await routes.GET(req);const code=new URL(callback.headers.get('location')).searchParams.get('code');const session=await(await routes.POST(request('exchange',null,{code,verifier}))).json();assert.equal((await routes.GET(request('users',session.token))).status,200);assert.equal((await routes.POST(request('users',session.token,{id:created.id,role:'user'}))).status,409);assert.equal((await routes.POST(request('users',owner.token,{id:created.id,role:'user'}))).status,200);assert.equal(await auth.managerAllowed('delegate@example.test'),false);assert.equal((await routes.GET(request('users',session.token))).status,401);}finally{h.close();}});

test('site content is durable, versioned, contains no runtime secrets and rejects unsafe image URLs',async()=>{const h=harness();try{const api=h.load('lib/site-controls.ts');let initial=await api.siteAction(null,'test');assert.equal(initial.revision,0);const value=JSON.parse(JSON.stringify(initial.copy.ar));value.brand='<img src=x onerror=alert(1)> اسم اختبار';let next=await api.siteAction({action:'save',section:'copy',language:'ar',revision:0,value},'test');assert.equal((await api.publicSiteSettings()).copy.ar.brand,value.brand);assert.ok(!JSON.stringify(await api.publicSiteSettings()).includes(h.runtime.AUTH_SECRET));await assert.rejects(api.siteAction({action:'save',section:'copy',language:'ar',revision:0,value},'test'),error=>error.status===409);await assert.rejects(api.siteAction({action:'save',section:'branding',revision:next.revision,value:{...next.branding,logo:'javascript:alert(1)'}},'test'));for(const section of ['team','mediaVideos','posts','branding','contact'])next=await api.siteAction({action:'save',section,revision:next.revision,value:next[section]},'test');assert.equal(next.revision,6);assert.equal(h.network.length,0);}finally{h.close();}});

test('global service switches preserve billing configuration and consultation administration does not send messages',async()=>{const h=harness();try{const api=h.load('lib/site-controls.ts');h.sqlite.prepare("UPDATE service_settings SET price_fils=1234,payment_required=1 WHERE service_key='memo'").run();await api.servicesAction({serviceKey:'memo',enabled:false});assert.equal(h.sqlite.prepare("SELECT price_fils FROM service_settings WHERE service_key='memo'").get().price_fils,1234);await assert.rejects(h.load('lib/service-settings.ts').requireServiceEnabled('memo'),error=>error.status===503);await assert.rejects(api.servicesAction({serviceKey:'memo',enabled:'false'}));const item=h.sqlite.prepare("INSERT INTO consultation_requests (name,phone,email,case_type) VALUES ('عميل اختبار','00000000','test@example.test','استشارة')").run();const bookings=await api.bookingsAction({id:Number(item.lastInsertRowid),status:'confirmed'});assert.equal(bookings.bookings[0].status,'confirmed');await assert.rejects(api.bookingsAction({id:Number(item.lastInsertRowid),status:'paid'}));assert.equal(h.network.length,0);}finally{h.close();}});


test('revoked service sessions and corrupt stored permission values fail closed',async()=>{const h=harness();try{const users=h.load('lib/user-management.ts'),helper=h.load('lib/service-settings.ts');for(const value of ['bad-json','null','[]','{"memo":"false"}'])assert.ok(Object.values(users.userPermissions(value)).every(allowed=>allowed===false));assert.ok(Object.values(users.userPermissions()).every(Boolean));const created=await users.updateManagedUser({action:'create',name:'عميل اختبار الإلغاء',email:'revoked@example.test'});const session=await h.load('lib/public-auth.ts').createPublicSession(created.id);await users.updateManagedUser({id:created.id,permissions:{memo:false,assistant:true,consultation:true,library:true}});await assert.rejects(helper.requireServiceEnabled('assistant',request('session',session.token)),error=>error.status===401);await helper.requireServiceEnabled('assistant');}finally{h.close();}});
