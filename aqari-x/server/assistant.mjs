import { parseIntent, searchProperties, norm, money, CATEGORIES, TYPES, AREAS } from '../public/core.mjs';
import { translate } from '../public/i18n.mjs';

const text=(locale,ar,en,ur)=>({ar,en,ur}[locale]);
const cleanFilters=value=>{
  const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
  if(CATEGORIES.includes(value.category))out.category=value.category;
  if(TYPES.includes(value.type))out.type=value.type;
  if(AREAS.some(x=>x.area===value.area))out.area=value.area;
  for(const key of ['minPrice','maxPrice','bedrooms'])if(value[key]!==''&&value[key]!=null&&Number.isFinite(Number(value[key]))&&Number(value[key])>=0&&Number(value[key])<=1000000000)out[key]=Number(value[key]);
  if(['price-asc','price-desc','newest'].includes(value.sort))out.sort=value.sort;
  return out;
};
const caveat=locale=>text(locale,'التوفر والأسعار يحتاجان تأكيد المكتب.','The office must confirm current availability and prices.','موجودہ دستیابی اور قیمت کی تصدیق دفتر سے ضروری ہے۔');
function describe(p,locale){
  const tr=value=>translate(value,locale);
  const basis={monthly:['شهرياً','per month','ماہانہ'],unit_monthly:['للوحدة شهرياً، وليس للمبنى كاملاً','per unit per month, not for the whole building','فی یونٹ ماہانہ، پوری عمارت کا کرایہ نہیں'],exchange_difference:['فرق البدل، وليس سعر العقار كاملاً','exchange difference, not the full property price','تبادلے کی اضافی رقم، جائیداد کی کل قیمت نہیں'],annual:['سنوياً','per year','سالانہ'],total:['سعر العقار','total price','کل قیمت']};
  const unit=basis[p.priceBasis]||basis.total;
  const price=p.priceFils==null?text(locale,'السعر غير محدد؛ يراجع مع المكتب.','The price is unspecified; ask the office.','قیمت درج نہیں؛ دفتر سے معلوم کریں۔'):tr(money(p.priceFils))+' '+unit[['ar','en','ur'].indexOf(locale)]+'.';
  const rooms=p.bedrooms?text(locale,`${p.bedrooms} غرف نوم.`,`${p.bedrooms} bedrooms.`,`${p.bedrooms} بیڈ روم۔`):'';
  const area=p.area?text(locale,`المساحة ${p.area} م².`,`Area: ${p.area} m².`,`رقبہ: ${p.area} مربع میٹر۔`):text(locale,'المساحة غير مذكورة.','The area is not specified.','رقبہ درج نہیں۔');
  return [tr(p.title),tr(p.location),price,rooms,area,tr(p.description||''),caveat(locale)].filter(Boolean).join('\n');
}
export function officeAssistant(input,all,settings={}){
  const locale=['ar','en','ur'].includes(input.locale)?input.locale:'ar';
  const message=String(input.message||'').trim().slice(0,500),q=norm(message);
  const props=all.filter(p=>['active','reference'].includes(p.status));
  const filters=cleanFilters(input.filters);
  const ids=Array.isArray(input.propertyIds)?input.propertyIds.filter(id=>typeof id==='string').slice(0,6):[];
  const context=ids.map(id=>props.find(p=>p.id===id)).filter(Boolean);
  const result=(message,properties=[],actions=['request','appointment','whatsapp'],extra={})=>({method:'office-data',locale,message,properties,filters,intent:{filters,chips:Object.values(filters).map(x=>String(x))},actions,...extra});
  if(!message)return result(text(locale,'اكتب ما تبحث عنه وسأساعدك.','Tell me what you are looking for.','بتائیں آپ کو کیا تلاش کرنا ہے۔'));
  if(/(?:عمول|سمسر|commission|brokerage|کمیشن|دلالی)/u.test(q))return result(text(locale,'العمولة حسب اتفاق الوساطة الموثق وقيمة الصفقة النهائية. استخدم الحاسبة للتقدير، ويؤكد المكتب الاتفاق قبل إتمام الصفقة. لا ينفّذ المساعد دفعاً.','Commission depends on the documented brokerage agreement and the final transaction amount. Use the calculator for an estimate; the office confirms the agreement. The assistant does not take payments.','کمیشن تحریری بروکریج معاہدے اور سودے کی آخری رقم کے مطابق ہوگا۔ اندازے کے لیے کیلکولیٹر استعمال کریں؛ معاہدے کی تصدیق دفتر کرے گا۔ معاون ادائیگی وصول نہیں کرتا۔'),[],['calculator','whatsapp']);
  if(/(?:موعد|معاين|زيار|حجز|book|appointment|viewing|visit|ملاقات|معائنہ|وقت|بکنگ)/u.test(q))return result(settings.scheduleEnabled?text(locale,'افتح حجز المعاينة لاختيار وقت متاح بتوقيت الكويت. يلزم تسجيل الدخول، ويظل الطلب بانتظار تأكيد المكتب. لم أحجز موعداً من المحادثة.','Open viewing appointments to choose an available time in Kuwait time. Sign in first; the office must confirm the request. No appointment has been booked in this chat.','معائنے کے لیے کویت کے وقت کے مطابق دستیاب وقت منتخب کریں۔ پہلے لاگ اِن کریں؛ دفتر کی تصدیق ضروری ہے۔ اس گفتگو سے کوئی وقت بک نہیں ہوا۔'):text(locale,'المكتب لم يفتح جدول المعاينات بعد. تواصل معه عبر زر واتساب لترتيب موعد. لم أسجّل حجزاً.','The office has not opened its viewing schedule yet. Use the WhatsApp button to arrange a visit. No booking has been made.','دفتر نے ابھی معائنے کا شیڈول نہیں کھولا۔ وقت طے کرنے کے لیے واٹس ایپ بٹن استعمال کریں۔ کوئی بکنگ نہیں ہوئی۔'),context.slice(0,1),['appointment','whatsapp']);
  if(/(?:واتساب|تواصل|هاتف|رقم المكتب|whatsapp|contact|phone|call|واٹس|رابطہ|فون|نمبر)/u.test(q))return result(text(locale,'تواصل مع المكتب عبر زر واتساب أدناه. يفتح محادثة مع المكتب دون عرض الرقم في الموقع؛ لن أرسل رسالة بالنيابة عنك.','Use the WhatsApp button below to contact the office. It opens the office chat without displaying its number on the site. You send the message yourself.','دفتر سے رابطے کے لیے نیچے واٹس ایپ بٹن دبائیں۔ ویب سائٹ پر نمبر دکھائے بغیر دفتر کی گفتگو کھلے گی۔ پیغام آپ خود بھیجیں گے۔'),[],['whatsapp']);
  if(/(?:قانون|عقد|ملكيه|تقييم|سعر السوق|legal|contract|ownership|valuation|market price|قانونی|معاہدہ|ملکیت|مارکیٹ)/u.test(q))return result(text(locale,'أستطيع شرح بيانات الإعلان والبحث في عروض المكتب. التقييم والملكية والعقود تحتاج مستندات ومراجعة مختص، ولا أستطيع تأكيدها من الإعلان.','I can explain listing facts and search the office inventory. Valuation, ownership and contracts require documents and a qualified review; a listing alone cannot confirm them.','میں اشتہار کی معلومات بتا سکتا ہوں اور دفتر کے اشتہارات میں تلاش کر سکتا ہوں۔ قیمت کا تخمینہ، ملکیت اور معاہدے کے لیے دستاویزات اور ماہر کا جائزہ ضروری ہے۔'),context.slice(0,1),['whatsapp']);
  if(/^(?:مرحبا|هلا|السلام عليكم|اهلا|hello|hi|hey|salam|سلام|السلام علیکم)[\s.!؟?]*$/u.test(q))return result(text(locale,'مرحباً! أساعدك في عروض البيع والإيجار والبدل. ما المنطقة ونوع العقار والميزانية؟ يمكنك الكتابة أو الضغط على الميكروفون.','Hello! I can help you find sale, rental and exchange listings. Which area, property type and budget suit you? Type or use the microphone.','السلام علیکم! میں فروخت، کرائے اور تبادلے کے اشتہارات تلاش کر سکتا ہوں۔ کون سا علاقہ، جائیداد کی قسم اور بجٹ مناسب ہے؟ لکھیں یا مائیکروفون دبائیں۔'));
  const detail=/(?:تفاصيل|مواصفات|سعره|سعرها|مساح|غرف|حمام|متاح|تاثيث|details|tell me about|price|available|furnished|deposit|رقبہ|تفصیل|قیمت|دستیاب|باتھ|پہلا|دوسرا|first|second)/u.test(q);
  const intent=parseIntent(message),parsed=cleanFilters(intent.filters);
  const explicit=props.find(p=>q.includes(norm(p.id))||q===norm(p.title));
  if(explicit||(context.length&&detail&&!Object.keys(parsed).some(k=>['type','area','category','maxPrice','minPrice'].includes(k))&&!parsed.bedrooms)){
    const second=/(?:الثاني|second|دوسرا)/u.test(q);const selected=explicit||context[second?1:0];
    if(!selected)return result(text(locale,'لا يوجد عرض ثانٍ في النتائج الحالية.','There is no second listing in the current results.','موجودہ نتائج میں دوسرا اشتہار نہیں ہے۔'));
    return result(describe(selected,locale),[selected]);
  }
  if(/(?:ابدا من جديد|بحث جديد|مسح|start over|new search|reset|نئی تلاش|دوبارہ)/u.test(q)){
    for(const key of Object.keys(filters))delete filters[key];
    return result(text(locale,'بدأنا بحثاً جديداً. ما المنطقة ونوع العقار والميزانية؟','New search started. Which area, property type and budget?','نئی تلاش شروع ہوگئی۔ علاقہ، جائیداد کی قسم اور بجٹ بتائیں۔'));
  }
  Object.assign(filters,parsed);
  if(/(?:ارخص|الاقل|cheapest|lowest|سستا|کم قیمت)/u.test(q))filters.sort='price-asc';
  const remainder=intent.filters.text||'';
  const queryText=remainder.replace(/\b(?:what|about|show|me|options|listings|properties|another|more)\b/g,' ').replace(/(?:ابغى|شوف|ممكن|ابي)/g,' ').trim();
  const found=searchProperties(props,{...filters,...(queryText?{q:queryText}:{})}).properties;
  if(!found.length)return result(text(locale,'لم أجد عرضاً يطابق الشروط الحالية بالكامل. يمكنك تغيير المنطقة أو الميزانية، أو تسجيل طلبك ليتابعه المكتب. لا أضيف أسعاراً أو عروضاً من خارج قاعدة المكتب.','No listing matches all the current conditions. Change the area or budget, or register a request for the office to follow up. I do not invent prices or add listings from outside the office inventory.','موجودہ تمام شرائط کے مطابق کوئی اشتہار نہیں ملا۔ علاقہ یا بجٹ بدلیں، یا دفتر کے لیے درخواست درج کریں۔ میں دفتر کے ریکارڈ سے باہر کی قیمت یا اشتہار نہیں بناتا۔'),[],['request','whatsapp']);
  const constraints=Object.entries(filters).filter(([key])=>['category','type','area','bedrooms','maxPrice'].includes(key)).map(([key,value])=>key==='maxPrice'?text(locale,`حتى ${money(value*1000)}`,`up to ${value} KWD`,`${value} کویتی دینار تک`):key==='bedrooms'?text(locale,`${value} غرف فأكثر`,`${value}+ bedrooms`,`${value} یا زیادہ کمرے`):translate(value,locale)).join(' · ');
  return result(text(locale,`وجدت ${found.length} عروض من قاعدة المكتب${constraints?': '+constraints:''}. ${caveat(locale)} اختر عرضاً أو اسأل عن تفاصيله.`,`I found ${found.length} listing(s) in the office inventory${constraints?': '+constraints:''}. ${caveat(locale)} Choose a listing or ask about its details.`,`دفتر کے ریکارڈ میں ${found.length} اشتہار ملے${constraints?': '+constraints:''}۔ ${caveat(locale)} کوئی اشتہار منتخب کریں یا اس کی تفصیل پوچھیں۔`),found.slice(0,6),['results','request','appointment','whatsapp']);
}
