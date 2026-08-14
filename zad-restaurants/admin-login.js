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
   const username=document.getElementById('adminUsername').value.trim();
   const password=document.getElementById('adminPassword').value;
   const r=await fetch(`${API}/api/auth/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok){
     if(r.status===401) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
     if(r.status===503) throw new Error('إعداد باسورد الأدمن لم يكتمل على الخادم.');
     throw new Error(`تعذر تسجيل الدخول — خطأ ${r.status}`);
   }
   if(!data.token) throw new Error('الخادم لم يُرجع جلسة دخول صالحة.');
   sessionStorage.setItem('tamweenatAdminToken',data.token);
   sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));
   location.replace('./admin.html');
 }catch(err){
   error.textContent=err?.message==='Failed to fetch'?'تعذر الاتصال بخادم تموينات. حدّث الصفحة وحاول مرة أخرى.':(err.message||'تعذر تسجيل الدخول');
   error.classList.add('show');
 }
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();