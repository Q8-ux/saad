/**
 * Arabic source text is the canonical content. These display translations never
 * change stored field values, listing facts, amounts, availability, or consent.
 * Area names are transliterations; initial listings retain their source caveats.
 */
const entries = (text) =>
  Object.fromEntries(
    text.trim().split("\n").map((line) => {
      const [source, en, ur] = line.split("\t");
      if (!source || en === undefined || ur === undefined)
        throw new Error(`Invalid locale dictionary row: ${source}`);
      return [source, { en, ur }];
    }),
  );

const areas = entries(`
العاصمة	Capital	دارالحکومت
مدينة الكويت	Kuwait City	کویت سٹی
دسمان	Dasman	دسمان
شرق	Sharq	شرق
القبلة	Qibla	قبلہ
المرقاب	Mirqab	مرقاب
بنيد القار	Bneid Al Qar	بنید القار
الدسمة	Dasma	دسمہ
الدعية	Daiya	دعیہ
المنصورية	Mansouriya	منصوریہ
ضاحية عبدالله السالم	Abdullah Al Salem	ضاحیہ عبداللہ السالم
النزهة	Nuzha	نزہہ
الفيحاء	Faiha	فیحاء
الشامية	Shamiya	شامیہ
الروضة	Rawda	روضہ
العديلية	Adailiya	عدیلیہ
الخالدية	Khaldiya	خالدیہ
كيفان	Kaifan	کیفان
القادسية	Qadsiya	قادسیہ
قرطبة	Qurtuba	قرطبہ
السرة	Surra	سرہ
اليرموك	Yarmouk	یرموک
الشويخ	Shuwaikh	شویخ
الري	Al Rai	الرای
الدوحة	Doha	دوحہ
الصليبخات	Sulaibikhat	صلیبیخات
شمال غرب الصليبخات	Northwest Sulaibikhat	شمال مغربی صلیبیخات
جابر الأحمد	Jaber Al Ahmad	جابر الاحمد
القيروان	Qairawan	قیروان
النهضة	Nahda	نہضہ
حولي	Hawalli	حولی
السالمية	Salmiya	سالمیہ
الرميثية	Rumaithiya	رمیثیہ
الجابرية	Jabriya	جابریہ
سلوى	Salwa	سلویٰ
البدع	Al Bidaa	بدع
مشرف	Mishref	مشرف
بيان	Bayan	بیان
جنوب السرة	South Surra	جنوبی سرہ
الزهراء	Zahra	زہراء
حطين	Hateen	حطین
السلام	Salam	سلام
الشهداء	Shuhada	شہداء
الصديق	Siddiq	صدیق
مبارك العبدالله	Mubarak Al Abdullah	مبارک العبداللہ
الفروانية	Farwaniya	فروانیہ
خيطان	Khaitan	خیطان
الأبرق	Abraq	ابرق
العمرية	Omariya	عمریہ
الرابية	Rabiya	رابیہ
الرحاب	Rehab	رحاب
إشبيلية	Ishbiliya	اشبیلیہ
الأندلس	Andalus	اندلس
العارضية	Ardiya	عارضیہ
الفردوس	Firdous	فردوس
صباح الناصر	Sabah Al Nasser	صباح الناصر
عبدالله المبارك	Abdullah Al Mubarak	عبداللہ المبارک
غرب عبدالله المبارك	West Abdullah Al Mubarak	مغربی عبداللہ المبارک
جنوب عبدالله المبارك	South Abdullah Al Mubarak	جنوبی عبداللہ المبارک
جليب الشيوخ	Jleeb Al Shuyoukh	جلیب الشیوخ
الرقعي	Riggae	رقعی
الضجيج	Dajeej	ضجیج
الأحمدي	Ahmadi	احمدی
الفنطاس	Fintas	فنطاس
الفحيحيل	Fahaheel	فحاحیل
المنقف	Mangaf	منقف
المهبولة	Mahboula	مہبولہ
أبو حليفة	Abu Halifa	ابو حلیفہ
الرقة	Riqqa	رقہ
هدية	Hadiya	ہدیہ
الصباحية	Sabahiya	صباحیہ
الظهر	Dhaher	ظہر
العقيلة	Egaila	عقیلہ
فهد الأحمد	Fahad Al Ahmad	فہد الاحمد
جابر العلي	Jaber Al Ali	جابر العلی
صباح الأحمد	Sabah Al Ahmad	صباح الاحمد
جنوب صباح الأحمد	South Sabah Al Ahmad	جنوبی صباح الاحمد
الخيران	Khiran	خیران
الوفرة	Wafra	وفرہ
علي صباح السالم	Ali Sabah Al Salem	علی صباح السالم
ميناء عبدالله	Mina Abdullah	میناء عبداللہ
الزور	Zour	زور
بنيدر	Bnaider	بنیدر
الجليعة	Julai'a	جلیعہ
الضباعية	Dhubaiya	ضباعیہ
مبارك الكبير	Mubarak Al Kabeer	مبارک الکبیر
القصور	Qusour	قصور
العدان	Adan	عدان
القرين	Qurain	قرین
أبو فطيرة	Abu Fatira	ابو فطیرہ
الفنيطيس	Funaitees	فنیطیس
المسايل	Masayel	مسائل
صباح السالم	Sabah Al Salem	صباح السالم
المسيلة	Messila	مسیلہ
أبو الحصانية	Abu Al Hasaniya	ابو الحصانیہ
صبحان	Subhan	صبحان
الجهراء	Jahra	جہرا
تيماء	Taima	تیماء
النسيم	Naseem	نسیم
العيون	Oyoun	عیون
الواحة	Waha	واحہ
القصر	Qasr	قصر
النعيم	Naeem	نعیم
سعد العبدالله	Saad Al Abdullah	سعد العبداللہ
جنوب سعد العبدالله	South Saad Al Abdullah	جنوبی سعد العبداللہ
المطلاع	Mutlaa	مطلاع
الصليبية	Sulaibiya	صلیبیہ
كبد	Kabd	کبد
العبدلي	Abdali	عبدلی
السالمي	Salmi	سالمی
أمغرة	Amghara	امغرہ
`);

const common = entries(`
عقاري X	Aqari X	عقاری X
عقاري X | المكتب العقاري	Aqari X | Real Estate Office	عقاری X | رئیل اسٹیٹ دفتر
إدارة المكتب | عقاري X	Office Administration | Aqari X	دفتر کا انتظام | عقاری X
عقاري X ·	Aqari X ·	عقاری X ·
عقاري X — عروض عقارية في الكويت للبيع والإيجار والبدل. بحث واضح ومقارنة العقارات وطلبات ومعاينات يتابعها المكتب.	Aqari X — Property listings in Kuwait for sale, rent and exchange. Clear search, property comparison, requests and viewings followed up by the office.	عقاری X — کویت میں فروخت، کرایے اور تبادلے کی جائیدادیں۔ واضح تلاش، جائیدادوں کا موازنہ، درخواستیں اور معائنے جن کی دفتر پیروی کرتا ہے۔
اللغة	Language	زبان
عقاري	Aqari	عقاری
المكتب العقاري	Real Estate Office	رئیل اسٹیٹ دفتر
شعار عقاري X	Aqari X logo	عقاری X کا لوگو
مساحتك العقارية	Your property space	آپ کی جائیداد کی جگہ
القائمة الرئيسية	Main navigation	مرکزی مینو
انتقل للمحتوى	Skip to content	مواد پر جائیں
الكويت	Kuwait	کویت
أبو مريم	Abu Maryam	ابو مریم
اكتشف العقارات	Discover properties	جائیدادیں تلاش کریں
المفضلة	Favorites	پسندیدہ
مقارنة العقارات	Compare properties	جائیدادوں کا موازنہ
طلباتي ومواعيدي	My requests & appointments	میری درخواستیں اور ملاقاتیں
إعلاناتي	My listings	میرے اشتہارات
مساعد البحث	Search assistant	تلاش کا معاون
حاسبة العمولة	Commission calculator	کمیشن کیلکولیٹر
دليل البحث الموسع	Extended search guide	وسیع تلاش کی رہنمائی
أضف عقارك	List your property	اپنی جائیداد شامل کریں
مرحباً بك	Welcome	خوش آمدید
تسجيل الدخول أو إنشاء حساب	Sign in or create an account	لاگ اِن کریں یا اکاؤنٹ بنائیں
إدارة المكتب	Office administration	دفتر کا انتظام
الخصوصية	Privacy	رازداری
شروط الاستخدام	Terms of use	استعمال کی شرائط
تواصل مباشر	Direct contact	براہ راست رابطہ
لديك عقار أو تبحث عن فرصة؟ نرتب التفاصيل معك.	Have a property or looking for an opportunity? We will arrange the details with you.	آپ کی جائیداد ہے یا کسی موقع کی تلاش ہے؟ ہم آپ کے ساتھ تفصیلات طے کریں گے۔
تواصل مع المكتب	Contact the office	دفتر سے رابطہ کریں
تصفح حسب المنطقة	Browse by area	علاقے کے مطابق دیکھیں
قرار أوضح	A clearer decision	زیادہ واضح فیصلہ
قارن قبل أن تختار.	Compare before you choose.	انتخاب سے پہلے موازنہ کریں۔
أضف حتى ثلاثة عقارات للمقارنة؛ لترى السعر والمساحة والمواصفات في مكان واحد.	Compare up to three properties to see prices, areas and features in one place.	قیمت، رقبہ اور خصوصیات ایک جگہ دیکھنے کے لیے زیادہ سے زیادہ تین جائیدادوں کا موازنہ کریں۔
افتح المقارنة	Open comparison	موازنہ کھولیں
سجّل طلبك العقاري	Submit your property request	جائیداد کی اپنی درخواست درج کریں
جارٍ الاتصال	Connecting	رابطہ ہو رہا ہے
متصل بالمكتب	Connected to the office	دفتر سے منسلک
الاتصال غير متاح	Connection unavailable	رابطہ دستیاب نہیں
السعر والتوفر يُؤكدان مع المكتب.	Confirm price and availability with the office.	قیمت اور دستیابی کی تصدیق دفتر سے کریں۔
تواصل مع المكتب عبر واتساب	Contact the office on WhatsApp	واٹس ایپ پر دفتر سے رابطہ کریں
واتساب المكتب	Office WhatsApp	دفتر کا واٹس ایپ
فتح القائمة	Open menu	مینو کھولیں
حسابي	My account	میرا اکاؤنٹ
العروض	Listings	اشتہارات
أضف عقار	Add property	جائیداد شامل کریں
طلباتي	My requests	میری درخواستیں
المقارنة	Comparison	موازنہ
إغلاق	Close	بند کریں
الكل	All	سب
القسم	Category	زمرہ
كل العروض	All listings	تمام اشتہارات
المحافظة	Governorate	محافظہ
المنطقة	Area	علاقہ
كل المناطق	All areas	تمام علاقے
نوع العقار	Property type	جائیداد کی قسم
النوع	Type	قسم
السعر	Price	قیمت
المساحة	Area	رقبہ
غرف النوم	Bedrooms	بیڈ روم
دورات المياه	Bathrooms	غسل خانے
الحمامات	Bathrooms	غسل خانے
المواصفات	Features	خصوصیات
التوفر	Availability	دستیابی
المعاينة	Viewing	معائنہ
العقار	Property	جائیداد
عقار	property	جائیداد
العنوان	Title	عنوان
عنوان العقار	Property title	جائیداد کا عنوان
الوصف	Description	تفصیل
وصف العقار	Property description	جائیداد کی تفصیل
المنطقة والقطعة	Area and block	علاقہ اور بلاک
للاتفاق	On agreement	باہمی اتفاق سے
غير مذكورة	Not specified	درج نہیں
غير محددة	Not specified	متعین نہیں
غير مرفق	Not attached	منسلک نہیں
لا يوجد وصف إضافي	No additional description	مزید تفصیل نہیں
لم يرفق وصف إضافي.	No additional description was provided.	مزید تفصیل فراہم نہیں کی گئی۔
للبيع	For sale	برائے فروخت
للإيجار	For rent	کرائے کے لیے
للبدل	For exchange	تبادلے کے لیے
شقة	Apartment	اپارٹمنٹ
فيلا	Villa	ولا
بيت	House	مکان
أرض	Land	زمین
عمارة	Building	عمارت
مكتب	Office	دفتر
محل	Shop	دکان
شاليه	Chalet	شالے
مزرعة	Farm	فارم
مخزن	Warehouse	گودام
بطن وظهر	Front and rear streets	سامنے اور پیچھے سڑکیں
زاوية	Corner plot	کونے کا پلاٹ
سد	Single-frontage plot	ایک طرف سڑک والا پلاٹ
ارتداد	Setback	کھلی سیٹ بیک جگہ
نافذ	Through road	آر پار سڑک
مصعد	Elevator	لفٹ
مواقف	Parking	پارکنگ
غرفة خادمة	Domestic staff room	گھریلو عملے کا کمرہ
مطبخ مجهز	Fitted kitchen	مکمل تیار کچن
تكييف مركزي	Central air conditioning	مرکزی ایئر کنڈیشننگ
أول ساكن	First occupancy	پہلی رہائش
قريب من مسجد	Near a mosque	مسجد کے قریب
شهرياً	per month	ماہانہ
شهري	Monthly	ماہانہ
للوحدة / شهرياً	per unit / month	فی یونٹ / ماہانہ
سنوياً	per year	سالانہ
سنوي	Annual	سالانہ
فرق البدل	Exchange difference	تبادلے کی اضافی رقم
فرق بدل	Exchange difference	تبادلے کی اضافی رقم
سعر العقار	Property price	جائیداد کی قیمت
السعر الكلي	Total price	کل قیمت
إيجار شهري	Monthly rent	ماہانہ کرایہ
إيجار الوحدة شهرياً	Monthly rent per unit	فی یونٹ ماہانہ کرایہ
شهري للوحدة	Monthly per unit	فی یونٹ ماہانہ
إيجار سنوي	Annual rent	سالانہ کرایہ
أساس السعر	Price basis	قیمت کی بنیاد
سعر العقار كاملاً	Whole property price	مکمل جائیداد کی قیمت
فرق البدل فقط	Exchange difference only	صرف تبادلے کی اضافی رقم
د.ك	KWD	کویتی دینار
م²	m²	مربع میٹر
غرف	bedrooms	بیڈ روم
غرف فأكثر	bedrooms or more	یا زیادہ بیڈ روم
منشور	Published	شائع شدہ
قيد المراجعة	Under review	زیر جائزہ
متاح	Available	دستیاب
بيانات أولية	Initial data	ابتدائی معلومات
متوقف	Paused	عارضی طور پر بند
صفقة مكتملة	Completed deal	مکمل شدہ سودا
لم يعتمد	Not approved	منظور نہیں ہوا
مؤرشف	Archived	محفوظ شدہ
مكتمل	Completed	مکمل
جديد	New	نیا
طلب جديد	New request	نئی درخواست
تم التواصل	Contacted	رابطہ ہو گیا
معاينة	Viewing	معائنہ
تفاوض	Negotiation	بات چیت
مغلق	Closed	بند
ملغي	Cancelled	منسوخ
بانتظار التأكيد	Awaiting confirmation	تصدیق کا منتظر
مؤكد	Confirmed	تصدیق شدہ
تمت المعاينة	Viewing completed	معائنہ مکمل
تم	Done	مکمل
تمت	Done	مکمل
مستحق	Due	واجب الادا
سجل تحصيله	Collection recorded	وصولی درج کی گئی
سُجل تحصيله	Collection recorded	وصولی درج کی گئی
تأكيد	Confirm	تصدیق کریں
إلغاء	Cancel	منسوخ کریں
إزالة	Remove	ہٹائیں
تحديث	Refresh	تازہ کریں
تنزيل	Download	ڈاؤن لوڈ
التاريخ	Date	تاریخ
الحالة	Status	حالت
الإجراء	Action	عمل
القيمة	Value	رقم
التفاصيل	Details	تفصیلات
تفاصيل	Details	تفصیلات
العميل	Client	کلائنٹ
المستخدم	User	صارف
التواصل	Contact	رابطہ
الصلاحية	Role	اختیار
المرحلة	Stage	مرحلہ
العملية	Action	عمل
المنفذ	Performed by	انجام دینے والا
مدير	Administrator	منتظم
مالك	Owner	مالک
وسيط	Broker	بروکر
باحث عن عقار	Property seeker	جائیداد تلاش کرنے والا
زيارة المكتب	Office visit	دفتر کا دورہ
إضافة مستخدم	Added by a user	صارف نے شامل کیا
استفسار	Enquiry	استفسار
استفسار عقاري	Property enquiry	جائیداد سے متعلق استفسار
جارٍ الحفظ…	Saving…	محفوظ ہو رہا ہے…
الخادم غير مهيأ بعد	The server is not configured yet	سرور ابھی ترتیب نہیں دیا گیا
استجابة الخادم غير صالحة	Invalid server response	سرور کا جواب درست نہیں
تعذرت العملية	The operation could not be completed	عمل مکمل نہیں ہو سکا
أدخل مبلغاً صحيحاً بالدينار حتى ثلاثة أرقام عشرية	Enter a valid dinar amount with up to three decimal places	دینار میں درست رقم درج کریں، زیادہ سے زیادہ تین اعشاری ہندسوں کے ساتھ
المبلغ خارج النطاق	Amount is outside the allowed range	رقم مقررہ حد سے باہر ہے
نسبة العمولة بين صفر و10% حسب الاتفاق	The agreed commission rate must be between 0 and 10%	متفقہ کمیشن کی شرح 0 سے 10% کے درمیان ہونی چاہیے
قيمة الصفقة مطلوبة	The deal value is required	سودے کی رقم درکار ہے
القسم والنوع	Category and type	زمرہ اور قسم
المنطقة المطلوبة	Requested area	مطلوبہ علاقہ
منطقة مفتوحة	Any area	کوئی بھی علاقہ
ضمن الميزانية	Within budget	بجٹ کے اندر
الميزانية مفتوحة	Open budget	بجٹ کی حد نہیں
عدد الغرف	Bedroom count	بیڈ روم کی تعداد
قواعد استخلاص محلية؛ راجع الحقول قبل الحفظ	Local extraction rules; review fields before saving	مقامی استخراج کے اصول؛ محفوظ کرنے سے پہلے خانوں کا جائزہ لیں
الأحد	Sunday	اتوار
الاثنين	Monday	پیر
الثلاثاء	Tuesday	منگل
الأربعاء	Wednesday	بدھ
الخميس	Thursday	جمعرات
الجمعة	Friday	جمعہ
السبت	Saturday	ہفتہ
يناير	January	جنوری
فبراير	February	فروری
مارس	March	مارچ
أبريل	April	اپریل
مايو	May	مئی
يونيو	June	جون
يوليو	July	جولائی
أغسطس	August	اگست
سبتمبر	September	ستمبر
أكتوبر	October	اکتوبر
نوفمبر	November	نومبر
ديسمبر	December	دسمبر
`);

