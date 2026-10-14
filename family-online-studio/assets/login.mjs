const DEVICE_KEY='fo-studio-sms-device';
export const normalizeDigits=value=>String(value??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));

export function createStudioLogin({React,Studio,config,initialAccess=''}){
 const h=React.createElement;
 return function StudioLogin(){
  const [token,setToken]=React.useState(''),[password,setPassword]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const lock=React.useRef(false);
  React.useEffect(()=>{
   try{localStorage.removeItem(DEVICE_KEY);}catch{}
   const expired=()=>{window.__STUDIO_SESSION__='';setToken('');setPassword('');setError('انتهت الجلسة. أدخل كلمة المرور مجدداً.');};
   window.addEventListener('studio-session-expired',expired);
   return()=>window.removeEventListener('studio-session-expired',expired);
  },[]);
  async function login(){
   if(lock.current)return;
   if(!config.apiBase){setError('تعذر الاتصال بالموقع. حاول مرة أخرى.');return;}
   lock.current=true;setBusy(true);setError('');
   try{
    const response=await fetch(new URL('/api/auth',config.apiBase),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:normalizeDigits(password.trim())}),credentials:'omit',signal:AbortSignal.timeout(70_000)});
    const data=await response.json();
    if(!response.ok||typeof data.token!=='string'||!data.token)throw new Error(data.error||'تعذر الدخول. حاول مرة أخرى.');
    window.__STUDIO_SESSION__=data.token;setToken(data.token);setPassword('');
   }catch(e){setError(e.message||'تعذر الاتصال. حاول مرة أخرى.');}
   finally{lock.current=false;setBusy(false);}
  }
  function signOut(){window.__STUDIO_SESSION__='';setToken('');setPassword('');setError('');}
  if(token)return h(Studio,{userKey:'external-private-owner',onSignOut:signOut});
  return h('main',{className:'external-login',dir:'rtl'},h('section',null,
   h('span',{'aria-hidden':true,className:'login-lock'},'🔒'),h('p',{className:'eyebrow'},'مساحتك، حكايتك.'),h('h1',null,'استوديو الكتابة'),
   h('p',null,'أدخل كلمة المرور لفتح مساحة الكتابة.'),
   h('form',{onSubmit:e=>{e.preventDefault();login();}},
    h('label',{htmlFor:'studio-password'},'كلمة المرور'),
    h('input',{id:'studio-password',name:'password',type:'password',inputMode:'numeric',autoComplete:'current-password',dir:'ltr',value:password,onChange:e=>setPassword(normalizeDigits(e.target.value)),disabled:busy,required:true,minLength:4,maxLength:160}),
    h('button',{type:'submit',className:'primary',disabled:busy||!config.apiBase||password.trim().length<4},busy?'جارٍ الدخول…':'دخول')),
   error&&h('p',{role:'alert',className:'error-text'},error)));
 };
}
