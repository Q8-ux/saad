const $ = id => document.getElementById(id);
let current = {}, active = 'العنوان', currentProjectId = null;
const clean = value => String(value || '').trim();

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 2500);
}
function readProjects() {
  try {
    const rows = JSON.parse(localStorage.getItem('ytProjects') || '[]');
    return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : [];
  } catch { return []; }
}
function projectFields() {
  return Object.fromEntries(['topic','niche','keyword','aud','format','duration','proof'].map(id => [id, $(id).value]));
}
function showResults(kind = 'خطة', saveMessage = '') {
  $('editor').hidden = true;
  $('output').hidden = false;
  $('saveOutput').hidden = true;
  $('editOutput').hidden = false;
  $('copy').hidden = false;
  if (!Object.hasOwn(current, active)) active = Object.keys(current)[0] || 'العنوان';
  renderTabs();
  $('output').textContent = current[active] || '';
  $('results').classList.add('show');
  $('mTitle').textContent = String(current['العنوان'] || '').length;
  $('mKey').textContent = kind;
  $('mHook').textContent = 'للمراجعة';
  $('score').textContent = 'مسودة';
  $('c1').textContent = clean($('topic').value) ? 'محدد' : 'بحاجة لتحديد';
  $('c2').textContent = 'لم يُختبر';
  $('c3').textContent = clean($('proof').value) ? 'قدّمه المستخدم' : 'لا توجد إحصاءات';
  $('c4').textContent = kind;
  $('resultState').textContent = 'حزمة تخطيط قابلة للتعديل. لم يُنتج صوت أو فيديو ولم يتم النشر على يوتيوب.';
  if (saveMessage) $('workflowStatus').textContent = saveMessage;
  $('results').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderTabs() {
  $('tabs').replaceChildren();
  for (const name of Object.keys(current)) {
    const button = document.createElement('button');
    button.className = 'tab' + (name === active ? ' active' : '');
    button.textContent = name;
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected', String(name === active));
    button.onclick = () => {
      if (!$('editor').hidden) {
        current[active] = $('editor').value;
        save({title:current['العنوان']});
      }
      active = name;
      showResults($('mKey').textContent);
    };
    $('tabs').appendChild(button);
  }
}
function save(project = {}) {
  const fields = projectFields();
  currentProjectId = project.id || currentProjectId || (globalThis.crypto?.randomUUID?.() || String(Date.now()));
  const record = {...project, id:currentProjectId, fields, topic:fields.topic, niche:fields.niche,
    key:fields.keyword, title:project.title || current['العنوان'] || fields.topic,
    date:new Date().toLocaleDateString('ar-KW'), outputs:{...current}};
  const records = [record, ...readProjects().filter(row => row.id !== record.id)].slice(0, 20);
  try { localStorage.setItem('ytProjects', JSON.stringify(records)); }
  catch { notify('النتيجة جاهزة، لكن المتصفح منع الحفظ. يمكنك تصدير الحزمة.'); }
  renderHistory();
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function renderHistory() {
  const records = readProjects(), box = $('history');
  box.replaceChildren();
  if (!records.length) {
    box.innerHTML = '<div class="empty">لا توجد مشاريع بعد. شغّل التجربة أو جهّز أول حزمة.</div>';
    return;
  }
  records.forEach(record => {
    const row = document.createElement('div'); row.className = 'item';
    const description = document.createElement('div');
    const title = document.createElement('b'); title.textContent = record.title || record.topic || 'مشروع محفوظ';
    const note = document.createElement('small'); note.textContent = `${record.niche || ''} · ${record.date || ''}`;
    description.append(title,note);
    const open = document.createElement('button'); open.textContent = 'إعادة فتح';
    open.onclick = () => {
      currentProjectId = record.id || null;
      const fields = record.fields || {topic:record.topic,niche:record.niche,keyword:record.key};
      for (const [id,value] of Object.entries(fields)) if ($(id) && value != null) $(id).value = String(value);
      if (record.outputs && typeof record.outputs === 'object') {
        current = Object.fromEntries(Object.entries(record.outputs).filter(([,value]) => typeof value === 'string'));
        active = 'العنوان'; showResults('محفوظة','فُتح المشروع المحفوظ مع النصوص والتعديلات.');
      } else { window.scrollTo({top:0,behavior:'smooth'}); notify('فُتحت بيانات المشروع القديم؛ اضغط تجهيز حزمة الفيديو.'); }
    };
    row.append(description,open); box.appendChild(row);
  });
}
function build() {
  const topic=clean($('topic').value),niche=clean($('niche').value),key=clean($('keyword').value);
  if (!topic || !niche || !key) { notify('أدخل الموضوع والمجال والكلمة المفتاحية، أو شغّل التجربة الجاهزة.'); $('topic').focus(); return; }
  currentProjectId = null;
  current = {
    'العنوان':`${key}: ${topic}`,
    'خطة السكربت':`الموضوع: ${topic}\nالجمهور: ${$('aud').value}\nالمدة المستهدفة: ${$('duration').value} دقيقة (تقديرية).\n\nالافتتاحية المقترحة:\nما الذي يتغيّر عندما تطبّق ${topic}؟ ابدأ بمثال أصلي يبيّن الفرق.\n\n1. وضّح السؤال الذي ستجيب عنه.\n2. اعرض مثالًا عمليًا من عملك.\n3. فسّر الخطوات وما الذي يمكن أن يتعثر فيها.\n4. اختبر النتيجة أمام المشاهد.\n5. اختم بتمرين يستطيع تنفيذه.\n\nهذه خطة محلية تحتاج كتابة التفاصيل. لتوليد نص مخصص استخدم الربط الذكي، أو افتح التجربة الكاملة.`,
    'خطة اللقطات':`1. افتتاحية مرتبطة بـ ${topic}.\n2. لقطة توضح المشكلة.\n3. شرح المثال خطوة بخطوة.\n4. نتيجة أو مقارنة أصلية.\n5. بطاقة التمرين النهائي.\n\nتُحدد الأوقات الفعلية بعد التسجيل.`,
    'الوصف':`${topic}\n\nشرح عملي في ${niche} موجّه إلى ${$('aud').value}.\n\n#${key.replace(/\s+/g,'_')}`,
    'الهاشتاقات والوسوم':[key,niche,topic].join('، '),
    'برومبت الصورة':`تصوّر لصورة 16:9: عنصر واحد يعبّر عن ${key}، تباين واضح، ونص عربي قصير من كلمتين إلى أربع كلمات. يُنتج الأصل في مرحلة التصميم.`,
    'تدقيق الفكرة':'الحزمة الحالية خطة محلية. لم تُقَس المنافسة أو نسبة النقر أو الأرباح. اختبر الوعد والمثال قبل التسجيل، واستخدم بيانات القناة الفعلية بعد النشر.'
  };
  active='العنوان'; showResults('خطة محلية','جُهّزت خطة محلية. التجربة الكاملة تحتوي نصًا أصليًا جاهزًا للمراجعة.'); save();
}
function runDemo() {
  try {
    const brief = JSON.parse($('demoData').textContent);
    currentProjectId = 'youtube-scene-opening-demo';
    $('topic').value='كيف تبدأ مشهدًا يشدّ المشاهد؟'; $('niche').value='كتابة السيناريو';
    $('keyword').value='بناء المشهد'; $('aud').value='صنّاع المحتوى'; $('duration').value='2.5'; $('proof').value='';
    let time=0;
    const board=brief.scenes.map((scene,index) => {
      const start=time; time+=scene.duration_seconds;
      return `${index+1}. ${start}–${time} ثانية (تقديري)\n${scene.visual}`;
    }).join('\n\n');
    current={
      'العنوان':brief.title,
      'السكربت الكامل':brief.scenes.map((scene,index)=>`المقطع ${index+1}\n${scene.narration}`).join('\n\n'),
      'خطة اللقطات':board,
      'عناوين بديلة':brief.title_options.map((title,index)=>`${index+1}. ${title}`).join('\n\n'),
      'الوصف':brief.description,
      'الهاشتاقات والوسوم':brief.tags.join('، '),
      'الصور المصغرة':brief.thumbnails.map((item,index)=>`${index+1}. ${item.text}\n${item.concept}`).join('\n\n'),
      'خطة النشر':'1. تسجيل النص وقياس المدة الفعلية.\n2. إنتاج اللقطات والرسوم الأصلية.\n3. المونتاج وفحص الصوت والعربية.\n4. إعداد الصورة والعنوان من النسخة النهائية.\n5. تحديد القناة والخصوصية ثم النشر عند طلبه.\n\nلا توجد قناة متصلة في هذه التجربة.'
    };
    active='السكربت الكامل'; showResults('تجربة كاملة','تم تشغيل التجربة: 7 مقاطع، 150 ثانية تقديرية، وسكربت قابل للتعديل.'); save({id:currentProjectId});
  } catch (error) { notify('تعذر فتح بيانات التجربة. أعد تحميل الصفحة.'); console.error(error); }
}
function downloadFile(name, content, type) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a'); link.href=url; link.download=name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function captureEdit() {
  if (!$('editor').hidden) { current[active]=$('editor').value; save(); }
}
$('generate').onclick=build;
$('runDemo').onclick=runDemo;
$('newProject').onclick=()=>{captureEdit();currentProjectId=null;current={};active='العنوان';for(const id of ['topic','niche','keyword','proof'])$(id).value='';$('results').classList.remove('show');$('workflowStatus').textContent='أدخل موضوعك لتجهيز خطة جديدة؛ المشاريع المحفوظة متاحة في الأسفل.';$('topic').focus();$('topic').scrollIntoView({behavior:'smooth',block:'center'});};
$('editOutput').onclick=()=>{$('editor').value=current[active]||'';$('editor').hidden=false;$('output').hidden=true;$('copy').hidden=true;$('editOutput').hidden=true;$('saveOutput').hidden=false;$('editor').focus();};
$('saveOutput').onclick=()=>{captureEdit();showResults($('mKey').textContent);notify('تم حفظ التعديل.');};
$('exportMarkdown').onclick=()=>{captureEdit();downloadFile('youtube-production-pack.md',Object.entries(current).map(([key,value])=>`# ${key}\n\n${value}`).join('\n\n'),'text/markdown;charset=utf-8');};
$('exportJson').onclick=()=>{captureEdit();downloadFile('youtube-production-pack.json',JSON.stringify({schema_version:1,status:'planning_only',video_rendered:false,published:false,fields:projectFields(),outputs:current},null,2),'application/json;charset=utf-8');};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(current[active]||'');notify('تم النسخ.');}catch{notify('تعذر النسخ التلقائي؛ يمكنك تحديد النص ونسخه أو تصديره.');}};
renderHistory();
