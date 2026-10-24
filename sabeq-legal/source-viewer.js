(async()=>{
 'use strict';
 const status=document.getElementById('status'),params=new URL(location.href).searchParams,page=Number(params.get('page')),edition=params.get('edition'),archive=edition==='2026-04-01',max=archive?1549:1710;
 if(edition&&!archive||!Number.isInteger(page)||page<1||page>max){status.textContent='هوية الإصدار أو رقم الصفحة غير صحيح.';return;}
 try{
  const r=await fetch('https://sabeq-legal-public.centrino.chatgpt.site/api/legal/corpus/'+(archive?'archive-page':'page')+'?format=json&page='+page,{credentials:'omit',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error();const p=await r.json();
  document.getElementById('title').textContent=p.title;
  status.textContent=(archive?'إصدار ١ أبريل ٢٠٢٦ — ':'مصدر التوليد الحالي — ')+'صفحة PDF '+page+'؛ المطبوعة '+(p.printed||'غير محددة')+' — النص الرقمي يحتاج مراجعة';
  document.getElementById('text').textContent=p.text;
  document.getElementById('fingerprint').textContent='بصمة المصدر: '+p.sourceSha256;
  for(const n of [p.previousPage,p.nextPage])if(Number.isInteger(n)&&n>=1&&n<=max){const a=document.createElement('a');a.href='?'+new URLSearchParams({page:String(n),...(archive?{edition}:{})});a.textContent='صفحة '+n;document.getElementById('nav').append(a);}
  if(p.reviewedImageText){document.getElementById('reviewed-image').hidden=false;document.getElementById('reviewed-image-text').textContent=p.reviewedImageText;document.getElementById('image-status').textContent='حقول مطابقة للصورة للقراءة من الملف؛ لا تثبت السريان ولا تستخدم تلقائياً في المذكرة.';}
  if(p.unresolvedFields?.length){document.getElementById('unresolved').hidden=false;document.getElementById('unresolved').textContent='بقيت '+p.unresolvedFields.length+' حقول غير محسومة في الصورة؛ استُبعدت من التفريغ أعلاه.';}
  if(p.ocr?.text&&!archive){document.getElementById('ocr').hidden=false;document.getElementById('ocr-text').textContent=p.ocr.text;}
 }catch{status.textContent='تعذر قراءة المصدر الآن. أعد تحميل الصفحة للمحاولة مجدداً؛ لم تُعرض نتيجة غير مؤكدة.';}
})();
