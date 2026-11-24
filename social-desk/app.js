import {AGENTS,TOOLS,PLATFORMS,arabicNumber as num,esc,safeUrl,gatewayUrl,freshState,newCampaign,localDraft,normalizeOutput,strategyFor,fullCopy,metrics,approveEdit,kuwaitInput,scheduleKuwait,validateState,exportState,designSvg} from './core.mjs';

const KEY='social-desk.workspace.v1';
const $=s=>document.querySelector(s);
let state=freshState(),storageAvailable=true;
try{const saved=localStorage.getItem(KEY);if(saved)state=validateState(JSON.parse(saved));}catch{storageAvailable=false;}
let currentView='desk',running=false,paused=false,runId=0,currentAgent=-1,sessionToken='',toastTimer,calendarOffset=0,editorId=null,scheduleId=null;
const selected=()=>state.campaigns.find(c=>c.id===state.selectedId);
const dateLabel=iso=>new Intl.DateTimeFormat('ar-KW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuwait'}).format(new Date(iso));
const shortTime=iso=>new Intl.DateTimeFormat('ar-KW',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kuwait'}).format(new Date(iso));
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;toast('تعذر الحفظ في المتصفح. صدّر نسخة احتياطية للاحتفاظ بعملك.');}}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function log(title,message,agent=-1){state.events.push({at:new Date().toISOString(),title,message,agent});state.events=state.events.slice(-500);save();renderTerminal();}
function selectedId(id){if(running){toast('أوقف التجهيز مؤقتًا قبل الانتقال إلى حملة أخرى.');return false;}state.selectedId=id;save();render();return true;}
function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();}
function details(title,html){$('#detailTitle').textContent=title;$('#detailBody').innerHTML=html;openDialog('#detailDialog');}
function stateText(c){return c.status==='scheduled'?'في الجدول المحلي':c.status==='approved'?'معتمد':'مسودة للمراجعة';}
function badge(c){return `<span class="state-badge ${esc(c.status)}">${stateText(c)}</span>`;}
function agentStatus(i){
  const c=selected();if(!c)return 'بانتظار الفكرة';
  if(running&&currentAgent===i)return paused?'متوقف مؤقتًا':'يجهز المحتوى';
  if(i===4&&c.output&&!c.approvedAt)return 'بانتظار اعتمادك';
  if(i===4&&c.status==='scheduled')return 'موعد محلي محفوظ';
  if(i===4&&c.approvedAt)return 'جاهز لتحديد الموعد';
  if(i===5&&c.output)return 'ملخص محلي جاهز';
  if(i<=c.step&&i<4)return 'تم التجهيز';
  return 'بانتظار دوره';
}
function renderAgents(){
  const c=selected();
  $('#agents').innerHTML=AGENTS.map((a,i)=>`<button class="agent-card ${running&&currentAgent===i?'is-running':''} ${c&&i<=c.step?'is-done':''}" style="--accent:${a.color};--tint:${a.tint}" data-agent="${i}" aria-label="${a.name}، ${agentStatus(i)}"><span class="agent-head"><span class="agent-icon">${icon(a.icon)}</span><span><span class="agent-title">${a.name}</span><span class="agent-tools">${a.tools}</span></span></span><span class="agent-task">${a.task}</span><span class="agent-status">${agentStatus(i)}</span><span class="agent-progress"><span style="width:${c&&i<=c.step?100:0}%"></span></span></button>`).join('');
  $('#flowNodes').innerHTML=AGENTS.map((a,i)=>`<button class="flow-node ${running&&i===currentAgent?'active':''} ${c&&i<=c.step?'done':''}" style="left:${a.x}%;top:${a.y}%;--accent:${a.color};--tint:${a.tint}" data-agent="${i}" aria-label="عرض عمل ${a.name}"><span class="node-orb">${icon(a.icon)}<span class="node-number">${c&&i<=c.step?'✓':num(i+1)}</span></span><span class="node-title">${a.name}</span><span class="node-state">${agentStatus(i)}</span></button>`).join('');
  $('.workflow-panel').classList.toggle('running',running&&!paused);
}
function renderTools(){
  $('#toolsGrid').innerHTML=TOOLS.map(([name,purpose,repo,mono,agent])=>`<a class="tool-link" href="https://github.com/${repo}" target="_blank" rel="noopener noreferrer" style="--accent:${AGENTS[agent].color};--tint:${AGENTS[agent].tint}" title="${esc(purpose)} — يفتح GitHub"><span class="tool-monogram">${mono}</span><span><span class="tool-name">${name}</span><span class="tool-purpose">${purpose}</span></span><span class="tool-arrow">↗</span></a>`).join('');
}
function renderStats(){const m=metrics(state.campaigns);$('#statDrafts').textContent=String(m.drafts);$('#statApproved').textContent=String(m.approved);$('#statScheduled').textContent=String(m.scheduled);$('#contentCount').textContent=num(m.total);$('#connectionText').textContent=state.settings.mode==='gateway'?'خادم التوليد محدد':'Grok غير متصل';$('#modeTag').textContent=state.settings.mode==='gateway'?'خادم خارجي':'تجهيز محلي';}
function renderRun(){
  const c=selected(),btn=$('#runButton');
  $('#pauseButton').hidden=!running;$('#pauseButton').textContent=paused?'متابعة التجهيز':'إيقاف مؤقت';$('#runLight').classList.toggle('on',running&&!paused);
  if(running){btn.disabled=true;btn.innerHTML=icon('play')+' جارٍ التجهيز';$('#runTitle').textContent=paused?'التجهيز متوقف مؤقتًا':AGENTS[currentAgent]?.name+' يعمل الآن';$('#runDetail').textContent=paused?'يمكنك المتابعة من الخطوة الحالية':'تجهيز الحملة وفق المعلومات التي أضفتها';}
  else{btn.disabled=false;btn.innerHTML=icon(c?.output?'edit':'play')+(c?.output?' راجع المحتوى':' شغّل الفريق');$('#runTitle').textContent=!c?'الفريق بانتظار فكرتك':c.output?(c.approvedAt?'المحتوى معتمد وجاهز':'مسودتك جاهزة للمراجعة'):'فكرتك جاهزة للتجهيز';$('#runDetail').textContent=!c?'اكتب الموضوع ودعنا نرتب خطواته':c.status==='scheduled'?'موعد محلي: '+dateLabel(c.scheduledAt):c.output?'راجع النص والتصميم قبل حفظ الاعتماد':'اضغط لتجهيز الخطة والمحتوى والتصميم';}
  $('#canvasCaption').textContent=c?c.topic:'كل فكرة تستحق فريقًا';
  if(c)$('#ideaCloud').innerHTML=`<button data-action="brief">${esc(c.topic.length>45?c.topic.slice(0,45)+'…':c.topic)}<span>${esc(c.brand)} · ${esc(c.platform)}</span></button><button data-action="strategy">${esc(c.goal)}<span>هدف الحملة</span></button>`;
  else $('#ideaCloud').innerHTML='<button data-topic="كيف أعرّف الجمهور بمشروعي؟">كيف أعرّف الجمهور بمشروعي؟ <span>فكرة مقترحة</span></button><button data-topic="معلومة تستحق المشاركة">معلومة تستحق المشاركة <span>فكرة مقترحة</span></button>';
}
function renderPreview(){
  const c=selected();const out=c?.output;
  $('#previewBadge').textContent=c?stateText(c):'بانتظار فكرتك';
  $('#postPreview').innerHTML=`<div class="post-mock"><div class="post-account"><span class="account-avatar">${esc((c?.brand||'مساحتك').slice(0,1))}</span><span><strong>${esc(c?.brand||'اسم مشروعك')}</strong><small>${out?(c.origin==='gateway'?'مسودة من خادمك':'مسودة بقالب محلي'):'مساحة لفكرتك القادمة'}</small></span><span class="post-platform">${esc(c?.platform||'إنستغرام')}</span></div><div class="post-visual"><span class="visual-label">${esc(c?.goal||'ابدأ بفكرة تستحق المشاركة')}</span><h3>${esc(out?.hook||'حضور يشبهك.\nومحتوى يصنع الفرق.')}</h3><span class="visual-star" aria-hidden="true">✦</span></div><p class="post-text">${esc(out?[out.body,out.cta].filter(Boolean).join('\n\n'):'فكرتك تمر على فريقك، وتعود إليك بخطة ومسودة وتصميم. أنت تراجع وتقرر الخطوة القادمة.')}</p><p class="post-hashtags">${esc(out?.hashtags||'#فكرتك_القادمة #مكتب_السوشيال')}</p></div>`;
}
function renderTerminal(){
  const events=state.events.slice(-6).reverse();
  $('#terminal').innerHTML=events.length?events.map(e=>`<div class="terminal-row" style="--entry-color:${AGENTS[e.agent]?.color||'#80659d'}"><time datetime="${esc(e.at)}">${shortTime(e.at)}</time><div><strong>${esc(e.title)}</strong><p>${esc(e.message)}</p></div></div>`).join(''):'<div class="terminal-placeholder"><span aria-hidden="true">✧</span><h3>هنا تشوف فريقك يشتغل</h3><p>ابدأ بحملة، وستظهر خطوات تجهيزها ونتائجها في هذا السجل.</p></div>';
  $('#eventCount').textContent=num(state.events.length)+' أحداث في مساحتك';
}
function row(c){return `<div class="campaign-row"><div><strong>${esc(c.topic)}</strong><small>${esc(c.brand)} · ${dateLabel(c.createdAt)}</small></div><span class="row-platform">${esc(c.platform)}</span>${badge(c)}<button class="icon-button" data-open="${esc(c.id)}" aria-label="فتح حملة ${esc(c.topic)}">←</button></div>`;}
function renderRecent(){const campaigns=state.campaigns.slice().reverse().slice(0,4);$('#recentCampaigns').innerHTML=campaigns.length?campaigns.map(row).join(''):'<div class="recent-empty"><span>مساحة جديدة. أول حملة تبدأ من فكرتك.</span><button class="text-button" data-action="new">أضف فكرتك الأولى ←</button></div>';}
function empty(title,message){return `<div class="empty-state"><span class="empty-icon">✦</span><h3>${title}</h3><p>${message}</p><button class="button primary" data-action="new">ابدأ حملة جديدة</button></div>`;}
function renderContent(){
  const q=$('#contentSearch').value.trim().toLocaleLowerCase('ar');const filter=$('#contentFilter').value;
  const cs=state.campaigns.slice().reverse().filter(c=>(filter==='all'||c.status===filter)&&(!q||(c.topic+' '+c.brand+' '+(c.output?.body||'')).toLocaleLowerCase('ar').includes(q)));
  $('#contentGrid').innerHTML=cs.length?cs.map(c=>`<article class="content-card"><div class="card-body"><div class="card-meta"><span>${esc(c.brand)} · ${esc(c.platform)}</span>${badge(c)}</div><h3>${esc(c.output?.hook||c.topic)}</h3><p>${esc(c.output?.body||'تنتظر هذه الفكرة تجهيز المحتوى.')}</p><div class="card-actions"><button class="button secondary" data-edit="${esc(c.id)}">${icon('edit')} مراجعة</button><button class="button secondary" data-schedule="${esc(c.id)}">${icon('clock')} ${c.status==='scheduled'?'تعديل الموعد':'تحديد موعد'}</button><button class="button secondary" data-design="${esc(c.id)}">${icon('download')} تصميم</button><button class="text-button delete-button" data-delete="${esc(c.id)}">حذف</button></div></div></article>`).join(''):empty(q||filter!=='all'?'لا توجد نتائج مطابقة':'أول منشور يبدأ من هنا',q||filter!=='all'?'جرّب كلمة أخرى أو غيّر التصفية.':'أضف موضوعك وراجع المسودة ثم احتفظ بها في مكتبتك.');
}
function renderCalendar(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuwait',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const dateParts=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const month=new Date(Date.UTC(+dateParts.year,+dateParts.month-1+calendarOffset,1));const y=month.getUTCFullYear(),m=month.getUTCMonth();
  $('#calendarTitle').textContent=new Intl.DateTimeFormat('ar-KW',{month:'long',year:'numeric',timeZone:'UTC'}).format(month);
  let cells=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
  const offset=month.getUTCDay(),days=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  for(let i=0;i<offset;i++)cells+='<div class="calendar-day other-month" aria-hidden="true"></div>';
  for(let day=1;day<=days;day++){
    const local=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const scheduled=state.campaigns.filter(c=>c.scheduledAt&&kuwaitInput(new Date(c.scheduledAt)).startsWith(local));
    const today=+dateParts.year===y&&+dateParts.month===m+1&&+dateParts.day===day;
    cells+=`<div class="calendar-day ${today?'is-today':''}"><span>${num(day)}</span>${scheduled.map(c=>`<button class="day-post" data-open="${esc(c.id)}" title="${esc(c.topic)}">${esc(c.topic)}</button>`).join('')}</div>`;
  }
  $('#calendarGrid').innerHTML=cells;
  const scheduled=state.campaigns.filter(c=>c.scheduledAt).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
  $('#scheduleList').innerHTML=scheduled.length?'<div class="panel">'+scheduled.map(c=>`<div class="campaign-row"><div><strong>${esc(c.topic)}</strong><small>${dateLabel(c.scheduledAt)} · موعد محلي</small></div><span class="row-platform">${esc(c.platform)}</span>${badge(c)}<button class="icon-button" data-schedule="${esc(c.id)}" aria-label="تعديل الموعد">←</button></div>`).join('')+'</div>':'<div class="empty-state"><h3>كل شيء في وقته</h3><p>بعد اعتماد منشورك، حدد له موعدًا ليظهر هنا. التقويم لا يرسل منشورات تلقائيًا.</p><button class="button secondary" data-view="content">افتح مكتبة المحتوى</button></div>';
}
function renderReports(){
  const m=metrics(state.campaigns);$('#reportCards').innerHTML=[[m.total,'إجمالي الحملات'],[m.approved,'محتوى معتمد'],[m.scheduled,'موعد محلي محفوظ']].map(([v,label])=>`<div class="report-card"><strong>${num(v)}</strong><span>${label}</span></div>`).join('');
  $('#platformReport').innerHTML=PLATFORMS.map(platform=>{const n=state.campaigns.filter(c=>c.platform===platform).length;return `<div class="platform-bar"><span>${platform}</span><div class="platform-track"><span style="width:${m.total?100*n/m.total:0}%"></span></div><strong>${num(n)}</strong></div>`;}).join('');
}
function render(){renderStats();renderAgents();renderRun();renderPreview();renderTerminal();renderRecent();if(currentView==='content')renderContent();if(currentView==='calendar')renderCalendar();if(currentView==='reports')renderReports();}
function showView(view){if(!['desk','content','calendar','reports'].includes(view))return;currentView=view;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!=='view-'+view);document.querySelectorAll('.tab').forEach(tab=>{tab.classList.toggle('active',tab.dataset.view===view);if(tab.dataset.view===view)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');});render();}
function newDialog(topic=''){
  if(running){toast('أكمل التجهيز الحالي أولًا أو انتظر حتى تتوقف العملية.');return;}
  const f=$('#campaignForm');f.reset();f.elements.topic.value=topic;openDialog('#campaignDialog');setTimeout(()=>f.elements.topic.focus(),0);
}
function editCampaign(id=state.selectedId){const c=state.campaigns.find(c=>c.id===id);if(!c?.output){toast('شغّل الفريق لتجهيز مسودة أولًا.');return;}if(running){toast('انتظر انتهاء تجهيز المسودة قبل مراجعتها.');return;}editorId=id;const f=$('#editorForm');for(const field of ['hook','body','cta','hashtags'])f.elements[field].value=c.output[field]||'';f.elements.approve.checked=!!c.approvedAt;updateCounter();openDialog('#editorDialog');}
function updateCounter(){const f=$('#editorForm');$('#editorCounter').textContent=num([f.elements.hook.value,f.elements.body.value,f.elements.cta.value,f.elements.hashtags.value].join('\n\n').length)+' حرفًا · راجع حدود المنصة قبل النشر';}
function openSchedule(id=state.selectedId){const c=state.campaigns.find(c=>c.id===id);if(!c?.approvedAt){toast('اعتمد المحتوى من نافذة المراجعة أولًا.');if(c?.output)editCampaign(id);return;}scheduleId=id;const field=$('#scheduleForm').elements.when;field.min=kuwaitInput(new Date(Date.now()+60000));field.value=c.scheduledAt?kuwaitInput(new Date(c.scheduledAt)):kuwaitInput(new Date(Date.now()+86400000));openDialog('#scheduleDialog');}
async function gatewayGenerate(c,signal){
  const url=gatewayUrl(state.settings.gateway);if(!url)throw new Error('أضف عنوان خادم توليد آمنًا في الإعدادات.');
  const headers={'Content-Type':'application/json'};if(sessionToken)headers.Authorization='Bearer '+sessionToken;
  const response=await fetch(url,{method:'POST',headers,credentials:'omit',signal,body:JSON.stringify({version:1,task:'social-content',brief:{topic:c.topic,brand:c.brand,platform:c.platform,goal:c.goal,tone:c.tone,facts:c.facts,sourceUrl:c.sourceUrl}})});
  if(!response.ok)throw new Error('تعذر التوليد من الخادم. رمز الاستجابة: '+response.status);
  const raw=await response.text();if(raw.length>100000)throw new Error('رد خادم التوليد أكبر من الحد المقبول.');
  let data;try{data=JSON.parse(raw);}catch{throw new Error('خادم التوليد لم يُرجع بيانات JSON صالحة.');}return normalizeOutput(data.output||data);
}
async function runTeam(){
  if(running)return;const c=selected();if(!c){newDialog();return;}if(c.output){editCampaign();return;}
  running=true;paused=false;const token=++runId;let failure=false;
  showView('desk');
  for(let i=Math.max(0,c.step+1);i<6;i++){
    while(paused&&token===runId)await wait(120);
    if(token!==runId)break;
    currentAgent=i;render();await wait(matchMedia('(prefers-reduced-motion: reduce)').matches?80:550);
    while(paused&&token===runId)await wait(120);
    if(token!==runId)break;
    try{
      if(i===0)log('راصد الأفكار · الموضوع جاهز',c.facts?'تم ترتيب المعلومات التي أضفتها. لا يوجد رصد ترندات خارجي.':'اعتمدنا فكرتك كنقطة بداية. لا توجد بيانات رصد خارجي.',i);
      if(i===1){c.strategy=strategyFor(c);log('المخطط · خطة المحتوى جاهزة',c.goal+' عبر '+c.platform+' بنبرة '+c.tone+'.',i);}
      if(i===2){
        if(state.settings.mode==='gateway'){
          const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
          try{c.output=await gatewayGenerate(c,controller.signal);c.origin='gateway';}finally{clearTimeout(timeout);}
        }else {c.output=localDraft(c);c.origin='local';}
        log('كاتب المحتوى · المسودة جاهزة',c.origin==='gateway'?'وصل النص من خادم التوليد المحدد.':'تجهزت مسودة عربية بقالب محلي، دون استدعاء Grok.',i);
      }
      if(i===3)log('المصمم · القالب جاهز للتحميل','تصميم عربي محلي بصيغة SVG، قابل للمراجعة والتنزيل.',i);
      if(i===4)log('مسؤول النشر · بانتظار اعتمادك','راجع المحتوى قبل تحديد موعد. لم يُنشر شيء خارجيًا.',i);
      if(i===5)log('المحلل · ملخص مساحة العمل','أُضيفت هذه الحملة إلى مكتبتك. قياسات الحسابات تحتاج ربطًا.',i);
      c.step=i;c.updatedAt=new Date().toISOString();save();render();
    }catch(error){failure=true;log('توقف تجهيز المحتوى',error.name==='AbortError'?'انتهت مهلة الخادم. المسودة لم تُعتمد.':error.message,i);toast(error.name==='AbortError'?'خادم التوليد لم يستجب خلال المهلة.':error.message);break;}
  }
  if(token===runId){running=false;paused=false;currentAgent=-1;render();if(!failure)toast('مسودتك وتصميمك جاهزان. افتح المراجعة لاعتماد المحتوى.');}
}
async function downloadDesign(id=state.selectedId){
  const c=state.campaigns.find(c=>c.id===id);if(!c?.output){toast('جهّز المحتوى أولًا ليصبح التصميم متاحًا.');return;}
  try{const response=await fetch('./assets/cairo.woff');if(!response.ok)throw new Error('font');const font=await response.blob();const fontData=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(font);});download(designSvg(c,fontData),'تصميم-'+c.id.slice(0,8)+'.svg','image/svg+xml');log('تم تنزيل التصميم',c.topic,3);toast('تم تجهيز ملف التصميم للتحميل.');}catch{toast('تعذر تجهيز ملف التصميم. أعد المحاولة.');}
}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportWorkspace(){download(JSON.stringify(exportState(state),null,2),'social-desk-workspace.json','application/json');toast('تم تجهيز نسختك الاحتياطية للتحميل. إعدادات الاتصال لا تدخل في النسخة.');}
async function copyPost(){const c=selected();if(!c?.output){toast('جهّز مسودة أولًا.');return;}try{await navigator.clipboard.writeText(fullCopy(c));toast('تم نسخ نص المنشور.');}catch{details('نص منشورك',`<textarea rows="12" readonly aria-label="نص المنشور">${esc(fullCopy(c))}</textarea>`);}}
function openSettings(){const f=$('#settingsForm');f.elements.mode.value=state.settings.mode;f.elements.gateway.value=state.settings.gateway;f.elements.token.value=sessionToken;$('#storageNote').textContent=storageAvailable?'بيانات مساحة العمل محفوظة في هذا المتصفح؛ صدّر نسخة للاحتفاظ بها خارج الجهاز.':'الحفظ الدائم غير متاح في هذا المتصفح. صدّر نسخة حتى لا تفقد عملك.';openDialog('#settingsDialog');}
function agentDetails(i){const a=AGENTS[i],c=selected();let result='لم تبدأ هذه الخطوة بعد.';
  if(c){if(i===0)result='موضوع الحملة: '+c.topic+'\n\n'+(c.facts?'المعلومات المدخلة:\n'+c.facts:'لا توجد معلومات مرجعية مدخلة.')+'\n\n'+(c.sourceUrl?'الرابط المرجعي: '+c.sourceUrl:'لا يوجد مصدر رصد خارجي متصل.');if(i===1)result=c.strategy||'تظهر خطة المحتوى بعد تشغيل الفريق.';if(i===2)result=fullCopy(c)||'تظهر المسودة بعد تشغيل الفريق.';if(i===3)result=c.output?'القالب البصري جاهز. اضغط تحميل التصميم للاحتفاظ بالملف.':'القالب ينتظر نص المنشور.';if(i===4)result=c.scheduledAt?'موعدك المحلي: '+dateLabel(c.scheduledAt):c.approvedAt?'اعتمدت المحتوى. يمكنك الآن تحديد موعد محلي.':'راجع المحتوى واعتمده قبل إضافة موعد.';if(i===5)result='عدد الحملات: '+num(state.campaigns.length)+'\n\nلا توجد بيانات وصول أو تفاعل خارجية متصلة.';}
  details(a.name,`<div class="detail-agent" style="--tint:${a.tint}"><p>${a.detail}</p></div><div class="detail-content">${esc(result)}</div>${i===3&&c?.output?'<div class="dialog-actions"><button class="button primary" data-action="design">تحميل التصميم</button></div>':''}`);
}
function showTools(){details('دليل أدوات الفريق','<div class="detail-content"><p>هذه مشاريع مستقلة يمكن ربطها بالنظام. وجودها في الدليل لا يعني أنها متصلة حاليًا.</p>'+TOOLS.map(([name,purpose,repo])=>`<div class="tool-item"><span><bdi>${name}</bdi> · ${purpose}</span><a href="https://github.com/${repo}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>`).join('')+'</div>');}
function deleteCampaign(id){if(running){toast('انتظر انتهاء تجهيز الحملة.');return;}const c=state.campaigns.find(c=>c.id===id);if(!c)return;details('حذف الحملة',`<div class="detail-content">سيتم حذف حملة «${esc(c.topic)}» وموعدها من مساحة هذا المتصفح.</div><div class="dialog-actions"><button class="button secondary" data-close>إلغاء</button><button class="button primary" data-confirm-delete="${esc(id)}">حذف الحملة</button></div>`);}

