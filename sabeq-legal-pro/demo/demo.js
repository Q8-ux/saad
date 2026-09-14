'use strict';
(() => {
  const KEY = 'legal-platform-independent-demo-v1';
  const PREF = 'legal-platform-demo-preferences-v1';
  const langs = {ar:'العربية',en:'English',ur:'اردو'};
  const strings = {
    ar:{brand:'المنصة القانونية',subtitle:'العقود وإدارة المكتب',demo:'نسخة تجريبية',demoNote:'بدون تسجيل دخول · بيانات تجريبية محفوظة على هذا الجهاز',reset:'إعادة الديمو',workspace:'مساحة العمل',guest:'زائر الديمو',guestRole:'تجربة مستقلة',dashboard:'نظرة عامة',clients:'العملاء',cases:'القضايا',hearings:'الجلسات والمواعيد',invoices:'الفواتير',memos:'المذكرات',library:'مكتبة النماذج',search:'البحث',settings:'الإعدادات',welcome:'أهلاً بك في الديمو',welcomeNote:'جرّب إدارة ملفات المكتب، من العميل إلى المذكرة.',add:'إضافة',newClient:'عميل جديد',newCase:'قضية جديدة',newHearing:'موعد جديد',newInvoice:'فاتورة جديدة',newMemo:'مذكرة جديدة',newDocument:'نموذج جديد',edit:'تعديل',delete:'حذف',view:'عرض',save:'حفظ',cancel:'إلغاء',close:'إغلاق',name:'الاسم',phone:'الهاتف',email:'البريد الإلكتروني',notes:'ملاحظات',client:'العميل',case:'القضية',caseNumber:'رقم القضية',court:'المحكمة',caseType:'نوع القضية',opponent:'الطرف الآخر',status:'الحالة',title:'العنوان',date:'التاريخ',time:'الوقت',location:'المكان',amount:'القيمة (د.ك)',paid:'المدفوع (د.ك)',dueDate:'تاريخ الاستحقاق',description:'البيان',facts:'الوقائع التجريبية',requests:'الطلبات التجريبية',content:'محتوى النموذج',category:'التصنيف',active:'جارية',closed:'مغلقة',pending:'قيد المتابعة',scheduled:'قادمة',done:'مكتملة',unpaid:'غير مدفوعة',partial:'مدفوعة جزئياً',settled:'مدفوعة',currency:'د.ك',record:'سجل',filter:'ابحث في السجلات…',noRecords:'لا توجد سجلات',noResults:'لا توجد نتائج مطابقة',emptyNote:'يمكنك إضافة سجل وتجربة خطوات العمل.',all:'الكل',upcoming:'المواعيد القادمة',viewAll:'عرض الكل',financial:'ملخص الفواتير التجريبية',total:'إجمالي الفواتير',received:'المبلغ المحصل',outstanding:'الرصيد المتبقي',totalClients:'عملاء تجريبيون',activeCases:'القضايا الجارية',nextHearings:'مواعيد قادمة',balance:'رصيد الفواتير',quickClient:'أضف عميلك الأول',quickClientNote:'جرّب الإضافة والتعديل',quickCase:'افتح ملف قضية',quickCaseNote:'اربط القضية بالعميل',quickMemo:'اكتب مسودة',quickMemoNote:'نموذج محلي قابل للتعديل',saved:'تم الحفظ على هذا الجهاز.',removed:'تم حذف السجل التجريبي.',resetTitle:'إعادة البيانات التجريبية؟',resetNote:'ستُستبدل تعديلات الديمو على هذا الجهاز بالنماذج الأصلية.',deleteTitle:'حذف السجل التجريبي؟',deleteNote:'سيُحذف هذا السجل من نسختك المحلية من الديمو.',linked:'هذا السجل مرتبط بسجلات أخرى. عدّل الربط قبل الحذف.',noLink:'بدون ربط',memoNotice:'المذكرات هنا نماذج توضيحية محلية؛ لا تستخدم الذكاء الاصطناعي أو مصادر قانونية حقيقية.',libraryNotice:'هذه قوالب تجريبية لتجربة تنظيم المحتوى، وليست نصوص قوانين أو مراجع قانونية.',download:'تنزيل النص',copy:'نسخ',copied:'تم نسخ النص.',copyFailed:'تعذّر النسخ؛ استخدم تنزيل النص.',created:'تاريخ الإضافة',searchHint:'ابحث في العملاء والقضايا والنماذج التجريبية.',searchButton:'بحث',query:'كلمة البحث',officeName:'اسم المكتب التجريبي',appearance:'المظهر واللغة',language:'لغة الواجهة',light:'فاتح',dark:'داكن',deviceData:'بيانات الديمو',deviceNote:'تُحفظ التعديلات محلياً في هذا المتصفح. استخدم معلومات تجريبية فقط.',export:'تنزيل بيانات الديمو',menu:'فتح القائمة',theme:'تبديل المظهر',footer:'ديمو مستقل · لا يطلب حساباً ولا يتصل ببيانات المكتب',storageError:'تعذّر الحفظ على الجهاز. التعديلات متاحة حتى إغلاق الصفحة.',invalidAmount:'تحقق من قيمة الفاتورة والمدفوع؛ المدفوع لا يتجاوز القيمة.',sample:'تجريبي',upload:'استيراد TXT',uploadError:'اختر ملف TXT أو MD أقل من 500 كيلوبايت.',uploadSuccess:'تم استيراد النموذج محلياً.',confirm:'تأكيد',settingsNote:'إعدادات هذه النسخة التجريبية فقط.',business:'ملف تجاري',civil:'ملف مدني',consultation:'استشارة',templates:'نماذج تجريبية',draftLabel:'مسودة توضيحية — غير معتمدة',noUpcoming:'لا توجد مواعيد قادمة.',new:'جديد'},
    en:{brand:'Legal Platform',subtitle:'Contracts & office management',demo:'Demo',demoNote:'No login · Sample data stored on this device',reset:'Reset demo',workspace:'Workspace',guest:'Demo visitor',guestRole:'Independent demo',dashboard:'Overview',clients:'Clients',cases:'Cases',hearings:'Hearings & meetings',invoices:'Invoices',memos:'Memos',library:'Sample library',search:'Search',settings:'Settings',welcome:'Welcome to the demo',welcomeNote:'Try the office workflow, from client to memo.',add:'Add',newClient:'New client',newCase:'New case',newHearing:'New meeting',newInvoice:'New invoice',newMemo:'New memo',newDocument:'New template',edit:'Edit',delete:'Delete',view:'View',save:'Save',cancel:'Cancel',close:'Close',name:'Name',phone:'Phone',email:'Email',notes:'Notes',client:'Client',case:'Case',caseNumber:'Case number',court:'Court',caseType:'Case type',opponent:'Other party',status:'Status',title:'Title',date:'Date',time:'Time',location:'Location',amount:'Amount (KWD)',paid:'Paid (KWD)',dueDate:'Due date',description:'Description',facts:'Sample facts',requests:'Sample requests',content:'Template content',category:'Category',active:'Active',closed:'Closed',pending:'Pending',scheduled:'Upcoming',done:'Completed',unpaid:'Unpaid',partial:'Partially paid',settled:'Paid',currency:'KWD',record:'records',filter:'Search records…',noRecords:'No records',noResults:'No matching results',emptyNote:'Add a record to try the workflow.',all:'All',upcoming:'Upcoming meetings',viewAll:'View all',financial:'Sample invoice summary',total:'Total invoices',received:'Received',outstanding:'Outstanding',totalClients:'Sample clients',activeCases:'Active cases',nextHearings:'Upcoming meetings',balance:'Invoice balance',quickClient:'Add your first client',quickClientNote:'Try adding and editing',quickCase:'Open a case file',quickCaseNote:'Link a case to a client',quickMemo:'Write a draft',quickMemoNote:'An editable local template',saved:'Saved on this device.',removed:'Sample record deleted.',resetTitle:'Reset demo data?',resetNote:'Your local demo changes will be replaced with the original examples.',deleteTitle:'Delete sample record?',deleteNote:'This record will be removed from your local demo.',linked:'This record has links. Update related records before deleting.',noLink:'No link',memoNotice:'These are local illustrative templates. They do not use AI or actual legal sources.',libraryNotice:'These samples demonstrate content organization; they are not laws or legal references.',download:'Download text',copy:'Copy',copied:'Text copied.',copyFailed:'Copy unavailable. Use Download text.',created:'Created',searchHint:'Search sample clients, cases and templates.',searchButton:'Search',query:'Search term',officeName:'Demo office name',appearance:'Appearance & language',language:'Interface language',light:'Light',dark:'Dark',deviceData:'Demo data',deviceNote:'Changes are stored only in this browser. Use sample information only.',export:'Download demo data',menu:'Open menu',theme:'Toggle appearance',footer:'Independent demo · No account or connection to office data',storageError:'Unable to save on this device. Changes last until the page is closed.',invalidAmount:'Check the invoice amounts. Paid cannot exceed the total.',sample:'Sample',upload:'Import TXT',uploadError:'Choose a TXT or MD file under 500 KB.',uploadSuccess:'Template imported locally.',confirm:'Confirm',settingsNote:'Settings for this demo only.',business:'Commercial file',civil:'Civil file',consultation:'Consultation',templates:'Sample templates',draftLabel:'Illustrative draft — not approved',noUpcoming:'No upcoming meetings.',new:'New'},
    ur:{brand:'قانونی پلیٹ فارم',subtitle:'معاہدے اور دفتر کا انتظام',demo:'ڈیمو',demoNote:'لاگ اِن کے بغیر · نمونہ ڈیٹا اس آلے پر محفوظ ہے',reset:'ڈیمو بحال کریں',workspace:'کام کی جگہ',guest:'ڈیمو صارف',guestRole:'الگ ڈیمو',dashboard:'جائزہ',clients:'کلائنٹس',cases:'مقدمات',hearings:'سماعتیں اور ملاقاتیں',invoices:'انوائس',memos:'یادداشتیں',library:'نمونہ لائبریری',search:'تلاش',settings:'ترتیبات',welcome:'ڈیمو میں خوش آمدید',welcomeNote:'کلائنٹ سے یادداشت تک دفتر کے کام آزمائیں۔',add:'شامل کریں',newClient:'نیا کلائنٹ',newCase:'نیا مقدمہ',newHearing:'نئی ملاقات',newInvoice:'نئی انوائس',newMemo:'نئی یادداشت',newDocument:'نیا نمونہ',edit:'ترمیم',delete:'حذف',view:'دیکھیں',save:'محفوظ کریں',cancel:'منسوخ',close:'بند کریں',name:'نام',phone:'فون',email:'ای میل',notes:'نوٹس',client:'کلائنٹ','case':'مقدمہ',caseNumber:'مقدمہ نمبر',court:'عدالت',caseType:'مقدمے کی نوعیت',opponent:'دوسرا فریق',status:'حالت',title:'عنوان',date:'تاریخ',time:'وقت',location:'جگہ',amount:'رقم (KWD)',paid:'ادا شدہ (KWD)',dueDate:'آخری تاریخ',description:'تفصیل',facts:'نمونہ حقائق',requests:'نمونہ درخواستیں',content:'نمونے کا متن',category:'زمرہ',active:'جاری',closed:'بند',pending:'زیر غور',scheduled:'آئندہ',done:'مکمل',unpaid:'غیر ادا شدہ',partial:'جزوی ادا شدہ',settled:'ادا شدہ',currency:'KWD',record:'ریکارڈ',filter:'ریکارڈ تلاش کریں…',noRecords:'کوئی ریکارڈ نہیں',noResults:'کوئی نتیجہ نہیں',emptyNote:'کام آزمانے کے لیے ریکارڈ شامل کریں۔',all:'سب',upcoming:'آئندہ ملاقاتیں',viewAll:'سب دیکھیں',financial:'نمونہ انوائس کا خلاصہ',total:'کل انوائس',received:'وصول شدہ',outstanding:'بقایا',totalClients:'نمونہ کلائنٹس',activeCases:'جاری مقدمات',nextHearings:'آئندہ ملاقاتیں',balance:'بقایا رقم',quickClient:'کلائنٹ شامل کریں',quickClientNote:'اضافہ اور ترمیم آزمائیں',quickCase:'مقدمہ کھولیں',quickCaseNote:'کلائنٹ سے جوڑیں',quickMemo:'مسودہ لکھیں',quickMemoNote:'قابل ترمیم مقامی نمونہ',saved:'اس آلے پر محفوظ ہوا۔',removed:'نمونہ ریکارڈ حذف ہوا۔',resetTitle:'ڈیمو بحال کریں؟',resetNote:'مقامی تبدیلیاں اصل نمونوں سے بدل دی جائیں گی۔',deleteTitle:'نمونہ حذف کریں؟',deleteNote:'یہ ریکارڈ آپ کے مقامی ڈیمو سے ہٹ جائے گا۔',linked:'یہ ریکارڈ منسلک ہے۔ پہلے متعلقہ ریکارڈ بدلیں۔',noLink:'بغیر ربط',memoNotice:'یہ مقامی نمائشی نمونے ہیں۔ ان میں AI یا حقیقی قانونی ذرائع استعمال نہیں ہوتے۔',libraryNotice:'یہ تنظیم کی مثالیں ہیں، قوانین یا قانونی حوالہ جات نہیں۔',download:'متن ڈاؤن لوڈ',copy:'نقل',copied:'متن نقل ہوا۔',copyFailed:'نقل ممکن نہیں۔ متن ڈاؤن لوڈ کریں۔',created:'تاریخ تخلیق',searchHint:'نمونہ کلائنٹس، مقدمات اور دستاویزات تلاش کریں۔',searchButton:'تلاش',query:'تلاش کا لفظ',officeName:'نمونہ دفتر کا نام',appearance:'انداز اور زبان',language:'زبان',light:'روشن',dark:'تاریک',deviceData:'ڈیمو ڈیٹا',deviceNote:'تبدیلیاں صرف اس براؤزر میں محفوظ ہیں۔ صرف نمونہ معلومات استعمال کریں۔',export:'ڈیمو ڈیٹا ڈاؤن لوڈ',menu:'مینو کھولیں',theme:'انداز بدلیں',footer:'الگ ڈیمو · اکاؤنٹ یا دفتر کے ڈیٹا سے کوئی رابطہ نہیں',storageError:'محفوظ نہیں ہوا۔ تبدیلیاں صفحہ بند ہونے تک رہیں گی۔',invalidAmount:'ادا شدہ رقم کل رقم سے زیادہ نہیں ہو سکتی۔',sample:'نمونہ',upload:'TXT درآمد',uploadError:'500 KB سے چھوٹی TXT یا MD فائل چنیں۔',uploadSuccess:'نمونہ مقامی طور پر درآمد ہوا۔',confirm:'تصدیق',settingsNote:'صرف اس ڈیمو کی ترتیبات۔',business:'تجارتی فائل',civil:'دیوانی فائل',consultation:'مشاورت',templates:'نمونہ دستاویزات',draftLabel:'نمونہ مسودہ — غیر منظور شدہ',noUpcoming:'کوئی آئندہ ملاقات نہیں۔',new:'نیا'}
  };
  const paths = {
    scale:'M12 3v17M6 7h12M6 7 2 15h8L6 7m12 0-4 8h8l-4-8M7 21h10',
    dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    clients:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    cases:'M3 7h7l2-3h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7zM3 9h18',
    hearings:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M7 14h2m6 0h2M7 18h2',
    invoices:'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 7h6M9 11h6M9 15h3',
    memos:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M8 13h8M8 17h6',
    library:'M4 3h4v18H4zM10 3h4v18h-4zM16 4l3-1 3 17-3 1-3-17',
    search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    add:'M12 5v14M5 12h14',edit:'M16 3l5 5M3 21l5-1L21 7a2.8 2.8 0 0 0-4-4L4 16l-1 5z',
    delete:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    view:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    close:'M6 6l12 12M6 18 18 6',menu:'M4 6h16M4 12h16M4 18h16',
    theme:'M20.9 13a9 9 0 1 1-9.9-9.9A7 7 0 0 0 20.9 13',
    check:'M5 12l4 4L19 6',download:'M12 3v12M8 11l4 4 4-4M4 17v4h16v-4',
    copy:'M9 9h12v12H9zM5 15H3V3h12v2',upload:'M12 16V4M8 8l4-4 4 4M4 17v4h16v-4'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.memos)+'"/></svg>';
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const resources = ['clients','cases','hearings','invoices','memos','library'];
  const nav = ['dashboard',...resources,'search','settings'];
  const newKey = {clients:'newClient',cases:'newCase',hearings:'newHearing',invoices:'newInvoice',memos:'newMemo',library:'newDocument'};
  const localDate = offset => {const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  function seed() {
    return {version:1,settings:{officeName:'المكتب التجريبي'},clients:[
      {id:1,name:'عميل تجريبي ١',phone:'',email:'client1@example.invalid',notes:'بيانات توضيحية لتجربة إدارة العملاء.',created:localDate(-8)},
      {id:2,name:'شركة تجريبية',phone:'',email:'company@example.invalid',notes:'ملف شركة افتراضية.',created:localDate(-6)},
      {id:3,name:'عميل تجريبي ٣',phone:'',email:'client3@example.invalid',notes:'ملف استشارة تجريبي.',created:localDate(-3)}
    ],cases:[
      {id:11,caseNumber:'DEMO-2026-101',clientId:1,court:'محكمة تجريبية',caseType:'civil',opponent:'طرف تجريبي',status:'active',notes:'ملف لتجربة ربط العميل بالمواعيد والمذكرة.',created:localDate(-7)},
      {id:12,caseNumber:'DEMO-2026-102',clientId:2,court:'محكمة تجريبية',caseType:'business',opponent:'شركة افتراضية',status:'active',notes:'تجربة ترتيب مستندات الملف.',created:localDate(-5)},
      {id:13,caseNumber:'DEMO-2026-103',clientId:3,court:'',caseType:'consultation',opponent:'',status:'closed',notes:'استشارة افتراضية مكتملة.',created:localDate(-2)}
    ],hearings:[
      {id:21,title:'جلسة تجريبية لمراجعة الملف',caseId:11,date:localDate(2),time:'09:30',location:'قاعة تجريبية ١',status:'scheduled',notes:''},
      {id:22,title:'اجتماع مراجعة المستندات',caseId:12,date:localDate(4),time:'11:00',location:'المكتب التجريبي',status:'scheduled',notes:''},
      {id:23,title:'استشارة تجريبية مكتملة',caseId:13,date:localDate(-1),time:'10:00',location:'اجتماع افتراضي',status:'done',notes:''}
    ],invoices:[
      {id:31,title:'DEMO-INV-001',clientId:1,caseId:11,amountFils:500000,paidFils:250000,dueDate:localDate(7),description:'أتعاب افتراضية لتجربة الفوترة.',created:localDate(-6)},
      {id:32,title:'DEMO-INV-002',clientId:2,caseId:12,amountFils:600000,paidFils:0,dueDate:localDate(10),description:'فاتورة توضيحية.',created:localDate(-4)},
      {id:33,title:'DEMO-INV-003',clientId:3,caseId:13,amountFils:150000,paidFils:150000,dueDate:localDate(-1),description:'استشارة افتراضية مكتملة.',created:localDate(-2)}
    ],memos:[
      {id:41,title:'مسودة تجريبية لتنظيم ملف',caseId:11,facts:'أُنشئ ملف افتراضي لتجربة ترتيب الوقائع وربطها بالقضية.',requests:'استكمال المستندات التجريبية ومراجعة ترتيبها.',content:'مسودة توضيحية — غير معتمدة\n\nالعنوان: مسودة تجريبية لتنظيم ملف\n\nالوقائع التجريبية:\nأُنشئ ملف افتراضي لتجربة ترتيب الوقائع وربطها بالقضية.\n\nالطلبات التجريبية:\nاستكمال المستندات التجريبية ومراجعة ترتيبها.\n\nهذا نموذج محلي لتجربة الواجهة، وليس مذكرة قانونية معتمدة.',created:localDate(-2)}
    ],library:[
      {id:51,title:'قالب ترتيب مستندات الملف',category:'نماذج تجريبية',content:'نموذج تجريبي لتنظيم ملف\n\n١. تعريف الملف التجريبي.\n٢. قائمة المستندات.\n٣. المواعيد المسجلة.\n٤. ملاحظات فريق العمل.\n\nهذا المثال يشرح تنظيم البيانات فقط، ولا يتضمن قانوناً أو رأياً قانونياً.',created:localDate(-3)},
      {id:52,title:'قالب محضر اجتماع',category:'نماذج تجريبية',content:'محضر اجتماع تجريبي\n\nعنوان الاجتماع:\nالتاريخ والوقت:\nالمشاركون الافتراضيون:\nالنقاط المطروحة:\nالمهام والمتابعة:\n\nاملأ هذا القالب بمعلومات تجريبية لتجربة الحفظ والتعديل.',created:localDate(-1)}
    ]};
  }
  function load() {try{const v=JSON.parse(localStorage.getItem(KEY));if(v?.version===1&&resources.every(r=>Array.isArray(v[r]))&&v.settings&&typeof v.settings.officeName==='string')return v;}catch{}return seed();}
  let data=load(),prefs={lang:'ar',theme:'light'};
  try{const p=JSON.parse(localStorage.getItem(PREF));if(p&&langs[p.lang])prefs.lang=p.lang;if(p?.theme==='dark')prefs.theme='dark';}catch{}
  let page='dashboard',filter='',searchQuery='',drawer=false,toastTimer,formContext=null,previewContext=null;
  const t=key=>strings[prefs.lang][key]||strings.ar[key]||key;
  const locale=()=>prefs.lang==='en'?'en-KW':prefs.lang==='ur'?'ur-PK':'ar-KW';
  const num=value=>Number(value||0).toLocaleString(locale());
  const money=value=>(Number(value||0)/1000).toLocaleString(locale(),{minimumFractionDigits:3,maximumFractionDigits:3})+' '+t('currency');
  const date=value=>value?new Date(value+'T12:00:00').toLocaleDateString(locale(),{year:'numeric',month:'short',day:'numeric'}):'—';
  const textId=(r,id)=>{const v=data[r].find(x=>x.id===Number(id));return v?(v.name||v.caseNumber||v.title):t('noLink');};
  const invoiceStatus=r=>r.paidFils>=r.amountFils?'settled':r.paidFils>0?'partial':'unpaid';
  const status=s=>'<span class="badge '+(['pending','partial','unpaid'].includes(s)?'pending':s==='closed'?'closed':'')+'">'+esc(t(s))+'</span>';
  const toast=message=>{const el=document.getElementById('toast');clearTimeout(toastTimer);el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),3600);};
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{toast(t('storageError'));return false;}}
  function savePrefs(){try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}}
  function btn(action,label,kind='',symbol='',extra=''){return '<button type="button" class="btn '+kind+'" data-action="'+esc(action)+'" '+extra+'>'+ (symbol?icon(symbol):'')+esc(t(label))+'</button>';}
  function rowsActions(r,row){return '<div class="row-actions">'+['view','edit','delete'].map(a=>'<button type="button" class="icon-btn '+(a==='delete'?'danger':'')+'" data-action="'+a+'" data-resource="'+r+'" data-id="'+row.id+'" aria-label="'+esc(t(a)+' '+(row.name||row.caseNumber||row.title))+'">'+icon(a)+'</button>').join('')+'</div>';}
  function table(headers,rows){return '<div class="panel table-wrap"><table class="data-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(t(h))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(c=>'<tr>'+c.map((v,i)=>'<td data-label="'+esc(t(headers[i]))+'">'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function empty(key='noRecords'){return '<div class="panel empty">'+icon('cases')+'<strong>'+esc(t(key))+'</strong><p>'+esc(t('emptyNote'))+'</p>'+ (newKey[page]?btn('new',newKey[page],'primary','add','data-resource="'+page+'"'):'')+'</div>';}
  function dashboard(){
    const active=data.cases.filter(r=>r.status==='active').length;
    const upcoming=data.hearings.filter(r=>r.status==='scheduled'&&r.date>=localDate(0)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const totals=data.invoices.reduce((a,r)=>({amount:a.amount+r.amountFils,paid:a.paid+r.paidFils}),{amount:0,paid:0});
    const stats=[['totalClients',num(data.clients.length),'clients'],['activeCases',num(active),'cases'],['nextHearings',num(upcoming.length),'hearings'],['balance',money(totals.amount-totals.paid),'invoices']];
    return '<div class="stats">'+stats.map(([label,val,symbol])=>'<article class="stat"><div class="stat-top"><span>'+esc(t(label))+'</span><span class="stat-icon">'+icon(symbol)+'</span></div><strong>'+esc(val)+'</strong><small>'+esc(t('sample'))+'</small></article>').join('')+'</div><div class="grid-two"><section class="panel"><div class="panel-head"><h2>'+esc(t('upcoming'))+'</h2><button data-nav="hearings">'+esc(t('viewAll'))+'</button></div><div class="panel-body timeline">'+(upcoming.length?upcoming.slice(0,4).map(r=>'<article class="timeline-item"><div class="date-tile"><strong>'+num(Number(r.date.slice(-2)))+'</strong><small>'+esc(new Date(r.date+'T12:00:00').toLocaleDateString(locale(),{month:'short'}))+'</small></div><div><h3>'+esc(r.title)+'</h3><p>'+esc(r.time+' · '+r.location)+'</p><p>'+esc(textId('cases',r.caseId))+'</p></div></article>').join(''):'<p class="muted">'+esc(t('noUpcoming'))+'</p>')+'</div></section><section class="panel"><div class="panel-head"><h2>'+esc(t('financial'))+'</h2>'+icon('invoices')+'</div><div class="panel-body"><div class="money-row"><span>'+esc(t('total'))+'</span><strong>'+esc(money(totals.amount))+'</strong></div><div class="money-row total"><span>'+esc(t('received'))+'</span><strong>'+esc(money(totals.paid))+'</strong></div><div class="money-row"><span>'+esc(t('outstanding'))+'</span><strong>'+esc(money(totals.amount-totals.paid))+'</strong></div></div></section></div><div class="quick-grid">'+[['clients','quickClient','quickClientNote'],['cases','quickCase','quickCaseNote'],['memos','quickMemo','quickMemoNote']].map(([r,label,note])=>'<button class="quick" data-action="new" data-resource="'+r+'">'+icon(r)+'<span><strong>'+esc(t(label))+'</strong><small>'+esc(t(note))+'</small></span></button>').join('')+'</div>';
  }
  function filtered(r){const q=filter.trim().toLowerCase();return data[r].filter(x=>!q||Object.values(x).some(v=>String(v).toLowerCase().includes(q))||(['cases','invoices'].includes(r)&&textId('clients',x.clientId).toLowerCase().includes(q)));}
  function listPage(r){
    const list=filtered(r);
    const toolbar='<div class="toolbar"><label class="search-box">'+icon('search')+'<input id="filter" type="search" aria-label="'+esc(t('filter'))+'" placeholder="'+esc(t('filter'))+'" value="'+esc(filter)+'"></label><span class="count-label">'+num(list.length)+' '+esc(t('record'))+'</span></div>';
    if(!list.length)return toolbar+empty(filter?'noResults':'noRecords');
    if(r==='memos'||r==='library')return '<div class="note">'+esc(t(r==='memos'?'memoNotice':'libraryNotice'))+'</div>'+toolbar+(r==='library'?'<div class="toolbar">'+btn('upload','upload','subtle','upload')+'<input type="file" id="upload-file" accept=".txt,.md,text/plain,text/markdown" hidden></div>':'')+'<div class="cards">'+list.map(row=>'<article class="doc-card"><span class="demo-tag">'+esc(t('sample'))+'</span><h2>'+esc(row.title)+'</h2><p>'+esc((row.facts||row.content).slice(0,135))+'</p><small class="muted">'+esc(date(row.created))+'</small>'+rowsActions(r,row)+'</article>').join('')+'</div>';
    if(r==='clients')return toolbar+table(['name','phone','email',''],list.map(row=>['<span><span class="record-name">'+esc(row.name)+'</span><small class="record-sub">'+esc(row.notes)+'</small></span>',esc(row.phone||'—'),'<span dir="ltr">'+esc(row.email||'—')+'</span>',rowsActions(r,row)]));
    if(r==='cases')return toolbar+table(['caseNumber','client','court','status',''],list.map(row=>['<span><strong class="record-name">'+esc(row.caseNumber)+'</strong><small class="record-sub">'+esc(t(row.caseType))+'</small></span>',esc(textId('clients',row.clientId)),esc(row.court||'—'),status(row.status),rowsActions(r,row)]));
    if(r==='hearings')return toolbar+table(['title','date','time','status',''],list.sort((a,b)=>a.date.localeCompare(b.date)).map(row=>['<span><strong class="record-name">'+esc(row.title)+'</strong><small class="record-sub">'+esc(textId('cases',row.caseId))+'</small></span>',esc(date(row.date)),esc(row.time),status(row.status),rowsActions(r,row)]));
    return toolbar+table(['title','client','amount','paid','status',''],list.map(row=>[esc(row.title),esc(textId('clients',row.clientId)),esc(money(row.amountFils)),esc(money(row.paidFils)),status(invoiceStatus(row)),rowsActions(r,row)]));
  }
  function searchPage(){
    const q=searchQuery.trim().toLowerCase();
    const matches=q?resources.flatMap(r=>data[r].filter(x=>Object.values(x).some(v=>String(v).toLowerCase().includes(q))).map(x=>({r,x}))):[];
    return '<form id="search-form" class="toolbar"><label class="search-box">'+icon('search')+'<input id="query" name="query" type="search" value="'+esc(searchQuery)+'" placeholder="'+esc(t('query'))+'" aria-label="'+esc(t('query'))+'"></label><button class="btn primary" type="submit">'+esc(t('searchButton'))+'</button></form><p class="muted">'+esc(t('searchHint'))+'</p>'+(q?(matches.length?'<div class="search-results">'+matches.map(({r,x})=>'<button class="result" data-action="view" data-resource="'+r+'" data-id="'+x.id+'">'+icon(r)+'<span><strong>'+esc(x.name||x.caseNumber||x.title)+'</strong><small>'+esc(t(r))+' · '+esc(t('sample'))+'</small></span></button>').join('')+'</div>':empty('noResults')):'');
  }
  function settings(){
    return '<div class="settings-grid"><section class="panel"><div class="panel-head"><h2>'+esc(t('officeName'))+'</h2></div><form id="settings-form" class="panel-body stack"><label class="field"><span>'+esc(t('officeName'))+'</span><input name="officeName" required maxlength="100" value="'+esc(data.settings.officeName)+'"></label><p class="muted">'+esc(t('settingsNote'))+'</p><button class="btn primary" type="submit">'+esc(t('save'))+'</button></form></section><section class="panel"><div class="panel-head"><h2>'+esc(t('appearance'))+'</h2></div><div class="panel-body stack"><label class="field"><span>'+esc(t('language'))+'</span>'+languageSelect()+'</label><div class="row-actions">'+btn('light','light',prefs.theme==='light'?'primary':'')+btn('dark','dark',prefs.theme==='dark'?'primary':'')+'</div></div></section><section class="panel"><div class="panel-head"><h2>'+esc(t('deviceData'))+'</h2></div><div class="panel-body stack"><p class="muted">'+esc(t('deviceNote'))+'</p>'+btn('export','export','','download')+btn('reset','reset','danger')+'</div></section></div>';
  }
  function languageSelect(){return '<select data-language aria-label="'+esc(t('language'))+'">'+Object.entries(langs).map(([k,v])=>'<option value="'+k+'" '+(prefs.lang===k?'selected':'')+'>'+v+'</option>').join('')+'</select>';}
  function render(){
    document.documentElement.lang=prefs.lang;document.documentElement.dir=prefs.lang==='en'?'ltr':'rtl';document.documentElement.dataset.theme=prefs.theme;document.title=t('brand')+' | '+t('demo');
    const title=page==='dashboard'?t('welcome'):t(page),description=page==='dashboard'?t('welcomeNote'):t('sample')+' · '+data.settings.officeName;
    document.getElementById('app').innerHTML='<aside class="sidebar '+(drawer?'open':'')+'" aria-label="'+esc(t('workspace'))+'"><div class="brand"><span class="brand-icon">'+icon('scale')+'</span><div><strong>'+esc(t('brand'))+'</strong><small>'+esc(t('subtitle'))+'</small></div></div><div class="nav-label">'+esc(t('workspace'))+'</div><nav class="nav">'+nav.map(r=>'<button data-nav="'+r+'" class="'+(page===r?'active':'')+'" '+(page===r?'aria-current="page"':'')+'>'+icon(r)+'<span>'+esc(t(r))+'</span></button>').join('')+'</nav><div class="sidebar-bottom"><div class="avatar"><span class="avatar-circle">'+icon('clients')+'</span><div><strong>'+esc(t('guest'))+'</strong><small>'+esc(t('guestRole'))+'</small></div></div></div></aside><button class="mobile-scrim '+(drawer?'visible':'')+'" aria-label="'+esc(t('close'))+'" data-action="menu-close"></button><div class="shell"><header class="topbar"><div class="top-title"><button class="icon-btn menu-btn" data-action="menu" aria-label="'+esc(t('menu'))+'" aria-expanded="'+drawer+'">'+icon('menu')+'</button><div><strong>'+esc(t('brand'))+'</strong><small>'+esc(data.settings.officeName)+'</small></div></div><div class="top-controls"><span class="lang">'+languageSelect()+'</span><button class="icon-btn" data-action="theme" aria-label="'+esc(t('theme'))+'">'+icon('theme')+'</button></div></header><div class="demo-strip"><div class="strip-copy"><span class="demo-tag">'+esc(t('demo'))+'</span><span>'+esc(t('demoNote'))+'</span></div><button class="reset-btn" data-action="reset">'+esc(t('reset'))+'</button></div><main class="main" id="workspace" tabindex="-1"><div class="heading"><div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>'+(newKey[page]?btn('new',newKey[page],'primary','add','data-resource="'+page+'"'):'')+'</div>'+(page==='dashboard'?dashboard():resources.includes(page)?listPage(page):page==='search'?searchPage():settings())+'<footer class="app-footer">'+esc(t('footer'))+'</footer></main></div>';
  }
  const schemas={
    clients:[['name','name','text',true],['phone','phone','tel'],['email','email','email'],['notes','notes','textarea']],
    cases:[['caseNumber','caseNumber','text',true],['clientId','client','clients'],['court','court','text'],['caseType','caseType',['civil','business','consultation']],['opponent','opponent','text'],['status','status',['active','pending','closed']],['notes','notes','textarea']],
    hearings:[['title','title','text',true],['caseId','case','cases'],['date','date','date',true],['time','time','time',true],['location','location','text'],['status','status',['scheduled','done']],['notes','notes','textarea']],
    invoices:[['title','title','text',true],['clientId','client','clients'],['caseId','case','cases'],['amount','amount','number',true],['paid','paid','number',true],['dueDate','dueDate','date',true],['description','description','textarea']],
    memos:[['title','title','text',true],['caseId','case','cases'],['facts','facts','textarea',true],['requests','requests','textarea',true]],
    library:[['title','title','text',true],['category','category','text'],['content','content','textarea',true]]
  };
  function field([key,label,type,required],row){
    let val=row[key]??(key==='date'||key==='dueDate'?localDate(0):key==='time'?'09:00':key==='paid'?0:'');
    if(key==='amount')val=(row.amountFils??0)/1000;if(key==='paid')val=(row.paidFils??0)/1000;
    const attrs='name="'+key+'" id="field-'+key+'" '+(required?'required ':'')+' ';
    let control;
    if(type==='textarea')control='<textarea '+attrs+'rows="'+(key==='content'?10:4)+'" maxlength="40000">'+esc(val)+'</textarea>';
    else if(Array.isArray(type))control='<select '+attrs+'>'+type.map(v=>'<option value="'+v+'" '+(val===v?'selected':'')+'>'+esc(t(v))+'</option>').join('')+'</select>';
    else if(type==='clients'||type==='cases')control='<select '+attrs+'><option value="">'+esc(t('noLink'))+'</option>'+data[type].map(v=>'<option value="'+v.id+'" '+(Number(val)===v.id?'selected':'')+'>'+esc(v.name||v.caseNumber)+'</option>').join('')+'</select>';
    else control='<input '+attrs+'type="'+type+'" value="'+esc(val)+'" '+(type==='number'?'min="0" max="999999999" step=".001"':type==='text'?'maxlength="200"':'')+'>';
    return '<label class="field '+(type==='textarea'?'full':'')+'" for="field-'+key+'"><span>'+esc(t(label))+'</span>'+control+'</label>';
  }
  function dialog(title,body,foot=''){
    const el=document.getElementById('editor');
    el.innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+esc(title)+'</h2><button type="button" class="icon-btn" data-action="close" aria-label="'+esc(t('close'))+'">'+icon('close')+'</button></div>'+body+(foot?'<div class="dialog-foot">'+foot+'</div>':'');
    if(!el.open)el.showModal();
  }
  function edit(r,id){
    if(!resources.includes(r))return;
    const row=id?data[r].find(x=>x.id===Number(id)):{};if(!row)return;
    formContext={r,id:Number(id)||null};previewContext=null;
    dialog((id?t('edit')+' '+t(r):t(newKey[r])), '<form id="record-form"><div class="dialog-body">'+(['memos','library'].includes(r)?'<div class="note">'+esc(t(r==='memos'?'memoNotice':'libraryNotice'))+'</div>':'')+'<div class="field-grid">'+schemas[r].map(s=>field(s,row)).join('')+'</div><div id="form-error" role="alert"></div></div><div class="dialog-foot">'+btn('close','cancel')+'<button class="btn primary" type="submit">'+icon('check')+esc(t('save'))+'</button></div></form>');
  }
  function display(r,id){
    const row=data[r]?.find(x=>x.id===Number(id));if(!row)return;
    previewContext={r,id:row.id};
    let body;
    if(r==='memos'||r==='library')body='<div class="note">'+esc(t(r==='memos'?'memoNotice':'libraryNotice'))+'</div><pre class="preview-text">'+esc(row.content)+'</pre>';
    else body=schemas[r].map(([k,l,type])=>{let v=row[k];if(k==='amount')v=money(row.amountFils);else if(k==='paid')v=money(row.paidFils);else if(type==='clients'||type==='cases')v=textId(type,v);else if(type==='date')v=date(v);else if(Array.isArray(type))v=t(v);return '<div class="money-row"><span>'+esc(t(l))+'</span><strong>'+esc(v||'—')+'</strong></div>';}).join('');
    dialog(row.name||row.caseNumber||row.title,'<div class="dialog-body">'+body+'</div>', (['memos','library'].includes(r)?btn('copy','copy','','copy')+btn('download','download','','download'):'')+btn('edit', 'edit','primary','edit','data-resource="'+r+'" data-id="'+row.id+'"'));
  }
  function confirmAction(kind,r,id){
    formContext={confirm:kind,r,id:Number(id)};previewContext=null;
    dialog(t(kind==='reset'?'resetTitle':'deleteTitle'),'<div class="dialog-body"><p>'+esc(t(kind==='reset'?'resetNote':'deleteNote'))+'</p></div>',btn('close','cancel')+btn('confirm','confirm','primary'));
  }
  function saveRecord(form){
    const {r,id}=formContext||{};if(!schemas[r])return;
    const fd=new FormData(form),row={};
    for(const [k] of schemas[r])row[k]=String(fd.get(k)??'').trim();
    for(const k of ['clientId','caseId'])if(k in row)row[k]=row[k]?Number(row[k]):null;
    if(r==='invoices'){
      const amount=Math.round(Number(row.amount)*1000),paid=Math.round(Number(row.paid)*1000);
      if(!Number.isFinite(amount)||!Number.isFinite(paid)||amount<0||paid<0||paid>amount){document.getElementById('form-error').innerHTML='<p class="inline-error">'+esc(t('invalidAmount'))+'</p>';return;}
      row.amountFils=amount;row.paidFils=paid;delete row.amount;delete row.paid;
    }
    if(r==='memos')row.content=t('draftLabel')+'\n\n'+row.title+'\n\n'+t('facts')+':\n'+row.facts+'\n\n'+t('requests')+':\n'+row.requests+'\n\n'+t('memoNotice');
    if(id){const index=data[r].findIndex(x=>x.id===id);if(index<0)return;data[r][index]={...data[r][index],...row};}
    else data[r].unshift({...row,id:Date.now(),created:localDate(0)});
    const saved=persist();document.getElementById('editor').close();page=r;filter='';render();if(saved)toast(t('saved'));
  }
  function download(content,name,type='text/plain;charset=utf-8'){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function resetOrDelete(){
    const ctx=formContext;if(!ctx?.confirm)return;
    if(ctx.confirm==='reset'){data=seed();page='dashboard';filter='';searchQuery='';}
    else{
      if((ctx.r==='clients'&&(data.cases.some(x=>x.clientId===ctx.id)||data.invoices.some(x=>x.clientId===ctx.id)))||(ctx.r==='cases'&&['hearings','invoices','memos'].some(r=>data[r].some(x=>x.caseId===ctx.id)))){document.getElementById('editor').close();toast(t('linked'));return;}
      data[ctx.r]=data[ctx.r].filter(x=>x.id!==ctx.id);
    }
    const saved=persist();document.getElementById('editor').close();render();if(saved)toast(t(ctx.confirm==='reset'?'saved':'removed'));
  }
  document.addEventListener('click',async event=>{
    const el=event.target.closest('button');if(!el)return;
    if(el.dataset.nav){page=el.dataset.nav;filter='';drawer=false;render();document.getElementById('workspace').focus({preventScroll:true});window.scrollTo(0,0);return;}
    const a=el.dataset.action,r=el.dataset.resource,id=el.dataset.id;
    if(a==='new'||a==='edit')edit(r,a==='edit'?id:null);
    else if(a==='view')display(r,id);
    else if(a==='delete')confirmAction('delete',r,id);
    else if(a==='reset')confirmAction('reset');
    else if(a==='confirm')resetOrDelete();
    else if(a==='close')document.getElementById('editor').close();
    else if(a==='menu'||a==='menu-close'){drawer=a==='menu'?!drawer:false;render();}
    else if(['theme','light','dark'].includes(a)){prefs.theme=a==='theme'?(prefs.theme==='light'?'dark':'light'):a;savePrefs();render();}
    else if(a==='export')download(JSON.stringify(data,null,2),'legal-platform-demo.json','application/json');
    else if(a==='upload')document.getElementById('upload-file')?.click();
    else if((a==='copy'||a==='download')&&previewContext){
      const row=data[previewContext.r].find(x=>x.id===previewContext.id);if(!row)return;
      if(a==='download')download(row.content,'legal-demo-document.txt');
      else try{await navigator.clipboard.writeText(row.content);toast(t('copied'));}catch{toast(t('copyFailed'));}
    }
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    if(event.target.id==='record-form')saveRecord(event.target);
    else if(event.target.id==='search-form'){searchQuery=new FormData(event.target).get('query')||'';render();}
    else if(event.target.id==='settings-form'){data.settings.officeName=String(new FormData(event.target).get('officeName')).trim().slice(0,100);const saved=persist();render();if(saved)toast(t('saved'));}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='filter'){const position=event.target.selectionStart;filter=event.target.value;render();const input=document.getElementById('filter');input.focus();input.setSelectionRange(position,position);}
  });
  document.addEventListener('change',async event=>{
    if(event.target.matches('[data-language]')){prefs.lang=event.target.value;savePrefs();render();}
    if(event.target.id==='upload-file'){
      const file=event.target.files?.[0];if(!file)return;
      if(file.size>500000||!/\.(txt|md)$/i.test(file.name)){toast(t('uploadError'));event.target.value='';return;}
      try{const content=await file.text();data.library.unshift({id:Date.now(),title:file.name,category:t('templates'),content:content.slice(0,100000),created:localDate(0)});const saved=persist();render();if(saved)toast(t('uploadSuccess'));}catch{toast(t('uploadError'));}
    }
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer){drawer=false;render();}});
  render();
})();
