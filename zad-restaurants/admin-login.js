(()=>{
const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
const existing=sessionStorage.getItem('tamweenatAdminToken');
if(existing) location.replace('./admin.html');
let warmState='starting';
const warmPromise=fetch(`${API}/health`,{cache:'no-store'}).then(r=>{warmState=r.ok?'ready':'starting';return r.ok;}).catch(()=>{warmState='starting';return false;});
const form=document.getElementById('adminLoginForm');
const button=form.querySelector('button[type="submit"]');
const error=document.getElementById('adminLoginError');
const wakeNote=document.createElement('div');
wakeNote.style.cssText='margin-top:10px;font-size:13px;opacity:.72;min-height:20px';
wakeNote.textContent='جاري التحقق من النظام...';
form.appendChild(wakeNote);
warmPromise.then(ok=>{wakeNote.textContent=ok?'النظام جاهز للدخول.':'تعذر التحقق من الخدمة.';});
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';error.classList.remove('show');button.disabled=true;button.textContent='جاري الدخول...';
 try{
   const username=document.getElementById('adminUsername').value.trim();
   const password=document.getElementById('adminPassword').value;
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
   const r=await fetch(`${API}/api/auth/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password}),signal:controller.signal,cache:'no-store'});
   clearTimeout(timeout);
   const data=await r.json().catch(()=>({}));
   if(!r.ok){if(r.status===401)throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');throw new Error(`تعذر تسجيل الدخول — خطأ ${r.status}`);}
   if(!data.token)throw new Error('الخدمة لم تُرجع جلسة دخول صالحة.');
   sessionStorage.setItem('tamweenatAdminToken',data.token);sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));location.replace('./admin.html');
 }catch(err){error.textContent=err?.name==='AbortError'?'تعذر الاتصال بالخدمة. حاول مرة أخرى.':(err?.message||'تعذر تسجيل الدخول');error.classList.add('show');wakeNote.textContent='';}
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();