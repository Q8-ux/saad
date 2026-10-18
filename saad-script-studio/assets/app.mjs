import {TYPES,LABELS,id,block,newProject,validateProject,parseText,scenes,moveScene,stats,review,toFdx,fromFdx,toFountain,printBody,validatePlan,validateScene,promptForPlan,promptForScene,snapshot,escapeHtml as esc} from './core.mjs?v=4';
import {makeGemini} from './ai.mjs?v=4';
import {exampleProject} from './example.mjs?v=4';
import {METHOD,STAGES,DRAMA_FIELDS,storyChecks,storyFingerprint,isApproved,planIssues,planFromBeats,promptForFoundation,validateFoundation,mergeFoundation,dramaForScene,sceneReview,storyText,printStoryBody} from './story.mjs?v=4';
import {makeStoryUI,dramaInputs} from './story-ui.mjs?v=4';
import {makeCinemaUI} from './cinematic-ui.mjs?v=4';
import {orderProjects,mergeCatalog} from './project-catalog.mjs?v=5';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const STORAGE='saad.script-studio.v1';
const ai=makeGemini();
let projects=[],activeId='',focusedId='',currentView='editor',saveTimer,toastTimer,busy=false,controller=null,models=[];
let undoStack=[],redoStack=[];
let storyUI,cinemaUI;
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.remove('hidden');el.classList.toggle('error',error);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),error?11000:5500);}
function current(){return projects.find(p=>p.id===activeId);}
function load(){
  let raw;
  try{raw=localStorage.getItem(STORAGE);if(raw){const data=JSON.parse(raw);if(!Array.isArray(data.projects)||data.projects.length>40)throw new Error('بيانات المشاريع غير صالحة.');projects=data.projects.map(validateProject);activeId=projects.some(p=>p.id===data.activeId)?data.activeId:projects[0]?.id;}}
  catch{if(raw){try{localStorage.setItem(`${STORAGE}.recovery`,raw);}catch{}setTimeout(()=>toast('تعذّر فتح البيانات السابقة. احتُفظ ببيانات الاستعادة إن سمحت مساحة المتصفح. استورد آخر ملف مشروع محفوظ.',true),400);}}
  if(!projects.length){const p=newProject();projects=[p];activeId=p.id;}
}

async function loadCatalog(){
  const key=STORAGE+'.catalog.v1';
  try{
    const seen=JSON.parse(localStorage.getItem(key)||'[]');
    if(Array.isArray(seen)&&['barcode','outside-story'].every(k=>seen.includes(k)))return;
    const read=async file=>{const response=await fetch(new URL('./projects/'+file,import.meta.url));if(!response.ok)throw Error('catalog');return response.json();};
    const catalog=await read('catalog.json');
    const seeds=await Promise.all(catalog.map(async entry=>validateProject(await read(entry.file))));
    const merged=mergeCatalog(projects,seeds,Array.isArray(seen)?seen:[]);
    const untouched=projects.length===1&&projects[0].title==='سيناريو جديد'&&projects[0].blocks.every(b=>!b.text.trim())&&!projects[0].idea;
    projects=merged.projects;
    if(untouched&&merged.added.length){activeId=projects.find(p=>p.id===merged.added[0]).id;}
    if(merged.added.length&&!saveNow())return;
    localStorage.setItem(key,JSON.stringify(merged.seen));
  }catch{ /* The writer's existing projects remain usable offline. */ }
}