const publicUI = entries(`
بيع · إيجار · بدل	Sale · Rent · Exchange	فروخت · کرایہ · تبادلہ
العقار المناسب.	The right property.	موزوں جائیداد۔
بالتفاصيل التي تهمك.	With the details that matter to you.	ان تفصیلات کے ساتھ جو آپ کے لیے اہم ہیں۔
ابحث، قارن، واترك للمكتب متابعة التفاصيل.	Search, compare, and let the office follow up on the details.	تلاش اور موازنہ کریں، تفصیلات کی پیروی دفتر پر چھوڑ دیں۔
شقة بالجابرية 3 غرف بحدود 500…	3-bedroom apartment in Jabriya, around 500…	جابریہ میں 3 بیڈ روم کا اپارٹمنٹ، تقریباً 500…
ابحث بالمنطقة أو المواصفات	Search by area or features	علاقے یا خصوصیات کے مطابق تلاش کریں
ابحث	Search	تلاش کریں
بحث متقدم	Advanced search	تفصیلی تلاش
احفظ البحث	Save search	تلاش محفوظ کریں
حفظ البحث	Save search	تلاش محفوظ کریں
مسح الفلاتر	Clear filters	فلٹر صاف کریں
العروض الأولية من البيانات المرفقة بالمشروع. لم يُؤكَّد توفرها الحالي؛ راجع المكتب قبل اتخاذ قرار.	Initial listings come from the supplied project data. Current availability is unconfirmed; check with the office before making a decision.	ابتدائی اشتہارات منصوبے کے ساتھ فراہم کردہ معلومات سے ہیں۔ موجودہ دستیابی کی تصدیق نہیں ہوئی؛ فیصلہ کرنے سے پہلے دفتر سے رابطہ کریں۔
عرض البطاقات	Card view	کارڈ کی صورت میں دیکھیں
عرض القائمة	List view	فہرست کی صورت میں دیکھیں
السعر من · د.ك	Minimum price · KWD	کم از کم قیمت · کویتی دینار
السعر إلى · د.ك	Maximum price · KWD	زیادہ سے زیادہ قیمت · کویتی دینار
غرف النوم على الأقل	Minimum bedrooms	کم از کم بیڈ روم
المساحة من · م²	Minimum area · m²	کم از کم رقبہ · مربع میٹر
المساحة إلى · م²	Maximum area · m²	زیادہ سے زیادہ رقبہ · مربع میٹر
مواصفة إضافية	Additional feature	اضافی خصوصیت
ترتيب النتائج	Sort results	نتائج کی ترتیب
الأحدث إضافة	Newest first	تازہ ترین پہلے
السعر من الأقل	Price: low to high	قیمت: کم سے زیادہ
السعر من الأعلى	Price: high to low	قیمت: زیادہ سے کم
المساحة من الأكبر	Area: largest first	رقبہ: بڑا پہلے
تطبيق البحث	Apply search	تلاش نافذ کریں
عند تحديد السعر أو المساحة، تستبعد العروض التي تفتقد هذه البيانات. سعر البدل هو الفرق، وإيجار الوحدة يوضح بجانب السعر.	Price and area filters exclude listings missing those values. Exchange prices show the difference; per-unit rent is identified beside the price.	قیمت یا رقبہ مقرر کرنے پر ان معلومات کے بغیر اشتہارات خارج ہو جاتے ہیں۔ تبادلے کی قیمت اضافی رقم ہے، اور فی یونٹ کرایہ قیمت کے ساتھ واضح ہوتا ہے۔
لم ترفق صور للعقار	No property photos supplied	جائیداد کی تصاویر فراہم نہیں کی گئیں
إزالة من المفضلة	Remove from favorites	پسندیدہ سے ہٹائیں
إضافة إلى المفضلة	Add to favorites	پسندیدہ میں شامل کریں
المساحة غير محددة	Area not specified	رقبہ متعین نہیں
أُضيف للمقارنة	Added to comparison	موازنے میں شامل کر دیا گیا
أضف للمقارنة	Add to comparison	موازنے میں شامل کریں
استفسر الآن	Enquire now	ابھی استفسار کریں
صورة مرفقة لإعلان	Photo attached to listing	اشتہار کے ساتھ منسلک تصویر
لا توجد عروض مطابقة	No matching listings	کوئی موزوں اشتہار نہیں
جرّب منطقة أخرى أو خفف السعر وعدد الغرف. يمكنك تسجيل طلبك ليتابعه المكتب.	Try another area or relax the price and bedroom filters. You can submit a request for the office to follow up.	دوسرا علاقہ آزمائیں یا قیمت اور بیڈ روم کی شرائط کم کریں۔ دفتر کی پیروی کے لیے اپنی درخواست درج کر سکتے ہیں۔
سجّل طلبك	Submit your request	اپنی درخواست درج کریں
سجل طلبك	Submit your request	اپنی درخواست درج کریں
إدارة حسابك	Manage your account	اپنا اکاؤنٹ سنبھالیں
عقارات تستحق الرجوع لها.	Properties worth another look.	دوبارہ دیکھنے کے قابل جائیدادیں۔
مفضلتك محفوظة على هذا الجهاز، دون مشاركة بيانات حسابك.	Your favorites are saved on this device without sharing your account details.	آپ کی پسندیدہ جائیدادیں اسی آلے پر محفوظ ہیں، اکاؤنٹ کی معلومات شیئر نہیں ہوتیں۔
مفضلتك فارغة	Your favorites are empty	آپ کی پسندیدہ فہرست خالی ہے
اضغط رمز القلب على أي عقار ليظهر هنا.	Tap the heart on a property to show it here.	کسی جائیداد کو یہاں دکھانے کے لیے دل کے نشان پر دبائیں۔
استعرض العروض	Browse listings	اشتہارات دیکھیں
تعذر تحميل الصفحة	Unable to load this page	صفحہ لوڈ نہیں ہو سکا
حاول مجدداً	Try again	دوبارہ کوشش کریں
لم تُحفظ أي عملية بسبب فشل الاتصال.	No operation was saved because the connection failed.	رابطہ ناکام ہونے کی وجہ سے کوئی عمل محفوظ نہیں ہوا۔
إعادة المحاولة	Retry	دوبارہ کوشش
التفاصيل جنباً إلى جنب.	Details side by side.	تفصیلات ایک ساتھ۔
قارن حتى ثلاثة عقارات. فرق البدل والإيجار الشهري وسعر البيع أسس مختلفة للمقارنة.	Compare up to three properties. Exchange differences, monthly rents and sale prices use different pricing bases.	تین جائیدادوں تک موازنہ کریں۔ تبادلے کی اضافی رقم، ماہانہ کرایہ اور فروخت کی قیمت کی بنیادیں مختلف ہیں۔
وجه المقارنة	Comparison item	موازنے کی شے
طلب موعد	Request an appointment	ملاقات کی درخواست
طباعة / حفظ PDF	Print / save PDF	پرنٹ کریں / PDF محفوظ کریں
أضف عقاراً آخر	Add another property	ایک اور جائیداد شامل کریں
اختر عقارين للمقارنة	Choose two properties to compare	موازنے کے لیے دو جائیدادیں منتخب کریں
اضغط «أضف للمقارنة» من بطاقة العقار.	Select “Add to comparison” on a property card.	جائیداد کے کارڈ پر «موازنے میں شامل کریں» دبائیں۔
استعرض العقارات	Browse properties	جائیدادیں دیکھیں
احسب وفق اتفاقك.	Calculate from your agreement.	اپنے معاہدے کے مطابق حساب کریں۔
الحاسبة أداة تقديرية. مبلغ العمولة وطريقة احتسابها يثبتان باتفاق الوساطة.	This calculator gives an estimate. The commission amount and calculation basis are established by the brokerage agreement.	یہ کیلکولیٹر تخمینہ دیتا ہے۔ کمیشن کی رقم اور حساب کی بنیاد بروکریج کے معاہدے میں طے ہوتی ہے۔
قيمة الصفقة النهائية · د.ك	Final deal value · KWD	سودے کی حتمی رقم · کویتی دینار
مثال: 250000	Example: 250000	مثال: 250000
طريقة العمولة	Commission method	کمیشن کا طریقہ
نسبة من القيمة المتفق عليها	Percentage of the agreed value	متفقہ رقم کا فی صد
مبلغ ثابت	Fixed amount	مقررہ رقم
النسبة % أو المبلغ الثابت د.ك	Rate % or fixed amount in KWD	شرح % یا مقررہ رقم کویتی دینار میں
للإيجار والبدل: اتفق مع المكتب على أساس المبلغ قبل الحساب. لا يوجد معدل إلزامي مفترض في النظام.	For rent and exchange, agree the calculation basis with the office first. The system assumes no mandatory rate.	کرایے اور تبادلے کے لیے پہلے دفتر سے حساب کی بنیاد طے کریں۔ نظام کسی لازمی شرح کو فرض نہیں کرتا۔
احسب العمولة	Calculate commission	کمیشن کا حساب کریں
العمولة التقديرية	Estimated commission	تخمینی کمیشن
لا تنشئ هذه الحسبة فاتورة أو مطالبة مالية.	This calculation does not create an invoice or financial claim.	اس حساب سے انوائس یا مالی مطالبہ نہیں بنتا۔
صف ما تبحث عنه.	Describe what you need.	بتائیں آپ کیا تلاش کر رہے ہیں۔
مساعد بحث يستخرج الشروط من عبارتك ويطابقها مع قاعدة المكتب. لا يقدم تقييماً سوقياً أو استشارة قانونية.	The search assistant extracts your criteria and matches them against the office database. It does not provide market valuations or legal advice.	تلاش کا معاون آپ کی بات سے شرائط نکال کر دفتر کے ڈیٹا سے ملاتا ہے۔ یہ مارکیٹ کی قیمت کا تخمینہ یا قانونی مشورہ نہیں دیتا۔
شقة في الجابرية 3 غرف بحدود 500	3-bedroom apartment in Jabriya around 500	جابریہ میں 3 بیڈ روم کا اپارٹمنٹ، تقریباً 500
بيت للبدل في المطلاع	House for exchange in Mutlaa	مطلاع میں تبادلے کے لیے مکان
شقة للإيجار في العمرية	Apartment for rent in Omariya	عمریہ میں کرائے کے لیے اپارٹمنٹ
اذكر المنطقة، النوع، الميزانية والغرف. النتائج من عروض المكتب المسجلة فقط.	Specify the area, type, budget and bedrooms. Results come only from the office's registered listings.	علاقہ، قسم، بجٹ اور بیڈ روم بتائیں۔ نتائج صرف دفتر کے درج شدہ اشتہارات سے ہیں۔
أبحث عن شقة…	I'm looking for an apartment…	میں ایک اپارٹمنٹ تلاش کر رہا ہوں…
طلب البحث	Search request	تلاش کی درخواست
مصادر أوسع. معلومة موثقة.	Wider sources. Documented information.	وسیع ذرائع۔ دستاویزی معلومات۔
بحث المكتب يشمل المحافظات الست ومناطقها. الاستيراد الخارجي يمر بمراجعة المصدر والتكرار والتوفر.	Office search covers all six governorates and their areas. Imported listings undergo source, duplicate and availability review.	دفتر کی تلاش چھوں محافظات اور ان کے علاقوں پر محیط ہے۔ باہر سے لائے گئے اشتہارات کے ماخذ، تکرار اور دستیابی کا جائزہ لیا جاتا ہے۔
وزارة التجارة والصناعة	Ministry of Commerce and Industry	وزارت تجارت و صنعت
متطلبات مزاولة مهنة السمسرة العقارية والتحقق من نشاط المكتب. المصدر الرسمي، ولا يوفر قائمة عروض تجارية مستوردة.	Official requirements for real estate brokerage and checking the office's business activity. This source does not supply imported commercial listings.	رئیل اسٹیٹ بروکریج کے تقاضوں اور دفتر کی کاروباری سرگرمی کی جانچ کا سرکاری ماخذ۔ یہ درآمد شدہ تجارتی اشتہارات کی فہرست فراہم نہیں کرتا۔
مرجع رسمي	Official reference	سرکاری حوالہ
البوابة الرقمية لإدارة العقار	Digital Real Estate Management Portal	رئیل اسٹیٹ انتظام کا ڈیجیٹل پورٹل
مدخل خدمات إدارة العقار التابعة لوزارة التجارة. استخدم الخدمات المتاحة لك بعد الدخول الرسمي.	Gateway to the Commerce Ministry's real estate management services. Use the services available to you after official sign-in.	وزارت تجارت کی رئیل اسٹیٹ انتظامی خدمات کا دروازہ۔ سرکاری لاگ اِن کے بعد اپنے لیے دستیاب خدمات استعمال کریں۔
خدمات رسمية	Official services	سرکاری خدمات
نظام الوسيط العقاري	Real Estate Broker System	رئیل اسٹیٹ بروکر نظام
خدمات الوسيط العقاري لدى الهيئة العامة للمعلومات المدنية. لا يستبدل ترخيص المكتب أو إثبات ملكية المعلن.	Broker services from the Public Authority for Civil Information. They do not replace office licensing or proof of the advertiser's ownership.	پبلک اتھارٹی فار سول انفارمیشن کی بروکر خدمات۔ یہ دفتر کے لائسنس یا مشتہر کی ملکیت کے ثبوت کا متبادل نہیں ہیں۔
خدمة رسمية	Official service	سرکاری خدمت
وزارة العدل — الإحصاءات	Ministry of Justice — Statistics	وزارت انصاف — اعداد و شمار
الرجوع إلى الإحصاءات والتقارير الرسمية المتاحة. لم يربط النظام تغذية مباشرة للأسعار أو الصفقات.	Consult available official statistics and reports. The system is not connected to a live price or transaction feed.	دستیاب سرکاری اعداد و شمار اور رپورٹس دیکھیں۔ نظام قیمتوں یا سودوں کی براہ راست فیڈ سے منسلک نہیں ہے۔
مرجع للبحث	Research reference	تحقیق کا حوالہ
توسيع البحث على الويب	Expand your web search	ویب پر تلاش بڑھائیں
ابحث في المصادر العامة باسم المنطقة ثم تحقق من تاريخ العرض وإذن المعلن قبل إدخاله في قاعدة المكتب.	Search public sources by area, then check the listing date and advertiser's permission before adding it to the office database.	علاقے کے نام سے عوامی ذرائع میں تلاش کریں، پھر دفتر کے ڈیٹا میں شامل کرنے سے پہلے اشتہار کی تاریخ اور مشتہر کی اجازت کی جانچ کریں۔
بحث خارجي	External search	بیرونی تلاش
افتح المصدر	Open source	ماخذ کھولیں
لا تُجمع أرقام العملاء أو تعليقاتهم الخاصة تلقائياً. استيراد إعلان لا يجعله موثق الملكية أو متاحاً حالياً.	Client numbers and private comments are not automatically collected. Importing a listing does not verify ownership or current availability.	کلائنٹس کے نمبر یا نجی تبصرے خودکار طور پر جمع نہیں کیے جاتے۔ اشتہار درآمد ہونے سے ملکیت یا موجودہ دستیابی کی تصدیق نہیں ہوتی۔
إعلاناتك. تحت متابعتك.	Your listings. Under your control.	آپ کے اشتہارات۔ آپ کی نگرانی میں۔
أضف عرضك بصوره وبياناته. يراجع المكتب المحتوى قبل إتاحته للزوار.	Submit your listing with its photos and details. The office reviews it before making it visible to visitors.	اپنا اشتہار تصاویر اور معلومات کے ساتھ درج کریں۔ زائرین کو دکھانے سے پہلے دفتر اس کا جائزہ لیتا ہے۔
سجّل الدخول لمتابعة إعلاناتك	Sign in to follow your listings	اپنے اشتہارات دیکھنے کے لیے لاگ اِن کریں
حسابات المالك والوسيط محفوظة في قاعدة المكتب.	Owner and broker accounts are saved in the office database.	مالک اور بروکر کے اکاؤنٹ دفتر کے ڈیٹا میں محفوظ ہیں۔
أرشفة الإعلان	Archive listing	اشتہار آرکائیو کریں
لا توجد إعلانات	No listings	کوئی اشتہار نہیں
ابدأ بإضافة العقار الأول.	Start by adding your first property.	اپنی پہلی جائیداد شامل کریں۔
كل متابعة في مكان واحد.	Every follow-up in one place.	تمام پیروی ایک جگہ۔
تابع طلباتك ومواعيدك والبحوث المحفوظة. الموعد لا يعد مؤكداً حتى يعتمد المكتب الطلب.	Follow your requests, appointments and saved searches. An appointment is confirmed only after the office approves it.	اپنی درخواستیں، ملاقاتیں اور محفوظ تلاشیں دیکھیں۔ ملاقات دفتر کی منظوری کے بعد ہی تصدیق شدہ ہوتی ہے۔
سجّل طلباً عقارياً	Submit a property request	جائیداد کی درخواست درج کریں
احجز موعداً	Book an appointment	ملاقات کی درخواست کریں
متابعة طلباتك تبدأ من حسابك	Track your requests from your account	اپنے اکاؤنٹ سے درخواستوں کی پیروی کریں
سجّل الدخول لعرض الطلبات والمواعيد.	Sign in to see requests and appointments.	درخواستیں اور ملاقاتیں دیکھنے کے لیے لاگ اِن کریں۔
الطلبات العقارية	Property requests	جائیداد کی درخواستیں
يتابع المكتب تفاصيل الطلب.	The office will follow up on the request details.	دفتر درخواست کی تفصیلات کی پیروی کرتا ہے۔
الميزانية:	Budget:	بجٹ:
لم تسجل أي طلب بعد.	You have not submitted a request yet.	آپ نے ابھی کوئی درخواست درج نہیں کی۔
المواعيد · توقيت الكويت	Appointments · Kuwait time	ملاقاتیں · کویت کا وقت
لا توجد مواعيد مسجلة.	No appointments recorded.	کوئی ملاقات درج نہیں۔
البحوث المحفوظة	Saved searches	محفوظ تلاشیں
تحدّث أعداد المطابقات عند فتح هذه الصفحة. لم يفعل إرسال تنبيهات بالبريد أو الواتساب.	Match counts update when this page opens. Email and WhatsApp notifications are not enabled.	یہ صفحہ کھلنے پر موزوں نتائج کی تعداد تازہ ہوتی ہے۔ ای میل اور واٹس ایپ کی اطلاع فعال نہیں ہے۔
عرض مطابق حالياً	currently matching listings	اس وقت موزوں اشتہارات
عرض النتائج	View results	نتائج دیکھیں
احفظ بحثاً من صفحة العقارات ليظهر هنا.	Save a search from the property page to show it here.	یہاں دکھانے کے لیے جائیدادوں کے صفحے سے تلاش محفوظ کریں۔
تفاصيل العقار	Property details	جائیداد کی تفصیلات
صورة للعقار مرفقة من المعلن	Property photo provided by the advertiser	مشتہر کی فراہم کردہ جائیداد کی تصویر
رسم توضيحي للواجهة؛ لم ترفق صور للعقار.	Illustrative facade; no property photos were supplied.	سامنے کے حصے کی وضاحتی تصویر؛ جائیداد کی تصاویر فراہم نہیں کی گئیں۔
مشاركة العقار	Share property	جائیداد شیئر کریں
هذا عرض أولي من البيانات المرفقة، يحتاج تأكيد السعر والتوفر الحاليين.	This is an initial listing from the supplied data. Current price and availability need confirmation.	یہ فراہم کردہ معلومات کا ابتدائی اشتہار ہے۔ موجودہ قیمت اور دستیابی کی تصدیق ضروری ہے۔
عن العقار	About the property	جائیداد کے بارے میں
البحث عن المنطقة على الخريطة	Find the area on the map	نقشے پر علاقہ تلاش کریں
الخريطة بحث باسم المنطقة ولا تحدد موقع العقار الدقيق أو تثبت الملكية.	The map searches the area name; it does not pinpoint the property or prove ownership.	نقشہ علاقے کے نام سے تلاش کرتا ہے؛ یہ جائیداد کا درست مقام یا ملکیت ثابت نہیں کرتا۔
طلب معاينة	Request a viewing	معائنے کی درخواست
سجّل اهتمامك	Register your interest	اپنی دلچسپی درج کریں
طباعة / PDF	Print / PDF	پرنٹ / PDF
الحد الأعلى للميزانية · د.ك	Maximum budget · KWD	زیادہ سے زیادہ بجٹ · کویتی دینار
تفاصيل إضافية	Additional details	اضافی تفصیلات
اذكر ما يهمك من مواصفات…	Tell us which features matter to you…	اپنی اہم مطلوبہ خصوصیات بتائیں…
مهتم بـ:	Interested in:	دلچسپی ہے:
أوافق على تواصل المكتب معي بخصوص هذا الطلب.	I agree to be contacted by the office about this request.	میں اس درخواست کے متعلق دفتر کے رابطے سے اتفاق کرتا ہوں۔
يُرسل الطلب للمكتب ويظهر في حسابك. لا ينفذ دفعاً أو حجز عقار.	The request is sent to the office and appears in your account. It does not make a payment or reserve a property.	درخواست دفتر کو بھیجی جاتی ہے اور آپ کے اکاؤنٹ میں دکھائی دیتی ہے۔ اس سے ادائیگی یا جائیداد کی بکنگ نہیں ہوتی۔
إرسال الطلب للمكتب	Send request to the office	درخواست دفتر کو بھیجیں
تم تسجيل الطلب	Request recorded	درخواست درج ہو گئی
عروض قد تطابقه	listings may match it	اشتہارات موزوں ہو سکتے ہیں
حجز موعد · توقيت الكويت	Book an appointment · Kuwait time	ملاقات کی درخواست · کویت کا وقت
المواعيد وفق الأيام والأوقات التي حددها المكتب. تصلك حالة الطلب في حسابك.	Appointments follow the days and times set by the office. Your request status appears in your account.	ملاقاتیں دفتر کے مقررہ دنوں اور اوقات کے مطابق ہیں۔ درخواست کی حالت آپ کے اکاؤنٹ میں آتی ہے۔
اختر موعداً	Choose an appointment	ملاقات کا وقت منتخب کریں
ملاحظة للمكتب	Note for the office	دفتر کے لیے نوٹ
طلب الموعد يحجز الوقت مؤقتاً، ويحتاج تأكيد المكتب.	The request holds the time temporarily and requires office confirmation.	درخواست وقت کو عارضی طور پر روکتی ہے اور دفتر کی تصدیق درکار ہوتی ہے۔
طلب الموعد	Request appointment	ملاقات کی درخواست بھیجیں
لم يحدد المكتب مواعيد متاحة	The office has not set available appointments	دفتر نے دستیاب اوقات مقرر نہیں کیے
تواصل مع المكتب لترتيب المعاينة.	Contact the office to arrange a viewing.	معائنہ طے کرنے کے لیے دفتر سے رابطہ کریں۔
سجل الموعد بانتظار تأكيد المكتب	Appointment requested; awaiting office confirmation	ملاقات کی درخواست درج ہے؛ دفتر کی تصدیق کا انتظار ہے
شقة أرضية للإيجار في…	Ground-floor apartment for rent in…	… میں کرائے کے لیے گراؤنڈ فلور اپارٹمنٹ
اختر المحافظة	Choose a governorate	محافظہ منتخب کریں
السعر · د.ك (اتركه فارغاً للاتفاق)	Price · KWD (leave blank for agreement)	قیمت · کویتی دینار (باہمی اتفاق کے لیے خالی چھوڑیں)
المساحة · م²	Area · m²	رقبہ · مربع میٹر
أدخل المواصفات المؤكدة…	Enter confirmed features…	تصدیق شدہ خصوصیات درج کریں…
صور العقار (اختياري)	Property photos (optional)	جائیداد کی تصاویر (اختیاری)
حتى ست صور، حتى 12 ميغابايت للصورة الأصلية. تُضغط الصور قبل إرسالها. استخدم صوراً تملك حق نشرها.	Up to six photos, with each original up to 12 MB. Photos are compressed before upload. Use photos you have the right to publish.	زیادہ سے زیادہ چھ تصاویر، ہر اصل تصویر 12 میگابائٹ تک۔ بھیجنے سے پہلے تصاویر چھوٹی کی جاتی ہیں۔ صرف وہ تصاویر استعمال کریں جن کی اشاعت کا حق آپ رکھتے ہوں۔
أقر بصحة البيانات وتفويضي بعرض العقار وحق نشر الصور.	I confirm the details are accurate and I am authorized to list the property and publish the photos.	میں معلومات کی درستگی اور جائیداد کی تشہیر اور تصاویر شائع کرنے کے اپنے اختیار کی تصدیق کرتا ہوں۔
الإعلان لا ينشر مباشرة. يتحقق المكتب من البيانات والتفويض قبل اعتماده.	Listings are not published immediately. The office checks the details and authorization before approval.	اشتہار فوراً شائع نہیں ہوتا۔ منظوری سے پہلے دفتر معلومات اور اجازت کی جانچ کرتا ہے۔
إرسال العقار للمراجعة	Submit property for review	جائیداد جائزے کے لیے بھیجیں
اختر ست صور بحد أقصى	Choose no more than six photos	زیادہ سے زیادہ چھ تصاویر منتخب کریں
الصورة الأصلية أكبر من 12 ميغابايت	The original photo exceeds 12 MB	اصل تصویر 12 میگابائٹ سے بڑی ہے
حُفظ الإعلان، وتعذر رفع إحدى الصور:	The listing was saved, but a photo could not be uploaded:	اشتہار محفوظ ہو گیا، مگر ایک تصویر اپ لوڈ نہ ہو سکی:
حُفظ الإعلان للمراجعة	Listing saved for review	اشتہار جائزے کے لیے محفوظ ہو گیا
صور مرفقة	photos attached	تصاویر منسلک
اختر صور JPEG أو PNG أو WebP	Choose JPEG, PNG or WebP photos	JPEG، PNG یا WebP تصاویر منتخب کریں
تعذر ضغط الصورة؛ اختر صورة أصغر	Unable to compress the photo; choose a smaller image	تصویر کا حجم کم نہیں ہو سکا؛ چھوٹی تصویر منتخب کریں
مرحباً، أود الاستفسار عن خدمات المكتب العقاري.	Hello, I would like to ask about the real estate office's services.	السلام علیکم، میں رئیل اسٹیٹ دفتر کی خدمات کے بارے میں دریافت کرنا چاہتا ہوں۔
المقارنة حتى ثلاثة عقارات؛ أزل عقاراً أولاً	You can compare up to three properties; remove one first	زیادہ سے زیادہ تین جائیدادوں کا موازنہ کر سکتے ہیں؛ پہلے ایک ہٹائیں
سيتوقف ظهور الإعلان ويحفظ في أرشيف المكتب.	The listing will stop being displayed and will remain in the office archive.	اشتہار دکھنا بند ہو جائے گا اور دفتر کے آرکائیو میں محفوظ رہے گا۔
تأكيد الأرشفة	Confirm archiving	آرکائیو کی تصدیق کریں
تمت أرشفة الإعلان	Listing archived	اشتہار آرکائیو ہو گیا
اسم البحث	Search name	تلاش کا نام
بحثي العقاري	My property search	میری جائیداد کی تلاش
سيظهر في طلباتي مع عدد المطابقات عند فتح الصفحة.	It will appear in My requests with the match count when the page opens.	صفحہ کھلنے پر یہ میری درخواستوں میں موزوں نتائج کی تعداد کے ساتھ ظاہر ہو گا۔
تم حفظ البحث في حسابك	Search saved to your account	تلاش آپ کے اکاؤنٹ میں محفوظ ہو گئی
تم نسخ رابط العقار	Property link copied	جائیداد کا لنک کاپی ہو گیا
مكتبك العقاري.	Your real estate office.	آپ کا رئیل اسٹیٹ دفتر۔
نحمّل العروض المسجلة لدى المكتب…	Loading the office's registered listings…	دفتر کے درج شدہ اشتہارات لوڈ ہو رہے ہیں…
تعذر الاتصال بالمكتب.	Unable to connect to the office.	دفتر سے رابطہ نہیں ہو سکا۔
العروض غير متاحة مؤقتاً	Listings are temporarily unavailable	اشتہارات عارضی طور پر دستیاب نہیں
لم يُحفظ أي طلب محلياً. أعد تحميل الصفحة أو تواصل مع المكتب.	No request was saved locally. Reload the page or contact the office.	کوئی درخواست مقامی طور پر محفوظ نہیں ہوئی۔ صفحہ دوبارہ لوڈ کریں یا دفتر سے رابطہ کریں۔
`);

