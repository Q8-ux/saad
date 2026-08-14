(()=>{
const API='https://tamweenat-api.onrender.com';
const existing=sessionStorage.getItem('tamweenatAdminToken');
if(existing) location.replace('./admin.html');

// Start waking the backend immediately when the login page opens.
// On Render Free this overlaps the cold-start time with the user's typing time.
let warmState='starting';
const warmPromise=fetch(`${API}/health`,{cache:'no-store'})
  .then(r=>{warmState=r.ok?'ready':'starting';return r.ok;})
  .catch(()=>{warmState='starting';return false;});

const form=document.getElementById('adminLoginForm');
const button=form.querySelector('button[type="submit"]');
const error=document.getElementById('adminLoginError');

const wakeNote=document.createElement('div');
wakeNote.style.cssText='margin-top:10px;font-size:13px;opacity:.72;min-height:20px';
wakeNote.textContent='جاري تجهيز لوحة الإدارة...';
form.appendChild(wakeNote);

warmPromise.then(ok=>{wakeNote.textContent=ok?'النظام جاهز للدخول.':'سيتم تجهيز النظام عند تسجيل الدخول.';});

form.addEventListener('submit',async e=>{
 e.preventDefault();
 error.textContent='';
 error.classList.remove('show');
 button.disabled=true;
 button.textContent=warmState==='ready'?'جاري الدخول...':'جاري تشغيل النظام والدخول...';
 wakeNote.textContent=warmState==='ready'?'يتم فتح لوحة الإدارة الآن...':'قد تستغرق أول عملية دخول بعد فترة عدم استخدام وقتاً إضافياً.';
 try{
   const username=document.getElementById('adminUsername').value.trim();
   const password=document.getElementById('adminPassword').value;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),75000);
   const r=await fetch(`${API}/api/auth/admin`,{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({username,password}),
     signal:controller.signal,
     cache:'no-store'
   });
   clearTimeout(timeout);
   const data=await r.json().catch(()=>({}));
   if(!r.ok){
     if(r.status===401) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
     if(r.status===503) throw new Error('خدمة تموينات قيد التجهيز. حاول مرة أخرى.');
     throw new Error(`تعذر تسجيل الدخول — خطأ ${r.status}`);
   }
   if(!data.token) throw new Error('الخادم لم يُرجع جلسة دخول صالحة.');
   sessionStorage.setItem('tamweenatAdminToken',data.token);
   sessionStorage.setItem('tamweenatAdminUser',JSON.stringify(data.user||{}));
   location.replace('./admin.html');
 }catch(err){
   const msg=err?.name==='AbortError'
     ?'استغرق تشغيل الخادم وقتاً أطول من المعتاد. أعد المحاولة الآن وسيكون أسرع.'
     :err?.message==='Failed to fetch'
       ?'تعذر الاتصال بخادم تموينات. حدّث الصفحة وحاول مرة أخرى.'
       :(err.message||'تعذر تسجيل الدخول');
   error.textContent=msg;
   error.classList.add('show');
   wakeNote.textContent='';
 }
 finally{button.disabled=false;button.textContent='دخول لوحة الإدارة';}
});
})();