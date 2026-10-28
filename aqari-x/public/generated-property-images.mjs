// Original fictional image assets for the explicitly identified trial catalogue.
// Uploaded property photographs always take precedence. Never attach these to live listings.
const catalogIds=new Set([
  ...Array.from({length:9},(_,i)=>`initial-${String(i+1).padStart(2,'0')}`),
  ...[21217150,21225881,21220448,21219445,21231971,21214571,21278902,21261558,21220241,21289801,21189547,21200702,21212349,21208985,21189365,21130266,20817461,21223102,21193106,21193038,21171334,21211619,21210868,21224337].map(id=>`market-4sale-${id}`),
  ...[163667,163655,163673,163670,163712].map(id=>`market-sakan-${id}`),
]);
const types={'فيلا':'villa','بيت':'house','عمارة':'building','أرض':'land','مكتب':'office','محل':'shop'};
const apartments=['apartment-daylight','apartment-modern','apartment-ground'];
const overrides={'initial-05':'apartment-ground','initial-08':'apartment-daylight','initial-09':'apartment-modern','market-4sale-21261558':'apartment-studio'};
export const GENERATED_IMAGE_LABEL='صورة مولّدة · للتوضيح';
export const GENERATED_IMAGE_ALT='صورة عقارية مولّدة للتوضيح ولا تمثل العقار الفعلي';
export const GENERATED_IMAGE_NOTICE='صورة مولّدة بالذكاء الاصطناعي للتجربة؛ لا تمثل العقار المعروض أو تشطيبه أو موقعه الفعلي.';
export function generatedPropertyImage(p) {
  if(!p||p.status!=='reference'||p.images?.length)return null;
  const telegramTrial=p.source==='تيليجرام · soogQ8'&&p.sourceKind==='market-research'&&p.trialIllustration===true;
  if(!catalogIds.has(p.id)&&!telegramTrial)return null;
  const hash=[...p.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const asset=overrides[p.id]||(p.type==='شقة'?apartments[hash%apartments.length]:types[p.type]);
  if(!asset)return null;
  return {asset,src:new URL(`./assets/generated/${asset}.webp`,import.meta.url).href,generated:true};
}
