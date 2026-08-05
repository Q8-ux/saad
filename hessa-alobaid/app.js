const STORAGE_KEY = 'hessaLawLmsV3';
const SESSION_KEY = 'hessaLawLmsSession';

const i18n = {
  ar: {
    internalSystem:'النظام الداخلي',loginTitle:'إدارة مكتب المحامية حصة العبيد',loginSubtitle:'منصة موحدة لإدارة القضايا والعملاء والجلسات والمستندات والمراسلات والشؤون المالية.',username:'اسم المستخدم',password:'كلمة المرور',login:'تسجيل الدخول',demoCredentials:'الدخول التجريبي: admin / admin123',officeName:'مكتب المحامية حصة العبيد',lawManagementSystem:'نظام إدارة أعمال المحاماة',mainOperations:'العمليات الرئيسية',dashboard:'لوحة التحكم',clients:'العملاء والموكلون',cases:'القضايا والملفات',sessions:'الجلسات والمواعيد',tasks:'المهام والتنبيهات',documentsComms:'المستندات والمراسلات',archive:'الأرشيف الإلكتروني',incoming:'الوارد',outgoing:'الصادر',correspondence:'المراسلات الداخلية',whatsapp:'واتساب العملاء',legalFinancial:'القانوني والمالي',memoGenerator:'مولد المذكرات',smartAssistant:'المساعد الذكي',contracts:'العقود والأتعاب',finance:'الفواتير والمصروفات',reports:'التقارير والتحليلات',administration:'الإدارة',usersPermissions:'المستخدمون والصلاحيات',settings:'الإعدادات',administrator:'مدير النظام',logout:'تسجيل الخروج',welcomeAdmin:'مرحبًا، مدير النظام',searchSystem:'بحث في النظام',add:'إضافة',save:'حفظ',cancel:'إلغاء',delete:'حذف',edit:'تعديل',view:'عرض',print:'طباعة',copy:'نسخ',send:'إرسال',status:'الحالة',actions:'الإجراءات',date:'التاريخ',notes:'ملاحظات',client:'العميل',case:'القضية',amount:'المبلغ',phone:'الهاتف',email:'البريد الإلكتروني',address:'العنوان',type:'النوع',subject:'الموضوع',reference:'المرجع',description:'الوصف',assignedTo:'المكلف',priority:'الأولوية',dueDate:'تاريخ الاستحقاق',todayOverview:'نظرة عامة اليوم',dashboardHeadline:'كل أعمال المكتب في مساحة واحدة',dashboardText:'تابع القضايا والمستندات والمراسلات والمهام، وأنشئ المذكرات وتواصل مع العملاء من لوحة موحدة.',addNewCase:'إضافة قضية جديدة',activeCases:'القضايا النشطة',archiveDocuments:'مستندات الأرشيف',pendingIncoming:'الوارد المعلّق',outgoingThisMonth:'الصادر هذا الشهر',recentCases:'أحدث القضايا',caseFollowup:'متابعة الملفات المفتوحة',viewAll:'عرض الكل',todayTasks:'مهام اليوم',priorityTasks:'الأعمال ذات الأولوية',upcomingSessions:'الجلسات القادمة',quickActions:'إجراءات سريعة',archiveDocument:'أرشفة مستند',registerIncoming:'تسجيل وارد',createMemo:'إنشاء مذكرة',messageClient:'مراسلة عميل',noData:'لا توجد بيانات مسجلة',systemPrototype:'هذه النسخة تعمل محليًا داخل المتصفح. الربط الحقيقي بقاعدة البيانات والذكاء الاصطناعي وواجهة واتساب يحتاج خادمًا آمنًا وإعدادات إنتاجية.'
  },
  en: {
    internalSystem:'Internal System',loginTitle:'Hessa Al-Obaid Law Office Management',loginSubtitle:'A unified platform for cases, clients, hearings, documents, correspondence, and finance.',username:'Username',password:'Password',login:'Sign in',demoCredentials:'Demo access: admin / admin123',officeName:'Hessa Al-Obaid Law Office',lawManagementSystem:'Law Management System',mainOperations:'Core Operations',dashboard:'Dashboard',clients:'Clients',cases:'Cases & Files',sessions:'Hearings & Calendar',tasks:'Tasks & Alerts',documentsComms:'Documents & Correspondence',archive:'Electronic Archive',incoming:'Incoming',outgoing:'Outgoing',correspondence:'Internal Correspondence',whatsapp:'Client WhatsApp',legalFinancial:'Legal & Financial',memoGenerator:'Memo Generator',smartAssistant:'Smart Assistant',contracts:'Contracts & Fees',finance:'Invoices & Expenses',reports:'Reports & Analytics',administration:'Administration',usersPermissions:'Users & Permissions',settings:'Settings',administrator:'System Administrator',logout:'Sign out',welcomeAdmin:'Welcome, Administrator',searchSystem:'Search the system',add:'Add',save:'Save',cancel:'Cancel',delete:'Delete',edit:'Edit',view:'View',print:'Print',copy:'Copy',send:'Send',status:'Status',actions:'Actions',date:'Date',notes:'Notes',client:'Client',case:'Case',amount:'Amount',phone:'Phone',email:'Email',address:'Address',type:'Type',subject:'Subject',reference:'Reference',description:'Description',assignedTo:'Assigned to',priority:'Priority',dueDate:'Due date',todayOverview:'Today Overview',dashboardHeadline:'Your entire law office in one workspace',dashboardText:'Track cases, documents, correspondence, tasks, legal drafts, and client communications from one unified dashboard.',addNewCase:'Add New Case',activeCases:'Active Cases',archiveDocuments:'Archive Documents',pendingIncoming:'Pending Incoming',outgoingThisMonth:'Outgoing This Month',recentCases:'Recent Cases',caseFollowup:'Open File Follow-up',viewAll:'View all',todayTasks:'Today’s Tasks',priorityTasks:'Priority Work',upcomingSessions:'Upcoming Hearings',quickActions:'Quick Actions',archiveDocument:'Archive Document',registerIncoming:'Register Incoming',createMemo:'Create Memo',messageClient:'Message Client',noData:'No data recorded',systemPrototype:'This version runs locally in the browser. A real database, AI model, and WhatsApp API require a secure production backend.'
  }
};

const viewMeta = {
  dashboard:['dashboard','welcomeAdmin'],clients:['clients','clients'],cases:['cases','cases'],sessions:['sessions','sessions'],tasks:['tasks','tasks'],archive:['archive','archive'],incoming:['incoming','incoming'],outgoing:['outgoing','outgoing'],correspondence:['correspondence','correspondence'],whatsapp:['whatsapp','whatsapp'],memo:['memoGenerator','memoGenerator'],assistant:['smartAssistant','smartAssistant'],contracts:['contracts','contracts'],finance:['finance','finance'],reports:['reports','reports'],users:['usersPermissions','usersPermissions'],settings:['settings','settings']
};

