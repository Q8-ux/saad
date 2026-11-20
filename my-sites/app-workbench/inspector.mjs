// Bounded structural inspection. File contents are never executed.
export const LIMITS = Object.freeze({ file: 100 * 1024 * 1024, entries: 25000, expanded: 512 * 1024 * 1024, entry: 48 * 1024 * 1024, scan: 96 * 1024 * 1024 });
const decoder = new TextDecoder('utf-8', { fatal: false });
function ensure(condition, message) { if (!condition) throw new Error(message); }
function span(view, at, size) { ensure(Number.isSafeInteger(at) && at >= 0 && size >= 0 && at + size <= view.byteLength, 'الملف ناقص أو يحتوي على إزاحات غير صالحة.'); }
function u16(view, at) { span(view, at, 2); return view.getUint16(at, true); }
function u32(view, at) { span(view, at, 4); return view.getUint32(at, true); }
function safePath(name) { return name && !name.startsWith('/') && !/^[A-Za-z]:/.test(name) && !name.includes('\\') && !name.includes('\0') && !name.split('/').includes('..') && !name.split('/').includes('.'); }

export function zipInventory(buffer) {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  let end = -1;
  for (let at = buffer.byteLength - 22; at >= Math.max(0, buffer.byteLength - 65557); at--) {
    if (u32(view, at) === 0x06054b50 && at + 22 + u16(view, at + 20) === buffer.byteLength) { end = at; break; }
  }
  ensure(end >= 0, 'لم أعثر على فهرس ZIP سليم داخل الملف.');
  ensure(u16(view, end + 4) === 0 && u16(view, end + 6) === 0, 'الأرشيف المقسم إلى أجزاء غير مدعوم.');
  const count = u16(view, end + 10), directorySize = u32(view, end + 12), start = u32(view, end + 16);
  ensure(count !== 65535 && start !== 0xffffffff && directorySize !== 0xffffffff, 'أرشيف ZIP64 يحتاج أداة فحص خارجية.');
  ensure(count === u16(view, end + 8) && count <= LIMITS.entries, 'عدد الملفات يتجاوز حد الفحص أو الفهرس غير متسق.');
  span(view, start, directorySize);
  ensure(start + directorySize === end, 'فهرس الأرشيف غير متسق مع نهاية الملف.');
  const files = [], names = new Set(); let at = start, expanded = 0;
  for (let index = 0; index < count; index++) {
    span(view, at, 46); ensure(u32(view, at) === 0x02014b50, 'سجل ملف غير صالح داخل الأرشيف.');
    const flags = u16(view, at + 8), method = u16(view, at + 10), compressed = u32(view, at + 20), size = u32(view, at + 24);
    const nameLength = u16(view, at + 28), extra = u16(view, at + 30), comment = u16(view, at + 32), local = u32(view, at + 42);
    span(view, at + 46, nameLength + extra + comment);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    ensure(safePath(name), 'الأرشيف يحتوي على مسار غير آمن؛ أوقفت الفحص.');
    ensure(!names.has(name), 'الأرشيف يحتوي على أسماء ملفات مكررة؛ أوقفت الفحص.');
    ensure(!(flags & 1), 'الأرشيف مشفر ولا يمكن فحصه هنا.');
    ensure(method === 0 || method === 8, 'طريقة ضغط غير مدعومة.');
    ensure(compressed !== 0xffffffff && size !== 0xffffffff, 'أحد الملفات يستخدم ZIP64 غير المدعوم.');
    ensure(u16(view, at + 34) === 0, 'أرشيف متعدد الأقراص غير مدعوم.');
    span(view, local, 30); ensure(u32(view, local) === 0x04034b50 && local < start, 'رأس الملف الداخلي غير صالح.');
    ensure(u16(view, local + 6) === flags && u16(view, local + 8) === method, 'بيانات ضغط الملف الداخلي غير متسقة.');
    if(!(flags & 8)) ensure(u32(view,local+18)===compressed && u32(view,local+22)===size && u32(view,local+14)===u32(view,at+16),'أحجام الملف الداخلية لا تطابق الفهرس.');
    const localNameLength = u16(view, local + 26), localExtraLength = u16(view, local + 28);
    span(view, local + 30, localNameLength + localExtraLength);
    ensure(decoder.decode(bytes.subarray(local + 30, local + 30 + localNameLength)) === name, 'اسم الملف الداخلي لا يطابق الفهرس.');
    const data = local + 30 + localNameLength + localExtraLength;
    ensure(data + compressed <= start, 'بيانات ملف داخلي تتجاوز حدود الأرشيف.');
    if (method === 0) ensure(compressed === size, 'حجم الملف غير المضغوط غير متسق.');
    expanded += size;
    ensure(expanded <= LIMITS.expanded && size <= LIMITS.expanded, 'حجم البيانات بعد فك الضغط يتجاوز الحد الآمن.');
    ensure(size < 1024 * 1024 || size / Math.max(1, compressed) <= 500, 'نسبة ضغط مرتفعة جدًا؛ أوقفت الفحص لحماية ذاكرة الجهاز.');
    names.add(name); files.push({ name, size, compressed, method, data, crc: u32(view, at + 16) });
    at += 46 + nameLength + extra + comment;
  }
  ensure(at === start + directorySize, 'طول الفهرس لا يطابق عدد السجلات.');
  const occupied = files.map(f => [f.data, f.data + f.compressed]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<occupied.length;i++) ensure(occupied[i][0] >= occupied[i-1][1], 'بيانات ملفات متداخلة؛ أوقفت الفحص.');
  return { files, expanded, directoryOffset: start };
}

