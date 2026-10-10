/* A Kuwait-focused teacher workflow inspired by the navigation ideas in Masar Seen
   and the need-based catalogue structure of Suliman Store. No paid content is copied. */
(function(){
 const route='teacherPath',storageKey='manhaj-teacher-path-v1';
 const stages={
  'ابتدائية':['الأول','الثاني','الثالث','الرابع','الخامس'],
  'متوسطة':['السادس','السابع','الثامن','التاسع'],
  'ثانوية':['العاشر','الحادي عشر','الثاني عشر']
 };
 const subjects=['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','التربية الإسلامية','القرآن الكريم','الاجتماعيات','الحاسوب','تقنية المعلومات','التربية الفنية','التربية البدنية','اللغة الفرنسية','الفيزياء','الكيمياء','الأحياء','الجيولوجيا','التاريخ','الجغرافيا','الدستور وحقوق الإنسان','الاقتصاد المنزلي','علم النفس وعلم الاجتماع','أنشطة مدرسية'];
 const services=[
  {id:'lesson',title:'تحضير درس',icon:'lessons',description:'نواتج تعلم، تمهيد، خطوات، وتقويم.',mode:'assistant'},
  {id:'plan',title:'إعداد خطة',icon:'workplans',description:'خطة أسبوعية أو فصلية أو علاجية قابلة للمتابعة.',mode:'assistant'},
  {id:'project',title:'مشروع تعليمي',icon:'projects',description:'هدف ومخرجات ومهام ومتابعة للتنفيذ.',mode:'assistant'},
  {id:'meeting',title:'اجتماع ومحضر',icon:'meetings',description:'جدول أعمال، مشاركون، قرارات، ومهام متابعة.',mode:'assistant'},
  {id:'activity',title:'نشاط صفي أو لاصفي',icon:'events',description:'نشاط منظم مرتبط بالمادة والصف والنتيجة.',mode:'assistant'},
  {id:'assessment',title:'تقويم وورقة عمل',icon:'plans',description:'أسئلة ومهمات وبطاقة خروج مرتبطة بالدرس.',mode:'assistant'},
  {id:'occasion',title:'يوم أو مناسبة مدرسية',icon:'schedule',description:'برنامج تنفيذ ومهام وشواهد للمناسبة.',mode:'assistant'},
  {id:'evidence',title:'الأداء والشواهد',icon:'evidence',description:'اربط الصور وملفات PDF بأعمالك المنجزة.',route:'evidence'},
  {id:'forms',title:'الشهادات والنماذج',icon:'studio',description:'صمّم شهادة أو بطاقة أو ورقة عمل بالعربية.',route:'studio'},
  {id:'analysis',title:'تحليل المنهج',icon:'library',description:'ارفع ملفك، وابحث فيه، وحوّله إلى عمل تعليمي.',route:'analysis'},
  {id:'reports',title:'تقرير الإنجاز',icon:'reports',description:'اجمع سجلاتك وشواهدك في تقرير قابل للطباعة.',route:'reports'},
  {id:'teams',title:'التصدير إلى Teams',icon:'resources',description:'جهّز المحتوى للمشاركة مع طلابك بتحكمك.',action:'teams'}
 ];
 function academicYear(){const now=new Date(),parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kuwait',year:'numeric',month:'numeric'}).formatToParts(now),year=Number(parts.find(p=>p.type==='year').value),month=Number(parts.find(p=>p.type==='month').value),start=month>=8?year:year-1;return start+'/'+(start+1)}
 const defaults={stages:[],grade:'',subject:'',term:'',year:academicYear(),service:'lesson'};
 function readPreferences(){try{const value=JSON.parse(localStorage.getItem(storageKey));if(!value||!Array.isArray(value.stages))return {...defaults};return {...defaults,...value,stages:value.stages.filter(v=>stages[v]),grade:String(value.grade||''),subject:String(value.subject||''),term:String(value.term||''),year:String(value.year||academicYear()),service:services.some(s=>s.id===value.service)?value.service:'lesson'}}catch{return {...defaults}}}
 function savePreferences(value){const clean={stages:[...new Set(value.stages)].filter(v=>stages[v]),grade:String(value.grade||'').slice(0,80),subject:String(value.subject||'').slice(0,120),term:String(value.term||'').slice(0,40),year:String(value.year||academicYear()).slice(0,20),service:services.some(s=>s.id===value.service)?value.service:'lesson'};localStorage.setItem(storageKey,JSON.stringify(clean));return clean}
 pages[route]='مسار المعلم';
 const view=document.createElement('section');view.id=route+'View';view.className='view teacher-path-view';view.hidden=true;
 view.innerHTML=`<div class="teacher-path-shell">
  <section class="teacher-path-hero">
   <div><span class="teacher-path-kicker">مسار كويتي للمعلم</span><h2>من الاختيار إلى الإنجاز في مكان واحد</h2><p>حدّد مرحلتك ومادتك، ثم اختر ما تريد إنجازه. مساعد المعلم ينشئ العمل ويحفظه داخل المنصة.</p><div class="teacher-path-pills"><span>محتوى داخلي</span><span>حفظ تلقائي</span><span>تصدير وTeams</span></div></div>
   <div class="teacher-path-day"><small id="teacherPathWeekday"></small><strong id="teacherPathDay"></strong><span id="teacherPathMonth"></span><div><b id="teacherPathUpcoming">0</b><small>موعد قادم في سجلاتك</small></div></div>
  </section>
  <section class="teacher-path-card" aria-labelledby="teacherPathSetupTitle">
   <header><div><span class="teacher-path-step">01</span><h3 id="teacherPathSetupTitle">إعدادك السريع</h3><p>يُحفظ مرة واحدة، ويمكنك تعديله متى شئت. لا يوجد حقل إجباري.</p></div><span id="teacherPathProfile" class="teacher-path-profile"></span></header>
   <form id="teacherPathSetup">
    <fieldset><legend>المرحلة التعليمية</legend><div class="teacher-path-stages">${Object.keys(stages).map(stage=>`<label><input type="checkbox" name="teacherPathStage" value="${stage}"><span>${stage}</span></label>`).join('')}</div></fieldset>
    <div class="teacher-path-fields">
     <div class="field"><label for="teacherPathGrade">الصف</label><select id="teacherPathGrade"></select></div>
     <div class="field"><label for="teacherPathSubject">المادة</label><select id="teacherPathSubject"><option value="">كل المواد</option>${subjects.map(v=>`<option>${v}</option>`).join('')}</select></div>
     <div class="field"><label for="teacherPathTerm">الفصل الدراسي</label><select id="teacherPathTerm"><option value="">غير محدد</option><option>الأول</option><option>الثاني</option></select></div>
     <div class="field"><label for="teacherPathYear">العام الدراسي</label><select id="teacherPathYear">${[-1,0,1].map(n=>{const start=Number(academicYear().split('/')[0])+n;return `<option>${start}/${start+1}</option>`}).join('')}</select></div>
    </div>
    <div class="teacher-path-actions"><button class="btn" type="submit">حفظ اختياراتي</button><span id="teacherPathSaveStatus" role="status"></span></div>
   </form>
  </section>
  <section class="teacher-path-card" aria-labelledby="teacherPathServicesTitle">
   <header><div><span class="teacher-path-step">02</span><h3 id="teacherPathServicesTitle">ماذا تريد أن تنجز؟</h3><p>الخدمات مرتبة حسب عمل المعلم، وليس حسب أقسام إدارية.</p></div></header>
   <div id="teacherPathServices" class="teacher-path-services">${services.map(s=>`<button type="button" data-teacher-path-service="${s.id}"><span class="teacher-path-service-icon">${uiIcon(s.icon)}</span><span><strong>${s.title}</strong><small>${s.description}</small></span><span class="teacher-path-service-check">✓</span></button>`).join('')}</div>
  </section>
  <section class="teacher-path-card teacher-path-runner" aria-labelledby="teacherPathRunnerTitle">
   <header><div><span class="teacher-path-step">03</span><h3 id="teacherPathRunnerTitle">أضف السياق وابدأ</h3><p id="teacherPathSelection"></p></div></header>
   <div class="field"><label for="teacherPathRequest">الموضوع أو التعليمات</label><textarea id="teacherPathRequest" rows="4" maxlength="3000" placeholder="مثال: درس دورة الماء مع نشاط جماعي، أو خطة أسبوعية للمراجعة"></textarea></div>
   <div class="teacher-path-context" id="teacherPathContext"></div>
   <div class="teacher-path-actions"><button class="btn" type="button" id="teacherPathRun">إنجاز الطلب</button><button class="btn secondary" type="button" id="teacherPathOpenAssistant">+ صورة أو PDF</button><span id="teacherPathRunStatus" role="status"></span></div>
  </section>
  <p class="teacher-path-note">هذا المسار يستفيد من فكرة الوصول السريع والتصنيف بحسب الاحتياج، ولكنه مبني للمعلم الكويتي بمحتوى ووظائف أصلية داخل «منهج».</p>
 </div>`;
 document.querySelector('main').append(view);
 function renderCleanNavigation(){
  const groups=[
   ['البداية',['home','teacherPath','dashboard']],
   ['أعمالي',['projects','workplans','meetings','lessons','tasks','schedule']],
   ['المحتوى والإنجاز',['analysis','studio','evidence','reports']],
   ['الحساب',['settings']]
  ];
  const labels={home:'الرئيسية',dashboard:'ملخص أعمالي',analysis:'المناهج والتحليل'};
  $('nav').innerHTML=groups.map(([title,items])=>`<div class="nav-label">${title}</div>${items.map(key=>`<button class="nav-btn${key===route?' teacher-path-nav':''}" data-go="${key}">${uiIcon(key==='teacherPath'?'lessons':key)}<span>${labels[key]||pages[key]}</span></button>`).join('')}`).join('');
 }
 renderCleanNavigation();
 const dashboardTools=$('dashboardView')?.querySelector('.hero-card .tools');if(dashboardTools){const quick=document.createElement('button');quick.type='button';quick.className='btn secondary';quick.dataset.go=route;quick.textContent='مسار المعلم';dashboardTools.prepend(quick)}
 let preferences=readPreferences(),selected=services.find(s=>s.id===preferences.service)||services[0];
 function chosenStages(){return [...view.querySelectorAll('[name="teacherPathStage"]:checked')].map(field=>field.value)}
 function updateGrades(){const current=$('teacherPathGrade').value,chosen=chosenStages(),available=chosen.length?[...new Set(chosen.flatMap(stage=>stages[stage]))]:Object.values(stages).flat();$('teacherPathGrade').innerHTML='<option value="">جميع الصفوف</option>'+available.map(v=>'<option>'+v+'</option>').join('');if(available.includes(current))$('teacherPathGrade').value=current}
 function currentPreferences(){return {stages:chosenStages(),grade:$('teacherPathGrade').value,subject:$('teacherPathSubject').value,term:$('teacherPathTerm').value,year:$('teacherPathYear').value,service:selected.id}}
 function contextParts(value=currentPreferences()){return [value.stages.length?'المرحلة: '+value.stages.join(' و '):'',value.grade?'الصف: '+value.grade:'',value.subject?'المادة: '+value.subject:'',value.term?'الفصل: '+value.term:'',value.year?'العام: '+value.year:''].filter(Boolean)}
 function renderProfile(){const parts=contextParts(preferences);$('teacherPathProfile').textContent=parts.length?parts.slice(0,3).join(' • '):'لم تُحدد اختياراتك بعد';$('teacherPathContext').replaceChildren(...contextParts().map(text=>{const span=document.createElement('span');span.textContent=text;return span}))}
 function selectService(id){selected=services.find(s=>s.id===id)||services[0];view.querySelectorAll('[data-teacher-path-service]').forEach(button=>{const active=button.dataset.teacherPathService===selected.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});$('teacherPathSelection').textContent='الخدمة المختارة: '+selected.title+'. '+selected.description;$('teacherPathRun').textContent=selected.mode==='assistant'?'إنجاز الطلب مع مساعد المعلم':selected.action==='teams'?'تجهيز التصدير إلى Teams':'فتح '+selected.title+' داخل الموقع';renderProfile()}
 function hydrate(value){view.querySelectorAll('[name="teacherPathStage"]').forEach(field=>field.checked=value.stages.includes(field.value));updateGrades();$('teacherPathGrade').value=[...$('teacherPathGrade').options].some(o=>o.value===value.grade)?value.grade:'';$('teacherPathSubject').value=subjects.includes(value.subject)?value.subject:'';$('teacherPathTerm').value=['الأول','الثاني'].includes(value.term)?value.term:'';$('teacherPathYear').value=[...$('teacherPathYear').options].some(o=>o.value===value.year)?value.year:academicYear();selectService(value.service)}
 function assistantPrompt(){const value=currentPreferences(),topic=$('teacherPathRequest').value.trim()||selected.title,stage=value.stages.length?'للمرحلة '+value.stages.join(' و '):'',grade=value.grade?'للصف '+value.grade:'',subject=value.subject?'في مادة '+value.subject:'',term=value.term?'في الفصل '+value.term:'',context=[subject,grade,stage,term].filter(Boolean).join(' ');
  if(selected.id==='lesson')return `حضّر لي درسًا بعنوان ${topic}، ${context}، مع نواتج تعلم وخطوات وتقويم.`;
  if(selected.id==='plan')return `أعد لي خطة بعنوان ${topic}، ${context}، مع الأهداف وخطوات التنفيذ ومؤشرات النجاح.`;
  if(selected.id==='meeting')return `جهّز لي اجتماعًا بعنوان ${topic}، ${context}، مع جدول أعمال وقرارات ومتابعة.`;
  if(selected.id==='assessment')return `حضّر لي درسًا بعنوان ${topic}، ${context}، وركّز على تقويم تشخيصي وتكويني وختامي وورقة عمل.`;
  if(selected.id==='activity')return `أنشئ لي مشروعًا بعنوان ${topic}، ${context}، والهدف: تنفيذ نشاط تعليمي عملي مع مخرجات وشواهد.`;
  if(selected.id==='occasion')return `أنشئ لي مشروعًا بعنوان ${topic}، ${context}، والهدف: تنفيذ برنامج مناسبة مدرسية مع مهام وشواهد وتقرير ختامي.`;
  return `أنشئ لي مشروعًا بعنوان ${topic}، ${context}، والهدف: إنجاز العمل وتوثيقه.`
 }
 async function runSelected(){const status=$('teacherPathRunStatus');status.textContent='';preferences=savePreferences(currentPreferences());renderProfile();if(selected.mode==='assistant'){status.textContent='يحلّل مساعد المعلم الطلب الآن…';const ok=await window.ManhajTeacher.run(assistantPrompt());status.textContent=ok?'تم إنجاز العمل وحفظه في سجلاتك.':'لم يكتمل الطلب؛ أعد المحاولة.';return ok}if(selected.action==='teams'){window.ManhajTeamsExport?.open('lessons');status.textContent='تم فتح معالج تجهيز المحتوى لـ Teams.';return true}if(selected.route==='studio'&&$('teacherPathRequest').value.trim()){$('designTitle').value=$('teacherPathRequest').value.trim().slice(0,120);$('designText').value='إعداد '+contextParts().join(' • ')}show(selected.route);return true}
 view.querySelectorAll('[name="teacherPathStage"]').forEach(field=>field.addEventListener('change',()=>{updateGrades();renderProfile()}));for(const id of ['teacherPathGrade','teacherPathSubject','teacherPathTerm','teacherPathYear'])$(id).addEventListener('change',renderProfile);view.querySelectorAll('[data-teacher-path-service]').forEach(button=>button.onclick=()=>selectService(button.dataset.teacherPathService));$('teacherPathSetup').onsubmit=e=>{e.preventDefault();preferences=savePreferences(currentPreferences());renderProfile();$('teacherPathSaveStatus').textContent='تم حفظ اختياراتك على هذا الجهاز.'};$('teacherPathRun').onclick=runSelected;$('teacherPathOpenAssistant').onclick=()=>window.ManhajTeacher.open();
 const today=new Date(),dateParts=new Intl.DateTimeFormat('ar-KW',{timeZone:'Asia/Kuwait',weekday:'long',day:'numeric',month:'long'}).formatToParts(today);$('teacherPathWeekday').textContent=dateParts.find(p=>p.type==='weekday')?.value||'';$('teacherPathDay').textContent=dateParts.find(p=>p.type==='day')?.value||'';$('teacherPathMonth').textContent=dateParts.find(p=>p.type==='month')?.value||'';const todayKey=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuwait'});$('teacherPathUpcoming').textContent=hubSchedule().filter(item=>item.date.slice(0,10)>=todayKey).length;
 hydrate(preferences);window.ManhajLanguage?.enhance(view);window.ManhajTeacherPath={services,readPreferences,savePreferences,runSelected,route};show(initialViewKey===route?route:(location.hash.slice(1)||'home'));
})();
