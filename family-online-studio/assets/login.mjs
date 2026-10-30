export function createStudioLogin({React,Studio,config}){
 const h=React.createElement;
 return function ProtectedStudio(){
  const [token,setToken]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [username,setUsername]=React.useState(''),[password,setPassword]=React.useState('');
  const request=React.useRef(null),passwordInput=React.useRef(null);
  function lock(message=''){
   request.current?.abort();request.current=null;
   window.__STUDIO_SESSION__='';setToken('');setPassword('');setBusy(false);setError(message);
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
    window.__STUDIO_SESSION__=data.token;setToken(data.token);setPassword('');
   }catch(e){if(!controller.signal.aborted){setError(e.name==='TimeoutError'?'استغرق الاتصال وقتًا أطول. حاول مرة أخرى.':e.message||'تعذر الاتصال. حاول مرة أخرى.');setPassword('');passwordInput.current?.focus();}}
   finally{if(request.current===controller){request.current=null;setBusy(false);}}
  }
  React.useEffect(()=>{
   window.__STUDIO_SESSION__='';
   try{localStorage.removeItem('fo-studio-sms-device');}catch{}
   const expired=()=>lock('انتهت جلسة الدخول. أدخل بياناتك للمتابعة.');
   const logout=()=>lock();
   window.addEventListener('studio-session-expired',expired);
   window.addEventListener('studio-sign-out',logout);
   return()=>{window.removeEventListener('studio-session-expired',expired);window.removeEventListener('studio-sign-out',logout);request.current?.abort();request.current=null;window.__STUDIO_SESSION__='';};
  },[]);
  return token?h(Studio,{userKey:'external-private-owner',onSignOut:()=>lock()}):h('main',{className:'external-login',dir:'rtl'},h('section',{'aria-labelledby':'studio-login-title'},
   h('img',{src:new URL('./studio/pen-mark.webp',import.meta.url).href,width:80,height:80,alt:'',className:'studio-loading-mark'}),
   h('p',{className:'eyebrow'},'مساحتك، حكايتك.'),h('h1',{id:'studio-login-title'},'استوديو الكتابة'),
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
