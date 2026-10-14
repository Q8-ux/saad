const DEVICE_KEY='fo-studio-sms-device';
export const normalizeDigits=value=>String(value??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
const readDevice=()=>{try{return localStorage.getItem(DEVICE_KEY)||'';}catch{return '';}};
const saveDevice=value=>{try{if(value)localStorage.setItem(DEVICE_KEY,value);else localStorage.removeItem(DEVICE_KEY);}catch{}};

export function createStudioLogin({React,Studio,config,initialAccess=''}){
 const h=React.createElement;
 return function StudioLogin(){
  const [token,setToken]=React.useState(''),[phone,setPhone]=React.useState(''),[code,setCode]=React.useState('');
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[notice,setNotice]=React.useState('');
  const [options,setOptions]=React.useState(null),[mode,setMode]=React.useState('sms'),[challenge,setChallenge]=React.useState(null);
  const [tick,setTick]=React.useState(Date.now()),[remember,setRemember]=React.useState(true);
  const automatic=React.useRef(false),phoneRef=React.useRef(''),lock=React.useRef(false),input=React.useRef(null);
  async function api(path,body){
   if(!config.apiBase)throw new Error('لم يُفعّل الاتصال الخاص بعد.');
   const response=await fetch(new URL(path,config.apiBase),{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',signal:AbortSignal.timeout(70_000)});
   const data=await response.json();
   if(!response.ok){const e=new Error(data.error||'تعذر إكمال الطلب.');e.retryAfter=data.retryAfter||0;e.status=response.status;throw e;}
   return data;
  }
  function signedIn(data){
   if(typeof data.token!=='string'||!data.token)throw new Error('تعذر إكمال الدخول.');
   if(data.deviceToken)saveDevice(remember?data.deviceToken:'');
   window.__STUDIO_SESSION__=data.token;setToken(data.token);setCode('');setPhone('');phoneRef.current='';setChallenge(null);setNotice('');
  }
  async function legacy(value=code){
   if(lock.current)return;
   lock.current=true;setBusy(true);setError('');
   try{signedIn(await api('/api/auth',{code:value}));}catch(e){setError(e.message||'تعذر الدخول.');}finally{lock.current=false;setBusy(false);}
  }
  async function request(device=readDevice()){
   if(lock.current)return;
   lock.current=true;setBusy(true);setError('');setNotice('');
   try{
    const p=phone||phoneRef.current;phoneRef.current=p;
    const result=await api('/api/auth/sms/request',device?{device}:{phone:p});
    if(typeof result.challenge!=='string')throw new Error('لم يكتمل طلب الرمز.');
    const now=Date.now();setTick(now);setCode('');
    setChallenge({...result,expiresAt:now+result.expiresIn*1000,resendAt:now+result.resendAfter*1000});
    setNotice(result.sent?'قبلت خدمة الرسائل طلب الرمز. أدخل الرمز عند وصوله إلى هاتفك.':'استخدم الرمز الذي طلبته قبل قليل؛ لم تُطلب رسالة أخرى.');
   }catch(e){
    if(e.status===401&&device){saveDevice('');phoneRef.current='';setChallenge(null);}
    if(e.retryAfter)setChallenge(c=>c?{...c,resendAt:Date.now()+e.retryAfter*1000}:c);
    setError(e.message||'تعذر طلب الرمز. أعد المحاولة.');
   }finally{lock.current=false;setBusy(false);}
  }
  async function verify(){
   if(lock.current||!challenge)return;
   lock.current=true;setBusy(true);setError('');
   try{signedIn(await api('/api/auth/sms/verify',{challenge:challenge.challenge,code:normalizeDigits(code)}));}
   catch(e){setError(e.message||'تعذر التحقق من الرمز.');}
   finally{lock.current=false;setBusy(false);}
  }
  React.useEffect(()=>{
   let alive=true;
   api('/api/auth/options').then(data=>{if(alive){setOptions(data);if(!data.smsConfigured)setMode('legacy');}}).catch(()=>{if(alive){setOptions({smsConfigured:false,legacyAvailable:true});setMode('legacy');}});
   const expired=()=>{window.__STUDIO_SESSION__='';setToken('');setCode('');setChallenge(null);automatic.current=false;setNotice('انتهت الجلسة. أدخل رمزاً جديداً للدخول.');};
   window.addEventListener('studio-session-expired',expired);
   return()=>{alive=false;window.removeEventListener('studio-session-expired',expired);};
  },[]);
  React.useEffect(()=>{
   if(!options||token||automatic.current)return;
   automatic.current=true;
   if(options.smsConfigured){const d=readDevice();if(d)request(d);}
   else if(initialAccess){const secret=initialAccess;initialAccess='';legacy(secret);}
  },[options,token]);
  React.useEffect(()=>{if(!challenge)return;input.current?.focus();const timer=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(timer);},[challenge]);
  function signOut(){window.__STUDIO_SESSION__='';setToken('');setCode('');setChallenge(null);setNotice('');setError('');automatic.current=true;}
  const resend=challenge?Math.max(0,Math.ceil((challenge.resendAt-tick)/1000)):0;
  const expired=challenge&&challenge.expiresAt<=tick;
  if(token)return h(Studio,{userKey:'external-private-owner',onSignOut:signOut});
  const label=(id,text)=>h('label',{htmlFor:id},text);
  const button=(text,extra={})=>h('button',{className:'primary',disabled:busy||!config.apiBase,...extra},busy?'جارٍ إكمال الطلب…':text);
  const form=mode==='legacy'?h('form',{onSubmit:e=>{e.preventDefault();legacy();}},
   label('access-code','رمز الدخول الخاص'),h('input',{id:'access-code',type:'password',autoComplete:'current-password',value:code,onChange:e=>setCode(e.target.value),disabled:busy,required:true,minLength:20}),button('افتح مساحتي')):
   challenge?h('form',{onSubmit:e=>{e.preventDefault();verify();}},
    h('p',{className:'sms-destination'},'الرمز إلى رقمك المنتهي بـ ',h('b',{dir:'ltr'},challenge.destination.slice(-2))),
    label('sms-code','رمز الرسالة'),h('input',{ref:input,id:'sms-code',className:'sms-code',type:'text',inputMode:'numeric',autoComplete:'one-time-code',dir:'ltr',value:code,onChange:e=>setCode(normalizeDigits(e.target.value).replace(/\D/g,'').slice(0,6)),disabled:busy||expired,required:true,minLength:6,maxLength:6,pattern:'[0-9]{6}',placeholder:'000000'}),
    h('label',{className:'sms-remember'},h('input',{type:'checkbox',checked:remember,onChange:e=>setRemember(e.target.checked)}),'إرسال الرمز تلقائياً عند فتح الموقع على هذا الجهاز'),
    button('تحقّق وافتح الاستوديو',{disabled:busy||expired||code.length!==6}),
    h('p',{className:'sms-status',role:'status'},expired?'انتهت صلاحية الرمز. اطلب رمزاً جديداً.':'الرمز صالح لمدة محدودة ويُستخدم مرة واحدة.'),
    h('button',{type:'button',className:'sms-secondary',disabled:busy||resend>0,onClick:()=>request()},resend>0?'إعادة الإرسال بعد '+resend+' ثانية':'إعادة إرسال الرمز')):
   h('form',{onSubmit:e=>{e.preventDefault();request();}},
    label('owner-phone','رقم هاتفك المعتمد'),h('input',{id:'owner-phone',type:'tel',inputMode:'tel',dir:'ltr',autoComplete:'tel',value:phone,onChange:e=>setPhone(e.target.value),placeholder:'+965',required:!readDevice(),disabled:busy||!options?.smsConfigured,maxLength:24}),
    button('أرسل رمز الدخول برسالة SMS',{disabled:busy||!options?.smsConfigured}),
    h('p',{className:'sms-status'},'عند اعتماد الهاتف أول مرة، يُطلب الرمز تلقائياً عند فتح الموقع على الجهاز نفسه.'));
  return h('main',{className:'external-login',dir:'rtl'},h('section',null,
   h('span',{'aria-hidden':true,className:'sms-lock'},'🔒'),h('p',{className:'eyebrow'},'مساحتك، حكايتك.'),h('h1',null,'استوديو الكتابة'),
   h('p',null,'مساحة خاصة لكتابة أعمالك وحفظها ومراجعتها مع السينارست.'),
   !options?h('p',{role:'status'},'جارٍ التحقق من وسيلة الدخول…'):form,
   notice&&h('p',{role:'status',className:'sms-status'},notice),error&&h('p',{role:'alert',className:'error-text'},error),
   options&&!options.smsConfigured&&h('div',{className:'sms-pending'},h('strong',null,'الدخول برسالة SMS بانتظار التفعيل'),h('p',null,'يحتاج رقمك وربط حساب رسائل تجريبي. لم تُرسل رسالة بعد.')),
   h('small',null,options?.smsConfigured?'الربط مقيد بالتجربة المجانية. عند انتهائها يتوقف الإرسال، ولا يتحول إلى اشتراك مدفوع.':'يمكنك استخدام رمزك الخاص إلى أن يُفعّل إرسال الرموز إلى هاتفك.')));
 };
}