const seedState = {
  clients:[
    {id:'CL-001',name:'شركة الخليج للتجارة',phone:'96550000001',email:'legal@gulf.example',type:'شركة',civilId:'',address:'مدينة الكويت',status:'active'},
    {id:'CL-002',name:'أحمد عبدالله',phone:'96550000002',email:'ahmad@example.com',type:'فرد',civilId:'290010100001',address:'حولي',status:'active'},
    {id:'CL-003',name:'مريم سالم',phone:'96550000003',email:'mariam@example.com',type:'فرد',civilId:'',address:'الفروانية',status:'active'}
  ],
  cases:[
    {id:'2026/145 تجاري',clientId:'CL-001',title:'مطالبة مالية وعقد توريد',type:'تجاري',court:'المحكمة الكلية',opponent:'شركة المورد المتحد',lawyer:'حصة العبيد',status:'active',nextAction:'جلسة 2026-08-12',opened:'2026-06-18'},
    {id:'2026/88 مدني',clientId:'CL-002',title:'دعوى تعويض',type:'مدني',court:'المحكمة الكلية',opponent:'شركة تأمين',lawyer:'حصة العبيد',status:'pending',nextAction:'إيداع مذكرة',opened:'2026-07-02'},
    {id:'2026/31 أسرة',clientId:'CL-003',title:'نفقة وحضانة',type:'أحوال شخصية',court:'محكمة الأسرة',opponent:'الطرف الآخر',lawyer:'حصة العبيد',status:'active',nextAction:'مراجعة الإعلان',opened:'2026-07-20'}
  ],
  sessions:[
    {id:'S-001',caseId:'2026/145 تجاري',date:'2026-08-12',time:'09:30',court:'الدائرة التجارية 4',purpose:'جلسة مرافعة',result:'',status:'upcoming'},
    {id:'S-002',caseId:'2026/31 أسرة',date:'2026-08-15',time:'10:00',court:'محكمة الأسرة',purpose:'نظر الدعوى',result:'',status:'upcoming'}
  ],
  tasks:[
    {id:'T-001',title:'إعداد مذكرة الرد في القضية التجارية',caseId:'2026/145 تجاري',assigned:'حصة العبيد',due:'2026-08-09',priority:'high',done:false},
    {id:'T-002',title:'مراجعة مستندات التعويض',caseId:'2026/88 مدني',assigned:'الباحث القانوني',due:'2026-08-08',priority:'medium',done:false},
    {id:'T-003',title:'إرسال تحديث للعميلة',caseId:'2026/31 أسرة',assigned:'السكرتارية',due:'2026-08-06',priority:'medium',done:true}
  ],
  documents:[
    {id:'DOC-0001',name:'عقد التوريد.pdf',category:'عقود',caseId:'2026/145 تجاري',clientId:'CL-001',date:'2026-06-18',tags:'عقد، توريد',fileName:'عقد التوريد.pdf'},
    {id:'DOC-0002',name:'صحيفة الدعوى.pdf',category:'صحف دعاوى',caseId:'2026/88 مدني',clientId:'CL-002',date:'2026-07-02',tags:'دعوى، تعويض',fileName:'صحيفة الدعوى.pdf'},
    {id:'DOC-0003',name:'حافظة مستندات الأسرة.pdf',category:'حوافظ',caseId:'2026/31 أسرة',clientId:'CL-003',date:'2026-07-22',tags:'أسرة',fileName:'حافظة.pdf'}
  ],
  incoming:[
    {id:'IN-2026-001',date:'2026-08-03',from:'المحكمة الكلية',subject:'إعلان جلسة',caseId:'2026/145 تجاري',status:'pending',notes:'يحال للمحامية'},
    {id:'IN-2026-002',date:'2026-08-05',from:'خبير وزارة العدل',subject:'طلب مستندات',caseId:'2026/88 مدني',status:'done',notes:'تم التسليم'}
  ],
  outgoing:[
    {id:'OUT-2026-001',date:'2026-08-02',to:'إدارة الخبراء',subject:'تسليم حافظة مستندات',caseId:'2026/88 مدني',status:'sent',notes:''},
    {id:'OUT-2026-002',date:'2026-08-04',to:'شركة الخليج للتجارة',subject:'تقرير متابعة القضية',caseId:'2026/145 تجاري',status:'sent',notes:''}
  ],
  correspondence:[
    {id:'COR-001',date:'2026-08-05',from:'المحامية',to:'الباحث القانوني',subject:'مراجعة السوابق القضائية',priority:'high',status:'pending'},
    {id:'COR-002',date:'2026-08-05',from:'السكرتارية',to:'المحامية',subject:'تأكيد مواعيد الجلسات',priority:'normal',status:'done'}
  ],
  contracts:[
    {id:'CTR-001',clientId:'CL-001',caseId:'2026/145 تجاري',type:'أتعاب ثابتة',value:2500,paid:1250,start:'2026-06-18',status:'active'},
    {id:'CTR-002',clientId:'CL-002',caseId:'2026/88 مدني',type:'أتعاب ثابتة',value:900,paid:900,start:'2026-07-02',status:'paid'}
  ],
  invoices:[
    {id:'INV-001',clientId:'CL-001',date:'2026-06-18',amount:1250,status:'paid',description:'دفعة مقدمة'},
    {id:'INV-002',clientId:'CL-001',date:'2026-09-01',amount:1250,status:'due',description:'الدفعة النهائية'}
  ],
  expenses:[
    {id:'EXP-001',date:'2026-08-01',category:'رسوم قضائية',amount:35,caseId:'2026/88 مدني',description:'رسوم إعلان'},
    {id:'EXP-002',date:'2026-08-04',category:'تصوير وطباعة',amount:12,caseId:'2026/145 تجاري',description:'حافظة مستندات'}
  ],
  users:[
    {id:'U-001',name:'حصة العبيد',email:'admin@office.local',role:'مدير النظام',status:'active'},
    {id:'U-002',name:'الباحث القانوني',email:'research@office.local',role:'باحث قانوني',status:'active'},
    {id:'U-003',name:'السكرتارية',email:'secretary@office.local',role:'سكرتارية',status:'active'}
  ],
  memos:[],
  activities:[
    {date:'2026-08-06 02:30',text:'تم تحديث بيانات القضية 2026/145 تجاري'},
    {date:'2026-08-05 15:10',text:'تم تسجيل وارد جديد من إدارة الخبراء'},
    {date:'2026-08-05 11:25',text:'تم إرسال تقرير متابعة للعميل'}
  ],
  settings:{officeName:'مكتب المحامية حصة العبيد',phone:'+965 0000 0000',email:'info@example.com',address:'الكويت',casePrefix:'CASE',incomingPrefix:'IN',outgoingPrefix:'OUT'},
  language:'ar',theme:'light',currentView:'dashboard'
};

let state = loadState();
let modalSubmitHandler = null;

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const appContent = document.getElementById('appContent');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');
const modalKicker = document.getElementById('modalKicker');

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.clients ? {...clone(seedState),...saved} : clone(seedState);
  }catch{return clone(seedState);}
}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); updateStats(); }
function t(key){ return i18n[state.language]?.[key] || i18n.ar[key] || key; }
function esc(value=''){ return String(value).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function clientName(id){ return state.clients.find(x=>x.id===id)?.name || id || '—'; }
function caseTitle(id){ return state.cases.find(x=>x.id===id)?.title || id || '—'; }
function uid(prefix,list){ return `${prefix}-${String(list.length+1).padStart(3,'0')}`; }
function money(value){ return `${Number(value||0).toLocaleString(state.language==='ar'?'ar-KW':'en-US')} د.ك`; }
function statusLabel(status){
  const labels={active:['نشط','Active'],pending:['قيد المتابعة','Pending'],closed:['مغلق','Closed'],paid:['مدفوع','Paid'],due:['مستحق','Due'],sent:['مرسل','Sent'],done:['منجز','Done'],upcoming:['قادم','Upcoming'],overdue:['متأخر','Overdue'],cancelled:['ملغي','Cancelled']};
  return labels[status]?.[state.language==='ar'?0:1] || status;
}
function statusChip(status){ return `<span class="status ${esc(status)}">${esc(statusLabel(status))}</span>`; }
function today(){ return new Date().toISOString().slice(0,10); }
function options(items,selected='',labelFn=x=>x.name,valueFn=x=>x.id){ return items.map(x=>`<option value="${esc(valueFn(x))}" ${valueFn(x)===selected?'selected':''}>${esc(labelFn(x))}</option>`).join(''); }
function pageHead(title,subtitle,actions=''){ return `<header class="page-head"><div><p class="eyebrow">LMS • ${t('officeName')}</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></header>`; }
function empty(){ return `<div class="empty-state">${t('noData')}</div>`; }

function applyLanguage(){
  document.documentElement.lang=state.language;
  document.documentElement.dir=state.language==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(i18n[state.language]?.[key])el.textContent=t(key)});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder)});
  document.getElementById('langToggle').textContent=state.language==='ar'?'EN':'ع';
}
function applyTheme(){
  document.documentElement.dataset.theme=state.theme;
  document.getElementById('themeToggle').textContent=state.theme==='dark'?'☀':'☾';
  document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#081310':'#0b302c';
}
function updateHeader(view){
  const meta=viewMeta[view]||viewMeta.dashboard;
  document.getElementById('breadcrumb').textContent=t(meta[0]);
  document.getElementById('pageTitle').textContent=view==='dashboard'?t('welcomeAdmin'):t(meta[1]);
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
}
function switchView(view){
  state.currentView=view; saveState(); updateHeader(view); renderView(view); closeSidebar(); window.scrollTo({top:0,behavior:'smooth'});
}

function renderView(view){
  const renderers={dashboard:renderDashboard,clients:renderClients,cases:renderCases,sessions:renderSessions,tasks:renderTasks,archive:renderArchive,incoming:()=>renderRegistry('incoming'),outgoing:()=>renderRegistry('outgoing'),correspondence:renderCorrespondence,whatsapp:renderWhatsApp,memo:renderMemo,assistant:renderAssistant,contracts:renderContracts,finance:renderFinance,reports:renderReports,users:renderUsers,settings:renderSettings};
  appContent.innerHTML=(renderers[view]||renderDashboard)();
  bindViewEvents(view); updateStats();
}

