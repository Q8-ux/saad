// Source structure is inferred from explicit cues. Author text is never generated.
export const SCRIPT_ANALYSIS_VERSION = 'source-distribution-1';
const MAX_SOURCE = 400000;
const newId = prefix => `${prefix}_${globalThis.crypto.randomUUID()}`;
const clean = value => String(value ?? '').replace(/\r\n?/gu, '\n').replace(/^\uFEFF/u, '');
const key = value => clean(value).replace(/[\u064B-\u065F\u0670]/gu, '').replace(/[أإآ]/gu, 'ا').replace(/ى/gu, 'ي').replace(/[٠-٩۰-۹]/gu, d => String(d.charCodeAt(0) - (d <= '٩' ? 0x660 : 0x6f0))).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
const ordinal = ['اول','ثاني','ثالث','رابع','خامس','سادس','سابع','ثامن','تاسع','عاشر'];
function numberOf(value) { const s = key(value); const n = /(?:^|\s)(\d+)(?:\s|$)/u.exec(s); if(n) return Number(n[1]); return ordinal.findIndex(w => s.split(' ').some(p => p.replace(/^ال/u,'').replace(/ة$/u,'').replace(/^اولي$/u,'اول') === w)) + 1 || null; }
export function sourceFingerprint(value) { let a=2166136261,b=2246822507; const s=clean(value); for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),3266489909);} return `${s.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`; }
const unitHeading = s => /^(?:#{1,3}\s*)?(?:الحلق[ةه]|الفصل(?:\s+المسرحي)?|episode|act)(?=\s|[:：\d٠-٩۰-۹(]|$)/iu.test(s);
const sceneHeading = s => /^(?:#{1,3}\s*)?(?:(?:المشهد|مشهد)(?=\s|[:：\d٠-٩۰-۹(]|$)|(?:INT|EXT|INT\/EXT)\.?\s|(?:داخلي|خارجي)\s*[-–—/]|م\s*[\d٠-٩۰-۹]+)/iu.test(s);
const transition = s => /^(?:قطع(?:\s+إلى)?|انتقال(?:\s+إلى)?|إظلام|CUT(?:\s+TO)?|FADE\s+(?:IN|OUT)|DISSOLVE(?:\s+TO)?)\s*[:：.!…-]*$/iu.test(s);
const direction = s => /^(?:\[|\(|وصف\s*[:：]|حركة\s*[:：])/u.test(s);
function speakerName(value) {
 const s = value.trim().replace(/^[@*]+|\*+$/gu,'').trim();
 if(!s || s.length>100 || s.split(/\s+/u).length>6 || !/^[\p{L}\p{M}\d ._'’\-]+$/u.test(s))return '';
 if(/^(?:العنوان|عنوان|اسم العمل|المؤلف|تأليف|كتابة|الشخصيات|الوصف|وصف|حركة|إضاءة|اضاءة|مؤثرات|صوت|ملاحظة|ملاحظات|الوقت|المكان|داخلي|خارجي|نهار|ليل|title|author|sfx|sound)$/iu.test(s)||sceneHeading(s)||unitHeading(s))return '';
 return s;
}
function inlineSpeaker(s) {
 const m=/^(.{1,100}?)\s*[:：]\s*(.*)$/u.exec(s);if(!m)return null;
 const parts=/^(.*?)\s*(\([^)]*\)|\[[^\]]*\])?$/u.exec(m[1]);
 const name=speakerName(parts[1]);return name?{name,text:m[2],direction:parts[2]||''}:null;
}
function chunks(value) {
 const out=[];let rest=value.trim();while(rest.length>30000){let end=rest.lastIndexOf('\n',30000);if(end<15000)end=rest.lastIndexOf(' ',30000);if(end<1)end=30000;out.push(rest.slice(0,end));rest=rest.slice(end).trimStart();}if(rest)out.push(rest);return out;
}
/** @param {string} value @param {{name?:string,characters?:any[]}} options */
export function analyzeScriptSource(value,{name='نص ملصق',characters=[]}={}) {
 const source=clean(value);if(!source.trim())throw Error('المصدر فارغ.');if(source.length>MAX_SOURCE)throw Error('النص يتجاوز ٤٠٠ ألف حرف؛ أرسله على دفعات.');
 const lines=source.split('\n'),known=new Set(characters.map(c=>key(typeof c==='string'?c:c.name)));
 for(const raw of lines){const m=inlineSpeaker(raw.trim());if(m)known.add(key(m.name));}
 const scenes=[];let unit=null,scene=null,pending=[],pendingType='action',pendingSpeaker='',speaker='',speakerCue='',speakerHasText=false,consumed=0,dialogues=0;
 const ensure=()=>scene||(scene={heading:'',number:null,unit,blocks:[]},scenes.push(scene),scene);
 const flush=()=>{if(pending.length){for(const text of chunks(pending.join('\n')))ensure().blocks.push({type:pendingType,text,...(pendingSpeaker?{speaker:pendingSpeaker}:{})});pending=[];}};
 const closeSpeaker=()=>{if(speaker&&!speakerHasText){flush();pendingType='action';pendingSpeaker='';pending=[speakerCue||speaker];flush();}speaker='';speakerCue='';speakerHasText=false;};
 const add=(type,text,name='')=>{if(pendingType!==type||pendingSpeaker!==name)flush();pendingType=type;pendingSpeaker=name;pending.push(text);};
 for(let lineIndex=0;lineIndex<lines.length;lineIndex++){const raw=lines[lineIndex],s=raw.trim();if(!s){flush();if(speakerHasText){speaker='';speakerCue='';}continue;}consumed++;
  if(unitHeading(s)){closeSpeaker();flush();unit={title:s,number:numberOf(s)};scene=null;speaker='';continue;}
  if(sceneHeading(s)){closeSpeaker();flush();scene={heading:s,number:numberOf(s),unit,blocks:[]};scenes.push(scene);speaker='';continue;}
  if(transition(s)){closeSpeaker();flush();add('transition',s);flush();speaker='';continue;}
  const sound=/^(?:صوت|مؤثرات(?:\s+صوتية)?|إضاءة|sfx|sound)\s*[:：]/iu.test(s);
  const song=/^(?:أغنية|غناء|lyrics)\s*[:：]/iu.test(s);
  if(sound||song||direction(s)){flush();add(sound?'sound':song?'song':'action',s);flush();if(speakerHasText||sound||song){speaker='';speakerCue='';}continue;}
  const inline=inlineSpeaker(s);
  if(inline){closeSpeaker();flush();const next=lines.slice(lineIndex+1).find(v=>v.trim())?.trim();if(!inline.text&&(!next||sceneHeading(next)||unitHeading(next)||inlineSpeaker(next)||transition(next))){add('action',raw);flush();speaker='';continue;}speaker=inline.name;speakerCue=inline.name+':';speakerHasText=!!inline.text;if(inline.direction){add('action',inline.direction);flush();}if(inline.text){add('dialogue',inline.text,speaker);dialogues++;}continue;}
  const bare=speakerName(s),next=lines.slice(lineIndex+1).find(v=>v.trim())?.trim();
  if(bare&&next&&!sceneHeading(next)&&!unitHeading(next)&&!transition(next)&&!inlineSpeaker(next)&&!known.has(key(next))&&(known.has(key(bare))||/^@|^\*\*.+\*\*$|^[A-Z][A-Z ._'’-]+$/u.test(s))){flush();speaker=bare;speakerCue=raw;speakerHasText=false;continue;}
  if(speaker){add('dialogue',raw.trimEnd(),speaker);dialogues++;speakerHasText=true;}else add('action',raw.trimEnd());
 }
 flush();if(!scenes.length)ensure();
 // Empty cue-only lines must not vanish when there is no following dialogue.
 if(speaker&&!speakerHasText)ensure().blocks.push({type:'action',text:speakerCue||speaker});
 if(scenes.length>400)throw Error('عدد المشاهد أكبر من ٤٠٠.');
 const blocks=scenes.flatMap(s=>s.blocks);if(scenes.some(s=>s.blocks.length>1500))throw Error('عدد فقرات أحد المشاهد كبير جدًا.');
 return {name,sourceText:source,fingerprint:sourceFingerprint(source),scenes,metrics:{scenes:scenes.length,dialogues:blocks.filter(b=>b.type==='dialogue').length,blocks:blocks.length,lines:consumed},warnings:blocks.some(b=>b.type==='dialogue')?[]:['لم تظهر علامات متحدث واضحة؛ حُفظ النص وصفًا دون اختراع أسماء.']};
}
export function looksLikeScriptSource(value) { const lines=clean(value).split('\n').filter(s=>s.trim()); return lines.length>1&&(lines.some(s=>sceneHeading(s.trim())||unitHeading(s.trim()))||lines.filter(s=>inlineSpeaker(s.trim())).length>=2); }
export function prepareAssistantSources(message,files=[]) {
 const text=clean(message),lines=text.split('\n');if(!looksLikeScriptSource(text))return {message:text,files};
 const first=lines.findIndex(s=>sceneHeading(s.trim())||unitHeading(s.trim()));
 const prefix=first>0?lines.slice(0,first).join('\n').trim():'';
 const hasCommand=prefix.length<1000&&/^(?:وز[ّ]?ع|نس[ّ]?ق|استورد|أعد توزيع|اعد توزيع|حل[ّ]?ل.*(?:وزع|وزّع))/u.test(prefix);
 return {message:hasCommand?prefix:'وزّع النص الملصق حسب التنسيق الفرنسي',files:[...files,{name:'نص ملصق',format:'نص',text:hasCommand?lines.slice(first).join('\n'):text}]};
}
export function hasExplicitSceneSelection(message){return /(?:المشهد|المشاهد)\s*(?:رقم\s*)?(?:[\d٠-٩۰-۹]|الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/u.test(message);}
export function shouldDistributeScript(message,files=[]) {
 const s=String(message||'').trim();if(/(?:لا|بدون)\s+(?:حفظ|تعديل|تنفيذ)/u.test(s)||/^\s*(?:ما رأيك|قيّم|قيم|انتقد|اقترح)/u.test(s))return false;
 return /(?:وز[ّ]?ع|توزيع|نس[ّ]?ق|تنسيق|استورد|إعادة توزيع|اعد توزيع|أعد توزيع)/u.test(s)||(!s&&files.length>0);
}
function blocksFor(parsed,doc) {return parsed.map(block=>{
 let character;if(block.speaker){character=doc.characters.find(c=>key(c.name)===key(block.speaker));if(!character){if(doc.characters.length>=100)throw Error('عدد الشخصيات أكبر من ١٠٠.');character={id:newId('char'),name:block.speaker,role:'',age:'',bio:'',color:'#71516f'};doc.characters.push(character);}}
 return {id:newId('block'),type:block.type,text:block.text,...(character?{characterId:character.id}:{})};
 });}
function resolveUnit(doc,source,active){if(!source)return active?.unitId;let unit=doc.units.find(u=>key(u.title)===key(source.title));if(!unit&&source.number)unit=doc.units.find(u=>numberOf(u.title)===source.number);if(!unit){if(doc.units.length>=100)throw Error('عدد الحلقات أو الفصول أكبر من ١٠٠.');unit={id:newId('unit'),title:source.title.slice(0,250),summary:''};doc.units.push(unit);}return unit.id;}
function makeScene(parsed,unitId){return {id:newId('scene'),title:(parsed.heading||'مشهد مستورد').slice(0,250),minutes:0,...(unitId?{unitId}:{}),location:'',time:'',summary:'',status:'draft',notes:'',blocks:[]};}
function sceneSignature(scene){return scene.blocks.map(b=>[b.type,key(b.speaker||''),b.text]).join('\n');}
/** @param {any} current @param {Array<{name?:string,text:string}>} files @param {{sceneId?:string,targetSceneIds?:string[],replace?:boolean,notes?:string}} options */
export function distributeScriptSources(current,files,{sceneId,targetSceneIds=[],replace=false,notes=''}={}) {
 if(!['play','series','film'].includes(current?.kind))throw Error('اختر مسلسلًا أو فيلمًا أو مسرحية.');
 if(!Array.isArray(files)||!files.length||files.length>6||files.reduce((n,f)=>n+String(f.text||'').length,0)>MAX_SOURCE)throw Error('أرفق نصًا مقروءًا بحد أقصى ٤٠٠ ألف حرف.');
 const doc=structuredClone(current),active=doc.scenes.find(s=>s.id===sceneId)||doc.scenes.at(-1),changed=new Set(),old=doc.sourceProject?.scriptAnalysis||{},receipts=[...(Array.isArray(old.sources)?old.sources:[])];
 const plans=files.map(f=>analyzeScriptSource(f.text,{name:f.name,characters:doc.characters}));
 const pieces=plans.filter(p=>!receipts.some(r=>r.fingerprint===p.fingerprint)).flatMap(p=>p.scenes);
 if(targetSceneIds.some(id=>!doc.scenes.some(s=>s.id===id))||new Set(targetSceneIds).size!==targetSceneIds.length)throw Error('المشاهد المطلوبة غير صالحة.');
 if(targetSceneIds.length&&pieces.length>targetSceneIds.length)throw Error('النص يحتوي مشاهد أكثر من النطاق المحدد؛ وسّع النطاق.');
 let cursor=0;
 for(const plan of plans){if(receipts.some(r=>r.fingerprint===plan.fingerprint))continue;const sourceSceneIds=[],numbered=new Map();
  for(const parsed of plan.scenes){const unitId=resolveUnit(doc,parsed.unit,active),numberKey=parsed.number?`${unitId||''}:${parsed.number}`:'',repeated=numberKey&&numbered.has(numberKey);let target=targetSceneIds.length?doc.scenes.find(s=>s.id===targetSceneIds[cursor++]):null;
   if(!target&&numberKey&&numbered.has(numberKey)){const previous=numbered.get(numberKey);if(key(previous.heading)!==key(parsed.heading))throw Error('يوجد رقم مشهد مكرر بعناوين متعارضة في المصدر.');target=doc.scenes.find(s=>s.id===previous.id);}
   if(!target&&parsed.number){const pool=doc.scenes.filter(s=>s.unitId===unitId);target=pool[parsed.number-1];}
   if(!target&&!parsed.heading)target=active;
   if(!target){target=makeScene(parsed,unitId);const last=doc.scenes.findLastIndex(s=>s.unitId===unitId);doc.scenes.splice(last<0?doc.scenes.length:last+1,0,target);}
   if(numberKey)numbered.set(numberKey,{id:target.id,heading:parsed.heading});
   let blocks=blocksFor(parsed.blocks,doc);if(parsed.heading&&(parsed.heading.length>250||key(target.title)!==key(parsed.heading)&&!/^المشهد\s*(?:الأول|\d+)?$/u.test(target.title)))blocks.unshift(...chunks(parsed.heading).map(text=>({id:newId('heading'),type:'heading',text})));if(parsed.unit?.title.length>250)blocks.unshift(...chunks(parsed.unit.title).map(text=>({id:newId('heading'),type:'heading',text})));
   if(replace&&!repeated){const ids=new Set(target.blocks.map(b=>b.id));doc.comments=doc.comments.map(c=>c.sceneId===target.id&&ids.has(c.blockId)?{...c,blockId:undefined}:c);target.blocks=blocks;}else target.blocks.push(...blocks);
   if(!target.blocks.length&&parsed.heading)target.blocks.push({id:newId('block'),type:'heading',text:parsed.heading});
   if(parsed.heading&&(/^المشهد\s*(?:الأول|\d+)?$/u.test(target.title)||!target.blocks.length))target.title=parsed.heading.slice(0,250);
   target.status='draft';changed.add(target.id);sourceSceneIds.push(target.id);
  }
  receipts.push({name:String(plan.name||'نص ملصق').slice(0,250),fingerprint:plan.fingerprint,sceneIds:sourceSceneIds,metrics:plan.metrics});
 }
 if(doc.scenes.length>400||doc.scenes.some(s=>s.blocks.length>1500))throw Error('تجاوز التوزيع حدود المخطوط؛ قسّم الملفات.');
 if(notes.trim()&&changed.size){for(const text of notes.trim().match(/[\s\S]{1,5000}/gu)||[])doc.comments.push({id:newId('note'),sceneId:[...changed][0],text,resolved:false,createdAt:new Date().toISOString()});if(doc.comments.length>1500)throw Error('عدد الملاحظات يتجاوز حد المخطوط.');}
 doc.sourceProject={...doc.sourceProject,layout:'french',scriptAnalysis:{...old,version:SCRIPT_ANALYSIS_VERSION,sources:receipts}};
 return {doc,sceneIds:[...changed],plans,changed:changed.size>0||current.sourceProject?.layout!=='french'};
}
// Re-read persisted author paragraphs, never an older upload over newer edits.
export function reanalyzeStoredScript(current) {
 if(!current||!['play','series','film'].includes(current.kind))return {doc:current,changed:false,scenes:0,dialogues:0};
 const hasRaw=current.scenes.some(s=>s.blocks.some(b=>b.type==='action'&&looksLikeScriptSource(b.text)));
 const imported=/import/iu.test(current.contentRevision||'')||current.sourceProject?.importedFormat||Array.isArray(current.sourceProject?.files)||Array.isArray(current.sourceProject?.blocks);
 if(!hasRaw&&current.sourceProject?.scriptAnalysis?.version===SCRIPT_ANALYSIS_VERSION)return {doc:current,changed:false,scenes:0,dialogues:0};
 if(!hasRaw&&!imported)return {doc:current,changed:false,scenes:0,dialogues:0};
 const signature=sourceFingerprint(JSON.stringify([current.units,current.characters,current.scenes,current.comments]));
 if(current.sourceProject?.scriptAnalysis?.storedFingerprint===signature&&current.sourceProject?.layout==='french')return {doc:current,changed:false,scenes:0,dialogues:0};
 const doc=structuredClone(current),scenes=[],blockOwners=new Map();let dialogues=0;
 for(const original of doc.scenes){let scene={...original,blocks:[]};scenes.push(scene);
  for(const block of original.blocks){if(block.type!=='action'||!looksLikeScriptSource(block.text)){scene.blocks.push(block);blockOwners.set(block.id,scene.id);continue;}
   const plan=analyzeScriptSource(block.text,{characters:doc.characters});
   if(!plan.metrics.dialogues&&plan.scenes.length===1){scene.blocks.push(block);blockOwners.set(block.id,scene.id);continue;}
   let first=true;
   for(const parsed of plan.scenes){if(!first){scene=makeScene(parsed,resolveUnit(doc,parsed.unit,original));scenes.push(scene);}else if(parsed.unit)scene.unitId=resolveUnit(doc,parsed.unit,original);
    if(first&&parsed.heading){if(/^(?:المشهد|مشهد)(?:\s*(?:الأول|\d+))?$/u.test(scene.title))scene.title=parsed.heading.slice(0,250);else scene.blocks.push(...chunks(parsed.heading).map(text=>({id:newId('heading'),type:'heading',text})));}if(parsed.heading.length>250&&(!first||scene.title===parsed.heading.slice(0,250)))scene.blocks.push(...chunks(parsed.heading).map(text=>({id:newId('heading'),type:'heading',text})));if(parsed.unit?.title.length>250)scene.blocks.push(...chunks(parsed.unit.title).map(text=>({id:newId('heading'),type:'heading',text})));
    const added=blocksFor(parsed.blocks,doc);if(first&&added.length)added[0].id=block.id;
    scene.blocks.push(...added);for(const b of added)blockOwners.set(b.id,scene.id);if(first&&!added.length){scene.blocks.push({...block,text:parsed.heading||block.text,type:'heading'});blockOwners.set(block.id,scene.id);}
    first=false;
   }
   dialogues+=plan.metrics.dialogues;
  }
 }
 if(scenes.length>400||scenes.some(s=>s.blocks.length>1500))throw Error('التوزيع المحفوظ يتجاوز حدود المخطوط.');
 doc.scenes=scenes;doc.comments=doc.comments.map(c=>c.blockId&&blockOwners.has(c.blockId)?{...c,sceneId:blockOwners.get(c.blockId)}:c);
 doc.sourceProject={...doc.sourceProject,layout:'french',scriptAnalysis:{...doc.sourceProject?.scriptAnalysis,version:SCRIPT_ANALYSIS_VERSION,storedFingerprint:sourceFingerprint(JSON.stringify([doc.units,doc.characters,doc.scenes,doc.comments]))}};
 return {doc,changed:JSON.stringify(current)!==JSON.stringify(doc),scenes:scenes.length-current.scenes.length,dialogues};
}
export function searchScriptSources(files,query,{limit=8,budget=4600}={}) {
 const words=key(query).split(' ').filter(w=>w.length>1),hits=[];
 for(const file of files){const plan=analyzeScriptSource(file.text,{name:file.name});for(const [index,scene] of plan.scenes.entries())for(const block of scene.blocks){const hay=key([scene.heading,scene.unit?.title,block.speaker,block.text].join(' '));const score=words.reduce((n,w)=>n+(hay.includes(w)?1:0),0);hits.push({file:plan.name,scene:scene.heading||`المشهد ${index+1}`,unit:scene.unit?.title||'',speaker:block.speaker||'',text:block.text,score});}}
 hits.sort((a,b)=>b.score-a.score);let remaining=budget;return hits.slice(0,limit).flatMap(hit=>{if(remaining<=0)return [];const text=hit.text.slice(0,Math.max(0,remaining-200));remaining-=text.length+200;return [{...hit,text,excerpt:text.length<hit.text.length}];});
}
