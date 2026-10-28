import {AREAS,CATEGORIES,TYPES,extractListing,numberText,norm} from './core.mjs?v=1.4.0';
import {redactContacts} from './contact-redaction.mjs?v=1.4.0';
export const TELEGRAM_CHANNEL='soogQ8';
export const TELEGRAM_SOURCE='تيليجرام · soogQ8';
export const TELEGRAM_URL='https://t.me/soogQ8';
const flatten=value=>typeof value==='string'?value:Array.isArray(value)?value.map(flatten).join(''):value&&typeof value==='object'&&typeof value.text==='string'?value.text:'';
export function telegramCandidate(message) {
  if(message?.type&&message.type!=='message')return null;
  const id=String(message?.id||'');if(!/^[1-9]\d{0,9}$/.test(id))return null;
  const clean=redactContacts(flatten(message.text||message.caption)).replace(/<[^>]*>/g,' ').trim();
  if(!clean||/(?:^|\n)\s*(?:مطلوب|ابحث|أبحث|نبحث|ابي)(?=\s|:|$)/u.test(clean))return null;
  const {fields:f}=extractListing(clean);
  // Ignore non-property messages. Missing category or location remains an editable review field.
  if(!TYPES.includes(f.type))return null;
  const text=numberText(clean),area=AREAS.find(a=>a.area===f.location),category=CATEGORIES.includes(f.category)?f.category:'';
  let priceBasis=category==='للبيع'?'total':category==='للبدل'?'exchange_difference':/سنو|بالسنه|بالسنة/.test(norm(text))?'annual':/شهري|بالشهر/.test(norm(text))?'monthly':'';
  if(priceBasis==='monthly'&&/(?:كل شقه|للشقه|لكل وحده|كل وحده)/.test(norm(text)))priceBasis='unit_monthly';
  const bathrooms=text.match(/(?:^|\s)(\d{1,2})\s*(?:حمام|حمامات|دورات مياه)/);
  const epoch=Number(message.date_unixtime);
  const qualifiedDate=typeof message.date==='string'&&/(?:Z|[+-]\d{2}:?\d{2})$/.test(message.date);
  const published=Number.isFinite(epoch)&&epoch>0?new Date(epoch*1000):qualifiedDate?new Date(message.date):null;
  const sourcePublishedAt=published&&Number.isFinite(published.getTime())?published.toISOString():null;
  return {sourceId:id,source:TELEGRAM_SOURCE,sourceUrl:`${TELEGRAM_URL}/${id}`,sourcePublishedAt,
    title:[f.type,category,f.location?'في '+f.location:''].filter(Boolean).join(' '),
    type:f.type,category,location:f.location||'',governorate:area?.governorate||'',
    price:f.price??'',priceBasis,area:f.area??'',bedrooms:f.bedrooms??'',bathrooms:bathrooms?Number(bathrooms[1]):'',
    description:'ملخص حقول من منشور القناة. راجع المكتب لتأكيد البيانات والتوفر والتفويض.'};
}
export function parseTelegramMessages(messages,{beforeId='',limit=20}={}) {
  if(!Array.isArray(messages))throw new Error('اختر تصدير JSON لقناة واحدة من تيليجرام');
  if(beforeId&&!/^[1-9]\d{0,9}$/.test(String(beforeId)))throw new Error('رقم المنشور غير صالح');
  const bounded=messages.filter(m=>!beforeId||Number(m.id)<Number(beforeId)).slice(-500),seen=new Set(),rows=[];
  for(const message of bounded){const candidate=telegramCandidate(message);if(candidate&&!seen.has(candidate.sourceId)){seen.add(candidate.sourceId);rows.push(candidate);}}
  const selected=rows.sort((a,b)=>Number(b.sourceId)-Number(a.sourceId)).slice(0,Math.min(20,Math.max(1,limit)));
  return {rows:selected,examined:bounded.length,candidates:rows.length,skipped:bounded.length-rows.length,nextBeforeId:selected.at(-1)?.sourceId||null};
}
export function parseTelegramExport(input,options) {
  const text=String(input).replace(/^\uFEFF/,'');if(text.length>5000000)throw new Error('تصدير القناة أكبر من 5 ميغابايت؛ صدّر فترة أقصر');
  const value=JSON.parse(text);
  if(value?.type&&!['public_channel','private_channel','channel'].includes(value.type))throw new Error('اختر تصدير JSON لقناة واحدة من تيليجرام');
  return parseTelegramMessages(value?.messages,options);
}
