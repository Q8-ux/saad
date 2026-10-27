import {normalize, readDream, readingText, searchRows, validateCorpus, validateDraft} from './engine.mjs';

const $ = id => document.getElementById(id);
const categories = {quran:'القرآن الكريم',hadith:'الحديث الصحيح',tafsir:'التفسير',fatwa:'الفتاوى والضوابط',heritage:'مصنفات التعبير',collection:'أبواب السنة',catalog:'فهارس المخطوطات'};
const statuses = {text_checked:'فُحص موضع النص',excerpt_checked:'فُحص مقتطف',index_checked:'مدخل بحث',catalog_only:'فهرس فقط',attribution_disputed:'النسبة محل نقد'};
const kinds = {specific_witness:'شاهد في رؤيا خاصة',quran_story:'شاهد من قصة قرآنية',no_direct_evidence:'لا دليل خاص في النواة'};
const basisLabels = {textual:'دلالة نصية',inference:'استنباط سياقي',product_policy:'ضابط للمنصة'};
const feelingLabels = {calm:'طمأنينة أو سرور',afraid:'فزع أو ضيق',unsure:'غير متأكد'};
const STORAGE = 'ruya.journal.v1';
let corpus, currentReading = null, sourceFilter = 'all', ruleFilter = 'all', symbolFilter = 'all', drafts = [], recognition = null, speaking = false, toastTimer;

