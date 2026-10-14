import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';

const OTP_TTL=10*60_000, DEVICE_TTL=90*24*60*60_000, TRIAL_TTL=30*24*60*60_000;
const same=(a,b)=>{const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));return x.length===y.length&&timingSafeEqual(x,y);};
export const digits=value=>String(value??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
export function normalizePhone(value){
 if(typeof value!=='string')return '';
 let p=digits(value).replace(/[\s()-]/g,'');
 if(/^\d{8}$/.test(p))p='+965'+p;
 if(p.startsWith('00'))p='+'+p.slice(2);
 return /^\+[1-9]\d{7,14}$/.test(p)?p:'';
}
export class AuthError extends Error{
 constructor(status,message,retryAfter=0){super(message);this.status=status;this.retryAfter=retryAfter;}
}

// Only a primary, active Trial account is accepted. No production billing mode.
export function createSmsAuth(config,fetchImpl=fetch,clock=Date.now){
 const phone=normalizePhone(config.ownerPhone);
 const account=config.twilioAccountSid||'';
 let verify=config.twilioVerifyServiceSid||'';
 const credentialsReady=!!(phone&&config.sessionSecret&&/^AC[0-9a-f]{32}$/i.test(account)&&config.twilioAuthToken);
 const ready=()=>credentialsReady&&/^VA[0-9a-f]{32}$/i.test(verify);
 const authorization='Basic '+Buffer.from(account+':'+(config.twilioAuthToken||'')).toString('base64');
 const recipient=createHmac('sha256',config.sessionSecret||'unconfigured').update('sms-recipient\n'+phone).digest('hex');
 const challenges=new Map(),sendTimes=[];
 let inFlight=false,discovery=null,discoveryRetryAt=0,discoveryError=null;
 const fail=(status,message,retry)=>{throw new AuthError(status,message,retry);};
 function unpackDevice(value){
  if(typeof value!=='string'||value.length>1500)return false;
  const [data,sig,...extra]=value.split('.');
  if(!data||!sig||extra.length)return false;
  const expected=createHmac('sha256',config.sessionSecret||'').update('studio-sms-device\n'+data).digest('base64url');
  if(!same(sig,expected))return false;
  try{const p=JSON.parse(Buffer.from(data,'base64url'));return p.kind==='sms-device'&&p.recipient===recipient&&Number.isSafeInteger(p.exp)&&p.exp>clock();}catch{return false;}
 }
 function device(){
  const data=Buffer.from(JSON.stringify({kind:'sms-device',recipient,exp:clock()+DEVICE_TTL,nonce:randomUUID()})).toString('base64url');
  return data+'.'+createHmac('sha256',config.sessionSecret).update('studio-sms-device\n'+data).digest('base64url');
 }
 async function provider(url,body){
  let response,result;
  try{
   response=await fetchImpl(url,{method:body?'POST':'GET',headers:{Authorization:authorization,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:new URLSearchParams(body)}:{}),signal:AbortSignal.timeout(15_000)});
   result=await response.json();
  }catch{fail(502,'تعذر الاتصال بخدمة الرسائل. أعد المحاولة لاحقاً.');}
  if(!response.ok){
   if(response.status===429)fail(429,'وصلت إلى حد المحاولات. انتظر قبل إعادة الإرسال.',60);
   if(response.status===404||result?.code===60202)fail(401,'انتهت صلاحية الرمز أو محاولاته. اطلب رمزاً جديداً.');
   fail(502,'تعذر إكمال طلب الرسائل. تحقق من إعداد الحساب التجريبي والرقم المعتمد.');
  }
  return result;
 }
 async function trial(){
  const a=await provider('https://api.twilio.com/2010-04-01/Accounts/'+account+'.json');
  const created=Date.parse(a.date_created),expires=created+TRIAL_TTL;
  if(a.sid!==account||a.owner_account_sid!==account||a.type!=='Trial'||a.status!=='active')fail(503,'الإرسال متوقف: يقبل هذا الربط حساباً تجريبياً مجانياً فقط.');
  if(!Number.isFinite(created)||created>clock()+60_000||expires<=clock())fail(503,'انتهت التجربة المجانية. لم يُحوّل الدخول إلى خدمة مدفوعة.');
  return expires;
 }
 // Reuse one existing six-digit service. Discovery never creates resources or sends SMS.
 async function prepare(){
  if(ready())return true;
  if(!credentialsReady||verify)return false;
  if(discovery)return discovery;
  if(discoveryError&&clock()<discoveryRetryAt)throw discoveryError;
  discovery=(async()=>{
   await trial();
   const result=await provider('https://verify.twilio.com/v2/Services?PageSize=2');
   if(!Array.isArray(result?.services))fail(502,'لم يكتمل اكتشاف خدمة الرسائل. أعد المحاولة لاحقاً.');
   if(!result.services.length)fail(503,'أكمل تهيئة Verify التجريبي في حساب Twilio أولاً.');
   if(result.services.length!==1||result.meta?.next_page_url)fail(503,'توجد عدة خدمات Verify. حدد معرّف الخدمة المقصودة في إعدادات الخادم.');
   const selected=result.services[0];
   if(!selected||selected.account_sid!==account||!/^VA[0-9a-f]{32}$/i.test(selected.sid)||selected.code_length!==6)fail(503,'لم تُعثر على خدمة تحقق تابعة للحساب برمز من ستة أرقام.');
   verify=selected.sid;
   discoveryError=null;
   return true;
  })();
  try{return await discovery;}
  catch(error){discoveryError=error;discoveryRetryAt=clock()+60_000;throw error;}
  finally{discovery=null;}
 }
 function clean(){for(const [id,c]of challenges)if(c.expiresAt<=clock())challenges.delete(id);while(sendTimes.length&&sendTimes[0]<=clock()-24*60*60_000)sendTimes.shift();}
 function publicChallenge(id,c,sent){return {challenge:id,sent,reused:!sent,expiresIn:Math.max(0,Math.floor((c.expiresAt-clock())/1000)),resendAfter:Math.max(0,Math.ceil((c.sentAt+60_000-clock())/1000)),destination:'•••• '+phone.slice(-2),channel:'sms',trialExpiresAt:new Date(c.trialExpires).toISOString()};}
 async function begin(input={}){
  if(!credentialsReady)fail(503,'لم تُربط خدمة الرسائل ورقم الهاتف بعد.');
  if(!input||typeof input!=='object'||(!unpackDevice(input.device)&&!same(normalizePhone(input.phone),phone)))fail(401,'أدخل رقم الهاتف المعتمد لهذا الاستوديو.');
  clean();
  if(inFlight)fail(429,'جارٍ طلب الرمز. انتظر قليلاً.',60);
  const latest=[...challenges.entries()].at(-1);
  if(latest&&latest[1].sentAt+60_000>clock())return publicChallenge(latest[0],latest[1],false);
  const last=sendTimes.at(-1);
  if(last!==undefined&&last+60_000>clock())fail(429,'انتظر قبل إعادة طلب الرمز.',Math.ceil((last+60_000-clock())/1000));
  if(sendTimes.filter(t=>t>clock()-60*60_000).length>=5||sendTimes.length>=20)fail(429,'وصلت إلى الحد الآمن لإرسال الرسائل. حاول لاحقاً.',3600);
  inFlight=true;
  try{
   await prepare();
   if(!ready())fail(503,'لم تُربط خدمة الرسائل ورقم الهاتف بعد.');
   const trialExpires=await trial();
   sendTimes.push(clock());
   const result=await provider('https://verify.twilio.com/v2/Services/'+verify+'/Verifications',{To:phone,Channel:'sms',Locale:'ar'});
   if(result.status!=='pending'||!/^VE[0-9a-f]{32}$/i.test(result.sid)||normalizePhone(result.to)!==phone||result.service_sid!==verify)fail(502,'لم تؤكد خدمة الرسائل قبول طلب الرمز.');
   const id=randomUUID(),started=Date.parse(result.date_created);
   const c={sid:result.sid,sentAt:clock(),expiresAt:Math.min(clock()+OTP_TTL,Number.isFinite(started)?started+OTP_TTL:clock()+OTP_TTL),trialExpires,attempts:0,busy:false};
   if(c.expiresAt<=clock())fail(401,'انتهت صلاحية الرمز. اطلب رمزاً جديداً.');
   challenges.clear();challenges.set(id,c);
   return publicChallenge(id,c,true);
  }finally{inFlight=false;}
 }
 async function check(input={}){
  if(!ready())fail(503,'لم تُربط خدمة الرسائل ورقم الهاتف بعد.');
  clean();
  const c=input&&challenges.get(input.challenge);
  if(!c)fail(401,'انتهت صلاحية الرمز. اطلب رمزاً جديداً.');
  if(c.busy)fail(409,'جارٍ التحقق من الرمز. انتظر قليلاً.');
  if(c.attempts>=5){challenges.delete(input.challenge);fail(401,'انتهت محاولات الرمز. اطلب رمزاً جديداً.');}
  const code=digits(input.code);
  if(!/^\d{6}$/.test(code))fail(400,'أدخل رمز الرسالة المكوّن من ستة أرقام.');
  c.busy=true;c.attempts++;
  try{
   await trial();
   const result=await provider('https://verify.twilio.com/v2/Services/'+verify+'/VerificationCheck',{VerificationSid:c.sid,Code:code});
   if(c.expiresAt<=clock()||challenges.get(input.challenge)!==c)fail(401,'انتهت صلاحية الرمز. اطلب رمزاً جديداً.');
   if(result.status!=='approved'||result.sid!==c.sid||normalizePhone(result.to)!==phone||result.service_sid!==verify)fail(401,'الرمز غير صحيح. تحقق من الرسالة وحاول مجدداً.');
   challenges.delete(input.challenge);
   return {approved:true,deviceToken:device()};
  }catch(e){if(c.attempts>=5||e.status===401&&/انتهت/.test(e.message))challenges.delete(input.challenge);throw e;}
  finally{c.busy=false;}
 }
 return {get ready(){return ready();},credentialsReady,prepare,begin,check};
}
