/* Sabeq Phone Harness: read-only GitHub Actions control center. No personal or case data. */
(() => {
  'use strict';
  const ACTIONS_URL = 'https://github.com/Q8-ux/saad/actions/workflows/sabeq-phone-harness.yml';
  const RUNS_API = 'https://api.github.com/repos/Q8-ux/saad/actions/workflows/sabeq-phone-harness.yml/runs?event=workflow_dispatch&per_page=6';
  const HELP_URL = 'https://github.com/ShawnPana/phone-harness';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const runStates = {queued:'بانتظار التشغيل', in_progress:'قيد الاختبار', completed:'انتهى', waiting:'بانتظار الموافقة', requested:'مطلوب', pending:'معلّق'};
  const conclusions = {success:'نجاح', failure:'فشل', cancelled:'ملغي', timed_out:'تجاوز الوقت', skipped:'تم التخطي', action_required:'يحتاج تدخل', neutral:'غير محسوم'};
  function date(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('ar-KW', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuwait'}).format(parsed);
  }
  function render(element) {
    element.innerHTML = `
      <div class="section-intro"><div>
        <h2>الاختبار الذكي للموقع</h2>
        <p>مسار وكيل الهاتف الذكي (Phone Harness) — فحص واجهة سابق على هاتف أندرويد اختباري، وتوثيق النتائج دون استخدام بيانات العملاء.</p>
      </div></div>
      <div class="banner qa-policy"><strong>حدود التشغيل:</strong> هذه المرحلة تفحص التصفح والعرض والاستجابة فقط. لا تدخل إلى حسابات العملاء، ولا تولد مذكرات مدفوعة، ولا تنفذ دفعاً حقيقياً.</div>
      <div class="qa-cards">
        <section class="panel qa-card"><div class="panel-body">
          <span class="qa-overline">بيئة التنفيذ</span><h3>Android Emulator</h3>
          <p>يجهّز GitHub Actions هاتف أندرويد افتراضياً ويثبت إصداراً محدداً من Phone Harness، ثم يجري الفحص.</p>
          <span class="badge">تشغيل عند الطلب</span>
        </div></section>
        <section class="panel qa-card"><div class="panel-body">
          <span class="qa-overline">نطاق الاختبار الحالي</span><h3>الموقع العام</h3>
          <p>فتح الموقع الرسمي، التحقق من هوية الصفحة الظاهرة، التقاط شاشة الهاتف وفحص التنقل دون تعديل بيانات.</p>
          <span class="badge warning">لا يشمل تدقيق صحة المذكرات</span>
        </div></section>
      </div>
      <section class="panel"><div class="panel-head"><h3>تشغيل فحص جديد</h3></div><div class="panel-body">
        <ol class="qa-steps">
          <li>افتح صفحة الاختبارات على GitHub بحساب يملك صلاحية التشغيل.</li>
          <li>اختر <bdi>Run workflow</bdi> ثم حدّد البيئة المراد اختبارها واضغط التشغيل.</li>
          <li>ارجع إلى هذه الصفحة واضغط «تحديث النتائج» لرؤية الحالة الحقيقية.</li>
        </ol>
        <div class="actions qa-links">
          <a class="qa-link primary" href="${ACTIONS_URL}" target="_blank" rel="noopener noreferrer">فتح تشغيل الاختبارات على GitHub</a>
          <a class="qa-link secondary" href="${HELP_URL}" target="_blank" rel="noopener noreferrer">المسار الأصلي وتعليمات التشغيل</a>
        </div>
        <p class="service-status">التشغيل يتم من GitHub لتجنب حفظ رموز وصول GitHub في المتصفح أو كشف صلاحيات الإدارة. لا يمكن تشغيل هاتف فعلي من لوحة ويب ثابتة دون خادم تشغيل مصرح له.</p>
      </div></section>
      <section class="panel"><div class="panel-head"><h3>نتائج الاختبارات الفعلية</h3><button type="button" data-qa-refresh>تحديث النتائج</button></div>
        <div id="qa-runs" class="panel-body" role="status" aria-live="polite">جارٍ التحقق من سجل GitHub Actions…</div>
      </section>`;
    element.querySelector('[data-qa-refresh]').addEventListener('click', event => { event.stopPropagation(); void loadRuns(element); });
    void loadRuns(element);
  }
  async function loadRuns(element) {
    const node = element.querySelector('#qa-runs');
    if (!node || !element.isConnected) return;
    const button=element.querySelector('[data-qa-refresh]');
    button.disabled=true;
    node.textContent='جارٍ جلب نتائج GitHub الحقيقية…';
    try {
      const response=await fetch(RUNS_API, {headers:{Accept:'application/vnd.github+json'},cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('تعذر قراءة سجل الاختبارات (HTTP '+response.status+').');
      const data=await response.json();
      if (!element.isConnected) return;
      const runs=Array.isArray(data.workflow_runs)?data.workflow_runs:[];
      if (!runs.length) {
        node.innerHTML='<div class="empty"><h3>لم تُجرَ اختبارات بعد</h3><p>لا توجد نتائج مثبتة. شغّل أول اختبار من GitHub لظهور النتائج هنا.</p></div>';
        return;
      }
      node.innerHTML='<div class="qa-run-list">'+runs.map(run=>{
        const label=run.status==='completed'?(conclusions[run.conclusion]||'غير محسوم'):(runStates[run.status]||'قيد المعالجة');
        const kind=run.status!=='completed'?'warning':run.conclusion==='success'?'':run.conclusion==='failure'?'error':'neutral';
        const safeUrl=typeof run.html_url==='string'&&/^https:\/\/github\.com\/Q8-ux\/saad\/actions\/runs\/\d+/.test(run.html_url)?run.html_url:ACTIONS_URL;
        return `<div class="qa-run"><div><strong>الفحص #${escape(run.run_number)}</strong><small>آخر تحديث: ${escape(date(run.updated_at||run.created_at))} · ${escape(run.event||'manual')}</small></div><span class="badge ${kind}">${escape(label)}</span><a href="${escape(safeUrl)}" target="_blank" rel="noopener noreferrer">فتح التقرير</a></div>`;
      }).join('')+'</div>';
    } catch (error) {
      node.innerHTML='<div class="banner error">لم نتمكن من جلب النتائج الآن. قد يكون GitHub غير متاح أو تم تجاوز حد واجهة API. <a href="'+ACTIONS_URL+'" target="_blank" rel="noopener noreferrer">افتح النتائج مباشرة على GitHub</a>.</div>';
    } finally { if (element.isConnected) button.disabled=false; }
  }
  globalThis.SabeqMobileQA={mount:render};
})();