function saveNow(){
  clearTimeout(saveTimer);
  try{localStorage.setItem(STORAGE,JSON.stringify({projects,activeId}));$('#saveStatus').textContent='تم الحفظ على جهازك';$('#saveStatus').style.color='';return true;}
  catch{$('#saveStatus').textContent='تعذّر الحفظ · صدّر المشروع';$('#saveStatus').style.color='#a94037';toast('مساحة التخزين غير كافية أو الحفظ محظور. صدّر ملف المشروع الآن لحماية عملك.',true);return false;}
}
function scheduleSave(){current().updatedAt=new Date().toISOString();$('#saveStatus').textContent='جارٍ الحفظ…';clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,450);}
function structuralChange(fn){undoStack.push(structuredClone(current().blocks));undoStack=undoStack.slice(-30);redoStack=[];fn();scheduleSave();renderEditor();renderMeta();}
function empty(message){return `<div class="empty-state">${esc(message)}</div>`;}
function renderMeta(){
  const p=current();const s=stats(p);
  $('#projectTitle').value=p.title;$('#paperTitle').textContent=p.title;
  $('#sceneStat').textContent=s.sceneCount;$('#characterStat').textContent=s.characters.length;$('#wordStat').textContent=s.words.toLocaleString('ar-KW');$('#pageStat').textContent=s.estimatedPages;
  renderProjects();renderSceneList();
  if(currentView==='board')renderBoard();if(currentView==='review')renderReview();
  if(currentView==='story')storyUI?.refresh();
  if(currentView==='cinema')cinemaUI?.refresh();
}
function renderProjects(){
  $('#projectList').innerHTML=orderProjects(projects).map(p=>`<div class="project-item ${p.id===activeId?'active':''}"><button class="project-open" data-project="${esc(p.id)}">${esc(p.title)}</button><button class="icon-button delete-project" data-delete-project="${esc(p.id)}" aria-label="حذف المشروع ${esc(p.title)}">×</button></div>`).join('');
}
function renderSceneList(){
  const list=scenes(current());$('#sceneList').innerHTML=list.length?list.map(s=>`<button class="scene-item" data-jump="${esc(s.id)}"><span>${esc(s.number)}</span><span>${esc(s.title)}</span></button>`).join(''):empty('أضف عنوان مشهد لتبدأ.');
}
function autoSize(el){el.style.height='0px';el.style.height=Math.max(50,el.scrollHeight)+'px';}
function renderEditor(focus=null,position=null){
  const p=current();const dir=p.language==='en'?'ltr':'rtl';$('#blocksEditor').dir=dir;
  $('#blocksEditor').innerHTML=p.blocks.map(b=>`<div class="script-block type-${b.type.toLowerCase().replace(/ /g,'-')}" data-block="${esc(b.id)}"><span class="block-tag">${esc(LABELS[b.type])}</span><textarea rows="1" data-id="${esc(b.id)}" dir="${dir}" aria-label="${esc(LABELS[b.type])}" placeholder="${esc(placeholder(b.type))}" ${busy?'disabled':''}>${esc(b.text)}</textarea></div>`).join('');
  requestAnimationFrame(()=>{
    $$('#blocksEditor textarea').forEach(autoSize);
    if(focus){const el=$$('#blocksEditor textarea').find(t=>t.dataset.id===focus);if(el){el.focus({preventScroll:true});if(position!==null)el.setSelectionRange(position,position);el.scrollIntoView({block:'nearest',behavior:'auto'});focusedId=focus;updateTypeButtons();}}
  });
  updateTypeButtons();
}
function placeholder(type){return {'Scene Heading':'داخلي - المكان - نهار',Action:'ما الذي نراه ونسمعه في المشهد؟',Character:'اسم الشخصية',Dialogue:'اكتب الحوار هنا…',Parenthetical:'(توجيه أداء مختصر)',Transition:'قطع إلى:',General:'نص عام'}[type];}
function updateTypeButtons(){const b=current().blocks.find(b=>b.id===focusedId)||current().blocks[0];$$('.type-button').forEach(btn=>{const active=btn.dataset.type===b?.type;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});$('#undoButton').disabled=busy||!undoStack.length;$('#redoButton').disabled=busy||!redoStack.length;}
function focusBlock(bid){showView('editor');requestAnimationFrame(()=>{const t=$$('#blocksEditor textarea').find(el=>el.dataset.id===bid);if(t){t.focus({preventScroll:true});t.scrollIntoView({behavior:'smooth',block:'center'});focusedId=bid;updateTypeButtons();}});}
function addBlock(type='Action'){
  if(busy)return;
  const p=current();const at=p.blocks.findIndex(b=>b.id===focusedId);const b=block(type);
  structuralChange(()=>p.blocks.splice(at>=0?at+1:p.blocks.length,0,b));renderEditor(b.id,0);
}
function renderBoard(){
  const list=scenes(current());
  $('#sceneBoard').innerHTML=list.length?list.map((s,i)=>`<article class="scene-card"><div class="scene-card-head"><span>${esc(s.number)}</span><span>${s.blocks.filter(b=>b.type==='Dialogue').length} فقرات حوار</span></div><h3>${esc(s.title)}</h3><textarea data-summary="${esc(s.id)}" rows="3" aria-label="وظيفة المشهد ${i+1}" placeholder="ما الذي يتغير في هذا المشهد؟" ${busy?'disabled':''}>${esc(s.summary)}</textarea><details><summary>الهدف والمحاولة والنتيجة والقرار</summary><div class="field-grid drama-inputs">${dramaInputs(s.drama,`data-scene-drama="${esc(s.id)}"`,busy)}</div></details><div class="card-actions"><button class="text-button" data-jump="${esc(s.id)}">افتح المشهد</button><div class="card-move"><button class="icon-button" data-move="${esc(s.id)}" data-delta="-1" aria-label="نقل المشهد إلى الأعلى" ${i===0||busy?'disabled':''}>↑</button><button class="icon-button" data-move="${esc(s.id)}" data-delta="1" aria-label="نقل المشهد إلى الأسفل" ${i===list.length-1||busy?'disabled':''}>↓</button></div></div></article>`).join(''):empty('ابدأ بمشهد في المحرر، أو حوّل نصك إلى سيناريو.');
}
function fillStoryForm(){
  const p=current();for(const [selector,key] of [['#ideaInput','idea'],['#formatInput','format'],['#languageInput','language'],['#genreInput','genre'],['#dialectInput','dialect'],['#sceneCountInput','sceneCount'],['#authorInput','author']])$(selector).value=p[key];
  $$('[data-pillar]').forEach(el=>el.value=p.pillars[el.dataset.pillar]||'');storyUI?.render();renderPlan();updateConnection();
}
function renderPlan(){
  const p=current(),plan=p.plan;$('#planPanel').classList.toggle('hidden',!plan);if(!plan){$('#planPanel').innerHTML='';return;}
  const started=plan.scenes.some(s=>s.written),done=plan.scenes.every(s=>s.written),issues=planIssues(p),blocked=issues.some(n=>n.severity==='required');
  const warnings=issues.length?`<div class="plan-warning"><h3>قبل اعتماد الكتابة</h3>${issues.slice(0,8).map(n=>`<p>${n.severity==='warning'?'◇':'○'} ${esc(n.message)}</p>`).join('')}${issues.length>8?`<p>المراجعة الكاملة في «مراجعة ونسخ» · ${issues.length} ملاحظات.</p>`:''}</div>`:'';
  $('#planPanel').innerHTML=`<div class="plan-heading"><div><span class="eyebrow">خطة المشاهد · ${plan.scenes.length} مشاهد</span><h2>${esc(plan.title)}</h2><p>${esc(plan.logline)}</p><p>${esc(plan.synopsis)}</p></div><button id="writeScenes" class="button" ${busy||done||blocked?'disabled':''}>${done?'اكتملت كتابة المشاهد':started?'استكمل المشاهد':'اعتمد الخطة واكتب المشاهد'}</button></div><div id="planWarnings">${warnings}</div><p class="field-help">${started?'المشاهد المكتملة محفوظة. إذا تغير أساس القصة، أنشئ خطة جديدة قبل الاستكمال.':'راجع الخطة. فتح هيكل المشاهد أو التوليد يحفظ مسودتك الحالية كنسخة قبل بدء نص جديد.'}</p><div class="plan-tools"><button id="startManualScenes" class="button subtle" ${busy||blocked||started?'disabled':''}>افتح هيكل المشاهد للكتابة اليدوية</button><button class="text-button" data-view-editor>افتح المحرر الحالي</button></div><div class="plan-cards">${plan.scenes.map((scene,i)=>`<article class="plan-card" data-plan-card="${esc(scene.id)}"><div class="eyebrow"><span>المشهد ${i+1}</span><span>${scene.written?'✓ مكتمل':'بانتظار الكتابة'}</span></div><label>المكان والزمان<input data-plan-heading="${i}" value="${esc(scene.heading)}" aria-label="عنوان المشهد ${i+1}" maxlength="5000" ${started||busy?'disabled':''}></label><label>ملخص الحدث<textarea data-plan-summary="${i}" aria-label="ملخص المشهد ${i+1}" rows="3" maxlength="5000" ${started||busy?'disabled':''}>${esc(scene.summary)}</textarea></label><label>الإيقاع المرتبط<select data-plan-index="${i}" data-plan-field="beatId" ${started||busy?'disabled':''}><option value="">اختر إيقاعًا</option>${p.story.beats.map(b=>`<option value="${esc(b.id)}" ${b.id===scene.beatId?'selected':''}>${esc(b.label)}</option>`).join('')}</select></label><details><summary>المحاولة والنتيجة والقرار والدافع والمعرفة</summary><div class="field-grid drama-inputs">${dramaInputs(scene,`data-plan-index="${i}"`,started||busy)}</div></details></article>`).join('')}</div>`;
}
function refreshPlanGates(){
  const p=current();if(!p.plan)return;const issues=planIssues(p),blocked=issues.some(n=>n.severity==='required'),started=p.plan.scenes.some(s=>s.written),done=p.plan.scenes.every(s=>s.written);
  if($('#writeScenes'))$('#writeScenes').disabled=busy||blocked||done;
  if($('#startManualScenes'))$('#startManualScenes').disabled=busy||blocked||started;
  if($('#planWarnings'))$('#planWarnings').innerHTML=issues.length?`<div class="plan-warning"><h3>قبل اعتماد الكتابة</h3>${issues.slice(0,8).map(n=>`<p>${n.severity==='warning'?'◇':'○'} ${esc(n.message)}</p>`).join('')}${issues.length>8?`<p>المراجعة الكاملة في «مراجعة ونسخ» · ${issues.length} ملاحظات.</p>`:''}</div>`:'';
}
function renderReview(){
  const p=current();const notes=review(p);
  const c=storyChecks(p);const foundationNotes=c.missing.map(n=>`<div class="review-note"><span>○</span><button data-open-story="${n.stage}" data-focus-field="${esc(n.field)}" data-focus-card="${esc(n.id)}">${esc(n.message)}</button></div>`);
  const planNotes=planIssues(p).map(n=>`<div class="review-note"><span>${n.severity==='warning'?'◇':'○'}</span><button data-open-story="plan">${esc(n.message)}</button></div>`);
  const sceneNotes=sceneReview(p).map(n=>`<div class="review-note"><span>◇</span><button data-jump="${esc(n.id)}">${esc(n.message)}</button></div>`);
  $('#storyReviewList').innerHTML=`<p class="field-help">${c.completed} من ${c.total} بنود موثّقة. ${isApproved(p)?'أساس القصة معتمد.':'الأساس يحتاج إكمالًا أو اعتمادًا.'} هذه نتيجة اكتمال، وليست درجة جودة أدبية.</p>`+[...foundationNotes,...planNotes,...sceneNotes].join('');
  $('#reviewList').innerHTML=notes.length?notes.map(n=>`<div class="review-note"><span>○</span><button data-jump="${esc(n.id)}">${esc(n.message)}</button></div>`).join(''):empty('لم تظهر ملاحظات على بنية الفقرات. اقرأ الحبكة والحوار قبل التسليم.');
  $('#snapshotList').innerHTML=p.snapshots.length?[...p.snapshots].reverse().map(s=>`<div class="snapshot-item"><div><strong>${esc(s.name)}</strong><small>${esc(new Date(s.date).toLocaleString('ar-KW'))}</small></div><button class="button subtle" data-restore="${esc(s.id)}">استعادة</button></div>`).join(''):empty('احفظ نسخة عند إكمال مرحلة مهمة من الكتابة.');
  const cs=stats(p).characters;$('#characterList').innerHTML=cs.length?`<table class="characters-table"><thead><tr><th>الشخصية</th><th>فقرات الحوار</th><th>كلمات الحوار</th></tr></thead><tbody>${cs.map(c=>`<tr><td>${esc(c.name)}</td><td>${c.speeches}</td><td>${c.words}</td></tr>`).join('')}</tbody></table>`:empty('ستظهر الشخصيات بعد إضافة أسماء المتحدثين والحوار.');
}
function showView(view){
  currentView=view;$$('.view').forEach(el=>el.classList.add('hidden'));$(`#${view}View`).classList.remove('hidden');$$('.nav-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));$('#sidebar').classList.remove('open');
  if(view==='editor')renderEditor();if(view==='board')renderBoard();if(view==='story')fillStoryForm();if(view==='review')renderReview();
  if(view==='cinema')cinemaUI?.render();
}
function switchProject(pid){if(busy){toast('أوقف الكاتب المساعد قبل تغيير المشروع.');return;}saveNow();activeId=pid;focusedId=current().blocks[0]?.id;undoStack=[];redoStack=[];renderMeta();storyUI?.select('dna');showView(current().blocks.some(b=>b.text.trim())?'editor':'story');saveNow();}
function addProject(p){if(projects.length>=40){toast('لديك ٤٠ مشروعاً على هذا الجهاز. صدّر أحدها واحذفه قبل إضافة مشروع.',true);return false;}p.id=id();projects.push(p);activeId=p.id;focusedId=p.blocks[0]?.id;undoStack=[];redoStack=[];renderMeta();storyUI?.select('dna');showView(p.blocks.some(b=>b.text.trim())?'editor':'story');saveNow();return true;}
function download(data,name,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function fileName(){return (current().title.replace(/[\\/:*?"<>|\u0000-\u001F]/g,'').trim()||'screenplay').slice(0,100);}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('تم نسخ البرومبت.');}catch{download(text,`${fileName()}-prompt.txt`);toast('تم تنزيل البرومبت كملف نصي.');}}
async function printCinema(body){
  const p=current();saveNow();$('#printArea').dataset.printStyle=p.printStyle;$('#printArea').innerHTML=body;$('#printArea').dir='rtl';$('#printArea').setAttribute('aria-hidden','false');
  try{if(p.printStyle==='ink')await document.fonts?.load('16px InkArabic','الحروف العربية متصلة');await document.fonts?.ready;const title=document.title;document.title=p.title+' — التصور السينمائي';window.print();document.title=title;}
  catch{toast('تعذر تجهيز الطباعة بخط الحبر. أعد المحاولة بعد تحميل الخط.',true);}
  finally{$('#printArea').setAttribute('aria-hidden','true');}
}
function confirmAction({title,text,input=false,initial='',label='متابعة'}){
  const dialog=$('#confirmDialog');$('#confirmTitle').textContent=title;$('#confirmText').textContent=text;$('#confirmInputLabel').classList.toggle('hidden',!input);$('#confirmInput').value=initial;$('#confirmAccept').textContent=label;dialog.returnValue='';dialog.showModal();
  return new Promise(resolve=>{const onClose=()=>{dialog.removeEventListener('close',onClose);resolve(dialog.returnValue==='ok'?(input?$('#confirmInput').value.trim():true):null);};dialog.addEventListener('close',onClose);});
}
function setBusy(value){
  busy=value;$('#generationProgress').classList.toggle('hidden',!value);
  for(const selector of ['#planButton','#connectButton','#disconnectButton','#convertButton','#sampleButton','#importButton','#newProject','#addScene','#addBlock','#removeBlock','#saveSnapshot','#projectTitle'])$(selector).disabled=value;
  $$('#blocksEditor textarea, #storyForm input, #storyForm textarea, #storyForm select').forEach(el=>el.disabled=value);
  updateTypeButtons();renderPlan();
  storyUI?.refresh();
  if(value){$('#busyCancel').classList.remove('hidden');}else{$('#busyCancel').classList.add('hidden');controller=null;}
}
function updateConnection(){
  $('#aiState').textContent=ai.connected?'الكاتب المساعد متصل':'الكاتب المساعد غير متصل';$('#aiState').classList.toggle('connected',ai.connected);
  $('#writerTitle').textContent=ai.connected?'الكاتب المساعد جاهز':'الكتابة تبدأ منك';
  $('#writerMessage').textContent=ai.connected?'طوّر الحقول الفارغة من فكرتك، ثم راجع أساس القصة واعتمده قبل خطة المشاهد. يمكنك الإيقاف والاستكمال.':'ابنِ القصة يدويًا، أو اربط Gemini ليقترح استكمال الحقول الفارغة. ما تدخله أنت يبقى محفوظًا.';
  $('#storySettings').textContent=ai.connected?'إعدادات الاتصال':'ربط الكاتب المساعد';
  const u=ai.usage;$('#usageStats').textContent=u.requests?`طلبات هذه الجلسة: ${u.requests} · رموز الإدخال: ${u.promptTokens.toLocaleString()} · رموز النص الناتج: ${u.outputTokens.toLocaleString()} · هذه أعداد من المزوّد، وليست تكلفة بالدولار.`:'لم يُنفّذ أي طلب توليد في هذه الجلسة.';
}
function settings(){if(busy)return;$('#settingsDialog').showModal();$('#apiKey').value='';$('#modelField').classList.toggle('hidden',!ai.connected);}
async function generatePlan(event){
  event.preventDefault();if(busy)return;
  const p=current();if(p.idea.trim().length<30){toast('أدخل فكرة أو معالجة من ٣٠ حرفاً على الأقل، وحدد ثوابت القصة.',true);$('#ideaInput').focus();return;}
  const checks=storyChecks(p);if(!checks.ready){showView('story');storyUI.select(checks.missing[0].stage,{field:checks.missing[0].field,id:checks.missing[0].id});toast(checks.missing[0].message,true);return;}
  if(!isApproved(p)){toast('راجع أساس القصة ثم اضغط «اعتمد أساس القصة» قبل التخطيط.',true);return;}
  if(!ai.connected){settings();return;}
  controller=new AbortController();setBusy(true);$('#progressBar').max=1;$('#progressBar').value=0;$('#progressText').textContent='الكاتب يطوّر الشخصيات وتسلسل المشاهد…';
  try{
    const plan=validatePlan(await ai.generate(promptForPlan(p),controller.signal));
    if(controller.signal.aborted)throw new Error('تم إيقاف التخطيط. أساس القصة والخطة السابقة محفوظان.');
    if(plan.scenes.length!==p.sceneCount)throw new Error(`أعاد الكاتب ${plan.scenes.length} مشاهد بدلاً من ${p.sceneCount}. لم تُستبدل الخطة؛ أعد المحاولة.`);
    if(plan.method!==METHOD)throw new Error('لم تتبع الخطة صيغة الخريطة المعتمدة. خطتك السابقة محفوظة؛ أعد المحاولة.');
    plan.sourceFingerprint=storyFingerprint(p);plan.logline=p.story.logline;plan.characters=structuredClone(p.story.characters);plan.scenes.forEach(s=>s.written=false);
    const gaps=planIssues({...p,plan}).filter(n=>n.severity==='required');if(gaps.length)throw new Error(`خطة غير مكتملة: ${gaps[0].message} لم تُستبدل خطتك السابقة.`);
    if(p.plan)snapshot(p,'قبل إنشاء خطة جديدة');p.plan=plan;
    if(p.title==='سيناريو جديد')p.title=plan.title;
    saveNow();renderMeta();storyUI.select('plan');toast('الخطة جاهزة. راجع المحاولة والنتيجة والقرار والمعرفة في كل مشهد قبل الكتابة.');
  }catch(e){toast(e.message,true);}
  finally{setBusy(false);updateConnection();renderPlan();$('#planPanel').scrollIntoView({behavior:'smooth',block:'start'});}
}
async function writeScenes(){
  if(busy)return;if(!ai.connected){settings();return;}
  const p=current();const plan=p.plan;if(!plan)return;
  const gaps=planIssues(p).filter(n=>n.severity==='required');if(gaps.length){toast(gaps[0].message,true);showView('story');storyUI.select('plan');return;}
  if(plan.scenes.every(s=>s.written)){toast('اكتملت هذه الخطة. يمكنك تعديل السيناريو في المحرر.');return;}
  const existing=plan.scenes.some(s=>s.written);let started=existing;
  controller=new AbortController();setBusy(true);$('#progressBar').max=plan.scenes.length;
  try{
    for(let i=0;i<plan.scenes.length;i++){
      if(plan.scenes[i].written)continue;
      $('#progressBar').value=plan.scenes.filter(s=>s.written).length;$('#progressText').textContent=`كتابة المشهد ${i+1} من ${plan.scenes.length}: ${plan.scenes[i].heading}`;
      const context=started?p:{...p,blocks:[]};
      const result=await ai.generate(promptForScene(context,i),controller.signal);
      if(controller.signal.aborted)throw new Error('تم إيقاف الكتابة. المشاهد المكتملة محفوظة.');
      const fresh=validateScene(result,plan.scenes[i].heading);fresh[0].summary=plan.scenes[i].summary;fresh[0].drama=dramaForScene(plan.scenes[i]);
      if(!started){snapshot(p,'قبل كتابة المشاهد من الخطة');p.blocks=[];started=true;}
      p.blocks.push(...fresh);plan.scenes[i].written=true;p.updatedAt=new Date().toISOString();saveNow();renderMeta();renderEditor();renderPlan();updateConnection();
    }
    $('#progressBar').value=plan.scenes.length;toast('اكتملت مسودة المشاهد. راجع القصة والحوار قبل التصدير.');
  }catch(e){toast(e.message,true);}
  finally{setBusy(false);updateConnection();renderPlan();renderEditor();}
}
async function developStory(){
  if(busy)return;const p=current();if(p.idea.trim().length<30){storyUI.select('dna',{field:'ideaInput'});toast('اكتب فكرة من ٣٠ حرفًا على الأقل ليطور الكاتب الحقول الفارغة.',true);return;}if(!ai.connected){settings();return;}
  controller=new AbortController();setBusy(true);$('#progressBar').max=1;$('#progressBar').value=0;$('#progressText').textContent='بناء الركائز والشخصيات والسببية وورقة الإيقاع…';
  try{const foundation=validateFoundation(await ai.generate(promptForFoundation(p),controller.signal),p);if(controller.signal.aborted)throw new Error('تم إيقاف تطوير القصة. بياناتك محفوظة.');snapshot(p,'قبل تطوير أساس القصة');mergeFoundation(p,foundation);p.updatedAt=new Date().toISOString();saveNow();toast('اقتراح بناء القصة جاهز. حُفظ ما كتبته أنت؛ راجع المقترحات ثم اعتمد الأساس.');}
  catch(e){toast(e.message,true);}finally{setBusy(false);fillStoryForm();storyUI.select('dna');}
}
function manualPlan(){
  if(busy)return;const p=current(),c=storyChecks(p);if(!c.ready){storyUI.select(c.missing[0].stage,{field:c.missing[0].field,id:c.missing[0].id});toast(c.missing[0].message,true);return;}if(!isApproved(p)){toast('اعتمد أساس القصة أولًا.');return;}
  if(p.plan)snapshot(p,'قبل الخطة اليدوية');p.plan=validatePlan(planFromBeats(p));saveNow();renderPlan();storyUI.refresh();storyUI.select('plan');toast('تحولت الإيقاعات إلى خطة يدوية. أكمل المكان والزمان ومعرفة الشخصيات ثم افتح هيكل المشاهد.');
}
function startManualScenes(){
  if(busy)return;const p=current();if(!p.plan)return;const gaps=planIssues(p).filter(n=>n.severity==='required');if(gaps.length){toast(gaps[0].message,true);return;}
  snapshot(p,'قبل فتح هيكل المشاهد');p.blocks=p.plan.scenes.flatMap(s=>[block('Scene Heading',s.heading,{summary:s.summary,drama:dramaForScene(s)}),block('Action')]);p.plan.scenes.forEach(s=>s.written=false);saveNow();renderMeta();showView('editor');toast('هيكل المشاهد جاهز للكتابة. حُفظت المسودة السابقة كنسخة.');
}
function sample(){addProject(exampleProject());toast('مثال تخيلي مكتمل الركائز والإيقاعات والمشاهد. افتح بناء القصة لمراجعة المنهج.');}
function initEvents(){
  $('#typeButtons').innerHTML=TYPES.map(t=>`<button class="type-button" data-type="${t}" aria-pressed="false">${LABELS[t]}</button>`).join('');
  const cancel=document.createElement('button');cancel.id='busyCancel';cancel.className='button danger hidden';cancel.textContent='إيقاف الكتابة';cancel.addEventListener('click',()=>controller?.abort());$('.document-actions').append(cancel);
  $$('.nav-button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $('#openSidebar').addEventListener('click',()=>$('#sidebar').classList.add('open'));$('#closeSidebar').addEventListener('click',()=>$('#sidebar').classList.remove('open'));
  $('#projectTitle').addEventListener('input',e=>{current().title=e.target.value||'سيناريو جديد';$('#paperTitle').textContent=current().title;renderProjects();scheduleSave();});
  $('#newProject').addEventListener('click',()=>{if(!busy)addProject(newProject());});
  $('#addScene').addEventListener('click',()=>{showView('editor');addBlock('Scene Heading');});
  $('#addBlock').addEventListener('click',()=>addBlock());
  $('#removeBlock').addEventListener('click',()=>{if(busy)return;const p=current();const at=p.blocks.findIndex(b=>b.id===focusedId);if(at<0)return;structuralChange(()=>{p.blocks.splice(at,1);if(!p.blocks.length)p.blocks.push(block('Action'));focusedId=p.blocks[Math.max(0,at-1)]?.id;});renderEditor(focusedId,0);});
  $('#typeButtons').addEventListener('click',e=>{const btn=e.target.closest('[data-type]');if(!btn||busy)return;const b=current().blocks.find(b=>b.id===focusedId)||current().blocks[0];structuralChange(()=>b.type=btn.dataset.type);renderEditor(b.id);});
  $('#blocksEditor').addEventListener('focusin',e=>{if(e.target.dataset.id){focusedId=e.target.dataset.id;updateTypeButtons();}});
  let metaTimer,planInputTimer;
  $('#blocksEditor').addEventListener('input',e=>{
    const b=current().blocks.find(b=>b.id===e.target.dataset.id);if(!b)return;b.text=e.target.value;autoSize(e.target);scheduleSave();clearTimeout(metaTimer);metaTimer=setTimeout(renderMeta,200);
  });
  $('#blocksEditor').addEventListener('keydown',e=>{
    const p=current();const at=p.blocks.findIndex(b=>b.id===e.target.dataset.id);if(at<0||busy)return;const b=p.blocks[at];
    if(e.key==='Tab'){
      e.preventDefault();const n=(TYPES.indexOf(b.type)+(e.shiftKey?-1:1)+TYPES.length)%TYPES.length;structuralChange(()=>b.type=TYPES[n]);renderEditor(b.id,e.target.selectionStart);return;
    }
    if(e.altKey&&/^[1-7]$/.test(e.key)){e.preventDefault();structuralChange(()=>b.type=TYPES[Number(e.key)-1]);renderEditor(b.id);return;}
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
      e.preventDefault();const start=e.target.selectionStart;const end=e.target.selectionEnd;const nextType={'Scene Heading':'Action',Action:'Action',Character:'Dialogue',Parenthetical:'Dialogue',Dialogue:'Action',Transition:'Scene Heading',General:'Action'}[b.type];
      const rest=b.text.slice(end);const fresh=block(start<b.text.length?b.type:nextType,rest);
      structuralChange(()=>{b.text=b.text.slice(0,start);p.blocks.splice(at+1,0,fresh);});renderEditor(fresh.id,0);
    }
    if(e.key==='Backspace'&&e.target.selectionStart===0&&e.target.selectionEnd===0&&!b.text&&p.blocks.length>1){e.preventDefault();const previous=p.blocks[Math.max(0,at-1)];structuralChange(()=>p.blocks.splice(at,1));renderEditor(previous.id,previous.text.length);}
  });
  $('#undoButton').addEventListener('click',()=>{if(busy||!undoStack.length)return;redoStack.push(structuredClone(current().blocks));current().blocks=undoStack.pop();scheduleSave();renderEditor();renderMeta();});
  $('#redoButton').addEventListener('click',()=>{if(busy||!redoStack.length)return;undoStack.push(structuredClone(current().blocks));current().blocks=redoStack.pop();scheduleSave();renderEditor();renderMeta();});
  document.addEventListener('click',async e=>{
    const close=e.target.closest('[data-close]');if(close){close.closest('dialog')?.close();return;}
    const project=e.target.closest('[data-project]');if(project){switchProject(project.dataset.project);return;}
    const del=e.target.closest('[data-delete-project]');if(del){if(busy)return;const p=projects.find(p=>p.id===del.dataset.deleteProject);const ok=await confirmAction({title:'حذف المشروع',text:`سيُحذف «${p.title}» ونسخه من هذا الجهاز. صدّر ملف المشروع إذا كنت تريد الاحتفاظ به.`,label:'حذف المشروع'});if(ok){projects=projects.filter(x=>x.id!==p.id);if(!projects.length)projects.push(newProject());if(activeId===p.id)activeId=projects[0].id;undoStack=[];redoStack=[];renderMeta();showView('editor');saveNow();}return;}
    const jump=e.target.closest('[data-jump]');if(jump){focusBlock(jump.dataset.jump);return;}
    const move=e.target.closest('[data-move]');if(move){if(busy)return;structuralChange(()=>moveScene(current(),move.dataset.move,Number(move.dataset.delta)));renderBoard();return;}
    const restore=e.target.closest('[data-restore]');if(restore){if(busy)return;const p=current();const s=p.snapshots.find(s=>s.id===restore.dataset.restore);if(!s)return;const chosen=structuredClone(s);const ok=await confirmAction({title:'استعادة نسخة المسودة',text:'ستُحفظ النسخة الحالية أولاً، ثم تُستعاد النسخة المختارة.',label:'استعادة'});if(ok){snapshot(p,'قبل الاستعادة');p.blocks=structuredClone(chosen.blocks);p.plan=chosen.plan?structuredClone(chosen.plan):null;if(chosen.basis)Object.assign(p,structuredClone(chosen.basis));saveNow();renderMeta();showView('editor');toast('تمت استعادة النسخة وحفظ المسودة السابقة.');}return;}
    const exp=e.target.closest('[data-export]');if(exp){
      const p=current();const kind=exp.dataset.export;
      if(!['project','storypdf','storytxt'].includes(kind)&&!p.blocks.some(b=>b.text.trim())){toast('أضف نصاً إلى السيناريو قبل التصدير.',true);return;}
      if(kind==='downloadpdf'||kind==='docx'){
        saveNow();const buttons=$$('[data-export]');buttons.forEach(b=>b.disabled=true);
        $('#exportProgress').textContent='جارٍ تجهيز السيناريو بخط أميري…';
        try{const {downloadScreenplay}=await import('./screenplay-export.mjs?v=5');const result=await downloadScreenplay(p,kind==='docx'?'docx':'pdf');$('#exportProgress').textContent='تم تنزيل السيناريو: '+result.pages+' صفحة.';}
        catch(error){$('#exportProgress').textContent='تعذّر تجهيز الملف: '+error.message;}
        finally{buttons.forEach(b=>b.disabled=false);}return;
      }
      $('#exportDialog').close();saveNow();
      if(kind==='fdx')download(toFdx(p),fileName()+'.fdx','application/xml;charset=utf-8');
      if(kind==='fountain')download(toFountain(p),fileName()+'.fountain');
      if(kind==='project')download(JSON.stringify(p,null,2),fileName()+'.script.json','application/json;charset=utf-8');
      if(kind==='txt')download(p.title+'\n'+p.author+'\n\n'+p.blocks.map(b=>b.text).join('\n'),fileName()+'.txt');
      if(kind==='storytxt')download(storyText(p),fileName()+'-story.txt');
      if(kind==='pdf'||kind==='storypdf'){
        $('#printArea').dataset.printStyle=p.printStyle;$('#printArea').innerHTML=kind==='storypdf'?printStoryBody(p):printBody(p);$('#printArea').dir=kind==='storypdf'?'rtl':p.language==='en'?'ltr':'rtl';$('#printArea').setAttribute('aria-hidden','false');
        try{if(p.printStyle==='ink')await document.fonts?.load('16px InkArabic','السيناريو');await document.fonts?.ready;}catch{toast('تعذر تحميل خط الحبر. أعد المحاولة بعد اكتمال الاتصال.',true);$('#printArea').setAttribute('aria-hidden','true');return;}
        const oldTitle=document.title;document.title=p.title;window.print();document.title=oldTitle;$('#printArea').setAttribute('aria-hidden','true');
      }
      return;
    }
    if(e.target.closest('#writeScenes'))writeScenes();
    if(e.target.closest('#startManualScenes'))startManualScenes();
    if(e.target.closest('[data-view-editor]'))showView('editor');
    const storyLink=e.target.closest('[data-open-story]');if(storyLink){showView('story');storyUI.select(storyLink.dataset.openStory,{field:storyLink.dataset.focusField,id:storyLink.dataset.focusCard});}
  });
  $('#sceneBoard').addEventListener('input',e=>{const sid=e.target.dataset.summary||e.target.dataset.sceneDrama;if(sid){const b=current().blocks.find(b=>b.id===sid);if(!b)return;if(e.target.dataset.summary)b.summary=e.target.value;else{b.drama||={};b.drama[e.target.dataset.dramaField]=e.target.value;}scheduleSave();}});
  $('#storyForm').addEventListener('input',e=>{
    const p=current();const map={ideaInput:'idea',formatInput:'format',languageInput:'language',genreInput:'genre',dialectInput:'dialect',sceneCountInput:'sceneCount',authorInput:'author'};
    if(e.target.dataset.pillar)p.pillars[e.target.dataset.pillar]=e.target.value;
    else if(map[e.target.id])p[map[e.target.id]]=e.target.id==='sceneCountInput'?Math.max(2,Math.min(60,Math.round(Number(e.target.value))||6)):e.target.value;
    scheduleSave();
  });
  $('#planPanel').addEventListener('input',e=>{if(busy)return;const p=current();if(e.target.dataset.planHeading!==undefined)p.plan.scenes[Number(e.target.dataset.planHeading)].heading=e.target.value;if(e.target.dataset.planSummary!==undefined)p.plan.scenes[Number(e.target.dataset.planSummary)].summary=e.target.value;if(e.target.dataset.planIndex!==undefined){const scene=p.plan.scenes[Number(e.target.dataset.planIndex)],field=e.target.dataset.planField||e.target.dataset.dramaField;if(scene&&field)scene[field]=e.target.value;}scheduleSave();clearTimeout(planInputTimer);planInputTimer=setTimeout(refreshPlanGates,300);});
  $('#storyForm').addEventListener('submit',generatePlan);$('#promptButton').addEventListener('click',()=>copyText(promptForPlan(current())));
  $('#cancelGeneration').addEventListener('click',()=>controller?.abort());
  $('#convertButton').addEventListener('click',()=>{$('#rawInput').value='';$('#convertDialog').showModal();});
  $('#pasteImport').addEventListener('click',()=>{
    try{const result=parseText($('#rawInput').value);if(!result.blocks.length)throw new Error('أدخل النص الذي تريد تحويله.');const p=newProject();p.blocks=result.blocks;if(addProject(validateProject(p))){$('#convertDialog').close();toast('تم تحويل النص. راجع نوع كل فقرة من شريط التنسيق.');}}catch(e){toast(e.message,true);}
  });
  $('#sampleButton').addEventListener('click',sample);
  $('#exportButton').addEventListener('click',()=>{$('#printStyleInput').value=current().printStyle;$('#exportProgress').textContent='';$('#exportDialog').showModal();});
  $('#printStyleInput').addEventListener('change',e=>{current().printStyle=e.target.value==='classic'?'classic':'ink';saveNow();});
  $('#importButton').addEventListener('click',()=>$('#fileInput').click());
  $('#fileInput').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>10000000)throw new Error('الحد الأقصى للاستيراد ١٠ ميغابايت.');
      const text=await file.text();let p,result;
      if(/\.json$/i.test(file.name)){p=validateProject(JSON.parse(text));}
      else{
        result=/\.fdx$/i.test(file.name)?fromFdx(text):parseText(text,{fountain:/\.fountain$/i.test(file.name)});
        if(!result.blocks.length)throw new Error('لا يوجد نص سيناريو قابل للاستيراد.');
        p=newProject(result.metadata.title||file.name.replace(/\.[^.]+$/,''));p.author=result.metadata.author||'';p.blocks=result.blocks;p=validateProject(p);
      }
      if(addProject(p))toast(result?.warning||'تم استيراد السيناريو في مشروع مستقل.');
    }catch(e){toast(e instanceof SyntaxError?'ملف JSON غير صالح؛ لم تُستبدل مشاريعك.':e.message,true);}finally{e.target.value='';}
  });
  $('#saveSnapshot').addEventListener('click',async()=>{if(busy)return;const name=await confirmAction({title:'حفظ نسخة المسودة',text:'اختر اسماً يوضح المرحلة أو سبب التعديل.',input:true,initial:`مسودة ${current().snapshots.length+1}`,label:'حفظ النسخة'});if(name){snapshot(current(),name);saveNow();renderReview();toast('تم حفظ نسخة المسودة.');}});
  $('#confirmAccept').addEventListener('click',()=>$('#confirmDialog').close('ok'));
  $('#settingsButton').addEventListener('click',settings);$('#storySettings').addEventListener('click',settings);
  $('#keyForm').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const value=$('#apiKey').value;$('#apiKey').value='';$('#connectButton').disabled=true;$('#connectionMessage').textContent='جارٍ التحقق من المفتاح والنماذج المتاحة…';
    try{models=await ai.connect(value);$('#modelInput').innerHTML=models.map(m=>`<option value="${esc(m.name)}">${esc(m.label)}</option>`).join('');$('#modelInput').value=ai.model;$('#modelField').classList.remove('hidden');$('#connectionMessage').textContent='تم الاتصال. اختر نموذج الكتابة ثم أغلق الإعدادات. المفتاح محفوظ في ذاكرة الصفحة حتى إغلاقها.';toast('الكاتب المساعد متصل.');}
    catch(e){$('#connectionMessage').textContent=e.message;toast(e.message,true);}
    finally{$('#connectButton').disabled=false;updateConnection();}
  });
  $('#disconnectButton').addEventListener('click',()=>{ai.disconnect();$('#apiKey').value='';$('#modelField').classList.add('hidden');$('#connectionMessage').textContent='تم قطع الاتصال ومسح المفتاح من ذاكرة الكاتب.';updateConnection();});
  $('#modelInput').addEventListener('change',e=>{const m=models.find(m=>m.name===e.target.value);if(m)ai.select(m.name,m.limit);});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveNow();toast('تم طلب حفظ المشروع على جهازك.');}if(e.key==='Escape')$('#sidebar').classList.remove('open');});
  window.addEventListener('beforeunload',saveNow);
  window.addEventListener('resize',()=>{if(currentView==='editor')$$('#blocksEditor textarea').forEach(autoSize);});
}
load();await loadCatalog();initEvents();storyUI=makeStoryUI({current,save:scheduleSave,toast,isBusy:()=>busy,checkpoint:name=>snapshot(current(),name),manualPlan,develop:developStory,copyPrompt:()=>copyText(promptForFoundation(current())),showEditor:()=>showView('editor')});cinemaUI=makeCinemaUI({current,save:scheduleSave,toast,isBusy:()=>busy,checkpoint:name=>snapshot(current(),name),copy:copyText,download:value=>download(value,fileName()+'-cinematic.txt'),print:printCinema,openScene:focusBlock});focusedId=current().blocks[0]?.id;renderMeta();showView('story');updateConnection();

