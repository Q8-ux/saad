(() => {
  'use strict';

  if (typeof switchView !== 'function' || typeof state === 'undefined') return;

  const coreSwitchView = switchView;
  const coreRenderView = typeof renderView === 'function' ? renderView : null;
  let activeView = 'dashboard';
  let renderingHome = false;

  const icons = {
    home:'<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10.3V20h13v-9.7"/><path d="M9.5 20v-5.5h5V20"/>',
    clients:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.3-6 5.5-6s5 2 5.5 6"/><path d="M16 8.5a2.5 2.5 0 1 1 0 5"/><path d="M17 14c2.2.6 3.3 2.1 3.5 5"/>',
    cases:'<path d="M4 7.5h16V20H4z"/><path d="M8 7.5V5h8v2.5"/><path d="M4 12h16"/><path d="M10 12v2h4v-2"/>',
    sessions:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9.5h17"/><path d="M8 13h3M13 13h3M8 16h3"/>',
    tasks:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12 5 13.5l2.5-2.5M3.5 18 5 19.5l2.5-2.5"/>',
    archive:'<path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6"/>',
    correspondence:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    memo:'<path d="M5 3.5h10l4 4V20H5z"/><path d="M15 3.5V8h4M8 12h8M8 15h8M8 18h5"/>',
    assistant:'<path d="M12 3v3M5.6 5.6l2.1 2.1M18.4 5.6l-2.1 2.1"/><rect x="4" y="9" width="16" height="11" rx="4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M9 17h6"/>',
    contracts:'<path d="M5 3.5h11l3 3V20H5z"/><path d="M16 3.5V7h3M8 11h8M8 14h8M8 17h5"/><path d="M3 8v10"/>',
    finance:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.8 0-3 .8-3 2 0 3.2 6 1.5 6 4.7 0 1.2-1.2 2.1-3 2.1-1.2 0-2.4-.4-3.3-1.2M12 5.5v13"/>',
    reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M3.5 9.5h17"/>',
    time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    templates:'<path d="M6 3.5h9l3 3V20H6z"/><path d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4"/>',
    workflow:'<path d="M6 4h12v5H6zM6 15h12v5H6z"/><path d="M12 9v6M9.5 12.5 12 15l2.5-2.5"/>',
    portal:'<circle cx="12" cy="8" r="3"/><path d="M5 20c.5-5 2.8-7 7-7s6.5 2 7 7"/><path d="M18 4h3v3"/>',
    knowledge:'<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
    audit:'<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4.5 2.3-7 5.5-7s5 2.5 5.5 7"/><path d="M16 5h5M18.5 2.5v5"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>'
  };

  const toolViews = new Set(['calendar','time','templates','workflow','portal','knowledge','audit']);

  const groups = [
    {
      titleAr:'الرئيسية', titleEn:'Home',
      items:[{view:'dashboard',icon:'home',ar:'لوحة التحكم',en:'Dashboard'}]
    },
    {
      titleAr:'إدارة القضايا', titleEn:'Case Management',
      items:[
        {view:'clients',icon:'clients',ar:'العملاء والموكلون',en:'Clients'},
        {view:'cases',icon:'cases',ar:'القضايا والملفات',en:'Cases & Files'},
        {view:'sessions',icon:'sessions',ar:'الجلسات والمواعيد',en:'Hearings & Appointments'},
        {view:'tasks',icon:'tasks',ar:'المهام والتنبيهات',en:'Tasks & Alerts'},
        {view:'calendar',icon:'calendar',ar:'تقويم المكتب',en:'Office Calendar'}
      ]
    },
    {
      titleAr:'المستندات والمراسلات', titleEn:'Documents & Correspondence',
      items:[
        {view:'archive',icon:'archive',ar:'الأرشيف الإلكتروني',en:'Electronic Archive'},
        {view:'templates',icon:'templates',ar:'قوالب المستندات',en:'Document Templates'},
        {view:'incoming',icon:'correspondence',ar:'الوارد',en:'Incoming'},
        {view:'outgoing',icon:'correspondence',ar:'الصادر',en:'Outgoing'},
        {view:'correspondence',icon:'correspondence',ar:'المراسلات الداخلية',en:'Internal Correspondence'},
        {view:'whatsapp',icon:'clients',ar:'مراسلات العملاء',en:'Client Messaging'}
      ]
    },
    {
      titleAr:'العمل القانوني الذكي', titleEn:'Smart Legal Work',
      items:[
        {view:'memo',icon:'memo',ar:'مولد المذكرات',en:'Memo Generator'},
        {view:'assistant',icon:'assistant',ar:'المساعد القانوني',en:'Legal Assistant'},
        {view:'knowledge',icon:'knowledge',ar:'قاعدة المعرفة',en:'Knowledge Base'}
      ]
    },
    {
      titleAr:'إدارة المكتب', titleEn:'Office Administration',
      items:[
        {view:'contracts',icon:'contracts',ar:'العقود والأتعاب',en:'Contracts & Fees'},
        {view:'finance',icon:'finance',ar:'الفواتير والمصروفات',en:'Finance'},
        {view:'time',icon:'time',ar:'سجل الوقت',en:'Time Tracking'},
        {view:'workflow',icon:'workflow',ar:'سير العمل والموافقات',en:'Workflows & Approvals'},
        {view:'portal',icon:'portal',ar:'بوابة العملاء',en:'Client Portal'},
        {view:'reports',icon:'reports',ar:'التقارير والتحليلات',en:'Reports & Analytics'}
      ]
    },
    {
      titleAr:'إدارة النظام', titleEn:'System Administration',
      items:[
        {view:'users',icon:'users',ar:'المستخدمون والصلاحيات',en:'Users & Permissions'},
        {view:'audit',icon:'audit',ar:'سجل التدقيق',en:'Audit Log'},
        {view:'settings',icon:'settings',ar:'الإعدادات',en:'Settings'}
      ]
    }
  ];

  const modules = groups.flatMap(group => group.items).filter(item => item.view !== 'dashboard');

  const isArabic = () => document.documentElement.lang !== 'en';
  const label = item => isArabic() ? item.ar : item.en;
  const groupLabel = group => isArabic() ? group.titleAr : group.titleEn;
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.home}</svg>`;
  const escText = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function rebuildSidebar() {
    const oldNav = document.getElementById('sidebarNav');
    if (!oldNav) return;
    oldNav.className = 'sabeq-nav';
    oldNav.innerHTML = groups.map(group => `
      <section class="sabeq-nav-group">
        <p class="sabeq-nav-label">${escText(groupLabel(group))}</p>
        ${group.items.map(item => `
          <button class="sabeq-nav-item ${item.view === activeView ? 'active' : ''}" type="button" data-sabeq-view="${item.view}">
            <span class="sabeq-nav-icon">${svg(item.icon)}</span>
            <b>${escText(label(item))}</b>
          </button>`).join('')}
      </section>`).join('');
  }

  function mobileNav() {
    let nav = document.querySelector('.sabeq-mobile-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'sabeq-mobile-nav';
      document.body.appendChild(nav);
    }
    const items = [
      {view:'dashboard',icon:'home',ar:'الرئيسية',en:'Home'},
      {view:'cases',icon:'cases',ar:'القضايا',en:'Cases'},
      {view:'memo',icon:'memo',ar:'المذكرات',en:'Memos'},
      {view:'assistant',icon:'assistant',ar:'المساعد',en:'Assistant'},
      {view:'menu',icon:'settings',ar:'القائمة',en:'Menu'}
    ];
    nav.innerHTML = items.map(item => `<button type="button" class="${activeView===item.view?'active':''}" data-sabeq-mobile="${item.view}">${svg(item.icon)}<span>${escText(isArabic()?item.ar:item.en)}</span></button>`).join('');
  }

  function setActive(view) {
    activeView = view;
    document.querySelectorAll('[data-sabeq-view]').forEach(button => button.classList.toggle('active',button.dataset.sabeqView===view));
    document.querySelectorAll('[data-sabeq-mobile]').forEach(button => button.classList.toggle('active',button.dataset.sabeqMobile===view));
  }

  function counts() {
    return {
      cases:(state.cases||[]).filter(item=>item.status!=='closed').length,
      clients:(state.clients||[]).length,
      sessions:(state.sessions||[]).filter(item=>item.status==='upcoming').length,
      tasks:(state.tasks||[]).filter(item=>!item.done).length,
      documents:(state.documents||[]).length,
      incoming:(state.incoming||[]).filter(item=>item.status==='pending').length
    };
  }

  function statCard(icon,title,value) {
    return `<article class="sabeq-kpi"><div class="sabeq-kpi-top"><span>${escText(title)}</span><i class="sabeq-kpi-icon">${svg(icon)}</i></div><strong>${escText(value)}</strong></article>`;
  }

  function renderHome() {
    if (renderingHome) return;
    const content = document.getElementById('appContent');
    if (!content) return;
    renderingHome = true;
    const c = counts();
    const upcoming = [...(state.sessions||[])].filter(item=>item.status==='upcoming').sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,4);
    const tasks = (state.tasks||[]).filter(item=>!item.done).slice(0,4);
    const agenda = [
      ...upcoming.map(item=>({date:item.date,time:item.time,title:item.purpose,detail:item.caseId,status:isArabic()?'جلسة':'Hearing'})),
      ...tasks.map(item=>({date:item.due,time:'',title:item.title,detail:item.caseId,status:isArabic()?'مهمة':'Task'}))
    ].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,6);

    content.innerHTML = `<div class="sabeq-home">
      <section class="sabeq-home-head">
        <div>
          <span class="sabeq-home-kicker">${isArabic()?'النظام الداخلي لإدارة المكتب':'INTERNAL OFFICE SYSTEM'}</span>
          <h1>${isArabic()?'مرحبًا بك في مكتب المحامية حصة العبيد':'Welcome to Hessa Al-Obaid Law Office'}</h1>
          <p>${isArabic()?'إدارة القضايا والعملاء والمستندات والمراسلات والأعمال القانونية الذكية من واجهة واحدة.':'Manage cases, clients, documents, correspondence, and smart legal work from one workspace.'}</p>
        </div>
        <div class="sabeq-home-actions">
          <button class="btn btn-primary" type="button" data-sabeq-view="cases">＋ ${isArabic()?'قضية جديدة':'New case'}</button>
          <button class="btn btn-secondary" type="button" data-sabeq-view="memo">${svg('memo')} ${isArabic()?'إنشاء مذكرة':'Create memo'}</button>
        </div>
      </section>

      <section class="sabeq-kpis">
        ${statCard('cases',isArabic()?'القضايا النشطة':'Active cases',c.cases)}
        ${statCard('clients',isArabic()?'العملاء':'Clients',c.clients)}
        ${statCard('sessions',isArabic()?'الجلسات القادمة':'Upcoming hearings',c.sessions)}
        ${statCard('tasks',isArabic()?'المهام المفتوحة':'Open tasks',c.tasks)}
        ${statCard('archive',isArabic()?'المستندات':'Documents',c.documents)}
        ${statCard('correspondence',isArabic()?'الوارد المعلّق':'Pending incoming',c.incoming)}
      </section>

      <section class="sabeq-section">
        <div class="sabeq-section-head"><div><h2>${isArabic()?'وحدات النظام':'System Modules'}</h2><p>${isArabic()?'كل أدوات المكتب منظمة حسب العمل القانوني والإداري':'All office tools organized by legal and administrative work'}</p></div></div>
        <div class="sabeq-modules-grid">
          ${modules.map(item=>`<button class="sabeq-module" type="button" data-sabeq-view="${item.view}"><span class="sabeq-module-icon">${svg(item.icon)}</span><span><strong>${escText(label(item))}</strong><small>${moduleDescription(item.view)}</small></span><span class="sabeq-module-arrow">↗</span></button>`).join('')}
        </div>
      </section>

      <section class="sabeq-dashboard-grid">
        <article class="sabeq-section">
          <div class="sabeq-section-head"><div><h2>${isArabic()?'أعمال اليوم والقادم':'Today & Upcoming'}</h2><p>${isArabic()?'الجلسات والمواعيد والمهام ذات الأولوية':'Hearings, appointments, and priority tasks'}</p></div><button class="text-btn" type="button" data-sabeq-view="calendar">${isArabic()?'فتح التقويم':'Open calendar'}</button></div>
          <div class="sabeq-list">${agenda.length?agenda.map(item=>`<div class="sabeq-list-item"><div class="sabeq-list-date">${escText(item.date||'—')}<br>${escText(item.time||'')}</div><div><h3>${escText(item.title||'')}</h3><p>${escText(item.detail||'')}</p></div><span class="sabeq-list-status">${escText(item.status)}</span></div>`).join(''):`<div class="empty-state">${isArabic()?'لا توجد أعمال قادمة':'No upcoming work'}</div>`}</div>
        </article>

        <article class="sabeq-section sabeq-ai-card">
          <div class="sabeq-section-head"><div><h2>${isArabic()?'المساعد القانوني الذكي':'Smart Legal Assistant'}</h2><p>${isArabic()?'تحليل الملفات وصياغة المسودات وتلخيص القضايا':'Analyze files, draft documents, and summarize cases'}</p></div></div>
          <div class="sabeq-ai-body"><div class="sabeq-ai-prompt">${isArabic()?'اختر القضية ثم اطلب من المساعد تلخيصها أو تحديد المستندات الناقصة أو إعداد نقاط المذكرة. يمكنك استخدام الكتابة أو الميكروفون.':'Select a case, then ask for a summary, missing documents, or memo points. Text and microphone are supported.'}</div><div class="sabeq-ai-actions"><button type="button" data-sabeq-view="assistant">${isArabic()?'فتح المساعد':'Open assistant'}</button><button type="button" data-sabeq-view="memo">${isArabic()?'مولد المذكرات':'Memo generator'}</button></div></div>
        </article>
      </section>
    </div>`;

    const pageTitle = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('breadcrumb');
    if (pageTitle) pageTitle.textContent = isArabic()?'الرئيسية':'Home';
    if (breadcrumb) breadcrumb.textContent = isArabic()?'لوحة التحكم':'Dashboard';
    state.currentView = 'dashboard';
    try{localStorage.setItem('hessaLawLmsV3',JSON.stringify(state));}catch{}
    setActive('dashboard');
    mobileNav();
    renderingHome = false;
  }

  function moduleDescription(view) {
    const ar = {
      clients:'بيانات الموكلين ووسائل التواصل',cases:'ملفات القضايا والخصوم والمحاكم',sessions:'الجلسات والقرارات والمواعيد',tasks:'التكليفات والتنبيهات والمتابعة',calendar:'تقويم موحد لكل أعمال المكتب',archive:'حفظ وتصنيف وربط المستندات',templates:'نماذج قانونية وإدارية جاهزة',incoming:'تسجيل الكتب والإعلانات الواردة',outgoing:'تسجيل الكتب والمخاطبات الصادرة',correspondence:'الإحالات والتعليمات الداخلية',whatsapp:'التواصل وتحديثات العملاء',memo:'إنشاء مسودات المذكرات القانونية',assistant:'تحليل القضايا والمساعدة القانونية',knowledge:'إجراءات ومعرفة المكتب الداخلية',contracts:'عقود الأتعاب والدفعات',finance:'الفواتير والتحصيل والمصروفات',time:'تسجيل ساعات العمل والفوترة',workflow:'الإحالات والاعتمادات والموافقات',portal:'متابعة الموكل لآخر المستجدات',reports:'مؤشرات الأداء والتقارير',users:'المستخدمون والأدوار والصلاحيات',audit:'تتبع العمليات والتعديلات',settings:'هوية المكتب وإعدادات النظام'
    };
    const en = {
      clients:'Client records and contact details',cases:'Cases, parties, and courts',sessions:'Hearings, decisions, and appointments',tasks:'Assignments, alerts, and follow-up',calendar:'Unified office calendar',archive:'Store and classify documents',templates:'Reusable legal and admin templates',incoming:'Register incoming correspondence',outgoing:'Register outgoing correspondence',correspondence:'Internal instructions and referrals',whatsapp:'Client communication and updates',memo:'Generate structured legal drafts',assistant:'Case analysis and legal assistance',knowledge:'Internal procedures and knowledge',contracts:'Fee agreements and payments',finance:'Invoices, collections, and expenses',time:'Work-hour and billing records',workflow:'Assignments and approvals',portal:'Client case progress portal',reports:'Performance indicators and reports',users:'Users, roles, and permissions',audit:'Track operations and changes',settings:'Office identity and system settings'
    };
    return escText((isArabic()?ar:en)[view]||'');
  }

  function openView(view) {
    if (view === 'menu') {
      const button = document.getElementById('openSidebar');
      button?.click();
      return;
    }
    setActive(view);
    if (view === 'dashboard') {
      renderHome();
      closeSidebarSafe();
      return;
    }
    if (toolViews.has(view)) {
      if (window.HessaOfficeTools?.open) window.HessaOfficeTools.open(view);
      closeSidebarSafe();
      return;
    }
    coreSwitchView(view);
    window.setTimeout(()=>setActive(view),20);
  }

  function closeSidebarSafe() {
    document.getElementById('sidebar')?.classList.remove('open','is-open');
    const overlay=document.getElementById('sidebarOverlay');
    if(overlay)overlay.hidden=true;
    document.body.classList.remove('menu-open');
    document.body.style.overflow='';
  }

  switchView = function sabeqSwitchView(view) {
    openView(view);
  };
  window.switchView = switchView;
  window.HessaInternal = { open: openView, home: renderHome };

  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-sabeq-view]');
    if(trigger){event.preventDefault();event.stopImmediatePropagation();openView(trigger.dataset.sabeqView);return;}
    const mobile=event.target.closest('[data-sabeq-mobile]');
    if(mobile){event.preventDefault();event.stopImmediatePropagation();openView(mobile.dataset.sabeqMobile);}
  },true);

  const appContent=document.getElementById('appContent');
  if(appContent){
    const observer=new MutationObserver(()=>{
      if(state.currentView==='dashboard'&&!appContent.querySelector('.sabeq-home')&&!renderingHome){window.setTimeout(renderHome,0);}
    });
    observer.observe(appContent,{childList:true,subtree:false});
  }

  document.getElementById('langToggle')?.addEventListener('click',()=>window.setTimeout(()=>{rebuildSidebar();mobileNav();if(activeView==='dashboard')renderHome();},40));

  rebuildSidebar();
  mobileNav();
  window.setTimeout(()=>{
    if(!document.getElementById('appShell')?.classList.contains('hidden')&&(state.currentView==='dashboard'||!state.currentView))renderHome();
  },120);
})();
