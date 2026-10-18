import {createHash} from 'node:crypto';
import {jobVault} from './vault.mjs';
import {githubVerifier} from './oidc.mjs';
const tools=['yt-dlp','Instaloader','instagrapi','Agent-Reach','Sentence Transformers','BERTopic','CAMeL Tools'];
const origin='https://q8-ux.github.io';
const hash=value=>createHash('sha256').update(value).digest('hex');
function error(status,message){return Object.assign(new Error(message),{status});}
async function limitedJson(request){
  const reader=request.body?.getReader();if(!reader)throw error(400,'الطلب فارغ.');let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>240000){await reader.cancel();throw error(413,'المهمة أكبر من الحد.');}chunks.push(value);}
  const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(joined));}catch{throw error(400,'تعذر قراءة المهمة.');}
}
function jobIdentity(body){if(!/^[a-f0-9-]{36}$/.test(body.id||'')||!/^[A-Za-z0-9_-]{48,100}$/.test(body.token||''))throw error(400,'معرّف المهمة غير صالح.');}
function validatePayload(body){
  if(body.action==='analyze'){
    if(!Array.isArray(body.records)||body.records.length<2||body.records.length>80)throw error(400,'اختر بين نصّين و٨٠ نصًا للتحليل.');
    return {action:'analyze',records:body.records.map(row=>{if(typeof row.id!=='string'||row.id.length>240||typeof row.text!=='string'||!row.text.trim()||row.text.length>1000)throw error(400,'نص المهمة غير صالح أو أكبر من الحد.');return {id:row.id,text:row.text};})};
  }
  if(body.action==='collect'){
    if(!['yt-dlp','instaloader','instagrapi'].includes(body.collector))throw error(400,'اختر أداة جمع صحيحة.');
    let url;try{url=new URL(body.url);}catch{throw error(400,'رابط المنشور غير صالح.');}
    const allowed=body.collector==='yt-dlp'?['youtube.com','www.youtube.com','youtu.be','m.youtube.com']:['instagram.com','www.instagram.com'];
    if(url.protocol!=='https:'||url.username||url.password||!allowed.includes(url.hostname))throw error(400,'أضف رابطًا مباشرًا من المنصة المحددة.');
    const cookies=body.cookies||{};for(const key of Object.keys(cookies))if(!['sessionid','csrftoken','ds_user_id'].includes(key)||typeof cookies[key]!=='string'||cookies[key].length>2000)throw error(400,'حقول الجلسة غير صالحة.');
    const username=String(body.username||'').trim();if(username&&!/^[a-zA-Z0-9_.]{1,50}$/.test(username))throw error(400,'اسم مستخدم الجلسة غير صالح.');
    if(body.collector==='instaloader'&&(!username||!cookies.sessionid||!cookies.csrftoken))throw error(424,'Instaloader يحتاج اسم المستخدم وsessionid وcsrftoken من جلسة تملكها.');
    return {action:'collect',collector:body.collector,url:url.href,username,cookies,maxRecords:Math.max(1,Math.min(80,Number(body.maxRecords)||50)),includeReplies:body.includeReplies===true};
  }
  throw error(400,'عملية الأدوات غير صالحة.');
}
/** @param {{sealKey:string,db:any,verifyWorker?:any,now?:any}} options */
export function createToolsHandler({sealKey,db,verifyWorker=githubVerifier(),now=Date.now}){
  const vault=jobVault(sealKey,now);
  return async request=>{
    const headers={'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'};
    if(request.headers.get('origin')===origin)Object.assign(headers,{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type'});
    const send=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    try{
      const path=new URL(request.url).pathname.split('/').pop();
      if(request.method==='GET'&&['radar-tools','health','status'].includes(path)){
        const worker=await db.worker();return send(200,{ok:true,online:!!worker&&now()-Date.parse(worker.beat_at)<180000,worker:worker?{beatAt:worker.beat_at,report:worker.report,runId:worker.run_id}:null,limits:{records:80,jobsPerHour:8,retentionMinutes:60},workflowUrl:'https://github.com/Q8-ux/saad/actions/workflows/radar-tools-worker.yml'});
      }
      if(request.method==='OPTIONS'&&request.headers.get('origin')===origin)return new Response(null,{status:204,headers});
      if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json'))throw error(400,'استخدم طلب JSON صحيحًا.');
      const body=await limitedJson(request);if(!body||typeof body!=='object'||Array.isArray(body))throw error(400,'صيغة المهمة غير صالحة.');
      if(path==='worker'){
        const identity=await verifyWorker(request.headers.get('authorization')?.replace(/^Bearer /,''));
        if(body.operation==='heartbeat'){
          const report={};for(const name of tools){const value=body.report?.[name];report[name]={installed:value?.installed===true,tested:value?.tested===true,version:String(value?.version||'').slice(0,50),accessVerified:false};}
          await db.heartbeat({id:'primary',beat_at:new Date(now()).toISOString(),run_id:identity.runId,report});return send(200,{ok:true});
        }
        if(body.operation==='claim'){const job=await db.claim(identity.runId);return send(200,{job:job?{id:job.id,payload:JSON.parse(vault.open(job.payload_cipher))}:null});}
        if(body.operation==='complete'){
          if(!/^[a-f0-9-]{36}$/.test(body.id||'')||!body.result||JSON.stringify(body.result).length>300000)throw error(400,'نتيجة المهمة غير صالحة.');
          await db.complete(body.id,identity.runId,vault.seal(JSON.stringify(body.result)));return send(200,{ok:true});
        }
        throw error(400,'عملية العامل غير صالحة.');
      }
      if(request.headers.get('origin')!==origin)throw error(403,'مصدر الطلب غير مسموح.');
      jobIdentity(body);
      if(path==='enqueue'){
        const worker=await db.worker();if(!worker||now()-Date.parse(worker.beat_at)>=180000)throw error(503,'عامل Python متوقف الآن. شغّله من GitHub ثم حدّث الحالة.');
        const payload=validatePayload(body.payload||{});await db.enqueue(body.id,hash(body.token),vault.seal(JSON.stringify(payload)));return send(202,{id:body.id,state:'queued'});
      }
      const job=await db.job(body.id);if(!job||job.token_hash!==hash(body.token)||Date.parse(job.expires_at)<=now())throw error(404,'المهمة غير موجودة أو انتهت صلاحيتها.');
      if(path==='result')return send(200,{id:job.id,state:job.state,result:job.result_cipher?JSON.parse(vault.open(job.result_cipher)):null});
      if(path==='remove'){await db.remove(body.id);return send(200,{ok:true});}
      throw error(404,'العملية غير موجودة.');
    }catch(cause){return send(cause.status||502,{error:cause.status?cause.message:'تعذر إتمام مهمة الأدوات. أعد فحص حالة العامل.'});}
  };
}
