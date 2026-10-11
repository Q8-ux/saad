const text=(v,n=5000)=>typeof v==='string'?v.slice(0,n):'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`shot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const SHOTS=[
 {id:'wide',ar:'لقطة عامة',en:'Wide establishing shot',use:'توضيح المكان وعلاقة الأشخاص به.',reference:'establishing-shot'},
 {id:'master',ar:'لقطة جامعة',en:'Master shot',use:'حفظ حركة المشهد ومواقع الشخصيات.',reference:'master-shot'},
 {id:'two',ar:'لقطة ثنائية',en:'Two-shot',use:'إظهار العلاقة بين شخصيتين.',reference:'two-shot'},
 {id:'three',ar:'لقطة ثلاثية',en:'Three-shot',use:'قراءة التفاعل بين ثلاثة أشخاص.',reference:'three-shot'},
 {id:'medium',ar:'لقطة متوسطة',en:'Medium shot',use:'قراءة الأداء وحركة اليدين.',reference:'medium-shot'},
 {id:'close',ar:'لقطة قريبة',en:'Close-up',use:'قراءة رد فعل محدد دون اختراع معرفة جديدة.',reference:'close-up'},
 {id:'insert',ar:'لقطة تفصيلية',en:'Insert shot',use:'توجيه الانتباه إلى تفصيل موجود في النص.',reference:'insert-shot'},
 {id:'ots',ar:'من خلف الكتف',en:'Over-the-shoulder shot',use:'ربط طرفي الحوار والحفاظ على اتجاه النظر.',reference:'over-the-shoulder'},
 {id:'pov',ar:'وجهة نظر الشخصية',en:'Point-of-view shot',use:'إظهار ما يراه صاحب وجهة النظر فعلًا.',reference:'pov-shot'},
 {id:'overhead',ar:'لقطة علوية',en:'Overhead shot',use:'توضيح ترتيب الأدوات والأوراق.',reference:'overhead-shot'}
];
export const MOODS=[{id:'natural',ar:'واقعي هادئ'},{id:'tense',ar:'توتر مكتوم'},{id:'warm',ar:'دفء وعلاقة'},{id:'comic',ar:'كوميديا من الفعل'}];
export const LIGHTS=[{id:'motivated',ar:'إضاءة لها مصدر داخل المكان',en:'Motivated lighting with a plausible source matching the written time and location'},{id:'available',ar:'الإضاءة المتاحة في المكان',en:'Available light consistent with the scene time and location'},{id:'soft',ar:'إضاءة ناعمة',en:'Soft naturalistic lighting consistent with the written location'},{id:'low',ar:'تباين وظلال للمشهد',en:'Low-key lighting with a justified practical source; do not change the written time of day'}];
export function newCinematic(){return {version:1,settings:{mood:'natural',lighting:'motivated',ratio:'16:9'},bible:'',plans:[]};}
const choice=(v,items,fallback)=>items.some(i=>i.id===v)?v:fallback;
export function normalizeCinematic(value){
 const out=newCinematic();if(!value||typeof value!=='object')return out;
 out.settings={mood:choice(value.settings?.mood,MOODS,'natural'),lighting:choice(value.settings?.lighting,LIGHTS,'motivated'),ratio:['16:9','4:3','2.39:1'].includes(value.settings?.ratio)?value.settings.ratio:'16:9'};
 out.bible=text(value.bible,20000);
 const ids=new Set();
 out.plans=(Array.isArray(value.plans)?value.plans:[]).slice(0,250).filter(p=>p&&typeof p.sceneId==='string'&&!ids.has(p.sceneId)&&(ids.add(p.sceneId),true)).map(p=>{
  const plan={sceneId:text(p.sceneId,100),sourceFingerprint:text(p.sourceFingerprint,100),settingsFingerprint:text(p.settingsFingerprint,100),purpose:text(p.purpose),observer:text(p.observer,300),guard:text(p.guard),notes:text(p.notes),shots:[]};
  const shotIds=new Set();
  plan.shots=(Array.isArray(p.shots)?p.shots:[]).slice(0,40).map(s=>{const id=typeof s?.id==='string'&&s.id.length<100&&!shotIds.has(s.id)?s.id:uid();shotIds.add(id);return {id,sourceId:text(s?.sourceId,100),type:choice(s?.type,SHOTS,'medium'),visual:text(s?.visual,10000),subjectEn:text(s?.subjectEn,10000),purpose:text(s?.purpose),movement:text(s?.movement,600),lighting:text(s?.lighting,1200),sound:text(s?.sound,1200),guard:text(s?.guard,3000)};});
  return plan;
 });return out;
}
function hash(value){let h=2166136261;for(const c of JSON.stringify(value)){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(16);}
export const sceneFingerprint=scene=>hash({title:scene.title,summary:scene.summary,drama:scene.drama,blocks:scene.blocks.map(b=>({id:b.id,type:b.type,text:b.text}))});
export const settingsFingerprint=cinema=>hash({settings:cinema.settings,bible:cinema.bible});
export function makeShot(source={},type='medium',mood='natural'){
 const technique=SHOTS.find(s=>s.id===type)||SHOTS[4];
 return {id:uid(),sourceId:source.id||'',type:technique.id,visual:source.type==='Action'?source.text:'',subjectEn:'',purpose:technique.use,movement:mood==='tense'?'ثبات مع اقتراب محدود عند تغير القرار.':'كاميرا ثابتة؛ الحركة عند حاجة الفعل.',lighting:'إضاءة يبررها المكان والوقت المكتوبان.',sound:'الصوت الموجود في المشهد؛ يُراجع دون إضافة حوار.',guard:'لا تعرض معلومة أو هوية لم يثبتها النص.'};
}
export function proposeTreatment(scene,cinema=newCinematic()){
 const actions=scene.blocks.filter(b=>b.type==='Action'&&b.text.trim());
 const plan={sceneId:scene.id,sourceFingerprint:sceneFingerprint(scene),settingsFingerprint:settingsFingerprint(cinema),purpose:scene.summary||scene.drama?.result||'',observer:scene.drama?.character||'',guard:'حد المعرفة قبل المشهد: '+(scene.drama?.knowledgeBefore||'يحتاج تحديدًا')+'\nبعد المشهد: '+(scene.drama?.knowledgeAfter||scene.drama?.result||'يحتاج تحديدًا'),notes:'اقتراح تغطية بصري قابل للتحرير؛ لا يحدد مدة العرض ولا يبدل السيناريو.',shots:[]};
 if(!actions.length)return plan;
 const count=Math.min(6,actions.length);const selected=[];
 for(let i=0;i<count;i++)selected.push(actions[Math.round(i*(actions.length-1)/Math.max(1,count-1))]);
 const types=['wide','master','medium','insert','close','two'];
 plan.shots=selected.map((a,i)=>makeShot(a,types[i],cinema.settings.mood));
 // An insert must refer to a written object/detail, rather than imply one.
 for(const shot of plan.shots)if(shot.type==='insert'&&!/(?:دفتر|ورق|بطاقة|شاشة|جهاز|هاتف|مفتاح|علبة|كوب|طاولة|يد|باب|لوحة|object|screen|phone|paper|hand|door)/iu.test(shot.visual)){shot.type='medium';shot.purpose=SHOTS.find(s=>s.id==='medium').use;}
 return plan;
}
export function treatmentIssues(scene,plan,cinema){
 if(!plan)return [{level:'required',message:'لم تُعد قائمة اللقطات لهذا المشهد.'}];
 const issues=[];
 if(plan.sourceFingerprint!==sceneFingerprint(scene))issues.push({level:'stale',message:'تغير نص المشهد أو بطاقته بعد إعداد اللقطات. راجع الاقتراح قبل استعماله.'});
 if(plan.settingsFingerprint!==settingsFingerprint(cinema))issues.push({level:'stale',message:'تغيرت النبرة أو مرجع الاستمرارية. راجع الإضاءة والبرومبتات.'});
 const missing=['goal','result','decision'].filter(k=>!scene.drama?.[k]?.trim());
 if(missing.length)issues.push({level:'review',message:'هدف المشهد ونتيجته وقراره تحتاج استكمالًا قبل اعتماد التصور.'});
 if(scene.drama?.character&&!scene.blocks.some(b=>b.text.includes(scene.drama.character)))issues.push({level:'review',message:'محور بطاقة المشهد لا يظهر في نصه؛ تحقق من هدف الشخصية داخل هذا المشهد.'});
 if(!plan.purpose.trim())issues.push({level:'review',message:'اكتب وظيفة المشهد في القصة.'});
 if(!plan.shots.length)issues.push({level:'required',message:'أضف فعلًا مرئيًا إلى المشهد أو أدخل لقطة يدوية.'});
 if(plan.shots.some(s=>!s.visual.trim()))issues.push({level:'required',message:'إحدى اللقطات تحتاج وصفًا مرئيًا.'});
 if(plan.shots.some(s=>s.sourceId&&!scene.blocks.some(b=>b.id===s.sourceId)))issues.push({level:'review',message:'حُذفت فقرة ترتبط بها إحدى اللقطات. راجع مرجعها.'});
 if(!cinema.bible.trim())issues.push({level:'review',message:'أكمل مرجع أعمار الشخصيات والمكان والملابس لضبط الاستمرارية.'});
 return issues;
}
export function promptForShot(scene,plan,shot,cinema,kind='image'){
 const technique=SHOTS.find(t=>t.id===shot.type)||SHOTS[4];const light=LIGHTS.find(l=>l.id===cinema.settings.lighting)||LIGHTS[0];
 return [kind==='video'?'Create a short cinematic video study of this written action.':'Create one cinematic storyboard frame of this written action.',`Framing: ${technique.en}. Aspect ratio: ${cinema.settings.ratio}.`,shot.subjectEn.trim()?`Action: ${shot.subjectEn}`:`الفعل المكتوب الذي يجب تصويره بأمانة: ${shot.visual}`,`Scene: ${scene.title}`,`Narrative purpose: ${shot.purpose||plan.purpose}`,`Point of view: ${plan.observer||'راجع صاحب وجهة النظر'}`,`Lighting: ${light.en}. ${shot.lighting}`,kind==='video'?`Camera movement: ${shot.movement}\nSound direction: ${shot.sound}`:'Camera held for one still frame; do not imply camera movement.',`Continuity reference: ${cinema.bible||'Character appearance, ages, costumes and location must be provided before rendering.'}`,`Knowledge and reveal limits: ${plan.guard}\n${shot.guard}`,"Follow the written action and continuity reference; do not invent characters, dialogue, new evidence or an antagonist identity. Add screen/paper typography accurately in post-production rather than fabricate it in the generated image."].join('\n\n');
}
export function storyboardSvg(type='medium'){
 const figures=type==='three'?3:type==='two'||type==='ots'||type==='master'?2:1;
 const scale=(type==='wide'||type==='master')?.75:type==='close'?1.4:1;
 let paths='';
 for(let i=0;i<figures;i++){const x=figures===1?85:figures===2?55+i*65:35+i*50;paths+=`<g transform="translate(${x} 47) scale(${scale})"><path d="M-10-16c-1-17 20-17 20 0s-20 17-20 0M-1 1l-8 32 21 0-11-32M-7 12l-14 16M7 12l18 13M-6 33l-5 24M10 33l8 24"/></g>`;}
 if(type==='insert'||type==='overhead')paths='<path d="M30 33l91-3 9 54-94 2zM45 47l58-2m-55 17 39-1m-47 34 86-2M138 53l11 29m-5-35 6 7"/>';
 return `<svg class="cinema-sketch" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120" role="img" aria-label="رسم تخطيطي لحجم اللقطة"><g fill="none" stroke="#26458a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l162-1 1 102-161 1zM12 12l153-1"/>${paths}<path stroke="#b43844" d="M14 16l12 0m-12 0 0 11M157 93l0 10-12 0"/></g></svg>`;
}
export function cinemaText(project,scenes){const c=project.cinematic;return [`${project.title} — التصور السينمائي`,`مرجع الاستمرارية: ${c.bible}`,...scenes.map(s=>{const p=c.plans.find(p=>p.sceneId===s.id);return p?[`المشهد ${s.number}: ${s.title}`,`الوظيفة: ${p.purpose}`,`وجهة النظر: ${p.observer}`,`حد المعرفة: ${p.guard}`,p.notes,...p.shots.map((shot,i)=>`${i+1}. ${SHOTS.find(t=>t.id===shot.type)?.ar}\n${shot.visual}\nالغاية: ${shot.purpose}\nالحركة: ${shot.movement}\nالإضاءة: ${shot.lighting}\nالصوت: ${shot.sound}\n${promptForShot(s,p,shot,c,'video')}`)].join('\n\n'):'';})].filter(Boolean).join('\n\n');}
export function printCinemaBody(project,scenes){const c=project.cinematic;return `<section class="print-title"><p>تصور سينمائي مقترح</p><h1>${esc(project.title)}</h1><p>${esc(project.author)}</p><p>قائمة لقطات وبرومبتات للمراجعة</p></section><article class="cinema-report"><h2>مرجع الاستمرارية</h2><p>${esc(c.bible||'يحتاج استكمالًا')}</p>${scenes.map(s=>{const p=c.plans.find(p=>p.sceneId===s.id);if(!p)return '';return `<section class="cinema-print-scene"><h2>المشهد ${esc(s.number)} — ${esc(s.title)}</h2>${treatmentIssues(s,p,c).map(i=>`<p class="cinema-warning">${esc(i.message)}</p>`).join('')}<p><strong>الوظيفة:</strong> ${esc(p.purpose)}</p><p><strong>وجهة النظر:</strong> ${esc(p.observer)}</p><p>${esc(p.guard)}</p>${p.shots.map((shot,i)=>`<div class="cinema-print-shot"><h3>${i+1}. ${esc(SHOTS.find(t=>t.id===shot.type)?.ar)}</h3>${storyboardSvg(shot.type)}<p>${esc(shot.visual)}</p><p><strong>الغاية:</strong> ${esc(shot.purpose)}</p><p><strong>الحركة:</strong> ${esc(shot.movement)}</p><p><strong>الصوت:</strong> ${esc(shot.sound)}</p><p>${esc(shot.guard)}</p></div>`).join('')}</section>`;}).join('')}</article>`;}