const authUI = entries(`
تسجيل الخروج	Sign out	لاگ آؤٹ
تم تسجيل الخروج	Signed out	لاگ آؤٹ ہو گیا
إنشاء حساب	Create account	اکاؤنٹ بنائیں
تسجيل الدخول	Sign in	لاگ اِن
حساب جديد	New account	نیا اکاؤنٹ
الاسم الكامل	Full name	پورا نام
البريد الإلكتروني	Email address	ای میل
رقم الهاتف مع مفتاح الدولة	Phone number with country code	ملکی کوڈ کے ساتھ فون نمبر
كلمة المرور	Password	پاس ورڈ
نوع الحساب	Account type	اکاؤنٹ کی قسم
بيانات الحساب والطلبات تحفظ لدى المكتب. الإعلانات تخضع للمراجعة قبل النشر. البريد ورقم الهاتف غير موثقين تلقائياً.	Account and request data are stored by the office. Listings are reviewed before publication. Email addresses and phone numbers are not automatically verified.	اکاؤنٹ اور درخواست کی معلومات دفتر کے پاس محفوظ ہوتی ہیں۔ اشاعت سے پہلے اشتہارات کا جائزہ لیا جاتا ہے۔ ای میل اور فون نمبر کی خودکار تصدیق نہیں ہوتی۔
كلمة مرور الحساب مطلوبة. بيانات الإدارة والصلاحيات يتحقق منها الخادم.	Your account password is required. The server verifies administrator credentials and permissions.	اکاؤنٹ کا پاس ورڈ درکار ہے۔ سرور انتظامی معلومات اور اختیارات کی تصدیق کرتا ہے۔
إنشاء الحساب	Create account	اکاؤنٹ بنائیں
دخول	Sign in	لاگ اِن کریں
نسيت كلمة المرور	Forgot password	پاس ورڈ بھول گئے
تم تسجيل الدخول	Signed in	لاگ اِن ہو گیا
استعادة الحساب	Account recovery	اکاؤنٹ کی بحالی
تسجل الإدارة الطلب وتتحقق من هويتك قبل إعادة تعيين الدخول. الإرسال التلقائي للبريد غير مفعل.	The office records your request and verifies your identity before resetting access. Automatic recovery email is not enabled.	انتظامیہ درخواست درج کر کے رسائی بحال کرنے سے پہلے آپ کی شناخت کی تصدیق کرتی ہے۔ خودکار بحالی ای میل فعال نہیں ہے۔
تسجيل طلب الاستعادة	Submit recovery request	بحالی کی درخواست درج کریں
`);

const adminUI = entries(`
مساحة الإدارة	Administration	انتظامی جگہ
نظرة عامة	Overview	جائزہ
العقارات والمراجعة	Properties & review	جائیدادیں اور جائزہ
طلبات العملاء	Client requests	کلائنٹس کی درخواستیں
المعاينات والمواعيد	Viewings & appointments	معائنے اور ملاقاتیں
الصفقات والعمولات	Deals & commissions	سودے اور کمیشن
المستخدمون والصلاحيات	Users & permissions	صارفین اور اختیارات
استوديو المحتوى	Content studio	مواد کا اسٹوڈیو
الملفات والاستخلاص	Files & extraction	فائلیں اور استخراج
المسارات والتكاملات	Workflows & integrations	ورک فلو اور انضمام
سجل العمليات	Activity log	سرگرمیوں کا ریکارڈ
إعدادات المكتب	Office settings	دفتر کی ترتیبات
افتح موقع العملاء	Open client website	کلائنٹس کی ویب سائٹ کھولیں
حساب الإدارة	Administrator account	منتظم کا اکاؤنٹ
صلاحيات يتحقق منها الخادم	Permissions verified by the server	سرور سے تصدیق شدہ اختیارات
يتطلب تسجيل الدخول	Sign-in required	لاگ اِن درکار ہے
فتح قائمة الإدارة	Open administration menu	انتظامی مینو کھولیں
بيانات المكتب خاصة · سجل تدقيق لكل عملية	Private office data · Every operation is audited	دفتر کی نجی معلومات · ہر عمل کا آڈٹ ریکارڈ
لا مفاتيح سرية في ملفات الموقع.	No secret keys in website files.	ویب سائٹ کی فائلوں میں خفیہ کلیدیں نہیں۔
لا توجد سجلات	No records	کوئی ریکارڈ نہیں
تظهر البيانات هنا بعد تسجيل العمليات الفعلية.	Data appears here after actual operations are recorded.	حقیقی کارروائیاں درج ہونے پر معلومات یہاں ظاہر ہوتی ہیں۔
جارٍ تحميل بيانات المكتب…	Loading office data…	دفتر کی معلومات لوڈ ہو رہی ہیں…
هذه المساحة لإدارة المكتب.	This area is for office administrators.	یہ جگہ دفتر کے منتظمین کے لیے ہے۔
حسابك لا يملك صلاحية المدير. يمكنك متابعة طلباتك من موقع العملاء.	Your account does not have administrator access. You can follow your requests on the client website.	آپ کے اکاؤنٹ کو منتظم کے اختیارات حاصل نہیں۔ اپنی درخواستیں کلائنٹس کی ویب سائٹ پر دیکھ سکتے ہیں۔
افتح حساب العميل	Open client account	کلائنٹ اکاؤنٹ کھولیں
متصل بقاعدة المكتب	Connected to the office database	دفتر کے ڈیٹا بیس سے منسلک
تعذر تحميل بيانات المكتب	Unable to load office data	دفتر کی معلومات لوڈ نہیں ہو سکیں
لم تنفذ أي عملية تعذر تأكيد حفظها.	No operation was performed without confirming it was saved.	کوئی ایسا عمل نہیں کیا گیا جس کے محفوظ ہونے کی تصدیق نہ ہو سکی ہو۔
إدارة المكتب العقاري	Real estate office administration	رئیل اسٹیٹ دفتر کا انتظام
القرار يبدأ من هنا.	Decisions start here.	فیصلہ یہاں سے شروع ہوتا ہے۔
المراجعات والطلبات والمواعيد والعمولات في مساحة خاصة.	Reviews, requests, appointments and commissions in a private workspace.	جائزے، درخواستیں، ملاقاتیں اور کمیشن ایک نجی جگہ میں۔
دخول الإدارة	Administrator sign-in	منتظم لاگ اِن
لا تمنح كتابة رمز في رقم الهاتف أي صلاحية إدارية. الحساب يراجع على الخادم.	Entering a code as a phone number does not grant administrator access. Accounts are verified on the server.	فون نمبر میں کوئی کوڈ لکھنے سے انتظامی اختیار نہیں ملتا۔ اکاؤنٹ کی جانچ سرور پر ہوتی ہے۔
الحساب مسجل لكنه لا يملك صلاحية إدارة المكتب	The account is registered but has no office administrator permission	اکاؤنٹ درج ہے مگر اسے دفتر کے انتظام کا اختیار حاصل نہیں
إعداد آمن · يستخدم مرة واحدة	Secure setup · One-time use	محفوظ سیٹ اپ · صرف ایک بار استعمال
أنشئ حساب المدير.	Create the administrator account.	منتظم کا اکاؤنٹ بنائیں۔
هذا رابط إعداد خاص. بعد إنشاء الحساب، استخدم بريدك وكلمة مرورك للدخول.	This is a private setup link. After creating the account, sign in with your email and password.	یہ نجی سیٹ اپ لنک ہے۔ اکاؤنٹ بنانے کے بعد اپنی ای میل اور پاس ورڈ سے لاگ اِن کریں۔
اسم المدير	Administrator name	منتظم کا نام
بريد الإدارة	Administrator email	منتظم کی ای میل
رقم هاتف الإدارة	Administrator phone number	منتظم کا فون نمبر
كلمة مرور من 10 أحرف على الأقل	Password of at least 10 characters	کم از کم 10 حروف کا پاس ورڈ
إنشاء حساب المدير	Create administrator account	منتظم اکاؤنٹ بنائیں
تم إنشاء حساب المدير	Administrator account created	منتظم کا اکاؤنٹ بن گیا
صباح التفاصيل الواضحة.	Start with clear details.	واضح تفصیلات سے آغاز کریں۔
تابع ما يحتاج قرارك، من أول طلب إلى إغلاق الصفقة.	Follow what needs your decision, from the first request to closing the deal.	پہلی درخواست سے سودا مکمل ہونے تک فیصلے کے منتظر امور دیکھیں۔
عقارات منشورة	Published properties	شائع شدہ جائیدادیں
بانتظار المراجعة	Awaiting review	جائزے کا منتظر
طلبات عملاء جديدة	New client requests	کلائنٹس کی نئی درخواستیں
مواعيد تحتاج تأكيداً	Appointments awaiting confirmation	تصدیق کی منتظر ملاقاتیں
عروض أولية مستوردة من بيانات المشروع؛ تحتاج مراجعة التوفر قبل النشر كعروض معتمدة.	initial listings imported from project data; availability must be reviewed before publication as approved listings.	ابتدائی اشتہارات منصوبے کی معلومات سے درآمد کیے گئے؛ منظور شدہ اشتہارات کے طور پر اشاعت سے پہلے دستیابی کا جائزہ ضروری ہے۔
أولوية اليوم	Today's priorities	آج کی ترجیحات
اعتماد العروض ومعلومات السعر	Approve listings and price details	اشتہارات اور قیمت کی معلومات کی منظوری
افتح المراجعة ←	Open reviews →	جائزے کھولیں ←
مطابقة طلبات العملاء بالعروض	Match client requests to listings	کلائنٹس کی درخواستیں اشتہارات سے ملائیں
افتح الطلبات ←	Open requests →	درخواستیں کھولیں ←
تحديد أيام ومواعيد المعاينة	Set viewing days and times	معائنے کے دن اور اوقات مقرر کریں
اضبط الجدول ←	Set schedule →	شیڈول مقرر کریں ←
العمولات المستحقة	Commissions due	واجب الادا کمیشن
التفاعل المسجل	Recorded engagement	درج شدہ سرگرمی
تفاعل لحسابات مسجلة خلال 14 يوماً	interactions by registered accounts over 14 days	14 دنوں میں رجسٹرڈ اکاؤنٹس کی سرگرمیاں
هذه إحصاءات أحداث فعلية وليست عدد جميع زوار الموقع أو بيانات البلد والجهاز.	These are actual event statistics, not a count of all site visitors or country and device data.	یہ حقیقی واقعات کے اعداد و شمار ہیں، تمام زائرین کی تعداد یا ملک اور آلے کی معلومات نہیں۔
عرض التفاصيل	View details	تفصیلات دیکھیں
فتح واتساب	Open WhatsApp	واٹس ایپ کھولیں
مشاركة	Share	شیئر
بحث مسجل	Recorded search	درج شدہ تلاش
آخر العمليات	Recent activity	حالیہ سرگرمیاں
كل العمليات ←	All activity →	تمام سرگرمیاں ←
لا توجد عمليات مسجلة بعد.	No activity has been recorded yet.	ابھی کوئی سرگرمی درج نہیں ہوئی۔
كل عرض قبل أن يصل للعميل.	Review every listing before it reaches the client.	کلائنٹ تک پہنچنے سے پہلے ہر اشتہار کا جائزہ۔
راجع السعر والتوفر والتفويض والصور. لا يعني اعتماد البيانات تحققاً آلياً من الملكية.	Review price, availability, authorization and photos. Approving data does not automatically verify ownership.	قیمت، دستیابی، اجازت اور تصاویر کی جانچ کریں۔ معلومات کی منظوری سے ملکیت کی خودکار تصدیق نہیں ہوتی۔
بحث بالعنوان أو المنطقة	Search by title or area	عنوان یا علاقے سے تلاش کریں
بحث العقارات	Search properties	جائیدادیں تلاش کریں
استيراد إعلان	Import listing	اشتہار درآمد کریں
تصدير البيانات	Export data	ڈیٹا برآمد کریں
مراجعة	Review	جائزہ
إغلاق صفقة	Close deal	سودا مکمل کریں
مراجعة العقار	Review property	جائیداد کا جائزہ
تصحيح بيانات العقار	Correct property data	جائیداد کی معلومات درست کریں
تأكد من تفويض المعلن وصحة السعر والتوفر. العروض الأولية لم يتحقق من تاريخ توفرها.	Verify the advertiser's authorization, price and availability. Availability dates for initial listings have not been verified.	مشتہر کی اجازت، قیمت اور دستیابی کی تصدیق کریں۔ ابتدائی اشتہارات کی دستیابی کی تاریخ کی تصدیق نہیں ہوئی۔
قرار المراجعة	Review decision	جائزے کا فیصلہ
نشر العرض بعد التأكد	Publish after verification	تصدیق کے بعد شائع کریں
الإبقاء كبيانات أولية	Keep as initial data	ابتدائی معلومات کے طور پر رکھیں
إعادة للمراجعة	Return for review	جائزے کے لیے واپس بھیجیں
إيقاف مؤقت	Pause temporarily	عارضی طور پر روکیں
عدم اعتماد العرض	Do not approve listing	اشتہار منظور نہ کریں
حفظ القرار	Save decision	فیصلہ محفوظ کریں
حُفظ قرار المراجعة	Review decision saved	جائزے کا فیصلہ محفوظ ہو گیا
السعر · د.ك	Price · KWD	قیمت · کویتی دینار
تحفظ الصور والمواصفات السابقة، ويسجل التعديل في سجل العمليات. اعتماد الإعلان عملية مستقلة.	Existing photos and features are retained, and the edit is logged. Listing approval is a separate action.	سابقہ تصاویر اور خصوصیات برقرار رہتی ہیں اور ترمیم سرگرمیوں میں درج ہوتی ہے۔ اشتہار کی منظوری الگ عمل ہے۔
حفظ التصحيح	Save correction	درستگی محفوظ کریں
حُفظ تصحيح بيانات العقار	Property data correction saved	جائیداد کی درست کردہ معلومات محفوظ ہو گئیں
ملف العقار	Property file	جائیداد کی فائل
صورة مرفقة للعقار	Attached property photo	جائیداد کی منسلک تصویر
لم ترفق صور بالعقار.	No photos were attached to this property.	اس جائیداد کی تصاویر منسلک نہیں کی گئیں۔
المصدر:	Source:	ماخذ:
رابط المصدر:	Source link:	ماخذ کا لنک:
هاتف المعلن:	Advertiser's phone:	مشتہر کا فون:
طباعة ملف العقار	Print property file	جائیداد کی فائل پرنٹ کریں
استيراد إعلان ومراجعة مصدره	Import listing and review its source	اشتہار درآمد کریں اور ماخذ کا جائزہ لیں
الصق نص الإعلان	Paste listing text	اشتہار کا متن پیسٹ کریں
للإيجار بالجابرية…	For rent in Jabriya…	جابریہ میں کرائے کے لیے…
استخلاص بالقواعد المحلية. لا يخمن البرنامج الحقول الناقصة، ولا ينشر الإعلان قبل قرارك.	Uses local extraction rules. Missing fields are not guessed, and the listing is not published before your decision.	مقامی استخراج کے اصول استعمال ہوتے ہیں۔ نامکمل خانے قیاس سے نہیں بھرے جاتے اور آپ کے فیصلے سے پہلے اشتہار شائع نہیں ہوتا۔
استخلاص الحقول	Extract fields	خانے اخذ کریں
راجع الحقول المستخلصة	Review extracted fields	اخذ شدہ خانوں کا جائزہ لیں
حدد القسم	Select category	زمرہ منتخب کریں
حدد النوع	Select type	قسم منتخب کریں
حدد المحافظة	Select governorate	محافظہ منتخب کریں
اسم المصدر	Source name	ماخذ کا نام
رابط المصدر (إن وجد)	Source link (if available)	ماخذ کا لنک (اگر ہو)
لدي إذن استخدام الإعلان، وسأتحقق من التوفر والمعلومات قبل النشر.	I have permission to use the listing and will verify availability and details before publication.	مجھے اشتہار استعمال کرنے کی اجازت ہے اور اشاعت سے پہلے دستیابی اور معلومات کی تصدیق کروں گا۔
حفظ للمراجعة ومنع التكرار	Save for review and duplicate checking	جائزے اور تکرار کی جانچ کے لیے محفوظ کریں
من طلب إلى فرصة مناسبة.	From a request to a suitable opportunity.	درخواست سے موزوں موقع تک۔
المطابقة تراعي نوع العقار والقسم والمنطقة والميزانية والغرف، وتستبعد السعر المجهول إذا حدد العميل ميزانية.	Matching considers type, category, area, budget and bedrooms. Unknown prices are excluded when the client specifies a budget.	مطابقت میں قسم، زمرہ، علاقہ، بجٹ اور بیڈ روم دیکھے جاتے ہیں۔ کلائنٹ بجٹ بتائے تو نامعلوم قیمت والے اشتہارات خارج ہوتے ہیں۔
العميل والطلب	Client and request	کلائنٹ اور درخواست
مطابقات المكتب	Office matches	دفتر کے موزوں نتائج
عرض المطابقات	View matches	موزوں نتائج دیکھیں
تحديث المرحلة	Update stage	مرحلہ بدلیں
مطابقة الطلب بالعروض	Match request to listings	درخواست کو اشتہارات سے ملائیں
ملف العقار ←	Property file →	جائیداد کی فائل ←
لا توجد مطابقة كاملة	No complete match	مکمل مطابقت نہیں
لا يدرج النظام عرضاً بسعر مجهول داخل ميزانية محددة. يمكنك التواصل مع العميل لتعديل شروطه.	The system does not include unknown-price listings within a set budget. Contact the client if their criteria need changing.	نظام نامعلوم قیمت والے اشتہار کو مقررہ بجٹ میں شامل نہیں کرتا۔ شرائط بدلنے کے لیے کلائنٹ سے رابطہ کر سکتے ہیں۔
مرحلة متابعة الطلب	Request follow-up stage	درخواست کی پیروی کا مرحلہ
حفظ المرحلة	Save stage	مرحلہ محفوظ کریں
حدثت مرحلة الطلب	Request stage updated	درخواست کا مرحلہ بدل گیا
وقت المكتب، بترتيب واضح.	Office time, clearly organized.	دفتر کا وقت، واضح ترتیب کے ساتھ۔
الأوقات بتوقيت الكويت. طلب الموعد يحجز الوقت مؤقتاً؛ الإلغاء يفتح الموعد من جديد.	All times are Kuwait time. Requests hold a slot temporarily; cancellation makes it available again.	تمام اوقات کویت کے وقت کے مطابق ہیں۔ درخواست وقت عارضی طور پر روکتی ہے؛ منسوخی اسے دوبارہ دستیاب کر دیتی ہے۔
ضبط أيام وأوقات المعاينة	Set viewing days and times	معائنے کے دن اور اوقات مقرر کریں
التاريخ والوقت	Date and time	تاریخ اور وقت
الحالة والإجراء	Status and action	حالت اور عمل
عمولة مرتبطة بصفقة واتفاق.	Commission linked to a deal and an agreement.	سودے اور معاہدے سے منسلک کمیشن۔
المبالغ تحفظ بالفلس الكويتي. لا يؤكد النظام دفعاً بنكياً من مجرد الضغط على زر.	Amounts are stored in Kuwaiti fils. Pressing a button does not confirm a bank payment.	رقوم کویتی فلس میں محفوظ ہوتی ہیں۔ صرف بٹن دبانے سے بینک ادائیگی کی تصدیق نہیں ہوتی۔
عدد الصفقات المسجلة	Recorded deals	درج شدہ سودوں کی تعداد
إغلاق صفقة من ملف عقار	Close a deal from a property file	جائیداد کی فائل سے سودا مکمل کریں
تصدير السجل	Export records	ریکارڈ برآمد کریں
قيمة الصفقة	Deal value	سودے کی رقم
العمولة	Commission	کمیشن
الاتفاق والتحصيل	Agreement and collection	معاہدہ اور وصولی
تسجيل تحصيل بإيصال	Record collection with a receipt	رسید کے ساتھ وصولی درج کریں
إغلاق صفقة وتثبيت العمولة	Close deal and record commission	سودا مکمل کریں اور کمیشن درج کریں
أدخل قيمة الاتفاق النهائي وأساس العمولة. إغلاق الصفقة يوقف عرض العقار ويثبت سجل العمولة مرة واحدة.	Enter the final agreed value and commission basis. Closing removes the property from display and records commission once.	حتمی متفقہ رقم اور کمیشن کی بنیاد درج کریں۔ سودا بند ہونے پر جائیداد کی نمائش رکتی ہے اور کمیشن ایک بار درج ہوتا ہے۔
قيمة الصفقة أو أساس العمولة المتفق عليه · د.ك	Deal value or agreed commission basis · KWD	سودے کی رقم یا کمیشن کی متفقہ بنیاد · کویتی دینار
نسبة متفق عليها	Agreed percentage	متفقہ فی صد
مرجع اتفاق الوساطة	Brokerage agreement reference	بروکریج معاہدے کا حوالہ
أؤكد اكتمال الصفقة وصحة الاتفاق والمبلغ. هذه العملية لا تسحب أو تحول أي مبلغ.	I confirm the deal is complete and the agreement and amount are correct. This action does not withdraw or transfer money.	میں سودے کی تکمیل، معاہدے اور رقم کی درستگی کی تصدیق کرتا ہوں۔ یہ عمل رقم نکالتا یا منتقل نہیں کرتا۔
إغلاق الصفقة وتسجيل المستحق	Close deal and record amount due	سودا مکمل کریں اور واجب الادا رقم درج کریں
سجلت العمولة:	Commission recorded:	کمیشن درج ہو گیا:
تسجيل تحصيل العمولة	Record commission collection	کمیشن کی وصولی درج کریں
رقم إيصال أو مرجع تحويل تم التحقق منه	Verified receipt number or transfer reference	تصدیق شدہ رسید نمبر یا ٹرانسفر کا حوالہ
يسجل النظام التحصيل محاسبياً. لا يتصل بالبنك ولا ينفذ دفعة.	The system records collection for accounting. It does not connect to a bank or make a payment.	نظام حسابی طور پر وصولی درج کرتا ہے۔ یہ بینک سے رابطہ یا ادائیگی نہیں کرتا۔
راجعت الإيصال وأؤكد استلام المبلغ فعلياً.	I reviewed the receipt and confirm the amount was actually received.	میں نے رسید دیکھی ہے اور حقیقی رقم وصول ہونے کی تصدیق کرتا ہوں۔
حفظ سجل التحصيل	Save collection record	وصولی کا ریکارڈ محفوظ کریں
حُفظ مرجع التحصيل	Collection reference saved	وصولی کا حوالہ محفوظ ہو گیا
حسابات بصلاحيات واضحة.	Accounts with clear permissions.	واضح اختیارات والے اکاؤنٹس۔
الحساب الجديد لا يمنح نفسه الإدارة. يظل توثيق هوية المالك والوسيط مسؤولية المكتب قبل اعتماد الإعلان.	New accounts cannot grant themselves administration access. The office remains responsible for verifying owners and brokers before approving listings.	نیا اکاؤنٹ خود کو انتظامی اختیار نہیں دے سکتا۔ اشتہار منظور کرنے سے پہلے مالک اور بروکر کی شناخت کی تصدیق دفتر کی ذمہ داری ہے۔
انضم	Joined	شمولیت
ضبط الصلاحية	Set permissions	اختیارات مقرر کریں
صلاحيات المستخدم	User permissions	صارف کے اختیارات
حالة الحساب	Account status	اکاؤنٹ کی حالت
مفعل	Enabled	فعال
موقوف	Suspended	معطل
تغيير الصلاحيات ينهي جلسات المستخدم. لا يمكنك إيقاف حسابك أو تغيير دوره بنفسك.	Changing permissions ends the user's sessions. You cannot suspend your own account or change your own role.	اختیارات بدلنے سے صارف کی نشستیں ختم ہو جاتی ہیں۔ آپ خود اپنا اکاؤنٹ معطل یا کردار تبدیل نہیں کر سکتے۔
حفظ الصلاحيات	Save permissions	اختیارات محفوظ کریں
حفظت الصلاحيات	Permissions saved	اختیارات محفوظ ہو گئے
محتوى من بيانات العقار.	Content from property data.	جائیداد کی معلومات سے مواد۔
جهّز وصفاً ونسخة مشاركة ومخطط فيديو. المسودات لا تنشر تلقائياً ولا تضيف مواصفات غير مذكورة.	Prepare a description, sharing copy and video outline. Drafts are not published automatically and do not add unlisted features.	تفصیل، شیئر کرنے کا متن اور ویڈیو خاکہ تیار کریں۔ مسودے خودکار شائع نہیں ہوتے اور غیر مذکور خصوصیات شامل نہیں کرتے۔
اختر عقاراً	Choose a property	جائیداد منتخب کریں
اختر العقار	Choose property	جائیداد منتخب کریں
إنشاء حزمة المحتوى	Create content package	مواد کا پیکیج بنائیں
أرشيف حزم المحتوى	Content package archive	مواد کے پیکیجوں کا آرکائیو
مسودة	Draft	مسودہ
تنزيل الحزمة	Download package	پیکیج ڈاؤن لوڈ کریں
لا توجد حزم محفوظة بعد.	No packages saved yet.	ابھی کوئی پیکیج محفوظ نہیں۔
اختر عقاراً أولاً	Choose a property first	پہلے جائیداد منتخب کریں
نسخة الإعلان القابلة للتحرير	Editable listing copy	اشتہار کا قابل تدوین متن
مخطط فيديو 30 ثانية	30-second video outline	30 سیکنڈ کی ویڈیو کا خاکہ
التوقيت	Timing	وقت
النص	Text	متن
تحسين بمزود الذكاء الاصطناعي	Improve with AI provider	اے آئی فراہم کنندہ سے بہتر بنائیں
من مستند إلى بيانات قابلة للمراجعة.	From a document to reviewable data.	دستاویز سے قابل جائزہ معلومات تک۔
أرشيف خاص بالمكتب. استخلاص النصوص محلياً لا يثبت ملكية العقار ولا يراجع صحة المستند قانونياً.	A private office archive. Local text extraction does not establish property ownership or legally validate a document.	دفتر کا نجی آرکائیو۔ مقامی متن کا استخراج جائیداد کی ملکیت ثابت یا دستاویز کی قانونی صحت کی جانچ نہیں کرتا۔
حفظ ملف داخلي	Save internal file	اندرونی فائل محفوظ کریں
PDF أو نص أو CSV أو JSON	PDF, text, CSV or JSON	PDF، متن، CSV یا JSON
حتى 1.5 ميغابايت للملف في هذه النسخة. يحفظ الملف في قاعدة المكتب الخاصة ولا يرفع إلى GitHub.	Files are limited to 1.5 MB in this version. They are stored in the private office database and are not uploaded to GitHub.	اس نسخے میں فائل کی حد 1.5 میگابائٹ ہے۔ فائل دفتر کے نجی ڈیٹا بیس میں محفوظ ہوتی ہے اور GitHub پر اپ لوڈ نہیں ہوتی۔
رفع للأرشيف	Upload to archive	آرکائیو میں اپ لوڈ کریں
استخلاص إعلان من نص	Extract a listing from text	متن سے اشتہار اخذ کریں
الصق نص مستند أو إعلان، ثم راجع السعر والمنطقة والحقول الناقصة.	Paste document or listing text, then review the price, area and missing fields.	دستاویز یا اشتہار کا متن پیسٹ کریں، پھر قیمت، علاقے اور نامکمل خانوں کا جائزہ لیں۔
فتح أداة الاستخلاص	Open extraction tool	استخراج کا ٹول کھولیں
تحويل Word وPDF الممسوح وOCR يتطلب تشغيل موصل MarkItDown. لم يُفعّل هذا الموصل تلقائياً.	Word, scanned PDF and OCR conversion require the MarkItDown connector. This connector has not been enabled automatically.	Word، اسکین شدہ PDF اور OCR کی تبدیلی کے لیے MarkItDown کنیکٹر چلانا ضروری ہے۔ یہ کنیکٹر خودکار فعال نہیں ہوا۔
الملف	File	فائل
الحجم	Size	حجم
تنزيل بصلاحية الإدارة	Download with administrator access	منتظم کے اختیار سے ڈاؤن لوڈ کریں
الملف أكبر من 1.5 ميغابايت	The file exceeds 1.5 MB	فائل 1.5 میگابائٹ سے بڑی ہے
حُفظ الملف في الأرشيف الخاص	File saved to the private archive	فائل نجی آرکائیو میں محفوظ ہو گئی
حُفظت حالة الموعد	Appointment status saved	ملاقات کی حالت محفوظ ہو گئی
نماذج متاحة لدى المزود	Models available from the provider	فراہم کنندہ کے دستیاب ماڈل
هذه قائمة من المزود وقت الطلب؛ لا تؤكد مجانية الاستخدام.	This is the provider's list at the time of the request; it does not confirm free usage.	یہ درخواست کے وقت فراہم کنندہ کی فہرست ہے؛ مفت استعمال کی تصدیق نہیں۔
مسودة توليدية تحتاج المراجعة	AI draft requiring review	اے آئی کا مسودہ، جائزہ ضروری ہے
الاستخدام كما أعاده المزود:	Usage reported by the provider:	فراہم کنندہ کی بتائی گئی کھپت:
صدرت بيانات العمل دون كلمات المرور أو المفاتيح	Work data exported without passwords or keys	کام کا ڈیٹا پاس ورڈ اور کلیدوں کے بغیر برآمد ہو گیا
لا يمكن تنزيل الملف	Unable to download file	فائل ڈاؤن لوڈ نہیں ہو سکتی
`);

