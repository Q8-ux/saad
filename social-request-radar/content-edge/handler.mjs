import {createHash} from 'node:crypto';
import {credentialVault} from '../server/credentials.mjs';
import {normalizeCampaign,generationPrompt,contentTools} from '../lib/content-core.mjs';
const failure=(status,message)=>Object.assign(Error(message),{status});
async function readBytes(response,limit){const reader=response.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let total=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw failure(413,'تجاوز الملف حد النقل.');}chunks.push(value);}const out=new Uint8Array(total);let cursor=0;for(const c of chunks){out.set(c,cursor);cursor+=c.length;}return out;}
async function json(response,limit=200000){try{return JSON.parse(new TextDecoder().decode(await readBytes(response,limit)));}catch(e){if(e.status)throw e;throw failure(502,'استجابة الخدمة غير صالحة.');}}
const uuid=value=>/^[a-f0-9-]{36}$/.test(value||'');
export function createContentHandler({sealKey,fetcher=fetch,workerOrigin='',now=Date.now}){
  const vault=credentialVault(sealKey,now),requests=new Map(),budgets=new Map();let active=0;
  let worker='';if(workerOrigin){const u=new URL(workerOrigin);if(u.protocol!=='https:'||u.username||u.password)throw Error('Worker origin must be HTTPS');worker=u.origin;}
  const open=value=>{let c;try{c=JSON.parse(vault.open(value));}catch{throw failure(401,'انتهى ربط المحتوى أو تعذر التحقق منه. أعد حفظ المفتاح.');}if(c.scope!=='rased-content-v1'||!['gemini','worker'].includes(c.provider))throw failure(401,'ربط محتوى غير صالح.');return c;};
  const workerCall=async(path,config,body)=>{
    if(!worker)throw failure(424,'عامل الإنتاج الخارجي لم يُربط بالخادم بعد.');
    const response=await fetcher(worker+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+config.key,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(24000)});
    if(!response.ok)throw failure(response.status===401?401:response.status===429?429:502,response.status===401?'مفتاح عامل الإنتاج غير صالح.':response.status===429?'وصل العامل إلى حد مهامه؛ انتظر قبل المحاولة.':'تعذر إتمام الطلب على عامل الإنتاج.');return response;
  };
  return async request=>{
    const allowed=request.headers.get('origin')==='https://q8-ux.github.io';
    const headers={'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin',...(allowed?{'access-control-allow-origin':'https://q8-ux.github.io','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'}:{})};
    const send=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    try{
      const operation=new URL(request.url).pathname.split('/').pop();
      if(request.method==='GET'&&['status','health','radar-content'].includes(operation))return send(200,{ok:true,service:'rased-content',version:1,workerConfigured:!!worker,tools:contentTools.map(t=>({id:t.id,mode:t.mode})),limits:{maxArtifactMB:20,maxConcurrent:2,requestCacheMinutes:15,spendingLedger:'per-isolate-only'}});
      if(!allowed)throw failure(403,'مصدر الطلب غير مسموح.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json'))throw failure(400,'استخدم طلب JSON صحيحاً.');
      const body=await json(request,96000);
      if(operation==='configure'){
        if(!['gemini','worker'].includes(body.provider)||typeof body.apiKey!=='string'||body.apiKey.length<12||body.apiKey.length>250||/\s/.test(body.apiKey))throw failure(400,'أدخل مفتاح خدمة صالحاً.');
        const config={scope:'rased-content-v1',provider:body.provider,key:body.apiKey,model:body.provider==='gemini'?String(body.model||'gemini-2.5-flash'):''};let capabilities=[];
        if(config.provider==='gemini'){
          if(!/^gemini-[a-zA-Z0-9.-]{2,90}$/.test(config.model))throw failure(400,'اسم نموذج Gemini غير صالح.');
          const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+config.model,{headers:{'x-goog-api-key':config.key},redirect:'error',signal:AbortSignal.timeout(15000)});
          if(!response.ok)throw failure(401,'لم يؤكد Gemini صلاحية المفتاح أو توفر النموذج.');
          const details=await json(response);if(!details.supportedGenerationMethods?.includes('generateContent'))throw failure(424,'النموذج المحدد لا يدعم كتابة المحتوى.');
        }else{
          const details=await json(await workerCall('/health',config));if(details.ok!==true||details.service!=='rased-content-worker')throw failure(424,'لم يؤكد العامل جاهزيته.');
          capabilities=(details.capabilities||[]).filter(c=>contentTools.some(t=>t.id===c&&t.mode==='worker'));
        }
        return send(200,{provider:config.provider,model:config.model,credential:vault.seal(JSON.stringify(config)),verified:true,capabilities});
      }
      const config=open(body.credential);
      for(const [id,r]of requests)if(now()-r.at>900000)requests.delete(id);
      for(const [id,b]of budgets)if(now()-b.at>3600000)budgets.delete(id);
      if(operation==='generate'||operation==='start'){
        if(!uuid(body.requestId))throw failure(400,'معرّف الطلب غير صالح.');
        const campaign=normalizeCampaign({...body.campaign,state:'draft'}),tool=contentTools.find(t=>t.id===body.tool);
        if(operation==='generate'&&config.provider!=='gemini')throw failure(424,'اربط خدمة الكتابة أولاً.');
        if(operation==='start'&&(config.provider!=='worker'||tool?.mode!=='worker'))throw failure(424,'الأداة تحتاج عامل الإنتاج المرتبط.');
        if(tool?.id==='kokoro'&&!tool.languages.includes(campaign.language.split('-')[0]))throw failure(400,'Kokoro لا يدعم لغة هذه الحملة.');
        const owner=createHash('sha256').update(body.credential).digest('hex'),id=owner+':'+body.requestId;
        const fingerprint=JSON.stringify({operation,campaign:body.campaign,tool:body.tool});const old=requests.get(id);
        if(old){if(old.fingerprint!==fingerprint)throw failure(409,'تغيرت المهمة؛ أرسل طلباً جديداً.');return send(200,await old.promise);}
        const budget=budgets.get(owner)||{at:now(),count:0};if(active>=2||budget.count>=6||requests.size>=80)throw failure(429,'وصلت الخدمة إلى حد المهام؛ انتظر قبل إرسال مهمة أخرى.');
        budget.count++;budgets.set(owner,budget);active++;
        const promise=(async()=>{try{
          if(operation==='start')return json(await workerCall('/jobs',config,{id:body.requestId,tool:tool.id,campaign}));
          const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+config.model+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':config.key},body:JSON.stringify({contents:[{role:'user',parts:[{text:generationPrompt(campaign)}]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:7000}}),redirect:'error',signal:AbortSignal.timeout(55000)});
          if(!response.ok)throw failure(response.status===429?429:502,response.status===429?'رصيد أو حد Gemini لا يسمح بالتوليد الآن.':'تعذر توليد السكربت من Gemini.');
          const data=await json(response,100000);if(data.candidates?.[0]?.finishReason!=='STOP')throw failure(502,'توقف النموذج قبل إكمال المسودة. لم تُحفظ نتيجة ناقصة.');
          let output;try{output=JSON.parse(data.candidates[0].content.parts.filter(p=>!p.thought&&p.text).map(p=>p.text).join(''));}catch{throw failure(502,'لم يُعد النموذج مسودة منظمة صالحة.');}
          if(typeof output.script!=='string'||!output.script.trim()||output.script.length>18000)throw failure(502,'السكربت فارغ أو تجاوز حد الحملة.');
          return {output,model:config.model,usage:data.usageMetadata||null};
        }finally{active--;}})();
        requests.set(id,{at:now(),fingerprint,promise});return send(200,await promise);
      }
      if(['job','artifact'].includes(operation)){
        if(config.provider!=='worker'||!uuid(body.id))throw failure(400,'معرّف مهمة غير صالح.');
        if(operation==='job')return send(200,await json(await workerCall('/jobs/'+body.id,config)));
        if(!/^[a-zA-Z0-9_.-]{1,100}$/.test(body.artifactId||''))throw failure(400,'معرّف مادة غير صالح.');
        const response=await workerCall('/jobs/'+body.id+'/artifacts/'+body.artifactId,config),type=response.headers.get('content-type')?.split(';')[0];
        if(!['image/png','image/jpeg','image/webp','audio/wav','audio/mpeg','video/mp4','text/plain','application/json'].includes(type))throw failure(502,'نوع الملف غير مدعوم.');
        const bytes=await readBytes(response,20*1024*1024);return new Response(bytes,{status:200,headers:{...headers,'content-type':type,'content-disposition':'attachment; filename="'+body.artifactId+'"'}});
      }
      throw failure(404,'عملية المحتوى غير موجودة.');
    }catch(error){return send(error.status||502,{error:error.status?error.message:'تعذر الاتصال بخدمة المحتوى. أعد التحقق من الربط.'});}
  };
}
