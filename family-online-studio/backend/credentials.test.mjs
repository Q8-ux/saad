import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {once} from 'node:events';
import {hashPassword,verifyPassword} from './credentials.mjs';
import {createGateway,fromEnvironment} from './server.mjs';

const origin='https://writer.example',username='synthetic-writer',password='synthetic-test-password';
const passwordHash=await hashPassword(password);
const env={STUDIO_ALLOWED_ORIGIN:origin,STUDIO_UPSTREAM_ORIGIN:'https://private.example',STUDIO_SITE_TOKEN:'synthetic-token',STUDIO_BRIDGE_KEY:'synthetic-bridge-key',STUDIO_SESSION_SECRET:'synthetic-session-key',STUDIO_USERNAME:username,STUDIO_PASSWORD_HASH:passwordHash};
async function fixture(t,values=env){
 const config=fromEnvironment(values),calls=[];
 const server=createGateway(config,async(url,init)=>{
  calls.push({url,init});
  const h=init.headers,body=Buffer.from(init.body),hash=createHash('sha256').update(body).digest('hex');
  assert.equal(h['x-studio-signature'],createHmac('sha256',config.bridgeKey).update([h['x-studio-time'],h['x-studio-nonce'],h['x-studio-method'],h['x-studio-route'],h['Content-Type'],hash].join('\n')).digest('hex'));
  return Response.json({synthetic:true});
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(route,options={})=>fetch(base+route,{...options,headers:{Origin:origin,...options.headers}});
 const login=input=>request('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 return {config,base,request,login,calls};
}
test('salted password hashes verify exactly and contain no cleartext',async()=>{
 const other=await hashPassword(password);
 assert.notEqual(other,passwordHash);assert.ok(!passwordHash.includes(password));
 assert.equal(await verifyPassword(password,passwordHash),true);
 for(const value of ['wrong',password+' ',null,{},''])assert.equal(await verifyPassword(value,passwordHash),false);
 assert.equal(await verifyPassword(password,'invalid'),false);
});
test('production requires both credentials before any signed manuscript request',async t=>{
 const f=await fixture(t);
 assert.equal(f.config.authMode,'credentials');
 const options=await (await f.request('/api/auth/options')).json();assert.equal(options.mode,'credentials');assert.equal(options.smsConfigured,false);
 for(const [route,method] of [['/api/manuscript','GET'],['/api/manuscript','PUT'],['/api/versions','GET'],['/api/versions','POST'],['/api/scenarist','POST'],['/api/transcribe','POST']])assert.equal((await f.request(route,{method})).status,401);
 for(const input of [{},{code:'open'},{username,password:'wrong'},{username:'other',password}]){
  const rejected=await f.login(input);assert.equal(rejected.status,401);assert.equal((await rejected.json()).token,undefined);
 }
 for(const route of ['/api/auth/sms/request','/api/auth/sms/verify'])assert.equal((await f.request(route,{method:'POST',body:'{}'})).status,403);
 assert.equal(f.calls.length,0);
 const signedIn=await f.login({username,password});assert.equal(signedIn.status,200);
 const {token,expiresIn}=await signedIn.json();assert.ok(token);assert.equal(expiresIn,7200);
 assert.ok(!token.includes(password));
 assert.equal((await f.request('/api/manuscript?work=barcode',{headers:{Authorization:'Bearer '+token}})).status,200);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.headers['x-studio-route'],'/api/manuscript?work=barcode');
 assert.ok(!Buffer.from(f.calls[0].init.body).includes(Buffer.from(password)));
 assert.equal((await f.request('/api/manuscript',{headers:{Authorization:'Bearer '+token+'x'}})).status,401);
 const forbidden=await f.request('/api/manuscript',{headers:{Origin:'https://other.example',Authorization:'Bearer '+token}});assert.equal(forbidden.status,403);
});
test('old automatic/password sessions and expired sessions cannot access protected data',async t=>{
 const f=await fixture(t),expiry=Math.floor(Date.now()/1000)+7200;
 const sign=(tag,exp)=>{const data=Buffer.from(JSON.stringify({exp,nonce:'synthetic'})).toString('base64url');return data+'.'+createHmac('sha256',env.STUDIO_SESSION_SECRET).update(tag+data).digest('base64url');};
 const binding=createHash('sha256').update(username+'\n'+passwordHash).digest('hex');
 for(const token of [sign('studio-open-session\n',expiry),sign('studio-password-session\n',expiry),sign('studio-session\n',expiry),sign('studio-credentials-session-v1\n'+binding+'\n',expiry-7300)])assert.equal((await f.request('/api/manuscript',{headers:{Authorization:'Bearer '+token}})).status,401);
 const oldToken=(await (await f.login({username,password})).json()).token;
 const rotated=await fixture(t,{...env,STUDIO_PASSWORD_HASH:await hashPassword('synthetic-replacement')});
 assert.equal((await rotated.request('/api/manuscript',{headers:{Authorization:'Bearer '+oldToken}})).status,401);
 assert.equal(f.calls.length,0);assert.equal(rotated.calls.length,0);
});
test('missing credentials fail closed even with obsolete open and SMS configuration',async t=>{
 for(const changes of [{STUDIO_USERNAME:''},{STUDIO_PASSWORD_HASH:''},{STUDIO_PASSWORD_HASH:'invalid'}]){
  const f=await fixture(t,{...env,...changes,STUDIO_AUTH_MODE:'open',STUDIO_ACCESS_SHA256:'obsolete'});
  assert.equal((await fetch(f.base+'/health')).status,503);
  assert.equal((await f.login({code:'open'})).status,503);assert.equal(f.calls.length,0);
 }
});
test('malformed input and repeated failures never issue sessions',async t=>{
 const f=await fixture(t);
 assert.equal((await f.request('/api/auth',{method:'POST',body:'{'})).status,400);
 for(const input of [null,[],{username:[],password},{username,password:[]},{username,password:'x'.repeat(161)}])assert.equal((await f.login(input)).status,401);
 let last;for(let i=0;i<5;i++)last=await f.login({username,password:'wrong'});
 assert.equal(last.status,429);assert.equal(f.calls.length,0);
});
