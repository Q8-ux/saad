(() => {
  'use strict';

  const STORE_KEY = 'hessaOfficeToolsV2';
  const BASE_KEY = 'hessaLawLmsV3';
  let timerTicker = null;
  let currentView = '';

  const tools = {
    calendar: { icon: '▦', ar: 'التقويم الموحد', en: 'Unified Calendar', descAr: 'الجلسات والمهام والاجتماعات والمواعيد النهائية', descEn: 'Hearings, tasks, meetings, and deadlines' },
    time: { icon: '◷', ar: 'سجل الوقت', en: 'Time Tracking', descAr: 'احتساب ساعات العمل وربطها بالقضايا', descEn: 'Track hours and link them to cases' },
    templates: { icon: '▤', ar: 'قوالب المستندات', en: 'Document Templates', descAr: 'قوالب قانونية وإدارية جاهزة للاستخدام', descEn: 'Reusable legal and administrative templates' },
    workflow: { icon: '✓', ar: 'سير العمل والموافقات', en: 'Workflows & Approvals', descAr: 'اعتماد المستندات والمصروفات وإحالة الأعمال', descEn: 'Approve documents, expenses, and assignments' },
    portal: { icon: '◎', ar: 'بوابة العملاء', en: 'Client Portal', descAr: 'رموز دخول وتحديثات آمنة للموكلين', descEn: 'Access codes and secure client updates' },
    knowledge: { icon: '◇', ar: 'قاعدة المعرفة', en: 'Knowledge Base', descAr: 'إجراءات المكتب والملاحظات القانونية الداخلية', descEn: 'Internal procedures and legal knowledge' },
    audit: { icon: '⌁', ar: 'سجل التدقيق', en: 'Audit Log', descAr: 'تتبع العمليات والتغييرات داخل النظام', descEn: 'Track operations and system changes' }
  };

  const templates = [
    { id: 'memo', icon: '✎', title: 'مذكرة دفاع', category: 'مذكرات', body: 'بسم الله الرحمن الرحيم\n\nأمام المحكمة المختصة\n\nمذكرة بدفاع\nمقدمة من: [الاسم والصفة]\nضد: [اسم الخصم وصفته]\nفي القضية رقم: [رقم القضية]\n\nأولاً: الوقائع\n[تسلسل الوقائع]\n\nثانياً: الدفوع والأسانيد\n[الدفوع القانونية]\n\nثالثاً: الطلبات\n[الطلبات الختامية]\n\nوتفضلوا بقبول فائق الاحترام.' },
    { id: 'letter', icon: '✉', title: 'كتاب رسمي', category: 'مراسلات', body: 'السادة/ [اسم الجهة]\nتحية طيبة وبعد،\n\nالموضوع: [عنوان الكتاب]\n\nبالإشارة إلى [المرجع]، نفيدكم بالآتي:\n[محتوى الكتاب]\n\nوتفضلوا بقبول فائق الاحترام.\nمكتب المحامية حصة العبيد' },
    { id: 'client', icon: '◎', title: 'تحديث للموكل', category: 'خدمة العملاء', body: 'السيد/السيدة [اسم الموكل]\nنحيطكم علمًا بآخر مستجدات القضية رقم [رقم القضية]:\n[المستجدات]\n\nالإجراء القادم: [الإجراء]\nالموعد المتوقع: [التاريخ]\n\nمع التحية،\nمكتب المحامية حصة العبيد' },
    { id: 'meeting', icon: '◷', title: 'محضر اجتماع', category: 'إدارة', body: 'محضر اجتماع\nالتاريخ: [التاريخ]\nالحضور: [الأسماء]\nالموضوع: [الموضوع]\n\nالمناقشات:\n[التفاصيل]\n\nالقرارات والتكليفات:\n1. [القرار]\n2. [المهمة والمسؤول والموعد]' }
  ];

  const defaults = {
    events: [{ id: 'EVT-001', date: '2026-08-10', time: '11:00', title: 'اجتماع تحضير القضية التجارية', caseId: '2026/145 تجاري' }],
    timeEntries: [{ id: 'TIME-001', date: '2026-08-05', caseId: '2026/145 تجاري', person: 'حصة العبيد', hours: 1.5, description: 'مراجعة مستندات عقد التوريد', billable: true }],
    activeTimer: null,
    workflows: [{ id: 'WF-001', title: 'اعتماد مذكرة الرد', caseId: '2026/145 تجاري', requester: 'الباحث القانوني', reviewer: 'حصة العبيد', status: 'pending', date: '2026-08-05' }],
    portals: [],
    knowledge: [{ id: 'KB-001', title: 'قائمة مراجعة قبل إيداع المذكرة', category: 'إجراءات', body: 'مراجعة رقم القضية وصفات الخصوم والوقائع والدفوع والمستندات والطلبات والتوقيع قبل الإيداع.', author: 'حصة العبيد', date: '2026-08-01' }],
    activity: [{ date: new Date().toLocaleString('sv-SE').slice(0, 16), text: 'تهيئة أدوات إدارة المكتب' }]
  };

  function language() {
    return document.documentElement.lang === 'en' ? 'en' : 'ar';
  }

  function text(ar, en) {
    return language() === 'ar' ? ar : en;
  }

  function safe(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return saved && typeof saved === 'object' ? { ...clone(defaults), ...saved } : clone(defaults);
    } catch {
      return clone(defaults);
    }
  }

  function baseData() {
    try {
      return JSON.parse(localStorage.getItem(BASE_KEY)) || {};
    } catch {
      return {};
    }
  }

  let data = loadStore();

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function log(message) {
    data.activity.unshift({ date: new Date().toLocaleString('sv-SE').slice(0, 16), text: message });
    data.activity = data.activity.slice(0, 100);
    save();
  }

  function uid(prefix, list) {
    return `${prefix}-${String(list.length + 1).padStart(3, '0')}`;
  }

  function appContent() {
    return document.getElementById('appContent');
  }

  function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('open', 'is-open');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    document.getElementById('openSidebar')?.setAttribute('aria-expanded', 'false');
  }

  function setHeader(view) {
    const item = tools[view];
    const breadcrumb = document.getElementById('breadcrumb');
    const pageTitle = document.getElementById('pageTitle');
    if (breadcrumb) breadcrumb.textContent = text('أدوات إدارة المكتب', 'Office Management Tools');
    if (pageTitle) pageTitle.textContent = text(item.ar, item.en);
    document.querySelectorAll('#sidebarNav .nav-item').forEach((button) => button.classList.remove('active'));
    document.querySelector(`[data-office-view="${view}"]`)?.classList.add('active');
  }

  function injectSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav || nav.querySelector('[data-office-tools-section]')) return;
    const administration = nav.querySelector('[data-i18n="administration"]');
    const section = document.createElement('div');
    section.dataset.officeToolsSection = '1';
    section.innerHTML = `
      <p class="nav-label">${text('أدوات إدارة المكتب', 'Office Management Tools')}</p>
      ${Object.entries(tools).map(([key, item]) => `
        <button class="nav-item" type="button" data-office-view="${key}">
          <span>${item.icon}</span><b>${text(item.ar, item.en)}</b>
        </button>`).join('')}`;
    if (administration) nav.insertBefore(section, administration);
    else nav.appendChild(section);
  }

  function pageHead(view, action = '') {
    const item = tools[view];
    return `<header class="page-head"><div><p class="eyebrow">${text('أدوات إدارة المكتب', 'OFFICE MANAGEMENT TOOLS')}</p><h1>${safe(text(item.ar, item.en))}</h1><p>${safe(text(item.descAr, item.descEn))}</p></div><div class="page-actions">${action}</div></header>`;
  }

  function hubMarkup() {
    return `<article class="dashboard-panel office-tools-hub"><div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">⚙</span><div><h3>${text('أدوات إدارة المكتب', 'Office Management Tools')}</h3><small>${text('وصول سريع للأدوات التشغيلية والإدارية', 'Quick access to office tools')}</small></div></div></div><div class="office-tools-grid">${Object.entries(tools).map(([key, item]) => `<button class="office-tool-card" type="button" data-office-view="${key}"><span class="office-tool-card-icon">${item.icon}</span><span><strong>${text(item.ar, item.en)}</strong><small>${text(item.descAr, item.descEn)}</small></span><span class="office-tool-arrow">↗</span></button>`).join('')}</div></article>`;
  }

  function addDashboardHub() {
    const content = appContent();
    if (!content || content.querySelector('.office-tools-hub')) return;
    const dashboard = content.querySelector('.executive-dashboard');
    if (!dashboard) return;
    dashboard.insertAdjacentHTML('beforeend', hubMarkup());
  }

  function allEvents() {
    const base = baseData();
    const sessions = (base.sessions || []).map((item) => ({ date: item.date, time: item.time || '', title: item.purpose || text('جلسة', 'Hearing'), caseId: item.caseId || '', type: 'hearing' }));
    const tasks = (base.tasks || []).filter((item) => !item.done).map((item) => ({ date: item.due, time: '', title: item.title, caseId: item.caseId || '', type: 'task' }));
    return [...sessions, ...tasks, ...data.events.map((item) => ({ ...item, type: 'meeting' }))].filter((item) => item.date).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }

  function renderCalendar() {
    const events = allEvents();
    return `<div class="tool-page">${pageHead('calendar', `<button class="btn btn-primary" data-tool-action="add-event">＋ ${text('إضافة موعد', 'Add event')}</button>`)}<section class="tool-summary-grid"><article class="tool-summary"><span>${text('كل المواعيد', 'All events')}</span><strong>${events.length}</strong><small>${text('جلسات ومهام واجتماعات', 'Hearings, tasks, meetings')}</small></article><article class="tool-summary"><span>${text('الجلسات', 'Hearings')}</span><strong>${events.filter((item) => item.type === 'hearing').length}</strong><small>${text('مسجلة بالنظام', 'Recorded')}</small></article><article class="tool-summary"><span>${text('المهام', 'Tasks')}</span><strong>${events.filter((item) => item.type === 'task').length}</strong><small>${text('غير المنجزة', 'Open')}</small></article><article class="tool-summary"><span>${text('الاجتماعات', 'Meetings')}</span><strong>${data.events.length}</strong><small>${text('مواعيد المكتب', 'Office events')}</small></article></section><section class="tool-panel"><div class="tool-panel-head"><div><h3>${text('الأجندة الموحدة', 'Unified Agenda')}</h3><p>${text('مرتبة حسب التاريخ والوقت', 'Sorted by date and time')}</p></div></div><div class="timeline">${events.length ? events.map((item) => `<article class="timeline-item"><div class="timeline-date">${safe(item.date)}<br>${safe(item.time)}</div><div><h3>${safe(item.title)}</h3><p>${safe(item.caseId || text('موعد عام', 'General event'))}</p>${item.type === 'meeting' ? `<div class="action-row"><button class="mini-btn" data-delete-event="${safe(item.id)}">${text('حذف', 'Delete')}</button></div>` : ''}</div></article>`).join('') : `<div class="tool-empty">${text('لا توجد مواعيد', 'No events')}</div>`}</div></section></div>`;
  }

  function elapsedHours() {
    if (!data.activeTimer) return 0;
    return Math.max(0, (Date.now() - new Date(data.activeTimer.startedAt).getTime()) / 3600000);
  }

  function renderTime() {
    const total = data.timeEntries.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const billable = data.timeEntries.filter((item) => item.billable).reduce((sum, item) => sum + Number(item.hours || 0), 0);
    return `<div class="tool-page">${pageHead('time', `<button class="btn btn-secondary" data-tool-action="manual-time">＋ ${text('إدخال يدوي', 'Manual entry')}</button>`)}<section class="tool-summary-grid"><article class="tool-summary"><span>${text('إجمالي الساعات', 'Total hours')}</span><strong>${total.toFixed(1)}</strong><small>${text('كل السجلات', 'All entries')}</small></article><article class="tool-summary"><span>${text('قابلة للفوترة', 'Billable')}</span><strong>${billable.toFixed(1)}</strong><small>${text('ساعات أتعاب', 'Fee hours')}</small></article><article class="tool-summary"><span>${text('السجلات', 'Entries')}</span><strong>${data.timeEntries.length}</strong><small>${text('سجل وقت', 'Time logs')}</small></article><article class="tool-summary"><span>${text('المؤقت', 'Timer')}</span><strong>${data.activeTimer ? text('يعمل', 'Running') : text('متوقف', 'Stopped')}</strong><small>${data.activeTimer ? safe(data.activeTimer.caseId || '') : text('لا يوجد مؤقت نشط', 'No active timer')}</small></article></section><section class="tool-panel"><div class="timer-console"><div class="timer-console-top"><div><div class="timer-display" id="officeTimerDisplay">00:00:00</div><p>${data.activeTimer ? safe(data.activeTimer.description) : text('ابدأ المؤقت لتسجيل العمل على قضية', 'Start the timer to record case work')}</p></div><button class="btn btn-light" data-tool-action="${data.activeTimer ? 'stop-timer' : 'start-timer'}">${data.activeTimer ? text('إيقاف وحفظ', 'Stop & save') : text('بدء المؤقت', 'Start timer')}</button></div></div></section><section class="tool-panel"><div class="tool-panel-head"><div><h3>${text('سجل الوقت', 'Time log')}</h3></div></div><div class="table-wrap"><table class="tool-table"><thead><tr><th>${text('التاريخ', 'Date')}</th><th>${text('المستخدم', 'User')}</th><th>${text('القضية', 'Case')}</th><th>${text('الوصف', 'Description')}</th><th>${text('الساعات', 'Hours')}</th><th></th></tr></thead><tbody>${data.timeEntries.slice().reverse().map((item) => `<tr><td>${safe(item.date)}</td><td>${safe(item.person)}</td><td>${safe(item.caseId || '—')}</td><td>${safe(item.description)}</td><td>${Number(item.hours).toFixed(2)}</td><td><button class="mini-btn" data-delete-time="${safe(item.id)}">${text('حذف', 'Delete')}</button></td></tr>`).join('')}</tbody></table></div></section></div>`;
  }

  function renderTemplates() {
    return `<div class="tool-page">${pageHead('templates')}<div class="template-grid">${templates.map((item) => `<article class="template-card"><span class="template-card-icon">${item.icon}</span><div><h3>${safe(item.title)}</h3><p>${safe(item.category)}</p></div><div class="action-row"><button class="mini-btn" data-use-template="${item.id}">${text('فتح القالب', 'Open template')}</button><button class="mini-btn" data-copy-template="${item.id}">${text('نسخ', 'Copy')}</button></div></article>`).join('')}</div></div>`;
  }

  function renderWorkflow() {
    const columns = [
      ['pending', text('بانتظار المراجعة', 'Pending')],
      ['approved', text('معتمد', 'Approved')],
      ['rejected', text('معاد للمراجعة', 'Returned')]
    ];
    return `<div class="tool-page">${pageHead('workflow', `<button class="btn btn-primary" data-tool-action="add-workflow">＋ ${text('طلب اعتماد', 'Approval request')}</button>`)}<div class="workflow-board">${columns.map(([status, title]) => { const items = data.workflows.filter((item) => item.status === status); return `<section class="workflow-column"><div class="workflow-column-head"><h3>${title}</h3><span class="workflow-count">${items.length}</span></div><div class="workflow-list">${items.length ? items.map((item) => `<article class="workflow-card"><h4>${safe(item.title)}</h4><p>${safe(item.caseId || '—')}</p><div class="workflow-card-meta"><span>${safe(item.requester)} ← ${safe(item.reviewer)}</span><span>${safe(item.date)}</span></div><div class="action-row">${status === 'pending' ? `<button class="mini-btn" data-workflow-status="approved" data-id="${item.id}">${text('اعتماد', 'Approve')}</button><button class="mini-btn" data-workflow-status="rejected" data-id="${item.id}">${text('إعادة', 'Return')}</button>` : `<button class="mini-btn" data-workflow-status="pending" data-id="${item.id}">${text('إعادة فتح', 'Reopen')}</button>`}<button class="mini-btn" data-delete-workflow="${item.id}">${text('حذف', 'Delete')}</button></div></article>`).join('') : `<div class="tool-empty">${text('لا توجد عناصر', 'No items')}</div>`}</div></section>`; }).join('')}</div></div>`;
  }

  function syncPortals() {
    const clients = baseData().clients || [];
    clients.forEach((client) => {
      if (!data.portals.some((portal) => portal.clientId === client.id)) {
        data.portals.push({ id: uid('PORTAL', data.portals), clientId: client.id, code: `HA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, active: false, updates: [] });
      }
    });
    save();
    return clients;
  }

  function renderPortal() {
    const clients = syncPortals();
    return `<div class="tool-page">${pageHead('portal')}<div class="portal-grid">${data.portals.map((portal) => { const client = clients.find((item) => item.id === portal.clientId); if (!client) return ''; return `<article class="portal-card"><div class="portal-card-head"><div><h3>${safe(client.name)}</h3><p>${safe(client.phone || '')}</p></div><span class="status ${portal.active ? 'active' : 'closed'}">${portal.active ? text('مفعلة', 'Active') : text('متوقفة', 'Disabled')}</span></div><div class="portal-code"><span>${text('رمز الدخول', 'Access code')}</span><b>${safe(portal.code)}</b><button class="mini-btn" data-copy-code="${safe(portal.code)}">${text('نسخ', 'Copy')}</button></div><div class="portal-updates">${portal.updates.length ? portal.updates.slice(-2).reverse().map((update) => `<div class="portal-update">${safe(update.date)} — ${safe(update.text)}</div>`).join('') : `<div class="portal-update">${text('لا توجد تحديثات', 'No updates')}</div>`}</div><div class="action-row"><button class="mini-btn" data-toggle-portal="${portal.id}">${portal.active ? text('إيقاف', 'Disable') : text('تفعيل', 'Enable')}</button><button class="mini-btn" data-update-portal="${portal.id}">${text('إضافة تحديث', 'Add update')}</button><button class="mini-btn" data-whatsapp-portal="${portal.id}">WhatsApp</button></div></article>`; }).join('')}</div></div>`;
  }

  function renderKnowledge() {
    return `<div class="tool-page">${pageHead('knowledge', `<button class="btn btn-primary" data-tool-action="add-knowledge">＋ ${text('إضافة مادة', 'Add item')}</button>`)}<div class="filter-bar"><input id="knowledgeSearch" placeholder="${text('بحث في قاعدة المعرفة', 'Search knowledge base')}"></div><div class="knowledge-grid">${data.knowledge.map((item) => `<article class="knowledge-card searchable-knowledge"><span class="knowledge-tag">${safe(item.category)}</span><h3>${safe(item.title)}</h3><p>${safe(item.body)}</p><footer><span>${safe(item.author)}</span><span>${safe(item.date)}</span></footer><div class="action-row"><button class="mini-btn" data-copy-knowledge="${item.id}">${text('نسخ', 'Copy')}</button><button class="mini-btn" data-delete-knowledge="${item.id}">${text('حذف', 'Delete')}</button></div></article>`).join('')}</div></div>`;
  }

  function auditRows() {
    const base = baseData();
    return [...data.activity, ...(base.activities || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function renderAudit() {
    const rows = auditRows();
    return `<div class="tool-page">${pageHead('audit', `<button class="btn btn-secondary" data-tool-action="export-audit">${text('تصدير CSV', 'Export CSV')}</button>`)}<section class="tool-summary-grid"><article class="tool-summary"><span>${text('إجمالي العمليات', 'Total operations')}</span><strong>${rows.length}</strong><small>${text('مسجلة بالنظام', 'Recorded')}</small></article><article class="tool-summary"><span>${text('عمليات الأدوات', 'Tool operations')}</span><strong>${data.activity.length}</strong><small>${text('داخل الوحدة', 'Within tools')}</small></article><article class="tool-summary"><span>${text('عمليات اليوم', 'Today')}</span><strong>${rows.filter((item) => String(item.date).startsWith(new Date().toISOString().slice(0, 10))).length}</strong><small>${new Date().toISOString().slice(0, 10)}</small></article><article class="tool-summary"><span>${text('آخر تحديث', 'Last update')}</span><strong>${rows.length ? '1' : '0'}</strong><small>${safe(rows[0]?.date || '—')}</small></article></section><section class="tool-panel"><div class="audit-toolbar"><input id="auditSearch" placeholder="${text('بحث في العمليات', 'Search operations')}"></div><div class="audit-list">${rows.map((item, index) => `<article class="audit-item searchable-audit"><span class="audit-icon">↻</span><div><strong>${safe(item.text)}</strong><span>AUD-${String(index + 1).padStart(3, '0')}</span></div><span class="audit-time">${safe(item.date)}</span></article>`).join('')}</div></section></div>`;
  }

  const renderers = { calendar: renderCalendar, time: renderTime, templates: renderTemplates, workflow: renderWorkflow, portal: renderPortal, knowledge: renderKnowledge, audit: renderAudit };

  function render(view) {
    const content = appContent();
    if (!content || !renderers[view]) return;
    currentView = view;
    clearInterval(timerTicker);
    content.innerHTML = renderers[view]();
    setHeader(view);
    closeMenu();
    bindPage();
    if (view === 'time') startTicker();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function promptValue(message, initial = '') {
    const value = window.prompt(message, initial);
    return value === null ? null : value.trim();
  }

  function addEvent() {
    const title = promptValue(text('عنوان الموعد', 'Event title'));
    if (!title) return;
    const date = promptValue(text('التاريخ بصيغة YYYY-MM-DD', 'Date YYYY-MM-DD'), new Date().toISOString().slice(0, 10));
    if (!date) return;
    const timeValue = promptValue(text('الوقت بصيغة HH:MM', 'Time HH:MM'), '09:00') || '';
    const caseId = promptValue(text('رقم القضية أو اتركه فارغًا', 'Case number or leave blank'), '') || '';
    data.events.push({ id: uid('EVT', data.events), title, date, time: timeValue, caseId });
    log(`${text('إضافة موعد', 'Added event')}: ${title}`);
    render('calendar');
  }

  function manualTime() {
    const description = promptValue(text('وصف العمل', 'Work description'));
    if (!description) return;
    const hours = Number(promptValue(text('عدد الساعات', 'Hours'), '1'));
    if (!Number.isFinite(hours) || hours <= 0) return;
    const caseId = promptValue(text('رقم القضية', 'Case number'), '') || '';
    const person = promptValue(text('المستخدم', 'User'), 'حصة العبيد') || 'حصة العبيد';
    data.timeEntries.push({ id: uid('TIME', data.timeEntries), date: new Date().toISOString().slice(0, 10), caseId, person, hours, description, billable: true });
    log(`${text('إضافة سجل وقت', 'Added time entry')}: ${description}`);
    render('time');
  }

  function startTimer() {
    const description = promptValue(text('وصف العمل', 'Work description'));
    if (!description) return;
    const caseId = promptValue(text('رقم القضية', 'Case number'), '') || '';
    data.activeTimer = { startedAt: new Date().toISOString(), description, caseId, person: 'حصة العبيد', billable: true };
    log(`${text('بدء مؤقت', 'Started timer')}: ${description}`);
    render('time');
  }

  function stopTimer() {
    if (!data.activeTimer) return;
    const timer = data.activeTimer;
    const hours = Math.max(elapsedHours(), 0.01);
    data.timeEntries.push({ id: uid('TIME', data.timeEntries), date: new Date().toISOString().slice(0, 10), caseId: timer.caseId, person: timer.person, hours: Number(hours.toFixed(2)), description: timer.description, billable: timer.billable });
    data.activeTimer = null;
    log(`${text('إيقاف المؤقت', 'Stopped timer')}: ${timer.description}`);
    render('time');
  }

  function addWorkflow() {
    const title = promptValue(text('عنوان طلب الاعتماد', 'Approval request title'));
    if (!title) return;
    const caseId = promptValue(text('رقم القضية', 'Case number'), '') || '';
    data.workflows.push({ id: uid('WF', data.workflows), title, caseId, requester: 'الباحث القانوني', reviewer: 'حصة العبيد', status: 'pending', date: new Date().toISOString().slice(0, 10) });
    log(`${text('إضافة طلب اعتماد', 'Added approval request')}: ${title}`);
    render('workflow');
  }

  function addKnowledge() {
    const title = promptValue(text('عنوان المادة', 'Item title'));
    if (!title) return;
    const body = promptValue(text('المحتوى', 'Content'));
    if (!body) return;
    const category = promptValue(text('التصنيف', 'Category'), text('إجراءات', 'Procedures')) || text('إجراءات', 'Procedures');
    data.knowledge.unshift({ id: uid('KB', data.knowledge), title, category, body, author: 'حصة العبيد', date: new Date().toISOString().slice(0, 10) });
    log(`${text('إضافة مادة معرفية', 'Added knowledge item')}: ${title}`);
    render('knowledge');
  }

  function exportAudit() {
    const rows = [['Date', 'Activity'], ...auditRows().map((item) => [item.date, item.text])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hessa-office-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function startTicker() {
    const display = document.getElementById('officeTimerDisplay');
    if (!display || !data.activeTimer) return;
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(data.activeTimer.startedAt).getTime()) / 1000));
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      display.textContent = `${h}:${m}:${s}`;
    };
    update();
    timerTicker = window.setInterval(update, 1000);
  }

  function bindPage() {
    const content = appContent();
    if (!content) return;

    content.querySelector('[data-tool-action="add-event"]')?.addEventListener('click', addEvent);
    content.querySelector('[data-tool-action="manual-time"]')?.addEventListener('click', manualTime);
    content.querySelector('[data-tool-action="start-timer"]')?.addEventListener('click', startTimer);
    content.querySelector('[data-tool-action="stop-timer"]')?.addEventListener('click', stopTimer);
    content.querySelector('[data-tool-action="add-workflow"]')?.addEventListener('click', addWorkflow);
    content.querySelector('[data-tool-action="add-knowledge"]')?.addEventListener('click', addKnowledge);
    content.querySelector('[data-tool-action="export-audit"]')?.addEventListener('click', exportAudit);

    content.querySelectorAll('[data-delete-event]').forEach((button) => button.addEventListener('click', () => {
      data.events = data.events.filter((item) => item.id !== button.dataset.deleteEvent);
      log(text('حذف موعد', 'Deleted event'));
      render('calendar');
    }));

    content.querySelectorAll('[data-delete-time]').forEach((button) => button.addEventListener('click', () => {
      data.timeEntries = data.timeEntries.filter((item) => item.id !== button.dataset.deleteTime);
      log(text('حذف سجل وقت', 'Deleted time entry'));
      render('time');
    }));

    content.querySelectorAll('[data-use-template]').forEach((button) => button.addEventListener('click', () => {
      const item = templates.find((entry) => entry.id === button.dataset.useTemplate);
      if (!item) return;
      const edited = window.prompt(text('حرر القالب ثم انسخه', 'Edit the template, then copy it'), item.body);
      if (edited !== null) navigator.clipboard?.writeText(edited);
    }));

    content.querySelectorAll('[data-copy-template]').forEach((button) => button.addEventListener('click', () => {
      const item = templates.find((entry) => entry.id === button.dataset.copyTemplate);
      if (item) navigator.clipboard?.writeText(item.body);
    }));

    content.querySelectorAll('[data-workflow-status]').forEach((button) => button.addEventListener('click', () => {
      const item = data.workflows.find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      item.status = button.dataset.workflowStatus;
      log(`${text('تحديث طلب الاعتماد', 'Updated approval request')}: ${item.title}`);
      render('workflow');
    }));

    content.querySelectorAll('[data-delete-workflow]').forEach((button) => button.addEventListener('click', () => {
      data.workflows = data.workflows.filter((item) => item.id !== button.dataset.deleteWorkflow);
      log(text('حذف طلب اعتماد', 'Deleted approval request'));
      render('workflow');
    }));

    content.querySelectorAll('[data-copy-code]').forEach((button) => button.addEventListener('click', () => navigator.clipboard?.writeText(button.dataset.copyCode)));

    content.querySelectorAll('[data-toggle-portal]').forEach((button) => button.addEventListener('click', () => {
      const portal = data.portals.find((item) => item.id === button.dataset.togglePortal);
      if (!portal) return;
      portal.active = !portal.active;
      log(`${text('تحديث بوابة العميل', 'Updated client portal')}: ${portal.clientId}`);
      render('portal');
    }));

    content.querySelectorAll('[data-update-portal]').forEach((button) => button.addEventListener('click', () => {
      const portal = data.portals.find((item) => item.id === button.dataset.updatePortal);
      if (!portal) return;
      const update = promptValue(text('نص التحديث للعميل', 'Client update text'));
      if (!update) return;
      portal.updates.push({ date: new Date().toISOString().slice(0, 10), text: update });
      log(`${text('إضافة تحديث للعميل', 'Added client update')}: ${portal.clientId}`);
      render('portal');
    }));

    content.querySelectorAll('[data-whatsapp-portal]').forEach((button) => button.addEventListener('click', () => {
      const portal = data.portals.find((item) => item.id === button.dataset.whatsappPortal);
      const client = (baseData().clients || []).find((item) => item.id === portal?.clientId);
      if (!portal || !client) return;
      const message = `مرحبًا ${client.name}، رمز الدخول إلى بوابة متابعة الملف هو: ${portal.code}`;
      window.open(`https://wa.me/${String(client.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }));

    content.querySelectorAll('[data-copy-knowledge]').forEach((button) => button.addEventListener('click', () => {
      const item = data.knowledge.find((entry) => entry.id === button.dataset.copyKnowledge);
      if (item) navigator.clipboard?.writeText(`${item.title}\n\n${item.body}`);
    }));

    content.querySelectorAll('[data-delete-knowledge]').forEach((button) => button.addEventListener('click', () => {
      data.knowledge = data.knowledge.filter((item) => item.id !== button.dataset.deleteKnowledge);
      log(text('حذف مادة معرفية', 'Deleted knowledge item'));
      render('knowledge');
    }));

    const knowledgeSearch = document.getElementById('knowledgeSearch');
    knowledgeSearch?.addEventListener('input', () => {
      const query = knowledgeSearch.value.toLowerCase();
      content.querySelectorAll('.searchable-knowledge').forEach((card) => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });

    const auditSearch = document.getElementById('auditSearch');
    auditSearch?.addEventListener('input', () => {
      const query = auditSearch.value.toLowerCase();
      content.querySelectorAll('.searchable-audit').forEach((card) => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });
  }

  function open(view) {
    if (!renderers[view]) return;
    render(view);
  }

  window.HessaOfficeTools = { open, refreshSidebar: injectSidebar };

  function init() {
    injectSidebar();
    addDashboardHub();

    const content = appContent();
    if (content) {
      const observer = new MutationObserver(() => {
        injectSidebar();
        if (!currentView) addDashboardHub();
      });
      observer.observe(content, { childList: true, subtree: true });
    }

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-office-view]');
      if (!trigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open(trigger.dataset.officeView);
    }, true);

    document.getElementById('homeButton')?.addEventListener('click', () => {
      currentView = '';
      window.setTimeout(addDashboardHub, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
