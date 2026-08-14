(()=>{
const API='https://tamweenat-api.onrender.com';
const existing=sessionStorage.getItem('tamweenatAdminToken');
if(existing){location.replace('../zad-restaurants/admin.html');return;}
let ready=false;
const form=document.getElementById('adminLoginForm');
const button=form.querySelector('button[type="submit"]');
const error=document.getElementById('adminLoginError');
const note=document.createElement('div');
note.style.cssText='margin-top:10px;font-size:13px;opacity:.72;min-height:20px';
note.textContent='جاري تجهيز النظام...';
form.appendChild(note);
fetch(`${API}/health`,{cache:'no-store'}).then(r=>{ready=r.ok;note.textContent=ready?'النظام جاهز للدخول.':'يتم تجهيز النظام عند الدخول.'}).catch(()=>{note.textContent='يتم تجهيز النظام عند الدخول.'});
form.addEventListener('submit',async e=>{
 e.preventDefault(); error.textContent=''; error.classList.remove('show');
 button.disabled=true; button.textContent=ready?'جاري الدخول...':'جاري تشغيل النظام والدخول...';
 try{
   const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),75000);
   const r=await fetch(`${API}/api/auth/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('adminUsername').value.trim(),password:document.getElementById('adminPassword').value}),signal:controller.signal,cache:'no-store'});
   clearTimeout(timer);
   const data=await r.json().catch(()=>({}));
   if(!r.ok) throw new Error(r.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':'تعذر تسجيل الدخول حالياً.');
   sessionStorage.setItem('tamweenatAdminToken',data.token);
   sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));
   location.replace('../zad-restaurants/admin.html');
 }catch(err){error.textContent=err.name==='AbortError'?'استغرق تشغيل النظام وقتاً أطول من المعتاد. أعد المحاولة الآن.':(err.message||'تعذر تسجيل الدخول');error.classList.add('show');}
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();