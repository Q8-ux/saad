import {createHash} from 'node:crypto';
import {credentialVault,ApiError} from '../server/credentials.mjs';
import {prepareSpec,analyze} from '../lib/radar-core.mjs';
import {gather} from '../lib/providers.mjs';

async function readJson(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'CONTENT_TYPE','استخدم صيغة JSON.');
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'INVALID_BODY','الطلب فارغ.');
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000){await reader.cancel();throw new ApiError(413,'BODY_LIMIT','الطلب أكبر من الحد المسموح.');}chunks.push(value);}
  const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(joined));}catch{throw new ApiError(400,'INVALID_JSON','تعذر قراءة الطلب.');}
}

/** @param {{sealKey:string,fetcher?:any,collector?:any,now?:any,allowedOrigin?:string}} [options] */
export function createEdgeHandler({sealKey,fetcher=fetch,collector=gather,now=Date.now,allowedOrigin='https://q8-ux.github.io'}={}){
  const vault=credentialVault(sealKey,now),runs=new Map();let active=0,configurations={since:now(),count:0};
  const limits={maxRequests:12,maxCredits:20};
  return async function handle(request){
    const headers={'cache-control':'no-store','content-type':'application/json;charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
    const origin=request.headers.get('origin');
    if(origin===allowedOrigin)Object.assign(headers,{'access-control-allow-origin':allowedOrigin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'});
    const send=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    try{
      const pathname=new URL(request.url).pathname;
      const operation=['/api/status','/api/configure','/api/search','/health'].find(p=>pathname.endsWith(p))||'/';
      if(request.method==='GET'&&['/','/health','/api/status'].includes(operation))return send(200,{ok:true,service:'social-request-radar',runtime:'supabase-edge',version:1,limits,keyConfigured:false});
      if(origin!==allowedOrigin)throw new ApiError(403,'ORIGIN_DENIED','مصدر الطلب غير مسموح.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(request.method!=='POST'||!['/api/status','/api/configure','/api/search'].includes(operation))throw new ApiError(404,'NOT_FOUND','العملية غير موجودة.');
      const body=await readJson(request);if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'INVALID_BODY','صيغة الطلب غير صحيحة.');
      if(operation==='/api/configure'){
        if(now()-configurations.since>60000)configurations={since:now(),count:0};
        if(++configurations.count>30)throw new ApiError(429,'RATE_LIMIT','انتظر دقيقة قبل إعادة حفظ المفتاح.');
        const key=String(body.apiKey||'').trim();if(key.length<12||key.length>500||/\s/.test(key))throw new ApiError(400,'KEY_FORMAT','أدخل مفتاح API صالحًا من حساب مزود البيانات.');
        return send(200,{credential:vault.seal(key),keyConfigured:true,verified:false,limits});
      }
      if(!body.credential)throw new ApiError(424,'SETUP_REQUIRED','أضف مفتاح مصدر التعليقات من «مصادر البيانات» لتشغيل البحث المباشر.');
      const apiKey=vault.open(body.credential);
      if(operation==='/api/status')return send(200,{ok:true,keyConfigured:true,verified:false,limits});
      if(!/^[a-zA-Z0-9-]{16,70}$/.test(String(body.requestId||'')))throw new ApiError(400,'REQUEST_ID','معرّف الجولة غير صحيح.');
      const spec=prepareSpec(body);spec.maxRequests=Math.min(spec.maxRequests,limits.maxRequests);spec.maxCredits=Math.min(spec.maxCredits,limits.maxCredits);
      const id=createHash('sha256').update(body.credential).digest('hex')+':'+body.requestId,fingerprint=JSON.stringify(spec);
      for(const [key,run]of runs)if(now()-run.createdAt>15*60000)runs.delete(key);
      const previous=runs.get(id);if(previous){if(previous.fingerprint!==fingerprint)throw new ApiError(409,'REQUEST_CHANGED','استخدم جولة جديدة عند تغيير البحث.');return send(200,await previous.promise);}
      if(active>=2||runs.size>=30)throw new ApiError(429,'BUSY','توجد جولات بحث قيد التنفيذ. أعد المحاولة بعد انتهائها.');
      active++;
      const promise=(async()=>{try{
        const signal=AbortSignal.timeout(110000),boundedFetch=(url,options={})=>fetcher(url,{...options,signal:options.signal?AbortSignal.any([signal,options.signal]):signal});
        const remote=await collector(spec,apiKey,boundedFetch),records=remote.records.slice(0,2000);
        return {id:body.requestId,state:records.length?'completed':'uncollected',mode:'live',spec,createdAt:new Date(now()).toISOString(),...analyze(records,spec),report:{...remote.report,truncated:remote.records.length>records.length},collectedRecords:records};
      }finally{active--;}})();
      runs.set(id,{createdAt:now(),fingerprint,promise});return send(200,await promise);
    }catch(error){return send(error.status||400,{code:error.code||'SEARCH_FAILED',error:error instanceof ApiError||error.code?error.message:'تعذر تنفيذ البحث. راجع بيانات المصدر ثم أعد المحاولة.'});}
  };
}