const integrationsUI = entries(`
مسار ذوق الواجهات	Interface design workflow	انٹرفیس ڈیزائن کا ورک فلو
واجهة عربية بخط Cairo، قائمة يمين، خط واضح، لوحة منفصلة وتجربة جوال.	Arabic interface with Cairo font, right-hand navigation, clear type, a separate dashboard and mobile support.	Cairo فونٹ والا عربی انٹرفیس، دائیں طرف مینو، واضح تحریر، الگ ڈیش بورڈ اور موبائل سہولت۔
مطبق	Implemented	نافذ
مسار البحث والمطابقة العقارية	Property search and matching workflow	جائیداد کی تلاش اور مطابقت کا ورک فلو
تطبيع الأرقام والهمزات، صيغة طبيعية، فلاتر مركبة، مقارنة ومفضلة ومطابقة الطلبات.	Normalizes numbers and Arabic letter variants, with natural phrasing, combined filters, comparison, favorites and request matching.	اعداد اور عربی حروف کی صورتوں کو یکساں کرنا، عام زبان، مشترکہ فلٹر، موازنہ، پسندیدہ اور درخواستوں کی مطابقت۔
يعمل	Working	کام کر رہا ہے
مسار الرصد والاستخلاص الذكي	Monitoring and extraction workflow	نگرانی اور استخراج کا ورک فلو
استخلاص النص الملصق، كشف الحقول الناقصة، مصدر لكل إعلان ومنع التكرار المطابق.	Extracts pasted text, identifies missing fields, records a source for each listing and prevents exact duplicates.	پیسٹ شدہ متن سے استخراج، نامکمل خانوں کی نشاندہی، ہر اشتہار کا ماخذ اور عین یکساں تکرار کی روک تھام۔
يعمل للنصوص	Working for text	متن کے لیے فعال
مسار علاقات العملاء	Client relationship workflow	کلائنٹ تعلقات کا ورک فلو
طلبات مركزية ومراحل متابعة من جديد إلى تفاوض وإغلاق.	Central requests and follow-up stages from new to negotiation and closure.	مرکزی درخواستیں اور نئی درخواست سے بات چیت اور بندش تک پیروی کے مراحل۔
مسار المواعيد والمعاينات	Appointments and viewings workflow	ملاقاتوں اور معائنوں کا ورک فلو
جدول يحدده المدير، توقيت الكويت، تأكيد وإلغاء ومنع حجز الوقت مرتين.	Administrator-defined schedule in Kuwait time, with confirmation, cancellation and prevention of double-booking.	منتظم کا مقررہ شیڈول، کویت کا وقت، تصدیق، منسوخی اور ایک وقت کی دو بکنگ کی روک تھام۔
يعمل بعد ضبط الجدول	Works after schedule setup	شیڈول مقرر ہونے کے بعد فعال
مسار الصلاحيات والتدقيق	Permissions and audit workflow	اختیارات اور آڈٹ کا ورک فلو
جلسات خادم، كلمات مرور مشتقة، خزنة مفاتيح مشفرة وسجل عمليات.	Server sessions, hashed passwords, an encrypted key vault and an activity log.	سرور کی نشستیں، ہیش شدہ پاس ورڈ، کلیدوں کا مرموز خزانہ اور سرگرمیوں کا ریکارڈ۔
مسار العمولة والتحصيل	Commission and collection workflow	کمیشن اور وصولی کا ورک فلو
سعر نهائي واتفاق، حساب بالفلس وسجل تحصيل مرجعه إيصال.	Final price and agreement, calculations in fils and collection records with receipt references.	حتمی قیمت اور معاہدہ، فلس میں حساب اور رسید کے حوالے کے ساتھ وصولی کا ریکارڈ۔
مسار التقارير والنسخ	Reports and backups workflow	رپورٹوں اور نقول کا ورک فلو
تصدير قاعدة العمل دون كلمات المرور أو المفاتيح، وطباعة المقارنة وملف العقار.	Exports work data without passwords or keys and prints comparisons and property files.	پاس ورڈ یا کلیدوں کے بغیر کام کا ڈیٹا برآمد کرنا، موازنہ اور جائیداد کی فائل پرنٹ کرنا۔
المسار المالي	Financial workflow	مالی ورک فلو
حد يومي للتوليد، تسجيل استهلاك المزود الفعلي دون ادعاء تكلفة غير مسعرة.	Daily generation limit and actual provider usage records, without claiming an unpriced cost.	یومیہ تخلیق کی حد اور فراہم کنندہ کی حقیقی کھپت کا ریکارڈ، نامعلوم لاگت کا دعویٰ کیے بغیر۔
ضبط من إعدادات المكتب	Set in office settings	دفتر کی ترتیبات میں مقرر کریں
مسار المحتوى العقاري	Property content workflow	جائیداد کے مواد کا ورک فلو
وصف ومسودة مشاركة ومخطط فيديو وأرشيف حزم قابل للتنزيل.	Descriptions, sharing drafts, video outlines and a downloadable package archive.	تفصیل، شیئر کرنے کا مسودہ، ویڈیو خاکہ اور ڈاؤن لوڈ ہونے والا پیکیج آرکائیو۔
يعمل كمسودات	Working as drafts	مسودوں کی صورت میں فعال
مسار نماذج NVIDIA	NVIDIA models workflow	NVIDIA ماڈلوں کا ورک فلو
تحسين الإعلان على الخادم، اختيار معرف النموذج والتحقق من قائمة المزود.	Server-side listing improvement, model ID selection and provider model-list checks.	سرور پر اشتہار بہتر بنانا، ماڈل کی شناخت منتخب کرنا اور فراہم کنندہ کی فہرست جانچنا۔
يتطلب مفتاحك ومعرف نموذج	Requires your key and a model ID	آپ کی کلید اور ماڈل کی شناخت درکار ہے
مسار الواتساب	WhatsApp workflow	واٹس ایپ کا ورک فلو
رابط تواصل المكتب يعمل الآن. تهيئة Meta Cloud API قابلة للحفظ في الخزنة؛ الإرسال الآلي غير مفعل.	The office contact link works now. Meta Cloud API settings can be saved in the vault; automatic sending is not enabled.	دفتر کے رابطے کا لنک فعال ہے۔ Meta Cloud API کی ترتیبات خزانے میں محفوظ ہو سکتی ہیں؛ خودکار پیغامات فعال نہیں۔
تواصل مباشر يعمل / API يحتاج ربط	Direct contact works / API connection required	براہ راست رابطہ فعال / API ربط درکار
مسار MarkItDown	MarkItDown workflow	MarkItDown کا ورک فلو
موصل خادم معزول لتحويل المستندات. النص الملصق يعمل؛ تحويل الملفات يحتاج تشغيل العامل.	An isolated server connector for document conversion. Pasted text works; file conversion requires the worker to run.	دستاویز کی تبدیلی کا الگ سرور کنیکٹر۔ پیسٹ شدہ متن فعال ہے؛ فائل کی تبدیلی کے لیے ورکر چلانا ضروری ہے۔
حزمة العامل مرفقة وغير منشورة	Worker package included, not deployed	ورکر پیکیج شامل ہے، تعینات نہیں
مسار الفيديو والتدوير	Video and repurposing workflow	ویڈیو اور دوبارہ استعمال کا ورک فلو
مخطط فيديو جاهز من العقار، ومرجع OpenShorts لتدوير جولة يزودك بها المكتب. لا يوجد رندر أو نشر تلقائي.	A property-based video outline and OpenShorts reference for repurposing a tour supplied by the office. No automatic rendering or publishing.	جائیداد سے تیار ویڈیو خاکہ اور دفتر کی فراہم کردہ سیر کو دوبارہ استعمال کرنے کا OpenShorts حوالہ۔ خودکار رینڈرنگ یا اشاعت نہیں۔
يتطلب عامل فيديو ومفاتيحه	Requires a video worker and its keys	ویڈیو ورکر اور اس کی کلیدیں درکار ہیں
غير مفعل	Not enabled	فعال نہیں
مسار وكيل الهاتف الذكي	Smartphone agent workflow	اسمارٹ فون ایجنٹ کا ورک فلو
سيناريو اختبار بحث وإعلان وحجز على Android وiPhone؛ يحتاج جهازاً مقترناً.	A search, listing and booking test scenario for Android and iPhone; requires a paired device.	Android اور iPhone پر تلاش، اشتہار اور بکنگ کی آزمائش کا منظرنامہ؛ منسلک آلہ درکار ہے۔
السيناريو مرفق / لا جهاز متصل	Scenario included / no device connected	منظرنامہ شامل / کوئی آلہ منسلک نہیں
مسار مساعد التطوير	Development assistant workflow	ترقیاتی معاون کا ورک فلو
مرجع free-claude-code لتطوير المصدر في بيئة معزولة، دون إعطاء زائر الموقع صلاحية تنفيذ أوامر.	A free-claude-code reference for source development in an isolated environment, without giving website visitors command-execution access.	الگ ماحول میں سورس کی تیاری کے لیے free-claude-code حوالہ، ویب سائٹ کے زائر کو کمانڈ چلانے کا اختیار دیے بغیر۔
أداة تطوير خارج خدمة العملاء	Development tool outside client services	کلائنٹ خدمات سے الگ ترقیاتی ٹول
مسار البحث في التعليقات	Public comment research workflow	عوامی تبصروں کی تحقیق کا ورک فلو
قائمة بحث عامة وتوثيق المصدر قبل إدخال فرصة. لم يشغل جمع آلي أو رسائل للأشخاص.	A public research checklist and source documentation before adding an opportunity. No automatic collection or messages to people have been run.	موقع شامل کرنے سے پہلے عوامی تحقیق کی فہرست اور ماخذ کی دستاویز بندی۔ خودکار جمع آوری یا افراد کو پیغامات نہیں چلائے گئے۔
بحث خارجي بمراجعة بشرية	External research with human review	انسانی جائزے کے ساتھ بیرونی تحقیق
المسارات التي تخدم المكتب.	Workflows that serve the office.	دفتر کے کام آنے والے ورک فلو۔
الحالة تعكس الوظيفة الفعلية. وجود موصل أو ملف إعداد لا يعني أن حساب المزود متصل أو أن الفيديو والدفع يعملان.	Status reflects actual functionality. A connector or configuration file does not mean a provider account is connected or that video and payments are working.	حالت حقیقی فعالیت ظاہر کرتی ہے۔ کنیکٹر یا ترتیب کی فائل ہونے سے فراہم کنندہ کا اکاؤنٹ منسلک، یا ویڈیو اور ادائیگی فعال نہیں ہو جاتے۔
مسارات بوظائف منفذة	workflows with implemented functions	نافذ افعال والے ورک فلو
مسارات بتهيئة أو متطلبات خارجية.	workflows requiring configuration or external services.	ترتیب یا بیرونی خدمات کے محتاج ورک فلو۔
تهيئة NVIDIA	Configure NVIDIA	NVIDIA ترتیب دیں
تهيئة واتساب API	Configure WhatsApp API	واٹس ایپ API ترتیب دیں
محفوظ	Saved	محفوظ
التحقق من النماذج	Check models	ماڈل جانچیں
تهيئة مزود NVIDIA	Configure NVIDIA provider	NVIDIA فراہم کنندہ ترتیب دیں
يحفظ المفتاح مشفراً على الخادم، ولا يعاد عرضه أو إرساله لملفات GitHub. لا يجرب النموذج تلقائياً.	The key is encrypted on the server and is not shown again or sent to GitHub files. The model is not tested automatically.	کلید سرور پر مرموز محفوظ ہوتی ہے، دوبارہ دکھائی یا GitHub فائلوں کو بھیجی نہیں جاتی۔ ماڈل کی خودکار آزمائش نہیں ہوتی۔
مفتاح جديد (اتركه فارغاً للاحتفاظ بالمحفوظ)	New key (leave blank to keep the saved key)	نئی کلید (محفوظ کلید رکھنے کے لیے خالی چھوڑیں)
مفتاح NVIDIA API	NVIDIA API key	NVIDIA API کلید
معرف النموذج كما يورده المزود	Model ID exactly as supplied by the provider	ماڈل کی شناخت عین فراہم کنندہ کے مطابق
المعرف الدقيق من قائمة النماذج	Exact ID from the model list	ماڈلوں کی فہرست سے عین شناخت
تفعيل توليد مسودات الإعلانات	Enable listing draft generation	اشتہارات کے مسودوں کی تخلیق فعال کریں
السقف اليومي في إعدادات المكتب. لا يعني توفر نموذج أن استخدامه مجاني؛ راجع حسابك لدى المزود.	The daily limit is in office settings. Model availability does not mean usage is free; check your provider account.	یومیہ حد دفتر کی ترتیبات میں ہے۔ ماڈل دستیاب ہونے سے استعمال مفت نہیں ہو جاتا؛ فراہم کنندہ کا اپنا اکاؤنٹ دیکھیں۔
حفظ في خزنة الخادم	Save to server vault	سرور کے خزانے میں محفوظ کریں
حُفظ إعداد المزود	Provider settings saved	فراہم کنندہ کی ترتیبات محفوظ ہو گئیں
تهيئة WhatsApp Cloud API	Configure WhatsApp Cloud API	WhatsApp Cloud API ترتیب دیں
التواصل المباشر عبر الرابط يعمل. هذه تهيئة ربط API؛ لم يفعل إرسال آلي أو تحقق OTP. لا يوصل رقم المكتب عبر QR تلقائياً.	Direct contact via the link works. These are API connection settings; automatic messages and OTP verification are not enabled. The office number is not connected automatically by QR.	لنک سے براہ راست رابطہ فعال ہے۔ یہ API ربط کی ترتیب ہے؛ خودکار پیغامات اور OTP تصدیق فعال نہیں۔ دفتر کا نمبر QR سے خودکار منسلک نہیں ہوتا۔
رمز Meta طويل الصلاحية	Long-lived Meta token	طویل مدت کا Meta ٹوکن
Phone Number ID من Meta	Phone Number ID from Meta	Meta کا Phone Number ID
إصدار Graph API المدعوم في حسابك	Graph API version supported by your account	آپ کے اکاؤنٹ کا معاون Graph API ورژن
يتطلب الإرسال الإنتاجي اعتماد الرقم والقوالب واستقبال Webhooks والتحقق من موافقة المستلم. لم تُنفذ أي رسالة في هذه النسخة.	Production messaging requires number and template approval, webhooks and recipient consent checks. No messages have been sent in this version.	اصل استعمال میں پیغامات کے لیے نمبر اور سانچوں کی منظوری، Webhooks اور وصول کنندہ کی رضامندی کی جانچ ضروری ہے۔ اس نسخے میں کوئی پیغام نہیں بھیجا گیا۔
حفظ إعداد الربط فقط	Save connection settings only	صرف ربط کی ترتیبات محفوظ کریں
حُفظت التهيئة؛ الإرسال الآلي غير مفعل	Configuration saved; automatic sending is not enabled	ترتیب محفوظ ہو گئی؛ خودکار ارسال فعال نہیں
المكتب يعمل بشروطك.	Your office, your settings.	آپ کا دفتر، آپ کی ترتیبات۔
بيانات التواصل والجدول وحدود التوليد تطبق على الخادم. لا يوجد معدل عمولة مفروض على كل الصفقات.	Contact details, schedule and generation limits apply on the server. No single commission rate is imposed on all deals.	رابطے کی معلومات، شیڈول اور تخلیق کی حدیں سرور پر نافذ ہوتی ہیں۔ تمام سودوں پر ایک کمیشن شرح لازم نہیں۔
الهوية والتواصل	Identity and contact	شناخت اور رابطہ
اسم المكتب	Office name	دفتر کا نام
العبارة التعريفية	Tagline	تعارفی عبارت
اسم مسؤول التواصل	Contact person's name	رابطے کے ذمہ دار کا نام
رقم واتساب المكتب	Office WhatsApp number	دفتر کا واٹس ایپ نمبر
بريد المكتب	Office email	دفتر کی ای میل
رقم الترخيص (يضاف بعد التحقق)	License number (add after verification)	لائسنس نمبر (تصدیق کے بعد شامل کریں)
عنوان المكتب	Office address	دفتر کا پتہ
جدول المعاينات · توقيت الكويت	Viewing schedule · Kuwait time	معائنے کا شیڈول · کویت کا وقت
إتاحة حجز المواعيد للزوار المسجلين	Allow registered visitors to request appointments	رجسٹرڈ زائرین کو ملاقات کی درخواست کی اجازت دیں
بداية الدوام	Opening time	کام شروع ہونے کا وقت
نهاية الدوام	Closing time	کام ختم ہونے کا وقت
مدة الموعد بالدقائق	Appointment duration in minutes	ملاقات کا دورانیہ منٹ میں
30 دقيقة	30 minutes	30 منٹ
60 دقيقة	60 minutes	60 منٹ
موعد واحد في كل فترة؛ الأيام الـ14 المقبلة. المواعيد السابقة تبقى في السجل حتى تغير حالتها.	One appointment per slot for the next 14 days. Existing appointments remain in the record until their status changes.	اگلے 14 دنوں میں ہر وقت پر ایک ملاقات۔ سابقہ ملاقاتیں حالت بدلنے تک ریکارڈ میں رہتی ہیں۔
الحد المالي للتوليد	Generation spending control	تخلیق کی مالی حد
أقصى عدد طلبات توليد للمكتب في اليوم	Maximum daily generation requests for the office	دفتر کی یومیہ تخلیقی درخواستوں کی زیادہ سے زیادہ تعداد
صفر يوقف التوليد. هذا سقف للطلبات، وليس قياساً لرصيد الحساب أو سعر التوكن. تظهر إحصاءات الاستخدام الفعلية في سجل العمليات.	Zero disables generation. This caps requests; it does not measure account balance or token price. Actual usage statistics appear in the activity log.	صفر سے تخلیق بند ہو جاتی ہے۔ یہ درخواستوں کی حد ہے، اکاؤنٹ بیلنس یا ٹوکن کی قیمت کا پیمانہ نہیں۔ حقیقی کھپت کے اعداد سرگرمیوں میں دکھائی دیتے ہیں۔
حفظ إعدادات المكتب	Save office settings	دفتر کی ترتیبات محفوظ کریں
تنزيل نسخة من بيانات العمل	Download a copy of work data	کام کے ڈیٹا کی نقل ڈاؤن لوڈ کریں
حُفظت الإعدادات وطبقت على الخادم	Settings saved and applied on the server	ترتیبات محفوظ اور سرور پر نافذ ہو گئیں
إعلان بانتظار المراجعة	Listing awaiting review	جائزے کا منتظر اشتہار
قرار مراجعة عقار	Property review decision	جائیداد کے جائزے کا فیصلہ
تعديل عقار	Property edited	جائیداد میں ترمیم
أرشفة عقار	Property archived	جائیداد آرکائیو
طلب عقاري جديد	New property request	جائیداد کی نئی درخواست
تحديث متابعة طلب	Request follow-up updated	درخواست کی پیروی تازہ
تحديث موعد	Appointment updated	ملاقات تازہ
ملف مرفق	File attached	فائل منسلک
تحديث إعداد مزود	Provider configuration updated	فراہم کنندہ کی ترتیب تازہ
تحديث إعدادات المكتب	Office settings updated	دفتر کی ترتیبات تازہ
تعديل الصلاحيات	Permissions changed	اختیارات میں تبدیلی
توليد مسودة إعلان	Listing draft generated	اشتہار کا مسودہ تیار
حزمة محتوى	Content package	مواد کا پیکیج
تصدير نسخة بيانات	Data copy exported	ڈیٹا کی نقل برآمد
طلب استعادة حساب	Account recovery request	اکاؤنٹ بحالی کی درخواست
من غيّر ماذا، ومتى.	Who changed what, and when.	کس نے کیا اور کب بدلا۔
سجل العمليات على الخادم. لا يتضمن كلمات المرور أو مفاتيح المزودين.	Activity is logged on the server. It does not include passwords or provider keys.	سرگرمیاں سرور پر درج ہوتی ہیں۔ ان میں پاس ورڈ یا فراہم کنندگان کی کلیدیں شامل نہیں۔
طلب عام	Public request	عام درخواست
`);