function el(tag, text = '', className = '') {
  const node = document.createElement(tag);
  if (text !== null && text !== '') node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, onClick, className = 'secondary') {
  const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', onClick); return node;
}
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => {$('toast').hidden = true;}, 5500); }
function safeLink(text, url, className = '') {
  const parsed = new URL(url); if (parsed.protocol !== 'https:') throw new Error('Unsafe link');
  const a = el('a', text, className); a.href = parsed.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
function download(name, content, type='text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], {type})); const a = el('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function downloadJSON(name, value) { download(name, JSON.stringify(value, null, 2), 'application/json;charset=utf-8'); }
function sourceById(id) { return corpus.sources.find(s => s.id === id); }
function sourceButtons(refs) {
  const wrap = el('div', '', 'source-buttons');
  for (const id of refs) {const s = sourceById(id); if (s) wrap.append(button(s.locator, () => openSource(id), 'source-button'));}
  return wrap;
}
function openSource(id) {
  const s = sourceById(id); if (!s) return;
  const wrap = el('article', '', 'dialog-content');
  wrap.append(el('span', categories[s.category], 'badge'), el('h2', s.title)); wrap.querySelector('h2').id = 'source-dialog-title';
  wrap.append(el('p', s.summary));
  const dl = el('dl');
  for (const [key, value] of [['الموضع',s.locator],['المؤلف/الجهة',s.author || 'راجع الأصل'],['حالة الفحص',statuses[s.verification]],['آخر مراجعة',s.reviewed_at],['المراجعة العلمية','لم تحصل على مراجعة شرعية مستقلة'],['الاستخدام',s.use === 'excluded' ? 'مستبعد من القراءة' : s.use === 'research' ? 'للبحث، وليس للتطبيق الآلي' : 'للتعليم والاستدلال مع بيان الحدود']]) dl.append(el('dt',key),el('dd',value));
  wrap.append(dl); if (s.caveat) wrap.append(el('p', s.caveat, 'caveat'));
  wrap.append(el('p', 'ملخص تحريري؛ لا يُعد نصاً حرفياً للمصدر. الفحص لا يعني صحة تنزيل التأويل على الرائي.'), safeLink('افتح موضع المصدر ↗', s.url, 'primary'), safeLink(s.url, s.url, 'external-url'));
  $('source-dialog-content').replaceChildren(wrap); $('source-dialog').showModal();
}

function renderFilters(id, entries, selected, callback) {
  const wrap = $(id); wrap.replaceChildren();
  for (const [key, label] of entries) {const b = button(label, () => callback(key), ''); b.setAttribute('aria-pressed',String(key === selected)); wrap.append(b);}
}
function emptyState(title, body, action) {
  const box = el('div','','empty'); box.append(el('h2',title),el('p',body)); if (action) box.append(action); return box;
}
function renderSources() {
  renderFilters('source-filters', [['all','الكل'],...Object.entries(categories)], sourceFilter, key => {sourceFilter = key; renderSources();});
  let rows = sourceFilter === 'all' ? corpus.sources : corpus.sources.filter(s => s.category === sourceFilter);
  rows = searchRows(rows, $('source-search').value, ['title','author','locator','summary']);
  $('source-status').textContent = `${rows.length.toLocaleString('ar-KW')} مرجعاً وإحالة — تعرض الحالة مدى ما فُحص، وليس اعتماداً شرعياً.`;
  $('source-list').replaceChildren();
  for (const s of rows) {
    const card = el('article','','source-card'); const meta = el('div','','source-meta');
    meta.append(el('span',categories[s.category]), el('span',s.use === 'excluded' ? 'مستبعد' : statuses[s.verification], s.use === 'excluded' || s.verification === 'catalog_only' ? 'badge warn' : 'badge neutral'));
    card.append(meta, el('h2',s.title), el('p',s.summary), el('small',s.locator),button('اعرض بطاقة المصدر ↗',()=>openSource(s.id),'text-link'));
    $('source-list').append(card);
  }
  if (!rows.length) $('source-list').append(emptyState('لم نجد مرجعاً بهذه العبارة','جرّب كلمة أقصر، مثل «يوسف» أو «مسلم»، أو أعد عرض جميع المصادر.',button('مسح البحث',()=>{$('source-search').value='';sourceFilter='all';renderSources();})));
}
function renderRules() {
  renderFilters('rule-filters',[['all','الكل'],...[...new Set(corpus.rules.map(r=>r.category))].map(c=>[c,c])],ruleFilter,key=>{ruleFilter=key;renderRules();});
  let rows = ruleFilter === 'all' ? corpus.rules : corpus.rules.filter(r=>r.category===ruleFilter);
  rows = searchRows(rows,$('rule-search').value,['title','explanation','category']);
  $('rule-status').textContent = `${rows.length.toLocaleString('ar-KW')} قاعدة — انظر نوع القاعدة قبل نسبة مضمونها إلى النص.`;
  $('rule-list').replaceChildren();
  for (const r of rows) {const card = el('article','','rule-card');const meta=el('div','','source-meta');meta.append(el('span',r.category),el('span',basisLabels[r.basis],'badge neutral'));card.append(meta,el('h2',r.title),el('p',r.explanation),sourceButtons(r.source_refs));$('rule-list').append(card);}
  if (!rows.length) $('rule-list').append(emptyState('لا توجد قاعدة بهذه العبارة','جرّب «المنام» أو «السياق»، أو امسح البحث.',button('مسح البحث',()=>{$('rule-search').value='';ruleFilter='all';renderRules();})));
}
function renderSymbols() {
  renderFilters('symbol-filters',[['all','الكل'],...Object.entries(kinds)],symbolFilter,key=>{symbolFilter=key;renderSymbols();});
  let rows = symbolFilter === 'all' ? corpus.symbols : corpus.symbols.filter(s=>s.kind===symbolFilter);
  rows = searchRows(rows,$('symbol-search').value,['name','terms','evidence']);
  $('symbol-status').textContent = `${rows.length.toLocaleString('ar-KW')} مدخلاً — عدم وجود دليل خاص يُصرَّح به؛ ولا يُستبدل بتخمين.`;
  $('symbol-list').replaceChildren();
  for (const s of rows) {
    const card = el('article','','symbol-card'); card.append(el('h2',s.name),el('span',kinds[s.kind],s.kind==='no_direct_evidence'?'badge warn':'badge'),el('h3','ماذا ورد؟'),el('p',s.evidence),el('h3','حدود الاستئناس'),el('p',s.possibility),el('p',s.questions[0],'symbol-caveat'),sourceButtons(s.source_refs));$('symbol-list').append(card);
  }
  if (!rows.length) $('symbol-list').append(emptyState('هذا الرمز غير مفهرس هنا','النواة لا تشمل كل الرموز. صف السياق في القراءة، أو ابحث عن لفظ قريب.',button('مسح البحث',()=>{$('symbol-search').value='';symbolFilter='all';renderSymbols();})));
}
function renderMaps() {
  for (const map of corpus.visual_library.cards) {
    const card = el('article','','visual-card');card.append(el('h2',map.title),el('p',map.summary));
    const steps=el('div','','map-steps');for(const [i,item] of map.items.entries()){const step=el('div','','map-step');const text=el('div');text.append(el('strong',item.label),el('p',item.body));step.append(el('span',String(i+1).padStart(2,'0')),text);steps.append(step);}
    card.append(steps,el('p',map.action,'visual-action'),sourceButtons(map.source_refs));$('visual-maps').append(card);
  }
}
function renderLibrarySummary() {
  const entries=[[corpus.sources.filter(s=>s.category==='quran').length,'موضعاً قرآنياً'],[corpus.sources.filter(s=>s.category==='hadith').length,'حديثاً من الصحيحين'],[corpus.rules.length,'قاعدة ومنهجاً'],[corpus.historical_mentions.length,'إحالة تاريخية محجوزة']];
  for(const [count,label] of entries){const n=el('div','','summary-item');n.append(el('strong',String(count)),el('span',label));$('library-summary').append(n);}
  $('source-count').textContent=String(corpus.sources.length);$('historical-count').textContent=String(corpus.historical_mentions.length)+' عنواناً';
  for(const h of corpus.historical_mentions){const box=el('div','','historical-item');box.append(el('strong',h.title),el('p',h.attribution),el('p','ذكر تاريخي فقط؛ لم تتحقق النسخة أو النسبة.'));$('historical-list').append(box);}
}

function renderReading(result, scroll=true) {
  currentReading=result; const wrap=$('result');wrap.replaceChildren();wrap.hidden=false;
  const head=el('div','','result-header');head.append(el('span','النتيجة وحدودها','eyebrow'),el('h2',result.title),el('p','مطابقة محلية لشواهد محررة • ليست مراجعة معبّر أو فتوى'));head.querySelector('h2').tabIndex=-1;wrap.append(head);
  if(result.nightmare){const n=el('section','','nightmare-panel');n.append(el('h3',result.nightmare.title),el('p',result.nightmare.text));const list=el('ol');result.nightmare.steps.forEach(t=>list.append(el('li',t)));n.append(list,sourceButtons(result.nightmare.source_refs));wrap.append(n);}
  for(const note of result.notes){const n=el('section','','result-note');n.append(el('h3',note.title),el('p',note.text),sourceButtons(note.source_refs));wrap.append(n);}
  if(result.evidence.length){wrap.append(el('h3','ما الشواهد المرتبطة بالكلمات؟','source-list-title'));for(const s of result.evidence){const n=el('section','','result-witness');n.append(el('span',kinds[s.kind],s.kind==='no_direct_evidence'?'badge warn':'badge'),el('h3',s.name),el('p',s.evidence));const p=el('p');p.append(el('strong','وجه الاستئناس وحدوده: '),document.createTextNode(s.possibility));n.append(p,sourceButtons(s.source_refs));wrap.append(n);}}
  if(result.questions.length){const q=el('section','','result-questions');q.append(el('h3','أسئلة تساعد على التثبّت'));const ul=el('ul');result.questions.forEach(t=>ul.append(el('li',t)));q.append(ul);wrap.append(q);}
  wrap.append(el('p',result.conclusion,'result-conclusion'),el('h3','المراجع المستخدمة','source-list-title'));
  const refs=el('ol','','result-sources');for(const id of result.source_refs){const s=sourceById(id);if(s){const li=el('li');li.append(safeLink(`${s.title} — ${s.locator} ↗`,s.url));refs.append(li);}}wrap.append(refs);
  const actions=el('div','','result-actions');
  actions.append(button('حفظ على جهازي',()=>saveReading(result)),button('تنزيل القراءة TXT',()=>download('ruya-reading.txt',readingText(result,corpus))),button('نسخ القراءة',async()=>{try{await navigator.clipboard.writeText(readingText(result,corpus));toast('نُسخت القراءة مع مراجعها.');}catch{toast('تعذر النسخ. يمكنك تنزيل القراءة ملفاً نصياً.');}}),button('استمع للقراءة',()=>speakReading(result)),button('طباعة / PDF',()=>window.print()));
  wrap.append(actions);
  if(scroll){wrap.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});head.querySelector('h2').focus({preventScroll:true});}
}

