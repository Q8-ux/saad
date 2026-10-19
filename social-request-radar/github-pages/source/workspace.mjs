import {prepareSpec,analyze,importRecords,normalizeRecord,growthMetrics,platformNames} from '../../lib/radar-core.mjs';
import {platformCounts} from './search-state.mjs';
import {makeTransfer,readTransfer} from './device-transfer.mjs';
import {contentAction,contentSummary} from './content-workspace.mjs';
import {withCommentSource,sourceSnapshot} from '../../lib/comment-sources.mjs';
const upgradeRow=row=>{try{return withCommentSource(row);}catch{return row;}};
function upgradeDocument(doc){
  const p=doc.payload;let payload=p;
  if(doc.kind==='saved')payload=upgradeRow(p);
  if(doc.kind==='search')payload={...p,results:(p.results||[]).map(upgradeRow)};
  if(doc.kind==='dataset')payload={...p,records:(p.records||[]).map(upgradeRow)};
  if(doc.kind==='toolJob'||doc.kind==='toolReport')payload={...p,sourceRecords:(p.sourceRecords||[]).map(upgradeRow)};
  if(doc.kind==='campaign')payload={...p,sources:(p.sources||[]).map(upgradeRow)};
  return {...doc,payload};
}
export function indexedStore(){
  let connection;
  async function db(){if(!connection)connection=new Promise((resolve,reject)=>{if(!globalThis.indexedDB)return reject(Error('تخزين المتصفح غير متاح. افتح الموقع في متصفح يدعم IndexedDB.'));const r=indexedDB.open('saad-request-radar-device-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('documents',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('تعذر فتح بيانات هذا المتصفح.'));});return connection;}
  async function run(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('documents',mode);let value;const r=action(tx.objectStore('documents'));r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(Error('تعذر حفظ البيانات على هذا الجهاز. صدّر ملفك وراجع مساحة التخزين.'));tx.onabort=()=>reject(Error('لم يكتمل حفظ البيانات.'));});}
  return {all:()=>run('readonly',s=>s.getAll()),put:doc=>run('readwrite',s=>s.put(doc)),putMany:docs=>run('readwrite',s=>{let request;for(const doc of docs)request=s.put(doc);return request;}),remove:key=>run('readwrite',s=>s.delete(key))};
}
/** @param {any} store @param {{remote?:any}} [options] */
export function createLocalApi(store,{remote=null}={}){let backendReady=false,backendError=remote?.initialBlocker||'';return async function api(action,body){
  const all=(await store.all()).map(upgradeDocument);const list=kind=>all.filter(d=>d.kind===kind).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(d=>d.payload);
  const put=async(key,kind,payload)=>{await store.put({key,kind,payload,updatedAt:new Date().toISOString()});return payload;};
  const connection=list('connector')[0];
  if(action.startsWith('content-'))return contentAction(action,body,{list,put,store});
  if(action==='export-transfer')return makeTransfer(all,remote?.endpoint||'',body?.preferredSearchId||list('view')[0]?.searchId);
  if(action==='import-transfer'){
    const transfer=readTransfer(body,remote?.endpoint||'');
    const incoming=transfer.documents.find(doc=>doc.kind==='connector')?.payload;
    if(incoming){
      if(!remote)throw Error('خادم البحث غير مُعدّ لهذه النسخة.');
      const status=await remote.status(incoming.credential);
      if(status.ok!==true||status.keyConfigured!==true)throw Error('لم يؤكد الخادم صلاحية ملف الربط. أعد تصديره من الجهاز المرتبط.');
    }
    if(!store.putMany)throw Error('حدّث الصفحة لإكمال نقل البيانات.');
    const selected=transfer.preferredSearchId||transfer.documents.find(doc=>doc.kind==='search'&&doc.payload.results.length)?.payload.id||transfer.documents.find(doc=>doc.kind==='search')?.payload.id;
    await store.putMany([...transfer.documents,...(selected?[{key:'view:search',kind:'view',payload:{searchId:selected},updatedAt:new Date().toISOString()}]:[])]);
    if(incoming){backendReady=true;backendError='';}
    return {connected:!!incoming,documents:transfer.documents.length,records:transfer.documents.filter(doc=>doc.kind==='dataset').reduce((n,doc)=>n+doc.payload.records.length,0),searchId:selected||null};
  }
  if(action==='workspace')return {...contentSummary(list),connected:!!remote&&backendReady&&!!connection?.credential,backendConfigured:!!remote,backendReady,backendError,backendUrl:remote?.endpoint||'',sourceVerifiedAt:connection?.verifiedAt||null,deviceLocal:true,selectedSearchId:list('view')[0]?.searchId||null,searches:list('search').slice(0,20),saved:list('saved'),metrics:list('metric'),toolsJobs:list('toolJob'),toolsReports:list('toolReport').slice(0,12),datasets:list('dataset').map(d=>({id:d.id,name:d.name,count:d.records.length,platformCounts:platformCounts(d.records),createdAt:d.createdAt}))};
  if(action==='select-search'){
    const search=list('search').find(s=>s.id===body?.id);
    if(!search||!['completed','uncollected'].includes(search.state))throw Error('الجولة غير موجودة على هذا الجهاز.');
    await put('view:search','view',{searchId:search.id});return {selectedSearchId:search.id};
  }
  if(action==='tool-job'){
    if(!/^[a-f0-9-]{36}$/.test(body?.id||'')||!/^[A-Za-z0-9_-]{48,100}$/.test(body.token||''))throw Error('مهمة غير صالحة.');
    return put('toolJob:'+body.id,'toolJob',{id:body.id,token:body.token,action:body.action,createdAt:new Date().toISOString(),sourceRecords:(body.sourceRecords||[]).slice(0,80).map(sourceSnapshot)});
  }
  if(action==='tool-result'){
    const {id,result}=body||{};if(typeof id!=='string'||!result)throw Error('نتيجة أدوات غير صالحة.');
    const job=list('toolJob').find(j=>j.id===id);if(!job)throw Error('المهمة غير محفوظة على هذا الجهاز.');
    let imported=0;
    if(result.action==='collect'&&result.records?.length){
      if(result.records.length>80)throw Error('تجاوزت النتيجة حد الجولة.');
      const records=importRecords(result.records,result.records[0].platform,result.records[0].sourceUrl);imported=records.length;
      await put('dataset:tools-'+id,'dataset',{id:'tools-'+id,name:'جمع الأدوات · '+(result.report?.collector||'مصدر'),records,createdAt:new Date().toISOString()});
    }
    const {records,...summary}=result;
    await put('toolReport:'+id,'toolReport',{id,...summary,sourceRecords:job.sourceRecords,imported,createdAt:new Date().toISOString()});return {imported};
  }
  if(action==='browser-analysis'){
    if(!body?.result||!Array.isArray(body.sourceRecords)||body.sourceRecords.length>80)throw Error('تحليل غير صالح.');
    const report={id:crypto.randomUUID(),...body.result,sourceRecords:body.sourceRecords.map(sourceSnapshot),createdAt:new Date().toISOString()};return put('toolReport:'+report.id,'toolReport',report);
  }
  if(action==='connect'){
    if(!remote)throw Error('خادم البحث غير مُعدّ لهذه النسخة.');
    const response=await remote.configure(body?.apiKey);
    if(!response.credential||typeof response.credential!=='string')throw Error('لم يؤكد الخادم حفظ المفتاح.');
    backendReady=true;backendError='';
    await put('connector:scrapecreators','connector',{credential:response.credential,configuredAt:new Date().toISOString(),verifiedAt:null});return {configured:true,verified:false};
  }
  if(action==='disconnect'){await store.remove('connector:scrapecreators');return {ok:true};}
  if(action==='connection-status'){
    if(!remote)throw Error('خادم البحث غير مُعدّ لهذه النسخة.');
    try{const status=await remote.status(connection?.credential);backendReady=status.ok===true;if(!backendReady)throw Error('لم يؤكد خادم البحث جاهزيته.');backendError='';return status;}catch(error){backendReady=false;backendError=backendError||error.message;throw error;}
  }
  if(action==='import'){
    if(!Array.isArray(body?.records)||!body.records.length||body.records.length>2000)throw Error('استورد من تعليق واحد إلى ٢٠٠٠ تعليق.');
    const records=importRecords(body.records,body.platform,body.postUrl);if(!records.length)throw Error('لا توجد نصوص قابلة للبحث.');
    const item={id:crypto.randomUUID(),name:String(body.name||'ملف تعليقات').slice(0,100),records,createdAt:new Date().toISOString()};
    await put('dataset:'+item.id,'dataset',item);return {id:item.id,count:records.length};
  }
  if(action==='search'){
    if(body?.mode==='live'){
      if(!remote||!connection?.credential)throw Error('البحث المباشر يحتاج ربط مصدر البيانات بالخادم الآمن. أضف مفتاح المزود من «مصادر البيانات».');
      const reply=await remote.search(body,connection.credential);const {collectedRecords:rawRecords=[],...result}=reply;const collectedRecords=rawRecords.map(upgradeRow);
      if(!result.id||!Array.isArray(result.results)||!result.report)throw Error('لم يُعد الخادم تقرير بحث صالحًا.');
      result.results=result.results.map(upgradeRow);
      if(collectedRecords.length){const id=crypto.randomUUID();await put('dataset:'+id,'dataset',{id,name:'جمع مباشر · '+body.query,records:collectedRecords,createdAt:result.createdAt});await put('connector:scrapecreators','connector',{...connection,verifiedAt:new Date().toISOString()});}
      await put('search:'+result.id,'search',result);await put('view:search','view',{searchId:result.id});return result;
    }
    const spec=prepareSpec(body);const records=list('dataset').flatMap(d=>d.records).filter(r=>spec.platforms.includes(r.platform));
    if(!records.length)throw Error('لم يبدأ البحث: لا توجد تعليقات مستوردة للمنصات المحددة. أضف ملف تعليقات من «مصادر البيانات».');
    const counts=platformCounts(records);
    const result={id:crypto.randomUUID(),state:'completed',spec,mode:'library',createdAt:new Date().toISOString(),...analyze(records,spec),report:{provider:'ملفات هذا المتصفح',calls:0,creditsUsed:0,sources:spec.platforms.map(platform=>({platform,status:counts[platform]?'completed':'not_collected',records:counts[platform],pages:0,remainingCursors:[],error:counts[platform]?null:{message:'لا توجد بيانات مستوردة لهذه المنصة؛ لم تُفحص.'}})),collectedAt:new Date().toISOString(),coverage:'فحص للملفات المستوردة فقط؛ لم تُجرَ طلبات إلى المنصات'}};
    await put('search:'+result.id,'search',result);await put('view:search','view',{searchId:result.id});return result;
  }
  if(action==='save'){
    const raw=body?.record;if(!raw||typeof raw.id!=='string')throw Error('اختر نتيجة صحيحة.');const row={...raw,...normalizeRecord(raw,raw.platform,raw.postUrl||raw.sourceUrl,raw.kind)};
    if(body.remove)await store.remove('saved:'+row.id);else await put('saved:'+row.id,'saved',row);return {ok:true};
  }
  if(action==='metrics'){
    if(!body?.account?.trim()||!Object.hasOwn(platformNames,body.platform))throw Error('أدخل الحساب والمنصة.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(body.end||'')||body.start>body.end)throw Error('حدد فترة قياس صحيحة.');
    const metric={id:crypto.randomUUID(),account:body.account,platform:body.platform,start:body.start,end:body.end,...growthMetrics(body),createdAt:new Date().toISOString()};
    await put('metric:'+metric.id,'metric',metric);return metric;
  }
  if(action==='delete'){
    if(!['search','dataset','metric','toolJob','toolReport'].includes(body?.kind)||typeof body.id!=='string')throw Error('اختر العنصر المطلوب.');await store.remove(body.kind+':'+body.id);if(body.kind==='search'&&list('view')[0]?.searchId===body.id)await store.remove('view:search');return {ok:true};
  }
  throw Error('عملية غير مدعومة.');
};}
