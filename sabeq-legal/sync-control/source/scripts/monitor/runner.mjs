import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const allowed=new Set(['https://sabeq.legal','https://www.sabeq.legal','https://q8-ux-sabeq-admin-co-u4ma.bolt.host']);
export function approved(url){try{const u=new URL(url);return allowed.has(u.origin)&&u.pathname.startsWith('/api/')&&!u.username&&!u.password&&!u.search&&!u.hash}catch{return false}}
export function verifiedReceipt(id,memo){return typeof id==='string'&&id.length>0&&memo?.id===id?{source_id:id,target_id:memo.id,read_back:true}:null}
export async function runOperation(config,input,token,fetcher=fetch){
 let attemptedAt=null;const pending=reason=>({success:false,status:'pending',reason,receipts:[],attempted_at:attemptedAt});
 if(!['snapshot','test_send','resync'].includes(input.operation))return pending('عملية غير معروفة.');
 const need=input.operation==='snapshot'?['source_list','target_list']:input.operation==='test_send'?['test_send','target_get']:['resync','target_get'];
 if(need.some(k=>!approved(config[k])))return pending('مسارات الإنتاج لهذه العملية لم تُراجع وتُضبط بعد في monitor/contract.json. لم يُرسل أي طلب.');
 if(!token)return pending('سر المصادقة SABEQ_MONITOR_TOKEN غير متاح. لم يُرسل أي طلب.');
 const call=async(url,body)=>{if(input.operation!=='snapshot'&&url===config[input.operation])attemptedAt=new Date().toISOString();const r=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':input.correlation_id},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});let d;try{d=await r.json()}catch{throw Error('UPSTREAM_INVALID_JSON')}if(!r.ok||d?.success!==true)throw Error('UPSTREAM_UNCONFIRMED_'+r.status);return d};
 try{
  if(input.operation==='snapshot'){
   const a=await call(config.source_list,{action:'list',offset:0}),b=await call(config.target_list,{action:'list',offset:0});
   if(!Array.isArray(a.memos)||!Array.isArray(b.memos))return pending('قائمة المذكرات لا تطابق عقد البيانات.');
   const targets=new Map(b.memos.filter(m=>typeof m.id==='string').map(m=>[m.id,m]));
   const memos=a.memos.slice(0,50).filter(m=>typeof m.id==='string').map(m=>({id:m.id.slice(0,120),created_at:m.created_at||null,last_send_at:m.last_send_at||null}));
   const receipts=memos.map(m=>verifiedReceipt(m.id,targets.get(m.id))).filter(Boolean);
   const complete=memos.length>0&&receipts.length===memos.length;
   return{success:complete,status:complete?'verified':'pending',reason:complete?'تطابقت معرّفات الصفحة الحالية في المصدر والجهة المستقبلة.':'قُرئت البيانات؛ لم يثبت تطابق جميع معرّفات الصفحة الحالية.',memos,receipts,has_more:a.hasMore===true};
  }
  const write=await call(config[input.operation],input.operation==='test_send'?{test:true,title:String(input.test_title||'مذكرة اختبار الربط').slice(0,120),content:'مذكرة اصطناعية لاختبار الربط فقط. لا تتضمن بيانات عميل أو طلب دفع.',correlation_id:input.correlation_id}:{action:'resync',id:input.memo_id||null,correlation_id:input.correlation_id});
  const ids=input.operation==='test_send'?[write.memo_id]:(Array.isArray(write.memo_ids)?write.memo_ids:input.memo_id?[input.memo_id]:[]);
  if(!ids.length||ids.length>50||ids.some(id=>typeof id!=='string'||id.length>120))return pending('قبل الخادم الطلب لكن لم يعد معرّفات كافية لتأكيد الاستلام.');
  const receipts=[];for(const id of ids){const data=await call(config.target_get,{action:'get',id});const receipt=verifiedReceipt(id,data.memo);if(receipt)receipts.push(receipt)}
  const ok=receipts.length===ids.length;
  return{success:ok,status:ok?'verified':'pending',attempted_at:attemptedAt,reason:ok?'تأكد الاستلام بقراءة مستقلة من الجهة المستقبلة.':'لم يتأكد تطابق معرّفات جميع المذكرات.',receipts};
 }catch{return pending('تعذّر تأكيد نتيجة طلب الإنتاج. راجع جهة الاستلام قبل إعادة المحاولة لتجنب التكرار.')}}
async function main(){const input=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8')).inputs||{};if(!/^SM-[a-f0-9-]{36}$/.test(input.correlation_id||''))throw Error('Invalid correlation ID');const config=JSON.parse(await fs.readFile('monitor/contract.json','utf8'));const result=await runOperation(config,input,process.env.SABEQ_MONITOR_TOKEN);result.checked_at=new Date().toISOString();result.correlation_id=input.correlation_id;await fs.writeFile('monitor-result.json',JSON.stringify(result,null,2));const repo=process.env.GITHUB_REPOSITORY;if(!/^Q8-ux\/sabeq-admin-console$/.test(repo))throw Error('Unapproved repository');const r=await fetch('https://api.github.com/repos/'+repo+'/check-runs',{method:'POST',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+process.env.GITHUB_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({name:'Sabeq monitor result',head_sha:process.env.GITHUB_SHA,external_id:input.correlation_id,status:'completed',conclusion:result.status==='verified'?'success':result.status==='failed'?'failure':'neutral',output:{title:result.status==='verified'?'تأكد الاستلام':'معلّق — لم يتأكد الاستلام',summary:JSON.stringify(result)}})});if(!r.ok)throw Error('Unable to record operation result: '+r.status);await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'### '+(result.status==='verified'?'تأكد الاستلام':'الحالة معلّقة')+'\n'+result.reason+'\n\nCorrelation: '+input.correlation_id+'\n')}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{process.exitCode=1;console.error('Monitor operation did not finish; no success was confirmed.')});
