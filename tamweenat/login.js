(()=>{
const API='https://tamweenat-api.onrender.com';
const SESSION_KEY='tamweenatRestaurantSession';
const TOKEN_KEY='tamweenatRestaurantToken';
const form=document.getElementById('loginForm'),user=document.getElementById('username'),pass=document.getElementById('password'),error=document.getElementById('loginError'),toggle=document.getElementById('togglePassword');
if(sessionStorage.getItem(TOKEN_KEY)){location.replace('../zad-restaurants/account.html');return;}
let ready=false;
const note=document.createElement('div');note.style.cssText='margin-top:10px;font-size:13px;opacity:.72;min-height:20px';note.textContent='جاري تجهيز النظام...';form.appendChild(note);
fetch(`${API}/health`,{cache:'no-store'}).then(r=>{ready=r.ok;note.textContent=ready?'النظام جاهز للدخول.':'يتم تجهيز النظام عند الدخول.'}).catch(()=>{note.textContent='يتم تجهيز النظام عند الدخول.'});
toggle.addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';toggle.textContent=show?'إخفاء':'إظهار'});
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';error.classList.remove('show');
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent=ready?'جاري الدخول...':'جاري تشغيل النظام والدخول...';
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),75000);
  const r=await fetch(`${API}/api/auth/restaurant`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.value.trim(),password:pass.value}),signal:controller.signal,cache:'no-store'});clearTimeout(timer);
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':'تعذر تسجيل الدخول حالياً.');
  sessionStorage.setItem(TOKEN_KEY,data.token);sessionStorage.setItem(SESSION_KEY,JSON.stringify({...data.user,loginAt:new Date().toISOString()}));
  location.replace('../zad-restaurants/account.html');
 }catch(err){error.textContent=err.name==='AbortError'?'استغرق تشغيل النظام وقتاً أطول من المعتاد. أعد المحاولة الآن.':(err.message||'تعذر تسجيل الدخول.');error.classList.add('show');}
 finally{btn.disabled=false;btn.textContent='دخول إلى حساب المطعم';}
});
})();