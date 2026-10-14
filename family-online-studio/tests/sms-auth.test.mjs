import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSmsAuth,normalizePhone} from '../backend/sms-auth.mjs';
import {createGateway} from '../backend/server.mjs';

// Synthetic test-only values; no live messages or provider credentials.
const account='AC'+'a'.repeat(32),service='VA'+'b'.repeat(32),verification='VE'+'c'.repeat(32);
const phone='+96550000000';
const config={ownerPhone:phone,twilioAccountSid:account,twilioAuthToken:'synthetic-test-credential',twilioVerifyServiceSid:service,sessionSecret:'synthetic-session-secret-not-used-in-production'};
function fixture(overrides={}){
 let now=overrides.now??Date.parse('2026-10-14T12:00:00Z');const calls=[];
 const state={type:'Trial',status:'active',created:now-24*60*60_000,code:'123456',providerStatus:'pending',approvedTo:phone,...overrides};
 const mock=async(url,init)=>{
  calls.push({url:String(url),method:init.method,body:init.body?Object.fromEntries(init.body):undefined});
  if(String(url).includes('/Accounts/'))return Response.json({sid:account,owner_account_sid:account,type:state.type,status:state.status,date_created:new Date(state.created).toUTCString()});
  if(String(url).endsWith('/Verifications')){
   if(state.sendFailure)return Response.json({error:'failure'},{status:502});
   return Response.json({sid:verification,to:phone,service_sid:service,status:state.providerStatus,date_created:new Date(now).toUTCString()});
  }
  if(String(url).endsWith('/VerificationCheck'))return Response.json({sid:verification,to:state.approvedTo,service_sid:service,status:init.body.get('Code')===state.code?'approved':'pending'});
  return Response.json({doc:{test:true}});
 };
 const auth=createSmsAuth(config,mock,()=>now);
 return {auth,mock,calls,state,advance:ms=>now+=ms};
}
test('Kuwaiti, international and Arabic phone input is normalized',()=>{
 assert.equal(normalizePhone('٥٠٠٠٠٠٠٠'),phone);assert.equal(normalizePhone('00965 5000-0000'),phone);assert.equal(normalizePhone('+965 (50000000)'),phone);
 assert.equal(normalizePhone({}), '');assert.equal(normalizePhone('not-a-phone'),'');
});
test('missing provider is explicitly unavailable and sends nothing',async()=>{
 let called=false;const a=createSmsAuth({},async()=>{called=true;});assert.equal(a.ready,false);
 await assert.rejects(a.begin({phone}),e=>e.status===503);assert.equal(called,false);
});
test('only the configured owner can request a message',async()=>{
 const f=fixture();await assert.rejects(f.auth.begin({phone:'+96551111111'}),e=>e.status===401);assert.equal(f.calls.length,0);
 await assert.rejects(f.auth.begin({device:'forged.token'}),e=>e.status===401);assert.equal(f.calls.length,0);
});
test('paid, suspended and expired accounts cannot send',async()=>{
 for(const state of [{type:'Full'},{status:'suspended'},{created:Date.parse('2026-01-01')}]){
  const f=fixture(state);await assert.rejects(f.auth.begin({phone}),e=>e.status===503);
  assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
 }
});
test('accepted SMS request does not issue a session, code or expose owner phone',async()=>{
 const f=fixture(),c=await f.auth.begin({phone});assert.equal(c.sent,true);assert.equal(c.token,undefined);assert.equal(c.code,undefined);assert.equal(c.deviceToken,undefined);
 assert.ok(!JSON.stringify(c).includes(phone));assert.equal(c.resendAfter,60);
 assert.equal(f.calls.at(-1).body.Channel,'sms');assert.equal(f.calls.at(-1).body.To,phone);
});
test('refresh within a minute reuses challenge without another SMS',async()=>{
 const f=fixture(),a=await f.auth.begin({phone}),b=await f.auth.begin({phone});assert.equal(a.challenge,b.challenge);assert.equal(b.sent,false);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/Verifications')).length,1);
});
test('failed provider cannot be presented as a sent message',async()=>{
 const f=fixture({sendFailure:true});await assert.rejects(f.auth.begin({phone}),e=>e.status===502);
 await assert.rejects(f.auth.begin({phone}),e=>e.status===429);
});
test('wrong, expired and replayed codes never authenticate',async()=>{
 const f=fixture(),c=await f.auth.begin({phone});await assert.rejects(f.auth.check({challenge:c.challenge,code:'999999'}),e=>e.status===401);
 const accepted=await f.auth.check({challenge:c.challenge,code:'١٢٣٤٥٦'});assert.equal(accepted.approved,true);assert.ok(accepted.deviceToken);
 await assert.rejects(f.auth.check({challenge:c.challenge,code:'123456'}),e=>e.status===401);
 const g=fixture(),d=await g.auth.begin({phone});g.advance(10*60_000);await assert.rejects(g.auth.check({challenge:d.challenge,code:'123456'}),e=>e.status===401);
});
test('five wrong codes invalidate challenge',async()=>{
 const f=fixture(),c=await f.auth.begin({phone});for(let i=0;i<5;i++)await assert.rejects(f.auth.check({challenge:c.challenge,code:'999999'}),e=>e.status===401);
 await assert.rejects(f.auth.check({challenge:c.challenge,code:'123456'}),e=>e.status===401);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/VerificationCheck')).length,5);
});
test('provider approval for a different phone is rejected',async()=>{
 const f=fixture({approvedTo:'+96551111111'}),c=await f.auth.begin({phone});await assert.rejects(f.auth.check({challenge:c.challenge,code:'123456'}),e=>e.status===401);
});
test('remembered device can request SMS but is not a login session',async()=>{
 const f=fixture(),c=await f.auth.begin({phone}),v=await f.auth.check({challenge:c.challenge,code:'123456'});f.advance(60_001);
 const next=await f.auth.begin({device:v.deviceToken});assert.equal(next.sent,true);assert.equal(next.token,undefined);
 await assert.rejects(f.auth.begin({device:v.deviceToken+'x'}),e=>e.status===401);
});
test('expired remembered device must be paired again',async()=>{
 const f=fixture(),c=await f.auth.begin({phone}),v=await f.auth.check({challenge:c.challenge,code:'123456'});f.advance(91*24*60*60_000);
 await assert.rejects(f.auth.begin({device:v.deviceToken}),e=>e.status===401);
});
test('hourly SMS limit bounds repeated requests across devices',async()=>{
 const f=fixture();for(let i=0;i<5;i++){await f.auth.begin({phone});f.advance(60_001);}
 await assert.rejects(f.auth.begin({phone}),e=>e.status===429);
});
test('paid upgrade before code check cannot create a session',async()=>{
 const f=fixture(),c=await f.auth.begin({phone});f.state.type='Full';await assert.rejects(f.auth.check({challenge:c.challenge,code:'123456'}),e=>e.status===503);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/VerificationCheck')).length,0);
});
test('gateway issues session only after verification and enforces Origin',async t=>{
 const f=fixture({now:Date.now()}),server=createGateway({...config,accessHash:createHash('sha256').update('synthetic-private-code-only-for-tests').digest('hex'),allowedOrigin:'https://writer.example',upstreamOrigin:'https://private.example',siteToken:'synthetic-site-token',bridgeKey:'synthetic-bridge-key'},f.mock);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const call=(path,body,extra={})=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:'https://writer.example','Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 const options=await call('/api/auth/options');assert.deepEqual(await options.json(),{smsConfigured:true,legacyAvailable:false,channel:'sms',trialOnly:true});
 assert.equal((await call('/api/manuscript')).status,401);assert.equal((await call('/api/auth/sms/request',{phone},{Origin:'https://attacker.example'})).status,403);
 assert.equal((await call('/api/auth',{code:'synthetic-private-code-only-for-tests'})).status,403);
 const sent=await call('/api/auth/sms/request',{phone});assert.equal(sent.status,200);const c=await sent.json();assert.equal(c.token,undefined);
 const bad=await call('/api/auth/sms/verify',{challenge:c.challenge,code:'999999'});assert.equal(bad.status,401);assert.equal((await bad.json()).token,undefined);
 const good=await call('/api/auth/sms/verify',{challenge:c.challenge,code:'123456'});assert.equal(good.status,200);const auth=await good.json();assert.ok(auth.token);
 assert.equal((await call('/api/manuscript',null,{Authorization:'Bearer '+auth.deviceToken})).status,401);
 assert.equal((await call('/api/manuscript',null,{Authorization:'Bearer '+auth.token})).status,200);
 assert.equal((await call('/api/auth/sms/verify',{challenge:c.challenge,code:'123456'})).status,401);
});
test('legacy code remains available until SMS is configured',async t=>{
 const code='synthetic-private-code-only-for-tests',server=createGateway({allowedOrigin:'https://writer.example',upstreamOrigin:'https://private.example',siteToken:'synthetic-site-token',bridgeKey:'synthetic-bridge-key',sessionSecret:config.sessionSecret,accessHash:createHash('sha256').update(code).digest('hex')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port,headers={Origin:'https://writer.example','Content-Type':'application/json'};
 const options=await fetch(base+'/api/auth/options',{headers});assert.equal((await options.json()).legacyAvailable,true);
 const request=await fetch(base+'/api/auth/sms/request',{method:'POST',headers,body:JSON.stringify({phone})});assert.equal(request.status,503);
 const login=await fetch(base+'/api/auth',{method:'POST',headers,body:JSON.stringify({code})});assert.equal(login.status,200);assert.ok((await login.json()).token);
});