function readJournal() {
  try {
    const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');
    if(!Array.isArray(data)||data.some(r=>!r||typeof r.id!=='string'||r.result?.schema_version!==1||typeof r.result?.input?.text!=='string')) throw new Error('Invalid local journal');
    return data;
  } catch {toast('تعذر قراءة الدفتر في هذا المتصفح. لم تُحذف البيانات؛ قد تحتاج إلى استعادتها من نسخة مصدّرة.');return null;}
}
function saveReading(result) {
  const data=readJournal();if(!data)return;
  if(data.some(r=>r.result.created_at===result.created_at)){toast('هذه القراءة محفوظة بالفعل.');return;}
  try{const id=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;data.unshift({id,saved_at:new Date().toISOString(),result});localStorage.setItem(STORAGE,JSON.stringify(data));toast('حُفظت القراءة في هذا المتصفح فقط.');}catch{toast('تعذر الحفظ؛ ربما لا تتوافر مساحة أو لا يسمح المتصفح بالتخزين. نزّل نسخة نصية.');}
}
function renderJournal() {
  const wrap=$('journal-list');wrap.replaceChildren();const rows=readJournal();if(!rows){wrap.append(emptyState('الدفتر غير متاح','تعذر الوصول إلى التخزين المحلي. يمكنك استخدام القراءة وتنزيل نتيجتها.'));return;}
  $('export-journal').disabled=!rows.length;$('clear-journal').disabled=!rows.length;
  if(!rows.length){wrap.append(emptyState('مساحتك تبدأ بقراءة واحدة','لن تجد هنا شيئاً ما لم تضغط «حفظ على جهازي» بعد القراءة.',button('اكتب منامك',()=>{location.hash='read';})));return;}
  for(const row of rows){const box=el('article','','journal-card');const time=el('time',new Date(row.saved_at).toLocaleString('ar-KW',{timeZone:'Asia/Kuwait'}));time.dateTime=row.saved_at;
    box.append(el('h2',row.result.title),time,el('p',row.result.input.text));const actions=el('div','','button-row');actions.append(button('فتح القراءة',()=>{location.hash='read';$('dream').value=row.result.input.text;['feeling','daytime','repeated'].forEach(key=>{$(key).value=row.result.input[key]||'unsure';});updateCount();renderReading(row.result);}),button('تنزيل TXT',()=>download('ruya-reading.txt',readingText(row.result,corpus))),button('حذف',()=>{const all=readJournal();if(!all)return;try{localStorage.setItem(STORAGE,JSON.stringify(all.filter(r=>r.id!==row.id)));renderJournal();toast('حُذفت القراءة.');}catch{toast('تعذر حذف القراءة.');}},'danger-button'));box.append(actions);wrap.append(box);
  }
}
function updateCount(){ $('char-count').textContent=$('dream').value.length.toLocaleString('ar-KW')+' حرف'; }

