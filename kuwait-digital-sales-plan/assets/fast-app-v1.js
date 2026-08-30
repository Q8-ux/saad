import offices from './law-offices-data-v1.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { query: '', priority: 'الكل', page: 1, perPage: 24 };

const roadmap = [
  ['01','جهّز العرض','اليوم 1–3','ثبّت عرضًا واحدًا واضحًا: تدقيق رقمي مدفوع يحدد فرص التحسين وخارطة التنفيذ.'],
  ['02','اختر المكاتب','اليوم 3–5','رتّب المكاتب بحسب الأولوية، سهولة الوصول، ووضوح الفرصة الرقمية.'],
  ['03','ابدأ التواصل','الأسبوع الأول','استخدم رسالة قصيرة مرتبطة بملاحظة حقيقية تخص المكتب، لا رسالة عامة.'],
  ['04','نفّذ التدقيق','الأسبوع الثاني','حوّل الملاحظة إلى تقرير واضح: المشكلة، أثرها، والحل المقترح.'],
  ['05','قدّم المشروع','بعد إثبات القيمة','اعرض موقعًا قانونيًا احترافيًا ونظامًا قانونيًا متطورًا يناسب احتياجات المكتب.']
];

const scripts = [
  ['رسالة واتساب أولى','السلام عليكم، راجعت الحضور الرقمي لمكتبكم ولاحظت فرصة واضحة لتحسين استقبال الاستشارات وعرض الخدمات. أعددت تصورًا مختصرًا خاصًا بالمكتب، ويسعدني مشاركته معكم.'],
  ['رسالة متابعة','أرسل لكم متابعة سريعة بشأن التصور الرقمي الخاص بالمكتب. الفكرة تركز على تسهيل الاستشارات واستقبال المستندات ورفع الثقة الرقمية دون تعقيد التشغيل.'],
  ['افتتاح الاجتماع','هدفي اليوم أن أعرض عليكم الملاحظات التي وجدتها، ثم نحدد معًا ما يستحق التنفيذ أولًا وفق أثره على المكتب والعملاء.']
];

function initStaticCards(){
  $('#roadmapGrid').innerHTML = roadmap.map((r,i)=>`<button class="action-card" data-info="roadmap" data-index="${i}"><span>${r[0]}</span><small>${r[2]}</small><h3>${r[1]}</h3><p>${r[3]}</p><b>افتح التفاصيل ←</b></button>`).join('');
  $('#scriptsGrid').innerHTML = scripts.map((r,i)=>`<button class="script-card" data-info="script" data-index="${i}"><small>نص جاهز</small><h3>${r[0]}</h3><p>${r[1]}</p><b>فتح ونسخ النص ←</b></button>`).join('');
  const saved = JSON.parse(localStorage.getItem('law-plan-tasks') || '{}');
  document.querySelectorAll('[data-task]').forEach(el=>{el.checked=!!saved[el.dataset.task]});
}

function filtered(){
  const q = state.query.trim().toLowerCase();
  return offices.filter(o => (state.priority === 'الكل' || o.priority === state.priority) && (!q || [o.name,o.area,o.address,o.phone].some(v=>String(v||'').toLowerCase().includes(q))));
}

function renderDirectory(){
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length/state.perPage));
  state.page = Math.min(state.page,pages);
  const start = (state.page-1)*state.perPage;
  const slice = list.slice(start,start+state.perPage);
  $('#resultCount').textContent = `${list.length} مكتب`;
  $('#officeGrid').innerHTML = slice.map(o=>`<article class="office-card" tabindex="0" role="button" data-office="${esc(o.id)}" aria-label="فتح تفاصيل ${esc(o.name)}">
    <div class="office-score ${o.priority==='A'?'high':''}">${esc(o.score)}</div>
    <div><small>الأولوية ${esc(o.priority)} · ${esc(o.area||'غير محدد')}</small><h3>${esc(o.name)}</h3><p>${esc(o.opportunity||'افتح الملف للاطلاع على تفاصيل الفرصة الرقمية.')}</p></div>
    <b>التفاصيل ومشروع المكتب ←</b>
  </article>`).join('') || '<div class="empty">لا توجد نتائج مطابقة.</div>';
  $('#pager').innerHTML = `<button data-page="prev" ${state.page===1?'disabled':''}>السابق</button><span>${state.page} من ${pages}</span><button data-page="next" ${state.page===pages?'disabled':''}>التالي</button>`;
}

function openModal(title, body){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  const modal=$('#detailModal'); modal.hidden=false; document.body.dataset.scrollLocked='true';
  requestAnimationFrame(()=>$('#modalClose').focus());
}
function closeModal(){ $('#detailModal').hidden=true; delete document.body.dataset.scrollLocked; }

