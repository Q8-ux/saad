import {platformNames} from '../../lib/radar-core.mjs';

export function platformCounts(records=[]) {
  const counts=Object.fromEntries(Object.keys(platformNames).map(p=>[p,0]));
  for(const record of records)if(Object.hasOwn(counts,record.platform))counts[record.platform]++;
  return counts;
}

export function searchReadiness(workspace,mode,selected=[]) {
  const counts=Object.fromEntries(Object.keys(platformNames).map(p=>[p,0]));
  for(const dataset of workspace.datasets||[])for(const [p,count] of Object.entries(dataset.platformCounts||{}))if(Object.hasOwn(counts,p))counts[p]+=Number(count)||0;
  const platforms=Object.keys(platformNames).map(platform=>({platform,count:counts[platform],status:mode==='live'?(workspace.connected?'configured':'unconfigured'):(counts[platform]?'available':'no_data')}));
  if(mode==='live'&&!workspace.connected)return {ready:false,state:'unconfigured',count:null,platforms,title:'لم يبدأ البحث في المنصات',message:'مصدر البحث المباشر غير مربوط. لم تُفحص تعليقات من أي منصة، ولا تعني هذه الحالة عدم وجود طلبات.',action:'ربط مصدر البحث'};
  if(!selected.length)return {ready:false,state:'no_platform',count:null,platforms,title:'اختر منصة للبحث',message:'حدد منصة واحدة على الأقل.',action:null};
  if(mode==='live')return {ready:true,state:'ready',count:null,platforms};
  const count=selected.reduce((sum,p)=>sum+(counts[p]||0),0);
  if(!count)return {ready:false,state:'no_data',count:null,platforms,title:'لا توجد تعليقات مستوردة للمنصات المحددة',message:'البحث في «ملفاتي» يفحص التعليقات التي تضيفها فقط. أضف ملف تعليقات أو فعّل مصدر البحث المباشر.',action:'إضافة تعليقات للبحث'};
  return {ready:true,state:'ready',count,platforms};
}

export function searchOutcome(run) {
  if(!run)return {kind:'not_run',count:null};
  if(run.state!=='completed')return {kind:'failed',count:null,title:'لم تكتمل جولة البحث',message:run.error||'راجع حالة المصدر قبل إعادة البحث.'};
  if(!(run.scanned>0))return {kind:'uncollected',count:null,title:'لم تُفحص تعليقات في هذه الجولة',message:'هذه الجولة لم تجمع بيانات قابلة للفحص؛ لا يمكن اعتبارها نتيجة بحث بصفر تطابق.'};
  return {kind:run.results?.length?'matched':'empty',count:run.results?.length||0};
}