document.addEventListener('click',event=>{
  const button=event.target.closest('button,a[data-action]');if(!button)return;
  if(button.hasAttribute('data-close')){button.closest('dialog')?.close();return;}
  if(button.dataset.topic!==undefined){newDialog(button.dataset.topic);return;}
  if(button.dataset.agent!==undefined){agentDetails(+button.dataset.agent);return;}
  if(button.dataset.view){showView(button.dataset.view);return;}
  if(button.dataset.open){if(selectedId(button.dataset.open))showView('desk');return;}
  if(button.dataset.edit){editCampaign(button.dataset.edit);return;}
  if(button.dataset.schedule){openSchedule(button.dataset.schedule);return;}
  if(button.dataset.design){downloadDesign(button.dataset.design);return;}
  if(button.dataset.delete){deleteCampaign(button.dataset.delete);return;}
  if(button.dataset.confirmDelete){const id=button.dataset.confirmDelete;state.campaigns=state.campaigns.filter(c=>c.id!==id);if(state.selectedId===id)state.selectedId=state.campaigns.at(-1)?.id||null;save();button.closest('dialog')?.close();log('تم حذف حملة','أزيلت الحملة وموعدها من مساحة هذا المتصفح.');render();return;}
  const action=button.dataset.action;
  if(action==='new')newDialog();if(action==='run')runTeam();if(action==='edit')editCampaign();if(action==='copy')copyPost();if(action==='design')downloadDesign();if(action==='settings')openSettings();if(action==='export')exportWorkspace();if(action==='import')$('#importFile').click();if(action==='tools')showTools();
  if(action==='pause'){paused=!paused;render();toast(paused?'توقف التجهيز بين الخطوات. يمكنك المتابعة.':'تمت متابعة التجهيز.');}
  if(action==='fullscreen'){document.body.classList.toggle('expanded');button.setAttribute('aria-label',document.body.classList.contains('expanded')?'استعادة حجم مساحة الفريق':'تكبير مساحة الفريق');}
  if(action==='history')details('سجل مساحة العمل',state.events.length?'<div class="detail-content">'+state.events.slice().reverse().map(e=>`<h3>${esc(e.title)}</h3><small>${dateLabel(e.at)}</small><p>${esc(e.message)}</p>`).join('')+'</div>':'<p class="form-note">ستظهر الأحداث هنا بعد بدء العمل.</p>');
  if(action==='strategy')agentDetails(1);if(action==='brief')agentDetails(0);
  if(action==='prev-month'){calendarOffset--;renderCalendar();}if(action==='next-month'){calendarOffset++;renderCalendar();}
});
$('#campaignForm').addEventListener('submit',event=>{event.preventDefault();if(running)return;try{const data=Object.fromEntries(new FormData(event.target));const c=newCampaign(data,crypto.randomUUID());state.campaigns.push(c);state.selectedId=c.id;save();$('#campaignDialog').close();log('حملة جديدة · '+c.brand,c.topic);render();runTeam();}catch(e){toast(e.message);}});
$('#editorForm').addEventListener('input',updateCounter);
$('#editorForm').addEventListener('submit',event=>{event.preventDefault();const i=state.campaigns.findIndex(c=>c.id===editorId);if(i<0)return;try{const f=event.target;state.campaigns[i]=approveEdit(state.campaigns[i],Object.fromEntries(new FormData(f)),f.elements.approve.checked);state.selectedId=editorId;save();$('#editorDialog').close();log(f.elements.approve.checked?'تم اعتماد المحتوى':'تم حفظ التعديل',state.campaigns[i].topic,2);render();toast(f.elements.approve.checked?'تم اعتماد النسخة. يمكنك تحديد موعد من مكتبة المحتوى.':'تم حفظ المسودة للمراجعة.');}catch(e){toast(e.message);}});
$('#scheduleForm').addEventListener('submit',event=>{event.preventDefault();const i=state.campaigns.findIndex(c=>c.id===scheduleId);if(i<0)return;try{state.campaigns[i]=scheduleKuwait(state.campaigns[i],event.target.elements.when.value);save();$('#scheduleDialog').close();log('موعد محلي محفوظ',state.campaigns[i].topic+' · '+dateLabel(state.campaigns[i].scheduledAt),4);render();toast('حُفظ الموعد في تقويمك المحلي. لم يُرسل أي منشور.');}catch(e){toast(e.message);}});
$('#settingsForm').addEventListener('submit',event=>{event.preventDefault();if(running){toast('انتظر انتهاء التجهيز قبل تغيير خادم التوليد.');return;}const f=event.target,url=f.elements.gateway.value.trim(),mode=f.elements.mode.value;if(url&&!gatewayUrl(url)){toast('عنوان الخادم يجب أن يبدأ بـ https وألا يتضمن بيانات دخول.');return;}if(mode==='gateway'&&!url){toast('أدخل عنوان خادم التوليد أولًا.');return;}const token=f.elements.token.value.trim();if(/^(xai-|sk-|sk_)/i.test(token)){toast('احتفظ بمفتاح مزود النموذج في خادمك. هذا الحقل لرمز جلسة خادمك فقط.');return;}state.settings={mode,gateway:gatewayUrl(url)};sessionToken=token;save();$('#settingsDialog').close();render();toast(mode==='gateway'?'حُفظ عنوان الخادم. يُختبر الاتصال عند تجهيز الحملة القادمة.':'تم اختيار القوالب المحلية.');});
$('#contentSearch').addEventListener('input',renderContent);$('#contentFilter').addEventListener('change',renderContent);
$('#importFile').addEventListener('change',async event=>{const input=event.target,file=input.files[0];if(!file)return;try{if(running)throw new Error('أكمل التجهيز الحالي قبل الاستيراد.');if(file.size>5*1024*1024)throw new Error('حجم النسخة أكبر من الحد المسموح: ٥ ميغابايت.');const imported=validateState(JSON.parse(await file.text()));const existing=new Set(state.campaigns.map(c=>c.id));const additions=imported.campaigns.filter(c=>!existing.has(c.id));if(state.campaigns.length+additions.length>500)throw new Error('مساحة العمل تتجاوز ٥٠٠ حملة.');const count=additions.length;state.campaigns.push(...additions);if(!state.selectedId)state.selectedId=state.campaigns.at(-1)?.id||null;save();log('استيراد نسخة احتياطية','أضيفت '+num(count)+' حملات جديدة دون تكرار الحملات الموجودة.');render();toast('تم استيراد '+num(count)+' حملات جديدة.');}catch(error){toast(error instanceof SyntaxError?'ملف JSON غير صالح.':error.message);}finally{input.value='';}});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
window.addEventListener('beforeunload',event=>{if(running){event.preventDefault();event.returnValue='';}});
$('#today').textContent=new Intl.DateTimeFormat('ar-KW',{day:'numeric',month:'long',timeZone:'Asia/Kuwait'}).format(new Date());
renderTools();render();
if(!storageAvailable)setTimeout(()=>toast('تعذر قراءة الحفظ السابق. استخدم التصدير للاحتفاظ بنسخة من عملك.'),500);
