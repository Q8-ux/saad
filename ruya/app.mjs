import {normalize, readDream, readingText, searchRows, validateCorpus, validateDraft} from './engine.mjs?v=20261028-3';

const BUILD_ID = '20261028-3';

const $ = id => document.getElementById(id);
const categories = {quran:'القرآن الكريم',hadith:'الحديث الصحيح',tafsir:'التفسير',fatwa:'الفتاوى والضوابط',heritage:'مصنفات التعبير',collection:'أبواب السنة',catalog:'فهارس المخطوطات'};
const statuses = {text_checked:'فُحص موضع النص',excerpt_checked:'فُحص مقتطف',index_checked:'مدخل بحث',catalog_only:'فهرس فقط',attribution_disputed:'النسبة محل نقد',manuscript_record_checked:'فُحص سجل المخطوط',edition_record_checked:'فُحص سجل الطبعة'};
const kinds = {specific_witness:'شاهد في رؤيا خاصة',quran_story:'شاهد من قصة قرآنية',heritage_contextual:'قول تراثي مشروط',no_direct_evidence:'لا دليل خاص في النواة'};
const basisLabels = {textual:'دلالة نصية',inference:'استنباط سياقي',product_policy:'ضابط للمنصة'};
const feelingLabels = {calm:'طمأنينة أو سرور',afraid:'فزع أو ضيق',unsure:'غير متأكد'};
const actorLabels = {self:'الرائي',other:'شخص آخر',unspecified:'غير محدد'};
const modeLabels = {interpretation:'توجد قراءة محتملة',curated_local:'توجد قراءة محتملة',nightmare_etiquette:'أُوقفت القراءة الرمزية',insufficient_context:'السياق غير مكتمل',safety_abstention:'امتناع احترازي',no_supported_reading:'لا توجد قراءة مسندة كافية'};
const modeDescriptions = {interpretation:'وجدنا مشهداً يطابق وجهاً محرراً، مع بقاء التنزيل احتمالياً.',nightmare_etiquette:'قُدّمت آداب المنام المكروه على البحث عن معنى مخيف.',insufficient_context:'ينقص وصف الفعل أو صفته ما يغيّر وجه القراءة، لذلك لم نخمن.',safety_abstention:'امتنعنا عن استنتاج غيب أو اتهام أو قرار حساس من المنام.',no_supported_reading:'لم نجد في النواة الحالية موضعاً خاصاً يطابق المشهد بما يكفي.'};
const sourceStrengthLabels = {verified_text:'نص ثابت الموضع',specific_witness:'شاهد صحيح في واقعة مخصوصة',attributed_heritage_text:'نقل تراثي محرر',heritage_report:'نقل تراثي محرر',contextual_inference:'استنباط سياقي',low:'محدودة',medium:'متوسطة',high:'قوية'};
const fitLabels = {none:'غير كافية',very_low:'ضعيفة جداً',low:'ضعيفة',limited:'محدودة',partial:'جزئية',contextual:'سياقية',medium:'متوسطة',high:'أقوى نسبياً'};
const coverageLabels = {none:'غير مكتملة',minimal:'قليلة',partial:'جزئية',medium:'متوسطة',complete:'مكتملة',full:'مكتملة',low:'قليلة',high:'جيدة'};
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
  wrap.append(el('span', categories[s.category] || 'سجل مصدر', 'badge'), el('h2', s.title)); wrap.querySelector('h2').id = 'source-dialog-title';
  wrap.append(el('p', s.summary));
  const dl = el('dl');
  for (const [key, value] of [['الموضع',s.locator],['المؤلف/الجهة',s.author || 'راجع الأصل'],['حالة الفحص',statuses[s.verification] || s.verification],['آخر مراجعة',s.reviewed_at],['المراجعة العلمية','لم تحصل على مراجعة شرعية مستقلة'],['الاستخدام',s.use === 'excluded' ? 'مستبعد من القراءة' : s.use === 'research' ? 'للبحث؛ ولا يُفعّل في القراءة إلا موضع محرر بعينه' : 'للتعليم والاستدلال مع بيان الحدود']]) dl.append(el('dt',key),el('dd',value));
  wrap.append(dl); if (s.caveat) wrap.append(el('p', s.caveat, 'caveat'));
  wrap.append(el('p', 'ملخص تحريري؛ لا يُعد نصاً حرفياً للمصدر. الفحص لا يعني صحة تنزيل التأويل على الرائي.'), safeLink('افتح موضع المصدر ↗', s.url, 'primary'), safeLink(s.url, s.url, 'external-url'));
  $('source-dialog-content').replaceChildren(wrap); $('source-dialog').showModal();
}

