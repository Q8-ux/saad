(() => {
  'use strict';

  if (typeof state === 'undefined' || typeof renderView !== 'function' || typeof bindViewEvents !== 'function') return;

  const L = (ar, en) => state.language === 'ar' ? ar : en;
  const safe = (value = '') => typeof esc === 'function' ? esc(value) : String(value);
  const nowIso = () => new Date().toISOString();
  const todayIso = () => typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const nextId = (prefix, list) => `${prefix}-${String((list?.length || 0) + 1).padStart(3, '0')}`;

  function ensureToolState() {
    state.timeEntries ||= [
      { id: 'TIME-001', date: '2026-08-05', caseId: '2026/145 تجاري', person: 'حصة العبيد', hours: 1.5, description: 'مراجعة مستندات وعقد التوريد', billable: true },
      { id: 'TIME-002', date: '2026-08-05', caseId: '2026/88 مدني', person: 'الباحث القانوني', hours: 2, description: 'بحث في السوابق والمبادئ القضائية', billable: false }
    ];
    state.activeTimer ||= null;
    state.workflowRequests ||= [
      { id: 'WF-001', title: 'اعتماد مذكرة الرد', type: 'اعتماد مستند', caseId: '2026/145 تجاري', requester: 'الباحث القانوني', reviewer: 'حصة العبيد', status: 'pending', date: '2026-08-05', notes: 'المسودة جاهزة للمراجعة النهائية' },
      { id: 'WF-002', title: 'اعتماد مصروف إعلان', type: 'اعتماد مالي', caseId: '2026/88 مدني', requester: 'السكرتارية', reviewer: 'حصة العبيد', status: 'approved', date: '2026-08-04', notes: 'تم الاعتماد' }
    ];
    state.customTemplates ||= [];
    state.portalAccess ||= [];
    state.officeEvents ||= [
      { id: 'EVT-001', date: '2026-08-10', time: '11:00', title: 'اجتماع تحضير القضية التجارية', type: 'meeting', caseId: '2026/145 تجاري' }
    ];
    state.knowledgeItems ||= [
      { id: 'KB-001', title: 'قائمة مراجعة قبل إيداع المذكرة', category: 'إجراءات', body: 'مراجعة رقم القضية، صفات الخصوم، الوقائع، الدفوع، المستندات، الطلبات، والتوقيع قبل الإيداع.', author: 'حصة العبيد', date: '2026-08-01' },
      { id: 'KB-002', title: 'ضوابط التواصل مع الموكل', category: 'خدمة العملاء', body: 'توثيق كل تحديث، عدم مشاركة معلومات الملف عبر قنوات غير معتمدة، وتحديد الإجراء القادم بوضوح.', author: 'إدارة المكتب', date: '2026-08-02' }
    ];
    state.calendarCursor ||= todayIso().slice(0, 7);
    syncPortalClients();
  }

  function syncPortalClients() {
    state.clients.forEach(client => {
      if (!state.portalAccess.some(item => item.clientId === client.id)) {
        state.portalAccess.push({
          id: nextId('PORTAL', state.portalAccess),
          clientId: client.id,
          code: `HA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          active: false,
          lastUpdate: '',
          updates: []
        });
      }
    });
  }

  ensureToolState();
  if (typeof saveState === 'function') saveState();

  const tools = {
    officeCalendar: { icon: '▦', ar: 'التقويم الموحد', en: 'Unified Calendar', arDesc: 'الجلسات والمهام والاجتماعات في تقويم واحد', enDesc: 'Hearings, tasks, and meetings in one calendar' },
    timeTracking: { icon: '◷', ar: 'سجل الوقت', en: 'Time Tracking', arDesc: 'احتساب ساعات العمل وربطها بالقضايا', enDesc: 'Track work hours and link them to cases' },
    documentTemplates: { icon: '▤', ar: 'قوالب المستندات', en: 'Document Templates', arDesc: 'قوالب قانونية وإدارية جاهزة للتخصيص', enDesc: 'Reusable legal and administrative templates' },
    workflowApprovals: { icon: '✓', ar: 'سير العمل والموافقات', en: 'Workflows & Approvals', arDesc: 'إحالة الأعمال واعتماد المستندات والمصروفات', enDesc: 'Route work and approve documents or expenses' },
    clientPortal: { icon: '◎', ar: 'بوابة العملاء', en: 'Client Portal', arDesc: 'أكواد دخول وتحديثات آمنة للموكلين', enDesc: 'Access codes and secure client updates' },
    knowledgeBase: { icon: '◇', ar: 'قاعدة المعرفة', en: 'Knowledge Base', arDesc: 'إجراءات المكتب والملاحظات القانونية الداخلية', enDesc: 'Internal procedures and legal knowledge' },
    auditLog: { icon: '⌁', ar: 'سجل التدقيق', en: 'Audit Log', arDesc: 'تتبع العمليات والتغييرات داخل النظام', enDesc: 'Track system operations and changes' }
  };

  Object.keys(tools).forEach(view => { viewMeta[view] = ['dashboard', 'dashboard']; });

  function toolTitle(view) {
    const item = tools[view];
    return item ? L(item.ar, item.en) : view;
  }

  function toolDescription(view) {
    const item = tools[view];
    return item ? L(item.arDesc, item.enDesc) : '';
  }

  function injectSidebarTools() {
    const nav = document.getElementById('sidebarNav');
    if (!nav || nav.querySelector('[data-office-tools-section]')) return;
    const adminLabel = nav.querySelector('[data-i18n="administration"]');
    const wrapper = document.createElement('div');
    wrapper.dataset.officeToolsSection = '1';
    wrapper.innerHTML = `
      <p class="nav-label" data-office-tools-label>${L('أدوات إدارة المكتب', 'Office Management Tools')}</p>
      ${Object.entries(tools).map(([view, item]) => `
        <button class="nav-item" data-view="${view}">
          <span>${item.icon}</span><b data-office-tool-name="${view}">${L(item.ar, item.en)}</b>
        </button>`).join('')}
    `;
    if (adminLabel) nav.insertBefore(wrapper, adminLabel);
    else nav.appendChild(wrapper);
  }

  function updateToolLanguage() {
    document.querySelector('[data-office-tools-label]')?.replaceChildren(document.createTextNode(L('أدوات إدارة المكتب', 'Office Management Tools')));
    document.querySelectorAll('[data-office-tool-name]').forEach(node => {
      const item = tools[node.dataset.officeToolName];
      if (item) node.textContent = L(item.ar, item.en);
    });
  }

  const originalApplyLanguage = applyLanguage;
  applyLanguage = function applyLanguageWithTools() {
    originalApplyLanguage();
    updateToolLanguage();
  };

  const originalUpdateHeader = updateHeader;
  updateHeader = function updateHeaderWithTools(view) {
    originalUpdateHeader(view);
    if (tools[view]) {
      document.getElementById('breadcrumb').textContent = L('أدوات إدارة المكتب', 'Office Management Tools');
      document.getElementById('pageTitle').textContent = toolTitle(view);
    }
  };

  function pageHeader(view, actions = '') {
    return `<header class="page-head"><div><p class="eyebrow">${L('أدوات إدارة المكتب', 'OFFICE MANAGEMENT TOOLS')}</p><h1>${safe(toolTitle(view))}</h1><p>${safe(toolDescription(view))}</p></div><div class="page-actions">${actions}</div></header>`;
  }

  function hubMarkup() {
    return `<article class="dashboard-panel office-tools-hub"><div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">⚙</span><div><h3>${L('أدوات إدارة المكتب', 'Office Management Tools')}</h3><small>${L('وصول سريع للأدوات التشغيلية والإدارية', 'Quick access to operational and administrative tools')}</small></div></div></div><div class="office-tools-grid">${Object.entries(tools).map(([view, item]) => `<button class="office-tool-card" type="button" data-office-view="${view}"><span class="office-tool-card-icon">${item.icon}</span><span><strong>${L(item.ar, item.en)}</strong><small>${L(item.arDesc, item.enDesc)}</small></span><span class="office-tool-arrow">↗</span></button>`).join('')}</div></article>`;
  }

  function appendDashboardHub() {
    if (document.querySelector('.office-tools-hub')) return;
    const dashboard = document.querySelector('.executive-dashboard') || appContent;
    dashboard.insertAdjacentHTML('beforeend', hubMarkup());
    dashboard.querySelectorAll('[data-office-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.officeView)));
  }

  function renderCalendar() {
    const [year, month] = state.calendarCursor.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(year, month - 1, 1 - first.getDay());
    const monthLabel = new Intl.DateTimeFormat(state.language === 'ar' ? 'ar-KW' : 'en-US', { month: 'long', year: 'numeric' }).format(first);
    const weekdays = state.language === 'ar' ? ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const allEvents = [
      ...state.sessions.map(item => ({ id: item.id, date: item.date, time: item.time, title: item.purpose, type: 'hearing', caseId: item.caseId })),
      ...state.tasks.filter(item => !item.done).map(item => ({ id: item.id, date: item.due, time: '', title: item.title, type: 'task', caseId: item.caseId })),
      ...state.officeEvents
    ].filter(item => item.date);
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      const events = allEvents.filter(item => item.date === iso).slice(0, 3);
      return `<div class="calendar-day ${date.getMonth() !== month - 1 ? 'outside' : ''} ${iso === todayIso() ? 'today' : ''}"><span class="calendar-day-number">${date.getDate()}</span>${events.map(event => `<button class="calendar-event ${event.type}" type="button" title="${safe(event.title)}">${safe(event.time ? `${event.time} ` : '')}${safe(event.title)}</button>`).join('')}</div>`;
    }).join('');
    const agenda = allEvents.filter(item => item.date >= todayIso()).sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 8);
    return `<div class="tool-page">${pageHeader('officeCalendar', `<button class="btn btn-primary" data-tool-action="add-event">＋ ${L('إضافة موعد', 'Add event')}</button>`)}<div class="calendar-shell"><section class="calendar-panel"><div class="calendar-toolbar"><div class="calendar-nav"><button class="icon-btn" data-calendar-move="-1">‹</button><button class="icon-btn" data-calendar-today>●</button><button class="icon-btn" data-calendar-move="1">›</button></div><h3>${safe(monthLabel)}</h3></div><div class="calendar-weekdays">${weekdays.map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${days}</div></section><aside class="calendar-panel"><div class="tool-panel-head"><div><h3>${L('الأجندة القادمة', 'Upcoming agenda')}</h3><p>${L('الجلسات والمهام والاجتماعات', 'Hearings, tasks, and meetings')}</p></div></div><div class="agenda-list">${agenda.length ? agenda.map(item => `<div class="agenda-compact"><div class="agenda-compact-date">${safe(item.date)}<br>${safe(item.time || '')}</div><div><h4>${safe(item.title)}</h4><p>${safe(item.caseId || L('موعد عام', 'General event'))}</p></div></div>`).join('') : `<div class="tool-empty">${L('لا توجد مواعيد قادمة', 'No upcoming events')}</div>`}</div></aside></div></div>`;
  }

  function renderTimeTracking() {
    const total = state.timeEntries.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const billable = state.timeEntries.filter(item => item.billable).reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const currentMonth = todayIso().slice(0, 7);
    const monthly = state.timeEntries.filter(item => item.date?.startsWith(currentMonth)).reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const active = state.activeTimer;
    return `<div class="tool-page">${pageHeader('timeTracking', `<button class="btn btn-secondary" data-tool-action="manual-time">＋ ${L('إدخال يدوي', 'Manual entry')}</button>`)}<section class="tool-summary-grid"><article class="tool-summary"><span>${L('إجمالي الساعات', 'Total hours')}</span><strong>${total.toFixed(1)}</strong><small>${L('كل السجلات', 'All entries')}</small></article><article class="tool-summary"><span>${L('ساعات قابلة للفوترة', 'Billable hours')}</span><strong>${billable.toFixed(1)}</strong><small>${L('مرتبطة بأتعاب', 'Fee related')}</small></article><article class="tool-summary"><span>${L('ساعات هذا الشهر', 'This month')}</span><strong>${monthly.toFixed(1)}</strong><small>${currentMonth}</small></article><article class="tool-summary"><span>${L('الحالة الحالية', 'Current status')}</span><strong>${active ? L('يعمل', 'Running') : L('متوقف', 'Stopped')}</strong><small>${active ? safe(active.caseId || '') : L('لا يوجد مؤقت نشط', 'No active timer')}</small></article></section><div class="tool-layout"><section class="tool-panel"><div class="timer-console"><div class="timer-console-top"><div><div class="timer-display" id="officeTimerDisplay">${active ? '00:00:00' : '00:00:00'}</div><p>${active ? safe(active.description) : L('ابدأ المؤقت لتسجيل العمل على قضية أو مهمة', 'Start the timer to record case or task work')}</p></div><button class="btn btn-light" data-tool-action="${active ? 'stop-timer' : 'start-timer'}">${active ? L('إيقاف وحفظ', 'Stop & save') : L('بدء المؤقت', 'Start timer')}</button></div>${active ? `<div class="timer-meta"><div><span>${L('القضية', 'Case')}</span><b>${safe(active.caseId || '—')}</b></div><div><span>${L('بدأ في', 'Started at')}</span><b>${new Date(active.startedAt).toLocaleTimeString(state.language === 'ar' ? 'ar-KW' : 'en-US')}</b></div></div>` : ''}</div></section><aside class="tool-panel"><div class="tool-panel-head"><div><h3>${L('ملخص الفريق', 'Team summary')}</h3><p>${L('الساعات المسجلة حسب المستخدم', 'Recorded hours by user')}</p></div></div>${Object.entries(state.timeEntries.reduce((acc,item)=>{acc[item.person]=(acc[item.person]||0)+Number(item.hours||0);return acc;},{})).map(([person,hours])=>`<div class="entity-meta"><div><span>${safe(person)}</span><b>${hours.toFixed(1)} ${L('ساعة', 'hrs')}</b></div></div>`).join('')}</aside></div><section class="tool-panel"><div class="tool-panel-head"><div><h3>${L('سجل الوقت', 'Time log')}</h3><p>${L('الساعات المرتبطة بالقضايا والأعمال', 'Hours linked to cases and work')}</p></div></div><div class="table-wrap"><table class="tool-table"><thead><tr><th>${L('التاريخ', 'Date')}</th><th>${L('المستخدم', 'User')}</th><th>${L('القضية', 'Case')}</th><th>${L('الوصف', 'Description')}</th><th>${L('الساعات', 'Hours')}</th><th>${L('الفوترة', 'Billing')}</th><th></th></tr></thead><tbody>${state.timeEntries.slice().reverse().map(item=>`<tr><td>${safe(item.date)}</td><td>${safe(item.person)}</td><td>${safe(item.caseId||'—')}</td><td>${safe(item.description)}</td><td>${Number(item.hours).toFixed(2)}</td><td>${item.billable?L('قابلة للفوترة','Billable'):L('داخلية','Internal')}</td><td><button class="mini-btn" data-delete-time="${item.id}">${L('حذف','Delete')}</button></td></tr>`).join('')}</tbody></table></div></section></div>`;
  }

  const builtInTemplates = [
    { id: 'TMP-MEMO', icon: '✎', titleAr: 'مذكرة دفاع', titleEn: 'Defense Memo', categoryAr: 'مذكرات', categoryEn: 'Memos', body: 'بسم الله الرحمن الرحيم\n\nأمام المحكمة المختصة\n\nمذكرة بدفاع\nمقدمة من: [الاسم والصفة]\nضد: [اسم الخصم وصفته]\nفي القضية رقم: [رقم القضية]\n\nأولاً: الوقائع\n[تسلسل الوقائع]\n\nثانياً: الدفوع والأسانيد\n[الدفوع القانونية]\n\nثالثاً: الطلبات\n[الطلبات الختامية]\n\nوتفضلوا بقبول فائق الاحترام.' },
    { id: 'TMP-LETTER', icon: '✉', titleAr: 'كتاب رسمي', titleEn: 'Official Letter', categoryAr: 'مراسلات', categoryEn: 'Correspondence', body: 'السادة/ [اسم الجهة]\nتحية طيبة وبعد،\n\nالموضوع: [عنوان الكتاب]\n\nبالإشارة إلى [المرجع]، نفيدكم بالآتي:\n[محتوى الكتاب]\n\nوتفضلوا بقبول فائق الاحترام.\nمكتب المحامية حصة العبيد' },
    { id: 'TMP-CLIENT', icon: '◎', titleAr: 'تحديث للموكل', titleEn: 'Client Update', categoryAr: 'خدمة العملاء', categoryEn: 'Client Service', body: 'السيد/السيدة [اسم الموكل]\nنحيطكم علمًا بآخر مستجدات القضية رقم [رقم القضية]:\n[المستجدات]\n\nالإجراء القادم: [الإجراء]\nالموعد المتوقع: [التاريخ]\n\nمع التحية،\nمكتب المحامية حصة العبيد' },
    { id: 'TMP-MEETING', icon: '◷', titleAr: 'محضر اجتماع', titleEn: 'Meeting Minutes', categoryAr: 'إدارة', categoryEn: 'Administration', body: 'محضر اجتماع\nالتاريخ: [التاريخ]\nالحضور: [الأسماء]\nالموضوع: [الموضوع]\n\nالمناقشات:\n[التفاصيل]\n\nالقرارات والتكليفات:\n1. [القرار]\n2. [المهمة والمسؤول والموعد]' }
  ];

  function allTemplates() { return [...builtInTemplates, ...state.customTemplates]; }
  function renderTemplates() {
    return `<div class="tool-page">${pageHeader('documentTemplates', `<button class="btn btn-primary" data-tool-action="add-template">＋ ${L('قالب جديد', 'New template')}</button>`)}<div class="template-grid">${allTemplates().map(item=>`<article class="template-card"><span class="template-card-icon">${item.icon||'▤'}</span><div><h3>${safe(L(item.titleAr||item.title,item.titleEn||item.title))}</h3><p>${safe(L(item.categoryAr||item.category,item.categoryEn||item.category))}</p></div><div class="action-row"><button class="mini-btn" data-use-template="${item.id}">${L('استخدام القالب','Use template')}</button>${String(item.id).startsWith('CUSTOM')?`<button class="mini-btn" data-delete-template="${item.id}">${L('حذف','Delete')}</button>`:''}</div></article>`).join('')}</div></div>`;
  }

  function renderWorkflow() {
    const groups = [
      { key: 'pending', title: L('بانتظار المراجعة','Pending review') },
      { key: 'approved', title: L('معتمد','Approved') },
      { key: 'rejected', title: L('مرفوض أو معاد','Rejected / returned') }
    ];
    return `<div class="tool-page">${pageHeader('workflowApprovals', `<button class="btn btn-primary" data-tool-action="add-workflow">＋ ${L('طلب اعتماد','Approval request')}</button>`)}<div class="workflow-board">${groups.map(group=>{const items=state.workflowRequests.filter(item=>item.status===group.key);return `<section class="workflow-column"><div class="workflow-column-head"><h3>${group.title}</h3><span class="workflow-count">${items.length}</span></div><div class="workflow-list">${items.length?items.map(item=>`<article class="workflow-card"><h4>${safe(item.title)}</h4><p>${safe(item.type)} • ${safe(item.caseId||'—')}</p><p>${safe(item.notes||'')}</p><div class="workflow-card-meta"><span>${safe(item.requester)} ← ${safe(item.reviewer)}</span><span>${safe(item.date)}</span></div><div class="action-row">${item.status==='pending'?`<button class="mini-btn" data-workflow-status="approved" data-id="${item.id}">${L('اعتماد','Approve')}</button><button class="mini-btn" data-workflow-status="rejected" data-id="${item.id}">${L('إعادة','Return')}</button>`:`<button class="mini-btn" data-workflow-status="pending" data-id="${item.id}">${L('إعادة فتح','Reopen')}</button>`}<button class="mini-btn" data-delete-workflow="${item.id}">${L('حذف','Delete')}</button></div></article>`).join(''):`<div class="tool-empty">${L('لا توجد عناصر','No items')}</div>`}</div></section>`;}).join('')}</div></div>`;
  }

  function renderClientPortal() {
    syncPortalClients();
    return `<div class="tool-page">${pageHeader('clientPortal')}<div class="portal-grid">${state.portalAccess.map(portal=>{const client=state.clients.find(item=>item.id===portal.clientId);if(!client)return '';return `<article class="portal-card"><div class="portal-card-head"><div><h3>${safe(client.name)}</h3><p>${safe(client.phone||'')} • ${state.cases.filter(item=>item.clientId===client.id).length} ${L('قضايا','cases')}</p></div>${typeof statusChip==='function'?statusChip(portal.active?'active':'closed'):''}</div><div class="portal-code"><span>${L('رمز الدخول','Access code')}</span><b>${safe(portal.code)}</b><button class="mini-btn" data-copy-code="${safe(portal.code)}">${L('نسخ','Copy')}</button></div><div class="portal-updates">${portal.updates?.slice(-2).reverse().map(update=>`<div class="portal-update">${safe(update.date)} — ${safe(update.text)}</div>`).join('')||`<div class="portal-update">${L('لا توجد تحديثات مرسلة','No updates sent')}</div>`}</div><div class="action-row"><button class="mini-btn" data-portal-toggle="${portal.id}">${portal.active?L('إيقاف الدخول','Disable access'):L('تفعيل الدخول','Enable access')}</button><button class="mini-btn" data-portal-update="${portal.id}">${L('إضافة تحديث','Add update')}</button><button class="mini-btn" data-portal-whatsapp="${portal.id}">WhatsApp</button></div></article>`;}).join('')}</div><p class="notice">${L('هذه البوابة تعمل داخل النسخة التجريبية لإدارة الأكواد والتحديثات. نشر بوابة عميل خارجية آمنة يحتاج مصادقة وقاعدة بيانات وخادم إنتاجي.','This prototype manages access codes and updates locally. A secure external client portal requires authentication, a database, and a production backend.')}</p></div>`;
  }

  function renderKnowledge() {
    return `<div class="tool-page">${pageHeader('knowledgeBase', `<button class="btn btn-primary" data-tool-action="add-knowledge">＋ ${L('إضافة مادة','Add item')}</button>`)}<div class="filter-bar"><input id="knowledgeSearch" placeholder="${L('بحث في قاعدة المعرفة','Search knowledge base')}"></div><div class="knowledge-grid" id="knowledgeGrid">${state.knowledgeItems.map(item=>`<article class="knowledge-card searchable-knowledge"><span class="knowledge-tag">${safe(item.category)}</span><h3>${safe(item.title)}</h3><p>${safe(item.body)}</p><footer><span>${safe(item.author)}</span><span>${safe(item.date)}</span></footer><div class="action-row"><button class="mini-btn" data-copy-knowledge="${item.id}">${L('نسخ','Copy')}</button><button class="mini-btn" data-delete-knowledge="${item.id}">${L('حذف','Delete')}</button></div></article>`).join('')}</div></div>`;
  }

  function renderAudit() {
    const entries = state.activities.map((item,index)=>({ id:`AUD-${index+1}`, date:item.date, text:item.text, type:/حذف|delete/i.test(item.text)?'delete':/إضافة|تسجيل|add/i.test(item.text)?'create':'update' }));
    return `<div class="tool-page">${pageHeader('auditLog', `<button class="btn btn-secondary" data-tool-action="export-audit">${L('تصدير السجل','Export log')}</button>`)}<section class="tool-summary-grid"><article class="tool-summary"><span>${L('إجمالي العمليات','Total operations')}</span><strong>${entries.length}</strong><small>${L('المسجلة محليًا','Locally recorded')}</small></article><article class="tool-summary"><span>${L('عمليات اليوم','Today')}</span><strong>${entries.filter(item=>String(item.date).startsWith(todayIso())).length}</strong><small>${todayIso()}</small></article><article class="tool-summary"><span>${L('المستخدمون','Users')}</span><strong>${state.users.length}</strong><small>${L('ضمن النظام','In system')}</small></article><article class="tool-summary"><span>${L('آخر عملية','Last activity')}</span><strong>${entries.length?'1':'0'}</strong><small>${safe(entries[0]?.date||'—')}</small></article></section><section class="tool-panel"><div class="audit-toolbar"><input id="auditSearch" placeholder="${L('بحث في العمليات','Search operations')}"></div><div class="audit-list" id="auditList">${entries.length?entries.map(item=>`<article class="audit-item searchable-audit"><span class="audit-icon">${item.type==='create'?'＋':item.type==='delete'?'×':'↻'}</span><div><strong>${safe(item.text)}</strong><span>${safe(item.id)} • ${L('مدير النظام','System administrator')}</span></div><span class="audit-time">${safe(item.date)}</span></article>`).join(''):`<div class="tool-empty">${L('لا توجد عمليات مسجلة','No recorded operations')}</div>`}</div></section></div>`;
  }

  const toolRenderers = {
    officeCalendar: renderCalendar,
    timeTracking: renderTimeTracking,
    documentTemplates: renderTemplates,
    workflowApprovals: renderWorkflow,
    clientPortal: renderClientPortal,
    knowledgeBase: renderKnowledge,
    auditLog: renderAudit
  };

  const originalRenderView = renderView;
  renderView = function renderViewWithOfficeTools(view) {
    if (toolRenderers[view]) {
      appContent.innerHTML = toolRenderers[view]();
      bindViewEvents(view);
      if (typeof updateStats === 'function') updateStats();
      return;
    }
    originalRenderView(view);
    if (view === 'dashboard') appendDashboardHub();
  };

  const originalBindViewEvents = bindViewEvents;
  bindViewEvents = function bindViewEventsWithOfficeTools(view) {
    originalBindViewEvents(view);
    if (toolRenderers[view]) bindToolPage(view);
  };

  function log(text) {
    if (typeof logActivity === 'function') logActivity(text);
    if (typeof saveState === 'function') saveState();
  }

  function bindToolPage(view) {
    appContent.querySelectorAll('[data-tool-action]').forEach(button => button.addEventListener('click', () => handleToolAction(button.dataset.toolAction)));
    appContent.querySelectorAll('[data-calendar-move]').forEach(button => button.addEventListener('click', () => {
      const [year, month] = state.calendarCursor.split('-').map(Number);
      const date = new Date(year, month - 1 + Number(button.dataset.calendarMove), 1);
      state.calendarCursor = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      saveState(); renderView('officeCalendar');
    }));
    appContent.querySelector('[data-calendar-today]')?.addEventListener('click', () => { state.calendarCursor = todayIso().slice(0,7); saveState(); renderView('officeCalendar'); });
    appContent.querySelectorAll('[data-delete-time]').forEach(button => button.addEventListener('click', () => { if(confirm(L('حذف سجل الوقت؟','Delete time entry?'))){ state.timeEntries=state.timeEntries.filter(item=>item.id!==button.dataset.deleteTime); log(L('حذف سجل وقت','Deleted time entry')); renderView('timeTracking'); }}));
    appContent.querySelectorAll('[data-use-template]').forEach(button => button.addEventListener('click', () => useTemplate(button.dataset.useTemplate)));
    appContent.querySelectorAll('[data-delete-template]').forEach(button => button.addEventListener('click', () => { state.customTemplates=state.customTemplates.filter(item=>item.id!==button.dataset.deleteTemplate); log(L('حذف قالب مستند','Deleted document template')); renderView('documentTemplates'); }));
    appContent.querySelectorAll('[data-workflow-status]').forEach(button => button.addEventListener('click', () => { const item=state.workflowRequests.find(entry=>entry.id===button.dataset.id); if(item){item.status=button.dataset.workflowStatus;log(`${L('تحديث حالة طلب الاعتماد','Updated approval request')}: ${item.title}`);renderView('workflowApprovals');} }));
    appContent.querySelectorAll('[data-delete-workflow]').forEach(button => button.addEventListener('click', () => { state.workflowRequests=state.workflowRequests.filter(item=>item.id!==button.dataset.deleteWorkflow);log(L('حذف طلب اعتماد','Deleted approval request'));renderView('workflowApprovals'); }));
    appContent.querySelectorAll('[data-portal-toggle]').forEach(button => button.addEventListener('click', () => { const portal=state.portalAccess.find(item=>item.id===button.dataset.portalToggle);if(portal){portal.active=!portal.active;log(`${L('تحديث بوابة العميل','Updated client portal')}: ${portal.clientId}`);renderView('clientPortal');} }));
    appContent.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', async()=>{await navigator.clipboard.writeText(button.dataset.copyCode);toast(L('تم نسخ الرمز','Code copied'));}));
    appContent.querySelectorAll('[data-portal-update]').forEach(button => button.addEventListener('click', () => openPortalUpdate(button.dataset.portalUpdate)));
    appContent.querySelectorAll('[data-portal-whatsapp]').forEach(button => button.addEventListener('click', () => sendPortalWhatsApp(button.dataset.portalWhatsapp)));
    appContent.querySelectorAll('[data-copy-knowledge]').forEach(button => button.addEventListener('click', async()=>{const item=state.knowledgeItems.find(entry=>entry.id===button.dataset.copyKnowledge);if(item){await navigator.clipboard.writeText(`${item.title}\n\n${item.body}`);toast(L('تم النسخ','Copied'));}}));
    appContent.querySelectorAll('[data-delete-knowledge]').forEach(button => button.addEventListener('click',()=>{state.knowledgeItems=state.knowledgeItems.filter(item=>item.id!==button.dataset.deleteKnowledge);log(L('حذف مادة من قاعدة المعرفة','Deleted knowledge item'));renderView('knowledgeBase');}));
    const knowledgeSearch=document.getElementById('knowledgeSearch');knowledgeSearch?.addEventListener('input',()=>{const q=knowledgeSearch.value.toLowerCase();document.querySelectorAll('.searchable-knowledge').forEach(card=>card.style.display=card.textContent.toLowerCase().includes(q)?'':'none');});
    const auditSearch=document.getElementById('auditSearch');auditSearch?.addEventListener('input',()=>{const q=auditSearch.value.toLowerCase();document.querySelectorAll('.searchable-audit').forEach(card=>card.style.display=card.textContent.toLowerCase().includes(q)?'':'none');});
    if(view==='timeTracking') startTimerTicker();
  }

  function handleToolAction(action) {
    const actions = {
      'add-event': openEventModal,
      'manual-time': openManualTime,
      'start-timer': openStartTimer,
      'stop-timer': stopTimer,
      'add-template': openTemplateModal,
      'add-workflow': openWorkflowModal,
      'add-knowledge': openKnowledgeModal,
      'export-audit': exportAudit
    };
    actions[action]?.();
  }

  function caseSelectOptions(selected='') {
    return [{value:'',label:L('بدون قضية','No case')},...state.cases.map(item=>({value:item.id,label:`${item.id} — ${item.title}`}))];
  }

  function openEventModal() {
    openModal(L('إضافة موعد','Add event'), toolTitle('officeCalendar'), modalForm(field(L('العنوان','Title'),'title','text','','required')+field(L('التاريخ','Date'),'date','date',todayIso(),'required')+field(L('الوقت','Time'),'time','time','09:00')+selectField(L('النوع','Type'),'type',[{value:'meeting',label:L('اجتماع','Meeting')},{value:'deadline',label:L('موعد نهائي','Deadline')},{value:'reminder',label:L('تذكير','Reminder')}])+selectField(L('القضية','Case'),'caseId',caseSelectOptions())), fd => { state.officeEvents.push({id:nextId('EVT',state.officeEvents),title:fd.get('title'),date:fd.get('date'),time:fd.get('time'),type:fd.get('type'),caseId:fd.get('caseId')});log(`${L('إضافة موعد','Added event')}: ${fd.get('title')}`);closeModal();renderView('officeCalendar');toast(L('تمت إضافة الموعد','Event added')); });
  }

  function openManualTime() {
    openModal(L('إدخال وقت يدوي','Manual time entry'), toolTitle('timeTracking'), modalForm(field(L('التاريخ','Date'),'date','date',todayIso(),'required')+selectField(L('القضية','Case'),'caseId',caseSelectOptions())+field(L('المستخدم','User'),'person','text','حصة العبيد','required')+field(L('عدد الساعات','Hours'),'hours','number','1','min="0.1" step="0.1" required')+field(L('وصف العمل','Work description'),'description','textarea','','required')+selectField(L('نوع الوقت','Time type'),'billable',[{value:'true',label:L('قابل للفوترة','Billable')},{value:'false',label:L('داخلي','Internal')} ])), fd => { state.timeEntries.push({id:nextId('TIME',state.timeEntries),date:fd.get('date'),caseId:fd.get('caseId'),person:fd.get('person'),hours:Number(fd.get('hours')),description:fd.get('description'),billable:fd.get('billable')==='true'});log(`${L('إضافة سجل وقت','Added time entry')}: ${fd.get('description')}`);closeModal();renderView('timeTracking'); });
  }

  function openStartTimer() {
    openModal(L('بدء المؤقت','Start timer'), toolTitle('timeTracking'), modalForm(selectField(L('القضية','Case'),'caseId',caseSelectOptions())+field(L('وصف العمل','Work description'),'description','text','','required')+field(L('المستخدم','User'),'person','text','حصة العبيد','required')+selectField(L('نوع الوقت','Time type'),'billable',[{value:'true',label:L('قابل للفوترة','Billable')},{value:'false',label:L('داخلي','Internal')} ])), fd => { state.activeTimer={startedAt:nowIso(),caseId:fd.get('caseId'),description:fd.get('description'),person:fd.get('person'),billable:fd.get('billable')==='true'};log(`${L('بدء مؤقت','Started timer')}: ${fd.get('description')}`);closeModal();renderView('timeTracking'); });
  }

  function stopTimer() {
    if(!state.activeTimer)return;
    const active=state.activeTimer;const hours=Math.max((Date.now()-new Date(active.startedAt).getTime())/3600000,0.01);
    state.timeEntries.push({id:nextId('TIME',state.timeEntries),date:todayIso(),caseId:active.caseId,person:active.person,hours:Number(hours.toFixed(2)),description:active.description,billable:active.billable});
    state.activeTimer=null;log(`${L('إيقاف مؤقت وحفظ الوقت','Stopped timer and saved time')}: ${active.description}`);renderView('timeTracking');toast(L('تم حفظ الوقت','Time saved'));
  }

  function startTimerTicker() {
    clearInterval(window.officeTimerTicker);
    const display=document.getElementById('officeTimerDisplay');if(!display||!state.activeTimer)return;
    const update=()=>{const seconds=Math.max(0,Math.floor((Date.now()-new Date(state.activeTimer.startedAt).getTime())/1000));const h=String(Math.floor(seconds/3600)).padStart(2,'0');const m=String(Math.floor(seconds%3600/60)).padStart(2,'0');const s=String(seconds%60).padStart(2,'0');display.textContent=`${h}:${m}:${s}`;};update();window.officeTimerTicker=setInterval(update,1000);
  }

  function openTemplateModal() {
    openModal(L('قالب جديد','New template'), toolTitle('documentTemplates'), modalForm(field(L('اسم القالب','Template name'),'title','text','','required')+field(L('التصنيف','Category'),'category','text',L('أخرى','Other'))+field(L('محتوى القالب','Template content'),'body','textarea','','required')), fd => { state.customTemplates.push({id:`CUSTOM-${Date.now()}`,icon:'▤',titleAr:fd.get('title'),titleEn:fd.get('title'),categoryAr:fd.get('category'),categoryEn:fd.get('category'),body:fd.get('body')});log(`${L('إضافة قالب','Added template')}: ${fd.get('title')}`);closeModal();renderView('documentTemplates'); });
  }

  function useTemplate(id) {
    const item=allTemplates().find(entry=>entry.id===id);if(!item)return;
    openModal(L(item.titleAr||item.title,item.titleEn||item.title), L('تحرير القالب','Edit template'), `<label>${L('النص','Text')}<textarea id="templateEditor" rows="18">${safe(item.body)}</textarea></label><div class="modal-actions"><button class="btn btn-secondary" type="button" data-close-modal>${L('إغلاق','Close')}</button><button class="btn btn-secondary" id="copyTemplateText" type="button">${L('نسخ','Copy')}</button><button class="btn btn-primary" id="downloadTemplateText" type="button">${L('تنزيل','Download')}</button></div>`);
    document.getElementById('copyTemplateText').addEventListener('click',async()=>{await navigator.clipboard.writeText(document.getElementById('templateEditor').value);toast(L('تم نسخ القالب','Template copied'));});
    document.getElementById('downloadTemplateText').addEventListener('click',()=>{const blob=new Blob([document.getElementById('templateEditor').value],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${L(item.titleAr||item.title,item.titleEn||item.title)}.txt`;a.click();URL.revokeObjectURL(a.href);});
  }

  function openWorkflowModal() {
    openModal(L('طلب اعتماد جديد','New approval request'), toolTitle('workflowApprovals'), modalForm(field(L('عنوان الطلب','Request title'),'title','text','','required')+selectField(L('النوع','Type'),'type',[{value:'اعتماد مستند',label:L('اعتماد مستند','Document approval')},{value:'اعتماد مالي',label:L('اعتماد مالي','Financial approval')},{value:'إحالة مهمة',label:L('إحالة مهمة','Task assignment')}])+selectField(L('القضية','Case'),'caseId',caseSelectOptions())+field(L('مقدم الطلب','Requester'),'requester','text','الباحث القانوني')+field(L('المراجع','Reviewer'),'reviewer','text','حصة العبيد')+field(L('ملاحظات','Notes'),'notes','textarea')), fd => { state.workflowRequests.push({id:nextId('WF',state.workflowRequests),title:fd.get('title'),type:fd.get('type'),caseId:fd.get('caseId'),requester:fd.get('requester'),reviewer:fd.get('reviewer'),status:'pending',date:todayIso(),notes:fd.get('notes')});log(`${L('إضافة طلب اعتماد','Added approval request')}: ${fd.get('title')}`);closeModal();renderView('workflowApprovals'); });
  }

  function openPortalUpdate(id) {
    const portal=state.portalAccess.find(item=>item.id===id);const client=state.clients.find(item=>item.id===portal?.clientId);if(!portal||!client)return;
    openModal(L('تحديث للعميل','Client update'), client.name, modalForm(field(L('نص التحديث','Update text'),'text','textarea','','required')), fd => { portal.updates ||= [];portal.updates.push({date:todayIso(),text:fd.get('text')});portal.lastUpdate=todayIso();log(`${L('إضافة تحديث للعميل','Added client update')}: ${client.name}`);closeModal();renderView('clientPortal'); });
  }

  function sendPortalWhatsApp(id) {
    const portal=state.portalAccess.find(item=>item.id===id);const client=state.clients.find(item=>item.id===portal?.clientId);if(!portal||!client)return;
    const message=L(`مرحبًا ${client.name}، رمز الدخول إلى بوابة متابعة الملف هو: ${portal.code}. يرجى عدم مشاركة الرمز مع أي شخص.`,`Hello ${client.name}, your file portal access code is: ${portal.code}. Please do not share it.`);
    window.open(`https://wa.me/${String(client.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank');
  }

  function openKnowledgeModal() {
    openModal(L('إضافة مادة معرفية','Add knowledge item'), toolTitle('knowledgeBase'), modalForm(field(L('العنوان','Title'),'title','text','','required')+field(L('التصنيف','Category'),'category','text',L('إجراءات','Procedures'))+field(L('المحتوى','Content'),'body','textarea','','required')+field(L('الكاتب','Author'),'author','text','حصة العبيد')), fd => { state.knowledgeItems.unshift({id:nextId('KB',state.knowledgeItems),title:fd.get('title'),category:fd.get('category'),body:fd.get('body'),author:fd.get('author'),date:todayIso()});log(`${L('إضافة مادة معرفية','Added knowledge item')}: ${fd.get('title')}`);closeModal();renderView('knowledgeBase'); });
  }

  function exportAudit() {
    const rows=[['Date','Activity'],...state.activities.map(item=>[item.date,item.text])];
    const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`office-audit-${todayIso()}.csv`;a.click();URL.revokeObjectURL(a.href);toast(L('تم تصدير السجل','Audit log exported'));
  }

  injectSidebarTools();
  updateToolLanguage();
  if (!document.getElementById('appShell')?.classList.contains('hidden') && state.currentView === 'dashboard') appendDashboardHub();
})();
