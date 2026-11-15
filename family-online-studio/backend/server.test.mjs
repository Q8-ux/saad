import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {once} from 'node:events';
import {createGateway} from './server.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('private gateway authenticates sessions, restricts routes and signs binary requests',async()=>{
 const origin='https://writer.example',code='synthetic-private-entry-code-123456';
 const config={allowedOrigin:origin,upstreamOrigin:'https://private.example',siteToken:'synthetic-site-token',bridgeKey:'synthetic-signing-key',accessHash:hash(code),sessionSecret:'synthetic-session-key'};
 let calls=0,upstreamHtml=false;
 const server=createGateway(config,async(url,init)=>{
  calls++;assert.equal(String(url),'https://private.example/api/external-studio');
  const h=init.headers,body=Buffer.from(init.body);assert.equal(h['OAI-Sites-Authorization'],'Bearer synthetic-site-token');
  assert.equal(h['x-studio-signature'],createHmac('sha256',config.bridgeKey).update([h['x-studio-time'],h['x-studio-nonce'],h['x-studio-method'],h['x-studio-route'],h['Content-Type'],hash(body)].join('\n')).digest('hex'));
  assert.ok(!('oai-authenticated-user-id' in h));assert.ok(!('cookie' in h));
  return upstreamHtml?new Response('<html>private wall</html>',{headers:{'Content-Type':'text/html'}}):Response.json({ok:true,synthetic:true});
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const send=(p,options={})=>fetch(base+p,{...options,headers:{Origin:origin,...options.headers}});
 try{
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/api/manuscript',{headers:{Origin:'https://other.example'}})).status,403);
  const options=await send('/api/manuscript',{method:'OPTIONS'});assert.equal(options.status,204);assert.equal(options.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await send('/api/manuscript')).status,401);assert.equal(calls,0);
  assert.equal((await send('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'wrong-code-of-sufficient-length'})})).status,401);
  const login=await send('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});assert.equal(login.status,200);const {token}=await login.json();
  assert.ok(token&&!token.includes(code));const headers={Authorization:'Bearer '+token,'oai-authenticated-user-id':'forged'};
  assert.equal((await send('/api/manuscript',{headers})).status,200);assert.equal(calls,1);
  assert.equal((await send('/api/unknown',{headers})).status,404);assert.equal(calls,1);
  const binary=new FormData();binary.set('audio',new Blob([new Uint8Array([0,1,2,200,255])],{type:'audio/webm'}),'synthetic.webm');
  assert.equal((await send('/api/transcribe',{method:'POST',headers,body:binary})).status,200);assert.equal(calls,2);
  assert.equal((await send('/api/manuscript',{headers:{Authorization:'Bearer '+token+'x'}})).status,401);
  upstreamHtml=true;const hidden=await send('/api/manuscript',{headers});assert.equal(hidden.status,502);assert.ok(!(await hidden.text()).includes('private.example'));
  console.log(JSON.stringify({gateway:'pass',privateStorySent:false,liveProvider:false}));
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('password-only mode accepts a short configured secret and never contacts SMS',async()=>{
 const origin='https://writer.example',password='7432';
 const config={authMode:'password',allowedOrigin:origin,upstreamOrigin:'https://private.example',siteToken:'synthetic-site-token',bridgeKey:'synthetic-signing-key',accessHash:hash(password),sessionSecret:'synthetic-session-key',ownerPhone:'+96550000000',twilioAccountSid:'AC'+'1'.repeat(32),twilioAuthToken:'synthetic-provider-secret',twilioVerifyServiceSid:'VA'+'2'.repeat(32)};
 let calls=0;
 const server=createGateway(config,async(url)=>{calls++;assert.equal(String(url),'https://private.example/api/external-studio');return Response.json({synthetic:true});});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const request=(path,body,token)=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const options=await (await request('/api/auth/options')).json();assert.equal(options.mode,'password');assert.equal(options.smsConfigured,false);assert.equal(calls,0);
  assert.equal((await request('/api/auth/sms/request',{phone:config.ownerPhone})).status,403);assert.equal(calls,0);
  assert.equal((await request('/api/manuscript')).status,401);
  assert.equal((await request('/api/auth',{code:'wrong'})).status,401);
  assert.equal((await request('/api/auth',{code:'743'})).status,401);
  const response=await request('/api/auth',{code:'٧٤٣٢'});assert.equal(response.status,200);const data=await response.json();assert.ok(data.token&&!data.token.includes(password));
  assert.equal((await request('/api/manuscript',null,data.token)).status,200);assert.equal(calls,1);
  let last;for(let i=0;i<8;i++)last=await request('/api/auth',{code:'wrong'});assert.equal(last.status,429);
 }finally{await new Promise(resolve=>server.close(resolve));}
 const missing=createGateway({...config,accessHash:''},async()=>{throw new Error('No provider request is permitted');});
 missing.listen(0,'127.0.0.1');await once(missing,'listening');
 try{assert.equal((await fetch('http://127.0.0.1:'+missing.address().port+'/health')).status,503);}finally{await new Promise(resolve=>missing.close(resolve));}
});

test('legacy password mode verifies through the signed private server and revokes old sessions',async()=>{
 const origin='https://writer.example',password='7432',key='synthetic-session-key';
 const config={authMode:'password',passwordVerification:'upstream',allowedOrigin:origin,upstreamOrigin:'https://private.example',siteToken:'synthetic-token',bridgeKey:'synthetic-bridge-key',sessionSecret:key};
 let unavailable=false;
 const server=createGateway(config,async(url,init)=>{
  assert.equal(String(url),'https://private.example/api/external-studio');assert.equal(init.headers['x-studio-route'],'/api/password-login');
  const input=JSON.parse(Buffer.from(init.body).toString());
  if(unavailable)return Response.json({error:'temporarily unavailable'},{status:503});
  return input.password===password?Response.json({verified:true}):Response.json({error:'incorrect'},{status:401});
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const login=code=>fetch(base+'/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({code})});
 try{
  assert.equal((await fetch(base+'/health')).status,200);
  const correct=await login(password);assert.equal(correct.status,200);assert.ok((await correct.json()).token);
  assert.equal((await login('wrong')).status,401);
  unavailable=true;const failed=await login(password);assert.equal(failed.status,503);assert.equal((await failed.json()).token,undefined);
  const body=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+7200,nonce:'old-synthetic-session'})).toString('base64url');
  const oldToken=body+'.'+createHmac('sha256',key).update('studio-session\n'+body).digest('base64url');
  assert.equal((await fetch(base+'/api/manuscript',{headers:{Origin:origin,Authorization:'Bearer '+oldToken}})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