const assistantUI = entries(`
مساعد المكتب	Office assistant	دفتر کا معاون
اسأل المساعد	Ask the assistant	معاون سے پوچھیں
إغلاق المساعد	Close assistant	معاون بند کریں
ابحث واستفسر بالكتابة أو الصوت	Search and ask by text or voice	لکھ کر یا بول کر تلاش اور سوال کریں
ابدأ التحدث	Start speaking	بولنا شروع کریں
إيقاف الاستماع	Stop listening	سننا بند کریں
قراءة الرد صوتياً	Read response aloud	جواب بلند آواز سے پڑھیں
إيقاف الصوت	Stop audio	آواز بند کریں
الرد الصوتي التلقائي	Automatic spoken responses	خودکار صوتی جوابات
جارٍ الاستماع…	Listening…	سن رہا ہے…
أبحث في عروض المكتب…	Searching the office listings…	دفتر کے اشتہارات میں تلاش جاری ہے…
ميزة التحدث غير متاحة في هذا المتصفح. يمكنك الكتابة.	Speech input is unavailable in this browser. You can type instead.	اس براؤزر میں بول کر لکھنے کی سہولت دستیاب نہیں۔ آپ لکھ سکتے ہیں۔
لم يسمح المتصفح باستخدام الميكروفون.	The browser did not allow microphone access.	براؤزر نے مائیکروفون استعمال کرنے کی اجازت نہیں دی۔
لم أسمع كلاماً واضحاً. حاول مرة أخرى.	I did not hear clear speech. Please try again.	بات واضح سنائی نہیں دی۔ دوبارہ کوشش کریں۔
لا يوجد صوت لهذه اللغة على جهازك.	No voice for this language is available on your device.	آپ کے آلے میں اس زبان کی آواز دستیاب نہیں۔
قراءة النص غير متاحة في هذا المتصفح.	Text-to-speech is unavailable in this browser.	اس براؤزر میں متن کی صوتی خواندگی دستیاب نہیں۔
اكتب سؤالك عن العقارات أو المواعيد…	Ask about properties or appointments…	جائیدادوں یا ملاقاتوں کے بارے میں سوال لکھیں…
إرسال	Send	بھیجیں
محادثة جديدة	New conversation	نئی گفتگو
عرض تفاصيل العقار	View property details	جائیداد کی تفصیلات دیکھیں
عرض النتائج في البحث	Show results in search	تلاش میں نتائج دکھائیں
مرحباً، أساعدك في البحث عن العقارات والمقارنة وترتيب المعاينة. ما المنطقة والميزانية المناسبتان لك؟	Hello, I can help you search for properties, compare them and arrange a viewing. What area and budget suit you?	السلام علیکم، میں جائیداد تلاش کرنے، موازنہ کرنے اور معائنہ طے کرنے میں مدد کرتا ہوں۔ آپ کا مطلوبہ علاقہ اور بجٹ کیا ہے؟
أرسل رسالة للمساعد	Send a message to the assistant	معاون کو پیغام بھیجیں
شغّل الرد الصوتي	Turn on spoken responses	صوتی جواب فعال کریں
أوقف الرد الصوتي	Turn off spoken responses	صوتی جواب بند کریں
الميكروفون يعمل بعد ضغطك على زر التحدث فقط.	The microphone works only after you press the speak button.	مائیکروفون صرف بولنے کا بٹن دبانے کے بعد کام کرتا ہے۔
المعلومات من قاعدة المكتب، ويؤكد المكتب التوفر قبل الحجز.	Information comes from the office database; the office confirms availability before booking.	معلومات دفتر کے ڈیٹا بیس سے ہیں؛ بکنگ سے پہلے دفتر دستیابی کی تصدیق کرتا ہے۔
تعذر الاتصال بخدمة التعرف الصوتي. يمكنك الكتابة.	Unable to connect to speech recognition. You can type instead.	آواز کی شناخت کی خدمت سے رابطہ نہیں ہو سکا۔ آپ لکھ سکتے ہیں۔
ابدأ المحادثة	Start conversation	گفتگو شروع کریں
مساعد للعقار بالصوت والكتابة	Property assistant by voice and text	آواز اور تحریر سے جائیداد کا معاون
اسأل عن المنطقة والميزانية والمواعيد، أو اضغط الميكروفون للتحدث.	Ask about areas, budgets and appointments, or tap the microphone to speak.	علاقے، بجٹ اور ملاقاتوں کے بارے میں پوچھیں، یا بولنے کے لیے مائیکروفون دبائیں۔
إغلاق المحادثة	Close conversation	گفتگو بند کریں
أنت	You	آپ
المساعد	Assistant	معاون
الصوت متاح حسب أصوات جهازك ومتصفحك.	Speech availability depends on the voices on your device and browser.	آواز کی دستیابی آپ کے آلے اور براؤزر کی آوازوں پر منحصر ہے۔
`);

const initialListings = entries(`
أرض جنوب صباح الأحمد N3 بطن وظهر	Land in South Sabah Al Ahmad N3, front and rear streets	جنوبی صباح الاحمد N3 میں زمین، سامنے اور پیچھے سڑکیں
جنوب صباح الأحمد N3	South Sabah Al Ahmad N3	جنوبی صباح الاحمد N3
بطن وظهر مقابل جزيرة، بجانب المسجد، مدخل ومخرج سهل. رقم الأرض 7. المطلوب البدل مع المطلاع أو جنوب سعد العبدالله — عموم المنطقة الرابعة. المبلغ المذكور فرق البدل ويحتاج تأكيد.	Front and rear streets, opposite a traffic island, beside the mosque, with easy access. Plot 7. Seeking an exchange in Mutlaa or South Saad Al Abdullah, across the fourth area. The amount shown is the exchange difference and needs confirmation.	سامنے اور پیچھے سڑکیں، ٹریفک جزیرے کے سامنے، مسجد کے پاس، آمد و رفت آسان۔ پلاٹ نمبر 7۔ مطلاع یا جنوبی سعد العبداللہ، عمومی طور پر چوتھے علاقے میں تبادلہ مطلوب ہے۔ درج رقم تبادلے کی اضافی رقم ہے اور اس کی تصدیق ضروری ہے۔
قسيمة صباح الأحمد بطن وظهر ونافذ	Sabah Al Ahmad plot, front and rear streets and through road	صباح الاحمد کا پلاٹ، سامنے اور پیچھے سڑکیں اور آر پار سڑک
أرض موقع بطن وظهر ونافذ. التسليف والمدعوم موجود حسب النص الأصلي. الرغبة: البدل مع المطلاع سد نافذ. 70 ألفاً مع البدل؛ يُرجى تأكيد التفاصيل والمستندات.	Land with front and rear streets and a through road. Loan and subsidized support are available according to the original text. Seeking an exchange in Mutlaa for a single-frontage plot with a through road. The stated exchange difference is 70,000; please confirm the details and documents.	زمین کے سامنے اور پیچھے سڑکیں اور آر پار سڑک ہے۔ اصل متن کے مطابق قرض اور سبسڈی دستیاب ہیں۔ مطلاع میں ایک طرف سڑک اور آر پار راستے والے پلاٹ سے تبادلہ مطلوب ہے۔ درج تبادلے کی اضافی رقم 70,000 ہے؛ تفصیلات اور دستاویزات کی تصدیق کریں۔
قسيمة بالمطلاع N5 زاوية داخلية	Mutlaa N5 plot on an internal corner	مطلاع N5 میں اندرونی کونے کا پلاٹ
المطلاع N5 — قطعة 3	Mutlaa N5 — Block 3	مطلاع N5 — بلاک 3
زاوية داخلية وارتداد مشترك 42×9. بنيان أسود ثلاثة أدوار وربع وجاري التشطيب وفق النص الأصلي. توجد مبالغ متبقية للنوافذ والتكييف. المطلوب قسيمة أو بيت في جابر الأحمد أو خيطان أو جنوب عبدالله المبارك.	Internal corner with a shared 42×9 setback. A structural shell of three and a quarter floors, with finishing in progress according to the original text. Outstanding amounts remain for windows and air conditioning. Seeking a plot or house in Jaber Al Ahmad, Khaitan or South Abdullah Al Mubarak.	اندرونی کونا اور مشترکہ 42×9 سیٹ بیک جگہ۔ اصل متن کے مطابق سوا تین منزلوں کا بنیادی ڈھانچہ ہے اور فنشنگ جاری ہے۔ کھڑکیوں اور ایئر کنڈیشننگ کی کچھ رقم باقی ہے۔ جابر الاحمد، خیطان یا جنوبی عبداللہ المبارک میں پلاٹ یا مکان مطلوب ہے۔
بيت بالمطلاع N4 ثلاثة أدوار وخدمات	Mutlaa N4 house with three floors and service areas	مطلاع N4 میں تین منزلہ مکان اور سروس حصے
المطلاع N4	Mutlaa N4	مطلاع N4
قسيمة مكونة من ثلاثة أدوار وخدمات، وصلت مرحلة الديكور حسب النص الأصلي. عازل بالكامل، موقع سد. البدل مع أرض فضاء سد.	A property with three floors and service areas, at the decoration stage according to the original text. Fully insulated, with single-frontage positioning. Seeking exchange for a vacant single-frontage plot.	تین منزلوں اور سروس حصوں والی جائیداد، اصل متن کے مطابق سجاوٹ کے مرحلے میں۔ مکمل انسولیشن، ایک طرف سڑک والا مقام۔ ایک طرف سڑک والے خالی پلاٹ سے تبادلہ مطلوب ہے۔
شقة أرضية للإيجار في العمرية ق3	Ground-floor apartment for rent in Omariya, Block 3	عمریہ بلاک 3 میں کرائے کے لیے گراؤنڈ فلور اپارٹمنٹ
العمرية — قطعة 3	Omariya — Block 3	عمریہ — بلاک 3
دور أرضي: ثلاث غرف منها ماستر، صالة، مطبخ مجهز، غرفة خادمة وموقف واحد. تأمين شهر حسب النص. البيت جديد وأول ساكن حسب العرض الأصلي؛ يحتاج تأكيد التوفر والمواصفات الحالية.	Ground floor: three bedrooms including one master, a living room, fitted kitchen, domestic staff room and one parking space. One month's deposit according to the text. The original listing describes a new house and first occupancy; current availability and features need confirmation.	گراؤنڈ فلور: تین بیڈ روم، ایک ماسٹر، ہال، تیار کچن، گھریلو عملے کا کمرہ اور ایک پارکنگ۔ متن کے مطابق ایک ماہ کی ضمانتی رقم۔ اصل اشتہار میں نیا مکان اور پہلی رہائش بتائی گئی ہے؛ موجودہ دستیابی اور خصوصیات کی تصدیق ضروری ہے۔
بيت للإيجار بالمطلاع N9 دورين وثلث	House for rent in Mutlaa N9, two and a third floors	مطلاع N9 میں کرائے کا مکان، دو اور ایک تہائی منزلیں
المطلاع N9	Mutlaa N9	مطلاع N9
الأرضي: غرفتان ماستر، ديوانية ومنافعها، صالة استقبال وصالة معيشة ومطبخ مع غرفة ثلاجات. الأول: شقتان، كل شقة ثلاث غرف منها ماستر وصالة ومطبخ وغرفة غسيل وخادمة. السعر والتوفر يحتاجان تأكيداً.	Ground floor: two master bedrooms, a diwaniya with facilities, reception room, living room and kitchen with a refrigerator room. First floor: two apartments, each with three bedrooms including one master, a living room, kitchen, laundry and domestic staff room. Price and availability need confirmation.	گراؤنڈ فلور: دو ماسٹر بیڈ روم، سہولیات کے ساتھ دیوانیہ، استقبالیہ ہال، رہائشی ہال اور فریج روم کے ساتھ کچن۔ پہلی منزل: دو اپارٹمنٹ، ہر ایک میں تین بیڈ روم جن میں ایک ماسٹر، ہال، کچن، لانڈری اور گھریلو عملے کا کمرہ۔ قیمت اور دستیابی کی تصدیق ضروری ہے۔
شقق بعمارة في السالمية — 14 دوراً	Apartments in a Salmiya building — 14 floors	سالمیہ کی عمارت میں اپارٹمنٹ — 14 منزلیں
عمارة 14 دوراً، شقة في كل دور. الشقة: ثلاث غرف وصالة وحمامان ومطبخ. 600 د.ك إيجار الشقة شهرياً، وليس إجمالي العمارة. طلب تأجير لشركة أو جهة مماثلة حسب النص الأصلي.	A 14-floor building with one apartment on each floor. Each apartment has three bedrooms, a living room, two bathrooms and a kitchen. Rent is KWD 600 per apartment per month, not for the whole building. A company or similar organization is sought as tenant according to the original text.	14 منزلہ عمارت، ہر منزل پر ایک اپارٹمنٹ۔ اپارٹمنٹ میں تین بیڈ روم، ہال، دو غسل خانے اور کچن۔ کرایہ فی اپارٹمنٹ ماہانہ 600 کویتی دینار ہے، پوری عمارت کا نہیں۔ اصل متن کے مطابق کسی کمپنی یا اسی نوعیت کے ادارے کو کرایے پر دینا مطلوب ہے۔
شقتان للإيجار في الجابرية ق3	Two apartments for rent in Jabriya, Block 3	جابریہ بلاک 3 میں دو اپارٹمنٹ کرائے کے لیے
الجابرية — قطعة 3	Jabriya — Block 3	جابریہ — بلاک 3
كل شقة ثلاث غرف وثلاثة حمامات وصالة ومطبخ. 450 د.ك للشقة شهرياً وفق العرض الأصلي. التوفر الحالي يحتاج تأكيداً.	Each apartment has three bedrooms, three bathrooms, a living room and a kitchen. KWD 450 per apartment per month according to the original listing. Current availability needs confirmation.	ہر اپارٹمنٹ میں تین بیڈ روم، تین غسل خانے، ہال اور کچن۔ اصل اشتہار کے مطابق فی اپارٹمنٹ ماہانہ 450 کویتی دینار۔ موجودہ دستیابی کی تصدیق ضروری ہے۔
شقق للإيجار بالفنطاس ق2	Apartments for rent in Fintas, Block 2	فنطاس بلاک 2 میں اپارٹمنٹ کرائے کے لیے
الفنطاس — قطعة 2	Fintas — Block 2	فنطاس — بلاک 2
عدة شقق للإيجار في الفنطاس قطعة 2. يبدأ السعر المذكور من 400 د.ك للوحدة شهرياً؛ يرجى تأكيد السعر والمواصفات والتوفر.	Several apartments for rent in Fintas, Block 2. The stated starting price is KWD 400 per unit per month; please confirm price, features and availability.	فنطاس بلاک 2 میں متعدد اپارٹمنٹ کرائے کے لیے۔ درج ابتدائی قیمت فی یونٹ ماہانہ 400 کویتی دینار سے ہے؛ قیمت، خصوصیات اور دستیابی کی تصدیق کریں۔
البيانات التي زود بها صاحب المشروع	Data supplied by the project owner	منصوبے کے مالک کی فراہم کردہ معلومات
`);

const policies = [
  [
    "يجمع المكتب الاسم والبريد والهاتف عند إنشاء الحساب، وبيانات الطلب والمواعيد والإعلانات التي ترسلها. تحفظ هذه البيانات في الخادم لإدارة المكتب، ولا تظهر بيانات حسابك للزوار. قد يظهر رقم المكتب في صفحات العقارات.",
    "The office collects your name, email and phone when you create an account, along with the requests, appointments and listings you submit. This data is stored on the server for office administration. Your account details are not visible to visitors. The office phone number may appear on property pages.",
    "اکاؤنٹ بناتے وقت دفتر آپ کا نام، ای میل اور فون، نیز آپ کی بھیجی ہوئی درخواستیں، ملاقاتیں اور اشتہارات جمع کرتا ہے۔ یہ معلومات دفتر کے انتظام کے لیے سرور پر محفوظ ہوتی ہیں اور زائرین کو آپ کے اکاؤنٹ کی تفصیلات نظر نہیں آتیں۔ جائیداد کے صفحات پر دفتر کا نمبر ظاہر ہو سکتا ہے۔",
  ],
  [
    "تحفظ المفضلة والمقارنة على هذا الجهاز. تحفظ جلسة الدخول في التبويب وتنتهي خلال ثماني ساعات. لا نضع مفاتيح الخدمة في الواجهة.",
    "Favorites and comparisons are saved on this device. Your sign-in session is saved in the tab and expires within eight hours. Service keys are not placed in the interface.",
    "پسندیدہ اور موازنہ اسی آلے پر محفوظ ہوتے ہیں۔ لاگ اِن نشست ٹیب میں محفوظ رہتی ہے اور آٹھ گھنٹوں میں ختم ہو جاتی ہے۔ سروس کی کلیدیں انٹرفیس میں نہیں رکھی جاتیں۔",
  ],
  [
    "نحصي تفاعلات البحث والعقارات للحسابات المسجلة دون تتبع موقعك الجغرافي أو جمع بصمة جهازك. استخدام واتساب أو الخرائط يخضع لسياسة الجهة الخارجية.",
    "We count search and property interactions for registered accounts without tracking your geographical location or collecting a device fingerprint. WhatsApp and maps are subject to the external provider's policies.",
    "رجسٹرڈ اکاؤنٹس کی تلاش اور جائیداد سے متعلق سرگرمی شمار کی جاتی ہے، مگر جغرافیائی مقام کی نگرانی یا آلے کا فنگر پرنٹ جمع نہیں کیا جاتا۔ واٹس ایپ اور نقشوں کا استعمال بیرونی فراہم کنندہ کی پالیسی کے تابع ہے۔",
  ],
  [
    "للوصول إلى بياناتك أو طلب تصحيحها أو حذفها، تواصل مع المكتب. على إدارة المكتب اعتماد سياسة الاحتفاظ والاسم التجاري قبل الإطلاق التجاري.",
    "Contact the office to access, correct or request deletion of your data. Office management must approve the retention policy and business name before commercial launch.",
    "اپنی معلومات تک رسائی، درستگی یا حذف کی درخواست کے لیے دفتر سے رابطہ کریں۔ تجارتی آغاز سے پہلے انتظامیہ کو معلومات رکھنے کی پالیسی اور کاروباری نام منظور کرنا ہے۔",
  ],
  [
    "الموقع قناة لعرض العقارات وتسجيل الطلبات والمعاينات. لا يعد نشر الإعلان إثبات ملكية أو تفويض أو تقييماً معتمداً.",
    "The website displays properties and records requests and viewings. Publishing a listing is not proof of ownership, authorization or an accredited valuation.",
    "ویب سائٹ جائیدادیں دکھانے اور درخواستیں و معائنے درج کرنے کا ذریعہ ہے۔ اشتہار کی اشاعت ملکیت، اجازت یا مستند تخمینے کا ثبوت نہیں۔",
  ],
  [
    "العروض الأولية مأخوذة من بيانات صاحب المشروع ولا يؤكد النظام توفرها الحالي. السعر والمساحة والموقع تخضع للتحقق. فرق البدل يختلف عن سعر العقار، وأسعار الوحدات لا تمثل قيمة المبنى كاملاً.",
    "Initial listings come from the project owner's data; the system does not confirm current availability. Price, area and location require verification. An exchange difference is distinct from a property price, and unit prices are not the price of the entire building.",
    "ابتدائی اشتہارات منصوبے کے مالک کی معلومات سے ہیں؛ نظام موجودہ دستیابی کی تصدیق نہیں کرتا۔ قیمت، رقبہ اور مقام کی جانچ ضروری ہے۔ تبادلے کی اضافی رقم جائیداد کی قیمت سے مختلف ہے، اور یونٹ کی قیمت پوری عمارت کی قیمت نہیں۔",
  ],
  [
    "العمولة حسب اتفاق وساطة موثق؛ الحاسبة تقديرية. طلب الموعد يحتاج تأكيد المكتب. لا ينفذ الموقع حالياً دفعاً أو عقد بيع أو إيجار إلكترونياً.",
    "Commission follows a documented brokerage agreement; the calculator is an estimate. Appointment requests need office confirmation. The website currently does not process payments or electronic sale or rental contracts.",
    "کمیشن دستاویزی بروکریج معاہدے کے مطابق ہے؛ کیلکولیٹر تخمینی ہے۔ ملاقات کی درخواست کو دفتر کی تصدیق درکار ہے۔ ویب سائٹ فی الحال ادائیگی یا فروخت و کرایے کے برقی معاہدے انجام نہیں دیتی۔",
  ],
  [
    "يلتزم المعلن بصحة المعلومات وحق نشر الصور والتفويض بالإعلان، وتراجع الإدارة العروض قبل النشر.",
    "Advertisers are responsible for accurate information, image publication rights and authorization to advertise. Management reviews listings before publication.",
    "مشتہر معلومات کی درستگی، تصاویر کی اشاعت کے حق اور اشتہار کی اجازت کا ذمہ دار ہے۔ اشاعت سے پہلے انتظامیہ اشتہارات کا جائزہ لیتی ہے۔",
  ],
];
const policyTranslations = Object.fromEntries(
  policies.map(([source, en, ur]) => [source, { en, ur }]),
);
// The policy dialog is one text node containing four paragraphs.
for (const start of [0, 4]) {
  const group = policies.slice(start, start + 4);
  policyTranslations[group.map((row) => row[0]).join("\n\n")] = {
    en: group.map((row) => row[1]).join("\n\n"),
    ur: group.map((row) => row[2]).join("\n\n"),
  };
}
policyTranslations["يظهر زر واتساب للتواصل مع المكتب دون عرض رقمه في صفحات الزوار."] = {
  en: "A WhatsApp button lets visitors contact the office without displaying its number on public pages.",
  ur: "زائرین کے صفحات پر نمبر دکھائے بغیر دفتر سے رابطے کے لیے واٹس ایپ کا بٹن ظاہر ہوتا ہے۔",
};
const oldPrivacyClause = "قد يظهر رقم المكتب في صفحات العقارات.";
const newPrivacyClause = "يظهر زر واتساب للتواصل مع المكتب دون عرض رقمه في صفحات الزوار.";
for (const [source, value] of Object.entries(policyTranslations)) {
  if (!source.includes(oldPrivacyClause)) continue;
  policyTranslations[source.replace(oldPrivacyClause, newPrivacyClause)] = {
    en: value.en.replace(
      "The office phone number may appear on property pages.",
      policyTranslations[newPrivacyClause].en,
    ),
    ur: value.ur.replace(
      "جائیداد کے صفحات پر دفتر کا نمبر ظاہر ہو سکتا ہے۔",
      policyTranslations[newPrivacyClause].ur,
    ),
  };
}

