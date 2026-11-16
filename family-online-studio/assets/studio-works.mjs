import { importManuscriptFile, prepareImportedDocument, summarizeImportedDocument } from './manuscript-import.mjs?v=6ddd1b7fb058';

const kinds = {
  film: 'فيلم',
  series: 'مسلسل',
  play: 'مسرحية',
  'book-ar': 'كتاب عربي',
  'book-en': 'كتاب إنجليزي',
};

const metricLabels = {
  units: 'حلقات / فصول', scenes: 'مشاهد', characters: 'شخصيات', dialogues: 'حوارات', actions: 'وصف وعناصر',
  chapters: 'فصول', paragraphs: 'فقرات', headings: 'عناوين', words: 'كلمات',
};
const number = new Intl.NumberFormat('ar-KW');

export function createStudioWorks({ React, Studio }) {
  const h = React.createElement;
  return function StudioWorks({ account, requestStudio, onSignOut }) {
    const [verified, setVerified] = React.useState(null);
    const [projects, setProjects] = React.useState(null);
    const [active, setActive] = React.useState(null);
    const [tab, setTab] = React.useState('works');
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [newWork, setNewWork] = React.useState(false);
    const [reload, setReload] = React.useState(0);
    const [deleteTarget, setDeleteTarget] = React.useState(null);
    const [title, setTitle] = React.useState('');
    const [kind, setKind] = React.useState('');
    const [createMode, setCreateMode] = React.useState('empty');
    const [importPlan, setImportPlan] = React.useState(null);
    const [importBusy, setImportBusy] = React.useState(false);
    const fileInput = React.useRef(null);

    async function request(payload, signal) {
      const response = await requestStudio('/api/projects', {
        signal,
        ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
      });
      if (response.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل الأعمال.');
      return result;
    }

    function applyCatalogue(result) {
      if (result.account?.id !== account.id || !Array.isArray(result.projects)) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('تعذر التحقق من الحساب.');
      }
      setVerified({ id: result.account.id, username: result.account.username || account.username });
      setProjects(result.projects);
    }

    function choose(id) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('work', id);
      else url.searchParams.delete('work');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      setDeleteTarget(null);
      setActive(id);
    }

    function selectTab(next) {
      setTab(next);
      setDeleteTarget(null);
      if (next === 'archive') setNewWork(false);
    }

    function resetCreateForm() {
      setTitle('');
      setKind('');
      setCreateMode('empty');
      setImportPlan(null);
      if (fileInput.current) fileInput.current.value = '';
    }

    function toggleNewWork() {
      if (newWork) resetCreateForm();
      setNewWork(value => !value);
      setError('');
      setNotice('');
    }

    function clearImport() {
      setImportPlan(null);
      if (fileInput.current) fileInput.current.value = '';
    }

    async function inspectFile(file) {
      if (!file) return;
      setImportBusy(true);
      setError('');
      setNotice('');
      try {
        const plan = await importManuscriptFile(file, { preferredKind: kind });
        setImportPlan(plan);
        setTitle(plan.title);
        setKind(plan.recommendedKind);
        setNotice('تم تحليل الملف. راجع نتيجة التوزيع قبل إنشاء المشروع.');
      } catch (failure) {
        clearImport();
        setError(failure.message || 'تعذر قراءة الملف.');
      } finally { setImportBusy(false); }
    }

    async function writeImportedManuscript(projectId, document, format) {
      const path = '/api/manuscript?work=' + encodeURIComponent(projectId);
      const initialResponse = await requestStudio(path, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
      if (initialResponse.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const initial = await initialResponse.json();
      if (!initialResponse.ok || !Number.isSafeInteger(initial.revision)) throw new Error(initial.error || 'تعذر تجهيز مساحة الملف.');
      const savedResponse = await requestStudio(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ doc: document, revision: initial.revision, snapshot: 'الاستيراد الأولي من ' + format }),
      });
      if (savedResponse.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const saved = await savedResponse.json();
      if (!savedResponse.ok || saved.revision !== initial.revision + 1 || !saved.updatedAt) throw new Error(saved.error || 'لم يؤكد الخادم حفظ النص المستورد.');
      return saved;
    }

    async function createProject() {
      setBusy(true);
      setError('');
      setNotice('');
      let createdId = '';
      try {
        if (!title.trim() || !kinds[kind]) throw new Error('أدخل عنوان المشروع واختر نوعه.');
        if (createMode === 'file' && !importPlan) throw new Error('ارفع الملف وانتظر اكتمال تحليله أولًا.');
        const document = importPlan && createMode === 'file'
          ? prepareImportedDocument(importPlan, { title: title.trim(), kind })
          : null;
        const result = await request({ action: 'create', title: title.trim(), kind }, AbortSignal.timeout(60000));
        if (!result.id) throw new Error('لم يُرجع الخادم معرّف المشروع الجديد.');
        createdId = result.id;
        if (document) await writeImportedManuscript(createdId, document, importPlan.format);
        const current = await request(null, AbortSignal.timeout(60000));
        applyCatalogue(current);
        setNewWork(false);
        resetCreateForm();
        choose(createdId);
      } catch (failure) {
        if (createdId && importPlan && createMode === 'file') {
          try { await request({ action: 'delete', id: createdId }, AbortSignal.timeout(30000)); } catch { /* A clear retry message is safer than hiding the original failure. */ }
        }
        setError(failure.message || 'تعذر إنشاء المشروع. حاول مرة أخرى.');
      } finally { setBusy(false); }
    }

    const previewMetrics = React.useMemo(() => {
      if (!importPlan) return null;
      try {
        return summarizeImportedDocument(prepareImportedDocument(importPlan, { title: importPlan.title, kind: kind || importPlan.recommendedKind }));
      } catch { return importPlan.metrics; }
    }, [importPlan, kind]);

    React.useEffect(() => {
      const controller = new AbortController();
      setError('');
      request(null, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        applyCatalogue(result);
        const requested = new URL(window.location.href).searchParams.get('work');
        if (requested) choose(result.projects.some(work => work.id === requested && !work.archivedAt) ? requested : null);
      }).catch(() => { if (!controller.signal.aborted) setError('تعذر تحميل أعمالك. حاول مرة أخرى.'); });
      return () => controller.abort();
    }, [requestStudio, reload]);

    async function change(payload) {
      setBusy(true);
      setError('');
      setNotice('');
      try {
        const result = await request(payload, AbortSignal.timeout(60000));
        if (payload.action === 'delete') {
          if (result.id !== payload.id) throw new Error('تعذر التحقق من حذف المشروع.');
          setProjects(items => items.filter(work => work.id !== payload.id));
          setDeleteTarget(null);
          setNotice('تم حذف المشروع.');
          return;
        }
        const current = await request(null, AbortSignal.timeout(60000));
        applyCatalogue(current);
        setDeleteTarget(null);
        if (payload.action === 'create') {
          setNewWork(false);
          choose(result.id);
        }
      } catch (failure) {
        setError(failure.message || 'تعذر تحديث العمل. حاول مرة أخرى.');
      } finally { setBusy(false); }
    }

    if (active && verified) return h(Studio, {
      key: verified.id + ':' + active,
      requestedWork: active,
      userKey: verified.id === 'owner' ? 'external-private-owner' : 'external-studio:' + verified.id,
      onSignOut,
      onWorks: () => { choose(null); setReload(value => value + 1); },
    });

    const archive = tab === 'archive';
    const visible = projects?.filter(work => Boolean(work.archivedAt) === archive) ?? [];
    const username = verified?.username || account.username;
    return h('main', { className: 'studio-workspaces', dir: 'rtl' },
      h('header', { className: 'workspace-header' },
        h('h1', null, 'استيديو الكتابة'),
        h('div', { className: 'workspace-account', role: 'group', 'aria-label': 'الحساب الحالي' },
          username && h('div', { className: 'workspace-identity' },
            h('span', null, 'اسم المستخدم'),
            h('bdi', null, username)),
          h('button', { type: 'button', className: 'workspace-sign-out', onClick: onSignOut }, 'تسجيل الخروج'))),
      h('nav', { 'aria-label': 'أقسام أعمالك' },
        h('button', { type: 'button', 'aria-pressed': !archive, disabled: busy, onClick: () => selectTab('works') }, 'أعمالي'),
        h('button', { type: 'button', 'aria-pressed': archive, disabled: busy, onClick: () => selectTab('archive') }, 'الأرشيف'),
        !archive && projects && h('button', { type: 'button', className: 'workspace-primary', disabled: busy || importBusy, onClick: toggleNewWork }, newWork ? 'إغلاق' : 'مشروع جديد')),
      error && h('p', { role: 'alert' }, error),
      notice && h('p', { role: 'status' }, notice),
      !projects && (error
        ? h('button', { type: 'button', onClick: () => setReload(value => value + 1) }, 'إعادة المحاولة')
        : h('p', { role: 'status' }, 'جارٍ فتح مساحة أعمالك…')),
      newWork && !archive && h('form', { className: 'workspace-create', 'aria-busy': busy || importBusy, onSubmit: event => {
        event.preventDefault();
        void createProject();
      } },
      h('fieldset', { className: 'workspace-create-mode', disabled: busy || importBusy },
        h('legend', null, 'كيف تريد بدء المشروع؟'),
        h('button', { type: 'button', 'aria-pressed': createMode === 'empty', onClick: () => { setCreateMode('empty'); clearImport(); } }, 'مشروع فارغ'),
        h('button', { type: 'button', 'aria-pressed': createMode === 'file', onClick: () => setCreateMode('file') }, 'البدء من ملف')),
      createMode === 'file' && h('section', { className: 'workspace-import', 'aria-label': 'استيراد ملف الكتابة' },
        h('label', { className: 'workspace-import-drop', onDragOver: event => event.preventDefault(), onDrop: event => {
          event.preventDefault();
          if (!busy && !importBusy) void inspectFile(event.dataTransfer.files?.[0]);
        } },
          h('strong', null, importBusy ? 'جارٍ قراءة الملف وتوزيعه…' : importPlan ? 'اختيار ملف آخر' : 'رفع ملف الكتابة'),
          h('span', null, 'Word DOCX، Final Draft FDX، Fountain، TXT، Markdown، أو نسخة JSON'),
          h('input', { ref: fileInput, className: 'workspace-file-input', type: 'file',
            accept: '.docx,.fdx,.fountain,.txt,.md,.markdown,.json', disabled: busy || importBusy,
            onChange: event => void inspectFile(event.target.files?.[0]) })),
        importPlan && h('article', { className: 'workspace-import-summary' },
          h('div', { className: 'workspace-import-heading' },
            h('div', null,
              h('strong', { dir: 'auto' }, importPlan.fileName),
              h('small', null, importPlan.format, ' · اقتراح النظام: ', kinds[importPlan.recommendedKind])),
            h('button', { type: 'button', disabled: busy || importBusy, onClick: clearImport, 'aria-label': 'إزالة الملف المرفوع' }, 'إزالة')),
          h('dl', { className: 'workspace-import-metrics' }, Object.entries(previewMetrics || importPlan.metrics).map(([key, value]) =>
            h('div', { key }, h('dt', null, metricLabels[key] || key), h('dd', null, number.format(value))))),
          importPlan.warnings.map((warning, index) => h('p', { key: index, className: 'workspace-import-warning' }, warning)),
          kind && kind !== importPlan.recommendedKind && h('p', { className: 'workspace-import-note' }, 'سيُعاد توزيع المحتوى وفق نوع المشروع الذي اخترته عند الإنشاء.'),
          h('p', { className: 'workspace-import-note' }, 'الملف نفسه لا يُرفع إلى مساحة مشتركة؛ يُحفظ النص المنظّم داخل حسابك فقط.'))),
      h('label', null, 'عنوان المشروع', h('input', { name: 'title', dir: 'auto', required: true, maxLength: 250, disabled: busy || importBusy, value: title, onChange: event => setTitle(event.target.value) })),
      h('label', null, 'نوع المشروع', h('select', { name: 'kind', value: kind, required: true, disabled: busy || importBusy, onChange: event => setKind(event.target.value) },
        h('option', { value: '', disabled: true }, 'اختر نوع المشروع'),
        h('optgroup', { label: 'الأعمال الدرامية' }, ['film', 'series', 'play'].map(value => h('option', { key: value, value }, kinds[value]))),
        h('optgroup', { label: 'الكتب' }, ['book-ar', 'book-en'].map(value => h('option', { key: value, value }, kinds[value]))))),
      importPlan && createMode === 'file' && h('p', { className: 'workspace-import-review' }, 'راجع الأعداد والتصنيف أعلاه؛ يمكنك تعديل المشروع بعد الاستيراد.'),
      h('button', { type: 'submit', className: 'workspace-primary', disabled: busy || importBusy || (createMode === 'file' && !importPlan) },
        busy ? 'جارٍ إنشاء المشروع وحفظ النص…' : createMode === 'file' ? 'إنشاء المشروع واستيراد الملف' : 'إنشاء المشروع')),
      projects && (visible.length
        ? h('ul', { 'aria-label': archive ? 'الأعمال المؤرشفة' : 'الأعمال الحالية' }, visible.map(work => {
          const confirming = deleteTarget === work.id;
          const promptId = 'workspace-delete-' + work.id;
          return h('li', { key: work.id },
            h('div', null, h('strong', { dir: 'auto' }, work.title), h('small', null, kinds[work.kind])),
            h('div', { className: 'workspace-actions' },
              !archive && h('button', { type: 'button', disabled: busy, onClick: () => choose(work.id) }, 'فتح'),
              h('button', { type: 'button', disabled: busy, 'aria-label': `${archive ? 'استعادة' : 'أرشفة'} ${work.title}`,
                onClick: () => void change({ action: archive ? 'restore' : 'archive', id: work.id }) }, archive ? 'استعادة' : 'أرشفة'),
              h('button', { type: 'button', className: 'workspace-danger', disabled: busy, 'aria-label': 'حذف ' + work.title,
                'aria-expanded': confirming, 'aria-controls': confirming ? promptId : undefined,
                onClick: () => setDeleteTarget(confirming ? null : work.id) }, 'حذف')),
            confirming && h('div', { id: promptId, className: 'workspace-delete-prompt', role: 'group', 'aria-labelledby': promptId + '-title' },
              h('p', { id: promptId + '-title' }, 'حذف مشروع «', h('bdi', null, work.title), '»؟'),
              h('p', null, 'سيُزال المشروع من أعمالك وأرشيفك.'),
              h('div', { className: 'workspace-actions' },
                h('button', { type: 'button', autoFocus: true, disabled: busy, onClick: () => setDeleteTarget(null) }, 'إلغاء'),
                h('button', { type: 'button', className: 'workspace-danger workspace-danger-confirm', disabled: busy,
                  onClick: () => void change({ action: 'delete', id: work.id }) }, 'تأكيد الحذف'))));
        }))
        : h('p', { className: 'workspace-empty' }, archive ? 'أرشيفك فارغ.' : 'ابدأ بإضافة أول عمل.')));
  };
}
