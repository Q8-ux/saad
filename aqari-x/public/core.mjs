import { translations } from './locales-dictionary.mjs?v=1.4.0';
export const CATEGORIES = ["للبيع", "للإيجار", "للبدل"];
export const TYPES = [
  "شقة",
  "فيلا",
  "بيت",
  "أرض",
  "عمارة",
  "مكتب",
  "محل",
  "شاليه",
  "مزرعة",
  "مخزن",
];
export const GOVERNORATES = {
  العاصمة: [
    "مدينة الكويت",
    "دسمان",
    "شرق",
    "القبلة",
    "المرقاب",
    "بنيد القار",
    "الدسمة",
    "الدعية",
    "المنصورية",
    "ضاحية عبدالله السالم",
    "النزهة",
    "الفيحاء",
    "الشامية",
    "الروضة",
    "العديلية",
    "الخالدية",
    "كيفان",
    "القادسية",
    "قرطبة",
    "السرة",
    "اليرموك",
    "الشويخ",
    "الري",
    "الدوحة",
    "الصليبخات",
    "شمال غرب الصليبخات",
    "جابر الأحمد",
    "القيروان",
    "النهضة",
  ],
  حولي: [
    "حولي",
    "السالمية",
    "الرميثية",
    "الجابرية",
    "سلوى",
    "البدع",
    "مشرف",
    "بيان",
    "جنوب السرة",
    "الزهراء",
    "حطين",
    "السلام",
    "الشهداء",
    "الصديق",
    "مبارك العبدالله",
  ],
  الفروانية: [
    "الفروانية",
    "خيطان",
    "الأبرق",
    "العمرية",
    "الرابية",
    "الرحاب",
    "إشبيلية",
    "الأندلس",
    "العارضية",
    "الفردوس",
    "صباح الناصر",
    "عبدالله المبارك",
    "غرب عبدالله المبارك",
    "جنوب عبدالله المبارك",
    "جليب الشيوخ",
    "الرقعي",
    "الضجيج",
  ],
  الأحمدي: [
    "الأحمدي",
    "الفنطاس",
    "الفحيحيل",
    "المنقف",
    "المهبولة",
    "أبو حليفة",
    "الرقة",
    "هدية",
    "الصباحية",
    "الظهر",
    "العقيلة",
    "فهد الأحمد",
    "جابر العلي",
    "صباح الأحمد",
    "جنوب صباح الأحمد",
    "الخيران",
    "الوفرة",
    "علي صباح السالم",
    "ميناء عبدالله",
    "الزور",
    "بنيدر",
    "الجليعة",
    "الضباعية",
  ],
  "مبارك الكبير": [
    "مبارك الكبير",
    "القصور",
    "العدان",
    "القرين",
    "أبو فطيرة",
    "الفنيطيس",
    "المسايل",
    "صباح السالم",
    "المسيلة",
    "أبو الحصانية",
    "صبحان",
  ],
  الجهراء: [
    "الجهراء",
    "تيماء",
    "النسيم",
    "العيون",
    "الواحة",
    "القصر",
    "النعيم",
    "سعد العبدالله",
    "جنوب سعد العبدالله",
    "المطلاع",
    "الصليبية",
    "كبد",
    "العبدلي",
    "السالمي",
    "أمغرة",
  ],
};
export const AREAS = Object.entries(GOVERNORATES).flatMap(
  ([governorate, areas]) => areas.map((area) => ({ area, governorate })),
);
export const numberText = (value) =>
  String(value ?? "")
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/٬|,/g, "")
    .replace(/٫/g, ".");