function officeDetails(o){
  const signals=(o.professionalSignals||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const approach=(o.approach||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const sources=(o.sources||[]).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label||'المصدر')}</a>`).join(' · ');
  openModal(o.name, `<div class="detail-meta"><span>الأولوية ${esc(o.priority)}</span><span>التقييم ${esc(o.score)}</span><span>${esc(o.area||'غير محدد')}</span></div>
  <section><h3>بيانات المكتب</h3><p>${esc(o.address||'العنوان يحتاج تحقق')}</p>${o.phone?`<a class="contact" href="tel:${esc(o.phone)}">اتصال: ${esc(o.phone)}</a>`:''}${o.website?`<a class="contact" href="${esc(o.website)}" target="_blank" rel="noopener">فتح الموقع</a>`:''}</section>
  <section><h3>الفرصة الرقمية</h3><p>${esc(o.opportunity)}</p><ul>${signals}</ul></section>
  <section class="legal-system"><small>مشروع مقترح لكل مكتب</small><h3>النظام القانوني المتطور</h3><p>موقع قانوني احترافي، استقبال الاستشارات والمستندات، تنظيم العملاء والقضايا، قاعدة معرفة قانونية، ومساعد ذكي يخدم فريق المكتب.</p></section>
  <section><h3>خطة التواصل</h3><ol>${approach}</ol></section>${sources?`<section><h3>المصادر</h3><p>${sources}</p></section>`:''}`);
}

function assistantReply(q){
  const text=q.trim(); if(!text)return;
  const box=$('#assistantMessages'); box.insertAdjacentHTML('beforeend',`<p class="user-msg">${esc(text)}</p>`);
  let reply='أقدر أساعدك في اختيار المكاتب، ترتيب الأولويات، كتابة رسالة التواصل، أو تجهيز مشروع النظام القانوني المتطور.';
  if(/أولوية|أفضل|ابدأ/.test(text)) reply='ابدأ بالمكاتب ذات الأولوية A، ثم راجع وجود رقم اتصال واضح وفرصة رقمية مثبتة قبل التواصل.';
  else if(/رسالة|واتساب|تواصل/.test(text)) reply=scripts[0][1];
  else if(/نظام|مشروع/.test(text)) reply='المشروع الأنسب: موقع قانوني سريع مع استقبال استشارات ومستندات، إدارة عملاء وقضايا، قاعدة معرفة، ومساعد قانوني خاص بالمكتب.';
  box.insertAdjacentHTML('beforeend',`<p class="bot-msg">${esc(reply)}</p>`); box.scrollTop=box.scrollHeight;
  if($('#voiceToggle').checked && 'speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(reply));}
}

document.addEventListener('click',e=>{
  const office=e.target.closest('[data-office]'); if(office){const o=offices.find(x=>x.id===office.dataset.office);if(o)officeDetails(o);return;}
  const info=e.target.closest('[data-info]'); if(info){const i=+info.dataset.index;if(info.dataset.info==='roadmap'){const r=roadmap[i];openModal(r[1],`<div class="large-copy"><small>${r[2]}</small><p>${r[3]}</p><h3>النتيجة المطلوبة</h3><p>إجراء واضح قابل للتنفيذ والقياس قبل الانتقال إلى المرحلة التالية.</p></div>`);}else{const r=scripts[i];openModal(r[0],`<div class="large-copy"><p id="copyText">${esc(r[1])}</p><button class="primary" id="copyBtn">نسخ النص</button></div>`);}return;}
  if(e.target.closest('#copyBtn')){navigator.clipboard?.writeText($('#copyText').textContent);e.target.textContent='تم النسخ';}
  if(e.target.closest('#modalClose')||e.target.classList.contains('modal-backdrop'))closeModal();
  const pg=e.target.closest('[data-page]');if(pg){state.page+=pg.dataset.page==='next'?1:-1;renderDirectory();$('#directory').scrollIntoView({behavior:'smooth'});}
  if(e.target.closest('#assistantTrigger')){$('#assistantPanel').hidden=false;$('#assistantInput').focus();}
  if(e.target.closest('#assistantClose'))$('#assistantPanel').hidden=true;
  if(e.target.closest('#assistantSend')){assistantReply($('#assistantInput').value);$('#assistantInput').value='';}
  if(e.target.closest('#micBtn'))startMic();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();$('#assistantPanel').hidden=true;}
  if(e.key==='Enter'&&e.target.matches('[data-office]'))e.target.click();
  if(e.key==='Enter'&&e.target.id==='assistantInput'){e.preventDefault();$('#assistantSend').click();}
});
document.addEventListener('change',e=>{
  if(e.target.matches('[data-task]')){const saved=JSON.parse(localStorage.getItem('law-plan-tasks')||'{}');saved[e.target.dataset.task]=e.target.checked;localStorage.setItem('law-plan-tasks',JSON.stringify(saved));}
});
$('#searchInput').addEventListener('input',e=>{state.query=e.target.value;state.page=1;renderDirectory();});
$('#priorityFilter').addEventListener('change',e=>{state.priority=e.target.value;state.page=1;renderDirectory();});
function startMic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('التسجيل الصوتي غير مدعوم في هذا المتصفح.');return;}const r=new SR();r.lang='ar-KW';r.interimResults=false;r.onresult=e=>{$('#assistantInput').value=e.results[0][0].transcript;assistantReply($('#assistantInput').value);$('#assistantInput').value='';};r.start();}

initStaticCards(); renderDirectory();
document.documentElement.classList.add('app-ready');
