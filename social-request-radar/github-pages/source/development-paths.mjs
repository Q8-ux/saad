export const developmentGuide='https://github.com/Q8-ux/saad/blob/main/social-request-radar/docs/development-paths.md';
const project='https://github.com/Q8-ux/saad/tree/main/social-request-radar';
export const appliedPaths=[
  {name:'ربط مصدر البيانات',status:'مفعّل · إعداد المصدر مطلوب',detail:'خادم الجمع مربوط بهذه النسخة. راجع حالته في مصادر البيانات؛ صلاحية مفتاحك وتوفر التعليقات يُختبران عند أول بحث.',url:project+'/edge'},
  {name:'هوية التعليقات ووقت المصدر',status:'مفعّل',detail:'المعرّف ثابت عند إعادة الاستيراد، مع فصل وقت الجمع عن وقت الاستيراد وإبقاء المجهول غير مسجل.',url:project+'/lib'},
  {name:'فهم الأسئلة العربية',status:'مفعّل بقواعد قابلة للمراجعة',detail:'التقاط أسئلة مثل «كم» و«شلون» وطلبات التوصية، مع إظهار الكلمات التي دعمت التصنيف.',url:project+'/lib'},
  {name:'فهم الجمهور ونمو الحساب',status:'مفعّل من بياناتك',detail:'موضوعات مدعومة باقتباسات أصلية وروابطها، وزاوية محتوى وتجربة مقترحة وقياسات بفترات واضحة.',url:project+'/github-pages/source'},
  {name:'تصدير يحفظ الأصل',status:'مفعّل',detail:'JSON لحفظ النص والبيانات الأصلية، وCSV للمراجعة في الجداول مع حماية الخلايا من الصيغ.',url:project+'/lib'},
  {name:'سهولة الاستخدام والأداء',status:'مفعّل',detail:'خط عربي أكبر وأزرار لمس أوضح، مع عرض النتائج على دفعات وتصدير كامل النتائج المحددة.',url:project+'/github-pages/source'},
  {name:'حدود الاستخدام وحماية المفتاح',status:'مفعّل بحدود الجولة',detail:'المفتاح محفوظ مشفرًا؛ الطلبات والكريدتس محدودة لكل جولة. لا يوجد سقف إنفاق يومي مشترك حتى الآن.',url:project+'/edge'},
];
export const researchPaths=[
  {name:'yt-dlp',group:'جمع التعليقات',status:'الاستيراد متوافق · الجامع غير مربوط',repository:'yt-dlp/yt-dlp',license:'Unlicense للمصدر؛ تراخيص إضافية لبعض الحزم التنفيذية',detail:'جمع تعليقات YouTube لروابط محددة بحد لعدد التعليقات والمدة، ثم استيراد ملف info.json. يحتاج تشغيل Python أو CLI مستقل.'},
  {name:'Instaloader',group:'جمع التعليقات',status:'الاستيراد متوافق · الجامع غير مربوط',repository:'instaloader/instaloader',license:'MIT',detail:'تعليقات منشورات إنستجرام وردودها عبر get_comments. يحتاج جلسة عند طلب المنصة وحدودًا للصفحات والمدة؛ ليس فهرسًا لكل التعليقات.'},
  {name:'instagrapi',group:'جمع التعليقات',status:'الاستيراد متوافق · الجامع غير مربوط',repository:'subzeroid/instagrapi',license:'MIT',detail:'صفحات تعليقات وردود إنستجرام في Python. واجهة غير رسمية تتأثر بالجلسة وتغييرات المنصة؛ تُراجع للاستخدام المحدود قبل ربطها.'},
  {name:'Agent-Reach',group:'اكتشاف المصادر',status:'مرجع بحث',repository:'Panniantong/Agent-Reach',license:'MIT؛ الأدوات التابعة لها تراخيص مستقلة',detail:'توجيه البحث وتشخيص الأدوات المتاحة عبر المنصات. لا يضيف وحده محرك بحث عالميًا لتعليقات إنستجرام.'},
  {name:'MiniSearch',group:'توسعة البحث',status:'مقترح بعد قياس حجم البيانات',repository:'lucaong/minisearch',license:'MIT',detail:'فهرس بحث محلي للكلمات والبادئات والتقريب الإملائي مع إعداد عربي مخصص. لا يستنتج نية صاحب التعليق؛ لم يُثبت في التطبيق.'},
  {name:'Transformers.js',group:'توسعة التحليل',status:'اختياري بعد تقييم العربية',repository:'huggingface/transformers.js',license:'Apache-2.0؛ ترخيص النموذج منفصل',detail:'تجربة تجميع الأسئلة المتقاربة دلاليًا في المتصفح عبر عامل مستقل وتحميل اختياري. يحتاج قياس الذاكرة وحجم النموذج ودقته باللهجات.'},
  {name:'Sentence Transformers',group:'توسعة التحليل',status:'اختياري في عامل Python مستقل',repository:'huggingface/sentence-transformers',license:'Apache-2.0؛ ترخيص كل نموذج يُراجع',detail:'تضمينات متعددة اللغات لمقارنة الأسئلة. تُختبر بعينة عربية مصنفة يدويًا قبل اعتمادها؛ ليست ضمن الخادم الحالي.'},
  {name:'BERTopic',group:'توسعة التحليل',status:'مرحلة لاحقة عند توفر corpus كافٍ',repository:'MaartenGr/BERTopic',license:'MIT؛ النماذج والاعتماديات منفصلة',detail:'استخراج موضوعات من مجموعة تعليقات أكبر عبر Python، مع إظهار أمثلة كل مجموعة ومراجعتها. غير مثبت حاليًا.'},
  {name:'CAMeL Tools',group:'تحسين العربية',status:'بحث اختياري',repository:'CAMeL-Lab/camel_tools',license:'MIT للمكتبة؛ بعض حزم البيانات GPLv2 أو تراخيص أخرى',detail:'أدوات عربية للصرف والتحليل. تحتاج مراجعة حزمة البيانات والترخيص والدقة حسب اللهجة قبل اختيار المكونات.'},
  {name:'TanStack Virtual',group:'أداء الواجهة',status:'عند ظهور حاجة مقاسة',repository:'TanStack/virtual',license:'MIT',detail:'عرض قوائم كبيرة دون إنشاء جميع البطاقات. الدفعات الحالية تكفي كبداية؛ يُضاف عند قياس بطء فعلي مع الحفاظ على العربية ولوحة المفاتيح.'},
];
