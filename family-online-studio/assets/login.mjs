import { makeRelayLogin, studioRequest } from './studio-request.mjs?v=20261118-recovery1';

export function createStudioLogin({React,Studio,config}){
 const h=React.createElement;
 const apiBase=String(config.apiBase||''),sessionKey='fo-studio-account-session-v2:'+apiBase;
 const previousKey='fo-studio-login-session-v1:'+apiBase;
 const sessionLifetime=7200,rememberedLifetime=30*24*60*60;
 const Workspace=React.lazy(()=>import('./studio-works.mjs?v=20261118-recovery1').then(({createStudioWorks})=>({default:createStudioWorks({React,Studio})})));
 const accountFrom=value=>value&&/^[a-z0-9][a-z0-9-]{0,31}$/u.test(value.id||'')?{id:value.id,username:typeof value.username==='string'?value.username.slice(0,80):''}:null;
 function forgetSession(){
  try{sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(previousKey);}catch{}
  try{localStorage.removeItem(sessionKey);localStorage.removeItem(previousKey);}catch{}
 }
 function activate(session){
  window.__STUDIO_SESSION__=session?.token||'';
  window.__STUDIO_REQUEST__=session?(path,options)=>studioRequest(apiBase,session,path,options):undefined;
  return session;
 }
 function sessionFrom(storage){
  try{
   const saved=JSON.parse(storage.getItem(sessionKey)||'null');
   const account=accountFrom({id:saved?.accountId});
   if(account&&saved.apiBase===apiBase&&typeof saved.token==='string'&&saved.token&&
      (saved.proof===undefined||/^[A-Za-z0-9_-]{43}$/u.test(saved.proof))&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now()){
    return {session:{token:saved.token,proof:saved.proof,account},expiresAt:saved.expiresAt};
   }
  }catch{}
  try{storage.removeItem(sessionKey);}catch{}
  return null;
 }
 function readSession(){
  const current=sessionFrom(sessionStorage),remembered=sessionFrom(localStorage);
  const valid=[current,remembered].filter(Boolean).sort((a,b)=>b.expiresAt-a.expiresAt)[0];
  try{sessionStorage.removeItem(previousKey);}catch{}
  try{localStorage.removeItem(previousKey);}catch{}
  return valid?.session||null;
 }
 function rememberSession({token,proof,account},expiresIn,remember){
  const maximum=remember?rememberedLifetime:sessionLifetime;
  const seconds=Number(expiresIn),lifetime=Number.isFinite(seconds)&&seconds>0?Math.min(seconds,maximum):maximum;
  const saved=JSON.stringify({apiBase,token,proof,accountId:account.id,expiresAt:Date.now()+lifetime*1000});
  try{sessionStorage.removeItem(sessionKey);}catch{}
  try{localStorage.removeItem(sessionKey);}catch{}
  try{(remember?localStorage:sessionStorage).setItem(sessionKey,saved);}catch{}
 }
 return function ProtectedStudio(){
  const [session,setSession]=React.useState(()=>activate(readSession())),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [username,setUsername]=React.useState(''),[password,setPassword]=React.useState(''),[remember,setRemember]=React.useState(false),[showPassword,setShowPassword]=React.useState(false);
  const request=React.useRef(null),passwordInput=React.useRef(null);
  function lock(message=''){
   request.current?.abort();request.current=null;
   forgetSession();
   setSession(activate(null));setPassword('');setBusy(false);setError(message);
  }
  function signOut(){
   if(session?.proof)void studioRequest(apiBase,session,'/api/auth/logout',{method:'POST',signal:AbortSignal.timeout(15_000)}).catch(()=>{});
   setUsername('');setShowPassword(false);
   lock();
  }
  async function signIn(event){
   event.preventDefault();
   if(request.current)return;
   if(!config.apiBase){setError('تعذر الاتصال بالموقع. حاول مرة أخرى.');return;}
   const controller=new AbortController();request.current=controller;
   setBusy(true);setError('');
   try{
    const credentials={username:username.trim(),password,remember};
    const relay=makeRelayLogin(credentials.username,credentials.password,remember);
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(70_000)]);
    const response=await fetch(new URL('/api/auth',apiBase),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials,code:relay.code}),credentials:'omit',signal});
    const data=await response.json();
    if(!response.ok||typeof data.token!=='string'||!data.token)throw new Error(response.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':data.error||'تعذر تسجيل الدخول. حاول مرة أخرى.');
    const signedIn={token:data.token,account:accountFrom(data.account)};
    if(!signedIn.account){
     signedIn.proof=relay.proof;
     const check=await studioRequest(apiBase,signedIn,'/api/projects',{signal});
     if(!check.ok)throw new Error('تعذر التحقق من الحساب. حاول مرة أخرى.');
     signedIn.account=accountFrom((await check.json()).account);
    }
    if(!signedIn.account)throw new Error('تعذر التحقق من الحساب. حاول مرة أخرى.');
    if(controller.signal.aborted)return;
    rememberSession(signedIn,data.expiresIn,remember);
    setSession(activate(signedIn));setPassword('');
   }catch(e){if(!controller.signal.aborted){setError(e.name==='TimeoutError'?'استغرق الاتصال وقتًا أطول. حاول مرة أخرى.':e.message||'تعذر الاتصال. حاول مرة أخرى.');setPassword('');passwordInput.current?.focus();}}
   finally{if(request.current===controller){request.current=null;setBusy(false);}}
  }
  React.useEffect(()=>{
   try{localStorage.removeItem('fo-studio-sms-device');}catch{}
   const expired=()=>lock('انتهت جلسة الدخول. أدخل بياناتك للمتابعة.');
   const logout=()=>{setUsername('');setShowPassword(false);lock();};
   window.addEventListener('studio-session-expired',expired);
   window.addEventListener('studio-sign-out',logout);
   return()=>{window.removeEventListener('studio-session-expired',expired);window.removeEventListener('studio-sign-out',logout);request.current?.abort();request.current=null;};
  },[]);
  return session?h(React.Suspense,{fallback:h('main',{className:'loading-screen',role:'status'},'جارٍ فتح استيديو الكتابة…')},h(Workspace,{key:session.account.id,account:session.account,requestStudio:window.__STUDIO_REQUEST__,onSignOut:signOut})):h('main',{className:'external-login',dir:'rtl'},h('section',{'aria-labelledby':'studio-login-title'},
   h('img',{src:new URL('./studio/pen-mark.webp',import.meta.url).href,width:80,height:80,alt:'',className:'studio-loading-mark'}),
   h('h1',{id:'studio-login-title'},'استيديو الكتابة'),
   h('p',null,'سجّل الدخول لفتح أعمالك ومتابعة الكتابة.'),
   h('form',{onSubmit:signIn,'aria-busy':busy},
    h('label',{htmlFor:'studio-username'},'اسم المستخدم'),
    h('input',{id:'studio-username',name:'username',type:'text',dir:'ltr',autoComplete:'username',autoCapitalize:'none',spellCheck:false,maxLength:80,required:true,value:username,disabled:busy,onChange:e=>setUsername(e.target.value)}),
    h('label',{htmlFor:'studio-password'},'كلمة المرور'),
    h('input',{id:'studio-password',name:'password',type:showPassword?'text':'password',dir:'ltr',autoComplete:'current-password',maxLength:160,required:true,value:password,ref:passwordInput,disabled:busy,onChange:e=>setPassword(e.target.value)}),
    h('label',{className:'show-password',htmlFor:'studio-show-password'},
     h('input',{id:'studio-show-password',name:'show-password',type:'checkbox',checked:showPassword,disabled:busy,onChange:e=>setShowPassword(Boolean(e.target.checked))}),
     h('span',null,'إظهار كلمة المرور')),
    h('label',{className:'remember-login',htmlFor:'studio-remember'},
     h('input',{id:'studio-remember',name:'remember',type:'checkbox',checked:remember,disabled:busy,onChange:e=>setRemember(Boolean(e.target.checked))}),
     h('span',null,'حفظ تسجيل الدخول على هذا الجهاز')),
    h('p',{className:'remember-login-note'},'بعد أول دخول ناجح لن تحتاج إلى كتابة كلمة المرور كل مرة على هذا الجهاز الخاص.'),
    error&&h('p',{id:'studio-login-error',role:'alert',className:'error-text'},error),
    h('button',{type:'submit',className:'primary',disabled:busy},busy?'جارٍ التحقق…':'تسجيل الدخول'))));
 };
}

