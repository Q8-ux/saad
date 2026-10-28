import { AREAS, norm } from './core.mjs?v=1.4.0';
export const PAGE_SIZE = 12;
export const PRICE_BASES = [['monthly','شهرياً'],['unit_monthly','للوحدة / شهرياً'],['annual','سنوياً'],['total','سعر العقار'],['exchange_difference','فرق البدل']];
export const QUICK_SEARCHES = [
  {label:'شقق للإيجار',type:'شقة',category:'للإيجار',icon:'building'},
  {label:'فلل للبيع',type:'فيلا',category:'للبيع',icon:'home'},
  {label:'بيوت للبيع',type:'بيت',category:'للبيع',icon:'home'},
  {label:'أراضٍ للبيع',type:'أرض',category:'للبيع',icon:'area'},
  {label:'أراضٍ للبدل',type:'أرض',category:'للبدل',icon:'compare'},
  {label:'مكاتب للإيجار',type:'مكتب',category:'للإيجار',icon:'building'},
  {label:'محلات للإيجار',type:'محل',category:'للإيجار',icon:'building'},
];
export const FILTER_LABELS = {q:'البحث',category:'القسم',governorate:'المحافظة',area:'المنطقة',type:'نوع العقار',source:'مصدر الإعلان',origin:'نطاق البحث',minPrice:'السعر من · د.ك',maxPrice:'السعر إلى · د.ك',bedrooms:'غرف النوم على الأقل',bathrooms:'الحمامات على الأقل',minArea:'المساحة من · م²',maxArea:'المساحة إلى · م²',position:'مواصفة إضافية',priceBasis:'أساس السعر',media:'الوسائط',verified:'حالة التوفر'};
export function filterEntries(filters) {
  return Object.entries(FILTER_LABELS).filter(([key])=>filters[key]!=='' && filters[key]!=null).map(([key,label])=>({key,label,value:({priceBasis:Object.fromEntries(PRICE_BASES),origin:{market:'الرصد الخارجي',office:'بيانات المكتب'},media:{photos:'صور مرفقة من المعلن',video:'فيديو مرفق'},verified:{yes:'راجع المكتب التوفر'}})[key]?.[filters[key]] || String(filters[key])}));
}
export function pageSlice(items,page=1,size=PAGE_SIZE) {
  const pages=Math.max(1,Math.ceil(items.length/size));
  const current=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
  const start=(current-1)*size;
  return {items:items.slice(start,start+size),current,pages,start:items.length?start+1:0,end:Math.min(start+size,items.length),total:items.length};
}
export function areaName(location='') {
  const text=norm(location);
  // A governorate-only or differently named development must not inherit another area's pin.
  if(/غير محدده|محافظه|صباح الاحمد البحريه|الخيران السكنيه|خيطان الجنوبي/.test(text))return null;
  return AREAS.slice().sort((a,b)=>b.area.length-a.area.length).find(({area})=>text.includes(norm(area)))?.area || null;
}
export function salePricePerMetre(p) {
  return p.category==='للبيع'&&p.priceBasis==='total'&&Number.isSafeInteger(p.priceFils)&&p.priceFils>0&&Number.isFinite(p.area)&&p.area>0?Math.round(p.priceFils/p.area):null;
}
export function similarProperties(items,property,limit=3) {
  return items.filter(p=>p.id!==property.id&&['active','reference'].includes(p.status)&&p.category===property.category&&p.type===property.type)
    .map(p=>({p,score:(areaName(p.location)&&areaName(p.location)===areaName(property.location)?8:0)+(p.governorate===property.governorate?2:0)+(p.priceBasis===property.priceBasis?1:0),distance:p.priceBasis===property.priceBasis&&p.priceFils!=null&&property.priceFils!=null?Math.abs(p.priceFils-property.priceFils):Infinity}))
    .sort((a,b)=>b.score-a.score||a.distance-b.distance||String(b.p.createdAt).localeCompare(String(a.p.createdAt)))
    .slice(0,limit).map(x=>x.p);
}
