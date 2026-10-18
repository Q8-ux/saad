import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {credentialVault,ApiError} from './credentials.mjs';
export {credentialVault} from './credentials.mjs';
import {prepareSpec,analyze} from '../lib/radar-core.mjs';
import {gather} from '../lib/providers.mjs';

async function readJson(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'CONTENT_TYPE','استخدم صيغة JSON.');
  let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>64000)throw new ApiError(413,'BODY_LIMIT','الطلب أكبر من الحد المسموح.');text+=chunk;}
  try{return JSON.parse(text);}catch{throw new ApiError(400,'INVALID_JSON','تعذر قراءة الطلب.');}
}

export function createRadarServer({sealKey,allowedOrigin='https://q8-ux.github.io',fetcher=fetch,collector=gather,now=Date.now,maxRequests=12,maxCredits=20}={}){
  const vault=credentialVault(sealKey,now),runs=new Map(),connections=new Map();let active=0;
  const limits={maxRequests,maxCredits};
  const server=createServer(async(req,res)=>{
    res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');
    res.setHeader('referrer-policy','no-referrer');
    const origin=req.headers.origin;
    if(origin===allowedOrigin){res.setHeader('access-control-allow-origin',allowedOrigin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-methods','GET, POST, OPTIONS');res.setHeader('access-control-allow-headers','content-type');}
    const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json;charset=utf-8'});res.end(JSON.stringify(data));};
    try{
      const path=new URL(req.url,'http://radar.local').pathname;
      if(req.method==='GET'&&(path==='/'||path==='/health'||path==='/api/status'))return send(200,{ok:true,service:'social-request-radar',version:1,limits,keyConfigured:false});
      if(origin!==allowedOrigin)throw new ApiError(403,'ORIGIN_DENIED','مصدر الطلب غير مسموح.');
      if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
      if(req.method!=='POST'||!['/api/configure','/api/status','/api/search'].includes(path))throw new ApiError(404,'NOT_FOUND','العملية غير موجودة.');
      const body=await readJson(req);
      if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'INVALID_BODY','صيغة الطلب غير صحيحة.');
      if(path==='/api/configure'){
        const address=req.socket.remoteAddress||'unknown';const stamp=connections.get(address)||{start:now(),count:0};if(now()-stamp.start>60000){stamp.start=now();stamp.count=0;}stamp.count++;connections.set(address,stamp);if(stamp.count>30)throw new ApiError(429,'RATE_LIMIT','انتظر دقيقة قبل إعادة حفظ المفتاح.');
        const apiKey=String(body.apiKey||'').trim();if(apiKey.length<12||apiKey.length>500||/\s/.test(apiKey))throw new ApiError(400,'KEY_FORMAT','أدخل مفتاح API صالحًا من حساب مزود البيانات.');
        return send(200,{credential:vault.seal(apiKey),keyConfigured:true,verified:false,limits});
      }
      if(!body.credential)throw new ApiError(424,'SETUP_REQUIRED','أضف مفتاح مصدر التعليقات من «مصادر البيانات» لتشغيل البحث المباشر.');
      const apiKey=vault.open(body.credential);
      if(path==='/api/status')return send(200,{ok:true,keyConfigured:true,verified:false,limits});
      if(!/^[a-zA-Z0-9-]{16,70}$/.test(String(body.requestId||'')))throw new ApiError(400,'REQUEST_ID','معرّف الجولة غير صحيح.');
      const spec=prepareSpec(body);spec.maxRequests=Math.min(spec.maxRequests,maxRequests);spec.maxCredits=Math.min(spec.maxCredits,maxCredits);
      const owner=createHash('sha256').update(body.credential).digest('hex'),id=owner+':'+body.requestId,fingerprint=JSON.stringify(spec);
      for(const [key,run]of runs)if(now()-run.createdAt>15*60000)runs.delete(key);
      const previous=runs.get(id);if(previous){if(previous.fingerprint!==fingerprint)throw new ApiError(409,'REQUEST_CHANGED','استخدم جولة جديدة عند تغيير البحث.');return send(200,await previous.promise);}
      if(active>=2)throw new ApiError(429,'BUSY','توجد جولة بحث قيد التنفيذ. أعد المحاولة بعد انتهائها.');
      if(runs.size>=30)throw new ApiError(429,'RUN_LIMIT','وصل الخادم إلى حد الجولات المؤقت. انتظر قليلًا قبل جولة جديدة.');
      active++;
      const promise=(async()=>{
        try{
          const signal=AbortSignal.timeout(120000);
          const boundedFetch=(url,options={})=>fetcher(url,{...options,signal:options.signal?AbortSignal.any([signal,options.signal]):signal});
          const remote=await collector(spec,apiKey,boundedFetch),records=remote.records.slice(0,2000),analysis=analyze(records,spec);
          const report={...remote.report,truncated:remote.records.length>records.length};
          return {id:body.requestId,state:records.length?'completed':'uncollected',mode:'live',spec,createdAt:new Date(now()).toISOString(),...analysis,report,collectedRecords:records};
        }finally{active--;}
      })();
      runs.set(id,{createdAt:now(),fingerprint,promise});
      return send(200,await promise);
    }catch(error){return send(error.status||400,{code:error.code||'SEARCH_FAILED',error:error instanceof ApiError||error.code?error.message:'تعذر تنفيذ البحث. راجع بيانات المصدر ثم أعد المحاولة.'});}
  });
  server.requestTimeout=150000;server.headersTimeout=15000;
  return server;
}
