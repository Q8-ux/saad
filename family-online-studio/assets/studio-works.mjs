const kinds = {
  film: 'فيلم',
  series: 'مسلسل',
  play: 'مسرحية',
  'book-ar': 'كتاب عربي',
  'book-en': 'كتاب إنجليزي',
};

export function createStudioWorks({ React, Studio }) {
  const h = React.createElement;
  return function StudioWorks({ account, requestStudio, onSignOut }) {
    const [verified, setVerified] = React.useState(null);
    const [projects, setProjects] = React.useState(null);
    const [active, setActive] = React.useState(null);
    const [tab, setTab] = React.useState('works');
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [newWork, setNewWork] = React.useState(false);
    const [reload, setReload] = React.useState(0);

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
      setActive(id);
    }

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
      try {
        const result = await request(payload, AbortSignal.timeout(60000));
        const current = await request(null, AbortSignal.timeout(60000));
        applyCatalogue(current);
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
        h('button', { type: 'button', 'aria-pressed': !archive, disabled: busy, onClick: () => setTab('works') }, 'أعمالي'),
        h('button', { type: 'button', 'aria-pressed': archive, disabled: busy, onClick: () => { setTab('archive'); setNewWork(false); } }, 'الأرشيف'),
        !archive && projects && h('button', { type: 'button', className: 'workspace-primary', disabled: busy, onClick: () => setNewWork(value => !value) }, newWork ? 'إغلاق' : 'مشروع جديد')),
      error && h('p', { role: 'alert' }, error),
      !projects && (error
        ? h('button', { type: 'button', onClick: () => setReload(value => value + 1) }, 'إعادة المحاولة')
        : h('p', { role: 'status' }, 'جارٍ فتح مساحة أعمالك…')),
      newWork && !archive && h('form', { onSubmit: event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void change({ action: 'create', title: fields.get('title'), kind: fields.get('kind') });
      } },
      h('label', null, 'عنوان المشروع', h('input', { name: 'title', dir: 'auto', required: true, maxLength: 250, disabled: busy })),
      h('label', null, 'نوع المشروع', h('select', { name: 'kind', defaultValue: '', required: true, disabled: busy },
        h('option', { value: '', disabled: true }, 'اختر نوع المشروع'),
        h('optgroup', { label: 'الأعمال الدرامية' }, ['film', 'series', 'play'].map(value => h('option', { key: value, value }, kinds[value]))),
        h('optgroup', { label: 'الكتب' }, ['book-ar', 'book-en'].map(value => h('option', { key: value, value }, kinds[value]))))),
      h('button', { type: 'submit', className: 'workspace-primary', disabled: busy }, 'إنشاء المشروع')),
      projects && (visible.length
        ? h('ul', { 'aria-label': archive ? 'الأعمال المؤرشفة' : 'الأعمال الحالية' }, visible.map(work =>
          h('li', { key: work.id },
            h('div', null, h('strong', { dir: 'auto' }, work.title), h('small', null, kinds[work.kind])),
            h('div', { className: 'workspace-actions' },
              !archive && h('button', { type: 'button', disabled: busy, onClick: () => choose(work.id) }, 'فتح'),
              h('button', { type: 'button', disabled: busy, 'aria-label': `${archive ? 'استعادة' : 'أرشفة'} ${work.title}`,
                onClick: () => void change({ action: archive ? 'restore' : 'archive', id: work.id }) }, archive ? 'استعادة' : 'أرشفة')))))
        : h('p', { className: 'workspace-empty' }, archive ? 'أرشيفك فارغ.' : 'ابدأ بإضافة أول عمل.')));
  };
}
