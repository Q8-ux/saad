import http from 'node:http';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {AuthError,createSmsAuth} from './sms-auth.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
const routes=new Map([['/api/manuscript',['GET','PUT']],['/api/versions',['GET','POST']],['/api/scenarist',['GET','POST']],['/api/scenarist/refine',['POST']],['/api/transcribe',['POST']]]);
const maxBytes=9_000_000;
export function createGateway(config,fetchImpl=fetch){
 const {allowedOrigin,upstreamOrigin,siteToken,bridgeKey,accessHash,sessionSecret}=config;
 const openAccess=config.authMode==='open';
 const passwordOnly=config.authMode==='password';
 const remotePassword=passwordOnly&&config.passwordVerification==='upstream';
 const sessionTag=openAccess?'studio-open-session\n':passwordOnly?'studio-password-session\n':'studio-session\n';
 const sms=createSmsAuth(config,fetchImpl);
 const ready=!!(allowedOrigin&&upstreamOrigin&&siteToken&&bridgeKey&&(openAccess||remotePassword||(passwordOnly?accessHash:(accessHash||sms.credentialsReady)))&&sessionSecret);
 if(ready&&(!/^https:\/\//.test(allowedOrigin)||!/^https:\/\//.test(upstreamOrigin)))throw new Error('HTTPS configuration required');
 const pacing=new Map();
 function limited(key,limit){const now=Date.now(),old=pacing.get(key);if(pacing.size>2000){for(const [id,v]of pacing)if(v.exp<now)pacing.delete(id);if(pacing.size>2000)return true;}if(!old||old.exp<now){pacing.set(key,{n:1,exp:now+60000});return false;}old.n++;return old.n>limit;}
 function session(){const data=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+7200,nonce:randomUUID()})).toString('base64url');return data+'.'+createHmac('sha256',sessionSecret).update(sessionTag+data).digest('base64url');}
 function authenticated(value){const [data,sig,...extra]=(value||'').replace(/^Bearer /,'').split('.');if(!data||!sig||extra.length)return false;const correct=createHmac('sha256',sessionSecret).update(sessionTag+data).digest('base64url');if(!same(sig,correct))return false;try{const p=JSON.parse(Buffer.from(data,'base64url').toString());return Number.isInteger(p.exp)&&p.exp>Math.floor(Date.now()/1000);}catch{return false;}}
 async function upstreamRequest(method,route,body,type){
  const stamp=String(Date.now()),nonce=randomUUID();
  const signature=createHmac('sha256',bridgeKey).update([stamp,nonce,method,route,type,hash(body)].join('\n')).digest('hex');
  return fetchImpl(new URL('/api/external-studio',upstreamOrigin),{method:'POST',headers:{'OAI-Sites-Authorization':'Bearer '+siteToken,'Content-Type':type,'x-studio-time':stamp,'x-studio-nonce':nonce,'x-studio-method':method,'x-studio-route':route,'x-studio-signature':signature},body,signal:AbortSignal.timeout(85000)});
 }
 async function bytes(req){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>maxBytes){const error=new Error('too_large');error.status=413;throw error;}parts.push(part);}return Buffer.concat(parts);}
 return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
  if(origin===allowedOrigin){headers['Access-Control-Allow-Origin']=allowedOrigin;headers['Access-Control-Allow-Methods']='GET,PUT,POST,OPTIONS';headers['Access-Control-Allow-Headers']='Authorization,Content-Type';headers['Access-Control-Max-Age']='600';}
  const send=(status,body)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  try{
   const u=new URL(req.url,'https://gateway.invalid');
   if(u.pathname==='/health'&&req.method==='GET')return send(ready?200:503,{status:ready?'ready':'configuration_required'});
   if(!ready)return send(503,{error:'لم يُفعّل اتصال المساحة الخاصة بعد.'});
   if(origin!==allowedOrigin)return send(403,{error:'origin'});
   if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
   if(Number(req.headers['content-length']||0)>maxBytes)return send(413,{error:'الملف كبير جداً.'});
   const peer=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',').at(-1).trim();
   if(u.pathname==='/api/auth/options'&&req.method==='GET'){
    if(openAccess)return send(200,{mode:'open',smsConfigured:false,channel:'automatic'});
    if(passwordOnly)return send(200,{mode:'password',smsConfigured:false,legacyAvailable:!!accessHash,channel:'password',passwordMinLength:4});
    try{await sms.prepare();}catch{/* Keep existing access available while provider setup is incomplete. */}
    return send(200,{smsConfigured:sms.ready,legacyAvailable:!!accessHash&&!sms.ready,channel:'sms',trialOnly:true});
   }
   if(['/api/auth/sms/request','/api/auth/sms/verify'].includes(u.pathname)&&req.method==='POST'){
    if(openAccess||passwordOnly)return send(403,{error:openAccess?'يفتح الاستوديو مباشرة دون رمز دخول.':'الدخول بكلمة المرور فقط.'});
    if(limited('sms:'+u.pathname+':'+peer,8))return send(429,{error:'انتظر دقيقة قبل إعادة محاولة الدخول.',retryAfter:60});
    if(Number(req.headers['content-length']||0)>2048)return send(413,{error:'حجم طلب غير صالح.'});
    const raw=await bytes(req);if(raw.length>2048)return send(413,{error:'حجم طلب غير صالح.'});
    let input;try{input=JSON.parse(raw);}catch{return send(400,{error:'طلب غير صالح.'});}
    if(!input||Array.isArray(input)||typeof input!=='object')return send(400,{error:'طلب غير صالح.'});
    if(u.pathname.endsWith('/request'))return send(200,await sms.begin(input));
    const result=await sms.check(input);
    return send(200,{token:session(),expiresIn:7200,deviceToken:result.deviceToken});
   }
   if(u.pathname==='/api/auth'&&req.method==='POST'){
    if(!openAccess&&!passwordOnly&&sms.ready)return send(403,{error:'استخدم رمز الرسالة للدخول إلى الاستوديو.'});
    if(limited('login:'+peer,8))return send(429,{error:'انتظر دقيقة قبل إعادة محاولة الدخول.'});
    const raw=await bytes(req);if(raw.length>2048)return send(413,{error:'حجم طلب غير صالح.'});
    if(openAccess)return send(200,{token:session(),expiresIn:7200});
    let code;try{code=JSON.parse(raw).code;}catch{return send(400,{error:'طلب غير صالح.'});}
    if(passwordOnly&&typeof code==='string')code=code.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
    if(typeof code!=='string'||code.length<(passwordOnly?4:20)||code.length>160)return send(401,{error:passwordOnly?'كلمة المرور غير صحيحة.':'رمز الدخول غير صحيح.'});
    if(remotePassword){
     const verified=await upstreamRequest('POST','/api/password-login',Buffer.from(JSON.stringify({password:code})),'application/json');
     if(verified.status===401)return send(401,{error:'كلمة المرور غير صحيحة.'});
     if(!verified.ok||!verified.headers.get('content-type')?.includes('application/json')||(await verified.json()).verified!==true)return send(503,{error:'تعذر إكمال الدخول. حاول مرة أخرى.'});
    }else if(!same(hash(code),accessHash))return send(401,{error:passwordOnly?'كلمة المرور غير صحيحة.':'رمز الدخول غير صحيح.'});
    return send(200,{token:session(),expiresIn:7200});
   }
   if(!authenticated(req.headers.authorization))return send(401,{error:openAccess?'جارٍ تجديد الاتصال بالاستوديو.':passwordOnly?'أدخل كلمة المرور للدخول إلى الاستوديو.':'انتهت جلسة الدخول. تحقّق من هاتفك للدخول مجدداً.'});
   if(!routes.get(u.pathname)?.includes(req.method))return send(404,{error:'not_found'});
   if(limited('request:'+peer,100))return send(429,{error:'طلبات كثيرة؛ انتظر قليلاً.'});
   const body=await bytes(req),route=u.pathname+u.search,type=req.headers['content-type']||'';
   const upstream=await upstreamRequest(req.method,route,body,type);
   const ct=upstream.headers.get('content-type')||'';
   if(!ct.includes('application/json'))return send(502,{error:'تعذر الوصول إلى المساحة الخاصة. أعد المحاولة بعد قليل.'});
   res.writeHead(upstream.status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(Buffer.from(await upstream.arrayBuffer()));
  }catch(e){if(res.headersSent)return res.end();if(e instanceof AuthError)return send(e.status,{error:e.message,...(e.retryAfter?{retryAfter:e.retryAfter}:{})});send(e.status===413?413:502,{error:e.status===413?'الملف كبير جداً.':'لم يكتمل الاتصال. مسودتك المحلية لا تزال متاحة.'});}
 });
}
// This deployment opens directly, regardless of obsolete password/SMS settings.
export function fromEnvironment(env=process.env){return {authMode:'open',allowedOrigin:env.STUDIO_ALLOWED_ORIGIN,upstreamOrigin:env.STUDIO_UPSTREAM_ORIGIN,siteToken:env.STUDIO_SITE_TOKEN,bridgeKey:env.STUDIO_BRIDGE_KEY,sessionSecret:env.STUDIO_SESSION_SECRET};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=createGateway(fromEnvironment());server.requestTimeout=100000;server.headersTimeout=15000;server.listen(Number(process.env.PORT)||10000,'0.0.0.0');
 console.log('Private studio gateway listening.');
}