function renderDashboard(){
  const upcoming=[...state.sessions].filter(x=>x.status==='upcoming').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  const openTasks=state.tasks.filter(x=>!x.done).slice(0,5);
  const recentCases=state.cases.slice(-5).reverse();
  return `
    <section class="hero-panel"><div><p class="eyebrow">${t('todayOverview')}</p><h1>${t('dashboardHeadline')}</h1><p>${t('dashboardText')}</p></div><button class="btn btn-light" data-action="add-case">＋ ${t('addNewCase')}</button></section>
    <section class="stats-grid">
      <article class="stat-card"><span>${t('activeCases')}</span><strong id="dashCases">${state.cases.filter(x=>x.status!=='closed').length}</strong><small class="trend">+ ${state.cases.length} ${t('cases')}</small></article>
      <article class="stat-card"><span>${t('archiveDocuments')}</span><strong>${state.documents.length}</strong><small>${t('archive')}</small></article>
      <article class="stat-card"><span>${t('pendingIncoming')}</span><strong>${state.incoming.filter(x=>x.status==='pending').length}</strong><small>${t('incoming')}</small></article>
      <article class="stat-card"><span>${t('outgoingThisMonth')}</span><strong>${state.outgoing.length}</strong><small>${t('outgoing')}</small></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">${t('recentCases')}</span><h3>${t('caseFollowup')}</h3></div><button class="text-btn" data-view-link="cases">${t('viewAll')}</button></div>${recentCases.length?`<div class="table-wrap"><table><thead><tr><th>${t('case')}</th><th>${t('client')}</th><th>${t('type')}</th><th>${t('status')}</th><th>الإجراء القادم</th></tr></thead><tbody>${recentCases.map(c=>`<tr class="searchable-row"><td><b>${esc(c.id)}</b><br><small>${esc(c.title)}</small></td><td>${esc(clientName(c.clientId))}</td><td>${esc(c.type)}</td><td>${statusChip(c.status)}</td><td>${esc(c.nextAction)}</td></tr>`).join('')}</tbody></table></div>`:empty()}</article>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">${t('todayTasks')}</span><h3>${t('priorityTasks')}</h3></div><button class="icon-btn" data-action="add-task">＋</button></div><div class="task-list">${openTasks.length?openTasks.map(renderTaskItem).join(''):empty()}</div></article>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">${t('upcomingSessions')}</span><h3>${t('sessions')}</h3></div><button class="text-btn" data-view-link="sessions">${t('viewAll')}</button></div><div class="timeline">${upcoming.length?upcoming.map(s=>`<div class="timeline-item"><div class="timeline-date">${esc(s.date)}<br>${esc(s.time)}</div><div><h3>${esc(s.purpose)}</h3><p>${esc(s.caseId)} • ${esc(s.court)}</p></div></div>`).join(''):empty()}</div></article>
      <article class="panel"><div class="panel-head"><div><span class="panel-kicker">${t('quickActions')}</span><h3>LMS</h3></div></div><div class="cards-grid"><button class="btn btn-secondary" data-view-link="archive">▤ ${t('archiveDocument')}</button><button class="btn btn-secondary" data-action="add-incoming">↓ ${t('registerIncoming')}</button><button class="btn btn-secondary" data-view-link="memo">✎ ${t('createMemo')}</button><button class="btn btn-secondary" data-view-link="whatsapp">◉ ${t('messageClient')}</button></div><p class="notice" style="margin-top:14px">${t('systemPrototype')}</p></article>
    </section>`;
}

function renderClients(){
  return `${pageHead(t('clients'),'قاعدة موحدة لبيانات الموكلين والأطراف ووسائل التواصل.',`<button class="btn btn-primary" data-action="add-client">＋ ${t('add')} ${t('client')}</button>`)}
  <div class="filter-bar"><input class="local-filter" placeholder="بحث بالاسم أو الهاتف أو الرقم المدني"><select class="status-filter"><option value="">كل الحالات</option><option value="active">نشط</option><option value="closed">غير نشط</option></select></div>
  <section class="cards-grid" id="entityList">${state.clients.length?state.clients.map(c=>`<article class="entity-card searchable-row" data-status="${c.status}"><div class="entity-card-head"><div><h3>${esc(c.name)}</h3><p>${esc(c.type)} • ${esc(c.id)}</p></div>${statusChip(c.status)}</div><div class="entity-meta"><div><span>${t('phone')}</span><b>${esc(c.phone)}</b></div><div><span>${t('email')}</span><b>${esc(c.email||'—')}</b></div><div><span>${t('address')}</span><b>${esc(c.address||'—')}</b></div><div><span>${t('cases')}</span><b>${state.cases.filter(x=>x.clientId===c.id).length}</b></div></div><div class="action-row"><button class="mini-btn" data-view-client="${c.id}">${t('view')}</button><button class="mini-btn" data-action="add-case" data-client="${c.id}">＋ ${t('case')}</button><button class="mini-btn" data-whatsapp-client="${c.id}">WhatsApp</button><button class="mini-btn" data-delete="clients" data-id="${c.id}">${t('delete')}</button></div></article>`).join(''):empty()}</section>`;
}