const serverMessages = entries(`
قيمة رقمية غير صالحة	Invalid numeric value	عددی قدر درست نہیں
بيانات الطلب مطلوبة	Request data is required	درخواست کی معلومات درکار ہیں
حجم الطلب أكبر من المسموح	Request exceeds the allowed size	درخواست مقررہ حجم سے بڑی ہے
صيغة الطلب غير صحيحة	Invalid request format	درخواست کی ساخت درست نہیں
طلبات كثيرة؛ حاول لاحقاً	Too many requests; try again later	درخواستیں زیادہ ہیں؛ بعد میں کوشش کریں
يرجى تسجيل الدخول	Please sign in	براہ کرم لاگ اِن کریں
انتهت الجلسة؛ سجل الدخول مجدداً	Session expired; sign in again	نشست ختم ہو گئی؛ دوبارہ لاگ اِن کریں
هذه العملية لإدارة المكتب فقط	This action is for office administrators only	یہ عمل صرف دفتر کے منتظمین کے لیے ہے
نوع العقار أو القسم غير صحيح	Invalid property type or category	جائیداد کی قسم یا زمرہ درست نہیں
رابط الإعداد غير صالح	Invalid setup link	سیٹ اپ لنک درست نہیں
البريد	Email	ای میل
الاسم	Name	نام
تحقق من البريد ورقم الهاتف	Check the email address and phone number	ای میل اور فون نمبر کی جانچ کریں
تم إعداد المدير مسبقاً؛ استخدم تسجيل الدخول	The administrator is already set up; use sign-in	منتظم پہلے ہی ترتیب دیا جا چکا ہے؛ لاگ اِن کریں
تعذر إنشاء الحساب؛ استخدم الدخول أو تواصل مع المكتب	Unable to create account; sign in or contact the office	اکاؤنٹ نہیں بن سکا؛ لاگ اِن کریں یا دفتر سے رابطہ کریں
بيانات الدخول غير صحيحة	Incorrect sign-in details	لاگ اِن کی معلومات درست نہیں
إذا كان الحساب موجوداً، سُجل طلبك لدى الإدارة. تواصل مع المكتب للتحقق من الهوية؛ لم تُرسل رسالة تلقائية.	If the account exists, your request has been recorded with the office. Contact the office for identity verification; no automatic message was sent.	اگر اکاؤنٹ موجود ہے تو آپ کی درخواست انتظامیہ کے پاس درج ہو گئی ہے۔ شناخت کی تصدیق کے لیے دفتر سے رابطہ کریں؛ کوئی خودکار پیغام نہیں بھیجا گیا۔
يوجد إعلان مطابق؛ راجع إعلانك أو تواصل مع المكتب	An identical listing exists; check your listing or contact the office	ایک یکساں اشتہار موجود ہے؛ اپنا اشتہار دیکھیں یا دفتر سے رابطہ کریں
يوجد إعلان مطابق؛ لم يتكرر الحفظ	An identical listing exists; no duplicate was saved	یکساں اشتہار موجود ہے؛ دوبارہ محفوظ نہیں کیا گیا
حُفظ الإعلان بانتظار مراجعة المكتب	Listing saved pending office review	اشتہار محفوظ ہے، دفتر کے جائزے کا منتظر
العقار غير موجود	Property not found	جائیداد نہیں ملی
غير مصرح	Not authorized	اجازت نہیں
لا تملك صلاحية تعديل هذا الإعلان	You do not have permission to edit this listing	آپ کو اس اشتہار میں ترمیم کا اختیار نہیں
العقار مغلق ولا يمكن تعديل بياناته	The property is closed and its data cannot be edited	جائیداد بند ہے اور معلومات میں ترمیم نہیں ہو سکتی
العقار مغلق ولا يمكن تعديله	The property is closed and cannot be edited	جائیداد بند ہے اور اس میں ترمیم نہیں ہو سکتی
يوجد إعلان مطابق؛ راجع البيانات	An identical listing exists; review the data	یکساں اشتہار موجود ہے؛ معلومات کا جائزہ لیں
الصفقة المكتملة أو المؤرشفة تحفظ في السجل	Completed or archived deals remain in the record	مکمل یا آرکائیو شدہ سودا ریکارڈ میں رہتا ہے
الملف حتى 1.5 ميغابايت بعد ضغط الصور	Files must be no larger than 1.5 MB after photo compression	تصاویر کا حجم کم کرنے کے بعد فائل 1.5 میگابائٹ تک ہونی چاہیے
اسم الملف	File name	فائل کا نام
حتى ست صور لكل إعلان	Up to six photos per listing	ہر اشتہار کے لیے چھ تصاویر تک
صور JPEG أو PNG أو WebP فقط؛ لم يُقبل محتوى الصورة	JPEG, PNG or WebP photos only; image content was not accepted	صرف JPEG، PNG یا WebP تصاویر؛ تصویر کا مواد قبول نہیں ہوا
الأرشيف الداخلي للإدارة فقط	The internal archive is for administrators only	اندرونی آرکائیو صرف منتظمین کے لیے ہے
الصيغة غير مدعومة للأرشيف	This format is not supported in the archive	آرکائیو میں یہ فارمیٹ معاون نہیں
ملف PDF غير صالح	Invalid PDF file	PDF فائل درست نہیں
العقار مغلق	Property closed	جائیداد بند ہے
الملف غير موجود	File not found	فائل نہیں ملی
الموافقة على تواصل المكتب مطلوبة	Consent to office contact is required	دفتر کے رابطے کی رضامندی ضروری ہے
الموعد غير متاح؛ اختر وقتاً آخر	Appointment unavailable; choose another time	وقت دستیاب نہیں؛ دوسرا وقت منتخب کریں
العقار غير متاح	Property unavailable	جائیداد دستیاب نہیں
حُجز الموعد للتو؛ اختر وقتاً آخر	That time was just booked; choose another	یہ وقت ابھی بک ہو گیا؛ دوسرا وقت منتخب کریں
لم أجد عرضاً يطابق طلبك بالكامل. خفف أحد الشروط أو سجل طلبك ليتابعه المكتب.	I could not find a listing that matches all your criteria. Relax a condition or submit a request for office follow-up.	آپ کی تمام شرائط سے ملتا اشتہار نہیں ملا۔ کوئی شرط نرم کریں یا دفتر کی پیروی کے لیے درخواست درج کریں۔
وجدت	I found	مجھے ملے
عروض في قاعدة المكتب. التوفر والأسعار يحتاجان تأكيد المكتب.	listings in the office database. Availability and prices require office confirmation.	دفتر کے ڈیٹا بیس میں اشتہارات۔ دستیابی اور قیمتوں کی تصدیق دفتر سے ضروری ہے۔
حدث غير صحيح	Invalid event	واقعہ درست نہیں
الصفحة غير موجودة	Page not found	صفحہ نہیں ملا
حالة غير صحيحة	Invalid status	حالت درست نہیں
لا يمكن تغيير حالة العقار	Property status cannot be changed	جائیداد کی حالت نہیں بدلی جا سکتی
نص الإعلان	Listing text	اشتہار کا متن
إعلان مطابق موجود؛ لم يُكرر	Identical listing exists; no duplicate was created	یکساں اشتہار موجود ہے؛ دوبارہ نہیں بنایا گیا
استيراد يدوي	Manual import	دستی درآمد
لا يمكن تعديل حالة الموعد	Appointment status cannot be changed	ملاقات کی حالت نہیں بدلی جا سکتی
الموعد محجوز	Appointment already booked	ملاقات کا وقت بک ہے
قيمة الصفقة النهائية مطلوبة	Final deal value is required	سودے کی حتمی رقم ضروری ہے
حدد طريقة العمولة	Select a commission method	کمیشن کا طریقہ منتخب کریں
العقار غير متاح للإغلاق	Property is unavailable for deal closure	سودا مکمل کرنے کے لیے جائیداد دستیاب نہیں
مرجع إيصال التحصيل	Collection receipt reference	وصولی کی رسید کا حوالہ
تم تسجيل التحصيل مسبقاً أو العمولة غير موجودة	Collection is already recorded or the commission does not exist	وصولی پہلے درج ہے یا کمیشن موجود نہیں
سُجل التحصيل؛ هذا سجل محاسبي ولا ينفذ تحويلاً بنكياً	Collection recorded; this is an accounting record, not a bank transfer	وصولی درج ہو گئی؛ یہ حسابی ریکارڈ ہے، بینک ٹرانسفر نہیں
لا يمكنك إيقاف حسابك أو تغيير صلاحيتك	You cannot suspend your own account or change your own role	آپ اپنا اکاؤنٹ معطل یا اپنا اختیار تبدیل نہیں کر سکتے
صلاحية غير صحيحة	Invalid role	اختیار درست نہیں
رقم المكتب غير صحيح	Invalid office number	دفتر کا نمبر درست نہیں
أيام غير صحيحة	Invalid days	دن درست نہیں
وقت غير صحيح	Invalid time	وقت درست نہیں
المدة 30 أو60 دقيقة	Duration must be 30 or 60 minutes	دورانیہ 30 یا 60 منٹ ہونا چاہیے
نهاية العمل يجب أن تكون بعد البداية	Closing time must be after opening time	کام ختم ہونے کا وقت آغاز کے بعد ہونا چاہیے
حد الذكاء الاصطناعي من صفر إلى100	AI limit must be between 0 and 100	اے آئی کی حد 0 سے 100 تک ہونی چاہیے
المفتاح غير صالح	Invalid key	کلید درست نہیں
المفتاح ومعرف النموذج مطلوبان	Key and model ID are required	کلید اور ماڈل کی شناخت ضروری ہیں
رقم تعريف واتساب وإصدار Graph مطلوبان	WhatsApp ID and Graph version are required	واٹس ایپ کی شناخت اور Graph ورژن ضروری ہیں
أضف مفتاح NVIDIA أولاً	Add a NVIDIA key first	پہلے NVIDIA کلید شامل کریں
تعذر التحقق من النماذج لدى المزود	Unable to check the provider's models	فراہم کنندہ کے ماڈل جانچے نہیں جا سکے
المساعد التوليدي غير متصل؛ استخلاص الحقول المحلي متاح	The generative assistant is disconnected; local field extraction is available	تخلیقی معاون منسلک نہیں؛ مقامی خانوں کا استخراج دستیاب ہے
التوليد متوقف في ميزانية الاستخدام	Generation is disabled by the usage budget	استعمال کے بجٹ میں تخلیق بند ہے
بيانات العقار	Property data	جائیداد کی معلومات
تعذر التوليد لدى المزود؛ لم تنشر أي مادة	Provider generation failed; no material was published	فراہم کنندہ سے تخلیق ناکام ہوئی؛ کوئی مواد شائع نہیں ہوا
غير مسعّر؛ راجع حساب المزود	Not priced; check your provider account	قیمت طے نہیں؛ فراہم کنندہ کا اکاؤنٹ دیکھیں
السعر للاتفاق	Price on agreement	قیمت باہمی اتفاق سے
السعر يحتاج تأكيداً	Price requires confirmation	قیمت کی تصدیق ضروری ہے
المساحة تحتاج تأكيداً	Area requires confirmation	رقبے کی تصدیق ضروری ہے
تواصل مع المكتب لتأكيد التوفر والتفاصيل.	Contact the office to confirm availability and details.	دستیابی اور تفصیلات کی تصدیق کے لیے دفتر سے رابطہ کریں۔
خطة محتوى ومسودة قابلة للتنزيل؛ لم ينشأ فيديو ولم يُنشر إعلان تلقائياً	Downloadable content plan and draft; no video was created or listing published automatically	ڈاؤن لوڈ ہونے والا مواد کا منصوبہ اور مسودہ؛ ویڈیو یا اشتہار خودکار تیار یا شائع نہیں ہوا
العملية غير موجودة	Action not found	عمل نہیں ملا
مصدر الطلب غير مصرح	Request origin is not allowed	درخواست کے ماخذ کی اجازت نہیں
حجم الطلب كبير	Request is too large	درخواست کا حجم زیادہ ہے
تعذر إكمال العملية؛ حاول مجدداً	Unable to complete the action; try again	عمل مکمل نہیں ہو سکا؛ دوبارہ کوشش کریں
حتى	up to	زیادہ سے زیادہ
عرض	listing	اشتہار
قطعة	Block	بلاک
`);

