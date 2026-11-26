// Local, bounded inspection. No uploaded file is executed or extracted.
export const MAX_FILE_SIZE = 64 * 1024 * 1024;
const textDecoder = new TextDecoder('utf-8', {fatal:false});
const signatures = [
  ['ELF',[0x7f,0x45,0x4c,0x46]],['Windows PE / DOS',[0x4d,0x5a]],
  ['ZIP / APK',[0x50,0x4b,3,4]],['GZIP',[0x1f,0x8b,8]],['XZ',[0xfd,0x37,0x7a,0x58,0x5a,0]],
  ['SquashFS (little-endian)',[0x68,0x73,0x71,0x73]],['SquashFS (big-endian)',[0x73,0x71,0x73,0x68]],
  ['UBI',[0x55,0x42,0x49,0x23]],['uImage',[0x27,0x05,0x19,0x56]],
  ['PDF',[0x25,0x50,0x44,0x46]],['PNG',[0x89,0x50,0x4e,0x47]],
  ['PCAP',[0xd4,0xc3,0xb2,0xa1]],['PCAP',[0xa1,0xb2,0xc3,0xd4]],
  ['PCAP (nanoseconds)',[0x4d,0x3c,0xb2,0xa1]],['PCAP (nanoseconds)',[0xa1,0xb2,0x3c,0x4d]],
  ['PCAPNG',[0x0a,0x0d,0x0d,0x0a]],['SQLite',[0x53,0x51,0x4c,0x69,0x74,0x65,0x20,0x66]],
  ['WebAssembly',[0,0x61,0x73,0x6d]],['ESP image (candidate)',[0xe9]]
];
export function redact(value) {
 return String(value)
  .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}/g,'[مفتاح محجوب]')
  .replace(/\b(?:ghp|github_pat)_[A-Za-z0-9_]{12,}/g,'[مفتاح محجوب]')
  .replace(/((?:password|passwd|secret|api[_-]?key|access[_-]?token|authorization|token)\s*["']?\s*[:=]\s*["']?)([^\s"'&,;}]{3,})/gi,'$1[محجوب]')
  .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi,'$1[محجوب]')
  .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g,'$1[محجوب]@')
  .replace(/([?&][A-Za-z0-9_-]+=)[^\s&#"']+/g,'$1[محجوب]');
}
export function entropy(bytes) {
 if(!bytes.length)return 0;
 const count=new Uint32Array(256); const stride=Math.max(1,Math.floor(bytes.length/2097152));let n=0;
 for(let i=0;i<bytes.length;i+=stride){count[bytes[i]]++;n++;}
 let out=0;for(const v of count)if(v){const p=v/n;out-=p*Math.log2(p);}return Number(out.toFixed(3));
}
function matches(bytes,pattern,offset){return pattern.every((v,i)=>bytes[offset+i]===v);}
function scanSignatures(bytes) {
 const found=[];const end=Math.min(bytes.length,8*1024*1024);
 for(const [label,pattern] of signatures){let n=0;for(let i=0;i<=end-pattern.length;i++){
  if(bytes[i]===pattern[0]&&matches(bytes,pattern,i)){
   // A one-byte ESP marker alone is not meaningful inside arbitrary data.
   if(pattern.length===1&&i!==0)continue;
   found.push({label,offset:i});if(++n===8)break;
  }
 }}
 return found.sort((a,b)=>a.offset-b.offset).slice(0,48);
}
function printableStrings(bytes){
 const out=[];const max=Math.min(bytes.length,4*1024*1024);let start=-1;
 for(let i=0;i<=max;i++){
  const printable=i<max&&bytes[i]>=32&&bytes[i]<=126;
  if(printable&&start<0)start=i;
  if((!printable||i-start>=260)&&start>=0){
   if(i-start>=6)out.push({offset:start,text:redact(textDecoder.decode(bytes.subarray(start,i)))});
   start=printable?i:-1;if(out.length>=100)break;
  }
 }
 return out;
}
function safePath(url){try{const u=new URL(url);return u.origin+u.pathname.replace(/\/[A-Za-z0-9_-]{24,}/g,'/[identifier]');}catch{return '[عنوان غير صالح]';}}
export function inspectHar(text){
 const value=JSON.parse(text);const entries=value?.log?.entries;
 if(!Array.isArray(entries))throw new Error('الملف لا يحتوي على بنية HAR صالحة.');
 if(entries.length>100000)throw new Error('عدد طلبات HAR يتجاوز الحد المحلي.');
 const hosts=new Map();let plain=0,auth=0,cookies=0;
 const requests=entries.slice(0,200).map(item=>{
  const r=item.request||{};let host='غير معروف';try{const u=new URL(r.url);host=u.hostname;if(u.protocol==='http:')plain++;}catch{}
  hosts.set(host,(hosts.get(host)||0)+1);
  const hs=Array.isArray(r.headers)?r.headers:[];
  if(hs.some(h=>String(h.name).toLowerCase()==='authorization'))auth++;
  if(hs.some(h=>String(h.name).toLowerCase()==='cookie'))cookies++;
  return {method:String(r.method||'—').slice(0,16),url:safePath(r.url),status:Number(item.response?.status)||0,milliseconds:Math.max(0,Number(item.time)||0)};
 });
 // Domain totals cover the complete capture, without retaining raw headers or bodies.
 for(const item of entries.slice(200)){try{const h=new URL(item.request?.url).hostname;hosts.set(h,(hosts.get(h)||0)+1);}catch{}}
 return {total:entries.length,requests,hosts:[...hosts].map(([host,count])=>({host,count})),plainHttpInSample:plain,authorizationInSample:auth,cookiesInSample:cookies,sampleLimit:200};
}
export function inspectPcap(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const proto=new Map(),ips=new Map(),ports=new Map();let count=0,capBytes=0,limited=false;const limit=20000;
 function increment(m,k){m.set(k,(m.get(k)||0)+1);}
 function packet(offset,length,linktype){
  if(count>=limit){limited=true;return;}count++;capBytes+=length;
  let p=offset,end=offset+length,type=0;
  if(linktype===1){if(length<14)return;type=view.getUint16(p+12);p+=14;if(type===0x8100||type===0x88a8){if(p+4>end)return;type=view.getUint16(p+2);p+=4;}}
  else if(linktype===101)type=0x0800;
  else if(linktype===113){if(length<16)return;type=view.getUint16(p+14);p+=16;}
  else{increment(proto,`linktype:${linktype}`);return;}
  if(type===0x86dd){increment(proto,'IPv6');return;}if(type===0x0806){increment(proto,'ARP');return;}
  if(type!==0x0800){increment(proto,`EtherType:0x${type.toString(16)}`);return;}
  if(p+20>end||(bytes[p]>>4)!==4){increment(proto,'IPv4 ناقص');return;}
  const ihl=(bytes[p]&15)*4;if(ihl<20||p+ihl>end){increment(proto,'IPv4 ناقص');return;}
  const code=bytes[p+9],name=code===6?'TCP':code===17?'UDP':code===1?'ICMP':`IP:${code}`;
  increment(proto,name);for(const q of [p+12,p+16])increment(ips,Array.from(bytes.subarray(q,q+4)).join('.'));
  const fragment=view.getUint16(p+6)&0x1fff;
  if(!fragment&&(code===6||code===17)&&p+ihl+4<=end){increment(ports,String(view.getUint16(p+ihl)));increment(ports,String(view.getUint16(p+ihl+2)));}
 }
 const first=Array.from(bytes.subarray(0,4)).join(',');
 if(first==='10,13,13,10'){
  let p=0,little=true,links=[];
  while(p<bytes.length){
   if(p+12>bytes.length)throw new Error('كتلة PCAPNG غير مكتملة.');
   const isSection=view.getUint32(p,false)===0x0a0d0d0a;
   if(isSection){if(p+28>bytes.length)throw new Error('رأس PCAPNG غير مكتمل.');const bom=view.getUint32(p+8,false);if(bom===0x4d3c2b1a)little=true;else if(bom===0x1a2b3c4d)little=false;else throw new Error('ترتيب بايتات PCAPNG غير صالح.');links=[];}
   const type=view.getUint32(p,little),len=view.getUint32(p+4,little);
   if(len<12||len%4||p+len>bytes.length||view.getUint32(p+len-4,little)!==len)throw new Error('طول كتلة PCAPNG غير صالح.');
   if(type===1){if(len<20)throw new Error('تعريف واجهة PCAPNG ناقص.');links.push(view.getUint16(p+8,little));}
   if(type===6){if(len<32)throw new Error('كتلة حزمة PCAPNG ناقصة.');const id=view.getUint32(p+8,little),n=view.getUint32(p+20,little);if(links[id]===undefined||n>len-32)throw new Error('بيانات حزمة PCAPNG غير صالحة.');packet(p+28,n,links[id]);}
   if(type===3){if(len<16||!links.length)throw new Error('حزمة PCAPNG بلا واجهة صالحة.');packet(p+12,Math.min(view.getUint32(p+8,little),len-16),links[0]);}
   p+=len;if(limited)break;
  }
 }else{
  const little=first==='212,195,178,161'||first==='77,60,178,161';
  const valid=little||first==='161,178,195,212'||first==='161,178,60,77';
  if(!valid||bytes.length<24)throw new Error('رأس PCAP غير صالح أو غير مكتمل.');
  const link=view.getUint32(20,little)&0xffff;let p=24;
  while(p<bytes.length){if(p+16>bytes.length)throw new Error('رأس حزمة PCAP غير مكتمل.');const n=view.getUint32(p+8,little);if(n>bytes.length-p-16)throw new Error('بيانات حزمة PCAP غير مكتملة.');packet(p+16,n,link);p+=16+n;if(limited)break;}
 }
 const list=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,100).map(([name,count])=>({name,count}));
 return {packetCount:count,capturedBytes:capBytes,protocols:list(proto),endpoints:list(ips),ports:list(ports),limited,limit,note:'تُقرأ الحزم المحفوظة فقط. لا يفك هذا التحليل تشفير TLS أو البلوتوث ولا يلتقط حركة حية.'};
}
export function inspectZip(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(v.getUint32(p,true)===0x06054b50){eocd=p;break;}
 if(eocd<0)throw new Error('فهرس ZIP غير موجود. قد يكون الملف ناقصًا أو ZIP64.');
 const n=v.getUint16(eocd+10,true),off=v.getUint32(eocd+16,true),size=v.getUint32(eocd+12,true);
 if(n===65535||off===0xffffffff)throw new Error('ZIP64 يحتاج محللًا محليًا متخصصًا.');
 if(off+size>eocd)throw new Error('فهرس ZIP يتجاوز حدود الملف.');
 let p=off;const entries=[];let traversal=0;
 for(let i=0;i<n;i++){
  if(p+46>eocd||v.getUint32(p,true)!==0x02014b50)throw new Error('مدخل ZIP غير صالح.');
  const nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),next=p+46+nl+el+cl;
  if(next>eocd)throw new Error('اسم ملف ZIP يتجاوز حدود الفهرس.');
  const name=textDecoder.decode(bytes.subarray(p+46,p+46+nl));
  const unsafe=name.split(/[\\/]/).includes('..')||/^(?:[\\/]|[A-Za-z]:)/.test(name);if(unsafe)traversal++;
  if(i<200)entries.push({name:redact(name),size:v.getUint32(p+24,true),compressed:v.getUint32(p+20,true),unsafe});p=next;
 }
 return {total:n,entries,traversal,isApk:entries.some(e=>e.name==='AndroidManifest.xml')||entries.some(e=>/^classes\d*\.dex$/.test(e.name)),note:'قراءة الفهرس فقط؛ لم يُفك الضغط ولم تُنفذ الملفات. لا تُستعاد الشيفرة الأصلية من هذا الفهرس.'};
}
export async function analyzeBytes(bytes,filename='artifact.bin'){
 if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
 if(bytes.length>MAX_FILE_SIZE)throw new Error('حجم الملف يتجاوز ٦٤ ميغابايت. استخدم أداة متخصصة للملفات الأكبر.');
 if(!bytes.length)throw new Error('الملف فارغ. اختر ملفًا يحتوي على بيانات.');
 if(!globalThis.crypto?.subtle)throw new Error('حساب البصمة يحتاج HTTPS أو النسخة المحلية على localhost.');
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const sha256=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 const found=scanSignatures(bytes);const ent=entropy(bytes);const strings=printableStrings(bytes);
 const result={schema:1,id:crypto.randomUUID(),filename:String(filename).slice(0,240),size:bytes.length,sha256,created:new Date().toISOString(),engine:'تحليل محلي داخل المتصفح',format:found.find(x=>x.offset===0)?.label||'بيانات غير مصنّفة',entropy:ent,signatures:found,strings,indicators:[],limitations:['الفحص وصف أولي للملف؛ لا يثبت خلوه من الثغرات أو البرمجيات الضارة.','توقيعات المحتوى تغطي أول ٨ ميغابايت، والنصوص أول ٤ ميغابايت بحد أقصى ١٠٠ نتيجة.','أُخفيت أنماط شائعة للمفاتيح وكلمات المرور؛ راجع التقرير قبل مشاركته.']};
 const first=Array.from(bytes.subarray(0,4)).join(',');
 const pcap=['212,195,178,161','161,178,195,212','77,60,178,161','161,178,60,77','10,13,13,10'].includes(first);
 if(pcap){result.network=inspectPcap(bytes);result.format=first==='10,13,13,10'?'PCAPNG':'PCAP';result.summary=`قُرئت ${result.network.packetCount} حزمة من الالتقاط المحفوظ${result.network.limited?' ضمن حد العينة':''}.`;}
 else if(/\.har$/i.test(filename)){
  result.har=inspectHar(textDecoder.decode(bytes));result.format='HAR';result.strings=[];result.summary=`ملف HAR يحتوي على ${result.har.total} طلب. لم تُدرج قيم الترويسات أو أجسام الطلبات في التقرير.`;
  if(result.har.plainHttpInSample)result.indicators.push({title:'طلبات HTTP غير مشفرة في العينة',detail:`عددها ${result.har.plainHttpInSample}. تحقق من طبيعة البيانات والوجهة قبل تصنيفها كثغرة.`,kind:'review'});
 }
 else if(bytes[0]===0x50&&bytes[1]===0x4b){result.archive=inspectZip(bytes);result.format=result.archive.isApk?'Android APK':'ZIP';result.summary=`قُرئ فهرس ${result.archive.total} ملف داخل الأرشيف من دون استخراجه.`;if(result.archive.traversal)result.indicators.push({title:'مسارات غير آمنة داخل الأرشيف',detail:`رُصدت ${result.archive.traversal} أسماء ذات مسار مطلق أو انتقال إلى مجلد أعلى. لم يتم استخراجها.`,kind:'review'});}
 else result.summary=`حُسبت بصمة الملف وفُحصت التوقيعات والنصوص. النوع المقترح: ${result.format}.`;
 if(!pcap&&!result.har){
  if(ent>7.5)result.indicators.push({title:'عشوائية مرتفعة في المحتوى',detail:'قد تشير إلى ضغط أو تشفير أو بيانات ثنائية كثيفة؛ ليست دليلًا مستقلًا على وجود ثغرة.',kind:'info'});
  const embedded=found.filter(s=>s.offset>0&&!/^PCAP/.test(s.label));if(embedded.length)result.indicators.push({title:'توقيعات مضمّنة تحتاج تحققًا',detail:`عُثر على ${embedded.length} تطابقًا داخل الملف. قد تكون بعض التطابقات عرضية.`,kind:'review'});
  if(strings.some(s=>/password|passwd|api[_-]?key|token|secret/i.test(s.text)))result.indicators.push({title:'نصوص ذات أسماء حساسة',detail:'ظهرت تسميات مرتبطة بكلمات مرور أو رموز وصول. وجود التسمية لا يثبت تسرب سر؛ القيم المطابقة للأنماط الشائعة محجوبة.',kind:'review'});
 }
 if(/\.(?:js|mjs|cjs|ts|tsx|jsx|py|php|html)$/i.test(filename)){
  const content=textDecoder.decode(bytes.subarray(0,4*1024*1024));const lines=content.split('\n');const candidates=[];
  const patterns=[[/\beval\s*\(/,'تنفيذ ديناميكي محتمل'],[/\.innerHTML\s*=/,'كتابة HTML تحتاج مراجعة مصدر البيانات'],[/\bsubprocess\.(?:run|Popen).*shell\s*=\s*True/,'تشغيل عبر shell يحتاج مراجعة المدخلات'],[/Access-Control-Allow-Origin[^\n]*\*/i,'سياسة CORS واسعة تحتاج مراجعة']];
  lines.forEach((line,i)=>{for(const [re,title]of patterns)if(re.test(line)&&candidates.length<50)candidates.push({line:i+1,title,snippet:redact(line.slice(0,220))});});
  result.code={candidates,note:'هذه مطابقة نصية محدودة، وليست بديلًا عن CodeQL أو Semgrep أو مراجعة السياق.'};result.format='نص برمجي';
 }
 return result;
}
export function reportMarkdown(result){
 const r=result;const safe=x=>String(x).replace(/[\r\n]/g,' ');
 return [`# تقرير مِسبار`, ``, `الملف: ${safe(r.filename)}`,`التاريخ: ${r.created}`,`النوع: ${r.format}`,`الحجم: ${r.size} بايت`,`SHA-256: ${r.sha256}`,``, `## المشاهدات`,r.summary,``,`## مؤشرات تحتاج مراجعة`,...r.indicators.map(i=>`- ${i.title}: ${i.detail}`),r.indicators.length?'':'لم تُرصد مؤشرات ضمن قواعد هذا الفحص المحدود.',``,`## بيانات التحليل`,`\`\`\`json`,JSON.stringify({network:r.network,har:r.har,archive:r.archive,code:r.code,signatures:r.signatures,localTools:r.localTools},null,2),'\`\`\`',``,`## حدود النتيجة`,...r.limitations.map(s=>`- ${s}`)].join('\n');
}