export const norm = (value) =>
  numberText(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const inputError = (message) =>
  Object.assign(new Error(message), { status: 400 });
export function parseMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const s = numberText(value).trim();
  if (!/^\d{1,11}(\.\d{1,3})?$/.test(s))
    throw inputError("أدخل مبلغاً صحيحاً بالدينار حتى ثلاثة أرقام عشرية");
  const [whole, decimal = ""] = s.split(".");
  const fils = Number(whole) * 1000 + Number(decimal.padEnd(3, "0"));
  if (!Number.isSafeInteger(fils) || fils > 1000000000000)
    throw inputError("المبلغ خارج النطاق");
  return fils;
}
export const money = (fils) =>
  fils === null || fils === undefined
    ? "للاتفاق"
    : `${new Intl.NumberFormat("en-KW", { maximumFractionDigits: 3 }).format(Number(fils) / 1000)} د.ك`;
export function commissionFils(finalPriceFils, mode, value) {
  if (mode === "fixed") return parseMoney(value) ?? 0;
  const rate = Number(numberText(value));
  if (!Number.isFinite(rate) || rate < 0 || rate > 10)
    throw inputError("نسبة العمولة بين صفر و10% حسب الاتفاق");
  if (!Number.isSafeInteger(finalPriceFils) || finalPriceFils < 0)
    throw inputError("قيمة الصفقة مطلوبة");
  return Math.round((finalPriceFils * rate) / 100);
}
let searchAliases;
export function normalizeSpokenNumbers(query='') {
  const units={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
    'ایک':1,'دو':2,'تین':3,'چار':4,'پانچ':5,'چھ':6,'سات':7,'آٹھ':8,'نو':9,'دس':10,'بیس':20,'تیس':30,'چالیس':40,'پچاس':50,'ساٹھ':60,'ستر':70,'اسی':80,'نوے':90,
    'واحد':1,'اثنين':2,'ثلاث':3,'ثلاثة':3,'اربع':4,'اربعة':4,'خمس':5,'خمسة':5,'ستة':6,'سبعة':7,'ثمانية':8,'تسعة':9,'عشرة':10,'عشرين':20,'ثلاثين':30,'اربعين':40,'خمسين':50,'ستين':60,'سبعين':70,'ثمانين':80,'تسعين':90,
    'مائتان':200,'مئتان':200,'ثلاثمائة':300,'ثلاثمئة':300,'اربعمائة':400,'اربعمئة':400,'خمسمائة':500,'خمسمئة':500,'ستمائة':600,'ستمئة':600,'سبعمائة':700,'سبعمئة':700,'ثمانمائة':800,'ثمانمئة':800,'تسعمائة':900,'تسعمئة':900};
  const values=new Map(Object.entries(units).map(([word,value])=>[norm(word),value]));
  const scales=new Map(Object.entries({hundred:100,thousand:1000,million:1000000,'سو':100,'ہزار':1000,'لاکھ':100000,'کروڑ':10000000,'مئة':100,'مائة':100,'الف':1000,'مليون':1000000}).map(([word,value])=>[norm(word),value]));
  const escape=word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const starters=[...values.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|');
  const continuation=[...values.keys(),...scales.keys(),'and','و','اور'].sort((a,b)=>b.length-a.length).map(escape).join('|');
  const phrase=new RegExp(`(?<![\\p{L}\\p{N}])(?:${starters})(?:\\s+(?:${continuation}))*(?![\\p{L}\\p{N}])`,'gu');
  let text=norm(query).replace(phrase,source=>{
    let total=0,group=0;
    for(const word of source.split(/\s+/)){
      if(values.has(word))group+=values.get(word);
      else if(scales.has(word)){const scale=scales.get(word);if(scale===100)group=(group||1)*scale;else{total+=(group||1)*scale;group=0;}}
    }
    return String(total+group);
  });
  text=text.replace(/(\d+(?:\.\d+)?)\s*(?:hundred|سو|مئه|مائه)(?![\p{L}\p{N}])/gu,(_,number)=>String(Number(number)*100));
  return text;
}
export function multilingualQuery(query='') {
  if(!searchAliases){
    const aliases=new Map();
    const add=(target,words)=>words.filter(Boolean).forEach(word=>aliases.set(norm(word),target));
    for(const source of [...CATEGORIES,...TYPES,...AREAS.map(x=>x.area),...Object.keys(GOVERNORATES),...FEATURE_OPTIONS])
      add(source,Object.values(translations[source]||{}));
    add('شقة',['apartment','apartments','flat','flats','فلیٹ','اپارٹمنٹ']);
    add('بيت',['house','houses','home','گھر','مکان']);add('فيلا',['villa','villas','ولا']);add('أرض',['land','plot','plots','پلاٹ','زمین']);
    add('عمارة',['building','buildings','عمارت']);add('مكتب',['office','offices','دفتر']);add('محل',['shop','shops','دکان']);
    add('للايجار',['rent','rental','for rent','to rent','کرایہ','کرائے پر','کرایے پر']);
    add('للبيع',['for sale','buy','sale','خریدنا','خریدنے','فروخت','برائے فروخت']);
    add('للبدل',['swap','exchange','تبادلہ','بدلے']);
    add('بحدود',['under','up to','maximum','max','budget','within','سے کم','تک','بجٹ','زیادہ سے زیادہ']);
    add('غرف',['bedrooms','bedroom','beds','bed','rooms','room','کمرے','کمروں','کمرہ']);
    add('3',['three','تین']);add('2',['two','دو']);add('4',['four','چار']);add('5',['five','پانچ']);
    add('الف',['thousand','ہزار']);add('مليون',['million','ملین']);
    add('الجابرية',['jabriya','jabriya area','jabriyah','al jabriya']);add('العمرية',['omariya','omariyah','umariya']);add('الفنطاس',['fintas']);add('المطلاع',['mutlaa','al mutlaa','mutla','مطلاع']);
    add('السالمية',['salmiya','salmiyah']);
    add('',['i am looking for','looking for','i need','i want','show me','please','find me','find','a','an','the','in','at','for','with','and','kwd','kd','monthly','per month','مجھے','چاہیے','درکار','براہ کرم','میں','کے لیے','کیلئے','والا','والی','کا','کی','کے','اور','دکھائیں','تلاش','دینار','ماہانہ']);
    searchAliases=[...aliases].filter(([word])=>word).sort((a,b)=>b[0].length-a[0].length).map(([word,target])=>[new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}\\p{N}])`,'gu'),target]);
  }
  let text=normalizeSpokenNumbers(query).replace(/(\d+(?:\.\d+)?)\s*k\b/g,'$1 الف');
  for(const [pattern,target] of searchAliases)text=text.replace(pattern,` ${target} `);
  return norm(text);
}
export function parseIntent(query = "") {
  let q = multilingualQuery(query).replace(/(\d+(?:\.\d+)?(?:\s+(?:الف|مليون))?)\s+بحدود/g,'بحدود $1');
  const found = {};
  const chips = [];
  const remove = (text) => {
    q = q.replace(norm(text), " ");
  };
  if (/(?:ايجار|للايجار|تاجير|استاجر)/.test(q)) {
    found.category = "للإيجار";
    q = q.replace(/(?:للايجار|ايجار|تاجير|استاجر)/g, " ");
    chips.push("للإيجار");
  } else if (/(?:للبيع|للشراء|اشتري|شراء)/.test(q)) {
    found.category = "للبيع";
    q = q.replace(/(?:للبيع|للشراء|اشتري|شراء)/g, " ");
    chips.push("للبيع");
  } else if (/(?:للبدل|تبادل|ابادل)/.test(q)) {
    found.category = "للبدل";
    q = q.replace(/(?:للبدل|تبادل|ابادل)/g, " ");
    chips.push("للبدل");
  }
  const aliases = {
    شقة: ["شقه", "شقق"],
    فيلا: ["فيلا", "فلل"],
    بيت: ["بيت", "بيوت"],
    أرض: ["ارض", "اراضي", "قسيمه"],
    عمارة: ["عماره", "عمارات"],
    محل: ["محل"],
    مكتب: ["مكتب"],
    شاليه: ["شاليه"],
    مزرعة: ["مزرعه"],
    مخزن: ["مخزن"],
  };
  for (const [type, words] of Object.entries(aliases)) {
    const hit = words.find((w) => new RegExp(`(^|\\s)${w}(?=\\s|$)`).test(q));
    if (hit) {
      found.type = type;
      remove(hit);
      chips.push(type);
      break;
    }
  }
  const area = AREAS.slice()
    .sort((a, b) => b.area.length - a.area.length)
    .find((a) => q.includes(norm(a.area)));
  if (area) {
    found.area = area.area;
    q = q.replace(norm(area.area), " ");
    chips.push(area.area);
  }
  let budget = q.match(
    /(?:حدود|بحدود|ميزانيه|بميزانيه|اقل من|حتي|لحد|ما يتعدي|سقف|بحد اقصي)\s*(\d+(?:\.\d+)?)\s*(الف|الاف|مليون)?/,
  );
  if (budget) {
    found.maxPrice =
      Number(budget[1]) *
      (budget[2] === "مليون" ? 1000000 : budget[2] ? 1000 : 1);
    q = q.replace(budget[0], " ");
    chips.push(`حتى ${money(Math.round(found.maxPrice * 1000))}`);
  }
  q = q
    .replace(/ثلاث(?:ه)?\s+غرف/g, "3 غرف")
    .replace(/اربع(?:ه)?\s+غرف/g, "4 غرف")
    .replace(/خمس(?:ه)?\s+غرف/g, "5 غرف")
    .replace(/غرفتين/g, "2 غرف");
  const bed = q.match(/(\d{1,2})\s*(?:غرف|غرفه)/);
  if (bed) {
    found.bedrooms = Number(bed[1]);
    q = q.replace(bed[0], " ");
    chips.push(`${found.bedrooms} غرف فأكثر`);
  }
  q = q.replace(
    /(?:^|\s)(?:ابي|اريد|ابحث|عن|عندي|عندك|في|ب|و|الى|دك|دينار|بالشهر|شهري|شهريا|من|عقار|عقارات|فقط|مع)(?=\s|$)/g,
    " ",
  );
  if (area) q = q.replace(/\bب\b/g, " ");
  found.text = q.replace(/\s+/g, " ").trim();
  return { filters: found, chips };
}
export function searchProperties(properties, filters = {}) {
  const intent = parseIntent(filters.q || "");
  const f = {
    ...intent.filters,
    ...Object.fromEntries(
      Object.entries(filters).filter(
        ([k, v]) => v !== "" && v !== null && v !== undefined,
      ),
    ),
  };
  for (const key of ["minPrice", "maxPrice", "minArea", "maxArea", "bedrooms", "bathrooms"])
    if (f[key] !== undefined && f[key] !== "") {
      const n = Number(numberText(f[key]));
      if (!Number.isFinite(n) || n < 0) return { properties: [], intent };
      f[key] = n;
    }
  const words = (intent.filters.text || "").split(" ").filter(Boolean);
  const filtered = properties.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.type && p.type !== f.type) return false;
    if (f.priceBasis && p.priceBasis !== f.priceBasis) return false;
    if (f.bathrooms && (!p.bathrooms || p.bathrooms < Number(f.bathrooms))) return false;
    if (f.media === 'photos' && !p.images?.length) return false;
    if (f.media === 'video' && !p.videos?.length) return false;
    if (f.verified === 'yes' && !p.availabilityVerified) return false;
    if (f.source && p.source !== f.source) return false;
    if (f.origin === 'market' && p.sourceKind !== 'market-research') return false;
    if (f.origin === 'office' && p.sourceKind === 'market-research') return false;
    if (f.governorate && p.governorate !== f.governorate) return false;
    if (f.area && !norm(p.location).includes(norm(f.area))) return false;
    if (
      f.minPrice !== undefined &&
      f.minPrice !== "" &&
      (p.priceFils === null || p.priceFils < Number(f.minPrice) * 1000)
    )
      return false;
    if (
      f.maxPrice !== undefined &&
      f.maxPrice !== "" &&
      (p.priceFils === null || p.priceFils > Number(f.maxPrice) * 1000)
    )
      return false;
    if (f.bedrooms && (!p.bedrooms || p.bedrooms < Number(f.bedrooms)))
      return false;
    if (f.minArea && (!p.area || p.area < Number(f.minArea))) return false;
    if (f.maxArea && (!p.area || p.area > Number(f.maxArea))) return false;
    if (f.position && !(p.features || []).includes(f.position)) return false;
    if (f.status && p.status !== f.status) return false;
    const hay = norm(
      [p.id, p.sourceId, p.title, p.location, p.description, p.type, ...(p.features || [])].join(
        " ",
      ),
    );
    return words.every((w) => hay.includes(w));
  });
  const knownLast = (a, b, field, mult = 1) =>
    a[field] == null
      ? b[field] == null
        ? 0
        : 1
      : b[field] == null
        ? -1
        : (a[field] - b[field]) * mult;
  filtered.sort((a, b) =>
    f.sort === "price-asc"
      ? knownLast(a, b, "priceFils")
      : f.sort === "price-desc"
        ? knownLast(a, b, "priceFils", -1)
        : f.sort === "area-desc"
          ? knownLast(a, b, "area", -1)
          : String(b.createdAt).localeCompare(String(a.createdAt)),
  );
  return { properties: filtered, intent };
}
export function matchProperties(properties, request) {
  return properties
    .filter((p) => p.status === "active" || p.status === "reference")
    .map((p) => {
      const reasons = [];
      let score = 0;
      const add = (weight, why) => {
        score += weight;
        reasons.push(why);
      };
      if (request.category && p.category !== request.category) return null;
      if (request.type && p.type !== request.type) return null;
      add(30, "القسم والنوع");
      if (request.area && norm(p.location).includes(norm(request.area)))
        add(30, "المنطقة المطلوبة");
      else if (request.area) return null;
      else add(15, "منطقة مفتوحة");
      if (request.maxPriceFils != null) {
        if (p.priceFils == null || p.priceFils > request.maxPriceFils)
          return null;
        add(25, "ضمن الميزانية");
      } else add(10, "الميزانية مفتوحة");
      if (request.bedrooms) {
        if (!p.bedrooms || p.bedrooms < request.bedrooms) return null;
        add(15, "عدد الغرف");
      }
      return { ...p, matchScore: score, reasons };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
}
export function extractListing(raw) {
  const text = numberText(raw),
    intent = parseIntent(raw),
    { area: location, text: queryText, ...rest } = intent.filters,
    fields = { ...rest };
  if (location) fields.location = location;
  const price = text.match(
    /(?:السعر|ايجار|إيجار|الايجار|الإيجار|السومة|فرق البدل)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(ألف|الف)?/,
  );
  const area =
    text.match(/(?:مساحة|مساحه|المساحة|المساحه)\s*[:：]?\s*(\d+)/) ||
    text.match(/(\d+)\s*(?:م2|م²|متر)/);
  if (price) fields.price = Number(price[1]) * (price[2] ? 1000 : 1);
  if (area) fields.area = Number(area[1]);
  return {
    fields,
    title:
      text
        .split("\n")
        .find((s) => s.trim())
        ?.slice(0, 160) || "",
    description: raw,
    missing: ["category", "type", "price", "area"].filter(
      (k) => fields[k] == null,
    ),
    method: "قواعد استخلاص محلية؛ راجع الحقول قبل الحفظ",
  };
}
export function duplicateKey(p) {
  return norm([p.category, p.type, p.location, p.title].join(" "));
}
export const FEATURE_OPTIONS = [
  "بطن وظهر",
  "زاوية",
  "سد",
  "ارتداد",
  "نافذ",
  "مصعد",
  "مواقف",
  "غرفة خادمة",
  "مطبخ مجهز",
  "تكييف مركزي",
  "أول ساكن",
  "قريب من مسجد",
];