function stopSpeech(){if('speechSynthesis'in window)window.speechSynthesis.cancel();speaking=false;}
function speakReading(result) {
  if(!('speechSynthesis'in window)){toast('القراءة الصوتية غير متاحة في هذا المتصفح.');return;}
  if(speaking){stopSpeech();toast('توقفت القراءة الصوتية.');return;}
  const voices=speechSynthesis.getVoices();const voice=voices.find(v=>/^ar[-_]KW/i.test(v.lang))||voices.find(v=>/^ar/i.test(v.lang));
  if(!voice){toast('لا يوجد صوت عربي متاح حالياً على جهازك. يمكنك تثبيت صوت عربي من إعدادات النظام.');return;}
  const text=[result.title,...(result.nightmare?.steps||[]),...result.notes.map(n=>n.text),...result.evidence.map(s=>s.evidence+' '+s.possibility),result.conclusion].join('. ');
  const speech=new SpeechSynthesisUtterance(text);speech.lang=voice.lang;speech.voice=voice;speech.rate=.93;speech.onend=()=>{speaking=false;};speech.onerror=()=>{speaking=false;toast('توقفت القراءة الصوتية.');};speaking=true;speechSynthesis.speak(speech);toast('بدأت القراءة. اضغط «استمع للقراءة» مجدداً لإيقافها.');
}
function setupVoice() {
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  $('voice').addEventListener('click',()=>{
    if(!Recognition){toast('الإملاء الصوتي غير مدعوم هنا. استخدم ميكروفون لوحة مفاتيح هاتفك داخل حقل النص.');return;}
    if(recognition){recognition.stop();return;}
    const r=new Recognition();recognition=r;r.lang='ar-KW';r.continuous=false;r.interimResults=true;
    const original=$('dream').value;
    r.onstart=()=>{$('voice').classList.add('recording');$('voice').setAttribute('aria-pressed','true');$('voice-label').textContent='إيقاف التسجيل';toast('بدأ الإملاء. خدمة المتصفح قد تعالج الصوت خارج جهازك.');};
    r.onresult=e=>{let text='';for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';$('dream').value=[original,text.trim()].filter(Boolean).join('\n');updateCount();};
    r.onerror=e=>{const messages={'not-allowed':'لم يُسمح للميكروفون. فعّله من إعدادات الموقع أو استخدم لوحة المفاتيح.','audio-capture':'لم نعثر على ميكروفون متاح.','no-speech':'لم يُلتقط كلام واضح. حاول مجدداً.','network':'تعذر الاتصال بخدمة الإملاء التابعة للمتصفح.'};toast(messages[e.error]||'تعذر إكمال الإملاء الصوتي. يمكنك الكتابة.');};
    r.onend=()=>{recognition=null;$('voice').classList.remove('recording');$('voice').setAttribute('aria-pressed','false');$('voice-label').textContent='إملاء صوتي';};
    try{r.start();}catch{recognition=null;toast('تعذر بدء الميكروفون؛ جرّب الكتابة أو إملاء لوحة المفاتيح.');}
  });
}
function route() {
  const raw=location.hash.slice(1)||'read';if(raw==='main')return;if(raw==='dream-form'){if($('view-read').hidden){location.hash='read';}return;}
  const name=['read','library','rules','symbols','journal','method'].includes(raw)?raw:'read';
  for(const v of document.querySelectorAll('.view'))v.hidden=v.id!==`view-${name}`;
  for(const link of document.querySelectorAll('[data-nav]')){if(link.dataset.nav===name)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  if(name==='journal')renderJournal();if(recognition)recognition.stop();stopSpeech();
  const titles={read:'لكل رؤيا سياق، ولكل تأويل أصل',library:'مكتبة المصادر',rules:'أصول التعبير',symbols:'دليل الرموز',journal:'دفتر رؤاي',method:'المنهج والخصوصية'};document.title=`رؤيا | ${titles[name]}`;
  window.scrollTo({top:0,behavior:'instant'});
}
function setupEvents() {
  window.addEventListener('hashchange',route);$('dream').addEventListener('input',updateCount);
  $('dream-form').addEventListener('submit',e=>{e.preventDefault();$('form-error').hidden=true;try{stopSpeech();if(recognition)recognition.stop();const result=readDream({text:$('dream').value,feeling:$('feeling').value,daytime:$('daytime').value,repeated:$('repeated').value},corpus);renderReading(result);}catch(error){$('form-error').textContent=error.message;$('form-error').hidden=false;$('dream').focus();}});
  $('dream-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{$('dream').value=(await file.text()).replace(/^\uFEFF/,'');updateCount();toast('فُتح الملف في الحقل دون رفعه. راجع النص قبل القراءة.');}catch{toast('تعذر فتح الملف. استخدم ملف TXT بترميز UTF-8.');}e.target.value='';});
  $('source-search').addEventListener('input',renderSources);$('rule-search').addEventListener('input',renderRules);$('symbol-search').addEventListener('input',renderSymbols);
  $('download-corpus').addEventListener('click',()=>downloadJSON('ruya-corpus.json',corpus));
  document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>openSource(b.dataset.source)));
  $('close-dialog').addEventListener('click',()=>$('source-dialog').close());
  for(const dialog of [$('source-dialog'),$('confirm-dialog')])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('export-journal').addEventListener('click',()=>{const rows=readJournal();if(rows)downloadJSON('ruya-journal.json',{schema_version:1,exported_at:new Date().toISOString(),readings:rows});});
  $('clear-journal').addEventListener('click',()=>$('confirm-dialog').showModal());$('cancel-clear').addEventListener('click',()=>$('confirm-dialog').close());$('confirm-clear').addEventListener('click',()=>{try{localStorage.removeItem(STORAGE);$('confirm-dialog').close();renderJournal();toast('حُذفت جميع المحفوظات من هذا المتصفح.');}catch{toast('تعذر حذف الدفتر.');}});
  $('draft-template').addEventListener('click',()=>downloadJSON('ruya-source-template.json',{title:'عنوان المصدر الحقيقي',locator:'اسم الكتاب والطبعة ورقم الصفحة أو الحديث',summary:'ملخص محرر مع حدود الاستدلال',url:'https://example.org/source'}));
  $('draft-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{drafts.push(...validateDraft(await file.text()));$('draft-list').replaceChildren();for(const d of drafts){const card=el('article','','draft-item');card.append(el('span','مسودة غير معتمدة','badge warn'),el('h3',d.title),el('p',d.summary),el('p',d.locator),safeLink('فتح المرجع ↗',d.url,'text-link'));$('draft-list').append(card);}$('export-drafts').hidden=false;toast('استُقبلت المسودات لهذه الجلسة فقط. لم تدخل في محرك القراءة.');}catch(error){toast(error.message);}e.target.value='';});
  $('export-drafts').addEventListener('click',()=>downloadJSON('ruya-research-drafts.json',drafts));
  for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{if(b.dataset.example==='milk'){$('dream').value='هذا مثال تعليمي: رأيت أني أشرب لبناً في مكان هادئ ثم تحدثت مع معلم أعرفه.';$('feeling').value='calm';$('daytime').value='yes';}else{$('dream').value='هذا مثال تعليمي: رأيت أني أسقط من مكان مرتفع ثم استيقظت فزعاً.';$('feeling').value='afraid';$('daytime').value='unsure';}$('repeated').value='unsure';updateCount();$('dream').focus();$('dream-form').scrollIntoView({block:'start'});toast('هذا نص تعليمي للتجربة، وليس رؤيا حقيقية.');});
  $('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-label',dark?'تفعيل الوضع النهاري':'تفعيل الوضع الليلي');try{localStorage.setItem('ruya.theme',dark?'dark':'light');}catch{}});
  setupVoice();
}

try {
  try{const theme=localStorage.getItem('ruya.theme');if(theme==='dark'){document.documentElement.dataset.theme='dark';$('theme').setAttribute('aria-label','تفعيل الوضع النهاري');}}catch{}
  const response=await fetch(new URL('./corpus.json',import.meta.url));if(!response.ok)throw new Error('لا يمكن تحميل مكتبة المصادر حالياً. أعد تحميل الصفحة بعد قليل.');
  corpus=await response.json();const errors=validateCorpus(corpus);if(errors.length)throw new Error('تعذر التحقق من ترابط قاعدة المصادر. أوقفنا القراءة إلى أن تُراجع البيانات.');
  renderLibrarySummary();renderSources();renderRules();renderSymbols();renderMaps();setupEvents();route();updateCount();
} catch(error) { $('boot-error').hidden=false;$('boot-error').textContent=error.message;$('read-button').disabled=true; }
