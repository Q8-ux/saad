(()=>{
const API='https://tamweenat-api.onrender.com';
const existing=sessionStorage.getItem('tamweenatAdminToken');
if(existing) location.replace('./admin.html');
const form=document.getElementById('adminLoginForm');
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const error=document.getElementById('adminLoginError');
 error.textContent='';
 const button=form.querySelector('button[type="submit"]');
 button.disabled=true;button.textContent='جاري التحقق...';
 try{
   const r=await fetch(`${API}/api/auth/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('adminUsername').value.trim(),password:document.getElementById('adminPassword').value})});
   const data=await r.json();
   if(!r.ok) throw new Error('بيانات الدخول غير صحيحة');
   sessionStorage.setItem('tamweenatAdminToken',data.token);
   sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));
   location.replace('./admin.html');
 }catch(err){error.textContent=err.message||'تعذر تسجيل الدخول';}
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();