function renderCases(){
  return `${pageHead(t('cases'),'إدارة الملف القانوني الكامل: الموكل، الخصوم، المحكمة، الجلسات، المستندات والمهام.',`<button class="btn btn-primary" data-action="add-case">＋ ${t('addNewCase')}</button>`)}
  <div class="filter-bar"><input class="local-filter" placeholder="بحث برقم القضية أو الموكل أو الخصم"><select class="status-filter"><option value="">كل الحالات</option><option value="active">نشط</option><option value="pending">قيد المتابعة</option><option value="closed">مغلق</option></select></div>
  <div class="table-wrap"><table><thead><tr><th>${t('case')}</th><th>${t('client')}</th><th>${t('type')}</th><th>المحكمة / الخصم</th><th>${t('status')}</th><th>الإجراء القادم</th><th>${t('actions')}</th></tr></thead><tbody>${state.cases.map(c=>`<tr class="searchable-row" data-status="${c.status}"><td><b>${esc(c.id)}</b><br><small>${esc(c.title)}</small></td><td>${esc(clientName(c.clientId))}</td><td>${esc(c.type)}</td><td>${esc(c.court)}<br><small>${esc(c.opponent)}</small></td><td>${statusChip(c.status)}</td><td>${esc(c.nextAction)}</td><td><button class="mini-btn" data-case-detail="${c.id}">${t('view')}</button> <button class="mini-btn" data-delete="cases" data-id="${c.id}">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderSessions(){
  const rows=[...state.sessions].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `${pageHead(t('sessions'),'تقويم الجلسات والمواعيد والقرارات والمهل الإجرائية.',`<button class="btn btn-primary" data-action="add-session">＋ ${t('add')} جلسة</button>`)}<div class="timeline">${rows.length?rows.map(s=>`<article class="timeline-item searchable-row"><div class="timeline-date">${esc(s.date)}<br>${esc(s.time)}</div><div><div class="entity-card-head"><div><h3>${esc(s.purpose)}</h3><p>${esc(s.caseId)} • ${esc(s.court)}</p></div>${statusChip(s.status)}</div><p>${esc(s.result||'لم تسجل النتيجة بعد')}</p><div class="action-row"><button class="mini-btn" data-session-result="${s.id}">تسجيل النتيجة</button><button class="mini-btn" data-delete="sessions" data-id="${s.id}">${t('delete')}</button></div></div></article>`).join(''):empty()}</div>`;
}

function renderTaskItem(x){ return `<div class="task-item ${x.done?'done':''} searchable-row"><button class="task-check" data-toggle-task="${x.id}">${x.done?'✓':''}</button><div class="task-copy"><strong>${esc(x.title)}</strong><small>${esc(x.caseId||'')} • ${esc(x.assigned)} • ${esc(x.due)}</small></div><span class="status ${x.priority==='high'?'overdue':'pending'}">${esc(x.priority)}</span></div>`; }
function renderTasks(){ return `${pageHead(t('tasks'),'توزيع الأعمال، متابعة الإنجاز، والتنبيه بالمواعيد والمهل.',`<button class="btn btn-primary" data-action="add-task">＋ ${t('add')} مهمة</button>`)}<div class="task-list">${state.tasks.length?state.tasks.map(renderTaskItem).join(''):empty()}</div>`; }

function renderArchive(){
  return `${pageHead(t('archive'),'أرشفة المستندات وربطها بالعميل والقضية والتصنيف والكلمات المفتاحية.',`<button class="btn btn-primary" data-action="add-document">＋ ${t('archiveDocument')}</button>`)}
  <div class="filter-bar"><input class="local-filter" placeholder="بحث باسم المستند أو القضية أو التصنيف"><select class="category-filter"><option value="">كل التصنيفات</option>${[...new Set(state.documents.map(x=>x.category))].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
  <div class="table-wrap"><table><thead><tr><th>رقم الأرشفة</th><th>المستند</th><th>التصنيف</th><th>${t('client')}</th><th>${t('case')}</th><th>${t('date')}</th><th>${t('actions')}</th></tr></thead><tbody>${state.documents.map(d=>`<tr class="searchable-row" data-category="${esc(d.category)}"><td>${esc(d.id)}</td><td><b>${esc(d.name)}</b><br><small>${esc(d.tags||'')}</small></td><td>${esc(d.category)}</td><td>${esc(clientName(d.clientId))}</td><td>${esc(d.caseId||'—')}</td><td>${esc(d.date)}</td><td><button class="mini-btn" data-document-detail="${d.id}">${t('view')}</button> <button class="mini-btn" data-delete="documents" data-id="${d.id}">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div><p class="notice" style="margin-top:14px">في النسخة الحالية يتم حفظ بيانات الملف واسمه فقط داخل المتصفح. التخزين الحقيقي للملفات يحتاج Supabase Storage أو خادم ملفات آمن.</p>`;
}

function renderRegistry(kind){
  const list=state[kind]; const title=t(kind); const isIncoming=kind==='incoming';
  return `${pageHead(title,isIncoming?'تسجيل الكتب والإعلانات والمستندات الواردة ومسار إحالتها.':'تسجيل الكتب والمخاطبات الصادرة وأرقامها وجهات إرسالها.',`<button class="btn btn-primary" data-action="add-${kind}">＋ ${t('add')} ${title}</button>`)}
  <div class="table-wrap"><table><thead><tr><th>${t('reference')}</th><th>${t('date')}</th><th>${isIncoming?'من':'إلى'}</th><th>${t('subject')}</th><th>${t('case')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead><tbody>${list.map(x=>`<tr class="searchable-row"><td>${esc(x.id)}</td><td>${esc(x.date)}</td><td>${esc(isIncoming?x.from:x.to)}</td><td>${esc(x.subject)}</td><td>${esc(x.caseId||'—')}</td><td>${statusChip(x.status)}</td><td><button class="mini-btn" data-registry-status="${kind}" data-id="${x.id}">تغيير الحالة</button> <button class="mini-btn" data-delete="${kind}" data-id="${x.id}">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderCorrespondence(){
  return `${pageHead(t('correspondence'),'إحالات وتعليمات ومذكرات داخلية بين أعضاء فريق المكتب.',`<button class="btn btn-primary" data-action="add-correspondence">＋ ${t('add')} مراسلة</button>`)}<div class="table-wrap"><table><thead><tr><th>${t('reference')}</th><th>${t('date')}</th><th>من</th><th>إلى</th><th>${t('subject')}</th><th>${t('priority')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead><tbody>${state.correspondence.map(x=>`<tr class="searchable-row"><td>${esc(x.id)}</td><td>${esc(x.date)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${esc(x.subject)}</td><td>${esc(x.priority)}</td><td>${statusChip(x.status)}</td><td><button class="mini-btn" data-registry-status="correspondence" data-id="${x.id}">تغيير الحالة</button> <button class="mini-btn" data-delete="correspondence" data-id="${x.id}">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderWhatsApp(){
  const first=state.clients[0];
  return `${pageHead(t('whatsapp'),'إنشاء رسالة مرتبطة بالعميل والقضية وفتحها مباشرة في واتساب.',``)}<div class="whatsapp-layout"><form class="form-card" id="whatsappForm"><h3>إعداد الرسالة</h3><label>${t('client')}<select id="waClient" required>${options(state.clients,first?.id)}</select></label><label>${t('case')}<select id="waCase"><option value="">بدون قضية محددة</option>${options(state.cases,'',x=>`${x.id} — ${x.title}`,x=>x.id)}</select></label><label>قالب الرسالة<select id="waTemplate"><option value="update">تحديث حالة القضية</option><option value="session">تذكير بموعد جلسة</option><option value="documents">طلب مستندات</option><option value="payment">تذكير بدفعة أتعاب</option><option value="custom">رسالة مخصصة</option></select></label><label>نص الرسالة<textarea id="waMessage" rows="8"></textarea></label><button class="btn btn-primary full" type="submit">فتح المحادثة في واتساب</button><p class="notice">الإرسال الآلي والاستقبال داخل النظام يحتاجان ربط WhatsApp Business Cloud API برقم موثق وخادم آمن.</p></form><section class="info-card"><h3>معاينة الرسالة</h3><div class="whatsapp-preview"><div class="wa-bubble" id="waPreview"></div></div><div class="entity-meta"><div><span>العميل</span><b id="waPreviewClient">${esc(first?.name||'—')}</b></div><div><span>الهاتف</span><b id="waPreviewPhone">${esc(first?.phone||'—')}</b></div></div></section></div>`;
}

function renderMemo(){
  return `${pageHead(t('memoGenerator'),'إنشاء مسودة قانونية منظمة وربطها ببيانات القضية والعميل.',``)}<div class="memo-layout"><form class="form-card" id="memoForm"><h3>بيانات المسودة</h3><div class="form-grid"><label>نوع المستند<select id="memoType"><option>مذكرة دفاع</option><option>صحيفة دعوى</option><option>مذكرة رد</option><option>مذكرة استئناف</option><option>مذكرة للخبراء</option><option>إنذار رسمي</option></select></label><label>${t('case')}<select id="memoCase"><option value="">اختر القضية</option>${options(state.cases,'',x=>`${x.id} — ${x.title}`,x=>x.id)}</select></label><label>المحكمة أو الجهة<input id="memoCourt" placeholder="المحكمة الكلية"></label><label>صفة مقدم المذكرة<input id="memoRole" placeholder="المدعي / المدعى عليه"></label></div><label>الوقائع<textarea id="memoFacts" rows="7" required placeholder="اكتب الوقائع بالتسلسل الزمني"></textarea></label><label>الدفوع والأسانيد<textarea id="memoDefenses" rows="6" placeholder="أدخل الدفوع والنصوص والمبادئ المراد الاستناد إليها"></textarea></label><label>الطلبات<textarea id="memoClaims" rows="5" required placeholder="اكتب الطلبات الختامية"></textarea></label><div class="page-actions"><button class="btn btn-primary" type="submit">✦ توليد المسودة</button><button class="btn btn-secondary" id="memoClear" type="button">مسح</button></div><p class="notice">المولد يصنع مسودة تنظيمية أولية. التوليد القانوني الذكي الحقيقي يحتاج ربط نموذج ذكاء اصطناعي بقاعدة تشريعات ومراجعة محامٍ مختص.</p></form><section class="output-card"><div class="panel-head"><div><span class="panel-kicker">المسودة الناتجة</span><h3>المذكرة القانونية</h3></div><div><button class="mini-btn" id="copyMemo">${t('copy')}</button> <button class="mini-btn" id="printMemo">${t('print')}</button></div></div><div class="memo-output" id="memoOutput">أدخل البيانات ثم اضغط «توليد المسودة».</div></section></div>`;
}

function renderAssistant(){
  return `${pageHead(t('smartAssistant'),'مساعد داخلي لتحليل بيانات القضايا وتلخيص الملفات واقتراح الخطوات الإدارية.',``)}<div class="assistant-layout"><section class="form-card"><h3>أدوات سريعة</h3><label>${t('case')}<select id="assistantCase"><option value="">اختر القضية</option>${options(state.cases,'',x=>`${x.id} — ${x.title}`,x=>x.id)}</select></label><div class="assistant-tools"><button class="mini-btn" data-ai-tool="summary">تلخيص القضية</button><button class="mini-btn" data-ai-tool="missing">تحديد البيانات الناقصة</button><button class="mini-btn" data-ai-tool="timeline">إنشاء خط زمني</button><button class="mini-btn" data-ai-tool="client-update">صياغة تحديث للعميل</button></div><p class="notice">المساعد الحالي يعمل بقواعد محلية تجريبية ولا يرسل البيانات إلى أي خدمة خارجية. ربط OpenAI يتم لاحقًا عبر خادم آمن، وليس من المتصفح مباشرة.</p></section><section class="chat-card"><h3>المحادثة القانونية الداخلية</h3><div class="chat-stream" id="chatStream"><div class="chat-bubble assistant">مرحبًا. اختر قضية أو اكتب طلبًا مثل: «لخص القضية» أو «ما البيانات الناقصة؟».</div></div><form class="chat-input" id="assistantForm"><textarea id="assistantInput" rows="2" required placeholder="اكتب سؤالك أو طلبك"></textarea><button class="btn btn-primary" type="submit">${t('send')}</button></form></section></div>`;
}

function renderContracts(){
  return `${pageHead(t('contracts'),'إدارة عقود الأتعاب وقيمتها ودفعاتها ونسب الإنجاز.',`<button class="btn btn-primary" data-action="add-contract">＋ ${t('add')} عقد</button>`)}<div class="table-wrap"><table><thead><tr><th>${t('reference')}</th><th>${t('client')}</th><th>${t('case')}</th><th>${t('type')}</th><th>قيمة العقد</th><th>المدفوع</th><th>المتبقي</th><th>${t('status')}</th></tr></thead><tbody>${state.contracts.map(x=>`<tr class="searchable-row"><td>${esc(x.id)}</td><td>${esc(clientName(x.clientId))}</td><td>${esc(x.caseId)}</td><td>${esc(x.type)}</td><td>${money(x.value)}</td><td>${money(x.paid)}</td><td>${money(x.value-x.paid)}</td><td>${statusChip(x.status)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderFinance(){
  const income=state.invoices.filter(x=>x.status==='paid').reduce((a,b)=>a+Number(b.amount),0);
  const due=state.invoices.filter(x=>x.status==='due').reduce((a,b)=>a+Number(b.amount),0);
  const exp=state.expenses.reduce((a,b)=>a+Number(b.amount),0);
  return `${pageHead(t('finance'),'الفواتير والتحصيل والمصروفات المرتبطة بالقضايا والعملاء.',`<button class="btn btn-primary" data-action="add-invoice">＋ فاتورة</button><button class="btn btn-secondary" data-action="add-expense">＋ مصروف</button>`)}<section class="stats-grid"><article class="stat-card"><span>المبالغ المحصلة</span><strong>${money(income)}</strong></article><article class="stat-card"><span>المبالغ المستحقة</span><strong>${money(due)}</strong></article><article class="stat-card"><span>المصروفات</span><strong>${money(exp)}</strong></article><article class="stat-card"><span>الصافي</span><strong>${money(income-exp)}</strong></article></section><section class="dashboard-grid"><article class="panel"><div class="panel-head"><h3>الفواتير</h3></div><div class="table-wrap"><table><thead><tr><th>الرقم</th><th>${t('client')}</th><th>${t('date')}</th><th>${t('description')}</th><th>${t('amount')}</th><th>${t('status')}</th></tr></thead><tbody>${state.invoices.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(clientName(x.clientId))}</td><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td>${money(x.amount)}</td><td>${statusChip(x.status)}</td></tr>`).join('')}</tbody></table></div></article><article class="panel"><div class="panel-head"><h3>المصروفات</h3></div><div class="table-wrap"><table><thead><tr><th>الرقم</th><th>${t('date')}</th><th>التصنيف</th><th>${t('case')}</th><th>${t('amount')}</th></tr></thead><tbody>${state.expenses.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.date)}</td><td>${esc(x.category)}</td><td>${esc(x.caseId)}</td><td>${money(x.amount)}</td></tr>`).join('')}</tbody></table></div></article></section>`;
}

function renderReports(){
  const types={}; state.cases.forEach(x=>types[x.type]=(types[x.type]||0)+1); const max=Math.max(1,...Object.values(types));
  const collected=state.invoices.filter(x=>x.status==='paid').reduce((a,b)=>a+Number(b.amount),0); const due=state.invoices.filter(x=>x.status==='due').reduce((a,b)=>a+Number(b.amount),0);
  return `${pageHead(t('reports'),'مؤشرات تشغيلية ومالية قابلة للتوسع والتصدير.',`<button class="btn btn-secondary" id="printReport">${t('print')}</button>`)}<section class="report-grid"><article class="panel"><div class="panel-head"><h3>القضايا حسب النوع</h3></div><div class="bar-chart">${Object.entries(types).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${(v/max)*100}%"></div></div><b>${v}</b></div>`).join('')}</div></article><article class="panel"><div class="panel-head"><h3>الحالة المالية</h3></div><div class="bar-chart"><div class="bar-row"><span>محصل</span><div class="bar-track"><div class="bar-fill" style="width:${collected+due?collected/(collected+due)*100:0}%"></div></div><b>${money(collected)}</b></div><div class="bar-row"><span>مستحق</span><div class="bar-track"><div class="bar-fill" style="width:${collected+due?due/(collected+due)*100:0}%"></div></div><b>${money(due)}</b></div></div></article><article class="panel"><div class="panel-head"><h3>مؤشرات الأداء</h3></div><div class="entity-meta"><div><span>إجمالي العملاء</span><b>${state.clients.length}</b></div><div><span>القضايا المفتوحة</span><b>${state.cases.filter(x=>x.status!=='closed').length}</b></div><div><span>المهام المنجزة</span><b>${state.tasks.filter(x=>x.done).length}/${state.tasks.length}</b></div><div><span>الجلسات القادمة</span><b>${state.sessions.filter(x=>x.status==='upcoming').length}</b></div></div></article><article class="panel"><div class="panel-head"><h3>سجل النشاط</h3></div><div class="timeline">${state.activities.slice(0,6).map(x=>`<div class="timeline-item"><div class="timeline-date">${esc(x.date)}</div><div><p>${esc(x.text)}</p></div></div>`).join('')}</div></article></section>`;
}

function renderUsers(){
  return `${pageHead(t('usersPermissions'),'إدارة المستخدمين والأدوار وصلاحيات الوصول إلى بيانات المكتب.',`<button class="btn btn-primary" data-action="add-user">＋ ${t('add')} مستخدم</button>`)}<section class="cards-grid">${state.users.map(u=>`<article class="entity-card searchable-row"><div class="entity-card-head"><div><h3>${esc(u.name)}</h3><p>${esc(u.email)}</p></div>${statusChip(u.status)}</div><div class="entity-meta"><div><span>الدور</span><b>${esc(u.role)}</b></div><div><span>المعرف</span><b>${esc(u.id)}</b></div></div><div class="action-row"><button class="mini-btn" data-permissions="${u.id}">الصلاحيات</button><button class="mini-btn" data-delete="users" data-id="${u.id}">${t('delete')}</button></div></article>`).join('')}</section>`;
}

function renderSettings(){
  const s=state.settings;
  return `${pageHead(t('settings'),'هوية المكتب والترقيم والنسخ الاحتياطي وإعدادات النظام.',``)}<div class="settings-grid"><form class="form-card" id="settingsForm"><h3>بيانات المكتب</h3><label>اسم المكتب<input name="officeName" value="${esc(s.officeName)}"></label><label>${t('phone')}<input name="phone" value="${esc(s.phone)}"></label><label>${t('email')}<input name="email" value="${esc(s.email)}"></label><label>${t('address')}<input name="address" value="${esc(s.address)}"></label><div class="form-grid"><label>بادئة القضايا<input name="casePrefix" value="${esc(s.casePrefix)}"></label><label>بادئة الوارد<input name="incomingPrefix" value="${esc(s.incomingPrefix)}"></label></div><button class="btn btn-primary" type="submit">${t('save')}</button></form><section class="info-card"><h3>إدارة البيانات</h3><p class="muted">تصدير نسخة احتياطية بصيغة JSON أو استيراد نسخة سابقة.</p><div class="page-actions"><button class="btn btn-secondary" id="exportData">تصدير البيانات</button><label class="btn btn-secondary" style="cursor:pointer">استيراد البيانات<input id="importData" type="file" accept="application/json" hidden></label><button class="btn btn-danger" id="resetData">إعادة ضبط النسخة التجريبية</button></div><p class="notice" style="margin-top:16px">للإطلاق الرسمي: قاعدة بيانات PostgreSQL، تخزين مستندات مشفر، صلاحيات RBAC، سجل تدقيق، نسخ احتياطي، ومصادقة متعددة العوامل.</p></section></div>`;
}

function bindViewEvents(view){
  appContent.querySelectorAll('[data-view-link]').forEach(x=>x.addEventListener('click',()=>switchView(x.dataset.viewLink)));
  appContent.querySelectorAll('[data-action]').forEach(x=>x.addEventListener('click',()=>openAction(x.dataset.action,x.dataset)));
  appContent.querySelectorAll('[data-delete]').forEach(x=>x.addEventListener('click',()=>deleteItem(x.dataset.delete,x.dataset.id)));
  appContent.querySelectorAll('[data-toggle-task]').forEach(x=>x.addEventListener('click',()=>{const item=state.tasks.find(t=>t.id===x.dataset.toggleTask);if(item){item.done=!item.done;logActivity(`تحديث المهمة: ${item.title}`);saveState();renderView(view)}}));
  appContent.querySelectorAll('[data-registry-status]').forEach(x=>x.addEventListener('click',()=>toggleRegistryStatus(x.dataset.registryStatus,x.dataset.id)));
  appContent.querySelectorAll('[data-whatsapp-client]').forEach(x=>x.addEventListener('click',()=>{switchView('whatsapp');setTimeout(()=>{document.getElementById('waClient').value=x.dataset.whatsappClient;updateWaPreview()},0)}));
  appContent.querySelectorAll('[data-case-detail]').forEach(x=>x.addEventListener('click',()=>showCaseDetail(x.dataset.caseDetail)));
  appContent.querySelectorAll('[data-view-client]').forEach(x=>x.addEventListener('click',()=>showClientDetail(x.dataset.viewClient)));
  appContent.querySelectorAll('[data-document-detail]').forEach(x=>x.addEventListener('click',()=>showDocumentDetail(x.dataset.documentDetail)));
  appContent.querySelectorAll('[data-session-result]').forEach(x=>x.addEventListener('click',()=>openSessionResult(x.dataset.sessionResult)));
  appContent.querySelectorAll('[data-permissions]').forEach(x=>x.addEventListener('click',()=>openPermissions(x.dataset.permissions)));
  bindFilters();
  if(view==='memo') bindMemo();
  if(view==='assistant') bindAssistant();
  if(view==='whatsapp') bindWhatsApp();
  if(view==='settings') bindSettings();
  if(view==='reports') document.getElementById('printReport')?.addEventListener('click',()=>window.print());
}

function bindFilters(){
  const filter=appContent.querySelector('.local-filter'); const status=appContent.querySelector('.status-filter'); const category=appContent.querySelector('.category-filter');
  const run=()=>{const q=(filter?.value||'').toLowerCase();appContent.querySelectorAll('.searchable-row').forEach(row=>{const matchText=row.textContent.toLowerCase().includes(q);const matchStatus=!status?.value||row.dataset.status===status.value;const matchCategory=!category?.value||row.dataset.category===category.value;row.style.display=matchText&&matchStatus&&matchCategory?'':'none'})};
  filter?.addEventListener('input',run);status?.addEventListener('change',run);category?.addEventListener('change',run);
}

function openAction(action,data={}){
  const map={
    'add-client':()=>openClientModal(), 'add-case':()=>openCaseModal(data.client), 'add-session':openSessionModal, 'add-task':openTaskModal, 'add-document':openDocumentModal,
    'add-incoming':()=>openRegistryModal('incoming'), 'add-outgoing':()=>openRegistryModal('outgoing'), 'add-correspondence':openCorrespondenceModal,
    'add-contract':openContractModal, 'add-invoice':openInvoiceModal, 'add-expense':openExpenseModal, 'add-user':openUserModal
  }; (map[action]||(()=>{}))();
}
function openModal(title,kicker,html,onSubmit){ modalTitle.textContent=title;modalKicker.textContent=kicker;modalBody.innerHTML=html;modalBackdrop.classList.remove('hidden');modalSubmitHandler=onSubmit;const form=modalBody.querySelector('form');form?.addEventListener('submit',e=>{e.preventDefault();onSubmit?.(new FormData(form),form)});setTimeout(()=>modalBody.querySelector('input,select,textarea')?.focus(),50); }
function closeModal(){ modalBackdrop.classList.add('hidden');modalBody.innerHTML='';modalSubmitHandler=null; }
function modalForm(fields){ return `<form class="modal-form">${fields}<div class="modal-actions"><button class="btn btn-secondary" type="button" data-close-modal>${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`; }
function field(label,name,type='text',value='',extra=''){ if(type==='textarea')return `<label>${label}<textarea name="${name}" rows="4" ${extra}>${esc(value)}</textarea></label>`; return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`; }
function selectField(label,name,opts,selected=''){ return `<label>${label}<select name="${name}">${opts.map(o=>`<option value="${esc(o.value)}" ${o.value===selected?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`; }

function openClientModal(){ openModal('إضافة عميل','العملاء',modalForm(field('الاسم','name','text','','required')+selectField('النوع','type',[{value:'فرد',label:'فرد'},{value:'شركة',label:'شركة'},{value:'جهة',label:'جهة'}])+field('الهاتف','phone','tel','','required')+field('البريد الإلكتروني','email','email')+field('الرقم المدني / السجل','civilId')+field('العنوان','address')),fd=>{state.clients.push({id:uid('CL',state.clients),name:fd.get('name'),type:fd.get('type'),phone:fd.get('phone'),email:fd.get('email'),civilId:fd.get('civilId'),address:fd.get('address'),status:'active'});logActivity(`إضافة عميل: ${fd.get('name')}`);saveState();closeModal();renderView('clients');toast('تمت إضافة العميل')}); }
function openCaseModal(clientId=''){ openModal('إضافة قضية','القضايا',modalForm(field('رقم القضية','id','text','','required')+selectField('العميل','clientId',state.clients.map(x=>({value:x.id,label:x.name})),clientId)+field('عنوان الملف','title','text','','required')+selectField('نوع القضية','type',['مدني','تجاري','جزائي','أحوال شخصية','عمالي','إداري'].map(x=>({value:x,label:x})))+field('المحكمة','court')+field('الخصم','opponent')+field('المحامي المكلف','lawyer','text','حصة العبيد')+field('الإجراء القادم','nextAction')),fd=>{if(state.cases.some(x=>x.id===fd.get('id')))return toast('رقم القضية مستخدم');state.cases.push({id:fd.get('id'),clientId:fd.get('clientId'),title:fd.get('title'),type:fd.get('type'),court:fd.get('court'),opponent:fd.get('opponent'),lawyer:fd.get('lawyer'),nextAction:fd.get('nextAction'),status:'active',opened:today()});logActivity(`إضافة قضية: ${fd.get('id')}`);saveState();closeModal();renderView('cases');toast('تمت إضافة القضية')}); }
function openSessionModal(){ openModal('إضافة جلسة','الجلسات',modalForm(selectField('القضية','caseId',state.cases.map(x=>({value:x.id,label:`${x.id} — ${x.title}`})))+field('التاريخ','date','date',today(),'required')+field('الوقت','time','time','09:00')+field('المحكمة / الدائرة','court')+field('الغرض من الجلسة','purpose','text','','required')),fd=>{state.sessions.push({id:uid('S',state.sessions),caseId:fd.get('caseId'),date:fd.get('date'),time:fd.get('time'),court:fd.get('court'),purpose:fd.get('purpose'),result:'',status:'upcoming'});logActivity('إضافة جلسة جديدة');saveState();closeModal();renderView('sessions');toast('تمت إضافة الجلسة')}); }
function openTaskModal(){ openModal('إضافة مهمة','المهام',modalForm(field('عنوان المهمة','title','text','','required')+selectField('القضية','caseId',[{value:'',label:'بدون قضية'},...state.cases.map(x=>({value:x.id,label:x.id}))])+field('المكلف','assigned','text','حصة العبيد')+field('تاريخ الاستحقاق','due','date',today())+selectField('الأولوية','priority',[{value:'high',label:'عالية'},{value:'medium',label:'متوسطة'},{value:'low',label:'منخفضة'}])),fd=>{state.tasks.push({id:uid('T',state.tasks),title:fd.get('title'),caseId:fd.get('caseId'),assigned:fd.get('assigned'),due:fd.get('due'),priority:fd.get('priority'),done:false});saveState();closeModal();renderView('tasks');toast('تمت إضافة المهمة')}); }
function openDocumentModal(){ openModal('أرشفة مستند','الأرشيف',modalForm(field('اسم المستند','name','text','','required')+selectField('التصنيف','category',['عقود','صحف دعاوى','مذكرات','حوافظ','أحكام','مراسلات','توكيلات','أخرى'].map(x=>({value:x,label:x})))+selectField('العميل','clientId',[{value:'',label:'بدون عميل'},...state.clients.map(x=>({value:x.id,label:x.name}))])+selectField('القضية','caseId',[{value:'',label:'بدون قضية'},...state.cases.map(x=>({value:x.id,label:x.id}))])+field('الكلمات المفتاحية','tags')+`<label>اختيار الملف<input name="file" type="file"></label>`),fd=>{const file=fd.get('file');state.documents.push({id:`DOC-${String(state.documents.length+1).padStart(4,'0')}`,name:fd.get('name'),category:fd.get('category'),clientId:fd.get('clientId'),caseId:fd.get('caseId'),tags:fd.get('tags'),date:today(),fileName:file?.name||''});logActivity(`أرشفة مستند: ${fd.get('name')}`);saveState();closeModal();renderView('archive');toast('تم تسجيل المستند في الأرشيف')}); }
function openRegistryModal(kind){const incoming=kind==='incoming';openModal(`إضافة ${t(kind)}`,t(kind),modalForm(field(incoming?'الجهة الواردة منها':'الجهة المرسل إليها',incoming?'from':'to','text','','required')+field('الموضوع','subject','text','','required')+selectField('القضية','caseId',[{value:'',label:'بدون قضية'},...state.cases.map(x=>({value:x.id,label:x.id}))])+field('التاريخ','date','date',today())+field('ملاحظات','notes','textarea')),fd=>{const list=state[kind];list.push({id:`${incoming?'IN':'OUT'}-2026-${String(list.length+1).padStart(3,'0')}`,date:fd.get('date'),[incoming?'from':'to']:fd.get(incoming?'from':'to'),subject:fd.get('subject'),caseId:fd.get('caseId'),notes:fd.get('notes'),status:incoming?'pending':'sent'});saveState();closeModal();renderView(kind);toast(`تم تسجيل ${t(kind)}`)});}
function openCorrespondenceModal(){ openModal('مراسلة داخلية','المراسلات',modalForm(field('من','from','text','المحامية')+field('إلى','to','text','','required')+field('الموضوع','subject','text','','required')+selectField('الأولوية','priority',[{value:'normal',label:'عادية'},{value:'high',label:'عالية'}])),fd=>{state.correspondence.push({id:uid('COR',state.correspondence),date:today(),from:fd.get('from'),to:fd.get('to'),subject:fd.get('subject'),priority:fd.get('priority'),status:'pending'});saveState();closeModal();renderView('correspondence');toast('تم إنشاء المراسلة')}); }
function openContractModal(){ openModal('عقد أتعاب','العقود',modalForm(selectField('العميل','clientId',state.clients.map(x=>({value:x.id,label:x.name})))+selectField('القضية','caseId',state.cases.map(x=>({value:x.id,label:x.id})))+selectField('نوع العقد','type',['أتعاب ثابتة','نسبة من المحكوم به','بالساعة','دفعات مرحلية'].map(x=>({value:x,label:x})))+field('قيمة العقد','value','number','0','min="0" step="0.001"')+field('المدفوع','paid','number','0','min="0" step="0.001"')),fd=>{const value=Number(fd.get('value'));const paid=Number(fd.get('paid'));state.contracts.push({id:uid('CTR',state.contracts),clientId:fd.get('clientId'),caseId:fd.get('caseId'),type:fd.get('type'),value,paid,start:today(),status:paid>=value?'paid':'active'});saveState();closeModal();renderView('contracts');toast('تم حفظ عقد الأتعاب')}); }
function openInvoiceModal(){ openModal('إضافة فاتورة','المالية',modalForm(selectField('العميل','clientId',state.clients.map(x=>({value:x.id,label:x.name})))+field('الوصف','description','text','','required')+field('المبلغ','amount','number','0','min="0" step="0.001"')+selectField('الحالة','status',[{value:'due',label:'مستحق'},{value:'paid',label:'مدفوع'}])+field('التاريخ','date','date',today())),fd=>{state.invoices.push({id:uid('INV',state.invoices),clientId:fd.get('clientId'),description:fd.get('description'),amount:Number(fd.get('amount')),status:fd.get('status'),date:fd.get('date')});saveState();closeModal();renderView('finance');toast('تمت إضافة الفاتورة')}); }
function openExpenseModal(){ openModal('إضافة مصروف','المالية',modalForm(field('التصنيف','category','text','','required')+field('الوصف','description','text')+field('المبلغ','amount','number','0','min="0" step="0.001"')+selectField('القضية','caseId',[{value:'',label:'بدون قضية'},...state.cases.map(x=>({value:x.id,label:x.id}))])+field('التاريخ','date','date',today())),fd=>{state.expenses.push({id:uid('EXP',state.expenses),category:fd.get('category'),description:fd.get('description'),amount:Number(fd.get('amount')),caseId:fd.get('caseId'),date:fd.get('date')});saveState();closeModal();renderView('finance');toast('تم تسجيل المصروف')}); }
function openUserModal(){ openModal('إضافة مستخدم','الإدارة',modalForm(field('الاسم','name','text','','required')+field('البريد الإلكتروني','email','email','','required')+selectField('الدور','role',['مدير النظام','محامٍ','باحث قانوني','سكرتارية','محاسب'].map(x=>({value:x,label:x})))),fd=>{state.users.push({id:uid('U',state.users),name:fd.get('name'),email:fd.get('email'),role:fd.get('role'),status:'active'});saveState();closeModal();renderView('users');toast('تمت إضافة المستخدم')}); }

function deleteItem(collection,id){ if(!confirm('تأكيد الحذف؟'))return;state[collection]=state[collection].filter(x=>x.id!==id);saveState();renderView(state.currentView);toast('تم الحذف'); }
function toggleRegistryStatus(collection,id){const x=state[collection].find(x=>x.id===id);if(!x)return;x.status=x.status==='pending'?'done':'pending';saveState();renderView(state.currentView);}
function openSessionResult(id){const s=state.sessions.find(x=>x.id===id);openModal('نتيجة الجلسة','الجلسات',modalForm(field('النتيجة والقرار','result','textarea',s.result)+selectField('الحالة','status',[{value:'upcoming',label:'قادمة'},{value:'done',label:'منجزة'},{value:'cancelled',label:'ملغاة'}],s.status)),fd=>{s.result=fd.get('result');s.status=fd.get('status');saveState();closeModal();renderView('sessions');toast('تم تحديث الجلسة')});}
function showCaseDetail(id){const c=state.cases.find(x=>x.id===id);if(!c)return;const docs=state.documents.filter(x=>x.caseId===id);const sessions=state.sessions.filter(x=>x.caseId===id);const tasks=state.tasks.filter(x=>x.caseId===id);openModal(c.id,'ملف القضية',`<div class="entity-meta"><div><span>عنوان الملف</span><b>${esc(c.title)}</b></div><div><span>${t('client')}</span><b>${esc(clientName(c.clientId))}</b></div><div><span>المحكمة</span><b>${esc(c.court)}</b></div><div><span>الخصم</span><b>${esc(c.opponent)}</b></div><div><span>المستندات</span><b>${docs.length}</b></div><div><span>الجلسات</span><b>${sessions.length}</b></div><div><span>المهام</span><b>${tasks.length}</b></div></div><div class="modal-actions"><button class="btn btn-secondary" data-close-modal>${t('cancel')}</button><button class="btn btn-primary" data-open-case-memo="${esc(id)}">إنشاء مذكرة</button></div>`);}
function showClientDetail(id){const c=state.clients.find(x=>x.id===id);if(!c)return;openModal(c.name,'بيانات العميل',`<div class="entity-meta"><div><span>${t('phone')}</span><b>${esc(c.phone)}</b></div><div><span>${t('email')}</span><b>${esc(c.email||'—')}</b></div><div><span>${t('address')}</span><b>${esc(c.address||'—')}</b></div><div><span>${t('cases')}</span><b>${state.cases.filter(x=>x.clientId===id).length}</b></div></div>`);}
function showDocumentDetail(id){const d=state.documents.find(x=>x.id===id);if(!d)return;openModal(d.name,'الأرشيف',`<div class="entity-meta"><div><span>رقم الأرشفة</span><b>${esc(d.id)}</b></div><div><span>التصنيف</span><b>${esc(d.category)}</b></div><div><span>${t('client')}</span><b>${esc(clientName(d.clientId))}</b></div><div><span>${t('case')}</span><b>${esc(d.caseId||'—')}</b></div><div><span>اسم الملف</span><b>${esc(d.fileName||'غير محفوظ')}</b></div></div>`);}
function openPermissions(id){const u=state.users.find(x=>x.id===id);const modules=['القضايا','العملاء','الجلسات','الأرشيف','الوارد والصادر','المذكرات','المالية','الإعدادات'];openModal(`صلاحيات ${u.name}`,'المستخدمون',`<form class="modal-form"><div class="permission-grid">${modules.map((x,i)=>`<label class="permission-item"><input type="checkbox" ${u.role==='مدير النظام'||i<5?'checked':''}>${x}</label>`).join('')}</div><div class="modal-actions"><button class="btn btn-secondary" type="button" data-close-modal>${t('cancel')}</button><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`,()=>{closeModal();toast('تم حفظ الصلاحيات تجريبيًا')});}

function bindMemo(){
  const form=document.getElementById('memoForm');const out=document.getElementById('memoOutput');
  form.addEventListener('submit',e=>{e.preventDefault();const caseId=document.getElementById('memoCase').value;const c=state.cases.find(x=>x.id===caseId);const type=document.getElementById('memoType').value;const court=document.getElementById('memoCourt').value||c?.court||'الجهة المختصة';const role=document.getElementById('memoRole').value||'مقدم المذكرة';const facts=document.getElementById('memoFacts').value;const defenses=document.getElementById('memoDefenses').value||'تُستكمل الدفوع والأسانيد بعد المراجعة القانونية المتخصصة.';const claims=document.getElementById('memoClaims').value;const text=`بسم الله الرحمن الرحيم\n\nأمام ${court}\n\n${type}\n${caseId?`في القضية رقم: ${caseId}\n`:''}\nمقدمة من: ${role}\n${c?`ضد: ${c.opponent||'الخصم المبين بالأوراق'}\n`:''}\nأولاً: الوقائع\n${facts}\n\nثانياً: الدفوع والأسانيد القانونية\n${defenses}\n\nثالثاً: الطلبات\n${claims}\n\nولذلك\nيلتمس مقدم هذه المذكرة من الجهة الموقرة القضاء بالطلبات المتقدمة، مع حفظ كافة الحقوق الأخرى.\n\nوتفضلوا بقبول فائق الاحترام.\n\nتنبيه: هذه مسودة أولية تنظيمية ولا تعتمد قبل مراجعتها واعتمادها من المحامية.`;out.textContent=text;state.memos.unshift({id:uid('MEM',state.memos),caseId,type,date:today(),text});logActivity(`توليد ${type}${caseId?` للقضية ${caseId}`:''}`);saveState();toast('تم توليد المسودة')});
  document.getElementById('copyMemo').addEventListener('click',async()=>{await navigator.clipboard.writeText(out.textContent);toast('تم نسخ المسودة')});
  document.getElementById('printMemo').addEventListener('click',()=>{const w=window.open('','_blank');w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>مذكرة قانونية</title><style>body{font-family:Cairo,Arial;padding:50px;line-height:2;white-space:pre-wrap}</style></head><body>${esc(out.textContent).replaceAll('\n','<br>')}</body></html>`);w.document.close();w.print()});
  document.getElementById('memoClear').addEventListener('click',()=>{form.reset();out.textContent='أدخل البيانات ثم اضغط «توليد المسودة».'});
}

function assistantResponse(tool,caseId,input=''){
  const c=state.cases.find(x=>x.id===caseId);if(!c)return 'يرجى اختيار قضية أولاً حتى أتمكن من قراءة بياناتها المسجلة داخل النظام.';
  const sessions=state.sessions.filter(x=>x.caseId===caseId);const docs=state.documents.filter(x=>x.caseId===caseId);const tasks=state.tasks.filter(x=>x.caseId===caseId);
  if(tool==='summary'||/لخص|summary/i.test(input))return `ملخص القضية ${c.id}:\nالعنوان: ${c.title}\nالموكل: ${clientName(c.clientId)}\nالنوع: ${c.type}\nالمحكمة: ${c.court}\nالخصم: ${c.opponent}\nالحالة: ${statusLabel(c.status)}\nالإجراء القادم: ${c.nextAction}\nالمستندات: ${docs.length}، الجلسات: ${sessions.length}، المهام المفتوحة: ${tasks.filter(x=>!x.done).length}.`;
  if(tool==='missing'||/ناقص|missing/i.test(input)){const missing=[];if(!c.court)missing.push('المحكمة');if(!c.opponent)missing.push('بيانات الخصم');if(!docs.length)missing.push('المستندات');if(!sessions.length)missing.push('الجلسة القادمة');return missing.length?`البيانات المطلوب استكمالها: ${missing.join('، ')}.`:'البيانات الأساسية المسجلة مكتملة، مع ضرورة المراجعة المهنية للمستندات والطلبات.';}
  if(tool==='timeline'||/زمني|timeline/i.test(input))return [`فتح الملف: ${c.opened}`, ...sessions.map(s=>`جلسة ${s.date}: ${s.purpose}${s.result?` — ${s.result}`:''}`), ...tasks.map(x=>`مهمة ${x.due}: ${x.title}`)].join('\n');
  if(tool==='client-update'||/عميل|تحديث/i.test(input))return `السيد/السيدة ${clientName(c.clientId)}،\nنحيطكم علمًا بأن ملف القضية رقم ${c.id} ما زال بحالة «${statusLabel(c.status)}»، والإجراء القادم هو: ${c.nextAction}. وسنوافيكم بأي مستجدات فور ورودها.\nمع التحية، مكتب المحامية حصة العبيد.`;
  return `تمت قراءة بيانات القضية ${c.id}. الطلب المسجل: ${input}\nهذه إجابة إدارية تجريبية. الربط بنموذج ذكاء اصطناعي قانوني سيتيح تحليلًا أعمق للمستندات والتشريعات.`;
}
function bindAssistant(){
  const stream=document.getElementById('chatStream');const caseSelect=document.getElementById('assistantCase');
  const add=(text,role)=>{stream.insertAdjacentHTML('beforeend',`<div class="chat-bubble ${role}">${esc(text)}</div>`);stream.scrollTop=stream.scrollHeight};
  document.querySelectorAll('[data-ai-tool]').forEach(b=>b.addEventListener('click',()=>add(assistantResponse(b.dataset.aiTool,caseSelect.value),'assistant')));
  document.getElementById('assistantForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('assistantInput');add(input.value,'user');setTimeout(()=>add(assistantResponse('',caseSelect.value,input.value),'assistant'),250);input.value=''});
}

function waTemplate(type,client,caseId){const c=state.cases.find(x=>x.id===caseId);const name=client?.name||'العميل الكريم';const map={update:`${name}، نحيطكم علمًا بأنه جارٍ متابعة ملفكم${c?` رقم ${c.id}`:''}، وسنوافيكم بأي مستجدات فور ورودها.`,session:`${name}، نذكركم بموعد الجلسة القادمة${c?` في القضية ${c.id}`:''}. يرجى التواصل معنا عند الحاجة إلى أي توضيح.`,documents:`${name}، يرجى تزويد المكتب بالمستندات المطلوبة لاستكمال دراسة الملف ومتابعة الإجراءات.`,payment:`${name}، نذكركم بالدفعة المستحقة وفق اتفاق الأتعاب. يرجى التواصل مع المكتب لترتيب السداد.`,custom:''};return map[type]||'';}
function updateWaPreview(){const client=state.clients.find(x=>x.id===document.getElementById('waClient')?.value);const template=document.getElementById('waTemplate')?.value;const caseId=document.getElementById('waCase')?.value;const msg=document.getElementById('waMessage');if(msg&&!msg.dataset.custom)msg.value=waTemplate(template,client,caseId);document.getElementById('waPreview').textContent=msg?.value||'';document.getElementById('waPreviewClient').textContent=client?.name||'—';document.getElementById('waPreviewPhone').textContent=client?.phone||'—';}
function bindWhatsApp(){['waClient','waCase','waTemplate'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{document.getElementById('waMessage').dataset.custom='';updateWaPreview()}));document.getElementById('waMessage').addEventListener('input',e=>{e.target.dataset.custom='1';document.getElementById('waPreview').textContent=e.target.value});updateWaPreview();document.getElementById('whatsappForm').addEventListener('submit',e=>{e.preventDefault();const c=state.clients.find(x=>x.id===document.getElementById('waClient').value);const message=document.getElementById('waMessage').value;window.open(`https://wa.me/${String(c.phone).replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank');logActivity(`فتح رسالة واتساب للعميل ${c.name}`);saveState()});}

function bindSettings(){
  document.getElementById('settingsForm').addEventListener('submit',e=>{e.preventDefault();state.settings=Object.fromEntries(new FormData(e.currentTarget));saveState();toast('تم حفظ الإعدادات')});
  document.getElementById('exportData').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hessa-law-lms-${today()}.json`;a.click();URL.revokeObjectURL(a.href)});
  document.getElementById('importData').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{state={...clone(seedState),...JSON.parse(reader.result)};saveState();renderView('settings');toast('تم استيراد البيانات')}catch{toast('ملف غير صالح')}};reader.readAsText(file)});
  document.getElementById('resetData').addEventListener('click',()=>{if(confirm('سيتم حذف البيانات المحلية وإعادة النسخة التجريبية. متابعة؟')){state=clone(seedState);saveState();applyLanguage();applyTheme();switchView('dashboard')}});
}

function logActivity(text){state.activities.unshift({date:new Date().toLocaleString('sv-SE').replace('T',' ').slice(0,16),text});state.activities=state.activities.slice(0,30)}
function updateStats(){const n=state.tasks.filter(x=>!x.done).length+state.incoming.filter(x=>x.status==='pending').length;document.getElementById('notificationCount').textContent=n;}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400)}
function openSidebar(){sidebar.classList.add('open');sidebarOverlay.hidden=false;document.body.style.overflow='hidden'}
function closeSidebar(){sidebar.classList.remove('open');sidebarOverlay.hidden=true;document.body.style.overflow=''}

function init(){
  applyTheme();applyLanguage();
  const logged=localStorage.getItem(SESSION_KEY)==='1';loginScreen.classList.toggle('hidden',logged);appShell.classList.toggle('hidden',!logged);
  if(logged){updateHeader(state.currentView);renderView(state.currentView)}
  document.getElementById('loginForm').addEventListener('submit',e=>{e.preventDefault();const user=document.getElementById('loginUser').value;const pass=document.getElementById('loginPassword').value;if(user==='admin'&&pass==='admin123'){localStorage.setItem(SESSION_KEY,'1');document.getElementById('sidebarUsername').textContent=user;loginScreen.classList.add('hidden');appShell.classList.remove('hidden');updateHeader(state.currentView);renderView(state.currentView)}else toast('بيانات الدخول غير صحيحة')});
  document.getElementById('logoutBtn').addEventListener('click',()=>{localStorage.removeItem(SESSION_KEY);location.reload()});
  document.getElementById('sidebarNav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view)});
  document.getElementById('openSidebar').addEventListener('click',openSidebar);document.getElementById('closeSidebar').addEventListener('click',closeSidebar);sidebarOverlay.addEventListener('click',closeSidebar);
  document.getElementById('langToggle').addEventListener('click',()=>{state.language=state.language==='ar'?'en':'ar';saveState();applyLanguage();updateHeader(state.currentView);renderView(state.currentView)});
  document.getElementById('themeToggle').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';saveState();applyTheme()});
  document.getElementById('closeModal').addEventListener('click',closeModal);modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)closeModal()});modalBody.addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))closeModal();const memo=e.target.closest('[data-open-case-memo]');if(memo){closeModal();switchView('memo');setTimeout(()=>document.getElementById('memoCase').value=memo.dataset.openCaseMemo,0)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeSidebar()}});
  document.getElementById('globalSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#appContent .searchable-row').forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?'':'none')});
  document.getElementById('notificationsBtn').addEventListener('click',()=>toast(`لديك ${document.getElementById('notificationCount').textContent} عناصر تحتاج متابعة`));
}

init();