function renderFilters(id, entries, selected, callback) {
  const wrap = $(id); const restoreFocus=wrap.contains(document.activeElement);wrap.replaceChildren();
  for (const [key, label] of entries) {const b = button(label, () => callback(key), ''); b.setAttribute('aria-pressed',String(key === selected)); wrap.append(b);}
  if(restoreFocus)wrap.querySelector('[aria-pressed="true"]')?.focus();
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
    meta.append(el('span',categories[s.category] || 'مصدر'), el('span',s.use === 'excluded' ? 'مستبعد' : statuses[s.verification] || s.verification, s.use === 'excluded' || s.verification === 'catalog_only' ? 'badge warn' : 'badge neutral'));
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
    const card = el('article','','symbol-card'); card.append(el('h2',s.name),el('span',kinds[s.kind] || s.kind,s.kind==='no_direct_evidence'?'badge warn':'badge'),el('h3','ماذا ورد؟'),el('p',s.evidence),el('h3','حدود الاستئناس'),el('p',s.possibility),el('p',s.questions[0],'symbol-caveat'),sourceButtons(s.source_refs));$('symbol-list').append(card);
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

function resultActions(result) {
  const actions=el('div','','result-actions');
  actions.append(button('حفظ على جهازي',()=>saveReading(result)),button('تنزيل القراءة TXT',()=>download('ruya-reading.txt',readingText(result,corpus))),button('نسخ القراءة',async()=>{try{await navigator.clipboard.writeText(readingText(result,corpus));toast('نُسخت القراءة مع مراجعها.');}catch{toast('تعذر النسخ. يمكنك تنزيل القراءة ملفاً نصياً.');}}),button('استمع للقراءة',()=>speakReading(result)),button('طباعة / PDF',()=>window.print()));
  return actions;
}
function displayItem(item) {
  if(typeof item==='string')return item;
  if(item?.prompt)return item.impact?`${item.prompt} — ${item.impact}`:item.prompt;
  if(item?.reason)return item.matched?`${item.matched}: ${item.reason}`:item.title?`${item.title}: ${item.reason}`:item.reason;
  if(item?.label&&item?.value)return `${item.label}: ${item.value}`;
  if(item?.type&&item?.value)return `${item.type}: ${item.value}`;
  return item?.text || item?.summary || item?.title || item?.label || item?.matched || '';
}
function bulletSection(title, items, className='result-note') {
  const values=(items||[]).map(displayItem).filter(Boolean);if(!values.length)return null;
  const box=el('section','',className);box.append(el('h3',title));const ul=el('ul');values.forEach(value=>ul.append(el('li',value)));box.append(ul);return box;
}
function collectReadingRefs(result) {
  const trace=Array.isArray(result.source_trace)?result.source_trace:[];
  return [...new Set([...(result.source_refs||[]),...(result.nightmare?.source_refs||[]),...(result.notes||[]).flatMap(n=>n.source_refs||[]),...(result.readings||[]).flatMap(r=>[...(r.source_refs||[]),...(r.trace||[]).flatMap(t=>[t.source_ref||t.source_id||t.id].filter(Boolean))]),...(result.alternatives||[]).flatMap(r=>r.source_refs||[]),...trace.flatMap(t=>[t.source_ref||t.source_id||t.id].filter(Boolean))])];
}
function appendReferences(wrap,result) {
  const ids=collectReadingRefs(result);if(!ids.length)return;
  wrap.append(el('h3','المراجع المستخدمة','source-list-title'));
  const refs=el('ol','','result-sources');for(const id of ids){const s=sourceById(id);if(s){const li=el('li');li.append(safeLink(`${s.title} — ${s.locator} ↗`,s.url));refs.append(li);}}wrap.append(refs);
}
function renderLegacyReading(result,wrap) {
  if(result.nightmare){const n=el('section','','nightmare-panel');n.append(el('h3',result.nightmare.title),el('p',result.nightmare.text));const list=el('ol');(result.nightmare.steps||[]).forEach(t=>list.append(el('li',t)));n.append(list,sourceButtons(result.nightmare.source_refs||[]));wrap.append(n);}
  for(const note of result.notes||[]){const n=el('section','','result-note');n.append(el('h3',note.title),el('p',note.text),sourceButtons(note.source_refs||[]));wrap.append(n);}
  if(result.evidence?.length){wrap.append(el('h3','الشواهد المرتبطة بالمشهد','source-list-title'));for(const s of result.evidence){const n=el('section','','result-witness');n.append(el('span',kinds[s.kind]||s.kind,s.kind==='no_direct_evidence'?'badge warn':'badge'),el('h3',s.name),el('p',s.evidence));const p=el('p');p.append(el('strong','وجه الاستئناس وحدوده: '),document.createTextNode(s.possibility));n.append(p,sourceButtons(s.source_refs||[]));wrap.append(n);}}
  const questions=bulletSection('أسئلة تساعد على التثبّت',result.questions,'result-questions');if(questions)wrap.append(questions);
  wrap.append(el('p',result.conclusion,'result-conclusion'));appendReferences(wrap,result);
}
function appendUnderstanding(wrap,understanding={}) {
  const box=el('section','','result-understanding understanding-panel result-note');box.append(el('h3','ما فهمناه من المشهد'));
  if(understanding.summary)box.append(el('p',understanding.summary));
  const scenes=understanding.scenes||[];
  if(scenes.length){const list=el('div','','scene-list');for(const scene of scenes){const card=el('div','','scene-card');if(typeof scene==='string'){card.append(el('strong',scene));}else{card.append(el('strong',scene.label||scene.summary||scene.text||[scene.actor,scene.action,scene.object].filter(Boolean).join(' — ')||'مشهد'));const actions=scene.actions||[scene.action].filter(Boolean);const concepts=scene.concepts||[scene.object].filter(Boolean);const relations=(scene.relations||[]).map(item=>`${actorLabels[item.subject]||item.subject}: ${item.action} ← ${item.object}`);const details=[scene.subject?`الفاعل: ${actorLabels[scene.subject]||scene.subject}`:null,actions.length?`الفعل: ${actions.join('، ')}`:null,scene.negated||scene.negated_actions?.length?`الفعل المنفي: ${(scene.negated_actions||[]).join('، ')||'نعم'}`:null,concepts.length?`العناصر: ${concepts.join('، ')}`:null,relations.length?`الربط: ${relations.join('، ')}`:null,scene.qualities?.length?`الصفات: ${scene.qualities.join('، ')}`:null,scene.context].filter(Boolean);if(details.length)card.append(el('p',details.join(' • ')));}list.append(card);}box.append(list);}
  const observed=understanding.observed_elements||understanding.elements||[];if(observed.length)box.append(el('p',`العناصر الملحوظة: ${observed.map(displayItem).join('، ')}`,'result-meta'));
  const signals=understanding.context_signals||[];if(signals.length)box.append(el('p',`قرائن السياق: ${signals.map(displayItem).join('، ')}`,'result-meta'));
  const missing=understanding.missing_slots||understanding.missing||[];if(missing.length)box.append(el('p',`ما يزال ناقصاً: ${missing.map(displayItem).join('، ')}`,'symbol-caveat'));
  if(!box.querySelector('p, .scene-list'))box.append(el('p','استخرجنا النص كما كتبته، لكن لم نحدد فعلاً وصفةً كافيين لبناء قراءة خاصة.'));
  wrap.append(box);
}
function measure(label,value,map,providedLabel='') {
  const box=el('div','','reading-measure metric');box.append(el('strong',label),el('span',providedLabel||map[value]||value||'غير مكتملة'));return box;
}
function appendReading(wrap,reading,index=0) {
  const box=el('section','',index===0?'result-witness reading-card primary-reading':'result-witness reading-card alternative-reading');
  box.append(el('span',index===0?'وجه محتمل':'وجه محتمل آخر','badge'),el('h3',reading.title||`وجه محتمل ${index+1}`),el('p',reading.summary||reading.safe_wording||reading.text||'لا يوجد شرح إضافي.'));
  const why=reading.why||reading.reason||reading.match_reason||(reading.pattern_label?`طابق الوصف نمط «${reading.pattern_label}» مع بقاء القرائن المانعة ظاهرة أدناه.`:'');if(why){const p=el('p');p.append(el('strong','لماذا ظهر هذا الوجه؟ '),document.createTextNode(why));box.append(p);}
  const grid=el('div','','reading-measures reading-metrics');grid.append(measure('قوة المصدر',reading.source_reliability||reading.source_strength,sourceStrengthLabels,reading.source_reliability_label||reading.source_strength_label),measure('ملاءمة المشهد',reading.application_fit||reading.fit,fitLabels,reading.application_fit_label),measure('اكتمال السياق',reading.context_coverage||reading.coverage,coverageLabels,reading.context_coverage_label));box.append(grid);
  const supports=bulletSection('ما يدعم هذا الوجه',reading.supports,'reading-supports factor-list supports');
  const against=bulletSection('ما يضعفه أو يغيّره',[...(reading.against||[]),...(reading.weakens||[])],'reading-against factor-list against');
  if(supports||against){const factors=el('div','','factor-grid');if(supports)factors.append(supports);if(against)factors.append(against);box.append(factors);}
  if(reading.source_refs?.length)box.append(sourceButtons(reading.source_refs));wrap.append(box);
}
function appendSourceTrace(wrap,result) {
  const trace=(Array.isArray(result.source_trace)&&result.source_trace.length?result.source_trace:result.readings?.flatMap(r=>r.trace||[]))||[];if(!trace.length)return;
  const box=el('section','','result-note source-trace');box.append(el('h3','مسار الاستدلال'));
  const list=el('ol','','trace-list');for(const item of trace){const li=el('li');if(typeof item==='string'){li.textContent=item;}else{const source=sourceById(item.source_ref||item.source_id||item.id);li.append(el('strong',item.label||item.step||source?.title||'خطوة موثقة'));const detail=item.reason||item.role||item.text||item.summary;if(detail)li.append(el('p',detail));if(source)li.append(button('افتح الموضع',()=>openSource(source.id),'text-link'));}list.append(li);}box.append(list);wrap.append(box);
}
function renderV2Reading(result,wrap) {
  const mode=String(result.mode||'no_supported_reading').replaceAll('-','_');const status=el('section','','result-status result-note');status.append(el('span',modeLabels[mode]||'قراءة احتمالية','badge'),el('h3',result.status?.title||'حالة القراءة'),el('p',result.status?.text||modeDescriptions[mode]||'هذه مقارنة بين مشهدك ومواضع محررة؛ لا تخبر بالغيب ولا تحسم قراراً.'));wrap.append(status);
  appendUnderstanding(wrap,result.understanding||{});
  if(result.nightmare){const n=el('section','','nightmare-panel');n.append(el('h3',result.nightmare.title),el('p',result.nightmare.text));const list=el('ol');(result.nightmare.steps||[]).forEach(t=>list.append(el('li',t)));n.append(list,sourceButtons(result.nightmare.source_refs||[]));wrap.append(n);}
  const readings=result.readings||[];if(readings.length)appendReading(wrap,readings[0],0);
  const questions=bulletSection('أسئلة قد تغيّر هذه القراءة',result.questions,'result-questions followup-panel');if(questions){questions.append(button('عدّل وصف المنام وأعد القراءة',()=>{$('dream').focus();$('dream-form').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},'text-link'));wrap.append(questions);}
  if(readings.length>1){const title=el('h3','أوجه أخرى محتملة','source-list-title');wrap.append(title);readings.slice(1).forEach((reading,index)=>appendReading(wrap,reading,index+1));}
  for(const alternative of result.alternatives||[]){const item=typeof alternative==='string'?{summary:alternative,title:'احتمال بديل'}:alternative;const box=el('section','','result-note reading-card alternative-reading');box.append(el('h3',item.title||'وجه بديل'),el('p',item.summary||item.text||''));if(item.source_refs?.length)box.append(sourceButtons(item.source_refs));wrap.append(box);}
  const abstentions=bulletSection('ما امتنعنا عن استنتاجه',result.abstentions,'result-note abstention');if(abstentions)wrap.append(abstentions);
  for(const note of result.notes||[]){const n=el('section','','result-note');n.append(el('h3',note.title||'تنبيه'),el('p',note.text||note.summary||''),sourceButtons(note.source_refs||[]));wrap.append(n);}
  appendSourceTrace(wrap,result);
  wrap.append(el('p',result.conclusion||'هذه قراءة محتملة ومحدودة، وليست وعداً بوقوع معنى بعينه.','result-conclusion'));appendReferences(wrap,result);
}
function renderReading(result,scroll=true) {
  currentReading=result;const wrap=$('result');wrap.replaceChildren();wrap.hidden=false;
  const head=el('div','','result-header');head.append(el('span','النتيجة وحدودها','eyebrow'),el('h2',result.title||'قراءة المنام بالمصادر'),el('p','تحليل محلي للمشهد • لم يراجعه معبّر مؤهل • ليست فتوى'));head.querySelector('h2').tabIndex=-1;wrap.append(head);
  if(result.schema_version===1)renderLegacyReading(result,wrap);else renderV2Reading(result,wrap);
  wrap.append(resultActions(result));
  if(scroll){wrap.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});head.querySelector('h2').focus({preventScroll:true});}
}