export function dexSummary(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  ensure(bytes.length >= 112 && decoder.decode(bytes.subarray(0,4)) === 'dex\n' && bytes[7] === 0, 'ملف DEX غير مدعوم أو غير صالح.');
  const version = decoder.decode(bytes.subarray(4,7));
  ensure(['035','037','038','039','040'].includes(version), 'إصدار DEX غير مدعوم بهذا الفاحص.');
  ensure(u32(view, 32) === bytes.length && u32(view, 36) === 112 && u32(view, 40) === 0x12345678, 'رأس DEX أو حجمه غير متسق.');
  const stringCount=u32(view,56), stringsOffset=u32(view,60), methodCount=u32(view,88), classCount=u32(view,96);
  span(view, stringsOffset, stringCount*4); span(view,u32(view,92),methodCount*8); span(view,u32(view,100),classCount*32);
  let inspected=0; const signals=new Set(); const terms=/billingclient|inappbilling|purchase[_-]?buy|isPremium|isPro\b|premium|subscription|playintegrity|firebase|https?:\/\//i;
  for(let index=0; index<Math.min(stringCount,120000); index++) {
    let at=u32(view,stringsOffset+index*4); span(view,at,1);
    let lengthBytes=0, next;
    do { span(view,at,1); next=bytes[at++]; lengthBytes++; ensure(lengthBytes<=5,'ترميز سلسلة DEX غير صالح.'); } while(next & 128);
    const stop=Math.min(bytes.length,at+4096); let finish=at;
    while(finish<stop && bytes[finish]!==0) finish++;
    if(finish===stop) continue;
    const value=decoder.decode(bytes.subarray(at,finish)); inspected++;
    if(terms.test(value) && signals.size<30) {
      let label = /billingclient|inappbilling/i.test(value) ? 'Google Play Billing' : /playintegrity/i.test(value) ? 'Play Integrity' : /firebase/i.test(value) ? 'Firebase' : /^https?:/i.test(value) ? 'رابط شبكة' : /purchase[_-]?buy/i.test(value) ? 'purchase_buy' : /isPremium|isPro\b/i.test(value) ? 'فحص ميزة محلية محتمل' : /subscription/i.test(value) ? 'مصطلح اشتراك' : 'مصطلح Premium';
      signals.add(label);
    }
  }
  return { version, stringCount, inspectedStrings: inspected, methodCount, classCount, signals:[...signals] };
}

