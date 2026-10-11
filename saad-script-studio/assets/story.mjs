// The author's supplied story map is a planning method, not a quality score.
export const METHOD = 'story-dna-map-v1';
export const METHOD_TITLE = 'الخريطة الذهنية لبناء القصة';
export const STAGES = {dna:'جوهر القصة',characters:'الشخصية والحدث',logline:'السطر التمهيدي',beats:'ورقة الإيقاع',plan:'خطة المشاهد'};
export const DIRECTIONS = {auto:'حسب صيغة العمل',inside:'من الشخصية إلى الحدث',outside:'من الحدث إلى الشخصية',both:'الجمع بين الاتجاهين'};
export const BEAT_TYPES = {opening:'البداية',trigger:'الحدث المحرّك',development:'محاولة وتطور',escalation:'تصعيد',climax:'مواجهة',ending:'النهاية',bridge:'انتقال أو تأمل'};
export const CHARACTER_FIELDS = {name:'اسم الشخصية',goal:'ما الذي تريده؟',need:'ما حاجتها الداخلية؟',motive:'لماذا تفعل ذلك؟',knowledge:'ما الذي تعرفه عند البداية؟',arc:'كيف تتغير أو تنكشف؟'};
export const RELATION_FIELDS = {from:'الشخصية الأولى',to:'الشخصية الثانية',bond:'ما الذي يجمعهما؟',tension:'أين التوتر أو الاختلاف؟',change:'كيف تتغير العلاقة؟',limit:'ما الذي يعرفه كل طرف أو يخفيه؟'};
export const BEAT_FIELDS = {heading:'عنوان المشهد المقترح',event:'ما الحدث؟',goal:'الهدف المرحلي',obstacle:'العائق في هذه اللحظة',attempt:'المحاولة أو الوسيلة',result:'نتيجة المحاولة',decision:'القرار الجديد',cause:'كيف تقود النتيجة إلى الحدث التالي؟',stakes:'ما الذي يصبح معرضًا للخسارة؟',knowledge:'ما المعلومة التي تعرفها الشخصية هنا؟'};
export const DRAMA_FIELDS = {character:'الشخصية المحرّكة',goal:'هدف المشهد',obstacle:'العائق',attempt:'المحاولة',result:'النتيجة',decision:'القرار الجديد',cause:'الرابط بالمشهد التالي',stakes:'المخاطر',knowledgeBefore:'ما تعرفه الشخصية قبل المشهد',knowledgeAfter:'ما تعرفه بعده'};
export const REFERENCE_NOTES = [
  '١٣ حلقة للموسم، و٣٠٠ يوم لكتابة ٣٠٠ حلقة: أرقام من الملاحظات، وليست شروطًا للتخطيط أو للإنتاج. معنى «١٣ يومًا» غير محسوم.',
  'صيغة المعادلة الإنجليزية وعبارة «كل معركة لها…» غير مكتملتين؛ لم تُحوّلا إلى تعليمات للكاتب.',
  'الإشارة إلى الصفحة ١٢٩ محفوظة كإحالة إلى الملاحظات الأصلية؛ محتوى تلك الصفحة غير مرفق.'
];
const uid = () => globalThis.crypto?.randomUUID?.() || `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const txt = (v,max=5000) => typeof v==='string' ? v.slice(0,max) : '';
const has = v => typeof v==='string' && !!v.trim();
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storyKeys = ['problem','need','urgency','stageGoal','means','conflictNature','logline','opening','inciting','entryPoint'];
export function newCharacter() {return {id:uid(),role:'support',level:'secondary',...Object.fromEntries(Object.keys(CHARACTER_FIELDS).map(k=>[k,'']))};}
export function newRelation() {return {id:uid(),...Object.fromEntries(Object.keys(RELATION_FIELDS).map(k=>[k,'']))};}
export function newBeat(type='development') {return {id:uid(),type,label:BEAT_TYPES[type]||BEAT_TYPES.development,character:'',...Object.fromEntries(Object.keys(BEAT_FIELDS).map(k=>[k,'']))};}
export function newStory() {return {method:METHOD,...Object.fromEntries(storyKeys.map(k=>[k,''])),direction:'auto',characters:[],relationships:[],beats:[],approval:null};}
export function normalizeStory(v) {
  if(v!=null && (typeof v!=='object'||Array.isArray(v)))throw new Error('بيانات بناء القصة غير صالحة.');
  const s=newStory();if(!v)return s;
  for(const k of storyKeys)s[k]=txt(v[k],k==='logline'?3000:5000);
  s.direction=Object.hasOwn(DIRECTIONS,v.direction)?v.direction:'auto';
  for(const [list,max,factory,fields] of [['characters',30,newCharacter,Object.keys(CHARACTER_FIELDS)],['relationships',100,newRelation,Object.keys(RELATION_FIELDS)],['beats',24,newBeat,['label','character',...Object.keys(BEAT_FIELDS)]]]) {
    if(v[list]!=null&&!Array.isArray(v[list]))throw new Error('قائمة الشخصيات أو العلاقات أو الإيقاع غير صالحة.');
    if((v[list]?.length||0)>max)throw new Error('تجاوزت بيانات القصة حد الشخصيات أو العلاقات أو الإيقاعات.');
    const ids=new Set();s[list]=(v[list]||[]).map(item=>{
      if(!item||typeof item!=='object')throw new Error('إحدى بطاقات بناء القصة غير صالحة.');
      const n=factory();if(typeof item.id==='string'&&item.id.length<100&&!ids.has(item.id))n.id=item.id;ids.add(n.id);
      for(const k of fields)n[k]=txt(item[k]);
      if(list==='characters'){n.role=['hero','opponent','support'].includes(item.role)?item.role:'support';n.level=['main','secondary'].includes(item.level)?item.level:n.role==='hero'?'main':'secondary';}
      else if(list==='beats')n.type=Object.hasOwn(BEAT_TYPES,item.type)?item.type:'development';
      return n;
    });
  }
  if(v.approval&&typeof v.approval.fingerprint==='string')s.approval={fingerprint:txt(v.approval.fingerprint,100),date:txt(v.approval.date,100)};
  return s;
}
export function normalizeDrama(v) {
  if(!v||typeof v!=='object')return null;
  return Object.fromEntries(['beatId','planSceneId',...Object.keys(DRAMA_FIELDS)].map(k=>[k,txt(v[k],k.endsWith('Id')?100:5000)]));
}
export function directionFor(p) {return p.story.direction==='auto'?(p.format==='tv'?'inside':'outside'):p.story.direction;}
export function storyFingerprint(p) {
  const {approval,...story}=p.story;
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  const text=JSON.stringify(stable({method:METHOD,idea:p.idea,pillars:p.pillars,genre:p.genre,format:p.format,language:p.language,dialect:p.dialect,sceneCount:p.sceneCount,story}));
  let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `dna-${(hash>>>0).toString(16)}-${text.length}`;
}
export function isApproved(p) {return p.story.approval?.fingerprint===storyFingerprint(p);}
export function storyChecks(p) {
  const s=p.story,checks=[];
  const add=(ok,stage,message,field='',id='')=>checks.push({ok:!!ok,stage,message,field,id});
  add(p.idea.trim().length>=30,'dna','اكتب فكرة من ٣٠ حرفًا على الأقل.','ideaInput');
  for(const [k,message] of [['hero','حدد من هو البطل.'],['goal','حدد الهدف الذي يسعى إليه البطل.'],['obstacle','حدد العائق الأساسي الواضح من البداية.'],['stakes','حدد ما قد يخسره البطل إذا فشل.']])add(has(p.pillars[k]),'dna',message,`pillar-${k}`);
  for(const [k,message] of [['problem','حدد المشكلة التي تدفع البطل إلى الفعل.'],['need','حدد الحاجة التي تولدها المشكلة.'],['urgency','فسّر لماذا يجب أن يتحرك الآن.'],['means','حدد الوسيلة أو القدرة التي يحتاجها لتجاوز العائق.']])add(has(s[k]),'dna',message,`story-${k}`);
  if(p.format!=='short')add(has(s.stageGoal),'dna','حدد هدفًا مرحليًا يخدم الهدف الأكبر.','story-stageGoal');
  add(s.characters.some(c=>c.role==='hero'&&has(c.name)),'characters','أضف بطاقة للبطل وحدد دوره.','characterCards');
  for(const c of s.characters)for(const [k,message] of [['name','أضف اسم الشخصية.'],['motive','وضح دافع الشخصية، حتى يخرج رد الفعل منها.'],['knowledge','سجّل ما تعرفه الشخصية عند البداية.'],['arc','وضح كيف تتغير الشخصية أو يكشف الحدث حقيقتها.']])add(has(c[k]),'characters',`${c.name||'شخصية بلا اسم'}: ${message}`,'',c.id);
  add(new Set(s.characters.filter(c=>has(c.name)).map(c=>c.name.trim())).size===s.characters.filter(c=>has(c.name)).length,'characters','ميّز الشخصيات بأسماء مختلفة.','characterCards');
  if(p.format==='tv')add(s.relationships.length>0,'characters','أضف علاقة تربط الشخصيات في الحلقة.','relationshipCards');
  for(const r of s.relationships){
    add(r.from!==r.to&&[r.from,r.to].every(name=>has(name)&&s.characters.some(c=>c.name.trim()===name.trim())),'characters','اربط العلاقة بشخصيتين مختلفتين موجودتين في البطاقات.','',r.id);
    for(const [k,label] of Object.entries(RELATION_FIELDS).filter(([k])=>!['from','to'].includes(k)))add(has(r[k]),'characters',`${r.from||'العلاقة'} / ${r.to||'شخصية'}: أكمل «${label}».`,'',r.id);
  }
  add(has(p.genre),'logline','حدد النوع الدرامي.','genreInput');
  add(has(s.conflictNature),'logline','وضح طبيعة الصراع التي يوجهها النوع الدرامي.','story-conflictNature');
  add(has(s.logline),'logline','اكتب السطر التمهيدي: بطل وهدف وعائق ومخاطر.','story-logline');
  for(const [k,message] of [['opening','حدد حالة البداية.'],['inciting','حدد الحدث الذي يدفع القصة إلى الحركة.'],['entryPoint','حدد نقطة دخول المشاهد إلى الحدث.']])add(has(s[k]),'beats',message,`story-${k}`);
  add(has(p.pillars.ending),'beats','حدد حالة النهاية أو النهاية المفتوحة المقصودة.','pillar-ending');
  add(s.beats.length>=2,'beats','أنشئ ورقة إيقاع تحتوي على وحدتين على الأقل.','beatCards');
  add(s.beats.length<=p.sceneCount,'dna','عدد الإيقاعات أكبر من مشاهد الدفعة. زد عدد المشاهد أو اجمع الإيقاعات قبل التخطيط.','sceneCountInput');
  s.beats.forEach((b,i)=>{
    const label=`الإيقاع ${i+1} (${b.label||BEAT_TYPES[b.type]}): `;
    add(has(b.event),'beats',label+'حدد الحدث الذي نراه.','',b.id);
    add(s.characters.some(c=>c.name.trim()===b.character.trim()&&has(c.name)),'beats',label+'حدد الشخصية المحرّكة من بطاقات الشخصيات.','',b.id);
    add(has(b.result),'beats',label+'حدد نتيجة الحدث أو المحاولة.','',b.id);
    if(!['ending','bridge'].includes(b.type))for(const k of ['goal','obstacle','attempt','decision'])add(has(b[k]),'beats',label+`أكمل «${BEAT_FIELDS[k]}».`,'',b.id);
    if(i<s.beats.length-1)add(has(b.cause),'beats',label+'فسّر كيف تؤدي النتيجة إلى الإيقاع التالي.','',b.id);
  });
  const missing=checks.filter(c=>!c.ok);
  return {checks,missing,ready:!missing.length,completed:checks.length-missing.length,total:checks.length,percent:Math.round(100*(checks.length-missing.length)/Math.max(checks.length,1))};
}
export function proposeLogline(p) {
  const x=p.pillars;if(![x.hero,x.goal,x.obstacle,x.stakes].every(has))throw new Error('أكمل البطل والهدف والعائق والمخاطر قبل اقتراح السطر التمهيدي.');
  return `${p.story.inciting||p.story.problem?`حين ${p.story.inciting||p.story.problem}، `:''}يسعى ${x.hero} إلى ${x.goal}، لكن ${x.obstacle} يقف في طريقه، وإلا ${x.stakes}.`;
}
export function seedBeats(count=6) {
  count=Math.max(2,Math.min(24,Math.round(count)||6));
  return Array.from({length:count},(_,i)=>newBeat(i===0?'opening':i===count-1?'ending':i===1?'trigger':i===count-2?'climax':i>=count/2?'escalation':'development'));
}
export function foundationContext(p) {
  const {approval,...story}=p.story;
  return {idea:p.idea,pillars:p.pillars,genre:p.genre,format:p.format,direction:DIRECTIONS[directionFor(p)],language:p.language,dialect:p.dialect,sceneCount:p.sceneCount,story};
}
export function promptForFoundation(p) {
  return `أنت محرر درامي تساعد المؤلف على بناء قصة أصلية وفق «${METHOD_TITLE}». هذه مسودة مقترحة يراجعها المؤلف. حافظ حرفيًا على كل قيمة أدخلها المؤلف، واملأ الفراغات باقتراحات مترابطة دون نسخ أعمال منشورة.\nالمدخلات: ${JSON.stringify(foundationContext(p))}\nالمنهج: المشكلة تولد حاجة تدفع البطل إلى الفعل. بطل يريد هدفًا واضحًا، وعائق أساسي واضح منذ البداية، ومخاطر ملموسة، وسبب للتحرك الآن. اقترح وسائل وخطوات: محاولة ثم نتيجة ثم قرار جديد. للتلفزيون يمكن الانطلاق من الشخصية لصنع الحدث، وللفيلم يمكن أن يكشف الحدث الشخصية أو يغيرها؛ هذه اتجاهات قابلة للجمع وليست قوانين. رد الفعل ينتج من الدافع والمعرفة المتاحة. النوع الدرامي يحدد طبيعة الصراع. اكتب سطرًا تمهيديًا يربط الجوهر بالحبكة والنوع، وحدد البداية والنهاية والحدث المحرك ونقطة الدخول. اكتب ورقة إيقاع من ٢ إلى ${Math.min(p.sceneCount,24)} وحدات، وهي تطور القصة قبل تقسيمها النهائي إلى مشاهد. ليست كل وحدة ملزمة بصراع؛ ending وbridge يمكن أن تغلقا أو تربطا الحدث. لا تستخدم أرقام المواسم أو مدد الإنتاج أو المعادلات غير المكتملة كقواعد.\nلغة الوصف ${p.language==='en'?'English':'العربية'}، لهجة الحوار ${p.dialect}. أسماء الشخصيات متطابقة بين البطاقات والعلاقات والإيقاعات. للحلقة التلفزيونية أضف علاقة واحدة على الأقل؛ اذكر الرابط والتوتر والتغير وحدود معرفة الطرفين. أعِد JSON فقط بالبنية الكاملة:\n{"pillars":{"hero":"البطل","goal":"الهدف","obstacle":"العائق","stakes":"الخسارة","ending":"النهاية"},"story":{"problem":"المشكلة","need":"الحاجة","urgency":"لماذا الآن","stageGoal":"هدف مرحلي","means":"وسائل الحل","conflictNature":"طبيعة الصراع","logline":"السطر التمهيدي","opening":"حالة البداية","inciting":"الحدث المحرك","entryPoint":"نقطة الدخول","characters":[{"name":"اسم","role":"hero أو opponent أو support","level":"main أو secondary","goal":"رغبة","need":"حاجة داخلية","motive":"دافع","knowledge":"معرفة البداية","arc":"تغير أو كشف"}],"relationships":[{"from":"اسم موجود","to":"اسم آخر موجود","bond":"الرابط","tension":"التوتر أو الاختلاف","change":"تغير العلاقة","limit":"معرفة الطرفين وما يخفيانه"}],"beats":[{"label":"اسم الإيقاع","type":"opening أو trigger أو development أو escalation أو climax أو ending أو bridge","character":"اسم موجود","heading":"داخلي - مكان - نهار","event":"الحدث","goal":"هدف مرحلي","obstacle":"العائق","attempt":"المحاولة","result":"النتيجة","decision":"القرار","cause":"سبب الحدث التالي؛ فارغ فقط للنهاية","stakes":"المخاطر","knowledge":"المعلومة المتاحة"}]}}`;
}
export function validateFoundation(v,p) {
  if(!v?.pillars||!v.story)throw new Error('رد بناء القصة غير مكتمل. لم تُستبدل بياناتك.');
  const pillars={};for(const k of Object.keys(p.pillars)){if(!has(v.pillars[k])||v.pillars[k].length>3000)throw new Error('رد بناء القصة يفتقد إحدى الركائز.');pillars[k]=v.pillars[k];}
  const story=normalizeStory(v.story);
  const checks=storyChecks({...p,pillars,story});if(story.beats.length>p.sceneCount||!checks.ready)throw new Error(`رد بناء القصة غير مكتمل: ${checks.missing[0]?.message||'عدد الإيقاعات يتجاوز الدفعة.'} بياناتك محفوظة؛ أعد المحاولة.`);
  return {pillars,story};
}
export function mergeFoundation(p,f) {
  for(const k of Object.keys(p.pillars))if(!has(p.pillars[k]))p.pillars[k]=f.pillars[k];
  for(const k of storyKeys)if(!has(p.story[k]))p.story[k]=f.story[k];
  const mergeList=(key,fields)=>{
    if(!p.story[key].length){p.story[key]=structuredClone(f.story[key]);return;}
    p.story[key].forEach((old,i)=>{const unnamed=!has(old.name);const fresh=key==='characters'?(f.story[key].find(n=>n.name===old.name)||(unnamed?f.story[key][i]:null)):f.story[key][i];if(!fresh)return;for(const k of fields)if(!has(old[k]))old[k]=fresh[k];if(key==='characters'&&unnamed&&fresh.role){old.role=fresh.role;old.level=fresh.level;}});
  };
  mergeList('characters',Object.keys(CHARACTER_FIELDS));mergeList('beats',['label','character',...Object.keys(BEAT_FIELDS)]);
  if(!p.story.relationships.length)p.story.relationships=structuredClone(f.story.relationships);
  else for(const old of p.story.relationships){const fresh=f.story.relationships.find(r=>r.from===old.from&&r.to===old.to);if(fresh)for(const key of Object.keys(RELATION_FIELDS))if(!has(old[key]))old[key]=fresh[key];}
  p.story.approval=null;
}
export function planFromBeats(p) {
  return {method:METHOD,sourceFingerprint:storyFingerprint(p),title:p.title,logline:p.story.logline,synopsis:p.idea,characters:structuredClone(p.story.characters),scenes:p.story.beats.map(b=>({id:uid(),beatId:b.id,heading:b.heading||'داخلي - حدّد المكان - نهار',summary:b.event,character:b.character,goal:b.goal,obstacle:b.obstacle,attempt:b.attempt,result:b.result,turn:b.result,decision:b.decision,cause:b.cause,stakes:b.stakes,knowledgeBefore:b.knowledge,knowledgeAfter:'',written:false}))};
}
export function planIssues(p) {
  const plan=p.plan;if(!plan)return [];
  const issues=[];const note=(message,id='',severity='required')=>issues.push({stage:'plan',message,id,severity});
  if(plan.method!==METHOD)note('هذه خطة من الإصدار السابق. ابنِ أساس القصة ثم أنشئ خطة وفق الخريطة.');
  if(plan.sourceFingerprint!==storyFingerprint(p))note('تغيّر أساس القصة بعد إنشاء الخطة. أعد التخطيط لربط المشاهد بالنسخة الحالية.');
  if(!isApproved(p))note('اعتمد أساس القصة بعد إكمال المراجعة.');
  const covered=new Set();
  plan.scenes.forEach((s,i)=>{
    const beat=p.story.beats.find(b=>b.id===s.beatId);if(beat)covered.add(beat.id);else note(`المشهد ${i+1}: اربطه بإيقاع موجود.`,s.id);
    for(const [k,label] of [['heading','عنوان المكان والزمان'],['summary','الحدث'],['character','الشخصية المحرّكة'],['result','النتيجة']])if(!has(s[k])||(k==='heading'&&/حدّد المكان/.test(s[k])))note(`المشهد ${i+1}: أكمل ${label}.`,s.id);
    if(!p.story.characters.some(c=>c.name.trim()===s.character?.trim()))note(`المشهد ${i+1}: اسم الشخصية المحرّكة غير موجود في بطاقاتها.`,s.id);
    if(beat&&!['ending','bridge'].includes(beat.type))for(const k of ['goal','obstacle','attempt','decision'])if(!has(s[k]))note(`المشهد ${i+1}: أكمل ${DRAMA_FIELDS[k]}.`,s.id);
    if(i<plan.scenes.length-1&&!has(s.cause))note(`المشهد ${i+1}: كيف تقود النتيجة إلى المشهد التالي؟`,s.id);
    if(!has(s.knowledgeBefore))note(`المشهد ${i+1}: راجع المعلومات التي تعرفها الشخصية قبل الحدث.`,s.id,'warning');
    if(!has(s.knowledgeAfter))note(`المشهد ${i+1}: سجّل ما تعرفه الشخصية بعد الحدث، ولو لم يتغير.`,s.id,'warning');
  });
  for(const b of p.story.beats)if(!covered.has(b.id))note(`الإيقاع «${b.label}» غير ممثل في خطة المشاهد.`,b.id);
  return issues;
}
export function dramaForScene(s) {return normalizeDrama({...s,planSceneId:s.id});}
export function sceneReview(p) {
  const notes=[];const heads=p.blocks.filter(b=>b.type==='Scene Heading'&&has(b.text));
  for(const h of heads){if(!h.drama){notes.push({id:h.id,message:`${h.text}: أضف الهدف والمحاولة والنتيجة والقرار في بطاقة المشهد.`});continue;}for(const k of ['character','result'])if(!has(h.drama[k]))notes.push({id:h.id,message:`${h.text}: أكمل ${DRAMA_FIELDS[k]}.`});}
  const linked=heads.filter(h=>h.drama?.planSceneId).map(h=>h.drama.planSceneId);
  const expected=p.plan?.scenes.filter(s=>s.written).map(s=>s.id)||[];
  if(linked.length&&expected.length&&JSON.stringify(linked)!==JSON.stringify(expected))notes.push({id:heads[0]?.id,message:'ترتيب المشاهد المكتوبة تغيّر عن الخطة. راجع روابط الأسباب والنتائج ومعرفة الشخصيات بعد النقل.'});
  return notes;
}
export function storyText(p) {
  const s=p.story;const value=v=>has(v)?v:'لم يُحدد بعد';
  const lines=[p.title,p.author?`تأليف: ${p.author}`:'',METHOD_TITLE,'',`الفكرة: ${value(p.idea)}`,`النوع الدرامي: ${p.genre}`,`طبيعة الصراع: ${value(s.conflictNature)}`,`اتجاه البناء: ${DIRECTIONS[directionFor(p)]}`,'','جوهر القصة',...Object.entries({hero:'البطل',goal:'الهدف',obstacle:'العائق',stakes:'المخاطر',ending:'النهاية'}).map(([k,l])=>`${l}: ${value(p.pillars[k])}`),...Object.entries({problem:'المشكلة',need:'الحاجة',urgency:'لماذا الآن',stageGoal:'الهدف المرحلي',means:'وسائل الحل'}).map(([k,l])=>`${l}: ${value(s[k])}`),'',`السطر التمهيدي: ${value(s.logline)}`,'',`البداية: ${value(s.opening)}`,`الحدث المحرّك: ${value(s.inciting)}`,`نقطة الدخول: ${value(s.entryPoint)}`];
  for(const c of s.characters)lines.push('','بطاقة الشخصية',`حجم الدور: ${c.level==='main'?'رئيسي':'ثانوي'}`,`الدور: ${{hero:'البطل',opponent:'المعارض',support:'شخصية مساندة'}[c.role]||'شخصية مساندة'}`,...Object.entries(CHARACTER_FIELDS).map(([k,l])=>`${l}: ${value(c[k])}`));
  for(const r of s.relationships)lines.push('',`العلاقة: ${value(r.from)} / ${value(r.to)}`,...Object.entries(RELATION_FIELDS).filter(([k])=>!['from','to'].includes(k)).map(([k,l])=>`${l}: ${value(r[k])}`));
  s.beats.forEach((b,i)=>lines.push('',`الإيقاع ${i+1}: ${b.label}`,`الشخصية: ${value(b.character)}`,...Object.entries(BEAT_FIELDS).map(([k,l])=>`${l}: ${value(b[k])}`)));
  if(p.plan)p.plan.scenes.forEach((scene,i)=>lines.push('',`المشهد ${i+1}: ${scene.heading}`,`الحدث: ${scene.summary}`,...Object.entries(DRAMA_FIELDS).map(([k,l])=>`${l}: ${value(scene[k])}`)));
  lines.push('','حدود المرجع',...REFERENCE_NOTES,'','هذه مراجعة لاكتمال بيانات البناء؛ لا تثبت جودة الحبكة أو أصالتها.');return lines.filter(x=>x!==undefined).join('\n');
}
export function printStoryBody(p) {
  const paragraphs=storyText(p).split('\n');
  return `<section class="print-title"><p class="print-kicker">ملف بناء القصة</p><h1>${esc(p.title)}</h1>${p.author?`<p>تأليف<br><strong>${esc(p.author)}</strong></p>`:''}<p class="draft-date">${esc(METHOD_TITLE)}</p></section><article class="story-report" dir="rtl">${paragraphs.slice(2).map(line=>!line?'<div class="report-gap"></div>':/^(?:جوهر القصة|بطاقة الشخصية|حدود المرجع|العلاقة:|الإيقاع [0-9]+:|المشهد [0-9]+:)/.test(line)?`<h2>${esc(line)}</h2>`:`<p>${esc(line)}</p>`).join('')}</article>`;
}
