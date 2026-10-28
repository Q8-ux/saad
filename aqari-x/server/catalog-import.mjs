import { CATEGORIES, TYPES, GOVERNORATES, parseMoney, duplicateKey, numberText } from '../public/core.mjs';

export {redactContacts} from '../public/contact-redaction.mjs';
import {redactContacts} from '../public/contact-redaction.mjs';

export function safeSourceURL(value) {
  if (!value) return '';
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.href.length > 1500) return '';
    if (u.hostname==='t.me') {
      if(!/^\/soogq8(?:\/[1-9][0-9]{0,9})?\/?$/i.test(u.pathname))return '';
      u.search='';u.hash='';return u.href;
    }
    if (!['q84sale.com','www.q84sale.com','sakan.co','api.sakan.co','kw.opensooq.com'].includes(u.hostname)) return '';
    u.search = ''; u.hash = '';
    return u.href;
  } catch { return ''; }
}

const text = (v, max=180) => String(v ?? '').trim().slice(0,max);
const number = (v, max) => {
  if (v == null || v === '') return null;
  const n = Number(numberText(v));
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('قيمة رقمية غير صالحة');
  return n;
};
export function normalizeImportRow(row, source, permissionRef) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('صف إعلان غير صالح');
  const p = {
    title: text(row.title), category:text(row.category,30), type:text(row.type,30),
    location:text(row.location,160), governorate:text(row.governorate,40),
    priceFils:parseMoney(row.price), area:number(row.area,100000),
    bedrooms:number(row.bedrooms,100), bathrooms:number(row.bathrooms,100),
    description:text(row.description,6000), source:text(row.source||source,160),
    sourceId:text(row.sourceId,100), sourceUrl:safeSourceURL(row.sourceUrl),
    sourceKind:'authorized-import', permissionRef:text(permissionRef,500),
    marketingAuthorized:true, availabilityVerified:false,
    mediaRights:'permission-recorded', contact:'', ownerType:'external',
    images:[],videos:[],features:[],observedAt:new Date().toISOString(),
  };
  if (!p.title||!p.location||!p.source||!CATEGORIES.includes(p.category)||!TYPES.includes(p.type)||!Object.hasOwn(GOVERNORATES,p.governorate)) throw new Error('أكمل العنوان والقسم والنوع والمنطقة والمحافظة والمصدر');
  const bases = p.category==='للبيع'?['total']:p.category==='للبدل'?['exchange_difference']:['monthly','unit_monthly','annual'];
  p.priceBasis=bases.includes(row.priceBasis)?row.priceBasis:bases[0];
  // Contacts belong to the office. Never import advertiser numbers or links in descriptions.
  p.description=redactContacts(p.description);
  p.title=redactContacts(p.title);
  if(!p.title)throw new Error('عنوان العقار مطلوب');
  return {property:p,fingerprint:duplicateKey(p)};
}

export function isVideo(content,mime) {
  return (mime==='video/mp4' && content.length>=12 && content.toString('ascii',4,8)==='ftyp') ||
    (mime==='video/webm' && content.length>=4 && content.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])));
}
export function byteRange(value,total) {
  if (!value) return null;
  const m=/^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1]&&!m[2])) throw new Error('range');
  let start=m[1]?Number(m[1]):Math.max(0,total-Number(m[2]));
  let end=m[1]?(m[2]?Number(m[2]):total-1):total-1;
  if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=total||start>end||end<0) throw new Error('range');
  return {start,end:Math.min(end,total-1)};
}