export function peSummary(buffer) {
  const view=new DataView(buffer), bytes=new Uint8Array(buffer);
  ensure(buffer.byteLength>=64 && u16(view,0)===0x5a4d,'ليس ملف Windows PE صالحًا.');
  const at=u32(view,60); ensure(at>=64,'موضع رأس PE غير صالح.');
  span(view,at,24); ensure(u32(view,at)===0x00004550,'توقيع PE غير موجود.');
  const machine=u16(view,at+4), count=u16(view,at+6), optionalSize=u16(view,at+20), optional=at+24;
  ensure(count>0 && count<=96,'عدد أقسام PE غير مدعوم.'); span(view,optional,optionalSize);
  const magic=u16(view,optional), is64=magic===0x20b;
  ensure(magic===0x10b || is64,'نوع رأس PE غير مدعوم.');
  const directoryStart=is64?112:96, countOffset=is64?108:92;
  ensure(optionalSize>=directoryStart,'رأس PE ناقص.');
  const directories=Math.min(u32(view,optional+countOffset),Math.floor((optionalSize-directoryStart)/8));
  const directory=(index)=>index<directories?{address:u32(view,optional+directoryStart+index*8),size:u32(view,optional+directoryStart+index*8+4)}:{address:0,size:0};
  const certificate=directory(4), clr=directory(14), sections=[]; const sectionStart=optional+optionalSize;
  span(view,sectionStart,count*40);
  for(let index=0;index<count;index++) {
    const pos=sectionStart+index*40, size=u32(view,pos+16), offset=u32(view,pos+20);
    if(size) span(view,offset,size);
    sections.push({name:decoder.decode(bytes.subarray(pos,pos+8)).replace(/\0.*$/s,''),size});
  }
  if(certificate.size) span(view,certificate.address,certificate.size);
  const architecture=({0x014c:'x86',0x8664:'x64',0xaa64:'ARM64',0x01c4:'ARM'})[machine] || `0x${machine.toString(16)}`;
  return {architecture,format:is64?'PE32+':'PE32',sectionCount:count,sections,dotNet:!!(clr.address&&clr.size),certificateTable:!!(certificate.address&&certificate.size)};
}

