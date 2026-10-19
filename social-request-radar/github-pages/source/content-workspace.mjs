import {normalizeCampaign,applyGenerated,contentTools} from '../../lib/content-core.mjs';
import {contentRequest} from './content-client.mjs';
export function contentSummary(list){return {campaigns:list('campaign'),contentJobs:list('contentJob').slice(0,40),contentAssets:list('contentAsset').map(({data,...item})=>item),contentConnections:list('contentConnection').map(({credential,...item})=>item)};}
export async function contentAction(action,body,{list,put,store,request=contentRequest}){
  const find=id=>{const c=list('campaign').find(c=>c.id===id);if(!c)throw Error('الحملة غير موجودة على هذا الجهاز.');return c;};
  const connection=provider=>{const c=list('contentConnection').find(c=>c.provider===provider);if(!c?.credential)throw Error(provider==='worker'?'اربط عامل الإنتاج من إعدادات المحتوى أولاً.':'أضف مفتاح كتابة Gemini من إعدادات المحتوى أولاً.');return c;};
  if(action==='content-save'){
    const previous=list('campaign').find(c=>c.id===body?.id);const c=normalizeCampaign(body,previous);
    return put('campaign:'+c.id,'campaign',c);
  }
  if(action==='content-delete'){
    find(body?.id);for(const item of list('contentJob').filter(j=>j.campaignId===body.id))await store.remove('contentJob:'+item.id);
    for(const item of list('contentAsset').filter(j=>j.campaignId===body.id))await store.remove('contentAsset:'+item.id);
    await store.remove('campaign:'+body.id);return {ok:true};
  }
  if(action==='content-connect'){
    const result=await request('configure',body);if(!result.credential||!['gemini','worker'].includes(result.provider)||result.verified!==true)throw Error('لم تؤكد الخدمة صلاحية الربط.');
    await put('contentConnection:'+result.provider,'contentConnection',{provider:result.provider,credential:result.credential,model:result.model||'',capabilities:result.capabilities||[],verifiedAt:new Date().toISOString()});return {ok:true,provider:result.provider};
  }
  if(action==='content-disconnect'){if(!['gemini','worker'].includes(body?.provider))throw Error('ربط غير صالح.');await store.remove('contentConnection:'+body.provider);return {ok:true};}
  if(action==='content-status')return request('status');
  if(action==='content-generate'){
    const c=find(body?.id),config=connection('gemini');
    const result=await request('generate',{campaign:c,credential:config.credential,requestId:body.requestId});
    const updated=applyGenerated(c,result.output,result.model);await put('campaign:'+updated.id,'campaign',updated);return updated;
  }
  if(action==='content-task'){
    const c=find(body?.id),config=connection('worker'),tool=contentTools.find(t=>t.id===body.tool);
    if(tool?.mode!=='worker')throw Error('هذه الأداة تستخدم البحث الحالي أو حزمة تصدير.');
    if(tool.id==='kokoro'&&!tool.languages.includes(c.language.split('-')[0]))throw Error('Kokoro لا يدعم العربية رسمياً. اختر حملة إنجليزية أو مزود صوت عربي آخر.');
    const result=await request('start',{campaign:c,tool:tool.id,credential:config.credential,requestId:body.requestId});
    if(!/^[a-f0-9-]{36}$/.test(result.id||'')||result.state!=='queued')throw Error('لم يؤكد العامل قبول المهمة.');
    const job={id:result.id,tool:tool.id,campaignId:c.id,campaignRevision:c.revision,state:'queued',createdAt:new Date().toISOString(),result:null};
    await put('contentJob:'+job.id,'contentJob',job);return job;
  }
  if(action==='content-job'){
    const job=list('contentJob').find(j=>j.id===body?.id);if(!job)throw Error('مهمة غير موجودة.');
    const config=connection('worker'),result=await request('job',{id:job.id,credential:config.credential});
    if(!['queued','running','completed','failed','expired'].includes(result.state))throw Error('حالة العامل غير صالحة.');
    const next={...job,state:result.state,result:result.result||null,error:result.error||'',updatedAt:new Date().toISOString()};
    await put('contentJob:'+next.id,'contentJob',next);return next;
  }
  if(action==='content-artifact'){
    const job=list('contentJob').find(j=>j.id===body?.id);if(!job||job.state!=='completed'||!job.result?.artifacts?.some(a=>a.id===body.artifactId))throw Error('لم تصدر هذه المادة من مهمة مكتملة.');
    return request('artifact',{credential:connection('worker').credential,id:job.id,artifactId:body.artifactId});
  }
  if(action==='content-asset'){
    find(body?.campaignId);const data=body.data;
    if(!(data instanceof Blob)||data.size>20*1024*1024||data.size===0||!/^(image\/(png|jpeg|webp)|audio\/(wav|x-wav|mpeg|mp4|ogg)|video\/(mp4|webm)|text\/plain)$/.test(data.type))throw Error('اختر صورة أو صوتاً أو فيديو أو نصاً حتى ٢٠ ميجابايت.');
    const existing=list('contentAsset').filter(a=>a.campaignId===body.campaignId);if(existing.length>=12||existing.reduce((n,a)=>n+a.size,0)+data.size>100*1024*1024)throw Error('حد الحملة ١٢ مادة و١٠٠ ميجابايت.');
    const asset={id:crypto.randomUUID(),campaignId:body.campaignId,name:String(body.name||'مادة').slice(0,120),type:data.type,size:data.size,data,createdAt:new Date().toISOString()};
    await put('contentAsset:'+asset.id,'contentAsset',asset);return {id:asset.id};
  }
  if(action==='content-read-asset'){const a=list('contentAsset').find(a=>a.id===body?.id);if(!a)throw Error('المادة غير موجودة.');return a;}
  if(action==='content-delete-asset'){await store.remove('contentAsset:'+String(body?.id||''));return {ok:true};}
  throw Error('عملية محتوى غير مدعومة.');
}
