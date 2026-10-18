export const platformNames = {instagram:'Instagram', x:'X', tiktok:'TikTok', youtube:'YouTube', reddit:'Reddit', facebook:'Facebook'};
export const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
export const countryName = code => code === 'ALL' ? 'كل الدول' : new Intl.DisplayNames(['ar'], {type:'region'}).of(code);
const aliases = {KW:['الكويت','kuwait','كويتي','كويتية'],SA:['السعودية','السعوديه','saudi','الرياض','جدة'],AE:['الامارات','دبي','ابوظبي','dubai','uae'],QA:['قطر','qatar','الدوحة'],BH:['البحرين','bahrain'],OM:['عمان','سلطنة عمان','oman'],EG:['مصر','egypt','القاهرة'],JO:['الاردن','jordan'],IQ:['العراق','iraq'],GB:['بريطانيا','المملكة المتحدة','united kingdom','uk'],US:['الولايات المتحدة','united states','usa']};
export function norm(s='') { return String(s).normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim(); }
function contains(hay,needle) { const h=' '+norm(hay).replace(/[^\p{L}\p{N}]+/gu,' ')+' ',n=norm(needle).replace(/[^\p{L}\p{N}]+/gu,' ');return h.includes(' '+n+' ')||(/^[\u0600-\u06ff]+$/.test(n)&&['ب','ل','و','بال','بالـ'].some(p=>h.includes(' '+p+n+' '))); }
export function locate(record, country) {
  if (country === 'ALL') return {status:'unrestricted',label:'كل الدول',evidence:'لم يُطلب تحديد دولة'};
  const options = [...new Set([countryName(country),new Intl.DisplayNames(['en'],{type:'region'}).of(country),...(aliases[country]||[])])].filter(a=>!(country==='OM'&&norm(a)==='عمان'));
  const inText = options.find(a=>contains(record.text,a));
  if (inText) return {status:'mentioned',label:countryName(country),evidence:'ذكر «'+inText+'» في النص؛ لا يثبت الإقامة'};
  const inProfile = options.find(a=>contains(record.authorLocation||'',a));
  if (inProfile) return {status:'profile',label:countryName(country),evidence:'الموقع المعلن في الملف: '+String(record.authorLocation).slice(0,160)};
  return {status:'unknown',label:'الدولة غير واضحة',evidence:'لا يوجد دليل كافٍ في النص أو الموقع المعلن'};
}
const requestRe = /(?:^|\s)(?:ابي|ابغي|ابغى|احتاج|نحتاج|اريد|نريد|ادور|ابحث|منو|وين|دلوني|ترشحون|رشحوا|ممكن|استفسار|هل احد|احد يعرف|looking for|i need|we need|can anyone|recommend|where can|how can)(?:\s|$|[؟?،])/u;
const adRe = /(?:للتواصل|احجز الان|خصم|خدماتنا|نقدم لكم|زورونا|book now|our services|special offer|limited offer)/u;
const topics = [
 ['عقود وإيجارات',['عقد','عقود','ايجار','مستاجر']],['قضايا عمالية',['راتب','رواتب','فصل','مكافاة','عمالي']],
 ['إجراءات قانونية',['محامي','محام','قضية','قانون','استشارة']],['أسعار وتكلفة',['سعر','تكلفة','اسعار','كم يكلف','بكم']],
 ['موقع الخدمة',['وين','مكان','موقع','where']],['تجربة وتوصية',['تجربة','تنصحون','ترشحون','recommend']],
 ['تعلّم وتوضيح',['كيف','شلون','شرح','how']],['توفر الخدمة',['موجود','متوفر','توفر','احتاج','ابي']]
];
export function category(text) { const n=norm(text);return topics.find(([,terms])=>terms.some(t=>n.includes(t)))?.[0]||'احتياج آخر'; }
export function prepareSpec(raw={}) {
  const query=String(raw.query||'').trim();
  if(query.length<2||query.length>240) throw new Error('اكتب موضوع بحث بين حرفين و٢٤٠ حرفاً.');
  const country=String(raw.country||'KW').toUpperCase();
  if(country!=='ALL'&&!countryCodes.includes(country)) throw new Error('اختر دولة صحيحة.');
  const platforms=[...new Set((raw.platforms||['instagram']).filter(p=>Object.hasOwn(platformNames,p)))];
  if(!platforms.length) throw new Error('اختر منصة واحدة على الأقل.');
  const terms=String(raw.terms||'').split(/[,،\n]+/).map(norm).filter(Boolean).slice(0,16);
  const stop=new Set(['اشخاص','يطلبون','طلب','ابحث','البحث','اريد','عن','في','من','على','كل','الناس','لي']);
  const effectiveTerms=terms.length?terms:norm(query).split(' ').filter(x=>x.length>2&&!stop.has(x));
  if(!effectiveTerms.length) throw new Error('أضف كلمة أو عبارة تحدد الخدمة.');
  for(const k of ['since','until']) if(raw[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(raw[k])||Number.isNaN(Date.parse(raw[k])))) throw new Error('التاريخ غير صحيح.');
  if(raw.since&&raw.until&&raw.since>raw.until) throw new Error('بداية الفترة يجب أن تسبق نهايتها.');
  const urls=Array.isArray(raw.urls)?raw.urls:String(raw.urls||'').split(/\s+/).filter(Boolean);
  if(urls.length>12) throw new Error('الحد الأقصى ١٢ رابطاً في الجولة.');
  for(const url of urls)if(!platforms.some(p=>{try{validateSourceUrl(url,p);return true;}catch{return false;}}))throw new Error('أضف روابط صحيحة تخص المنصات المحددة.');
  return {query,country,platforms,terms:effectiveTerms,since:raw.since||'',until:raw.until||'',urls,
    includeUnknown:!!raw.includeUnknown,requestsOnly:raw.requestsOnly!==false,includeReplies:!!raw.includeReplies,
    maxRequests:Math.max(1,Math.min(30,Number(raw.maxRequests)||12)),maxCredits:Math.max(1,Math.min(200,Number(raw.maxCredits)||20))};
}
export function normalizeRecord(raw, platform, url, kind='comment', parentId=null) {
  if(!raw||typeof raw!=='object') throw new Error('صيغة نتيجة غير متوقعة');
  const author=raw.author||raw.user||raw.owner||{};
  const text=raw.text||raw.content||raw.body||raw.legacy?.full_text||[raw.title,raw.selftext].filter(Boolean).join('\n');
  if(typeof text!=='string'||!text.trim()) return null;
  let source=raw.sourceUrl||raw.url||raw.post_url||raw.permalink||url||'';
  if(source.startsWith('/r/')) source='https://www.reddit.com'+source;
  const safeUrl=validateSourceUrl(source,platform);
  let username=typeof author==='string'?author:(author.username||author.unique_id||author.name||'');
  if(!username&&platform==='x'&&safeUrl) username=new URL(safeUrl).pathname.split('/')[1]||'';
  const date=raw.createdAt||raw.created_at||raw.publishedTime||raw.create_time||raw.created_utc||raw.timestamp||raw.legacy?.created_at;
  let parsed=null;
  if(date!==undefined&&date!==null&&date!=='') {
    const value=typeof date==='number'?date*(date<1e12?1000:1):date;
    const d=new Date(value);if(!Number.isNaN(d.getTime())) parsed=d.toISOString();
  }
  const originalId=raw.commentId||raw.id||raw.pk||raw.cid||raw.rest_id;
  const derived=originalId===undefined||originalId===null;
  return {id:platform+':'+(derived?'derived:'+hash(safeUrl+'|'+username+'|'+parsed+'|'+text):String(originalId)),
    nativeId:derived?'':String(originalId),platform,kind,author:String(username).slice(0,150),text:text.slice(0,20000),sourceUrl:safeUrl,
    parentId:raw.parentId||raw.parent_id||(raw.parent==='root'?null:raw.parent)||parentId||null,createdAt:parsed,
    authorLocation:String(raw.authorLocation||author.location||'').slice(0,180),
    likes:raw.likes??raw.comment_like_count??raw.digg_count??raw.engagement?.likes??raw.legacy?.favorite_count??null,
    collectedAt:new Date().toISOString()};
}
export function validateSourceUrl(url,platform) {
  const hosts={instagram:['instagram.com'],x:['x.com','twitter.com'],youtube:['youtube.com','youtu.be'],tiktok:['tiktok.com'],reddit:['reddit.com','redd.it'],facebook:['facebook.com','fb.watch']};
  try{const u=new URL(String(url));if(u.protocol!=='https:'||u.username||u.password||!hosts[platform]?.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))) throw Error();u.hash='';return u.href;}catch{throw new Error('رابط مصدر غير صالح للمنصة المحددة.');}
}
export function hash(text) {let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return(a>>>0).toString(16)+(b>>>0).toString(16);}
export function importRecords(rows,platform,url){const out=[];function visit(items,p,u,parent=null){for(const raw of items){if(out.length>=2000)throw new Error('الحد الأقصى ٢٠٠٠ تعليق ورد في الملف.');const row=normalizeRecord(raw,raw.platform||p,raw.postUrl||raw.post_url||u,raw.kind||(parent?'reply':'comment'),parent);if(!row)continue;out.push(row);const children=raw.answers||raw.replies;if(Array.isArray(children))visit(children,row.platform,row.sourceUrl,row.nativeId||row.id);}}visit(rows,platform,url);return out;}
export function analyze(records,spec) {
  const seen=new Set(),results=[];const excluded={duplicate:0,topic:0,notRequest:0,country:0,date:0,dateUnknown:0};
  for(const r of records){if(!r)continue;if(seen.has(r.id)){excluded.duplicate++;continue;}seen.add(r.id);
    const n=norm(r.text),hits=spec.terms.filter(t=>n.includes(t));if(!hits.length){excluded.topic++;continue;}
    const request=requestRe.test(n),advertisement=adRe.test(n);if(spec.requestsOnly&&(!request||advertisement)){excluded.notRequest++;continue;}
    const geo=locate(r,spec.country);if(geo.status==='unknown'&&!spec.includeUnknown){excluded.country++;continue;}
    if((spec.since||spec.until)&&!r.createdAt){excluded.dateUnknown++;continue;}
    if((spec.since&&r.createdAt<spec.since)||(spec.until&&r.createdAt>spec.until+'T23:59:59.999Z')){excluded.date++;continue;}
    const score=Math.min(100,35+Math.min(25,hits.length*10)+(request?25:0)+(geo.status==='mentioned'||geo.status==='profile'?15:0)-(advertisement?40:0));
    results.push({...r,geo,request,advertisement,matchedTerms:hits,score,category:category(r.text)});
  }
  results.sort((a,b)=>b.score-a.score||(b.createdAt||'').localeCompare(a.createdAt||''));
  return {results,excluded,scanned:records.filter(Boolean).length,unique:seen.size};
}
export function growthInsights(records) {
  const buckets=new Map();
  for(const r of records){const key=r.category||category(r.text);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}
  return [...buckets].map(([topic,items])=>({topic,count:items.length,example:items[0].text,source:items[0].sourceUrl,
    hook:'من أسئلة الجمهور: '+items[0].text.replace(/\s+/g,' ').slice(0,90),
    format:'فيديو قصير يجيب عن سؤال واحد، مع مثال واضح',
    cta:'تابع الحساب لإجابات عملية عن '+topic,
    test:'اختبر افتتاحيتين لنفس الفكرة، وقارن الحفظ وزيارات الملف والمتابعات.'})).sort((a,b)=>b.count-a.count).slice(0,7);
}
export function growthMetrics(raw) {
  const value={};for(const key of ['impressions','visits','follows','unfollows']){const n=Number(raw[key]);if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw Error('أدخل أرقاماً صحيحة غير سالبة.');value[key]=n;}
  return {...value,profileRate:value.impressions?value.visits/value.impressions*100:null,followRate:value.visits?value.follows/value.visits*100:null,net:value.follows-value.unfollows};
}
export function safeCsv(rows){const fields=['platform','author','text','sourceUrl','nativeId','createdAt','geo','score'];const escape=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+[fields.join(','),...rows.map(r=>fields.map(k=>escape(k==='geo'?r.geo?.evidence:r[k])).join(','))].join('\r\n');}
