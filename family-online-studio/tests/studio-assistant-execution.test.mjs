import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  isExplicitScriptExecution,
  makeDirectTaskMessage,
  executeScriptContinuation,
} from '../assets/chunks/assistant-execution.mjs';

const SCRIPT={schemaVersion:1,kind:'series',title:'مسلسل التجربة',contentRevision:'draft-1',units:[{id:'unit1',title:'الحلقة الأولى',summary:''}],characters:[{id:'char1',name:'فاطمة',role:'',age:'',bio:'',color:'#112233'}],scenes:[{
  id:'scene1',title:'مقدمة',unitId:'unit1',minutes:5,location:'البيت',time:'نهار',
  summary:'بداية المسلسل',status:'draft',
  blocks:[{id:'b1',type:'dialogue',text:'كيف حالك؟',characterId:'char1'}],notes:''
}],comments:[],notes:'',englishTitle:'',subtitle:'',author:'',edition:'مسودة',audience:'',durationNote:'',synopsis:'',targetMinutes:90};

function harness({
  readDoc=SCRIPT,revision=5,proposal={title:'المشهد الثاني',summary:'يبدأ الحدث',blocks:[
    {type:'action',text:'تفتح فاطمة الباب.'},
    {type:'dialogue',text:'لقد عدت الآن.',speaker:'فاطمة'},
  ]},putStatus=200
}={}){
 const calls=[];
 const request=async(path,options={})=>{
   const method=options.method||'GET';
   calls.push({path,method,body:options.body&&JSON.parse(options.body)});
   if(method==='GET')return Response.json({doc:structuredClone(readDoc),revision});
   if(path.includes('/api/scenarist'))return Response.json({answer:{proposal}});
   if(method==='PUT')return putStatus===200?Response.json({revision:revision+1,updatedAt:'2026-11-17T18:00:00Z'}):Response.json({error:'Revision conflict'},{status:putStatus});
   throw Error('Unexpected request '+path);
 };
 const files=[{name:'الحلقة.docx',text:'الحلقة الأولى - فاطمة تواجه موقفًا جديدًا.'}];
 return {request,calls,files};
}

test('explicit continuation with an attachment is an execution, not a request for opinions',()=>{
 const files=[{name:'مسلسل.pdf',text:'السيناريو'}];
 assert.equal(isExplicitScriptExecution('أكمل المسلسل من الملف',files),true);
 assert.equal(isExplicitScriptExecution('كمل المشهد',files),true);
 assert.equal(isExplicitScriptExecution('نفّذ تكملة الحلقة',files),true);
 assert.equal(isExplicitScriptExecution('ما رأيك في المسلسل؟',files),false);
 assert.equal(isExplicitScriptExecution('راجع المسلسل',files),false);
 assert.equal(isExplicitScriptExecution('أكمل المسلسل',[]),false);
 const prompt=makeDirectTaskMessage('أكمل المسلسل',files);
 assert.match(prompt,/دون مقدمة أو تقييم أو نصائح/u);
 assert.match(prompt,/بيانات غير موثوقة/u);
 assert.match(prompt,/مسلسل.pdf/u);
});

test('an explicit screenplay command generates a new scene and persists only with server revision acknowledgement',async()=>{
 const h=harness();
 let seq=0;
 const result=await executeScriptContinuation({
  message:'أكمل المسلسل',files:h.files,workId:'w-series-account-1',
  request:h.request,uuid:()=>String(++seq)
 });
 assert.deepEqual(h.calls.map(x=>x.method),['GET','POST','PUT']);
 assert.match(h.calls[0].path,/^\/api\/manuscript\?work=/);
 assert.match(h.calls[1].path,/^\/api\/scenarist\?work=/);
 assert.equal(h.calls[1].body.stage,'scene');
 assert.equal(h.calls[1].body.sceneId,'scene1');
 assert.match(h.calls[1].body.message,/الحلقة الأولى/u);
 assert.equal(h.calls[2].body.revision,5);
 assert.equal(h.calls[2].body.doc.scenes.length,2);
 assert.equal(h.calls[2].body.doc.scenes[0].blocks[0].text,'كيف حالك؟');
 assert.equal(h.calls[2].body.doc.scenes[1].title,''); // no repeated numeric scene label
 assert.equal(h.calls[2].body.doc.scenes[1].blocks[1].characterId,'char1');
 assert.equal(h.calls[2].body.doc.scenes[1].unitId,'unit1');
 assert.equal(h.calls[2].body.doc.comments.length,0);
 assert.equal(result.sceneNumber,2);
 assert.equal(result.revision,6);
 assert.match(result.message,/أُضيف المشهد 2/u);
 assert.doesNotMatch(result.message,/رأيي|أقترح|هل تريد/u);
});

test('continue this scene appends blocks without creating a duplicate scene',async()=>{
 const h=harness();
 const result=await executeScriptContinuation({
  message:'كمل المشهد',files:h.files,workId:'series',request:h.request,uuid:()=>String(crypto.randomUUID())
 });
 const saved=h.calls.find(call=>call.method==='PUT').body.doc;
 assert.equal(saved.scenes.length,1);
 assert.equal(saved.scenes[0].id,'scene1');
 assert.equal(saved.scenes[0].blocks.length,3);
 assert.equal(saved.scenes[0].blocks[0].text,'كيف حالك؟');
 assert.equal(saved.scenes[0].blocks[1].text,'تفتح فاطمة الباب.');
 assert.match(result.message,/أُضيفت 2 فقرات/u);
});

