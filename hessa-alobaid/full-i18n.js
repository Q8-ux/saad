(() => {
  'use strict';

  if (typeof state === 'undefined') return;

  const arabicPattern = /[\u0600-\u06FF]/;
  let translating = false;
  let scheduled = false;

  const exact = {
    'النظام الداخلي':'Internal System',
    'إدارة مكتب المحامية حصة العبيد':'Hessa Al-Obaid Law Office Management',
    'النظام الداخلي لإدارة المكتب':'Internal Office Management System',
    'مكتب المحامية حصة العبيد':'Hessa Al-Obaid Law Office',
    'المحامية حصة العبيد':'Hessa Al-Obaid',
    'حصة العبيد':'Hessa Al-Obaid',
    'مدير النظام':'System Administrator',
    'الباحث القانوني':'Legal Researcher',
    'السكرتارية':'Secretariat',
    'المحامية':'Lawyer',
    'محامٍ':'Lawyer',
    'محاسب':'Accountant',
    'الرئيسية':'Home',
    'لوحة التحكم':'Dashboard',
    'إدارة القضايا':'Case Management',
    'المستندات والمراسلات':'Documents & Correspondence',
    'العمل القانوني الذكي':'Smart Legal Work',
    'إدارة المكتب':'Office Administration',
    'إدارة النظام':'System Administration',
    'العملاء والموكلون':'Clients',
    'العملاء':'Clients',
    'العميل':'Client',
    'القضايا والملفات':'Cases & Files',
    'القضايا':'Cases',
    'القضية':'Case',
    'الجلسات والمواعيد':'Hearings & Appointments',
    'الجلسات':'Hearings',
    'المهام والتنبيهات':'Tasks & Alerts',
    'المهام':'Tasks',
    'تقويم المكتب':'Office Calendar',
    'التقويم الموحد':'Unified Calendar',
    'الأرشيف الإلكتروني':'Electronic Archive',
    'الأرشيف':'Archive',
    'قوالب المستندات':'Document Templates',
    'الوارد':'Incoming',
    'الصادر':'Outgoing',
    'المراسلات الداخلية':'Internal Correspondence',
    'المراسلات':'Correspondence',
    'مراسلات العملاء':'Client Messaging',
    'واتساب العملاء':'Client WhatsApp',
    'مولد المذكرات':'Memo Generator',
    'المساعد القانوني':'Legal Assistant',
    'المساعد الذكي':'Smart Assistant',
    'المساعد القانوني الذكي':'Smart Legal Assistant',
    'قاعدة المعرفة':'Knowledge Base',
    'العقود والأتعاب':'Contracts & Fees',
    'العقود':'Contracts',
    'الفواتير والمصروفات':'Invoices & Expenses',
    'المالية':'Finance',
    'سجل الوقت':'Time Tracking',
    'سير العمل والموافقات':'Workflows & Approvals',
    'بوابة العملاء':'Client Portal',
    'التقارير والتحليلات':'Reports & Analytics',
    'المستخدمون والصلاحيات':'Users & Permissions',
    'المستخدمون':'Users',
    'سجل التدقيق':'Audit Log',
    'الإعدادات':'Settings',
    'تسجيل الخروج':'Sign out',
    'تسجيل الدخول':'Sign in',
    'اسم المستخدم':'Username',
    'كلمة المرور':'Password',
    'بحث في النظام':'Search the system',
    'إضافة':'Add',
    'حفظ':'Save',
    'إلغاء':'Cancel',
    'حذف':'Delete',
    'تعديل':'Edit',
    'عرض':'View',
    'عرض الكل':'View all',
    'طباعة':'Print',
    'نسخ':'Copy',
    'إرسال':'Send',
    'مسح':'Clear',
    'فتح':'Open',
    'الحالة':'Status',
    'الإجراءات':'Actions',
    'التاريخ':'Date',
    'الوقت':'Time',
    'ملاحظات':'Notes',
    'المبلغ':'Amount',
    'الهاتف':'Phone',
    'البريد الإلكتروني':'Email',
    'العنوان':'Address',
    'الاسم':'Name',
    'النوع':'Type',
    'الموضوع':'Subject',
    'المرجع':'Reference',
    'الوصف':'Description',
    'المكلف':'Assigned to',
    'الأولوية':'Priority',
    'تاريخ الاستحقاق':'Due date',
    'التصنيف':'Category',
    'المحكمة':'Court',
    'الخصم':'Opponent',
    'المحامي المكلف':'Assigned lawyer',
    'الإجراء القادم':'Next action',
    'اسم المكتب':'Office name',
    'بيانات المكتب':'Office details',
    'إدارة البيانات':'Data management',
    'بيانات العميل':'Client details',
    'ملف القضية':'Case file',
    'عنوان الملف':'File title',
    'رقم القضية':'Case number',
    'نوع القضية':'Case type',
    'المحكمة / الخصم':'Court / Opponent',
    'المحكمة / الدائرة':'Court / Circuit',
    'الغرض من الجلسة':'Hearing purpose',
    'عنوان المهمة':'Task title',
    'اسم المستند':'Document name',
    'الكلمات المفتاحية':'Keywords',
    'اختيار الملف':'Choose file',
    'رقم الأرشفة':'Archive number',
    'المستند':'Document',
    'اسم الملف':'File name',
    'غير محفوظ':'Not stored',
    'كل الحالات':'All statuses',
    'كل التصنيفات':'All categories',
    'بدون قضية':'No case',
    'بدون قضية محددة':'No specific case',
    'بدون عميل':'No client',
    'اختر القضية':'Select a case',
    'اختر العميل':'Select a client',
    'من':'From',
    'إلى':'To',
    'الجهة الواردة منها':'Sender entity',
    'الجهة المرسل إليها':'Recipient entity',
    'مراسلة داخلية':'Internal correspondence',
    'عقد أتعاب':'Fee agreement',
    'نوع العقد':'Contract type',
    'قيمة العقد':'Contract value',
    'المدفوع':'Paid',
    'المتبقي':'Balance',
    'إضافة عميل':'Add Client',
    'إضافة قضية':'Add Case',
    'إضافة جلسة':'Add Hearing',
    'إضافة مهمة':'Add Task',
    'أرشفة مستند':'Archive Document',
    'إضافة وارد':'Add Incoming',
    'إضافة صادر':'Add Outgoing',
    'إضافة فاتورة':'Add Invoice',
    'إضافة مصروف':'Add Expense',
    'إضافة مستخدم':'Add User',
    'نتيجة الجلسة':'Hearing Result',
    'النتيجة والقرار':'Result and Decision',
    'تسجيل النتيجة':'Record Result',
    'تغيير الحالة':'Change Status',
    'صلاحيات':'Permissions',
    'الصلاحيات':'Permissions',
    'الدور':'Role',
    'المعرف':'ID',
    'الرقم':'Number',
    'إضافة قضية جديدة':'Add New Case',
    'إنشاء مذكرة':'Create Memo',
    'مراسلة عميل':'Message Client',
    'نظرة عامة اليوم':'Today Overview',
    'كل أعمال المكتب في مساحة واحدة':'Your entire law office in one workspace',
    'القضايا النشطة':'Active Cases',
    'مستندات الأرشيف':'Archive Documents',
    'الوارد المعلّق':'Pending Incoming',
    'الصادر هذا الشهر':'Outgoing This Month',
    'أحدث القضايا':'Recent Cases',
    'متابعة الملفات المفتوحة':'Open File Follow-up',
    'مهام اليوم':'Today’s Tasks',
    'الأعمال ذات الأولوية':'Priority Work',
    'الجلسات القادمة':'Upcoming Hearings',
    'إجراءات سريعة':'Quick Actions',
    'إعداد الرسالة':'Message Setup',
    'قالب الرسالة':'Message Template',
    'نص الرسالة':'Message Text',
    'معاينة الرسالة':'Message Preview',
    'تحديث حالة القضية':'Case Status Update',
    'تذكير بموعد جلسة':'Hearing Reminder',
    'طلب مستندات':'Document Request',
    'تذكير بدفعة أتعاب':'Fee Payment Reminder',
    'رسالة مخصصة':'Custom Message',
    'فتح المحادثة في واتساب':'Open WhatsApp Conversation',
    'بيانات المسودة':'Draft Details',
    'نوع المستند':'Document Type',
    'المحكمة أو الجهة':'Court or Authority',
    'صفة مقدم المذكرة':'Filer Capacity',
    'الوقائع':'Facts',
    'الدفوع والأسانيد':'Arguments & Legal Grounds',
    'الدفوع والأسانيد القانونية':'Arguments and Legal Grounds',
    'الطلبات':'Requests',
    'توليد المسودة':'Generate Draft',
    'المسودة الناتجة':'Generated Draft',
    'المذكرة القانونية':'Legal Memorandum',
    'مذكرة دفاع':'Defense Memorandum',
    'صحيفة دعوى':'Statement of Claim',
    'مذكرة رد':'Response Memorandum',
    'مذكرة استئناف':'Appeal Memorandum',
    'مذكرة للخبراء':'Expert Memorandum',
    'إنذار رسمي':'Formal Notice',
    'أدوات سريعة':'Quick Tools',
    'تلخيص القضية':'Summarize Case',
    'لخّص القضية':'Summarize Case',
    'تحديد البيانات الناقصة':'Identify Missing Information',
    'البيانات الناقصة':'Missing Information',
    'إنشاء خط زمني':'Create Timeline',
    'صياغة تحديث للعميل':'Draft Client Update',
    'تحديث للعميل':'Client Update',
    'نقاط مذكرة':'Memo Outline',
    'المحادثة القانونية الداخلية':'Internal Legal Chat',
    'المبالغ المحصلة':'Collected Amounts',
    'المبالغ المستحقة':'Outstanding Amounts',
    'المصروفات':'Expenses',
    'الصافي':'Net',
    'الفواتير':'Invoices',
    'الحالة المالية':'Financial Status',
    'القضايا حسب النوع':'Cases by Type',
    'مؤشرات الأداء':'Performance Indicators',
    'إجمالي العملاء':'Total Clients',
    'القضايا المفتوحة':'Open Cases',
    'المهام المنجزة':'Completed Tasks',
    'سجل النشاط':'Activity Log',
    'تصدير البيانات':'Export Data',
    'استيراد البيانات':'Import Data',
    'إعادة ضبط النسخة التجريبية':'Reset Demo Data',
    'بادئة القضايا':'Case Prefix',
    'بادئة الوارد':'Incoming Prefix',
    'بادئة الصادر':'Outgoing Prefix',
    'مدني':'Civil',
    'تجاري':'Commercial',
    'جزائي':'Criminal',
    'أحوال شخصية':'Family Law',
    'عمالي':'Labor',
    'إداري':'Administrative',
    'عقود':'Contracts',
    'صحف دعاوى':'Statements of Claim',
    'مذكرات':'Memoranda',
    'حوافظ':'Document Bundles',
    'أحكام':'Judgments',
    'توكيلات':'Powers of Attorney',
    'أخرى':'Other',
    'فرد':'Individual',
    'شركة':'Company',
    'جهة':'Entity',
    'نشط':'Active',
    'غير نشط':'Inactive',
    'قيد المتابعة':'Pending',
    'مغلق':'Closed',
    'مدفوع':'Paid',
    'مستحق':'Due',
    'مرسل':'Sent',
    'منجز':'Done',
    'قادم':'Upcoming',
    'قادمة':'Upcoming',
    'منجزة':'Completed',
    'متأخر':'Overdue',
    'ملغي':'Cancelled',
    'ملغاة':'Cancelled',
    'عالية':'High',
    'متوسطة':'Medium',
    'منخفضة':'Low',
    'عادية':'Normal',
    'عاجلة':'Urgent',
    'أتعاب ثابتة':'Fixed Fee',
    'نسبة من المحكوم به':'Percentage of Award',
    'بالساعة':'Hourly',
    'دفعات مرحلية':'Milestone Payments',
    'رسوم قضائية':'Court Fees',
    'تصوير وطباعة':'Copying & Printing',
    'دفعة مقدمة':'Advance Payment',
    'الدفعة النهائية':'Final Payment',
    'رسوم إعلان':'Service Fee',
    'حافظة مستندات':'Document Bundle',
    'شركة الخليج للتجارة':'Gulf Trading Company',
    'أحمد عبدالله':'Ahmed Abdullah',
    'مريم سالم':'Mariam Salem',
    'مدينة الكويت':'Kuwait City',
    'حولي':'Hawally',
    'الفروانية':'Farwaniya',
    'مطالبة مالية وعقد توريد':'Financial Claim and Supply Contract',
    'دعوى تعويض':'Compensation Claim',
    'نفقة وحضانة':'Alimony and Custody',
    'المحكمة الكلية':'Court of First Instance',
    'محكمة الأسرة':'Family Court',
    'الدائرة التجارية 4':'Commercial Circuit 4',
    'شركة المورد المتحد':'United Supplier Company',
    'شركة تأمين':'Insurance Company',
    'الطرف الآخر':'Other Party',
    'جلسة مرافعة':'Pleading Hearing',
    'نظر الدعوى':'Case Hearing',
    'إيداع مذكرة':'File Memorandum',
    'مراجعة الإعلان':'Review Service Notice',
    'إعداد مذكرة الرد في القضية التجارية':'Prepare Response Memorandum in Commercial Case',
    'مراجعة مستندات التعويض':'Review Compensation Documents',
    'إرسال تحديث للعميلة':'Send Client Update',
    'عقد التوريد.pdf':'Supply Contract.pdf',
    'صحيفة الدعوى.pdf':'Statement of Claim.pdf',
    'حافظة مستندات الأسرة.pdf':'Family Document Bundle.pdf',
    'عقد التوريد':'Supply Contract',
    'إعلان جلسة':'Hearing Notice',
    'طلب مستندات':'Document Request',
    'يحال للمحامية':'Refer to Lawyer',
    'تم التسليم':'Delivered',
    'خبير وزارة العدل':'Ministry of Justice Expert',
    'إدارة الخبراء':'Experts Department',
    'تسليم حافظة مستندات':'Submit Document Bundle',
    'تقرير متابعة القضية':'Case Progress Report',
    'مراجعة السوابق القضائية':'Review Judicial Precedents',
    'تأكيد مواعيد الجلسات':'Confirm Hearing Dates',
    'تم تحديث بيانات القضية':'Case data updated',
    'تم تسجيل وارد جديد من إدارة الخبراء':'New incoming item registered from Experts Department',
    'تم إرسال تقرير متابعة للعميل':'Client progress report sent',
    'الكويت':'Kuwait',
    'الجهة المختصة':'Competent Authority',
    'مقدم المذكرة':'Memorandum Filer',
    'المدعي':'Claimant',
    'المدعى عليه':'Defendant',
    'الخصم المبين بالأوراق':'Opponent Identified in the Record',
    'أولاً: الوقائع':'First: Facts',
    'ثانياً: الدفوع والأسانيد القانونية':'Second: Arguments and Legal Grounds',
    'ثالثاً: الطلبات':'Third: Requests',
    'ولذلك':'Therefore',
    'وتفضلوا بقبول فائق الاحترام.':'Respectfully submitted.',
    'لا توجد بيانات مسجلة':'No data recorded',
    'لم تسجل النتيجة بعد':'No result has been recorded yet',
    'تأكيد الحذف؟':'Confirm deletion?',
    'تم الحذف':'Deleted successfully',
    'بيانات الدخول غير صحيحة':'Incorrect login credentials',
    'ملف غير صالح':'Invalid file',
    'تم حفظ الإعدادات':'Settings saved',
    'تم استيراد البيانات':'Data imported',
    'تم توليد المسودة':'Draft generated',
    'تم نسخ المسودة':'Draft copied',
    'تم حفظ الصلاحيات':'Permissions saved',
    'تمت إضافة العميل':'Client added',
    'تمت إضافة القضية':'Case added',
    'تمت إضافة الجلسة':'Hearing added',
    'تمت إضافة المهمة':'Task added',
    'تمت إضافة الفاتورة':'Invoice added',
    'تمت إضافة المستخدم':'User added',
    'تم تسجيل المصروف':'Expense recorded',
    'تم إنشاء المراسلة':'Correspondence created',
    'تم حفظ عقد الأتعاب':'Fee agreement saved',
    'تم تحديث الجلسة':'Hearing updated',
    'تم تسجيل المستند في الأرشيف':'Document registered in archive',
    'فتح المساعد الكامل':'Open Full Assistant',
    'ربط السؤال بقضية':'Link Question to a Case',
    'سؤال عام — بدون قضية':'General Question — No Case',
    'طلبات سريعة':'Quick Prompts',
    'إملاء صوتي':'Voice Dictation',
    'تحسين الإملاء':'Improve Dictation',
    'تحسين تلقائي':'Auto Improve',
    'قراءة الردود صوتيًا':'Read Replies Aloud',
    'مسح المحادثة':'Clear Chat',
    'استماع للرد':'Listen to Reply',
    'مساعد مكتب حصة العبيد':'Hessa Al-Obaid Office Assistant',
    'جاهز للكتابة والإملاء الصوتي':'Ready for Typing and Voice Dictation'
  };

  const phrases = [
    ['قاعدة موحدة لبيانات الموكلين والأطراف ووسائل التواصل.','A unified directory for clients, parties, and contact details.'],
    ['إدارة الملف القانوني الكامل: الموكل، الخصوم، المحكمة، الجلسات، المستندات والمهام.','Manage the complete legal file: client, opponents, court, hearings, documents, and tasks.'],
    ['تقويم الجلسات والمواعيد والقرارات والمهل الإجرائية.','Calendar of hearings, appointments, decisions, and procedural deadlines.'],
    ['توزيع الأعمال، متابعة الإنجاز، والتنبيه بالمواعيد والمهل.','Assign work, track completion, and monitor deadlines.'],
    ['أرشفة المستندات وربطها بالعميل والقضية والتصنيف والكلمات المفتاحية.','Archive documents and link them to clients, cases, categories, and keywords.'],
    ['تسجيل الكتب والإعلانات والمستندات الواردة ومسار إحالتها.','Register incoming letters, notices, documents, and assignment workflow.'],
    ['تسجيل الكتب والمخاطبات الصادرة وأرقامها وجهات إرسالها.','Register outgoing correspondence, references, and recipients.'],
    ['إحالات وتعليمات ومذكرات داخلية بين أعضاء فريق المكتب.','Internal referrals, instructions, and notes between office team members.'],
    ['إنشاء رسالة مرتبطة بالعميل والقضية وفتحها مباشرة في واتساب.','Create a client and case-linked message and open it directly in WhatsApp.'],
    ['إنشاء مسودة قانونية منظمة وربطها ببيانات القضية والعميل.','Create a structured legal draft linked to case and client data.'],
    ['مساعد داخلي لتحليل بيانات القضايا وتلخيص الملفات واقتراح الخطوات الإدارية.','An internal assistant for case analysis, file summaries, and administrative next steps.'],
    ['إدارة عقود الأتعاب وقيمتها ودفعاتها ونسب الإنجاز.','Manage fee agreements, values, installments, and completion rates.'],
    ['الفواتير والتحصيل والمصروفات المرتبطة بالقضايا والعملاء.','Invoices, collections, and expenses linked to cases and clients.'],
    ['مؤشرات تشغيلية ومالية قابلة للتوسع والتصدير.','Expandable operational and financial indicators with export support.'],
    ['إدارة المستخدمين والأدوار وصلاحيات الوصول إلى بيانات المكتب.','Manage users, roles, and access permissions to office data.'],
    ['هوية المكتب والترقيم والنسخ الاحتياطي وإعدادات النظام.','Office identity, numbering, backup, and system settings.'],
    ['تابع القضايا والمستندات والمراسلات والمهام، وأنشئ المذكرات وتواصل مع العملاء من لوحة موحدة.','Track cases, documents, correspondence, tasks, legal drafts, and client communications from one dashboard.'],
    ['في النسخة الحالية يتم حفظ بيانات الملف واسمه فقط داخل المتصفح. التخزين الحقيقي للملفات يحتاج Supabase Storage أو خادم ملفات آمن.','The current version stores file metadata and names only in the browser. Actual file storage requires secure cloud storage or a file server.'],
    ['الإرسال الآلي والاستقبال داخل النظام يحتاجان ربط WhatsApp Business Cloud API برقم موثق وخادم آمن.','Automated sending and receiving require a verified WhatsApp Business Cloud API number and a secure backend.'],
    ['المولد يصنع مسودة تنظيمية أولية. التوليد القانوني الذكي الحقيقي يحتاج ربط نموذج ذكاء اصطناعي بقاعدة تشريعات ومراجعة محامٍ مختص.','The generator creates an initial structured draft. Production legal AI requires a secure model, legislation database, and lawyer review.'],
    ['المساعد الحالي يعمل بقواعد محلية تجريبية ولا يرسل البيانات إلى أي خدمة خارجية. ربط OpenAI يتم لاحقًا عبر خادم آمن، وليس من المتصفح مباشرة.','The current assistant uses local demo rules and sends no data externally. OpenAI integration must be implemented through a secure backend.'],
    ['تصدير نسخة احتياطية بصيغة JSON أو استيراد نسخة سابقة.','Export a JSON backup or import a previous backup.'],
    ['للإطلاق الرسمي: قاعدة بيانات PostgreSQL، تخزين مستندات مشفر، صلاحيات RBAC، سجل تدقيق، نسخ احتياطي، ومصادقة متعددة العوامل.','Production launch requires PostgreSQL, encrypted document storage, RBAC, audit logging, backups, and multi-factor authentication.'],
    ['أدخل البيانات ثم اضغط «توليد المسودة».','Enter the information, then select “Generate Draft”.'],
    ['اكتب الوقائع بالتسلسل الزمني','Enter the facts in chronological order'],
    ['أدخل الدفوع والنصوص والمبادئ المراد الاستناد إليها','Enter the arguments, legal provisions, and principles to rely on'],
    ['اكتب الطلبات الختامية','Enter the final requests'],
    ['اكتب سؤالك أو طلبك','Type your question or request'],
    ['بحث بالاسم أو الهاتف أو الرقم المدني','Search by name, phone, or civil ID'],
    ['بحث برقم القضية أو الموكل أو الخصم','Search by case number, client, or opponent'],
    ['بحث باسم المستند أو القضية أو التصنيف','Search by document, case, or category'],
    ['لا توجد تنبيهات حرجة','No Critical Alerts'],
    ['العناصر التي تحتاج تدخلك الآن','Items Requiring Your Attention'],
    ['جدول العمل القادم','Upcoming Agenda'],
    ['الجلسات والمهام مرتبة زمنيًا','Hearings and Tasks in Chronological Order'],
    ['توزيع القضايا','Case Distribution'],
    ['الحالة والأنواع القانونية المسجلة','Recorded Status and Legal Categories'],
    ['الملخص المالي','Financial Summary'],
    ['التحصيل والمستحقات والمصروفات','Collections, Receivables, and Expenses']
  ];

  const wordReplacements = [
    ['القضية التجارية','commercial case'],['القضية','case'],['الجلسة','hearing'],['جلسة','hearing'],['المهمة','task'],['مهمة','task'],['المستندات','documents'],['المستند','document'],['الموكل','client'],['العميل','client'],['المحكمة','court'],['الخصم','opponent'],['المذكرة','memorandum'],['مذكرة','memorandum'],['التجارية','commercial'],['التجاري','commercial'],['المدنية','civil'],['المدني','civil'],['الأسرة','family'],['أسرة','family'],['إضافة','Add'],['تحديث','Update'],['جديد','new'],['جديدة','new'],['تم',''],['رقم','No.'],['إجمالي','Total'],['مفتوحة','open'],['مفتوح','open'],['المطلوبة','required'],['المطلوب','required'],['القادمة','upcoming'],['القادم','upcoming'],['المعلقة','pending'],['معلق','pending']
  ];

  function translateString(value) {
    if (state.language !== 'en' || !value || !arabicPattern.test(value)) return value;
    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    let core = value.trim();
    if (exact[core]) return leading + exact[core] + trailing;
    phrases.forEach(([ar, en]) => { core = core.split(ar).join(en); });
    Object.entries(exact).sort((a,b)=>b[0].length-a[0].length).forEach(([ar,en]) => {
      if (core.includes(ar)) core = core.split(ar).join(en);
    });
    wordReplacements.forEach(([ar,en]) => { core = core.split(ar).join(en); });
    core = core.replace(/\s{2,}/g,' ').replace(/\s+([,.!?;:])/g,'$1').trim();
    return leading + core + trailing;
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;
    ['placeholder','title','aria-label'].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value && arabicPattern.test(value)) element.setAttribute(attribute, translateString(value));
    });
    if (element instanceof HTMLInputElement && ['button','submit','reset'].includes(element.type) && arabicPattern.test(element.value)) {
      element.value = translateString(element.value);
    }
  }

  function translateTree(root = document.body) {
    if (state.language !== 'en' || translating || !root) return;
    translating = true;
    try {
      if (root instanceof Element) translateElement(root);
      const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      while (elementWalker.nextNode()) translateElement(elementWalker.currentNode);
      const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName) || parent.isContentEditable) return NodeFilter.FILTER_REJECT;
          return arabicPattern.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const nodes = [];
      while (textWalker.nextNode()) nodes.push(textWalker.currentNode);
      nodes.forEach(node => { node.nodeValue = translateString(node.nodeValue); });
      document.title = 'Internal System | Hessa Al-Obaid Law Office';
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    } finally {
      translating = false;
    }
  }

  function scheduleTranslation(root = document.body) {
    if (state.language !== 'en') return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      translateTree(root);
    });
  }

  const baseMoney = typeof money === 'function' ? money : null;
  if (baseMoney) {
    money = function bilingualMoney(value) {
      if (state.language === 'en') return `${Number(value || 0).toLocaleString('en-US')} KWD`;
      return baseMoney(value);
    };
  }

  const basePageHead = typeof pageHead === 'function' ? pageHead : null;
  if (basePageHead) {
    pageHead = function bilingualPageHead(title, subtitle, actions = '') {
      if (state.language !== 'en') return basePageHead(title, subtitle, actions).replace('LMS • ', '');
      return `<header class="page-head"><div><p class="eyebrow">Hessa Al-Obaid Law Office</p><h1>${esc(translateString(title))}</h1><p>${esc(translateString(subtitle))}</p></div><div class="page-actions">${actions}</div></header>`;
    };
  }

  const baseOpenModal = typeof openModal === 'function' ? openModal : null;
  if (baseOpenModal) {
    openModal = function bilingualModal(title, kicker, html, onSubmit) {
      baseOpenModal(state.language === 'en' ? translateString(title) : title, state.language === 'en' ? translateString(kicker) : kicker, html, onSubmit);
      scheduleTranslation(document.getElementById('modalBackdrop'));
    };
  }

  const baseToast = typeof toast === 'function' ? toast : null;
  if (baseToast) {
    toast = function bilingualToast(message) {
      baseToast(state.language === 'en' ? translateString(message) : message);
    };
  }

  const baseAssistantResponse = typeof assistantResponse === 'function' ? assistantResponse : null;
  if (baseAssistantResponse) {
    assistantResponse = function bilingualAssistantResponse(tool, caseId, input = '') {
      if (state.language !== 'en') return baseAssistantResponse(tool, caseId, input);
      const item = state.cases.find(entry => entry.id === caseId);
      if (!item) return 'Select a case first so I can review its recorded information.';
      const hearings = state.sessions.filter(entry => entry.caseId === caseId);
      const documents = state.documents.filter(entry => entry.caseId === caseId);
      const tasks = state.tasks.filter(entry => entry.caseId === caseId);
      if (tool === 'summary' || /summary|summarize/i.test(input)) {
        return `Case ${translateString(item.id)} Summary:\nTitle: ${translateString(item.title)}\nClient: ${translateString(clientName(item.clientId))}\nType: ${translateString(item.type)}\nCourt: ${translateString(item.court)}\nOpponent: ${translateString(item.opponent)}\nStatus: ${statusLabel(item.status)}\nNext action: ${translateString(item.nextAction)}\nDocuments: ${documents.length}, hearings: ${hearings.length}, open tasks: ${tasks.filter(entry => !entry.done).length}.`;
      }
      if (tool === 'missing' || /missing|required/i.test(input)) {
        const missing = [];
        if (!item.court) missing.push('court');
        if (!item.opponent) missing.push('opponent information');
        if (!documents.length) missing.push('supporting documents');
        if (!hearings.length) missing.push('next hearing');
        return missing.length ? `Information to complete: ${missing.join(', ')}.` : 'The main recorded information is complete, subject to professional review of the documents and requests.';
      }
      if (tool === 'timeline' || /timeline/i.test(input)) {
        return [`File opened: ${item.opened}`, ...hearings.map(entry => `Hearing ${entry.date}: ${translateString(entry.purpose)}${entry.result ? ` — ${translateString(entry.result)}` : ''}`), ...tasks.map(entry => `Task ${entry.due}: ${translateString(entry.title)}`)].join('\n');
      }
      if (tool === 'client-update' || /client|update/i.test(input)) {
        return `Dear ${translateString(clientName(item.clientId))},\nYour case ${translateString(item.id)} remains “${statusLabel(item.status)}”. The next action is: ${translateString(item.nextAction)}. We will notify you of any further developments.\nRegards, Hessa Al-Obaid Law Office.`;
      }
      return `Case ${translateString(item.id)} has been reviewed. Your request: ${input}\nThis is a local administrative prototype response. A secure legal AI integration will support deeper document and legislation analysis.`;
    };
  }

  const baseWaTemplate = typeof waTemplate === 'function' ? waTemplate : null;
  if (baseWaTemplate) {
    waTemplate = function bilingualWhatsAppTemplate(type, client, caseId) {
      if (state.language !== 'en') return baseWaTemplate(type, client, caseId);
      const caseItem = state.cases.find(entry => entry.id === caseId);
      const name = translateString(client?.name || 'Dear Client');
      const messages = {
        update: `${name}, your file${caseItem ? ` ${translateString(caseItem.id)}` : ''} is under active follow-up. We will notify you immediately of any new development.`,
        session: `${name}, this is a reminder of the upcoming hearing${caseItem ? ` in case ${translateString(caseItem.id)}` : ''}. Please contact us for any clarification.`,
        documents: `${name}, please provide the requested documents so the office can complete its review and continue the procedures.`,
        payment: `${name}, this is a reminder of the payment due under the fee agreement. Please contact the office to arrange payment.`,
        custom: ''
      };
      return messages[type] || '';
    };
  }

  const baseBindMemo = typeof bindMemo === 'function' ? bindMemo : null;
  if (baseBindMemo) {
    bindMemo = function bilingualMemoBinding() {
      if (state.language !== 'en') return baseBindMemo();
      const form = document.getElementById('memoForm');
      const output = document.getElementById('memoOutput');
      if (!form || !output) return;
      form.addEventListener('submit', event => {
        event.preventDefault();
        const caseId = document.getElementById('memoCase').value;
        const caseItem = state.cases.find(entry => entry.id === caseId);
        const type = translateString(document.getElementById('memoType').value);
        const court = document.getElementById('memoCourt').value || translateString(caseItem?.court || 'Competent Authority');
        const role = document.getElementById('memoRole').value || 'Memorandum Filer';
        const facts = document.getElementById('memoFacts').value;
        const argumentsText = document.getElementById('memoDefenses').value || 'The arguments and legal grounds shall be completed after specialized legal review.';
        const requests = document.getElementById('memoClaims').value;
        const memoText = `BEFORE ${court}\n\n${type}\n${caseId ? `Case No.: ${translateString(caseId)}\n` : ''}\nSubmitted by: ${role}\n${caseItem ? `Against: ${translateString(caseItem.opponent || 'Opponent Identified in the Record')}\n` : ''}\nFIRST: FACTS\n${facts}\n\nSECOND: ARGUMENTS AND LEGAL GROUNDS\n${argumentsText}\n\nTHIRD: REQUESTS\n${requests}\n\nTHEREFORE\nThe filer respectfully requests that the competent authority grant the foregoing requests, while reserving all other rights.\n\nRespectfully submitted.\n\nNotice: This is an initial structured draft and must be reviewed and approved by the lawyer before use.`;
        output.textContent = memoText;
        state.memos.unshift({ id: uid('MEM', state.memos), caseId, type, date: today(), text: memoText });
        logActivity(`Generated ${type}${caseId ? ` for case ${caseId}` : ''}`);
        saveState();
        toast('Draft generated');
      });
      document.getElementById('copyMemo')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(output.textContent);
        toast('Draft copied');
      });
      document.getElementById('printMemo')?.addEventListener('click', () => {
        const popup = window.open('', '_blank');
        popup.document.write(`<html dir="ltr" lang="en"><head><meta charset="utf-8"><title>Legal Memorandum</title><style>body{font-family:Cairo,Arial;padding:50px;line-height:2;white-space:pre-wrap}</style></head><body>${esc(output.textContent).replaceAll('\n','<br>')}</body></html>`);
        popup.document.close();
        popup.print();
      });
      document.getElementById('memoClear')?.addEventListener('click', () => {
        form.reset();
        output.textContent = 'Enter the information, then select “Generate Draft”.';
      });
    };
  }

  const baseRenderView = typeof renderView === 'function' ? renderView : null;
  if (baseRenderView) {
    renderView = function fullyTranslatedRender(view) {
      baseRenderView(view);
      scheduleTranslation(document.getElementById('appContent'));
    };
  }

  const baseApplyLanguage = typeof applyLanguage === 'function' ? applyLanguage : null;
  if (baseApplyLanguage) {
    applyLanguage = function completeApplyLanguage() {
      baseApplyLanguage();
      document.documentElement.lang = state.language;
      document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
      document.title = state.language === 'ar' ? 'النظام الداخلي | مكتب المحامية حصة العبيد' : 'Internal System | Hessa Al-Obaid Law Office';
      if (state.language === 'en') scheduleTranslation(document.body);
    };
  }

  const nativeConfirm = window.confirm.bind(window);
  window.confirm = function bilingualConfirm(message) {
    return nativeConfirm(state.language === 'en' ? translateString(message) : message);
  };

  if (window.HessaOfficeTools?.open) {
    const baseOfficeOpen = window.HessaOfficeTools.open.bind(window.HessaOfficeTools);
    window.HessaOfficeTools.open = function translatedOfficeOpen(view) {
      baseOfficeOpen(view);
      scheduleTranslation(document.getElementById('appContent'));
    };
  }

  if (window.HessaInternal?.home) {
    const baseHome = window.HessaInternal.home.bind(window.HessaInternal);
    window.HessaInternal.home = function translatedHome() {
      baseHome();
      scheduleTranslation(document.getElementById('appContent'));
    };
  }

  const observer = new MutationObserver(mutations => {
    if (state.language !== 'en' || translating) return;
    const root = mutations.find(item => item.addedNodes.length)?.target || document.body;
    scheduleTranslation(root instanceof Element ? root : document.body);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(() => {
      applyLanguage();
      if (state.language === 'en') translateTree(document.body);
    }, 100);
  });

  window.HessaFullI18n = { translate: translateTree, translateString };

  window.setTimeout(() => {
    applyLanguage();
    if (state.language === 'en') {
      if (state.currentView === 'dashboard' && window.HessaInternal?.home) window.HessaInternal.home();
      else if (baseRenderView) renderView(state.currentView || 'dashboard');
      translateTree(document.body);
    }
  }, 160);
})();
