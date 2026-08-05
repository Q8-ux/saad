const menuButton=document.querySelector('.menu-btn');const nav=document.querySelector('.main-nav');menuButton?.addEventListener('click',()=>{nav?.classList.toggle('open')});document.querySelectorAll('a[href^="#"]').forEach(link=>{link.addEventListener('click',()=>nav?.classList.remove('open'))});const memoForm=document.getElementById('memoForm');const memoResult=document.getElementById('memoResult');const memoText=document.getElementById('memoText');memoForm?.addEventListener('submit',event=>{event.preventDefault();const memoType=document.getElementById('memoType').value;const caseType=document.getElementById('caseType').value;const court=document.getElementById('court').value||'الجهة المختصة';const role=document.getElementById('role').value||'مقدم المذكرة';const parties=document.getElementById('parties').value||'الأطراف وفق بيانات القضية';const facts=document.getElementById('facts').value.trim();const claims=document.getElementById('claims').value.trim();const defenses=document.getElementById('defenses').value.trim()||'تُستكمل الدفوع والأسانيد القانونية بعد المراجعة المهنية.';const draft=`بسم الله الرحمن الرحيم

أمام ${court}

${memoType}
في القضية: ${caseType}

مقدمة من: ${role}
ضد: ${parties}

أولاً: الوقائع
${facts}

ثانياً: الدفوع والأسانيد
${defenses}

ثالثاً: الطلبات
${claims}

ولذلك
يلتمس مقدم هذه المذكرة من الجهة الموقرة النظر في الطلبات الواردة أعلاه، مع حفظ سائر الحقوق الأخرى.

وتفضلوا بقبول فائق الاحترام.

تنبيه: هذه مسودة أولية تم إنشاؤها من البيانات المدخلة، ولا تُعد مذكرة قانونية نهائية قبل مراجعتها واعتمادها من محامٍ مختص.`;memoText.textContent=draft;memoResult.classList.remove('hidden');memoResult.scrollIntoView({behavior:'smooth',block:'start'});localStorage.setItem('hessaMemoDraft',draft)});document.getElementById('copyMemo')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(memoText.textContent||'');alert('تم نسخ المسودة')}catch{alert('تعذر النسخ تلقائيًا')}});document.getElementById('printMemo')?.addEventListener('click',()=>{const content=memoText.textContent||'';const win=window.open('','_blank');if(!win)return;win.document.write(`<html dir="rtl"><head><title>المسودة القانونية</title><style>body{font-family:Arial;padding:40px;line-height:2;white-space:pre-wrap}</style></head><body>${content.replaceAll('\n','<br>')}</body></html>`);win.document.close();win.print()});document.getElementById('consultationForm')?.addEventListener('submit',event=>{event.preventDefault();alert('تم استلام طلبك في النسخة التجريبية. يلزم ربط النموذج بقاعدة بيانات أو بريد إلكتروني قبل النشر الرسمي.');event.currentTarget.reset()});const saved=localStorage.getItem('hessaMemoDraft');if(saved&&memoText&&memoResult){memoText.textContent=saved}