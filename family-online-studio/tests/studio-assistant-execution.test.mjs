import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isExplicitScriptExecution,makeDirectTaskMessage,executeScriptContinuation} from '../assets/chunks/assistant-execution.mjs';
import {resolveSceneTargets,applySceneExecution} from '../assets/chunks/scene-execution.mjs';
const SCRIPT={schemaVersion:1,kind:'series',title:'مسلسل التجربة',contentRevision:'draft-1',units:[{id:'u1',title:'الحلقة الأولى',summary:''},{id:'u2',title:'الحلقة الثانية',summary:''}],characters:[{id:'char1',name:'فاطمة',role:'',age:'',bio:'',color:'#112233'}],scenes:Array.from({length:6},(_,i)=>({id:'s'+(i+1),title:'حدث '+(i+1),unitId:i<3?'u1':'u2',minutes:5,location:'البيت',time:'نهار',summary:'',status:'draft',blocks:[{id:'b'+(i+1),type:'action',text:'أصل '+(i+1)}],notes:''})),comments:[],notes:'',englishTitle:'',subtitle:'',author:'',edition:'مسودة',audience:'',durationNote:'',synopsis:'',targetMinutes:90};
const files=[{name:'المشاهد.txt',text:'المشهد ٢: تدخل فاطمة.\nالمشهد ٣: تسمع الجرس.'}];
function harness({readDoc=SCRIPT,action='append',putStatus=200,invalidTarget=false,failAt=0}={}){
 const calls=[];let generated=0;
 const request=async(path,options={})=>{const method=options.method||'GET',body=options.body&&JSON.parse(options.body);calls.push({path,method,body});
 if(method==='GET')return Response.json({doc:structuredClone(readDoc),revision:5});
 if(path.startsWith('/api/scenarist')){generated++;if(generated===failAt)return Response.json({error:'provider failed'},{status:502});return Response.json({answer:{execution:{edits:[{sceneId:invalidTarget?'outside-work':body.targetSceneIds[0],action,blocks:[{type:'dialogue',speaker:'فاطمة',text:'تكملة '+body.targetSceneIds[0]}]}]}}});}
 if(method==='PUT')return putStatus===200?Response.json({revision:6,updatedAt:'2026-11-17T19:00:00Z'}):Response.json({error:'Revision conflict'},{status:putStatus});throw Error('Unexpected request');};
 return {calls,request};
}
test('file-only and edit directives execute, while an explicit request for opinions stays a discussion',()=>{
 for(const message of ['', 'كمل المشهد','عدّل المشاهد ٢ و٣','وزّع المرفق على المشاهد','نفذ الملف بدون إبداء رأيك'])assert.equal(isExplicitScriptExecution(message,files),true,message);
 for(const message of ['ما رأيك في المسلسل؟','حلّل المشاهد','اقترح عنوانًا','أكمل المشهد بدون حفظ'])assert.equal(isExplicitScriptExecution(message,files),false,message);
 assert.equal(isExplicitScriptExecution('أكمل المشهد',[]),false);assert.match(makeDirectTaskMessage('كمل المشهد',files),/دون مقدمة أو تقييم أو نصائح/u);
});
test('scene numbers and ranges are resolved within the requested episode; checkboxes take precedence',()=>{
 assert.deepEqual(resolveSceneTargets(SCRIPT,'s1','أكمل المشاهد ٢ إلى ٣ من الحلقة الثانية'),['s5','s6']);
 assert.deepEqual(resolveSceneTargets(SCRIPT,'s6','عدّل المشهد الأول من الحلقة الأولى'),['s1']);
 assert.deepEqual(resolveSceneTargets(SCRIPT,'s1','كمل المشهد',['s6','s2']),['s2','s6']);
 assert.throws(()=>resolveSceneTargets(SCRIPT,'s1','أكمل المشهد 99'),/غير موجود/);
});
test('multiple requested scenes receive separate generations and one guarded save with optional notes empty',async()=>{
 const h=harness(),result=await executeScriptContinuation({message:'أكمل المشاهد ٢ و٣ من الحلقة الثانية',files,workId:'series',preferredSceneId:'s1',request:h.request});
 assert.deepEqual(h.calls.map(c=>c.method),['GET','POST','POST','PUT']);
 const requests=h.calls.filter(c=>c.method==='POST');assert.equal(requests[0].body.mode,'execute');assert.equal(requests[0].body.notes,'');assert.equal(requests[0].body.attachments[0].text,files[0].text);
 assert.deepEqual(requests.map(c=>c.body.targetSceneIds),[['s5'],['s6']]);assert.equal(requests[1].body.doc.scenes[4].blocks.length,2);
 const saved=h.calls.at(-1).body;assert.equal(saved.revision,5);assert.match(saved.snapshot,/قبل تنفيذ/);assert.equal(saved.doc.scenes.length,6);
 for(const index of [0,1,2,3])assert.deepEqual(saved.doc.scenes[index],SCRIPT.scenes[index]);assert.deepEqual(saved.doc.scenes.map(s=>[s.id,s.title]),SCRIPT.scenes.map(s=>[s.id,s.title]));
 assert.deepEqual(result.sceneIds,['s5','s6']);assert.equal(result.revision,6);assert.match(result.message,/2 مشاهد/);assert.doesNotMatch(result.message,/أقترح|هل تريد/);
});
test('a file alone completes the scene selected in the editor',async()=>{
 const h=harness();await executeScriptContinuation({message:'',files,workId:'series',preferredSceneId:'s2',request:h.request});const body=h.calls.find(c=>c.method==='POST').body;assert.equal(body.sceneId,'s2');assert.equal(body.message,'أكمل المشهد مباشرة اعتمادًا على الملفات المرفقة.');assert.equal(h.calls.at(-1).body.doc.scenes[1].blocks.length,2);
});
test('revision replaces only the requested scene and retains author notes outside the creative text',async()=>{
 const h=harness({action:'replace_scene'});await executeScriptContinuation({message:'عدّل المشهد الأول',notes:'اختصر الجملة',files,workId:'series',preferredSceneId:'s1',request:h.request});const body=h.calls.find(c=>c.method==='POST').body;assert.equal(body.notes,'اختصر الجملة');const saved=h.calls.at(-1).body.doc;assert.equal(saved.scenes[0].blocks.length,1);assert.deepEqual(saved.scenes[1],SCRIPT.scenes[1]);assert.ok(!JSON.stringify(saved.scenes).includes('اختصر الجملة'));
});
test('provider errors and invalid targets never save partial scene batches',async()=>{
 for(const options of [{invalidTarget:true},{failAt:2}]){const h=harness(options);await assert.rejects(executeScriptContinuation({message:'أكمل المشاهد ١ و٢',files,workId:'series',preferredSceneId:'s1',request:h.request}));assert.equal(h.calls.some(c=>c.method==='PUT'),false);}
});
test('revision conflicts are surfaced without retrying or claiming success',async()=>{
 const h=harness({putStatus:409});await assert.rejects(executeScriptContinuation({message:'كمل المشهد',files,workId:'series',request:h.request}),/Revision conflict/);assert.equal(h.calls.filter(c=>c.method==='PUT').length,1);
});
test('unknown works, book contexts, unreadable files and invalid numbers are rejected before generation',async()=>{
 const h=harness();await assert.rejects(executeScriptContinuation({message:'كمل المشهد',files,workId:'auto',request:h.request}),/اختر العمل/);assert.equal(h.calls.length,0);
 const book=harness({readDoc:{kind:'book',scenes:[]}});await assert.rejects(executeScriptContinuation({message:'كمل المشهد',files,workId:'book',request:book.request}),/اختر مسلسلًا/);
 await assert.rejects(executeScriptContinuation({message:'كمل المشهد 99',files,workId:'series',preferredSceneId:'s1',request:h.request}),/غير موجود/);assert.equal(h.calls.some(c=>c.method==='POST'),false);
});
test('duplicate targets are rejected; rewriting a paragraph keeps its linked note',()=>{
 const doc=structuredClone(SCRIPT);doc.comments=[{id:'n1',sceneId:'s1',blockId:'b1',text:'ملاحظة',resolved:false,createdAt:''}];const edit={sceneId:'s1',action:'replace_block',blocks:[{type:'action',speaker:'',text:'بديل'}]};const next=applySceneExecution(doc,{edits:[edit]},'b1');assert.equal(next.scenes[0].blocks[0].id,'b1');assert.equal(next.comments[0].blockId,'b1');assert.throws(()=>applySceneExecution(doc,{edits:[edit,edit]},'b1'),/مكرر/);
});
test('text and voice use the same executor, current attachments and optional notes; confirmed saves refresh the editor',async()=>{
 const library=await readFile(new URL('../assets/chunks/library-assistant-I5KUSPHA.mjs',import.meta.url),'utf8'),editor=await readFile(new URL('../assets/app.mjs',import.meta.url),'utf8');
 assert.match(library,/execute=isExecution\(r,activeFiles\)/);assert.match(library,/runExecution\(\{message:r,files:activeFiles,workId,notes:notesRef.current/);assert.match(library,/isExecution\(o,filesRef.current\)/);assert.match(library,/ملاحظات إضافية \(اختيارية\)/u);assert.match(library,/studio-manuscript-updated/);assert.match(editor,/studio-manuscript-updated/);assert.match(editor,/if\(m==="execute"\)/);
});
