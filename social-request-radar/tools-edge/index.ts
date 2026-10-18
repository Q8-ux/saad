import {createHmac} from 'node:crypto';
import {createToolsHandler} from './handler.mjs';
declare const Deno:{env:{get(name:string):string|undefined},serve(handler:(request:Request)=>Promise<Response>):unknown};
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const root=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||keys.default;
if(!root)throw Error('Server credential unavailable');
const base=Deno.env.get('SUPABASE_URL')!;
const sealKey=createHmac('sha256',root).update('social-request-radar:tools-jobs:v1').digest('base64url');
async function rest(path:string,method='GET',body?:unknown){
  const headers:Record<string,string>={apikey:root,'content-type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'};
  if(root.startsWith('eyJ'))headers.Authorization='Bearer '+root;
  const response=await fetch(base+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const text=await response.text();
  if(!response.ok){if(text.includes('RADAR_QUEUE_LIMIT'))throw Object.assign(Error('وصل العامل إلى حد المهام: ٨ في الساعة أو ٣ قيد التنفيذ. انتظر قبل جولة جديدة.'),{status:429});throw Error('Database request failed');}
  return text?JSON.parse(text):null;
}
const db={
  worker:async()=>(await rest('radar_tools_workers?id=eq.primary&select=beat_at,run_id,report'))?.[0]||null,
  heartbeat:(body:unknown)=>rest('radar_tools_workers','POST',body),
  enqueue:(id:string,tokenHash:string,payload:string)=>rest('rpc/radar_tools_enqueue','POST',{p_id:id,p_token_hash:tokenHash,p_payload:payload}),
  claim:async(runId:string)=>(await rest('rpc/radar_tools_claim','POST',{p_run_id:runId}))?.[0]||null,
  complete:(id:string,runId:string,result:string)=>rest('rpc/radar_tools_complete','POST',{p_id:id,p_run_id:runId,p_result:result}),
  job:async(id:string)=>(await rest('radar_tools_jobs?id=eq.'+encodeURIComponent(id)+'&select=id,token_hash,state,expires_at,result_cipher'))?.[0]||null,
  remove:(id:string)=>rest('radar_tools_jobs?id=eq.'+encodeURIComponent(id),'PATCH',{state:'expired',payload_cipher:null,result_cipher:null}),
};
Deno.serve(createToolsHandler({sealKey,db}));