export async function inspect(buffer, name, readEntry) {
  ensure(buffer instanceof ArrayBuffer && buffer.byteLength>0,'اختر ملفًا غير فارغ.');
  ensure(buffer.byteLength<=LIMITS.file,'حجم الملف يتجاوز 100 ميغابايت.');
  const extension=(name.split('.').pop()||'').toLowerCase(), bytes=new Uint8Array(buffer), base={name,size:buffer.byteLength,checks:[],notes:[],files:[],signals:[],dex:[]};
  if(['exe','dll'].includes(extension)) {
    const pe=peSummary(buffer);
    return {...base,kind:'windows',label:'برنامج Windows',pe,checks:[{label:'بنية الملف',value:`${pe.format} · ${pe.architecture}`},{label:'بيئة التنفيذ',value:pe.dotNet?'.NET — مؤشر من رأس الملف':'كود أصلي أو بيئة أخرى'},{label:'الأقسام',value:String(pe.sectionCount)},{label:'جدول شهادة',value:pe.certificateTable?'موجود — التوقيع غير متحقق':'غير ظاهر في الرأس'}],notes:['لم يتم تشغيل البرنامج أو تغيير محتواه.','بنية PE لا تحدد طريقة التحقق من الترخيص؛ يلزم تحليل الكود المستهدف.','توقيع الملف وصحته الأمنية لم يُتحقق منهما.']};
  }
  ensure(['apk','msix','appx'].includes(extension),'الأنواع المدعومة: APK وEXE وDLL وMSIX وAPPX.');
  const archive=zipInventory(buffer), names=archive.files.map(f=>f.name); base.files=archive.files.map(({name,size})=>({name,size})); base.expanded=archive.expanded;
  if(extension!=='apk') {
    ensure(names.some(n=>/^AppxManifest\.xml$/i.test(n)),'الحزمة لا تحتوي على بيان Windows المعتاد.');
    return {...base,kind:'windows-package',label:'حزمة Windows',checks:[{label:'الملفات',value:String(names.length)},{label:'بيان الحزمة',value:'AppxManifest.xml'},{label:'ملف التوقيع',value:names.some(n=>/^AppxSignature\.p7x$/i.test(n))?'موجود — غير متحقق':'غير ظاهر'}],notes:['جرد للحزمة فقط؛ لا تثبيت أو تعديل أو تحقق من الترخيص.']};
  }
  ensure(names.includes('AndroidManifest.xml'),'الأرشيف ليس APK معتادًا؛ بيان Android غير موجود.');
  const dex=archive.files.filter(f=>/^classes(?:\d+)?\.dex$/.test(f.name));
  const architectures=[...new Set(names.map(n=>/^lib\/([^/]+)\//.exec(n)?.[1]).filter(Boolean))];
  const signatures=names.filter(n=>/^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(n));
  base.notes.push('هذه مؤشرات بنيوية؛ لا تثبت وجود بوابة دفع قابلة للتعديل أو نجاح أي فتح.','لم يُفكك الكود إلى Smali، ولم يُعد بناء الحزمة أو توقيعها أو تثبيتها.','وجود مصطلح اشتراك أو رابط شبكة لا يحدد إن كان قرار الاشتراك محليًا أو على الخادم.');
  let scanned=0;
  for(const file of dex) {
    if(!readEntry || file.size>LIMITS.entry || scanned+file.size>LIMITS.scan) {base.notes.push(`لم تُقرأ محتويات ${file.name} بسبب حدود الذاكرة؛ يظهر في الجرد فقط.`);continue;}
    try { const content=await readEntry(file.name,file.size); ensure(content.byteLength===file.size,'الحجم الداخلي لا يطابق الفهرس.'); const item=dexSummary(content); base.dex.push({name:file.name,...item}); scanned+=file.size; } catch(error) {base.notes.push(`${file.name}: ${error.message}`);}
  }
  base.signals=[...new Set(base.dex.flatMap(d=>d.signals))];
  return {...base,kind:'android',label:'تطبيق Android',checks:[{label:'ملفات الحزمة',value:String(names.length)},{label:'ملفات DEX',value:String(dex.length)},{label:'المعماريات',value:architectures.join(' / ')||'غير ظاهرة'},{label:'آثار توقيع v1',value:signatures.length?'موجودة — غير متحققة':'غير ظاهرة؛ قد يوجد توقيع v2 أو v3'}]};
}

export const sampleCodes = Object.freeze({
  android: (enabled) => `.class public Ldemo/FeatureGate;\n.super Ljava/lang/Object;\n\n.method public static isFeatureEnabled()Z\n    .registers 1\n    const/4 v0, ${enabled?'0x1':'0x0'}\n    return v0\n.end method\n`,
  windows: (enabled) => `// Synthetic example for your own source project.\npublic static class FeatureGate\n{\n    public static bool IsFeatureEnabled()\n    {\n        return ${enabled?'true':'false'};\n    }\n}\n`
});
export function demoDecision({localFlag,serverCheck}) { return {allowed:serverCheck?false:!!localFlag,reason:serverCheck?'الرد التجريبي من الخادم لم يمنح الميزة. تعديل القيمة المحلية لا يغيّر هذا الرد.':localFlag?'الميزة أصبحت متاحة داخل النموذج المحلي.':'الميزة غير متاحة داخل النموذج المحلي.'}; }
