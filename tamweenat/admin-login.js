(()=>{
const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
const BACKEND_KEY='tamweenatBackend';
const BACKEND_VERSION='supabase-v3';
if(sessionStorage.getItem(BACKEND_KEY)!==BACKEND_VERSION){sessionStorage.removeItem('tamweenatAdminToken');sessionStorage.removeItem('tamweenatAdminUser');sessionStorage.setItem(BACKEND_KEY,BACKEND_VERSION);}
const existing=sessionStorage.getItem('tamweenatAdminToken');
if(existing){location.replace('./admin.html?v=20260814-0940');return;}
let ready=false;
const form=document.getElementById('adminLoginForm');
const button=form.querySelector('button[type="submit"]');
const error=document.getElementById('adminLoginError');
const note=document.createElement('div');
note.style.cssText='margin-top:10px;font-size:13px;opacity:.72;min-height:20px';
note.textContent='جاري التحقق من النظام...';
form.appendChild(note);
fetch(`${API}/health`,{cache:'no-store'}).then(r=>{ready=r.ok;note.textContent=ready?'النظام جاهز للدخول.':'تعذر التحقق من الخدمة.'}).catch(()=>{note.textContent='تعذر التحقق من الخدمة.'});
form.addEventListener('submit',async e=>{
 e.preventDefault(); error.textContent=''; error.classList.remove('show');
 button.disabled=true; button.textContent='جاري الدخول...';
 try{
   const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),20000);
   const r=await fetch(`${API}/api/auth/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('adminUsername').value.trim(),password:document.getElementById('adminPassword').value}),signal:controller.signal,cache:'no-store'});
   clearTimeout(timer);
   const data=await r.json().catch(()=>({}));
   if(!r.ok) throw new Error(r.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':'تعذر تسجيل الدخول حالياً.');
   sessionStorage.setItem(BACKEND_KEY,BACKEND_VERSION);sessionStorage.setItem('tamweenatAdminToken',data.token);sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));
   location.replace('./admin.html?v=20260814-0940');
 }catch(err){error.textContent=err.name==='AbortError'?'تعذر الاتصال بالخدمة. حاول مرة أخرى.':(err.message||'تعذر تسجيل الدخول');error.classList.add('show');}
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();