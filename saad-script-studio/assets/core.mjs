import {METHOD,newStory,normalizeStory,normalizeDrama,foundationContext,BEAT_FIELDS,DRAMA_FIELDS,CHARACTER_FIELDS} from './story.mjs?v=4';
import {newCinematic,normalizeCinematic} from './cinematic.mjs?v=4';
export const TYPES = ['Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Transition', 'General'];
export const LABELS = {'Scene Heading':'عنوان مشهد',Action:'وصف الحدث',Character:'الشخصية',Parenthetical:'توجيه الأداء',Dialogue:'الحوار',Transition:'انتقال',General:'نص عام'};
export const MAX_BLOCKS = 12000;
export const id = () => globalThis.crypto?.randomUUID?.() || `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const block = (type='Action', text='', extra={}) => ({id:id(),type,text,...extra});
export function newProject(title='سيناريو جديد') {
  return {version:2,id:id(),title,author:'',language:'ar',format:'short',genre:'دراما',dialect:'فصحى',printStyle:'ink',sceneCount:6,idea:'',pillars:{hero:'',goal:'',obstacle:'',stakes:'',ending:''},story:newStory(),cinematic:newCinematic(),presentation:{},blocks:[block('Scene Heading')],plan:null,snapshots:[],updatedAt:new Date().toISOString()};
}
export function validateProject(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.blocks)) throw new Error('ملف المشروع لا يحتوي على سيناريو صالح.');
  if (value.version !== undefined && ![1,2].includes(value.version)) throw new Error('إصدار ملف المشروع غير مدعوم.');
  if (value.blocks.length > MAX_BLOCKS) throw new Error('الملف كبير جداً. الحد الأقصى ١٢ ألف فقرة.');
  let total = 0;
  const ids = new Set();
  const blocks = value.blocks.map(b => {
    if (!b || !TYPES.includes(b.type) || typeof b.text !== 'string') throw new Error('نوع فقرة أو نص غير صالح في الملف.');
    if (b.text.length > 100000) throw new Error('إحدى الفقرات طويلة جداً. قسّمها قبل الاستيراد.');
    total += b.text.length;
    const bid = typeof b.id === 'string' && b.id.length < 100 && !ids.has(b.id) ? b.id : id();
    ids.add(bid);
    return {id:bid,type:b.type,text:b.text,number:String(b.number ?? '').slice(0,40),summary:String(b.summary ?? '').slice(0,5000),...(b.type==='Scene Heading'&&b.drama?{drama:normalizeDrama(b.drama)}:{})};
  });
  if (total > 5000000) throw new Error('حجم نص السيناريو يتجاوز ٥ ملايين حرف.');
  const p = newProject();
  for (const key of ['title','author','idea','genre','dialect']) if (typeof value[key] === 'string') p[key]=value[key].slice(0,key==='idea'?40000:300);
  p.id = typeof value.id === 'string' && value.id.length < 100 ? value.id : p.id;
  p.language = value.language === 'en' ? 'en' : 'ar';
  p.format = ['short','feature','tv'].includes(value.format) ? value.format : 'short';
  p.sceneCount = Math.max(2,Math.min(60,Math.round(Number(value.sceneCount))||6));
  p.printStyle = value.printStyle==='classic'?'classic':'ink';
  for(const key of Object.keys(p.pillars)) p.pillars[key]=String(value.pillars?.[key]??'').slice(0,3000);
  p.story=normalizeStory(value.story);
  p.cinematic=normalizeCinematic(value.cinematic);
  if(value.presentation&&typeof value.presentation==='object'&&!Array.isArray(value.presentation)){
    const src=value.presentation;
    for(const key of ['logline','vision','purpose','points','value','audience','style','duration']){
      if(typeof src[key]==='string')p.presentation[key]=src[key].slice(0,key==='points'?1150:450);
    }
    if(src.episodeNotes&&typeof src.episodeNotes==='object'&&!Array.isArray(src.episodeNotes)){
      p.presentation.episodeNotes={};
      for(const [k,v] of Object.entries(src.episodeNotes)){
        if(/^\d{1,2}$/.test(k)&&typeof v==='string')p.presentation.episodeNotes[k]=v.slice(0,300);
      }
    }
  }
  p.blocks = blocks.length ? blocks : [block('Scene Heading')];
  if (value.plan) p.plan = validatePlan(value.plan);
  p.snapshots = Array.isArray(value.snapshots) ? value.snapshots.slice(-12).map(s=>{
    if(!s||typeof s.name!=='string'||!Array.isArray(s.blocks))throw new Error('إحدى نسخ المسودة في الملف غير صالحة.');
    const result={id:id(),name:s.name.slice(0,200),date:String(s.date??''),blocks:validateProject({blocks:s.blocks}).blocks,plan:s.plan?validatePlan(s.plan):null};
    if(s.basis){const basis=validateProject({...s.basis,blocks:[]});result.basis=Object.fromEntries(['idea','pillars','story','cinematic','genre','format','language','dialect','sceneCount'].map(k=>[k,basis[k]]));}
    return result;
  }) : [];
  return p;
}
const scenePattern = /^(?:(?:مشهد|المشهد)\s*[0-9٠-٩]+(?:\s*[:.\-]\s*)?)?(?:داخلي|خارجي|داخل\/خارج|د\/خ|INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|I\/E)(?:\s|[.\-\/]|$)/iu;
const isCharacterLabel=name=>name.trim().split(/\s+/).length<=4
  && /^[\p{L}\p{M}][\p{L}\p{M}\p{N} ._'’()\-]*$/u.test(name)
  && !/^(?:Title|Author|Credit|Draft date|Contact|https?|العنوان|ملاحظة|وصف|الفكرة|الزمان|المكان|على|في|ثم|بينما|نرى|نسمع|تخرج|يخرج|تدخل|يدخل|يفتح|تفتح|يقرأ|تقرأ)(?:\s|$)/iu.test(name);
export function parseText(text, {fountain=false}={}) {
  if (typeof text !== 'string' || text.length > 5000000) throw new Error('النص غير صالح أو كبير جداً.');
  const lines=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n');
  const out=[]; const metadata={}; let dialogue=false; let titlePage=fountain; const names=new Set();
  for(const l of lines){const m=l.trim().match(/^([^:：]{1,40})[:：]\s*(\S.*)$/u);if(m&&isCharacterLabel(m[1]))names.add(m[1].trim());}
  for(const original of lines){
    const line=original.trim();
    if(titlePage){const m=line.match(/^(Title|Author|Authors|Credit|Draft date|Contact):\s*(.*)$/i);if(m){if(/^title$/i.test(m[1]))metadata.title=m[2];if(/^authors?$/i.test(m[1]))metadata.author=m[2];continue;}if(!line)continue;titlePage=false;}
    if(!line){dialogue=false;continue;}
    if(/^\.(?!\.)\S/u.test(line)||scenePattern.test(line)||/^(?:مشهد|المشهد)\s*[0-9٠-٩]+\s*[:.\-]/u.test(line)){
      let content=line.replace(/^\.(?!\.)/,''); const m=content.match(/\s+#([\w.\-]+)#\s*$/u); if(m)content=content.slice(0,m.index);
      out.push(block('Scene Heading',content,{number:m?.[1]||''}));dialogue=false;continue;
    }
    if(line.startsWith('!')){out.push(block('Action',line.slice(1)));dialogue=false;continue;}
    if(line.startsWith('@')){out.push(block('Character',line.slice(1)));dialogue=true;continue;}
    if(/^>.*<$/u.test(line)){out.push(block('General',line.slice(1,-1).trim()));dialogue=false;continue;}
    if(line.startsWith('>')||/^(?:CUT TO:|FADE (?:IN|OUT):?|DISSOLVE TO:|قطع إلى[:：]?|إظلام[:：]?|تلاشي[:：]?)$/i.test(line)){
      out.push(block('Transition',line.replace(/^>/,'').trim()));dialogue=false;continue;
    }
    if(fountain && /^(?:#|=|\[\[)/u.test(line)){out.push(block('General',line));dialogue=false;continue;}
    const inline=line.match(/^([^:：]{1,40})[:：]\s*(\S.*)$/u);
    if(inline&&names.has(inline[1].trim())){out.push(block('Character',inline[1].trim()),block('Dialogue',inline[2]));dialogue=true;continue;}
    if(names.has(line)||(/^[A-Z][A-Z0-9 ._'()\-]{0,49}$/.test(line)&&!line.endsWith(':'))){out.push(block('Character',line));dialogue=true;continue;}
    if(dialogue&&/^\(.*\)$/u.test(line)){out.push(block('Parenthetical',line));continue;}
    out.push(block(dialogue?'Dialogue':'Action',original.trim()));
  }
  if(out.length>MAX_BLOCKS)throw new Error('عدد فقرات النص كبير جداً.');
  return {blocks:out,metadata};
}
export function scenes(project) {
  const groups=[]; let current=null;
  for(let i=0;i<project.blocks.length;i++){
    const b=project.blocks[i];
    if(b.type==='Scene Heading'){
      current={id:b.id,number:b.number||String(groups.length+1),title:b.text||'مشهد بلا عنوان',summary:b.summary||'',drama:b.drama||null,start:i,end:i,blocks:[]};groups.push(current);
    }
    if(current){current.blocks.push(b);current.end=i+1;}
  }
  return groups;
}
export function moveScene(project,sceneId,delta) {
  const groups=scenes(project);const at=groups.findIndex(s=>s.id===sceneId);const to=at+delta;
  if(at<0||to<0||to>=groups.length)return false;
  const prefix=project.blocks.slice(0,groups[0].start);
  [groups[at],groups[to]]=[groups[to],groups[at]];
  project.blocks=prefix.concat(groups.flatMap(s=>s.blocks));return true;
}
export function stats(project) {
  const words=project.blocks.map(b=>b.text).join(' ').trim().split(/\s+/u).filter(Boolean).length;
  const chars=new Map();let name='';
  for(const b of project.blocks){if(b.type==='Character'){name=b.text.trim();if(name&&!chars.has(name))chars.set(name,{name,words:0,speeches:0});}if(b.type==='Dialogue'&&name){const c=chars.get(name);if(c){c.words+=b.text.trim().split(/\s+/u).filter(Boolean).length;c.speeches++;}}if(['Scene Heading','Action','Transition','General'].includes(b.type))name='';}
  return {words,sceneCount:scenes(project).length,characters:[...chars.values()],estimatedPages:words?Math.ceil(words/250):0};
}
export function review(project) {
  const warnings=[];let name='';let sceneName='';
  for(const b of project.blocks){
    if(b.type==='Scene Heading'){
      name='';sceneName=b.text;
      if(!b.text.trim())warnings.push({id:b.id,message:'أضف مكان المشهد وزمانه.'});
      else if(!/(?:ليل|نهار|صباح|مساء|فجر|غروب|DAY|NIGHT|DAWN|DUSK|EVENING|CONTINUOUS)/i.test(b.text))warnings.push({id:b.id,message:`حدّد الزمن في المشهد: ${sceneName}`});
    }
    if(b.type==='Character')name=b.text.trim();
    if(['Dialogue','Parenthetical'].includes(b.type)&&!name&&b.text.trim())warnings.push({id:b.id,message:'حوار أو توجيه أداء بلا اسم شخصية قبله.'});
    if(['Action','Transition','General'].includes(b.type))name='';
  }
  for(const s of scenes(project))if(!s.blocks.slice(1).some(b=>b.text.trim()))warnings.push({id:s.id,message:`المشهد «${s.title}» بلا أحداث أو حوار.`});
  if(project.blocks.some(b=>b.text.trim())&&!scenes(project).length)warnings.push({id:project.blocks[0].id,message:'لم يُحدّد أي عنوان مشهد. اختر الفقرة المناسبة وغيّر نوعها.'});
  return warnings;
}
export function toFdx(project) {
  const paragraphs=project.blocks.filter(b=>b.text.trim()).map(b=>`    <Paragraph Type="${escapeHtml(b.type)}"${b.type==='Scene Heading'&&b.number?` Number="${escapeHtml(b.number)}"`:''}><Text>${escapeHtml(b.text)}</Text></Paragraph>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<FinalDraft DocumentType="Script" Template="No" Version="1">\n  <Content>\n${paragraphs}\n  </Content>\n  <TitlePage><Content><Paragraph Type="General"><Text>${escapeHtml(project.title)}</Text></Paragraph><Paragraph Type="General"><Text>${escapeHtml(project.author)}</Text></Paragraph></Content></TitlePage>\n</FinalDraft>\n`;
}
export function fromFdx(xml, DOMParserClass=globalThis.DOMParser) {
  if(/<!DOCTYPE|<!ENTITY/iu.test(xml))throw new Error('ملف XML يحتوي على تعريفات غير مدعومة.');
  if(!DOMParserClass)throw new Error('قارئ XML غير متاح.');
  const doc=new DOMParserClass().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement.tagName!=='FinalDraft')throw new Error('ملف FDX غير صالح.');
  const root=doc.documentElement;const content=[...root.childNodes].find(n=>n.nodeName==='Content');
  if(!content)throw new Error('لا يوجد محتوى سيناريو في الملف.');
  const paragraphs=[...content.getElementsByTagName('Paragraph')];
  let unsupported=0;
  const blocks=paragraphs.map(p=>{
    const type=p.getAttribute('Type');if(!TYPES.includes(type))unsupported++;
    const text=[...p.childNodes].filter(n=>n.nodeName==='Text').map(n=>n.textContent).join('');
    return block(TYPES.includes(type)?type:'General',text,{number:p.getAttribute('Number')||''});
  });
  const titlePage=root.getElementsByTagName('TitlePage')[0];const lines=titlePage?[...titlePage.getElementsByTagName('Paragraph')].map(p=>[...p.getElementsByTagName('Text')].map(t=>t.textContent).join('')).filter(Boolean):[];
  return {blocks,metadata:{title:lines[0]||'',author:lines[1]||''},warning:`${unsupported?'تم الاحتفاظ بالعناصر غير المعروفة كنص عام. ':''}الاستيراد يحافظ على النص وأنواع الفقرات؛ تنسيق الإنتاج المتقدم والحوار المتوازي يحتاجان مراجعة.`};
}
export function toFountain(project) {
  let output=`Title: ${project.title.replace(/\n/g,' ')}\nAuthor: ${project.author.replace(/\n/g,' ')}\n\n`;
  for(const b of project.blocks){
    if(!b.text.trim())continue;
    if(b.type==='Scene Heading')output+=`\n.${b.text}${b.number?` #${b.number}#`:''}\n\n`;
    else if(b.type==='Character')output+=`\n@${b.text}\n`;
    else if(b.type==='Parenthetical')output+=`${/^\(.*\)$/su.test(b.text)?b.text:`(${b.text})`}\n`;
    else if(b.type==='Dialogue')output+=`${b.text}\n`;
    else if(b.type==='Transition')output+=`\n>${b.text}\n\n`;
    else if(b.type==='General')output+=`\n>${b.text}<\n\n`;
    else output+=`\n!${b.text}\n\n`;
  }
  return output.trim()+'\n';
}
export function printBody(project) {
  const nonempty=project.blocks.filter(b=>b.text.trim());let sceneNo=0;
  return `<section class="print-title"><p class="print-kicker">${project.language==='en'?'SCREENPLAY':'سيناريو'}</p><h1>${escapeHtml(project.title)}</h1>${project.author?`<p>${project.language==='en'?'Written by':'تأليف'}<br><strong>${escapeHtml(project.author)}</strong></p>`:''}<p class="draft-date">${new Date().toLocaleDateString(project.language==='en'?'en-GB':'ar-KW')}</p></section><article class="print-script" dir="${project.language==='en'?'ltr':'rtl'}">${nonempty.map(b=>{if(b.type==='Scene Heading')sceneNo++;return `<p class="script-${b.type.toLowerCase().replace(/ /g,'-')}">${b.type==='Scene Heading'?`<span class="scene-number">${escapeHtml(b.number||sceneNo)}</span>`:''}${escapeHtml(b.text).replace(/\n/g,'<br>')}</p>`;}).join('')}</article>`;
}
export function validatePlan(v) {
  if(!v || typeof v!=='object' || !Array.isArray(v.scenes) || v.scenes.length<2 || v.scenes.length>60)throw new Error('خطة المشاهد غير مكتملة؛ يجب أن تحتوي على مشهدين إلى ٦٠ مشهداً.');
  if(!Array.isArray(v.characters)||v.characters.length>30)throw new Error('قائمة الشخصيات غير صالحة.');
  const text=(x,required=false)=>{if(typeof x!=='string'||x.length>5000||(required&&!x.trim()))throw new Error('تتضمن الخطة حقلاً غير صالح.');return x;};
  const ids=new Set();
  const sceneId=s=>{const value=typeof s.id==='string'&&s.id.length<100&&!ids.has(s.id)?s.id:id();ids.add(value);return value;};
  return {method:v.method===METHOD?METHOD:'legacy',sourceFingerprint:String(v.sourceFingerprint??'').slice(0,100),title:text(v.title,true),logline:text(v.logline,true),synopsis:text(v.synopsis,true),characters:v.characters.map(c=>({id:typeof c.id==='string'?c.id.slice(0,100):id(),role:['hero','opponent','support'].includes(c.role)?c.role:'support',level:['main','secondary'].includes(c.level)?c.level:c.role==='hero'?'main':'secondary',...Object.fromEntries(Object.keys(CHARACTER_FIELDS).map(k=>[k,text(c[k]??'',k==='name')]))})),scenes:v.scenes.map(s=>({id:sceneId(s),beatId:String(s.beatId??'').slice(0,100),heading:text(s.heading,true),summary:text(s.summary,true),...Object.fromEntries([...Object.keys(DRAMA_FIELDS),'turn'].map(k=>[k,text(s[k]??'')])),written:!!s.written}))};
}
export function validateScene(v,heading) {
  if(!v||!Array.isArray(v.blocks)||v.blocks.length<2||v.blocks.length>300)throw new Error('رد الكاتب لا يحتوي على مشهد مكتمل.');
  const allowed=['Action','Character','Dialogue','Parenthetical','Transition'];
  const blocks=v.blocks.map(b=>{if(!b||!allowed.includes(b.type)||typeof b.text!=='string'||!b.text.trim()||b.text.length>30000)throw new Error('أعاد الكاتب فقرة غير صالحة.');return block(b.type,b.text);});
  if(!blocks.some(b=>b.type==='Action'))throw new Error('المشهد لا يحتوي على وصف أحداث.');
  const result=[block('Scene Heading',heading),...blocks];
  if(review({blocks:result}).some(n=>n.message.includes('بلا اسم شخصية')))throw new Error('رد الكاتب يحتوي على حوار بلا اسم شخصية. لم يُضف المشهد؛ أعد المحاولة.');
  return result;
}
export function promptForPlan(project) {
  return `أنت كاتب سيناريو ومحرر درامي. حوّل أساس القصة وورقة الإيقاع المعتمدين إلى خطة مشاهد؛ لا تكتب الحوار بعد.\nالمرجع الملزم في هذا المشروع: الخريطة الذهنية لبناء القصة. البطل والمشكلة والحاجة والهدف والعائق والمخاطر ووسائل الحل هي جوهر القصة. اربط كل محاولة بنتيجتها وبقرار جديد يؤدي إلى التالي. النوع الدرامي يوجه طبيعة الصراع والسطر التمهيدي. حافظ على نقطة الدخول وحالتي البداية والنهاية واتجاه الشخصية والحدث. لا تجعل الشخصية تتصرف بمعرفة لم تحصل عليها بعد.\nالأساس المعتمد: ${JSON.stringify(foundationContext(project))}\nعدد المشاهد المطلوب بالضبط: ${project.sceneCount}. كل مشهد يرتبط بـ beatId موجود في ورقة الإيقاع. يمكن أن يخدم الإيقاع أكثر من مشهد، ويجب تمثيل جميع الإيقاعات. حافظ على أسماء الشخصيات وقيم المؤلف دون تغيير. فترات التأمل أو الإغلاق مشروعة؛ لا تفتعل عائقًا في ending أو bridge. لا تعامل أرقام المواسم أو مدد الإنتاج أو المعادلات غير المكتملة كقواعد. لا تنسخ عملاً منشورًا.\nاكتب عناوين المشاهد بالمكان والداخل/الخارج وليل/نهار. لغة الوصف ${project.language==='en'?'English':'العربية'}. لهجة الحوار ${project.dialect}. أعِد JSON فقط:\n{"method":"${METHOD}","title":"عنوان","logline":"السطر المعتمد","synopsis":"ملخص الحبكة","characters":[{"name":"اسم مطابق","role":"hero أو opponent أو support","level":"main أو secondary","goal":"هدف","need":"حاجة","motive":"دافع","knowledge":"معرفة البداية","arc":"تغير أو كشف"}],"scenes":[{"beatId":"معرف إيقاع موجود","heading":"داخلي - مكان - نهار","summary":"الحدث القابل للتصوير","character":"اسم الشخصية المحركة","goal":"هدف مرحلي","obstacle":"العائق","attempt":"المحاولة والوسيلة","result":"النتيجة","turn":"التغير","decision":"القرار الناتج","cause":"كيف تقود النتيجة للمشهد التالي؛ فارغ للنهاية فقط","stakes":"الخسارة المحتملة","knowledgeBefore":"ما تعرفه قبل الحدث","knowledgeAfter":"ما تعرفه بعد الحدث"}]}`;
}
export function promptForScene(project,index) {
  const plan=project.plan;const scene=plan.scenes[index];
  return `اكتب مشهدًا سينمائيًا واحدًا من الخطة المعتمدة وفق الخريطة الذهنية لبناء القصة. لغة الوصف: ${project.language==='en'?'English':'العربية'}. لهجة الحوار: ${project.dialect}.\nجوهر القصة والشخصيات وورقة الإيقاع: ${JSON.stringify(foundationContext(project))}\nالخطة الكاملة: ${JSON.stringify(plan)}\nالمشهد الحالي ${index+1}: ${JSON.stringify(scene)}\nآخر أحداث مكتوبة للحفاظ على الاستمرارية: ${project.blocks.map(b=>b.text).join('\n').slice(-7000)}\nجسّد هدف الشخصية وعائقها ومحاولتها ونتيجة المحاولة والقرار الجديد داخل أفعال قابلة للتصوير، لا كشرح نظري. يجب أن تؤدي النتيجة سببيًا إلى المشهد التالي حسب cause. رد الفعل يتبع دوافع الشخصية وما تعرفه قبل المشهد؛ لا تكشف معلومات قبل موعدها. وسائل الحل تأتي من اختيارات وقدرات القصة، دون مصادفة تحل العائق بلا تمهيد. حافظ على الخسارة المحتملة وسبب الاستعجال. في ending أو bridge يكفي الإغلاق أو التأمل المقصود في الخطة؛ لا تفتعل صراعًا. التزم بالنوع الدرامي والسطر التمهيدي وبداية القصة ونهايتها.\nاكتب حوارًا مقتصدًا يميز الشخصيات. لا تضف عناوين أو شرحًا خارج المشهد. لا تكتب اسم الشخصية داخل فقرة Dialogue؛ ضعه في Character قبل الحوار. أعِد JSON فقط: {"blocks":[{"type":"Action","text":"وصف"},{"type":"Character","text":"اسم"},{"type":"Dialogue","text":"حوار"}]}. الأنواع المسموحة Action, Character, Dialogue, Parenthetical, Transition. اكتب المشهد كاملًا في حدود ٢٥٠ إلى ٦٠٠ كلمة، وتجنب تلخيص الحوار.`;
}
export function snapshot(project,name) {
  project.snapshots.push({id:id(),name,date:new Date().toISOString(),blocks:structuredClone(project.blocks),plan:project.plan?structuredClone(project.plan):null,basis:structuredClone(Object.fromEntries(['idea','pillars','story','cinematic','genre','format','language','dialect','sceneCount'].map(k=>[k,project[k]])))});
  project.snapshots=project.snapshots.slice(-12);
}
