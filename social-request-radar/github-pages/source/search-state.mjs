import {platformNames} from '../../lib/radar-core.mjs';

export function restoredSearch(workspace={}) {
  const searches=(workspace.searches||[]).filter(s=>s&&typeof s.id==='string'&&s.spec&&['completed','uncollected'].includes(s.state));
  return searches.find(s=>s.id===workspace.selectedSearchId)||searches.find(s=>searchOutcome(s).kind==='matched')||searches[0]||null;
}

export function platformCounts(records=[]) {
  const counts=Object.fromEntries(Object.keys(platformNames).map(p=>[p,0]));
  for(const record of records)if(Object.hasOwn(counts,record.platform))counts[record.platform]++;
  return counts;
}

export function searchReadiness(workspace,mode,selected=[]) {
  const counts=Object.fromEntries(Object.keys(platformNames).map(p=>[p,0]));
  for(const dataset of workspace.datasets||[])for(const [p,count] of Object.entries(dataset.platformCounts||{}))if(Object.hasOwn(counts,p))counts[p]+=Number(count)||0;
  const platforms=Object.keys(platformNames).map(platform=>({platform,count:counts[platform],status:mode==='live'?(workspace.connected?'configured':'unconfigured'):(counts[platform]?'available':'no_data')}));
  if(mode==='live'&&!workspace.connected)return {ready:false,state:'unconfigured',count:null,platforms,title:workspace.backendConfigured&&!workspace.backendReady?(workspace.backendError?'خادم البحث غير متاح حاليًا':'جارٍ التحقق من خادم البحث'):'لم يبدأ البحث في المنصات',message:workspace.backendConfigured&&!workspace.backendReady?(workspace.backendError||'اضغط تحديث الحالة من «مصادر البيانات» للتحقق من تشغيل الخادم.'):workspace.backendConfigured?'الخادم متصل، لكن هذا الجهاز غير مربوط. استورد ملف الربط من جهازك الآخر أو أضف مفتاح المصدر من «مصادر البيانات».':'مصدر البحث المباشر غير مربوط. لم تُفحص تعليقات من أي منصة، ولا تعني هذه الحالة عدم وجود طلبات.',action:'ربط هذا الجهاز أو نقل الربط'};
  if(!selected.length)return {ready:false,state:'no_platform',count:null,platforms,title:'اختر منصة للبحث',message:'حدد منصة واحدة على الأقل.',action:null};
  if(mode==='live')return {ready:true,state:'ready',count:null,platforms};
  const count=selected.reduce((sum,p)=>sum+(counts[p]||0),0);
  if(!count)return {ready:false,state:'no_data',count:null,platforms,title:'لا توجد تعليقات مستوردة للمنصات المحددة',message:'البحث في «ملفاتي» يفحص التعليقات التي تضيفها فقط. أضف ملف تعليقات أو فعّل مصدر البحث المباشر.',action:'إضافة تعليقات للبحث'};
  return {ready:true,state:'ready',count,platforms};
}

export function searchOutcome(run) {
  if(!run)return {kind:'not_run',count:null};
  if(run.state==='uncollected')return {kind:'uncollected',count:null,title:'لم تُجمع تعليقات قابلة للفحص',message:'راجع تقرير كل منصة لمعرفة سبب تعذر الجمع أو عدم توفر منشورات في نطاق البحث.'};
  if(run.state!=='completed')return {kind:'failed',count:null,title:'لم تكتمل جولة البحث',message:run.error||'راجع حالة المصدر قبل إعادة البحث.'};
  if(!(run.scanned>0))return {kind:'uncollected',count:null,title:'لم تُفحص تعليقات في هذه الجولة',message:'هذه الجولة لم تجمع بيانات قابلة للفحص؛ لا يمكن اعتبارها نتيجة بحث بصفر تطابق.'};
  return {kind:run.results?.length?'matched':'empty',count:run.results?.length||0};
}
