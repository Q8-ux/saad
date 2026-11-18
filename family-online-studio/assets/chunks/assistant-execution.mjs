/* Execute the author's attachment instructions against the selected saved work.
 * Generate each requested scene, then commit the complete batch with one guarded
 * manuscript write and a historical snapshot. Attachments stay out of exports.
 */
import {analyzeScriptSource,prepareAssistantSources,shouldDistributeScript,looksLikeScriptSource,hasExplicitSceneSelection,distributeScriptSources,reanalyzeStoredScript} from '../script-analysis.mjs';
import {attachmentContext} from './assistant-attachments.mjs';
import {resolveSceneTargets,applySceneExecution} from './scene-execution.mjs';
const DIRECTIVE=/(?:^|[^\p{L}])(?:أكمل|اكمل|كمل|كمّل|استكمل|واصل|تابع|اكتب|أضف|اضف|نفّذ|نفذ|أتم|اتم|أنجز|انجز|عدل|عدّل|صحح|صحّح|استبدل|وزع|وزّع|طبق|طبّق)(?=$|[^\p{L}])/u;
const OPINION=/^\s*(?:ما\s+رأيك|رأيك|حلّل|حلل|قيّم|قيم|انتقد|اقترح|نصيحة|نصيحه)/u;
export function isExplicitScriptExecution(message,files=[]){
 const value=String(message||'').trim();
 if(looksLikeScriptSource(value))return true;
 if(/(?:أعد|اعد|إعادة).*تحليل.*(?:السابق|المحفوظ)/u.test(value))return !/(?:لا|بدون)\s+(?:حفظ|تعديل|تنفيذ)/u.test(value);
 if(files.length&&shouldDistributeScript(value,files))return true;
 return Array.isArray(files)&&files.length>0&&(!value||DIRECTIVE.test(value))&&!OPINION.test(value)&&!/(?:لا|بدون)\s+(?:تنفيذ|تعديل|حفظ)/u.test(value);
}
export function makeDirectTaskMessage(message,files=[]){
 const value=String(message||'').trim(),source=attachmentContext(files,4600,value);
 if(OPINION.test(value))return [value,source].filter(Boolean).join('\n\n').slice(0,5800);
 return ['نفّذ المطلوب مباشرة دون مقدمة أو تقييم أو نصائح أو أسئلة ختامية. لا تدّع الحفظ دون إتمامه.',value||'نفّذ المطلوب من الملف المرفق',source].filter(Boolean).join('\n\n').slice(0,5800);
}
async function requiredRequest(request,path,options){
 const response=await request(path,options),data=await response.json().catch(()=>{throw new Error('لم تُرجع الخدمة نتيجة قابلة للقراءة.');});
 if(!response.ok)throw new Error(data?.error||'تعذر تنفيذ الطلب.');return data;
}
export async function executeScriptContinuation({message,files,workId,request,signal,preferredSceneId,notes='',targetSceneIds=[],onProgress=()=>{}}){
 const prepared=prepareAssistantSources(message,files);message=prepared.message;files=prepared.files;
 const storedAnalysis=/(?:أعد|اعد|إعادة).*تحليل.*(?:السابق|المحفوظ)/u.test(message);
 if(!isExplicitScriptExecution(message,files))throw new Error('طلب التنفيذ غير محدد.');
 if(typeof workId!=='string'||!workId||workId==='auto')throw new Error('اختر العمل المطلوب من «نطاق السؤال» قبل تنفيذ أمر الكتابة.');
 if(typeof request!=='function')throw new Error('تعذر الاتصال بمساحة العمل.');
 const attachments=files.map(file=>({name:String(file.name||'مرفق').slice(0,250),text:String(file.text||''),format:String(file.format||'نص').slice(0,100),warnings:[]}));
 if(!storedAnalysis&&(attachments.length>6||attachments.some(a=>!a.text.trim())||attachments.reduce((n,a)=>n+a.text.length,0)>400000))throw new Error('نص المرفقات كبير أو غير مقروء؛ أرسله على دفعات أصغر.');
 const path='/api/manuscript?work='+encodeURIComponent(workId),current=await requiredRequest(request,path,{method:'GET',cache:'no-store',signal});
 const doc=current.doc;
 if(!doc||!['series','play','film'].includes(doc.kind)||!Array.isArray(doc.scenes)||!doc.scenes.length)throw new Error('اختر مسلسلًا أو مسرحية أو فيلمًا له مخطوط محفوظ قبل التنفيذ.');
 if(!Number.isSafeInteger(current.revision))throw new Error('تعذر التحقق من إصدار المخطوط.');
 const active=doc.scenes.find(scene=>scene.id===preferredSceneId)||doc.scenes.at(-1);
 if(storedAnalysis||shouldDistributeScript(message,files)){
  signal?.throwIfAborted();onProgress('قراءة النص وتوزيع المشاهد والحوارات…');
  const ids=targetSceneIds.length?targetSceneIds:hasExplicitSceneSelection(message)&&!storedAnalysis?resolveSceneTargets(doc,active.id,message):[];
  const result=storedAnalysis?reanalyzeStoredScript(doc):distributeScriptSources(doc,attachments,{sceneId:active.id,targetSceneIds:ids,replace:/استبدل/u.test(message),notes});
  if(!result.changed)return {workId,sceneId:active.id,sceneIds:[],revision:current.revision,message:'النص محفوظ وموزّع بالفعل؛ لم يُكرر إدراجه.'};
  signal?.throwIfAborted();const saved=await requiredRequest(request,path,{method:'PUT',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({doc:result.doc,revision:current.revision,snapshot:'قبل تحليل النص وتوزيعه بالتنسيق الفرنسي'})});
  if(saved.revision!==current.revision+1||!saved.updatedAt)throw Error('لم يؤكد الخادم حفظ التوزيع.');
  const sceneIds=result.sceneIds||result.doc.scenes.map(s=>s.id);
  return {workId,sceneId:sceneIds[0]||active.id,sceneIds,revision:saved.revision,message:storedAnalysis?'أعيد تحليل النص المحفوظ وتوزيعه مع حفظ نسخة سابقة.':`حُفظ توزيع ${sceneIds.length} مشاهد وحواراتها بالتنسيق الفرنسي مع نسخة سابقة.`};
 }
 for(const file of files)analyzeScriptSource(file.text,{name:file.name,characters:doc.characters});
 const instruction=String(message||'').trim()||'أكمل المشهد مباشرة اعتمادًا على الملفات المرفقة.';
 const ids=resolveSceneTargets(doc,active.id,instruction,targetSceneIds);
 let working=doc,blockCount=0;
 for(const [index,id]of ids.entries()){
  signal?.throwIfAborted();onProgress(`ينفّذ المشهد ${index+1} من ${ids.length}…`);
  const scene=working.scenes.find(s=>s.id===id),scope=[doc.contentRevision||'manuscript',doc.title.slice(0,80),id,'scene'].join('|').slice(0,250);
  const generated=await requiredRequest(request,'/api/scenarist?work='+encodeURIComponent(workId),{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({doc:working,sceneId:scene.id,selectedBlockId:null,stage:'scene',message:instruction,notes:String(notes).slice(0,10000),attachments,scope,mode:'execute',operation:'auto',targetSceneIds:[id]})});
  const execution=generated.answer?.execution;
  if(!execution||execution.edits?.length!==1||execution.edits[0].sceneId!==id)throw new Error('لم ينتج المحرك مشهدًا مكتمل البنية؛ لم تُحفظ تغييرات جزئية.');
  working=applySceneExecution(working,execution);blockCount+=execution.edits[0].blocks.length;
 }
 signal?.throwIfAborted();
 const saved=await requiredRequest(request,path,{method:'PUT',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({doc:working,revision:current.revision,snapshot:'قبل تنفيذ أمر المساعد الذكي من المرفقات'})});
 if(saved.revision!==current.revision+1||!saved.updatedAt)throw new Error('لم يؤكد الخادم حفظ المشاهد؛ تحقق من المشروع قبل إعادة التنفيذ.');
 return {workId,sceneId:ids[0],sceneIds:ids,sceneNumber:doc.scenes.findIndex(s=>s.id===ids[0])+1,blocks:blockCount,revision:saved.revision,message:ids.length===1?'نُفّذ طلبك داخل المشهد وحُفظ مع نسخة سابقة.':`نُفّذ طلبك ووُزّع على ${ids.length} مشاهد وحُفظ مع نسخة سابقة.`};
}

