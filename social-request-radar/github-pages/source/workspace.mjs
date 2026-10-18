import {prepareSpec,analyze,importRecords,normalizeRecord,growthMetrics,platformNames} from '../../lib/radar-core.mjs';
export function indexedStore(){
  let connection;
  async function db(){if(!connection)connection=new Promise((resolve,reject)=>{if(!globalThis.indexedDB)return reject(Error('تخزين المتصفح غير متاح. افتح الموقع في متصفح يدعم IndexedDB.'));const r=indexedDB.open('saad-request-radar-device-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('documents',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('تعذر فتح بيانات هذا المتصفح.'));});return connection;}
  async function run(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('documents',mode);let value;const r=action(tx.objectStore('documents'));r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(Error('تعذر حفظ البيانات على هذا الجهاز. صدّر ملفك وراجع مساحة التخزين.'));tx.onabort=()=>reject(Error('لم يكتمل حفظ البيانات.'));});}
  return {all:()=>run('readonly',s=>s.getAll()),put:doc=>run('readwrite',s=>s.put(doc)),remove:key=>run('readwrite',s=>s.delete(key))};
}
export function createLocalApi(store){return async function api(action,body){
  const all=await store.all();const list=kind=>all.filter(d=>d.kind===kind).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(d=>d.payload);
  const put=async(key,kind,payload)=>{await store.put({key,kind,payload,updatedAt:new Date().toISOString()});return payload;};
  if(action==='workspace')return {connected:false,deviceLocal:true,searches:list('search').slice(0,20),saved:list('saved'),metrics:list('metric'),datasets:list('dataset').map(d=>({id:d.id,name:d.name,count:d.records.length,createdAt:d.createdAt}))};
  if(action==='import'){
    if(!Array.isArray(body?.records)||!body.records.length||body.records.length>2000)throw Error('استورد من تعليق واحد إلى ٢٠٠٠ تعليق.');
    const records=importRecords(body.records,body.platform,body.postUrl);if(!records.length)throw Error('لا توجد نصوص قابلة للبحث.');
    const item={id:crypto.randomUUID(),name:String(body.name||'ملف تعليقات').slice(0,100),records,createdAt:new Date().toISOString()};
    await put('dataset:'+item.id,'dataset',item);return {id:item.id,count:records.length};
  }
  if(action==='search'){
    if(body?.mode==='live')throw Error('البحث المباشر يحتاج ربط مصدر البيانات بالخادم الآمن. اختر «ملفاتي» للبحث في التعليقات المستوردة.');
    const spec=prepareSpec(body);const records=list('dataset').flatMap(d=>d.records).filter(r=>spec.platforms.includes(r.platform));
    const result={id:crypto.randomUUID(),state:'completed',spec,mode:'library',createdAt:new Date().toISOString(),...analyze(records,spec),report:{provider:'ملفات هذا المتصفح',calls:0,creditsUsed:0,sources:[],collectedAt:new Date().toISOString(),coverage:'الملفات المستوردة في هذا المتصفح فقط'}};
    await put('search:'+result.id,'search',result);return result;
  }
  if(action==='save'){
    const row=body?.record;if(!row||typeof row.id!=='string')throw Error('اختر نتيجة صحيحة.');normalizeRecord(row,row.platform,row.sourceUrl,row.kind);
    if(body.remove)await store.remove('saved:'+row.id);else await put('saved:'+row.id,'saved',row);return {ok:true};
  }
  if(action==='metrics'){
    if(!body?.account?.trim()||!Object.hasOwn(platformNames,body.platform))throw Error('أدخل الحساب والمنصة.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(body.end||'')||body.start>body.end)throw Error('حدد فترة قياس صحيحة.');
    const metric={id:crypto.randomUUID(),account:body.account,platform:body.platform,start:body.start,end:body.end,...growthMetrics(body),createdAt:new Date().toISOString()};
    await put('metric:'+metric.id,'metric',metric);return metric;
  }
  if(action==='delete'){
    if(!['search','dataset','metric'].includes(body?.kind)||typeof body.id!=='string')throw Error('اختر العنصر المطلوب.');await store.remove(body.kind+':'+body.id);return {ok:true};
  }
  throw Error('عملية غير مدعومة.');
};}
