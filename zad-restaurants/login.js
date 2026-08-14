(()=>{
const API='https://tamweenat-api.onrender.com';
const SESSION_KEY='tamweenatRestaurantSession';
const TOKEN_KEY='tamweenatRestaurantToken';
const form=document.getElementById('loginForm'),user=document.getElementById('username'),pass=document.getElementById('password'),error=document.getElementById('loginError'),toggle=document.getElementById('togglePassword');
if(sessionStorage.getItem(TOKEN_KEY)){location.replace('./account.html');return;}
let ready=false;
const warmController=new AbortController();
const warmTimer=setTimeout(()=>warmController.abort(),15000);
fetch(`${API}/health`,{cache:'no-store',signal:warmController.signal}).then(r=>{ready=r.ok}).catch(()=>{}).finally(()=>clearTimeout(warmTimer));
toggle.addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';toggle.textContent=show?'إخفاء':'إظهار'});
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';error.classList.remove('show');
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent=ready?'جاري تسجيل الدخول...':'جاري تجهيز الحساب والدخول...';
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),75000);
  const r=await fetch(`${API}/api/auth/restaurant`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.value.trim(),password:pass.value}),signal:controller.signal,cache:'no-store'});
  clearTimeout(timer);
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===401?'اسم المستخدم أو كلمة المرور غير صحيحة.':'تعذر فتح الحساب حالياً.');
  sessionStorage.setItem(TOKEN_KEY,data.token);sessionStorage.setItem(SESSION_KEY,JSON.stringify({...data.user,loginAt:new Date().toISOString()}));
  location.replace('./account.html');
 }catch(err){error.textContent=err?.name==='AbortError'?'استغرق تشغيل النظام وقتاً أطول من المعتاد. حاول مرة أخرى الآن.':(err.message||'تعذر تسجيل الدخول.');error.classList.add('show');}
 finally{btn.disabled=false;btn.textContent='دخول إلى حساب المطعم';}
});
})();