function readJournal() {
  try {
    const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');
    if(!Array.isArray(data)||data.some(r=>!r||typeof r.id!=='string'||![1,2].includes(r.result?.schema_version)||typeof r.result?.input?.text!=='string')) throw new Error('Invalid local journal');
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
  const text=result.schema_version===1
    ? [result.title,...(result.nightmare?.steps||[]),...(result.notes||[]).map(n=>n.text),...(result.evidence||[]).map(s=>s.evidence+' '+s.possibility),result.conclusion].join('. ')
    : [result.title,...(result.nightmare?.steps||[]),...(result.readings||[]).map(r=>r.summary||r.safe_wording||r.text),...(result.notes||[]).map(n=>n.text||n.summary),result.conclusion].filter(Boolean).join('. ');
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
  window.scrollTo({top:0,behavior:'instant'});const heading=$(`view-${name}`).querySelector('h1,h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
function setupEvents() {
  window.addEventListener('hashchange',route);$('dream').addEventListener('input',updateCount);
  $('dream-form').addEventListener('submit',e=>{e.preventDefault();$('form-error').hidden=true;try{stopSpeech();if(recognition)recognition.stop();const result=readDream({text:$('dream').value,feeling:$('feeling').value,daytime:$('daytime').value,repeated:$('repeated').value},corpus);renderReading(result);}catch(error){$('form-error').textContent=error.message;$('form-error').hidden=false;$('dream').focus();}});
  $('dream-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1_000_000)throw new Error('الملف أكبر من ١ ميغابايت. انسخ مشهد المنام فقط.');$('dream').value=(await file.text()).replace(/^\uFEFF/,'');updateCount();toast('فُتح الملف في الحقل دون رفعه. راجع النص قبل القراءة.');}catch(error){toast(error.message||'تعذر فتح الملف. استخدم ملف TXT بترميز UTF-8.');}e.target.value='';});
  $('source-search').addEventListener('input',renderSources);$('rule-search').addEventListener('input',renderRules);$('symbol-search').addEventListener('input',renderSymbols);
  $('download-corpus').addEventListener('click',()=>downloadJSON('ruya-corpus.json',corpus));
  document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>openSource(b.dataset.source)));
  $('close-dialog').addEventListener('click',()=>$('source-dialog').close());
  for(const dialog of [$('source-dialog'),$('confirm-dialog')])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('export-journal').addEventListener('click',()=>{const rows=readJournal();if(rows)downloadJSON('ruya-journal.json',{schema_version:2,exported_at:new Date().toISOString(),readings:rows});});
  $('clear-journal').addEventListener('click',()=>$('confirm-dialog').showModal());$('cancel-clear').addEventListener('click',()=>$('confirm-dialog').close());$('confirm-clear').addEventListener('click',()=>{try{localStorage.removeItem(STORAGE);$('confirm-dialog').close();renderJournal();toast('حُذفت جميع المحفوظات من هذا المتصفح.');}catch{toast('تعذر حذف الدفتر.');}});
  $('draft-template').addEventListener('click',()=>downloadJSON('ruya-source-template.json',{title:'عنوان المصدر الحقيقي',locator:'اسم الكتاب والطبعة ورقم الصفحة أو الحديث',summary:'ملخص محرر مع حدود الاستدلال',url:'https://example.org/source'}));
  $('draft-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw new Error('ملف المسودات أكبر من ٢ ميغابايت.');drafts.push(...validateDraft(await file.text()));$('draft-list').replaceChildren();for(const d of drafts){const card=el('article','','draft-item');card.append(el('span','مسودة غير معتمدة','badge warn'),el('h3',d.title),el('p',d.summary),el('p',d.locator),safeLink('فتح المرجع ↗',d.url,'text-link'));$('draft-list').append(card);}$('export-drafts').hidden=false;toast('استُقبلت المسودات لهذه الجلسة فقط. لم تدخل في محرك القراءة.');}catch(error){toast(error.message||'تعذر فتح ملف المسودات.');}e.target.value='';});
  $('export-drafts').addEventListener('click',()=>downloadJSON('ruya-research-drafts.json',drafts));
  for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{if(b.dataset.example==='milk'){$('dream').value='هذا مثال تعليمي: رأيت أني أشرب لبناً عند معلم أعرفه في مكان هادئ.';$('feeling').value='calm';$('daytime').value='yes';}else if(b.dataset.example==='rain'){$('dream').value='هذا مثال تعليمي: نزل مطر خفيف هادئ على بيتنا بلا ضرر، وشعرت بالطمأنينة.';$('feeling').value='calm';$('daytime').value='unsure';}else{$('dream').value='هذا مثال تعليمي: رأيت أني أسقط من مكان مرتفع ثم استيقظت فزعاً.';$('feeling').value='afraid';$('daytime').value='unsure';}$('repeated').value='unsure';updateCount();$('dream').focus();$('dream-form').scrollIntoView({block:'start'});toast('هذا نص تعليمي للتجربة، وليس رؤيا حقيقية.');});
  $('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-label',dark?'تفعيل الوضع النهاري':'تفعيل الوضع الليلي');try{localStorage.setItem('ruya.theme',dark?'dark':'light');}catch{}});
  setupVoice();
}

try {
  try{const theme=localStorage.getItem('ruya.theme');if(theme==='dark'){document.documentElement.dataset.theme='dark';$('theme').setAttribute('aria-label','تفعيل الوضع النهاري');}}catch{}
  const response=await fetch(new URL(`./corpus.json?v=${BUILD_ID}`,import.meta.url));if(!response.ok)throw new Error('لا يمكن تحميل مكتبة المصادر حالياً. أعد تحميل الصفحة بعد قليل.');
  corpus=await response.json();const errors=validateCorpus(corpus);if(errors.length)throw new Error('تعذر التحقق من ترابط قاعدة المصادر. أوقفنا القراءة إلى أن تُراجع البيانات.');
  renderLibrarySummary();renderSources();renderRules();renderSymbols();renderMaps();setupEvents();route();updateCount();
} catch(error) { $('boot-error').hidden=false;$('boot-error').textContent=error.message;$('read-button').disabled=true; }