const marketUI = {
  "رصد تجريبي": {
    "en": "Experimental research",
    "ur": "تجرباتی تلاش"
  },
  "رصد تجريبي من": {
    "en": "Experimental finding from",
    "ur": "تجرباتی نتیجہ از"
  },
  "المصدر:": {
    "en": "Source:",
    "ur": "ماخذ:"
  },
  "تاريخ الرصد:": {
    "en": "Research date:",
    "ur": "تلاش کی تاریخ:"
  },
  "التوفر والتفويض يحتاجان تأكيد المكتب": {
    "en": "The office must confirm availability and marketing authority",
    "ur": "دستیابی اور تشہیر کی اجازت کی تصدیق دفتر کرے گا"
  },
  "راجع المكتب للتفاصيل": {
    "en": "Ask the office for details",
    "ur": "تفصیل کے لیے دفتر سے رابطہ کریں"
  },
  "نسخة تجريبية: تشمل بيانات المكتب ونتائج رصد خارجية محددة. لا تمثل جميع إعلانات السوق، ولم يؤكد المكتب توفر العروض الخارجية أو تفويض تسويقها.": {
    "en": "Experimental version with office data and a limited set of external research findings. It does not cover every market listing. External availability and marketing authority are unconfirmed.",
    "ur": "تجرباتی نسخے میں دفتر کی معلومات اور بیرونی تلاش کے محدود نتائج شامل ہیں۔ یہ مارکیٹ کے تمام اشتہارات نہیں ہیں۔ بیرونی اشتہارات کی دستیابی اور تشہیر کی اجازت غیر مصدقہ ہے۔"
  },
  "مصدر الإعلان": {
    "en": "Listing source",
    "ur": "اشتہار کا ماخذ"
  },
  "نطاق البحث": {
    "en": "Search scope",
    "ur": "تلاش کا دائرہ"
  },
  "الرصد الخارجي": {
    "en": "External research",
    "ur": "بیرونی تلاش"
  },
  "بيانات المكتب": {
    "en": "Office records",
    "ur": "دفتر کا ریکارڈ"
  },
  "رصد السوق التجريبي": {
    "en": "Experimental market research",
    "ur": "تجرباتی مارکیٹ تلاش"
  },
  "نتيجة رصد": {
    "en": "Research findings",
    "ur": "تلاش کے نتائج"
  },
  "نتائج داخل المنصة": {
    "en": "Findings on this platform",
    "ur": "اس پلیٹ فارم پر نتائج"
  },
  "عرض النتائج": {
    "en": "View results",
    "ur": "نتائج دیکھیں"
  },
  "افتح الإعلان الأصلي ووسائطه": {
    "en": "Open the original listing and media",
    "ur": "اصل اشتہار اور میڈیا کھولیں"
  },
  "عرض تجريبي أو أولي؛ يحتاج السعر والتوفر والتفويض تأكيداً من المكتب.": {
    "en": "Experimental or preliminary listing. The office must confirm price, availability and marketing authority.",
    "ur": "تجرباتی یا ابتدائی اشتہار۔ قیمت، دستیابی اور تشہیر کی اجازت کی تصدیق دفتر کرے گا۔"
  },
  "بحث أُجري في 24 أكتوبر 2026. هذه دفعة محددة من نتائج البحث، وليست تغذية مباشرة أو حصراً لجميع العروض. الصور والفيديوهات الأصلية متاحة في رابط المصدر؛ لم تنسخ دون تفويض.": {
    "en": "Research conducted on 24 October 2026. This is a limited research batch, not a live feed or complete inventory. Original photos and videos remain at the source; they were not copied without permission.",
    "ur": "تلاش 24 اکتوبر 2026 کو کی گئی۔ یہ محدود نتائج ہیں، براہ راست فیڈ یا تمام اشتہارات نہیں۔ اصل تصاویر اور ویڈیوز ماخذ پر ہیں؛ اجازت کے بغیر نقل نہیں کی گئیں۔"
  },
  "التواصل داخل المنصة مع المكتب فقط. ظهور النتيجة لا يعني أن المكتب مفوض بتسويق العقار. الإعلانات التي تبين توقفها استبعدت.": {
    "en": "Platform inquiries go to the office only. A research result does not establish marketing authority. Listings found to be withdrawn were excluded.",
    "ur": "پلیٹ فارم پر رابطہ صرف دفتر سے ہے۔ نتیجہ ظاہر ہونے کا مطلب تشہیر کی اجازت نہیں۔ بند ہونے کی تصدیق والے اشتہارات شامل نہیں کیے گئے۔"
  },
  "ملخص مواصفات من رصد السوق لأغراض التجربة. يحتاج السعر والتوفر والتفويض تأكيداً من المكتب.": {
    "en": "A factual market research summary for this experiment. The office must confirm price, availability and marketing authority.",
    "ur": "اس تجربے کے لیے مارکیٹ تلاش کی معلومات کا خلاصہ۔ قیمت، دستیابی اور تشہیر کی اجازت کی تصدیق دفتر کرے گا۔"
  },
  "عدد الحمامات متعارض بين وصف المصدر وملخصه؛ لم يعتمد.": {
    "en": "The source description and summary disagree on bathrooms; the count was left unspecified.",
    "ur": "ماخذ کی تفصیل اور خلاصے میں غسل خانوں کی تعداد مختلف ہے؛ تعداد درج نہیں کی گئی۔"
  },
  "فيديو العقار": {
    "en": "Property video",
    "ur": "جائیداد کی ویڈیو"
  },
  "فيديو العقار (اختياري)": {
    "en": "Property video (optional)",
    "ur": "جائیداد کی ویڈیو (اختیاری)"
  },
  "حتى فيديوهين، 8 ميغابايت لكل فيديو. استخدم وسائط تملك حق نشرها.": {
    "en": "Up to two videos, 8 MB each. Use media you have permission to publish.",
    "ur": "دو ویڈیوز تک، ہر ایک 8 میگابائٹ۔ صرف اجازت یافتہ میڈیا استعمال کریں۔"
  },
  "أقر بصحة البيانات وتفويضي بعرض العقار وحق نشر الصور والفيديو.": {
    "en": "I confirm the details, my authority to list the property and my right to publish the photos and videos.",
    "ur": "میں معلومات، جائیداد پیش کرنے کی اجازت، اور تصاویر و ویڈیو شائع کرنے کے حق کی تصدیق کرتا ہوں۔"
  },
  "حتى فيديوهين لكل إعلان": {
    "en": "Up to two videos per listing",
    "ur": "ہر اشتہار میں دو ویڈیوز تک"
  },
  "الفيديو حتى 8 ميغابايت": {
    "en": "Video size is limited to 8 MB",
    "ur": "ویڈیو کی حد 8 میگابائٹ ہے"
  },
  "صور وفيديو": {
    "en": "Photos and video",
    "ur": "تصاویر اور ویڈیو"
  },
  "استيراد ملف JSON / CSV": {
    "en": "Import JSON / CSV",
    "ur": "JSON / CSV درآمد کریں"
  },
  "استيراد جماعي من ملف": {
    "en": "Bulk import from a file",
    "ur": "فائل سے اجتماعی درآمد"
  },
  "ملف الإعلانات": {
    "en": "Listings file",
    "ur": "اشتہارات کی فائل"
  },
  "تنزيل نموذج الاستيراد": {
    "en": "Download import template",
    "ur": "درآمد کا نمونہ ڈاؤن لوڈ کریں"
  },
  "معاينة الدفعة": {
    "en": "Preview batch",
    "ur": "بیچ کا پیش منظر"
  },
  "راجع دفعة الإعلانات": {
    "en": "Review listing batch",
    "ur": "اشتہارات کے بیچ کا جائزہ لیں"
  },
  "مرجع التفويض": {
    "en": "Permission reference",
    "ur": "اجازت کا حوالہ"
  },
  "رقم اتفاق، رسالة موافقة أو مرجع إذن المالك": {
    "en": "Agreement number, approval message or owner permission reference",
    "ur": "معاہدے کا نمبر، منظوری کا پیغام یا مالک کی اجازت کا حوالہ"
  },
  "لدي إذن استخدام الإعلانات ووسائطها وتسويقها عبر المكتب.": {
    "en": "I have permission to use these listings and media and market them through the office.",
    "ur": "مجھے ان اشتہارات اور میڈیا کے استعمال اور دفتر کے ذریعے تشہیر کی اجازت ہے۔"
  },
  "حتى 100 إعلان في الدفعة. أرفق الصور والفيديو بعد الاستيراد من ملف العقار.": {
    "en": "Up to 100 listings per batch. Attach photos and videos from the property record after import.",
    "ur": "ہر بیچ میں 100 اشتہارات تک۔ درآمد کے بعد جائیداد کے ریکارڈ سے تصاویر اور ویڈیوز لگائیں۔"
  },
  "حفظ الدفعة للمراجعة": {
    "en": "Save batch for review",
    "ur": "جائزے کے لیے بیچ محفوظ کریں"
  },
  "نتيجة الاستيراد": {
    "en": "Import results",
    "ur": "درآمد کے نتائج"
  },
  "الصف": {
    "en": "Row",
    "ur": "قطار"
  },
  "يحتاج تصحيحاً": {
    "en": "Needs correction",
    "ur": "درستگی درکار ہے"
  },
  "مكرر؛ لم يُضف": {
    "en": "Duplicate; not added",
    "ur": "دہرایا گیا؛ شامل نہیں ہوا"
  },
  "حُفظ للمراجعة": {
    "en": "Saved for review",
    "ur": "جائزے کے لیے محفوظ ہوا"
  },
  "الصفوف المكررة لم تُضف، والأخطاء موضحة أدناه.": {
    "en": "Duplicate rows were not added. Errors are listed below.",
    "ur": "دہرائی گئی قطاریں شامل نہیں ہوئیں۔ غلطیاں نیچے درج ہیں۔"
  },
  "إرفاق صور وفيديو للعقار": {
    "en": "Attach property photos and videos",
    "ur": "جائیداد کی تصاویر اور ویڈیوز لگائیں"
  },
  "إرفاق صور وفيديو": {
    "en": "Attach photos and video",
    "ur": "تصاویر اور ویڈیو لگائیں"
  },
  "صور العقار": {
    "en": "Property photos",
    "ur": "جائیداد کی تصاویر"
  },
  "حتى ست صور للإعلان؛ تضغط الصور قبل الإرسال.": {
    "en": "Up to six photos per listing; photos are compressed before upload.",
    "ur": "ہر اشتہار میں چھ تصاویر تک؛ بھیجنے سے پہلے تصاویر چھوٹی کی جاتی ہیں۔"
  },
  "حتى فيديوهين، 8 ميغابايت لكل فيديو.": {
    "en": "Up to two videos, 8 MB each.",
    "ur": "دو ویڈیوز تک، ہر ایک 8 میگابائٹ۔"
  },
  "لدي حق نشر الصور والفيديو وتفويض عرض العقار.": {
    "en": "I have the right to publish the media and authority to list the property.",
    "ur": "مجھے میڈیا شائع کرنے اور جائیداد پیش کرنے کی اجازت ہے۔"
  },
  "رفع الوسائط": {
    "en": "Upload media",
    "ur": "میڈیا اپ لوڈ کریں"
  },
  "اختر صورة أو فيديو": {
    "en": "Choose a photo or video",
    "ur": "تصویر یا ویڈیو منتخب کریں"
  },
  "تحققت من تفويض المكتب بعرض الإعلان ووسائطه.": {
    "en": "I verified the office's authority to publish the listing and media.",
    "ur": "میں نے دفتر کی اشتہار اور میڈیا شائع کرنے کی اجازت کی تصدیق کی۔"
  },
  "أكدت السعر والتوفر الحاليين مع المعلن.": {
    "en": "I confirmed the current price and availability with the advertiser.",
    "ur": "میں نے مشتہر سے موجودہ قیمت اور دستیابی کی تصدیق کی۔"
  },
  "التأكيدان ومرجع التفويض مطلوبان عند اعتماد عرض خارجي.": {
    "en": "Both confirmations and the permission reference are required to approve an external listing.",
    "ur": "بیرونی اشتہار کی منظوری کے لیے دونوں تصدیقات اور اجازت کا حوالہ ضروری ہیں۔"
  },
  "تسجيل تفويض الإعلان والوسائط": {
    "en": "Record listing and media permission",
    "ur": "اشتہار اور میڈیا کی اجازت درج کریں"
  },
  "استيراد دفعة إعلانات": {
    "en": "Import listing batch",
    "ur": "اشتہارات کا بیچ درآمد کریں"
  },
  "وسائط مرفقة": {
    "en": "Attached media",
    "ur": "منسلک میڈیا"
  },
  "مرجع التفويض مطلوب": {
    "en": "A permission reference is required",
    "ur": "اجازت کا حوالہ ضروری ہے"
  },
  "تأكيد التوفر والتفويض": {
    "en": "Confirm availability and authority",
    "ur": "دستیابی اور اجازت کی تصدیق کریں"
  },
  "سكن": {
    "en": "Sakan",
    "ur": "سکن"
  },
  "السوق المفتوح": {
    "en": "OpenSooq",
    "ur": "اوپن سوق"
  },
  "جابر الأحمد — قطعة 7": {
    "en": "Jaber Al Ahmad — Block 7",
    "ur": "جابر الاحمد — بلاک 7"
  },
  "شقة للإيجار في جابر الأحمد — قطعة 7": {
    "en": "Apartment for rent in Jaber Al Ahmad — Block 7",
    "ur": "جابر الاحمد — بلاک 7 میں فلیٹ کرائے کے لیے"
  },
  "العارضية": {
    "en": "Ardiya",
    "ur": "عارضیہ"
  },
  "شقة للإيجار في العارضية": {
    "en": "Apartment for rent in Ardiya",
    "ur": "عارضیہ میں فلیٹ کرائے کے لیے"
  },
  "سلوى — قطعة 6": {
    "en": "Salwa — Block 6",
    "ur": "سلویٰ — بلاک 6"
  },
  "شقة للإيجار في سلوى — قطعة 6": {
    "en": "Apartment for rent in Salwa — Block 6",
    "ur": "سلویٰ — بلاک 6 میں فلیٹ کرائے کے لیے"
  },
  "صباح السالم": {
    "en": "Sabah Al Salem",
    "ur": "صباح السالم"
  },
  "شقة للإيجار في صباح السالم": {
    "en": "Apartment for rent in Sabah Al Salem",
    "ur": "صباح السالم میں فلیٹ کرائے کے لیے"
  },
  "الصباحية — قطعة 4": {
    "en": "Sabahiya — Block 4",
    "ur": "صباحیہ — بلاک 4"
  },
  "شقة للإيجار في الصباحية — قطعة 4": {
    "en": "Apartment for rent in Sabahiya — Block 4",
    "ur": "صباحیہ — بلاک 4 میں فلیٹ کرائے کے لیے"
  },
  "جابر الأحمد — قطعة 5": {
    "en": "Jaber Al Ahmad — Block 5",
    "ur": "جابر الاحمد — بلاک 5"
  },
  "شقة للإيجار في جابر الأحمد — قطعة 5": {
    "en": "Apartment for rent in Jaber Al Ahmad — Block 5",
    "ur": "جابر الاحمد — بلاک 5 میں فلیٹ کرائے کے لیے"
  },
  "محافظة مبارك الكبير — المنطقة غير محددة": {
    "en": "Mubarak Al-Kabeer governorate — area unspecified",
    "ur": "محافظہ مبارک الکبیر — علاقہ غیر متعین"
  },
  "شقة للإيجار في محافظة مبارك الكبير — المنطقة غير محددة": {
    "en": "Apartment for rent in Mubarak Al-Kabeer governorate — area unspecified",
    "ur": "محافظہ مبارک الکبیر — علاقہ غیر متعین میں فلیٹ کرائے کے لیے"
  },
  "الواحة": {
    "en": "Waha",
    "ur": "واحہ"
  },
  "شقة للإيجار في الواحة": {
    "en": "Apartment for rent in Waha",
    "ur": "واحہ میں فلیٹ کرائے کے لیے"
  },
  "عبدالله المبارك": {
    "en": "Abdullah Al Mubarak",
    "ur": "عبداللہ المبارک"
  },
  "بيت للبيع في عبدالله المبارك": {
    "en": "House for sale in Abdullah Al Mubarak",
    "ur": "عبداللہ المبارک میں مکان فروخت کے لیے"
  },
  "جابر الأحمد — قطعة 6": {
    "en": "Jaber Al Ahmad — Block 6",
    "ur": "جابر الاحمد — بلاک 6"
  },
  "بيت للبيع في جابر الأحمد — قطعة 6": {
    "en": "House for sale in Jaber Al Ahmad — Block 6",
    "ur": "جابر الاحمد — بلاک 6 میں مکان فروخت کے لیے"
  },
  "بيان": {
    "en": "Bayan",
    "ur": "بیان"
  },
  "بيت للبيع في بيان": {
    "en": "House for sale in Bayan",
    "ur": "بیان میں مکان فروخت کے لیے"
  },
  "الخيران السكنية — قطعة 2": {
    "en": "Khairan Residential — Block 2",
    "ur": "خیران رہائشی — بلاک 2"
  },
  "فيلا للبيع في الخيران السكنية — قطعة 2": {
    "en": "Villa for sale in Khairan Residential — Block 2",
    "ur": "خیران رہائشی — بلاک 2 میں ویلا فروخت کے لیے"
  },
  "الشهداء — قطعة 5": {
    "en": "Shuhada — Block 5",
    "ur": "شہداء — بلاک 5"
  },
  "فيلا للبيع في الشهداء — قطعة 5": {
    "en": "Villa for sale in Shuhada — Block 5",
    "ur": "شہداء — بلاک 5 میں ویلا فروخت کے لیے"
  },
  "كيفان — قطعة 2": {
    "en": "Kaifan — Block 2",
    "ur": "کیفان — بلاک 2"
  },
  "فيلا للبيع في كيفان — قطعة 2": {
    "en": "Villa for sale in Kaifan — Block 2",
    "ur": "کیفان — بلاک 2 میں ویلا فروخت کے لیے"
  },
  "خيطان": {
    "en": "Khaitan",
    "ur": "خیطان"
  },
  "عمارة للبيع في خيطان": {
    "en": "Building for sale in Khaitan",
    "ur": "خیطان میں عمارت فروخت کے لیے"
  },
  "المباركية": {
    "en": "Al-Mubarakiya",
    "ur": "مبارکیہ"
  },
  "مكتب للإيجار في المباركية": {
    "en": "Office for rent in Al-Mubarakiya",
    "ur": "مبارکیہ میں دفتر کرائے کے لیے"
  },
  "حولي": {
    "en": "Hawalli",
    "ur": "حولی"
  },
  "مكتب للإيجار في حولي": {
    "en": "Office for rent in Hawalli",
    "ur": "حولی میں دفتر کرائے کے لیے"
  },
  "شرق": {
    "en": "Sharq",
    "ur": "شرق"
  },
  "مكتب للإيجار في شرق": {
    "en": "Office for rent in Sharq",
    "ur": "شرق میں دفتر کرائے کے لیے"
  },
  "محل للإيجار في حولي": {
    "en": "Shop for rent in Hawalli",
    "ur": "حولی میں دکان کرائے کے لیے"
  },
  "الضجيج — قطعة 1": {
    "en": "Dajeej — Block 1",
    "ur": "ضجیج — بلاک 1"
  },
  "محل للإيجار في الضجيج — قطعة 1": {
    "en": "Shop for rent in Dajeej — Block 1",
    "ur": "ضجیج — بلاک 1 میں دکان کرائے کے لیے"
  },
  "السلام — قطعة 1": {
    "en": "Salam — Block 1",
    "ur": "سلام — بلاک 1"
  },
  "أرض للبيع في السلام — قطعة 1": {
    "en": "Land for sale in Salam — Block 1",
    "ur": "سلام — بلاک 1 میں زمین فروخت کے لیے"
  },
  "صباح الأحمد البحرية — المرحلة الثالثة": {
    "en": "Sabah Al-Ahmad Sea City — Phase 3",
    "ur": "صباح الاحمد سی سٹی — مرحلہ 3"
  },
  "أرض للبيع في صباح الأحمد البحرية — المرحلة الثالثة": {
    "en": "Land for sale in Sabah Al-Ahmad Sea City — Phase 3",
    "ur": "صباح الاحمد سی سٹی — مرحلہ 3 میں زمین فروخت کے لیے"
  },
  "صباح الأحمد البحرية — المرحلة الرابعة": {
    "en": "Sabah Al-Ahmad Sea City — Phase 4",
    "ur": "صباح الاحمد سی سٹی — مرحلہ 4"
  },
  "أرض للبيع في صباح الأحمد البحرية — المرحلة الرابعة": {
    "en": "Land for sale in Sabah Al-Ahmad Sea City — Phase 4",
    "ur": "صباح الاحمد سی سٹی — مرحلہ 4 میں زمین فروخت کے لیے"
  },
  "خيطان الجنوبي": {
    "en": "South Khaitan",
    "ur": "جنوبی خیطان"
  },
  "أرض للبدل في خيطان الجنوبي": {
    "en": "Land for exchange in South Khaitan",
    "ur": "جنوبی خیطان میں زمین تبادلے کے لیے"
  },
  "الصديق": {
    "en": "Siddiq",
    "ur": "صدیق"
  },
  "شقة للإيجار في الصديق": {
    "en": "Apartment for rent in Siddiq",
    "ur": "صدیق میں فلیٹ کرائے کے لیے"
  },
  "الجابرية": {
    "en": "Jabriya",
    "ur": "جابریہ"
  },
  "شقة للإيجار في الجابرية": {
    "en": "Apartment for rent in Jabriya",
    "ur": "جابریہ میں فلیٹ کرائے کے لیے"
  },
  "الفنيطيس": {
    "en": "Funaitees",
    "ur": "فنیطیس"
  },
  "شقة للإيجار في الفنيطيس": {
    "en": "Apartment for rent in Funaitees",
    "ur": "فنیطیس میں فلیٹ کرائے کے لیے"
  },
  "الفنطاس": {
    "en": "Fintas",
    "ur": "فنطاس"
  },
  "شقة للإيجار في الفنطاس": {
    "en": "Apartment for rent in Fintas",
    "ur": "فنطاس میں فلیٹ کرائے کے لیے"
  },
  "السالمية — قطعة 11": {
    "en": "Salmiya — Block 11",
    "ur": "سالمیہ — بلاک 11"
  },
  "شقة للإيجار في السالمية — قطعة 11": {
    "en": "Apartment for rent in Salmiya — Block 11",
    "ur": "سالمیہ — بلاک 11 میں فلیٹ کرائے کے لیے"
  },
  "رصد السوق ومصادر البحث": {
    "en": "Market research and sources",
    "ur": "مارکیٹ کی تلاش اور ذرائع"
  },
  "صورة مولّدة · للتوضيح": {
    "en": "AI-generated · Illustrative",
    "ur": "مصنوعی ذہانت سے تیار · وضاحتی"
  },
  "صورة عقارية مولّدة للتوضيح ولا تمثل العقار الفعلي": {
    "en": "AI-generated property illustration; not a photograph of the actual property",
    "ur": "جائیداد کی وضاحتی تصویر، مصنوعی ذہانت سے تیار کردہ؛ اصل جائیداد کی تصویر نہیں"
  },
  "صورة مولّدة بالذكاء الاصطناعي للتجربة؛ لا تمثل العقار المعروض أو تشطيبه أو موقعه الفعلي.": {
    "en": "AI-generated image for this trial. It does not depict the listed property, its actual finishes or its location.",
    "ur": "اس تجربے کے لیے مصنوعی ذہانت سے تیار کردہ تصویر۔ یہ درج شدہ جائیداد، اس کی اصل تکمیل یا مقام کی تصویر نہیں ہے۔"
  },
  "بحث أُجري في 24 أكتوبر 2026. هذه دفعة محددة من نتائج البحث، وليست تغذية مباشرة أو حصراً لجميع العروض. صور البطاقات مولّدة للتجربة ولا تمثل العقارات الفعلية. وسائط الإعلانات الأصلية في رابط المصدر.": {
    "en": "Research conducted on 24 October 2026. This is a limited research batch, not a live feed or complete inventory. Card images are AI-generated illustrations, not photographs of the listed properties. Original listing media remains at the source.",
    "ur": "تلاش 24 اکتوبر 2026 کو کی گئی۔ یہ محدود نتائج ہیں، براہ راست فیڈ یا تمام اشتہارات نہیں۔ کارڈ کی تصاویر مصنوعی ذہانت سے تیار کردہ وضاحتی تصاویر ہیں، اصل جائیدادوں کی تصاویر نہیں۔ اصل اشتہارات کا میڈیا ماخذ کے لنک پر ہے۔"
  }
};
const discoveryUI = {
  "عقاري X / الكويت": {
    "en": "AQARI X / KUWAIT",
    "ur": "عقاری X / کویت"
  },
  "ابحث عن عقارك في الكويت": {
    "en": "Find your property in Kuwait",
    "ur": "کویت میں اپنی جائیداد تلاش کریں"
  },
  "بيع، إيجار أو بدل. اختَر ما يناسبك ويتابع المكتب التفاصيل.": {
    "en": "Buy, rent or exchange. Choose a listing and the office follows up.",
    "ur": "خرید، کرایہ یا تبادلہ۔ جائیداد منتخب کریں، دفتر تفصیلات کی پیروی کرے گا۔"
  },
  "اسأل بالصوت": {
    "en": "Ask by voice",
    "ur": "آواز سے پوچھیں"
  },
  "المنطقة، المواصفات أو رقم الإعلان…": {
    "en": "Area, features or listing ID…",
    "ur": "علاقہ، خصوصیات یا اشتہار نمبر…"
  },
  "ابحث بالمنطقة أو المواصفات أو رقم الإعلان": {
    "en": "Search by area, features or listing ID",
    "ur": "علاقے، خصوصیات یا اشتہار نمبر سے تلاش کریں"
  },
  "اختصارات البحث": {
    "en": "Quick searches",
    "ur": "فوری تلاشیں"
  },
  "شقق للإيجار": {
    "en": "Apartments for rent",
    "ur": "کرایے کے اپارٹمنٹس"
  },
  "فلل للبيع": {
    "en": "Villas for sale",
    "ur": "فروخت کے ولا"
  },
  "بيوت للبيع": {
    "en": "Houses for sale",
    "ur": "فروخت کے مکان"
  },
  "أراضٍ للبيع": {
    "en": "Land for sale",
    "ur": "فروخت کی زمین"
  },
  "أراضٍ للبدل": {
    "en": "Land for exchange",
    "ur": "تبادلے کی زمین"
  },
  "مكاتب للإيجار": {
    "en": "Offices for rent",
    "ur": "کرایے کے دفاتر"
  },
  "محلات للإيجار": {
    "en": "Shops for rent",
    "ur": "کرایے کی دکانیں"
  },
  "الفلاتر المطبقة": {
    "en": "Applied filters",
    "ur": "لگائے گئے فلٹر"
  },
  "إزالة الفلتر": {
    "en": "Remove filter",
    "ur": "فلٹر ہٹائیں"
  },
  "فُهم من عبارتك:": {
    "en": "Understood from your search:",
    "ur": "آپ کی تلاش سے سمجھا گیا:"
  },
  "بيانات وصور تجريبية · تحقق من التوفر مع المكتب": {
    "en": "Trial data and images · Confirm availability with the office",
    "ur": "تجرباتی معلومات اور تصاویر · دستیابی دفتر سے معلوم کریں"
  },
  "طريقة عرض النتائج": {
    "en": "Results view",
    "ur": "نتائج کا انداز"
  },
  "عرض الخريطة": {
    "en": "Map view",
    "ur": "نقشے کا منظر"
  },
  "صفحات النتائج": {
    "en": "Result pages",
    "ur": "نتائج کے صفحات"
  },
  "الصفحة": {
    "en": "Page",
    "ur": "صفحہ"
  },
  "الحمامات على الأقل": {
    "en": "Minimum bathrooms",
    "ur": "کم از کم باتھ روم"
  },
  "أساس السعر": {
    "en": "Price basis",
    "ur": "قیمت کی بنیاد"
  },
  "الوسائط": {
    "en": "Media",
    "ur": "میڈیا"
  },
  "صور مرفقة من المعلن": {
    "en": "Advertiser photos attached",
    "ur": "مشتہر کی منسلک تصاویر"
  },
  "صورة مرفقة من المعلن": {
    "en": "Advertiser photo",
    "ur": "مشتہر کی تصویر"
  },
  "فيديو مرفق": {
    "en": "Video attached",
    "ur": "منسلک ویڈیو"
  },
  "حالة التوفر": {
    "en": "Availability status",
    "ur": "دستیابی کی حالت"
  },
  "راجع المكتب التوفر": {
    "en": "Availability reviewed by the office",
    "ur": "دفتر نے دستیابی کا جائزہ لیا"
  },
  "الأسعار على أسس مختلفة؛ اختر أساس السعر لتقارن مبالغ متجانسة.": {
    "en": "Prices use different bases. Select a price basis to compare like amounts.",
    "ur": "قیمتوں کی بنیادیں مختلف ہیں۔ یکساں موازنہ کے لیے قیمت کی بنیاد منتخب کریں۔"
  },
  "جارٍ تحميل خريطة المناطق…": {
    "en": "Loading the area map…",
    "ur": "علاقوں کا نقشہ لوڈ ہو رہا ہے…"
  },
  "استكشف مناطق الكويت": {
    "en": "Explore areas of Kuwait",
    "ur": "کویت کے علاقے دیکھیں"
  },
  "الأرقام تمثل عدد العروض في المنطقة، وليست مواقع العقارات الدقيقة.": {
    "en": "Numbers show listing counts by area, not exact property locations.",
    "ur": "اعداد علاقے میں اشتہارات کی تعداد بتاتے ہیں، جائیدادوں کے درست مقامات نہیں۔"
  },
  "عرض كل المناطق": {
    "en": "Fit all areas",
    "ur": "تمام علاقے دکھائیں"
  },
  "خريطة تجمعات المناطق في الكويت": {
    "en": "Map of area groups in Kuwait",
    "ur": "کویت میں علاقوں کے گروہوں کا نقشہ"
  },
  "تعذر تحميل بعض أجزاء الخريطة. يمكنك اختيار المنطقة من الأزرار أو متابعة القائمة.": {
    "en": "Some map tiles could not load. Choose an area below or continue with the list.",
    "ur": "نقشے کے کچھ حصے لوڈ نہیں ہو سکے۔ نیچے سے علاقہ منتخب کریں یا فہرست استعمال کریں۔"
  },
  "مناطق العروض": {
    "en": "Listing areas",
    "ur": "اشتہارات کے علاقے"
  },
  "مراكز المناطق": {
    "en": "Approximate area centres",
    "ur": "علاقوں کے تخمینی مراکز"
  },
  "تكبير الخريطة": {
    "en": "Zoom in",
    "ur": "نقشہ بڑا کریں"
  },
  "تصغير الخريطة": {
    "en": "Zoom out",
    "ur": "نقشہ چھوٹا کریں"
  },
  "تعذر تحميل الخريطة. العروض والفلاتر متاحة في القائمة أدناه.": {
    "en": "The map could not load. Listings and filters remain available below.",
    "ur": "نقشہ لوڈ نہیں ہو سکا۔ اشتہارات اور فلٹر نیچے فہرست میں دستیاب ہیں۔"
  },
  "معرض صور العقار": {
    "en": "Property photo gallery",
    "ur": "جائیداد کی تصاویر کی گیلری"
  },
  "تكبير الصورة": {
    "en": "Enlarge photo",
    "ur": "تصویر بڑی کریں"
  },
  "تعذر تحميل الصورة. يمكنك متابعة تفاصيل الإعلان.": {
    "en": "The photo could not load. You can still view the listing details.",
    "ur": "تصویر لوڈ نہیں ہو سکی۔ آپ اشتہار کی تفصیلات دیکھ سکتے ہیں۔"
  },
  "الصورة السابقة": {
    "en": "Previous photo",
    "ur": "پچھلی تصویر"
  },
  "الصورة التالية": {
    "en": "Next photo",
    "ur": "اگلی تصویر"
  },
  "اختر صورة": {
    "en": "Choose a photo",
    "ur": "تصویر منتخب کریں"
  },
  "إغلاق معرض الصور": {
    "en": "Close gallery",
    "ur": "گیلری بند کریں"
  },
  "لكل م² · محسوب من بيانات الإعلان": {
    "en": "per m² · calculated from listing data",
    "ur": "فی مربع میٹر · اشتہار کے اعداد سے حساب"
  },
  "رقم الإعلان": {
    "en": "Listing ID",
    "ur": "اشتہار نمبر"
  },
  "أضيف للمنصة": {
    "en": "Added to platform",
    "ur": "پلیٹ فارم پر شامل ہوا"
  },
  "تاريخ مراجعة التوفر": {
    "en": "Availability review date",
    "ur": "دستیابی کے جائزے کی تاریخ"
  },
  "عروض مشابهة": {
    "en": "Similar listings",
    "ur": "ملتے جلتے اشتہارات"
  },
  "من العروض المسجلة؛ تحقق من السعر والتوفر مع المكتب.": {
    "en": "From recorded listings. Confirm price and availability with the office.",
    "ur": "درج شدہ اشتہارات میں سے۔ قیمت اور دستیابی دفتر سے معلوم کریں۔"
  },
  "أبلغ المكتب عن الإعلان": {
    "en": "Report listing to the office",
    "ur": "اشتہار کی اطلاع دفتر کو دیں"
  },
  "يفتح زر المتابعة مسودة واتساب للمكتب. لا يُرسل البلاغ إلا عندما ترسله بنفسك.": {
    "en": "Continue opens a WhatsApp draft to the office. Send it yourself to submit the report.",
    "ur": "جاری رکھنے سے دفتر کے لیے واٹس ایپ مسودہ کھلے گا۔ اطلاع جمع کرنے کے لیے اسے خود بھیجیں۔"
  },
  "سبب البلاغ": {
    "en": "Report reason",
    "ur": "اطلاع کی وجہ"
  },
  "العقار غير متاح": {
    "en": "Property unavailable",
    "ur": "جائیداد دستیاب نہیں"
  },
  "بيانات غير صحيحة": {
    "en": "Incorrect details",
    "ur": "غلط معلومات"
  },
  "مشكلة في الصور": {
    "en": "Photo issue",
    "ur": "تصاویر میں مسئلہ"
  },
  "إعلان مكرر": {
    "en": "Duplicate listing",
    "ur": "دہرایا گیا اشتہار"
  },
  "سبب آخر": {
    "en": "Another reason",
    "ur": "دوسری وجہ"
  },
  "ملاحظات إضافية": {
    "en": "Additional notes",
    "ur": "اضافی نوٹس"
  },
  "متابعة عبر واتساب المكتب": {
    "en": "Continue in office WhatsApp",
    "ur": "دفتر کے واٹس ایپ پر جاری رکھیں"
  },
  "بلاغ بخصوص الإعلان": {
    "en": "Listing report",
    "ur": "اشتہار کے متعلق اطلاع"
  },
  "البحث": {
    "en": "Search",
    "ur": "تلاش"
  }
};

