import { makeRelayLogin, studioRequest } from './studio-request.mjs?v=private-accounts-1';

export function createStudioLogin({React,Studio,config}){
 const h=React.createElement;
 const apiBase=String(config.apiBase||''),sessionKey='fo-studio-account-session-v2:'+apiBase;
 const previousKey='fo-studio-login-session-v1:'+apiBase;
 const Workspace=React.lazy(()=>import('./studio-works.mjs?v=private-accounts-1').then(({createStudioWorks})=>({default:createStudioWorks({React,Studio})})));
 const accountFrom=value=>value&&/^[a-z0-9][a-z0-9-]{0,31}$/u.test(value.id||'')?{id:value.id,username:typeof value.username==='string'?value.username.slice(0,80):''}:null;
 function forgetSession(){try{sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(previousKey);}catch{}try{localStorage.removeItem(previousKey);}catch{}}
 function activate(session){
  window.__STUDIO_SESSION__=session?.token||'';
  window.__STUDIO_REQUEST__=session?(path,options)=>studioRequest(apiBase,session,path,options):undefined;
  return session;
 }
 function readSession(){
  try{
   const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
   const account=accountFrom({id:saved?.accountId});
   if(account&&saved.apiBase===apiBase&&typeof saved.token==='string'&&saved.token&&
      (saved.proof===undefined||/^[A-Za-z0-9_-]{43}$/u.test(saved.proof))&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now()){
    return {token:saved.token,proof:saved.proof,account};
   }
  }catch{}
  forgetSession();return null;
 }
 function rememberSession({token,proof,account},expiresIn){
  const seconds=Number(expiresIn),lifetime=Number.isFinite(seconds)&&seconds>0?Math.min(seconds,7200):7200;
  const saved=JSON.stringify({apiBase,token,proof,accountId:account.id,expiresAt:Date.now()+lifetime*1000});
  try{sessionStorage.setItem(sessionKey,saved);}catch{}
 }
 return function ProtectedStudio(){
  const [session,setSession]=React.useState(()=>activate(readSession())),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [username,setUsername]=React.useState(''),[password,setPassword]=React.useState('');
  const request=React.useRef(null),passwordInput=React.useRef(null);
  function lock(message=''){
   request.current?.abort();request.current=null;
   forgetSession();
   setSession(activate(null));setPassword('');setBusy(false);setError(message);
  }
  function signOut(){
   if(session?.proof)void studioRequest(apiBase,session,'/api/auth/logout',{method:'POST',signal:AbortSignal.timeout(15_000)}).catch(()=>{});
   lock();
  }
  async function signIn(event){
   event.preventDefault();
   if(request.current)return;
   if(!config.apiBase){setError('تعذر الاتصال بالموقع. حاول مرة أخرى.');return;}
   const controller=new AbortController();request.current=controller;
   setBusy(true);setError('');
   try{
    const credentials={username:username.trim(),password};
    const relay=makeRelayLogin(credentials.username,credentials.password);
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
    rememberSession(signedIn,data.expiresIn);
    setSession(activate(signedIn));setPassword('');
   }catch(e){if(!controller.signal.aborted){setError(e.name==='TimeoutError'?'استغرق الاتصال وقتًا أطول. حاول مرة أخرى.':e.message||'تعذر الاتصال. حاول مرة أخرى.');setPassword('');passwordInput.current?.focus();}}
   finally{if(request.current===controller){request.current=null;setBusy(false);}}
  }
  React.useEffect(()=>{
   try{localStorage.removeItem('fo-studio-sms-device');}catch{}
   const expired=()=>lock('انتهت جلسة الدخول. أدخل بياناتك للمتابعة.');
   const logout=()=>lock();
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
    h('input',{id:'studio-password',name:'password',type:'password',dir:'ltr',autoComplete:'current-password',maxLength:160,required:true,value:password,ref:passwordInput,disabled:busy,onChange:e=>setPassword(e.target.value)}),
    error&&h('p',{id:'studio-login-error',role:'alert',className:'error-text'},error),
    h('button',{type:'submit',className:'primary',disabled:busy},busy?'جارٍ التحقق…':'تسجيل الدخول'))));
 };
}
