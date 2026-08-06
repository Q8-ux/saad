(() => {
  'use strict';

  if (typeof renderDashboard !== 'function' || typeof bindViewEvents !== 'function') return;

  const baseBindViewEvents = bindViewEvents;

  const locale = () => state.language === 'ar' ? 'ar-KW' : 'en-US';
  const formatDate = (value, options = {}) => {
    if (!value) return '—';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale(), options).format(date);
  };
  const dayDiff = (value) => {
    const start = new Date(`${today()}T00:00:00`);
    const end = new Date(`${value}T00:00:00`);
    return Math.ceil((end - start) / 86400000);
  };
  const percent = (value, total) => total > 0 ? Math.max(0, Math.min(100, Math.round(value / total * 100))) : 0;
  const pluralText = (ar, en) => state.language === 'ar' ? ar : en;

  renderDashboard = function renderCompleteDashboard() {
    const openCases = state.cases.filter(item => item.status !== 'closed');
    const pendingTasks = state.tasks.filter(item => !item.done);
    const overdueTasks = pendingTasks.filter(item => item.due && item.due < today());
    const upcomingSessions = [...state.sessions]
      .filter(item => item.status === 'upcoming' && item.date >= today())
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const sessionsNextWeek = upcomingSessions.filter(item => dayDiff(item.date) <= 7);
    const pendingIncoming = state.incoming.filter(item => item.status === 'pending');
    const collected = state.invoices.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const due = state.invoices.filter(item => item.status === 'due').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = state.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const net = collected - expenses;
    const completedTasks = state.tasks.filter(item => item.done).length;
    const completion = percent(completedTasks, state.tasks.length);
    const archiveRate = percent(state.documents.length, Math.max(state.cases.length * 3, 1));
    const todayLabel = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const currentHour = new Date().getHours();
    const greeting = state.language === 'ar'
      ? (currentHour < 12 ? 'صباح الخير' : currentHour < 18 ? 'مساء الخير' : 'مساء الخير')
      : (currentHour < 12 ? 'Good morning' : 'Good evening');

    const typeCounts = {};
    state.cases.forEach(item => { typeCounts[item.type] = (typeCounts[item.type] || 0) + 1; });
    const maxType = Math.max(1, ...Object.values(typeCounts));
    const assignedCounts = {};
    state.tasks.filter(item => !item.done).forEach(item => {
      const owner = item.assigned || pluralText('غير محدد', 'Unassigned');
      assignedCounts[owner] = (assignedCounts[owner] || 0) + 1;
    });
    const maxAssigned = Math.max(1, ...Object.values(assignedCounts));

    const alerts = [];
    if (overdueTasks.length) alerts.push({ kind: 'critical', icon: '!', title: pluralText(`${overdueTasks.length} مهام متأخرة`, `${overdueTasks.length} overdue tasks`), text: pluralText('تحتاج إلى إعادة جدولة أو إنجاز فوري.', 'Require immediate completion or rescheduling.'), view: 'tasks' });
    if (sessionsNextWeek.length) alerts.push({ kind: '', icon: '◷', title: pluralText(`${sessionsNextWeek.length} جلسات خلال 7 أيام`, `${sessionsNextWeek.length} hearings within 7 days`), text: pluralText('راجع المذكرات والمستندات المطلوبة قبل الموعد.', 'Review briefs and required documents before each hearing.'), view: 'sessions' });
    if (pendingIncoming.length) alerts.push({ kind: '', icon: '↓', title: pluralText(`${pendingIncoming.length} معاملات واردة معلقة`, `${pendingIncoming.length} pending incoming items`), text: pluralText('لم يتم إغلاق مسار الإحالة الخاص بها.', 'Their assignment workflow is not yet closed.'), view: 'incoming' });
    if (!alerts.length) alerts.push({ kind: 'success', icon: '✓', title: pluralText('لا توجد تنبيهات حرجة', 'No critical alerts'), text: pluralText('المهام والجلسات والمعاملات ضمن المتابعة.', 'Tasks, hearings, and correspondence are under control.'), view: 'dashboard' });

    const agenda = [
      ...upcomingSessions.slice(0, 4).map(item => ({
        date: item.date,
        time: item.time || '—',
        title: item.purpose,
        text: `${item.caseId} • ${item.court}`,
        tag: pluralText('جلسة', 'Hearing'),
        view: 'sessions'
      })),
      ...pendingTasks.slice(0, 4).map(item => ({
        date: item.due,
        time: pluralText('مهمة', 'Task'),
        title: item.title,
        text: `${item.caseId || '—'} • ${item.assigned || '—'}`,
        tag: item.priority === 'high' ? pluralText('عاجلة', 'Urgent') : pluralText('مهمة', 'Task'),
        view: 'tasks',
        taskId: item.id
      }))
    ].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).slice(0, 7);

    const recentActivities = state.activities.slice(0, 6);
    const financialTotal = collected + due;
    const collectionRate = percent(collected, financialTotal);
    const activeRatio = percent(openCases.length, Math.max(state.cases.length, 1));

    return `
      <div class="executive-dashboard">
        <section class="dashboard-command">
          <div class="command-copy">
            <p class="eyebrow">${pluralText('لوحة القيادة القانونية', 'Legal Operations Command Center')}</p>
            <h1>${greeting}، ${pluralText('المحامية حصة العبيد', 'Hessa Al-Obaid')}</h1>
            <p>${pluralText('متابعة متكاملة لأعمال المكتب: القضايا والجلسات والمهام والمراسلات والأرشيف والتحصيل المالي من شاشة تنفيذية واحدة.', 'A complete view of cases, hearings, tasks, correspondence, archive, and financial collection from one executive workspace.')}</p>
            <div class="command-actions">
              <button class="btn btn-light" data-dash-action="add-case">＋ ${t('addNewCase')}</button>
              <button class="btn btn-outline-light" data-dash-view="memo">✎ ${t('memoGenerator')}</button>
              <button class="btn btn-outline-light" data-dash-action="add-document">▤ ${t('archiveDocument')}</button>
              <button class="btn btn-outline-light" data-dash-view="assistant">✦ ${t('smartAssistant')}</button>
            </div>
          </div>
          <aside class="command-side">
            <div class="command-date">
              <div class="date-seal">⚖</div>
              <div><strong>${todayLabel}</strong><span>${pluralText('حالة المكتب المباشرة', 'Live office status')}</span></div>
            </div>
            <div class="office-health">
              <div class="health-row"><span>${pluralText('إنجاز المهام', 'Task completion')}</span><b>${completion}%</b></div>
              <div class="health-meter"><i style="width:${completion}%"></i></div>
              <div class="health-row"><span>${pluralText('جاهزية الأرشيف', 'Archive readiness')}</span><b>${archiveRate}%</b></div>
              <div class="health-meter"><i style="width:${archiveRate}%"></i></div>
              <div class="health-row"><span>${pluralText('القضايا النشطة', 'Active cases')}</span><b>${activeRatio}%</b></div>
              <div class="health-meter"><i style="width:${activeRatio}%"></i></div>
            </div>
          </aside>
        </section>

        <section class="executive-kpis">
          <article class="executive-kpi"><div class="kpi-icon">▣</div><small>${t('activeCases')}</small><strong>${openCases.length}</strong><em>${state.cases.length} ${pluralText('ملفًا إجمالًا', 'total files')}</em></article>
          <article class="executive-kpi"><div class="kpi-icon">◎</div><small>${t('clients')}</small><strong>${state.clients.length}</strong><em>${pluralText('موكلون وجهات', 'clients and entities')}</em></article>
          <article class="executive-kpi ${sessionsNextWeek.length ? 'warning' : ''}"><div class="kpi-icon">◷</div><small>${pluralText('الجلسات القادمة', 'Upcoming hearings')}</small><strong>${upcomingSessions.length}</strong><em>${sessionsNextWeek.length} ${pluralText('خلال أسبوع', 'within one week')}</em></article>
          <article class="executive-kpi ${overdueTasks.length ? 'danger' : ''}"><div class="kpi-icon">✓</div><small>${pluralText('المهام المفتوحة', 'Open tasks')}</small><strong>${pendingTasks.length}</strong><em>${overdueTasks.length} ${pluralText('متأخرة', 'overdue')}</em></article>
          <article class="executive-kpi"><div class="kpi-icon">▤</div><small>${t('archiveDocuments')}</small><strong>${state.documents.length}</strong><em>${pluralText('مستندًا مؤرشفًا', 'archived documents')}</em></article>
          <article class="executive-kpi ${due ? 'warning' : ''}"><div class="kpi-icon">د.ك</div><small>${pluralText('المبالغ المستحقة', 'Outstanding fees')}</small><strong>${money(due)}</strong><em>${pluralText('تحتاج متابعة التحصيل', 'requires collection follow-up')}</em></article>
        </section>

        <section class="dashboard-main-grid">
          <div class="dashboard-stack">
            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">⌁</span><div><h3>${pluralText('التنبيهات التشغيلية', 'Operational alerts')}</h3><small>${pluralText('العناصر التي تحتاج تدخلك الآن', 'Items requiring attention now')}</small></div></div><button class="text-btn" data-dash-view="tasks">${t('viewAll')}</button></div>
              <div class="alert-list">${alerts.map(item => `<div class="alert-item ${item.kind}"><span class="alert-icon">${item.icon}</span><div class="alert-copy"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div><button class="mini-btn" data-dash-view="${item.view}">${t('view')}</button></div>`).join('')}</div>
            </article>

            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">◷</span><div><h3>${pluralText('جدول العمل القادم', 'Upcoming agenda')}</h3><small>${pluralText('الجلسات والمهام مرتبة زمنيًا', 'Hearings and tasks in chronological order')}</small></div></div><button class="text-btn" data-dash-view="sessions">${t('viewAll')}</button></div>
              <div class="dashboard-agenda">${agenda.length ? agenda.map(item => `<div class="agenda-item"><div class="agenda-time"><strong>${esc(item.time)}</strong><span>${formatDate(item.date, { day: 'numeric', month: 'short' })}</span></div><div class="agenda-copy"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></div>${item.taskId ? `<button class="agenda-tag" data-dashboard-task="${item.taskId}">${pluralText('إنجاز', 'Complete')}</button>` : `<span class="agenda-tag">${esc(item.tag)}</span>`}</div>`).join('') : empty()}</div>
            </article>

            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">▣</span><div><h3>${pluralText('توزيع القضايا', 'Case distribution')}</h3><small>${pluralText('الحالة والأنواع القانونية المسجلة', 'Recorded status and legal categories')}</small></div></div><button class="text-btn" data-dash-view="cases">${t('viewAll')}</button></div>
              <div class="case-overview">
                <div class="case-donut" style="--p:${activeRatio}"><div class="case-donut-center"><strong>${state.cases.length}</strong><span>${t('cases')}</span></div></div>
                <div class="case-types">${Object.entries(typeCounts).length ? Object.entries(typeCounts).map(([type, count]) => `<div class="case-type-row"><span>${esc(type)}</span><div class="case-type-track"><i style="width:${Math.round(count / maxType * 100)}%"></i></div><b>${count}</b></div>`).join('') : empty()}</div>
              </div>
            </article>

            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">د.ك</span><div><h3>${pluralText('الملخص المالي', 'Financial summary')}</h3><small>${pluralText('التحصيل والمستحقات والمصروفات', 'Collections, receivables, and expenses')}</small></div></div><button class="text-btn" data-dash-view="finance">${t('viewAll')}</button></div>
              <div class="finance-overview">
                <div class="finance-box positive"><span>${pluralText('المحصل', 'Collected')}</span><strong>${money(collected)}</strong></div>
                <div class="finance-box due"><span>${pluralText('المستحق', 'Outstanding')}</span><strong>${money(due)}</strong></div>
                <div class="finance-box"><span>${pluralText('المصروفات', 'Expenses')}</span><strong>${money(expenses)}</strong></div>
                <div class="finance-box positive"><span>${pluralText('الصافي', 'Net')}</span><strong>${money(net)}</strong></div>
              </div>
              <div class="finance-progress"><div class="finance-progress-head"><span>${pluralText('نسبة التحصيل', 'Collection rate')}</span><b>${collectionRate}%</b></div><div class="finance-track"><i style="width:${collectionRate}%"></i></div></div>
            </article>
          </div>

          <aside class="dashboard-stack">
            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">＋</span><div><h3>${t('quickActions')}</h3><small>${pluralText('وصول مباشر للأعمال المتكررة', 'Direct access to frequent work')}</small></div></div></div>
              <div class="quick-action-grid">
                <button class="quick-action-card" data-dash-action="add-case"><span>▣</span><b>${t('addNewCase')}</b><small>${pluralText('فتح ملف وربطه بالموكل', 'Open and link a case file')}</small></button>
                <button class="quick-action-card" data-dash-action="add-client"><span>◎</span><b>${pluralText('إضافة عميل', 'Add client')}</b><small>${pluralText('إنشاء سجل موكل جديد', 'Create a new client record')}</small></button>
                <button class="quick-action-card" data-dash-action="add-session"><span>◷</span><b>${pluralText('إضافة جلسة', 'Add hearing')}</b><small>${pluralText('موعد ودائرة وموضوع', 'Date, circuit, and purpose')}</small></button>
                <button class="quick-action-card" data-dash-action="add-task"><span>✓</span><b>${pluralText('إضافة مهمة', 'Add task')}</b><small>${pluralText('تكليف ومهلة وأولوية', 'Assignee, deadline, priority')}</small></button>
                <button class="quick-action-card" data-dash-action="add-document"><span>▤</span><b>${t('archiveDocument')}</b><small>${pluralText('ربط بالقضية والتصنيف', 'Link to case and category')}</small></button>
                <button class="quick-action-card" data-dash-view="whatsapp"><span>◉</span><b>${t('messageClient')}</b><small>${pluralText('قالب تحديث أو تذكير', 'Update or reminder template')}</small></button>
              </div>
            </article>

            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">♙</span><div><h3>${pluralText('عبء العمل', 'Team workload')}</h3><small>${pluralText('المهام المفتوحة حسب المكلف', 'Open tasks by assignee')}</small></div></div><button class="text-btn" data-dash-view="tasks">${t('viewAll')}</button></div>
              <div class="workload-list">${Object.entries(assignedCounts).length ? Object.entries(assignedCounts).map(([name, count]) => `<div class="workload-item"><span class="workload-avatar">${esc(name.trim().charAt(0) || '؟')}</span><div class="workload-copy"><strong>${esc(name)}</strong><span>${count} ${pluralText('مهام مفتوحة', 'open tasks')}</span><div class="workload-meter"><i style="width:${Math.round(count / maxAssigned * 100)}%"></i></div></div><b class="workload-count">${count}</b></div>`).join('') : empty()}</div>
            </article>

            <article class="dashboard-panel">
              <div class="panel-head"><div class="panel-title-wrap"><span class="panel-symbol">↻</span><div><h3>${pluralText('آخر النشاطات', 'Recent activity')}</h3><small>${pluralText('سجل آخر التحديثات داخل النظام', 'Latest system updates')}</small></div></div><button class="text-btn" data-dash-view="reports">${t('viewAll')}</button></div>
              <div class="activity-feed">${recentActivities.length ? recentActivities.map(item => `<div class="activity-row"><strong>${esc(item.text)}</strong><span>${esc(item.date)}</span></div>`).join('') : empty()}</div>
            </article>
          </aside>
        </section>

        <section class="dashboard-footer-tools">
          <div class="system-indicators">
            <span class="system-pill"><i></i>${pluralText('النظام يعمل', 'System online')}</span>
            <span class="system-pill"><i></i>${state.documents.length} ${pluralText('مستندًا', 'documents')}</span>
            <span class="system-pill"><i></i>${state.users.filter(item => item.status === 'active').length} ${pluralText('مستخدمين نشطين', 'active users')}</span>
            <span class="system-pill"><i></i>${pluralText('حفظ محلي مفعل', 'Local storage enabled')}</span>
          </div>
          <div class="dashboard-footer-actions">
            <button class="btn btn-secondary" id="dashboardExport">↓ ${pluralText('تصدير ملخص', 'Export summary')}</button>
            <button class="btn btn-secondary" id="dashboardPrint">▧ ${t('print')}</button>
          </div>
        </section>
      </div>`;
  };

  bindViewEvents = function bindCompleteDashboardEvents(view) {
    baseBindViewEvents(view);
    if (view !== 'dashboard') return;

    appContent.querySelectorAll('[data-dash-view]').forEach(button => {
      button.addEventListener('click', () => switchView(button.dataset.dashView));
    });

    appContent.querySelectorAll('[data-dash-action]').forEach(button => {
      button.addEventListener('click', () => openAction(button.dataset.dashAction, button.dataset));
    });

    appContent.querySelectorAll('[data-dashboard-task]').forEach(button => {
      button.addEventListener('click', () => {
        const task = state.tasks.find(item => item.id === button.dataset.dashboardTask);
        if (!task) return;
        task.done = true;
        logActivity(`${pluralText('تم إنجاز المهمة', 'Task completed')}: ${task.title}`);
        saveState();
        renderView('dashboard');
        toast(pluralText('تم تسجيل إنجاز المهمة', 'Task marked as completed'));
      });
    });

    document.getElementById('dashboardPrint')?.addEventListener('click', () => window.print());
    document.getElementById('dashboardExport')?.addEventListener('click', exportDashboardSummary);
  };

  function exportDashboardSummary() {
    const rows = [
      [pluralText('المؤشر', 'Metric'), pluralText('القيمة', 'Value')],
      [t('clients'), state.clients.length],
      [t('cases'), state.cases.length],
      [t('activeCases'), state.cases.filter(item => item.status !== 'closed').length],
      [t('sessions'), state.sessions.filter(item => item.status === 'upcoming').length],
      [t('tasks'), state.tasks.filter(item => !item.done).length],
      [t('archiveDocuments'), state.documents.length],
      [pluralText('المبالغ المحصلة', 'Collected fees'), state.invoices.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0)],
      [pluralText('المبالغ المستحقة', 'Outstanding fees'), state.invoices.filter(item => item.status === 'due').reduce((sum, item) => sum + Number(item.amount || 0), 0)]
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hessa-law-dashboard-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast(pluralText('تم تصدير ملخص لوحة التحكم', 'Dashboard summary exported'));
  }

  const app = document.getElementById('appShell');
  if (app && !app.classList.contains('hidden') && state.currentView === 'dashboard') {
    renderView('dashboard');
  }
})();