const telegramUI = {
  "تيليجرام · soogQ8": {
    "en": "Telegram · soogQ8",
    "ur": "ٹیلیگرام · soogQ8"
  },
  "قناة soogQ8 · تيليجرام": {
    "en": "soogQ8 channel · Telegram",
    "ur": "soogQ8 چینل · ٹیلیگرام"
  },
  "استيراد قناة تيليجرام": {
    "en": "Import Telegram channel",
    "ur": "ٹیلیگرام چینل درآمد کریں"
  },
  "جلب يدوي من المعاينة العامة أو استيراد تصدير JSON لقناة واحدة. تزال أرقام المعلنين وحساباتهم وروابط التواصل. لا تنقل الصور والفيديو تلقائياً.": {
    "en": "Fetch the public preview manually or import one channel’s JSON export. Advertiser numbers, handles and contact links are removed. Photos and videos are not copied automatically.",
    "ur": "عوامی پیش منظر خود حاصل کریں یا ایک چینل کا JSON ایکسپورٹ درآمد کریں۔ مشتہرین کے نمبر، اکاؤنٹ نام اور رابطے کے لنک حذف ہوتے ہیں۔ تصاویر اور ویڈیو خودکار طور پر نقل نہیں ہوتے۔"
  },
  "منشورات أقدم من الرقم": {
    "en": "Posts older than ID",
    "ur": "اس نمبر سے پرانی پوسٹس"
  },
  "جلب آخر المنشورات": {
    "en": "Fetch recent posts",
    "ur": "حالیہ پوسٹس حاصل کریں"
  },
  "ملف تصدير القناة · JSON": {
    "en": "Channel export · JSON",
    "ur": "چینل ایکسپورٹ · JSON"
  },
  "اختر تصدير قناة soogQ8 وحدها. يعالج الملف على جهازك؛ لا يرفع التصدير الخام.": {
    "en": "Choose an export of soogQ8 only. The file is processed on your device; the raw export is not uploaded.",
    "ur": "صرف soogQ8 کا ایکسپورٹ منتخب کریں۔ فائل آپ کے آلے پر پڑھی جاتی ہے، اصل ایکسپورٹ اپلوڈ نہیں ہوتا۔"
  },
  "من Telegram Desktop: قائمة القناة ← تصدير سجل المحادثة ← JSON. حتى 20 إعلاناً عقارياً في الدفعة من آخر 500 رسالة مفحوصة. الرسائل غير العقارية والطلبات تُتجاوز.": {
    "en": "In Telegram Desktop: channel menu → Export chat history → JSON. Each batch contains up to 20 property offers from the last 500 examined messages. Non-property messages and wanted ads are skipped.",
    "ur": "Telegram Desktop میں: چینل مینو ← چیٹ ہسٹری ایکسپورٹ ← JSON۔ جانچے گئے آخری 500 پیغامات سے فی بیچ زیادہ سے زیادہ 20 جائیداد کے اشتہارات۔ غیر متعلقہ پیغامات اور مطلوبہ جائیداد کی درخواستیں چھوڑ دی جاتی ہیں۔"
  },
  "معاينة ملف القناة": {
    "en": "Preview channel file",
    "ur": "چینل فائل کا پیش منظر"
  },
  "جارٍ جلب المعاينة العامة…": {
    "en": "Fetching the public preview…",
    "ur": "عوامی پیش منظر حاصل ہو رہا ہے…"
  },
  "اختر ملف تصدير JSON للقناة": {
    "en": "Choose the channel JSON export",
    "ur": "چینل کی JSON ایکسپورٹ فائل منتخب کریں"
  },
  "تصدير القناة أكبر من 5 ميغابايت؛ صدّر فترة أقصر": {
    "en": "The channel export exceeds 5 MB. Export a shorter period.",
    "ur": "چینل ایکسپورٹ 5 میگابائٹ سے بڑا ہے۔ کم مدت کا ایکسپورٹ بنائیں۔"
  },
  "معاينة قناة تيليجرام": {
    "en": "Telegram channel preview",
    "ur": "ٹیلیگرام چینل کا پیش منظر"
  },
  "لا توجد رسائل عقارية قابلة للاستخلاص في هذه الدفعة. لم يُحفظ أي إعلان.": {
    "en": "No extractable property offers were found in this batch. No listing was saved.",
    "ur": "اس بیچ میں قابل استخراج جائیداد کے اشتہارات نہیں ملے۔ کوئی اشتہار محفوظ نہیں ہوا۔"
  },
  "راجع إعلانات القناة": {
    "en": "Review channel listings",
    "ur": "چینل کے اشتہارات کا جائزہ لیں"
  },
  "عدد الرسائل المفحوصة": {
    "en": "Messages examined",
    "ur": "جانچے گئے پیغامات"
  },
  "مرشحة في هذه المعاينة": {
    "en": "Candidates in this preview",
    "ur": "اس پیش منظر میں منتخب اشتہارات"
  },
  "الاستخلاص أولي. راجع النوع والمنطقة والسعر وأساسه قبل الحفظ، خصوصاً المنشورات التي تجمع أكثر من عرض. تُحفظ الإعلانات قيد المراجعة، ولا تُعتمد تلقائياً.": {
    "en": "Extraction is provisional. Review the type, area, price and basis, especially posts with multiple offers. Listings are saved for review and are not approved automatically.",
    "ur": "استخراج ابتدائی ہے۔ قسم، علاقہ، قیمت اور بنیاد کی جانچ کریں، خاص طور پر متعدد پیشکشوں والی پوسٹس میں۔ اشتہارات جائزے کے لیے محفوظ ہوتے ہیں، خودکار طور پر منظور نہیں ہوتے۔"
  },
  "المنشور": {
    "en": "Post",
    "ur": "پوسٹ"
  },
  "اختر أساس السعر": {
    "en": "Choose a price basis",
    "ur": "قیمت کی بنیاد منتخب کریں"
  },
  "تاريخ المصدر": {
    "en": "Source date",
    "ur": "ماخذ کی تاریخ"
  },
  "تاريخ نشر المصدر": {
    "en": "Source publication date",
    "ur": "ماخذ کی اشاعت کی تاریخ"
  },
  "راجع المنشور الأصلي": {
    "en": "Review original post",
    "ur": "اصل پوسٹ دیکھیں"
  },
  "راجعت الحقول، والبيانات من قناة soogQ8 المحددة.": {
    "en": "I reviewed the fields and confirm the data is from the specified soogQ8 channel.",
    "ur": "میں نے خانوں کا جائزہ لیا ہے اور تصدیق کرتا ہوں کہ معلومات مقررہ soogQ8 چینل سے ہیں۔"
  },
  "ملخصات حقول فقط. لا تحفظ أرقام المعلنين أو أسماء حساباتهم أو نصوصهم الخام أو وسائطهم. النشر كتجربة أو اعتماد التوفر يتم لاحقاً من مراجعة العقار.": {
    "en": "Only field summaries are saved, without advertiser numbers, handles, raw post text or media. Trial publication and availability approval are separate review steps.",
    "ur": "صرف خانوں کے خلاصے محفوظ ہوتے ہیں؛ مشتہرین کے نمبر، اکاؤنٹ نام، اصل متن یا میڈیا محفوظ نہیں ہوتا۔ تجرباتی اشاعت اور دستیابی کی منظوری الگ جائزے کے مراحل ہیں۔"
  },
  "حفظ إعلانات القناة للمراجعة": {
    "en": "Save channel listings for review",
    "ur": "چینل کے اشتہارات جائزے کے لیے محفوظ کریں"
  },
  "اختر إعلاناً واحداً على الأقل": {
    "en": "Select at least one listing",
    "ur": "کم از کم ایک اشتہار منتخب کریں"
  },
  "نتيجة استيراد القناة": {
    "en": "Channel import result",
    "ur": "چینل درآمد کا نتیجہ"
  },
  "لجلب دفعة أقدم، استخدم رقم": {
    "en": "For an older batch, use ID",
    "ur": "پرانی بیچ کے لیے یہ نمبر استعمال کریں"
  },
  "اختر تصدير JSON لقناة واحدة من تيليجرام": {
    "en": "Choose a JSON export of one Telegram channel",
    "ur": "ایک ٹیلیگرام چینل کا JSON ایکسپورٹ منتخب کریں"
  },
  "رقم المنشور غير صالح": {
    "en": "Invalid post ID",
    "ur": "پوسٹ نمبر درست نہیں"
  },
  "تعذر قراءة منشورات القناة من المعاينة العامة. استخدم ملف تصدير JSON للقناة.": {
    "en": "The public preview could not be read. Use the channel’s JSON export.",
    "ur": "چینل کا عوامی پیش منظر نہیں پڑھا جا سکا۔ چینل کا JSON ایکسپورٹ استعمال کریں۔"
  },
  "تعذر الوصول إلى القناة حالياً. استخدم ملف تصدير JSON للقناة.": {
    "en": "The channel is currently unreachable. Use its JSON export.",
    "ur": "اس وقت چینل تک رسائی نہیں ہو سکی۔ اس کا JSON ایکسپورٹ استعمال کریں۔"
  },
  "معاينة القناة أكبر من المسموح": {
    "en": "The channel preview exceeds the size limit",
    "ur": "چینل کا پیش منظر مقررہ حد سے بڑا ہے"
  },
  "تاريخ المصدر غير صالح": {
    "en": "Invalid source date",
    "ur": "ماخذ کی تاریخ درست نہیں"
  },
  "أكد قناة المصدر ومراجعة البيانات": {
    "en": "Confirm the source channel and data review",
    "ur": "ماخذ چینل اور معلومات کے جائزے کی تصدیق کریں"
  },
  "الدفعة من إعلان واحد إلى 20 إعلاناً": {
    "en": "A batch must contain 1 to 20 listings",
    "ur": "ایک بیچ میں 1 سے 20 اشتہارات ہونے چاہئیں"
  },
  "ملخص حقول من منشور القناة. راجع المكتب لتأكيد البيانات والتوفر والتفويض.": {
    "en": "Field summary from a channel post. Confirm details, availability and marketing authority with the office.",
    "ur": "چینل کی پوسٹ کے خانوں کا خلاصہ۔ معلومات، دستیابی اور تشہیر کی اجازت دفتر سے تصدیق کریں۔"
  },
  "مصدر أضافه صاحب المشروع. تستورد الإدارة ملخصات الإعلانات العقارية بعد تنقية الأرقام وروابط التواصل ومراجعة الحقول. لا توجد مزامنة تلقائية مفعلة.": {
    "en": "A source selected by the project owner. Staff import property summaries after removing contacts and reviewing fields. Automatic synchronisation is not enabled.",
    "ur": "منصوبے کے مالک کا منتخب کردہ ماخذ۔ عملہ رابطے ہٹانے اور خانوں کا جائزہ لینے کے بعد جائیداد کے خلاصے درآمد کرتا ہے۔ خودکار ہم وقت سازی فعال نہیں ہے۔"
  },
  "عدد النتائج الظاهرة من القناة:": {
    "en": "Visible results from the channel:",
    "ur": "چینل سے ظاہر ہونے والے نتائج:"
  }
};

export const translations = {
  'قراءة مختصرة للرد الطويل': {en:'Read a shortened version of this long reply',ur:'اس طویل جواب کا مختصر حصہ سنیں'},
  'مساعد ذكي وصوت سحابي': {en:'AI assistant and cloud voice',ur:'ذہین معاون اور کلاؤڈ آواز'},
  'بحث من بيانات المكتب': {en:'Search the office inventory',ur:'دفتر کے ریکارڈ میں تلاش'},
  'صوت مولّد بالذكاء الاصطناعي. يبدأ التسجيل عند ضغط الميكروفون فقط.': {en:'AI-generated voice. Recording starts only when you press the microphone.',ur:'یہ آواز مصنوعی ذہانت سے تیار ہوتی ہے۔ ریکارڈنگ صرف مائیکروفون دبانے پر شروع ہوتی ہے۔'},
  'الصوت السحابي يدعم العربية والإنجليزية والأردو.': {en:'Cloud voice supports Arabic, English and Urdu.',ur:'کلاؤڈ آواز عربی، انگریزی اور اردو کی معاونت کرتی ہے۔'},
  'أجهز الرد الصوتي…': {en:'Preparing the spoken reply…',ur:'صوتی جواب تیار ہو رہا ہے…'},
  'جارٍ قراءة الرد…': {en:'Reading the reply aloud…',ur:'جواب پڑھا جا رہا ہے…'},
  'اكتملت قراءة الرد.': {en:'Spoken reply finished.',ur:'صوتی جواب مکمل ہوگیا۔'},
  'تعذر تشغيل الصوت السحابي؛ يمكنك إعادة المحاولة أو قراءة النص.': {en:'Cloud audio could not play. Try again or read the text.',ur:'کلاؤڈ آواز نہیں چل سکی۔ دوبارہ کوشش کریں یا متن پڑھیں۔'},
  'التسجيل طويل؛ حاول بسؤال أقصر.': {en:'The recording is too long. Try a shorter question.',ur:'ریکارڈنگ بہت طویل ہے۔ مختصر سوال کریں۔'},
  'أحوّل سؤالك الصوتي إلى نص…': {en:'Transcribing your spoken question…',ur:'آپ کے بولے ہوئے سوال کو تحریر میں بدلا جا رہا ہے…'},
  'الميكروفون غير متاح؛ يمكنك كتابة سؤالك.': {en:'The microphone is unavailable. You can type your question.',ur:'مائیکروفون دستیاب نہیں۔ آپ اپنا سوال لکھ سکتے ہیں۔'},
  'بلغ المساعد الحد اليومي؛ استخدمت البحث من بيانات المكتب.': {en:'The assistant reached its daily limit. I used the office inventory search.',ur:'معاون کی روزانہ حد پوری ہوگئی۔ دفتر کے ریکارڈ میں مقامی تلاش استعمال کی گئی۔'},
  'تعذر الاتصال بالمساعد الذكي؛ استخدمت البحث من بيانات المكتب.': {en:'The AI assistant is unavailable. I used the office inventory search.',ur:'ذہین معاون سے رابطہ نہیں ہوسکا۔ دفتر کے ریکارڈ میں مقامی تلاش استعمال کی گئی۔'},
  'تعذر الاتصال بالمساعد السحابي؛ البحث في بيانات المكتب متاح.': {en:'The cloud assistant is unavailable; office inventory search is still available.',ur:'کلاؤڈ معاون دستیاب نہیں؛ دفتر کے ریکارڈ میں تلاش اب بھی دستیاب ہے۔'},
  'انتهت جلسة المساعد؛ أعد المحاولة.': {en:'The assistant session expired. Try again.',ur:'معاون کا سیشن ختم ہوگیا۔ دوبارہ کوشش کریں۔'},
  'انتهت صلاحية قراءة الرد؛ أرسل السؤال مجدداً.': {en:'This spoken reply expired. Send the question again.',ur:'اس صوتی جواب کی مدت ختم ہوگئی۔ سوال دوبارہ بھیجیں۔'},
  'الخدمة السحابية متوقفة من إعدادات المكتب.': {en:'Cloud service is paused in the office settings.',ur:'دفتر کی ترتیبات میں کلاؤڈ سروس بند ہے۔'},
  'الصوت السحابي غير متصل حالياً.': {en:'Cloud voice is currently disconnected.',ur:'کلاؤڈ آواز فی الحال منسلک نہیں۔'},
  'ملف الصوت غير صالح.': {en:'Invalid audio file.',ur:'آواز کی فائل درست نہیں۔'},
  'مسار المساعد الذكي والصوت السحابي': {en:'AI assistant and cloud voice workflow',ur:'ذہین معاون اور کلاؤڈ آواز کا ورک فلو'},
  'محادثة بالعربية والإنجليزية والأردو من بيانات المكتب، وتسجيل السؤال وقراءة الرد بصوت مولّد بالذكاء الاصطناعي.': {en:'Arabic, English and Urdu conversation grounded in office data, with spoken questions and AI-generated spoken replies.',ur:'دفتر کی معلومات کی بنیاد پر عربی، انگریزی اور اردو میں گفتگو، بولے ہوئے سوالات اور مصنوعی ذہانت سے تیار کردہ صوتی جوابات۔'},
  'متصل بخدمة المكتب': {en:'Connected to the office service',ur:'دفتر کی سروس سے منسلک'},
  'غير متصل أو متوقف من الإعدادات': {en:'Disconnected or paused in settings',ur:'منسلک نہیں یا ترتیبات میں بند ہے'},
  'حد الاستخدام السحابي': {en:'Cloud usage limit',ur:'کلاؤڈ استعمال کی حد'},
  'الحد اليومي لكل خدمة سحابية للمكتب': {en:'Daily limit for each office cloud service',ur:'دفتر کی ہر کلاؤڈ سروس کی روزانہ حد'},
  'صفر يوقف الخدمات السحابية. يطبق الحد على المحادثة وقراءة الصوت وتحويل التسجيل إلى نص، كل خدمة على حدة. الاستخدام الفعلي مسجل في سجل العمليات.': {en:'Zero pauses cloud services. The limit applies separately to chat, spoken replies and transcription. Actual usage is recorded in the activity log.',ur:'صفر سے کلاؤڈ سروسز بند ہوجاتی ہیں۔ حد گفتگو، صوتی جواب اور آواز سے تحریر کی ہر سروس پر الگ لاگو ہوتی ہے۔ اصل استعمال سرگرمی کے ریکارڈ میں درج ہوتا ہے۔'},
  'محادثة المساعد الذكي': {en:'AI assistant conversation',ur:'ذہین معاون کی گفتگو'},
  'قراءة رد صوتي': {en:'Spoken reply',ur:'صوتی جواب'},
  'تحويل سؤال صوتي إلى نص': {en:'Spoken question transcription',ur:'بولے ہوئے سوال کی تحریر'},
  'يبدأ الميكروفون عند ضغطك عليه فقط. تعالج خدمة OpenAI السؤال والتسجيل وأوصاف العروض العامة لتقديم الرد والصوت. لا يحفظ المكتب تسجيل الصوت؛ يخضع استخدام المزود لسياسته.': {en:'The microphone starts only when you press it. OpenAI processes the question, recording and public listing details to provide the response and voice. The office does not store recordings; provider use is subject to its policy.',ur:'مائیکروفون صرف آپ کے دبانے پر شروع ہوتا ہے۔ جواب اور آواز دینے کے لیے OpenAI سوال، ریکارڈنگ اور عوامی اشتہارات کی معلومات پراسیس کرتا ہے۔ دفتر ریکارڈنگ محفوظ نہیں کرتا؛ فراہم کنندہ کا استعمال اس کی پالیسی کے مطابق ہے۔'},
  'الوضع النهاري': {en:'Light appearance',ur:'روشن انداز'},
  'الوضع الليلي': {en:'Dark appearance',ur:'تاریک انداز'},
  'يبدأ الميكروفون عند ضغطك عليه فقط. قد تعالج خدمة المتصفح الصوت للتعرف على الكلام؛ لا يحفظ المكتب تسجيل الصوت.': {en:'The microphone starts only when you press it. Your browser service may process audio for speech recognition; the office does not store an audio recording.',ur:'مائیکروفون صرف آپ کے دبانے پر شروع ہوتا ہے۔ براؤزر کی سروس آواز کو تحریر میں بدلنے کے لیے پراسیس کر سکتی ہے؛ دفتر آواز کی ریکارڈنگ محفوظ نہیں کرتا۔'},
  ...areas,
  ...common,
  ...publicUI,
  ...authUI,
  ...adminUI,
  ...integrationsUI,
  ...assistantUI,
  ...initialListings,
  ...policyTranslations,
  ...serverMessages,
  ...marketUI,
  ...discoveryUI,
  ...telegramUI,
};

// Short, reusable phrases support dynamically assembled labels and amounts.
// Do not add one-letter Arabic keys: they can corrupt words and names.
export const phrases = { ...translations };
