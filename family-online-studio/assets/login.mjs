export function createStudioLogin({React,Studio,config}){
 const h=React.createElement;
 const apiBase=String(config.apiBase||''),sessionKey='fo-studio-login-session-v1:'+apiBase;
 const Workspace=React.lazy(()=>import('./studio-works.mjs').then(({createStudioWorks})=>({default:createStudioWorks({React,Studio,apiBase})})));
 const accountFrom=value=>value&&/^[a-z0-9][a-z0-9-]{0,31}$/u.test(value.id||'')?{id:value.id,username:typeof value.username==='string'?value.username.slice(0,80):''}:null;
 function forgetSession(){try{localStorage.removeItem(sessionKey);}catch{}try{sessionStorage.removeItem(sessionKey);}catch{}}
 function readSession(){
  let raw;try{raw=localStorage.getItem(sessionKey);}catch{}
  if(!raw)try{raw=sessionStorage.getItem(sessionKey);}catch{}
  try{
   const saved=JSON.parse(raw||'null');
   if(saved&&saved.apiBase===apiBase&&typeof saved.token==='string'&&saved.token&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now()){
    try{localStorage.setItem(sessionKey,raw);sessionStorage.removeItem(sessionKey);}catch{}
    return {token:saved.token,account:accountFrom({id:saved.accountId})};
   }
  }catch{}
  forgetSession();return {token:'',account:null};
 }
 function rememberSession(token,expiresIn,account){
  const seconds=Number(expiresIn),lifetime=Number.isFinite(seconds)&&seconds>0?Math.min(seconds,7200):7200;
  const saved=JSON.stringify({apiBase,token,...(account?{accountId:account.id}:{}),expiresAt:Date.now()+lifetime*1000});
  try{localStorage.setItem(sessionKey,saved);}catch{try{sessionStorage.setItem(sessionKey,saved);}catch{}}
 }
 return function ProtectedStudio(){
  const [session,setSession]=React.useState(()=>{const saved=readSession();window.__STUDIO_SESSION__=saved.token;return saved;}),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [username,setUsername]=React.useState(''),[password,setPassword]=React.useState('');
  const request=React.useRef(null),passwordInput=React.useRef(null);
  function lock(message='',clearStored=true){
   request.current?.abort();request.current=null;
   if(clearStored)forgetSession();
   window.__STUDIO_SESSION__='';setSession({token:'',account:null});setPassword('');setBusy(false);setError(message);
  }
  async function signIn(event){
   event.preventDefault();
   if(request.current)return;
   if(!config.apiBase){setError('تعذر الاتصال بالموقع. حاول مرة أخرى.');return;}
   const controller=new AbortController();request.current=controller;
   setBusy(true);setError('');
   try{
    // The code field supports an existing gateway build while both fields migrate to scrypt verification.
    const credentials={username:username.trim(),password};
    const code='studio-credentials-v1:'+JSON.stringify([credentials.username,credentials.password]);
    const response=await fetch(new URL('/api/auth',config.apiBase),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...credentials,code}),credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(70_000)])});
    const data=await response.json();
    if(!response.ok||typeof data.token!=='string'||!data.token)throw new Error(response.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':data.error||'تعذر تسجيل الدخول. حاول مرة أخرى.');
    if(controller.signal.aborted)return;
    const account=accountFrom(data.account);
    rememberSession(data.token,data.expiresIn,account);
    window.__STUDIO_SESSION__=data.token;setSession({token:data.token,account});setPassword('');
   }catch(e){if(!controller.signal.aborted){setError(e.name==='TimeoutError'?'استغرق الاتصال وقتًا أطول. حاول مرة أخرى.':e.message||'تعذر الاتصال. حاول مرة أخرى.');setPassword('');passwordInput.current?.focus();}}
   finally{if(request.current===controller){request.current=null;setBusy(false);}}
  }
  React.useEffect(()=>{
   try{localStorage.removeItem('fo-studio-sms-device');}catch{}
   const expired=()=>lock('انتهت جلسة الدخول. أدخل بياناتك للمتابعة.');
   const logout=()=>lock();
   const storageChanged=event=>{if(event.key===sessionKey)lock('',false);};
   window.addEventListener('studio-session-expired',expired);
   window.addEventListener('studio-sign-out',logout);
   window.addEventListener('storage',storageChanged);
   return()=>{window.removeEventListener('studio-session-expired',expired);window.removeEventListener('studio-sign-out',logout);window.removeEventListener('storage',storageChanged);request.current?.abort();request.current=null;};
  },[]);
  return session.token?(session.account?h(React.Suspense,{fallback:h('main',{className:'loading-screen',role:'status'},'جارٍ فتح استيديو الكتابة…')},h(Workspace,{key:session.account.id,token:session.token,account:session.account,onSignOut:()=>lock()})):h(Studio,{userKey:'external-private-owner',onSignOut:()=>lock()})):h('main',{className:'external-login',dir:'rtl'},h('section',{'aria-labelledby':'studio-login-title'},
   h('img',{src:new URL('./studio/pen-mark.webp',import.meta.url).href,width:80,height:80,alt:'',className:'studio-loading-mark'}),
   h('h1',{id:'studio-login-title'},'استيديو الكتابة'),
   h('p',null,'سجّل الدخول لفتح أعمالك ومتابعة الكتابة.'),
   h('form',{onSubmit:signIn,'aria-busy':busy},
    h('label',{htmlFor:'studio-username'},'اسم المستخدم'),
    h('input',{id:'studio-username',name:'username',type:'text',dir:'ltr',autoComplete:'username',autoCapitalize:'none',spellCheck:false,maxLength:80,required:true,value:username,disabled:busy,onChange:e=>setUsername(e.target.value)}),
    h('label',{htmlFor:'studio-password'},'كلمة المرور'),
    h('input',{id:'studio-password',name:'password',type:'password',dir:'ltr',autoComplete:'current-password',maxLength:160,required:true,value:password,ref:passwordInput,disabled:busy,onChange:e=>setPassword(e.target.value)}),
    error&&h('p',{id:'studio-login-error',role:'alert',className:'error-text'},error),
    h('button',{type:'submit',className:'primary',disabled:busy},busy?'جارٍ التحقق…':'دخول الاستوديو'))));
 };
}
