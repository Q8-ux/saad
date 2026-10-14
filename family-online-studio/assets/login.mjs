export function createStudioLogin({React,Studio,config}){
 const h=React.createElement;
 return function DirectStudio(){
  const [token,setToken]=React.useState(''),[busy,setBusy]=React.useState(true),[error,setError]=React.useState('');
  const request=React.useRef(null);
  async function openStudio(){
   if(request.current)return;
   if(!config.apiBase){setBusy(false);setError('تعذر الاتصال بالموقع. حاول مرة أخرى.');return;}
   const controller=new AbortController();request.current=controller;
   setBusy(true);setError('');
   try{
    // Public protocol marker for older gateways; it is not an access credential.
    const response=await fetch(new URL('/api/auth',config.apiBase),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'open'}),credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(70_000)])});
    const data=await response.json();
    if(!response.ok||typeof data.token!=='string'||!data.token)throw new Error(data.error||'تعذر فتح الاستوديو. حاول مرة أخرى.');
    if(controller.signal.aborted)return;
    window.__STUDIO_SESSION__=data.token;setToken(data.token);
   }catch(e){if(!controller.signal.aborted)setError(e.message||'تعذر الاتصال. حاول مرة أخرى.');}
   finally{if(request.current===controller){request.current=null;setBusy(false);}}
  }
  React.useEffect(()=>{
   try{localStorage.removeItem('fo-studio-sms-device');}catch{}
   const expired=()=>{window.__STUDIO_SESSION__='';openStudio();};
   window.addEventListener('studio-session-expired',expired);
   openStudio();
   return()=>{window.removeEventListener('studio-session-expired',expired);request.current?.abort();request.current=null;};
  },[]);
  const retry=()=>h('button',{type:'button',className:'primary',disabled:busy,onClick:openStudio},busy?'جارٍ الاتصال…':'إعادة المحاولة');
  return h(React.Fragment,null,
   token?h(Studio,{userKey:'external-private-owner'}):h('main',{className:'external-login',dir:'rtl'},h('section',null,
    h('p',{className:'eyebrow'},'مساحتك، حكايتك.'),h('h1',null,'استوديو الكتابة'),
    error?h('p',{role:'alert',className:'error-text'},error):h('p',{role:'status'},'جارٍ فتح مساحة الكتابة…'),
    error&&retry())),
   token&&error&&h('aside',{className:'external-session-error',dir:'rtl',role:'alert'},h('p',null,error),retry()));
 };
}
