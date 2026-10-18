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
const words = text => norm(text).replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
// Literal words/phrases with a small, explicit Arabic prefix list; this is not stemming.
const arabicPrefixes=['','و','ف','ب','ل','ك','ال','بال','لل','وال','فال','وبال','ولل','كال'];
export function matchesPhrase(text,phrase) {
  const hay=Array.isArray(text)?text:words(text),needle=words(phrase);if(!needle.length)return false;
  const prefixes=/^[\u0621-\u064a]/u.test(needle[0])?arabicPrefixes:[''];
  return hay.some((token,index)=>prefixes.some(prefix=>token===prefix+needle[0])&&needle.slice(1).every((part,offset)=>hay[index+offset+1]===part));
}
const signalRules=[
  ['service_request','طلب خدمة',['ابي','ابغي','ابغى','احتاج','نحتاج','اريد','نريد','ادور','ابحث','محتاج','عايز','عاوز','بدي','نبي','looking for','i need','we need']],
  ['question','سؤال',['كم','بكم','كيف','شلون','متى','وين','منو','هل','ليش','لماذا','اين','ممكن','استفسار','سؤال','how','where','what','when','can anyone','does anyone']],
  ['recommendation','طلب توصية',['تنصحون','ترشحون','رشحوا','رشحولي','دلوني','احد يعرف','recommend','recommendation']],
  ['experience','تجربة مذكورة',['جربت','تجربتي','تجربة','i tried','my experience']],
  ['advertisement','صيغة إعلان',['للتواصل','احجز الان','خصم','خدماتنا','نقدم لكم','زورونا','book now','our services','special offer','limited offer']]
];
export function audienceSignals(text) {
  const tokens=words(text);
  const evidence=signalRules.flatMap(([type,label,terms])=>terms.filter(term=>matchesPhrase(tokens,term)).map(term=>({type,label,term})));
  if(/[؟?]/u.test(text))evidence.push({type:'question',label:'علامة سؤال',term:'؟ / ?'});
  const has=type=>evidence.some(signal=>signal.type===type);
  const negated=['لا احتاج','ما احتاج','لا اريد','مو محتاج','i do not need',"i don't need"].some(term=>matchesPhrase(tokens,term));
  const advertisement=has('advertisement');
  const request=!advertisement&&!negated&&(has('service_request')||has('question')||has('recommendation'));
  const kind=advertisement?'advertisement':negated?'unclear':has('recommendation')?'recommendation':has('service_request')?'service_request':has('question')?'question':has('experience')?'experience':'unclear';
  const sentences=String(text).match(/[^.!؟?\n]+[.!؟?]?/gu)||[];
  const question=request?(sentences.find(sentence=>/[؟?]/u.test(sentence)||signalRules.slice(0,3).some(([, ,terms])=>terms.some(term=>matchesPhrase(sentence,term))))||String(text)).trim():'';
  return {kind,label:signalRules.find(([type])=>type===kind)?.[1]||'غير واضح',request,advertisement,negated,evidence:evidence.slice(0,6),question};
}
const topics = [
 ['عقود وإيجارات',['عقد','عقود','ايجار','مستاجر']],['قضايا عمالية',['راتب','رواتب','فصل تعسفي','مكافاة','عمالي']],
 ['إجراءات قانونية',['محامي','محام','قضية','قانون','قانونية']],['أسعار وتكلفة',['سعر','تكلفة','اسعار','كم يكلف','بكم']],
 ['موقع الخدمة',['وين','مكان','موقع','where']],['تجربة وتوصية',['تجربة','تنصحون','ترشحون','recommend']],
 ['تعلّم وتوضيح',['كيف','شلون','شرح','how']],['توفر الخدمة',['موجود','متوفر','توفر','احتاج','ابي']]
];
export function category(text) {const tokens=words(text);return topics.map(([name,terms])=>({name,hits:terms.filter(term=>matchesPhrase(tokens,term)).length})).filter(item=>item.hits).sort((a,b)=>b.hits-a.hits)[0]?.name||'سؤال عن الخدمة';}
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
  const parsed=parseTimestamp(raw.createdAt??raw.created_at??raw.created_at_utc??raw.publishedTime??raw.create_time??raw.created_utc??raw.timestamp??raw.legacy?.created_at);
  const canonical=typeof raw.id==='string'&&raw.id.startsWith(platform+':')?raw.id:'';
  const firstId=values=>values.find(value=>value!==undefined&&value!==null&&value!=='');
  const originalId=firstId([raw.nativeId,raw.commentId,canonical?(canonical.startsWith(platform+':derived:')?undefined:canonical.slice(platform.length+1)):raw.id,raw.pk,raw.cid,raw.rest_id]);
  const derived=originalId===undefined;
  return {id:derived?(canonical||platform+':derived:'+hash(safeUrl+'|'+username+'|'+parsed+'|'+text)):platform+':'+String(originalId),
    nativeId:derived?'':String(originalId),platform,kind,author:String(username).slice(0,150),text:text.slice(0,20000),sourceUrl:safeUrl,
    parentId:raw.parentId||raw.parent_id||raw.replied_to_comment_id||(raw.parent==='root'?null:raw.parent)||parentId||null,createdAt:parsed,
    authorLocation:String(raw.authorLocation||author.location||'').slice(0,180),
    likes:raw.likes??raw.like_count??raw.comment_like_count??raw.digg_count??raw.engagement?.likes??raw.legacy?.favorite_count??null,
    collectedAt:parseTimestamp(raw.collectedAt),importedAt:parseTimestamp(raw.importedAt),collectionMethod:String(raw.collectionMethod||'').slice(0,80)};
}
function parseTimestamp(raw) {
  if(raw===undefined||raw===null||raw==='')return null;
  const value=typeof raw==='number'||/^\d{10}(?:\d{3})?$/.test(String(raw))?Number(raw)*(Number(raw)<1e12?1000:1):raw;
  const date=new Date(value);return Number.isNaN(date.getTime())?null:date.toISOString();
}
export function validateSourceUrl(url,platform) {
  const hosts={instagram:['instagram.com'],x:['x.com','twitter.com'],youtube:['youtube.com','youtu.be'],tiktok:['tiktok.com'],reddit:['reddit.com','redd.it'],facebook:['facebook.com','fb.watch']};
  try{const u=new URL(String(url));if(u.protocol!=='https:'||u.username||u.password||!hosts[platform]?.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))) throw Error();u.hash='';return u.href;}catch{throw new Error('رابط مصدر غير صالح للمنصة المحددة.');}
}
export function hash(text) {let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return(a>>>0).toString(16)+(b>>>0).toString(16);}
export function importRecords(rows,platform,url){if(!Array.isArray(rows))throw new Error('يجب أن يحتوي الملف على قائمة تعليقات.');const out=[],now=new Date().toISOString();function visit(items,p,u,parent=null){for(const raw of items){if(out.length>=2000)throw new Error('الحد الأقصى ٢٠٠٠ تعليق ورد في الملف.');const row=normalizeRecord(raw,raw.platform||p,raw.postUrl||raw.post_url||u,raw.kind||(parent?'reply':'comment'),parent);if(!row)continue;out.push({...row,importedAt:row.importedAt||now});const children=raw.answers||raw.replies;if(Array.isArray(children))visit(children,row.platform,row.sourceUrl,row.nativeId||row.id);}}visit(rows,platform,url);return out;}
export function analyze(records,spec) {
  const seen=new Set(),results=[];const excluded={duplicate:0,topic:0,notRequest:0,country:0,date:0,dateUnknown:0};
  for(const r of records){if(!r)continue;if(seen.has(r.id)){excluded.duplicate++;continue;}seen.add(r.id);
    const hits=spec.terms.filter(t=>matchesPhrase(r.text,t));if(!hits.length){excluded.topic++;continue;}
    const intent=audienceSignals(r.text),{request,advertisement}=intent;if(spec.requestsOnly&&!request){excluded.notRequest++;continue;}
    const geo=locate(r,spec.country);if(geo.status==='unknown'&&!spec.includeUnknown){excluded.country++;continue;}
    if((spec.since||spec.until)&&!r.createdAt){excluded.dateUnknown++;continue;}
    if((spec.since&&r.createdAt<spec.since)||(spec.until&&r.createdAt>spec.until+'T23:59:59.999Z')){excluded.date++;continue;}
    const score=Math.min(100,35+Math.min(25,hits.length*10)+(request?25:0)+(geo.status==='mentioned'||geo.status==='profile'?15:0)-(advertisement?40:0));
    results.push({...r,geo,request,advertisement,intent,matchedTerms:hits,score,category:category(r.text)});
  }
  results.sort((a,b)=>b.score-a.score||(b.createdAt||'').localeCompare(a.createdAt||''));
  return {results,excluded,scanned:records.filter(Boolean).length,unique:seen.size};
}
export function growthInsights(records) {
  const buckets=new Map(),seen=new Set();
  for(const r of records){if(!r?.text)continue;const identity=r.id||r.platform+':'+(r.nativeId||hash(r.sourceUrl+'|'+r.text));if(seen.has(identity))continue;seen.add(identity);const intent=audienceSignals(r.text);if(!intent.request)continue;const key=category(r.text);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({...r,intent});}
  const angles={'أسعار وتكلفة':'وضّح العوامل التي تغيّر التكلفة، وما المعلومات المطلوبة قبل تقديم سعر.','إجراءات قانونية':'وضّح الخطوات والمستندات المطلوبة بعد مراجعة مختص، مع ذكر نطاق الدولة.','عقود وإيجارات':'اعرض قائمة تحقق تساعد الجمهور على مراجعة البنود أو تحديد احتياجه.','قضايا عمالية':'ناقش الإجراء والمستندات المرتبطة بالسؤال بعد مراجعة مختص.','موقع الخدمة':'وضّح طريقة الوصول إلى الخدمة والنطاق الذي تغطيه.','تجربة وتوصية':'قدّم معايير واضحة للمقارنة والاختيار مع مثال عملي.','تعلّم وتوضيح':'اشرح خطوة واحدة من السؤال، ثم اعرض تطبيقًا قصيرًا.','توفر الخدمة':'وضّح شروط التوفر وطريقة التأكد منها قبل الطلب.'};
  return [...buckets].map(([topic,items])=>{
    const unique=new Set();const evidence=items.filter(item=>{const quote=norm(item.intent.question||item.text);if(unique.has(quote))return false;unique.add(quote);return true;}).slice(0,3).map(item=>({id:item.id,quote:item.intent.question||item.text,sourceUrl:item.sourceUrl,author:item.author,platform:item.platform}));
    return {topic,count:items.length,authors:new Set(items.filter(item=>item.author).map(item=>item.platform+':'+item.author)).size,evidence,example:evidence[0].quote,source:evidence[0].sourceUrl,
      hook:'سؤال الجمهور: «'+evidence[0].quote.slice(0,120)+(evidence[0].quote.length>120?'…':'')+'»',
      angle:angles[topic]||'أجب عن السؤال المحدد بمعلومة قابلة للتحقق، ثم وضّح الخطوة التالية.',format:topic==='عقود وإيجارات'?'منشور شرائح مع قائمة تحقق قصيرة':'فيديو قصير يجيب عن سؤال واحد، مع مثال واضح',
      cta:'تابع الحساب لمزيد من الإجابات عن '+topic,
      test:'قارن افتتاحية بسؤال الجمهور مع افتتاحية بمثال لنفس المحتوى والمدة. سجّل الحفظ وزيارات الملف والمتابعات مع أعداد الظهور؛ المقارنة رصدية حتى تُجرى تجربة مضبوطة.'};
  }).sort((a,b)=>b.count-a.count).slice(0,7);
}
export function growthMetrics(raw) {
  const value={};for(const key of ['impressions','visits','follows','unfollows']){const n=Number(raw[key]);if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw Error('أدخل أرقاماً صحيحة غير سالبة.');value[key]=n;}
  return {...value,profileRate:value.impressions?value.visits/value.impressions*100:null,followRate:value.visits?value.follows/value.visits*100:null,net:value.follows-value.unfollows};
}
export function safeCsv(rows){const fields=['id','nativeId','platform','kind','parentId','author','text','sourceUrl','createdAt','collectedAt','importedAt','authorLocation','likes','collectionMethod','geo','score'];const escape=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+[fields.join(','),...rows.map(r=>fields.map(k=>escape(k==='geo'?r.geo?.evidence:r[k])).join(','))].join('\r\n');}
