import {parseDocument} from 'htmlparser2';
import {parseTelegramMessages,TELEGRAM_CHANNEL,TELEGRAM_SOURCE,TELEGRAM_URL} from '../public/telegram-import.mjs';
import {CATEGORIES} from '../public/core.mjs';
import {normalizeImportRow,redactContacts} from './catalog-import.mjs';
const hasClass=(node,name)=>(node.attribs?.class||'').split(/\s+/).includes(name);
const find=(node,test)=>{if(test(node))return node;for(const child of node.children||[]){const item=find(child,test);if(item)return item;}return null;};
const plain=node=>node.type==='text'?node.data:['script','style'].includes(node.name)?'':node.name==='br'?'\n':(node.children||[]).map(plain).join('');
export function parseTelegramPreview(html,options) {
  const dom=parseDocument(html,{decodeEntities:true}),messages=[];
  const visit=node=>{
    const post=node.attribs?.['data-post'];
    if(post){const match=post.match(/^soogq8\/([1-9]\d{0,9})$/i);if(match){const content=find(node,n=>hasClass(n,'tgme_widget_message_text'));const time=find(node,n=>n.name==='time'&&n.attribs?.datetime);if(content)messages.push({id:Number(match[1]),text:plain(content),date:time?.attribs.datetime});}return;}
    for(const child of node.children||[])visit(child);
  };
  visit(dom);
  if(!messages.length)throw new Error('تعذر قراءة منشورات القناة من المعاينة العامة. استخدم ملف تصدير JSON للقناة.');
  return {...parseTelegramMessages(messages,options),source:TELEGRAM_SOURCE,channel:TELEGRAM_CHANNEL};
}
export async function fetchTelegramPreview(beforeId='',fetcher=fetch) {
  if(beforeId&&!/^[1-9]\d{0,9}$/.test(String(beforeId)))throw new Error('رقم المنشور غير صالح');
  const url=new URL('https://t.me/s/soogQ8');if(beforeId)url.searchParams.set('before',beforeId);
  let response;
  try{response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'AqariX-Kuwait/1.4 (+https://q8-ux.github.io/saad/aqari-x/)','accept':'text/html'}});}catch{throw new Error('تعذر الوصول إلى القناة حالياً. استخدم ملف تصدير JSON للقناة.');}
  if(!response.ok)throw new Error('تعذر الوصول إلى القناة حالياً. استخدم ملف تصدير JSON للقناة.');
  if(Number(response.headers.get('content-length'))>2000000)throw new Error('معاينة القناة أكبر من المسموح');
  const reader=response.body.getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000)throw new Error('معاينة القناة أكبر من المسموح');parts.push(value);}}finally{reader.cancel().catch(()=>{});}
  return parseTelegramPreview(Buffer.concat(parts).toString('utf8'),{beforeId});
}
export function normalizeTelegramRow(row) {
  if(!/^[1-9]\d{0,9}$/.test(String(row?.sourceId||'')))throw new Error('رقم المنشور غير صالح');
  const allowedBases=row.category==='للبيع'?['total']:row.category==='للبدل'?['exchange_difference']:['monthly','unit_monthly','annual'];
  if(!allowedBases.includes(row.priceBasis))throw new Error('اختر أساس السعر');
  const clean={...row,title:redactContacts(row.title),location:redactContacts(row.location),source:TELEGRAM_SOURCE,sourceUrl:`${TELEGRAM_URL}/${row.sourceId}`,
    description:'ملخص حقول من منشور القناة. راجع المكتب لتأكيد البيانات والتوفر والتفويض.'};
  const {property:p,fingerprint}=normalizeImportRow(clean,TELEGRAM_SOURCE,'');
  delete p.permissionRef;p.sourceKind='market-research';p.marketingAuthorized=false;p.availabilityVerified=false;p.mediaRights='not-imported';p.trialIllustration=true;
  const published=row.sourcePublishedAt?new Date(row.sourcePublishedAt):null;
  if(published&&(!Number.isFinite(published.getTime())||published.getTime()>Date.now()+86400000))throw new Error('تاريخ المصدر غير صالح');
  p.sourcePublishedAt=published?.toISOString()||null;
  return {property:p,fingerprint};
}
