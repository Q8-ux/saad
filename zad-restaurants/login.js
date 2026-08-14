(()=>{
const API='https://tamweenat-api.onrender.com';
const SESSION_KEY='tamweenatRestaurantSession';
const TOKEN_KEY='tamweenatRestaurantToken';
const form=document.getElementById('loginForm'),user=document.getElementById('username'),pass=document.getElementById('password'),error=document.getElementById('loginError'),toggle=document.getElementById('togglePassword');
if(sessionStorage.getItem(TOKEN_KEY)){location.replace('./account.html');return;}
toggle.addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';toggle.textContent=show?'إخفاء':'إظهار'});
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';error.classList.remove('show');
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='جاري تسجيل الدخول...';
 try{
  const r=await fetch(`${API}/api/auth/restaurant`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.value.trim(),password:pass.value})});
  const data=await r.json();if(!r.ok)throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
  sessionStorage.setItem(TOKEN_KEY,data.token);sessionStorage.setItem(SESSION_KEY,JSON.stringify({...data.user,loginAt:new Date().toISOString()}));
  location.replace('./account.html');
 }catch(err){error.textContent=err.message||'تعذر تسجيل الدخول.';error.classList.add('show');}
 finally{btn.disabled=false;btn.textContent='دخول إلى حساب المطعم';}
});
})();