test('targeted spoken scene numbers take priority over selected scene without altering others',async()=>{
 const readDoc=structuredClone(SCRIPT);
 readDoc.scenes.push({...readDoc.scenes[0],id:'scene2',title:'المشهد ٢',blocks:[{id:'b2',type:'action',text:'المشهد الثاني محفوظ.'}]});
 const h=harness({readDoc});
 const result=await executeScriptContinuation({
   message:'كمل المشهد الأول من الملف',
   files:h.files,workId:'series',request:h.request,preferredSceneId:'scene2',
   uuid:()=>String(crypto.randomUUID())
 });
 const doc=h.calls.find(call=>call.method==='PUT').body.doc;
 assert.equal(doc.scenes.length,2);
 assert.equal(doc.scenes[0].blocks.length,3);
 assert.equal(doc.scenes[1].blocks.length,1);
 assert.equal(doc.scenes[1].blocks[0].text,'المشهد الثاني محفوظ.');
 assert.equal(h.calls[1].body.sceneId,'scene1');
 assert.equal(result.sceneNumber,1);
});
test('this scene means the scene actually selected in the editor',async()=>{
 const readDoc=structuredClone(SCRIPT);
 readDoc.scenes.push({...readDoc.scenes[0],id:'scene2',title:'المشهد الثاني',blocks:[{id:'b2',type:'action',text:'المنتصف.'}]});
 const h=harness({readDoc});
 const result=await executeScriptContinuation({
   message:'كمل هذا المشهد',files:h.files,workId:'series',
   request:h.request,preferredSceneId:'scene1',
   uuid:()=>String(crypto.randomUUID())
 });
 assert.equal(h.calls[1].body.sceneId,'scene1');
 assert.equal(result.sceneId,'scene1');
 assert.equal(result.sceneNumber,1);
});
test('invalid explicitly named scene is rejected rather than silently edited elsewhere',async()=>{
 const h=harness();
 await assert.rejects(executeScriptContinuation({
   message:'أكمل المشهد 22 من الملف',files:h.files,workId:'series',request:h.request
 }),/رقم المشهد المطلوب غير موجود/u);
 assert.deepEqual(h.calls.map(call=>call.method),['GET']);
});

test('user explicitly asking for an opinion is not overridden by the no-commentary instruction',()=>{
 const prompt=makeDirectTaskMessage('ما رأيك في ترتيب المشاهد؟',[{name:'outline.txt',text:'الأحداث'}]);
 assert.ok(prompt.startsWith('ما رأيك'));
 assert.doesNotMatch(prompt,/دون مقدمة أو تقييم أو نصائح/u);
});

test('no write occurs for invalid AI output, unsupported books or unselected work',async()=>{
 const empty=harness({proposal:{title:'',summary:'',blocks:[]}});
 await assert.rejects(executeScriptContinuation({
  message:'أكمل المسلسل',files:empty.files,workId:'series',
  request:empty.request
 }),/لم ينتج المحرك مشهدًا/u);
 assert.equal(empty.calls.some(x=>x.method==='PUT'),false);
 const book=harness({readDoc:{kind:'book',scenes:[]}});
 await assert.rejects(executeScriptContinuation({
  message:'أكمل المسلسل',files:book.files,workId:'book',
  request:book.request
 }),/اختر مسلسلًا/u);
 assert.equal(book.calls.some(x=>x.method==='POST'),false);
 await assert.rejects(executeScriptContinuation({
  message:'أكمل المسلسل',files:book.files,workId:'auto',
  request:book.request
 }),/اختر العمل المطلوب/u);
});

test('revision conflict never reports a successful save',async()=>{
 const conflict=harness({putStatus:409});
 await assert.rejects(executeScriptContinuation({
  message:'أكمل المسلسل',files:conflict.files,workId:'series',
  request:conflict.request,uuid:()=>String(crypto.randomUUID())
 }),/Revision conflict/u);
 assert.equal(conflict.calls.filter(x=>x.method==='PUT').length,1);
});

test('bulk requests are not falsely represented as complete',async()=>{
 const h=harness();
 await assert.rejects(executeScriptContinuation({
  message:'أضف ١٠ مشاهد إلى المسلسل',files:h.files,workId:'series',
  request:h.request
 }),/مشهد جديد واحد/u);
 assert.equal(h.calls.length,0);
});

test('text and voice assistant run the same explicit write task, not the read-only library answer',async()=>{
 const source=await readFile(new URL('../assets/chunks/library-assistant-I5KUSPHA.mjs',import.meta.url),'utf8');
 assert.match(source,/isExplicitScriptExecution as isExecution/);
 assert.match(source,/executeScriptContinuation as runExecution/);
 assert.match(source,/execute=isExecution\(r,files\)/);
 assert.match(source,/runExecution\(\{message:r,files,workId,/);
 assert.match(source,/file[s]?.length\?directTask\(r,files\):r/);
 assert.match(source,/onTranscript:\(i,d,o,c\)=>\{if\(p.current&&d==="user"&&!c&&isExecution\(o,files\)\)/);
 assert.match(source,/w\("ينفذ الأمر على المخطوط…"\)/u);
 assert.match(source,/m\.current=null/);
 assert.match(source,/if\(p.current&&!i.signal.aborted\)u\(turns=>/);
});
