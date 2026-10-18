import {env} from 'cloudflare:workers';
import {and,eq,desc} from 'drizzle-orm';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '@/db';
import {documents} from '@/db/schema';
import {prepareSpec,analyze,normalizeRecord,importRecords,growthMetrics,platformNames} from '@/lib/radar-core.mjs';
import {gather} from '@/lib/providers.mjs';

export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
async function all(owner:string,kind:string,limit=50){return(await getDb().select().from(documents).where(and(eq(documents.owner,owner),eq(documents.kind,kind))).orderBy(desc(documents.updatedAt)).limit(limit)).map(r=>JSON.parse(r.payload));}
async function put(owner:string,key:string,kind:string,payload:unknown){await getDb().insert(documents).values({owner,key,kind,payload:JSON.stringify(payload),updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:[documents.owner,documents.key],set:{payload:JSON.stringify(payload),updatedAt:new Date().toISOString()}});}
function providerKey(){return String((env as unknown as Record<string,unknown>).SCRAPECREATORS_API_KEY||'').trim();}

export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
  const user=await getChatGPTUser();if(!user)return reply({error:'سجّل الدخول إلى مساحتك الخاصة.'},401);
  const {action}=await params;if(action!=='workspace')return reply({error:'غير موجود'},404);
  try{
    const [searches,saved,metrics,datasets]=await Promise.all([all(user.userId,'search',20),all(user.userId,'saved',500),all(user.userId,'metric',30),all(user.userId,'dataset',20)]);
    return reply({connected:!!providerKey(),searches,saved,metrics,datasets:datasets.map(d=>({id:d.id,name:d.name,count:d.records.length,createdAt:d.createdAt})),owner:'saad.albabhan'});
  }catch{return reply({error:'تعذر تحميل البيانات المحفوظة. حاول التحديث.'},500);}
}

export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
  const user=await getChatGPTUser();if(!user)return reply({error:'سجّل الدخول إلى مساحتك الخاصة.'},401);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'مصدر الطلب غير مسموح.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'استخدم صيغة JSON.'},415);
  let body:any;
  try{const text=await request.text();if(text.length>2_000_000)return reply({error:'الملف أكبر من الحد المسموح.'},413);body=JSON.parse(text);}catch{return reply({error:'تعذر قراءة الطلب.'},400);}
  const {action}=await params,owner=user.userId;
  try{
    if(action==='import'){
      if(!Array.isArray(body.records)||!body.records.length||body.records.length>2000)throw Error('استورد من تعليق واحد إلى ٢٠٠٠ تعليق في الملف.');
      const records=importRecords(body.records,body.platform,body.postUrl);
      if(!records.length)throw Error('الملف لا يتضمن نصوص تعليقات قابلة للبحث.');
      const item={id:crypto.randomUUID(),name:String(body.name||'ملف تعليقات').slice(0,100),records,createdAt:new Date().toISOString()};
      await put(owner,'dataset:'+item.id,'dataset',item);return reply({count:records.length,id:item.id});
    }
    if(action==='search'){
      const spec=prepareSpec(body),mode=body.mode==='live'?'live':'library';
      if(mode==='live'&&!providerKey())return reply({error:'البحث المباشر يحتاج ربط مزود البيانات. يمكنك البحث في الملفات المستوردة الآن.',code:'SETUP_REQUIRED'},424);
      if(!/^[a-zA-Z0-9-]{16,70}$/.test(String(body.requestId||'')))throw Error('معرّف الجولة غير صحيح.');
      const id=body.requestId,key='search:'+id;
      const existing=await getDb().select().from(documents).where(and(eq(documents.owner,owner),eq(documents.key,key))).limit(1);
      if(existing.length){const previous=JSON.parse(existing[0].payload);return previous.state==='running'?reply({error:'هذه الجولة قيد التنفيذ.'},409):reply(previous);}
      const started={id,state:'running',spec,mode,createdAt:new Date().toISOString()};
      const insert=await getDb().insert(documents).values({owner,key,kind:'search',payload:JSON.stringify(started),updatedAt:started.createdAt}).onConflictDoNothing().returning({key:documents.key});
      if(!insert.length)return reply({error:'الجولة مسجلة بالفعل. حدّث السجل.'},409);
      try{
        let records:any[],report:any;
        if(mode==='live'){const remote=await gather(spec,providerKey());records=remote.records;report=remote.report;}
        else{const files=await all(owner,'dataset',20);records=files.flatMap(d=>d.records).filter(r=>spec.platforms.includes(r.platform));report={provider:'ملفات مستوردة',coverage:'الملفات المحفوظة فقط',calls:0,creditsUsed:0,sources:[],collectedAt:new Date().toISOString()};}
        const result=analyze(records,spec);
        const finished={...started,state:'completed',...result,report};await put(owner,key,'search',finished);return reply(finished);
      }catch(e:any){await put(owner,key,'search',{...started,state:'failed',error:e.code?e.message:'تعذر إتمام الجولة. البيانات السابقة محفوظة.'});throw e;}
    }
    if(action==='save'){
      const record=body.record;if(!record||typeof record.id!=='string'||record.id.length>200)throw Error('اختر نتيجة صحيحة.');
      // Revalidate imported URLs before persistence; records are never rendered as HTML.
      normalizeRecord(record,record.platform,record.sourceUrl,record.kind);
      const key='saved:'+record.id;
      if(body.remove)await getDb().delete(documents).where(and(eq(documents.owner,owner),eq(documents.key,key)));
      else await put(owner,key,'saved',record);
      return reply({ok:true});
    }
    if(action==='metrics'){
      const account=String(body.account||'').trim();if(!account||account.length>120)throw Error('أدخل اسم الحساب.');
      if(!Object.hasOwn(platformNames,body.platform))throw Error('اختر المنصة.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(body.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(body.end||'')||body.start>body.end)throw Error('حدد فترة قياس صحيحة.');
      const item={id:crypto.randomUUID(),account,platform:body.platform,start:body.start,end:body.end,...growthMetrics(body),createdAt:new Date().toISOString()};
      await put(owner,'metric:'+item.id,'metric',item);return reply(item);
    }
    if(action==='delete'){
      if(!['dataset','metric','search'].includes(body.kind)||typeof body.id!=='string')throw Error('اختر عنصراً صحيحاً.');
      await getDb().delete(documents).where(and(eq(documents.owner,owner),eq(documents.key,body.kind+':'+body.id)));return reply({ok:true});
    }
    return reply({error:'غير موجود'},404);
  }catch(e:any){return reply({error:e.code?e.message:(e instanceof Error&&e.message.length<200?e.message:'تعذر تنفيذ الطلب.'),code:e.code||'INVALID_REQUEST'},e.code==='SETUP_REQUIRED'?424:400);}
}
