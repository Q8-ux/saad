const ENDPOINT='/api/attachments',MAX_BYTES=25_000_000;
async function data(request,path,options={}){const response=await request(path,options),result=await response.json().catch(()=>{throw Error('تعذر قراءة تأكيد حفظ المرفق.');});if(!response.ok)throw Error(result.error||'لم يُؤكد حفظ المرفق.');return result;}
const send=(request,body,signal)=>data(request,ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
/** @param {File} file @param {any} request @param {any} options */
export async function saveOriginalFile(file,request,options={}){
 if(typeof request!=='function')throw Error('يلزم تسجيل الدخول لحفظ المرفقات.');
 if(!file||typeof file.arrayBuffer!=='function'||!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_BYTES)throw Error('اختر ملفًا بحجم لا يتجاوز ٢٥ ميغابايت.');
 const {signal,workId,onProgress=()=>{}}=options;signal?.throwIfAborted();onProgress('جارٍ حفظ الملف الأصلي…');
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 const start=await send(request,{action:'begin',name:file.name.slice(0,250),mime:(file.type||'application/octet-stream').slice(0,150),size:file.size,sha256,...(workId&&workId!=='auto'?{workId}:{})},signal);
 if(start.alreadySaved){if(!start.attachment?.originalSaved||start.attachment.sha256!==sha256||start.attachment.size!==file.size)throw Error('تأكيد الأرشيف غير صالح.');onProgress('الأصل محفوظ في حسابك.');return start.attachment;}
 if(typeof start.id!=='string'||start.partBytes!==5*1024*1024||start.partCount!==Math.ceil(file.size/start.partBytes))throw Error('تعذر تجهيز حفظ الملف الأصلي.');
 try{
  for(let n=1;n<=start.partCount;n++){
   signal?.throwIfAborted();const chunk=file.slice((n-1)*start.partBytes,Math.min(n*start.partBytes,file.size)),body=new FormData();body.set('id',start.id);body.set('partNumber',String(n));body.set('chunk',chunk,'part');
   const result=await data(request,ENDPOINT,{method:'POST',body,signal});if(result.partNumber!==n||result.receivedBytes!==chunk.size)throw Error('لم يؤكد الخادم استلام جزء من الملف.');onProgress(`حفظ الأصل · ${Math.round(n/start.partCount*95)}٪`);
  }
  const done=await send(request,{action:'finish',id:start.id},signal);
  if(!done.attachment?.originalSaved||done.attachment.sha256!==sha256||done.attachment.size!==file.size)throw Error('لم يُؤكد حفظ الملف كاملًا.');
  onProgress('الأصل محفوظ في حسابك.');globalThis.dispatchEvent?.(new Event('studio-attachment-saved'));return done.attachment;
 }catch(error){
  // A lost finish response may follow a successful durable write.
  if(!signal?.aborted){try{const recovered=await data(request,ENDPOINT+'?id='+encodeURIComponent(start.id),{signal:AbortSignal.timeout(10000)});if(recovered.attachment?.originalSaved&&recovered.attachment.sha256===sha256&&recovered.attachment.size===file.size){onProgress('الأصل محفوظ في حسابك.');return recovered.attachment;}}catch{}}
  try{await send(request,{action:'abort',id:start.id},AbortSignal.timeout(10000));}catch{}
  throw error;
 }
}
/** @param {string} id @param {any} source @param {any} request @param {any} options */
export async function saveExtractedText(id,source,request,options={}){
 const text=String(source.text||'');if(!text.trim()||text.length>400000)throw Error('الأصل محفوظ؛ النص المستخرج فارغ أو يتجاوز حد التحليل (٤٠٠ ألف حرف).');
 const result=await send(request,{action:'text',id,text,format:String(source.format||'نص مستخرج').slice(0,100)},options.signal);
 if(result.attachment?.textState!=='ready'||result.attachment.textChars!==text.length)throw Error('الأصل محفوظ؛ لم يؤكد الخادم حفظ النص المستخرج.');
 globalThis.dispatchEvent?.(new Event('studio-attachment-saved'));return result.attachment;
}
export async function recordExtractionFailure(id,error,request){try{await send(request,{action:'failed-analysis',id,error:String(error?.message||error||'لم يكتمل التحليل').slice(0,500)},AbortSignal.timeout(10000));}catch{}}
/** @param {File} file @param {any} extract @param {any} request @param {any} options */
export async function archiveAndExtract(file,extract,request,options={}){
 const original=await saveOriginalFile(file,request,options);options.onOriginal?.(original);
 try{const source=await extract();await saveExtractedText(original.id,source,request,options);return {...source,attachmentId:original.id,originalSaved:true};}
 catch(error){await recordExtractionFailure(original.id,error,request);const failure=new Error('الأصل محفوظ في «ملفاتي المرفوعة». '+(error?.message||'لم يكتمل التحليل.'));Object.assign(failure,{attachmentId:original.id,originalSaved:true});throw failure;}
}
export async function linkStoredAttachment(id,workId,request,options={}){return send(request,{action:'link',id,workId},options.signal);}
export async function readStoredText(item,request,options={}){const result=await data(request,ENDPOINT+'?id='+encodeURIComponent(item.id)+'&text=1',{signal:options.signal});return {name:result.attachment.name,text:result.text,format:result.attachment.format,warnings:[],attachmentId:result.attachment.id,originalSaved:true};}
export async function readStoredOriginal(item,request,options={}){const response=await request(ENDPOINT+'?id='+encodeURIComponent(item.id)+'&download=1',{signal:options.signal});if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'تعذر تحميل الملف الأصلي.');}const blob=await response.blob();return new File([blob],item.name,{type:item.mime||'application/octet-stream'});}
export async function downloadStoredOriginal(item,request){const file=await readStoredOriginal(item,request),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=item.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
/** @param {any[]} sources @param {any} request @param {any} options */
export async function savePastedSources(sources,request,options={}){
 const saved=[];for(const source of sources){if(source.attachmentId){saved.push(source);continue;}
  const file=new File([String(source.text||'')],String(source.name||'نص ملصق').replace(/\.txt$/u,'')+'.txt',{type:'text/plain'}),original=await saveOriginalFile(file,request,options);await saveExtractedText(original.id,source,request,options);saved.push({...source,attachmentId:original.id,originalSaved:true});
 }return saved;
}
export async function listStoredAttachments(request,{query='',cursor=0,signal}={}){return data(request,ENDPOINT+'?q='+encodeURIComponent(query)+'&cursor='+cursor,{cache:'no-store',signal});}
export function readableImportedSource(plan){
 if(typeof plan.sourceText==='string'&&plan.sourceText.trim())return plan.sourceText;
 const doc=plan.document;if(doc.kind==='book')return [doc.title,...[...(doc.frontMatter||[]),...doc.chapters].flatMap(s=>[s.title,...s.blocks.map(b=>b.text)])].join('\n\n');
 return [doc.title,...doc.scenes.flatMap((s,i)=>[doc.units.find(u=>u.id===s.unitId)?.title||'',`المشهد ${i+1}: ${s.title}`,...s.blocks.map(b=>(b.type==='dialogue'?(doc.characters.find(c=>c.id===b.characterId)?.name||b.label||'')+': ':'')+b.text)])].join('\n\n');
}
