import { icon } from './icons.js';
import { courts, format, languages, memoBodyLimit, memoDocuments, memoLineRole, types } from './memo-format.js?v=2.1';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const dateFormat = new Intl.DateTimeFormat('ar-KW', { timeZone: 'Asia/Kuwait', dateStyle: 'medium' });
const numbers = new Intl.NumberFormat('ar-KW');
const currency = new Intl.NumberFormat('ar-KW', { style: 'currency', currency: 'KWD' });
const memoTypes = Object.keys(types);
const statuses = { review: 'تحتاج مراجعة', approved: 'معتمدة داخليًا', archived: 'مؤرشفة' };
const kinds = { law: 'القوانين والتشريعات', article: 'المواد القانونية', judgment: 'الأحكام والمبادئ' };
const state = { account: null, model: false, setup: false, authMode: 'login', version: 0, memo: null,
  compose: null, references: new Map(), selected: new Set(), clients: new Map(), editorDirty: false,
  memoLanguage: '', chat: [], attachmentsAvailable: false, uploads: new Map() };
let toastTimeout;

const h = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
const date = value => value ? dateFormat.format(new Date(value)) : '—';
const n = value => numbers.format(value);
const path = (name, options = {}) => {
  const query = new URLSearchParams(Object.entries(options).filter(([, value]) => value !== '' && value != null)).toString();
  return `#${name}${query ? '?' + query : ''}`;
};
const badge = (label, tone = '') => `<span class="badge ${h(tone)}">${h(label)}</span>`;
const button = (label, action, glyph, tone = 'secondary', attrs = '') =>
  `<button type="button" class="button ${tone}" data-action="${action}" ${attrs}>${glyph ? icon(glyph,16) : ''}${h(label)}</button>`;
const link = (label, href, glyph, tone = 'secondary', attrs = '') =>
  `<a class="button ${tone}" href="${h(href)}" ${attrs}>${glyph ? icon(glyph,16) : ''}${h(label)}</a>`;
const external = (label, url) => link(label, url, 'external', 'secondary', 'target="_blank" rel="noopener noreferrer"');
const sourceButton = (item, title) => item.origin === 'corpus' ? button(title,'reference-detail','book','secondary',
  `data-id="${h(item.id)}"`) : external(title,item.sourceUrl);
const label = (title, control, wide = false) => `<label class="field${wide ? ' span' : ''}"><span>${h(title)}</span>${control}</label>`;
const input = (name, value = '', attrs = '') => `<input name="${name}" value="${h(value)}" ${attrs}>`;
const textarea = (name, value = '', attrs = '') => `<textarea name="${name}" ${attrs}>${h(value)}</textarea>`;
const option = (value, text, selected) => `<option value="${h(value)}"${value === selected ? ' selected' : ''}>${h(text)}</option>`;
const submit = (title, glyph) => `<button type="submit" class="button primary">${glyph ? icon(glyph,16) : ''}${h(title)}</button>`;
const errorBox = '<p class="form-error" role="alert" hidden></p>';
const note = (message, tone = '') => `<p class="notice ${tone}">${h(message)}</p>`;
const avatar = name => `<span class="avatar" aria-hidden="true">${h([...name][0] || 'ت')}</span>`;
const panelHead = (title, action = '') => `<div class="panel-head"><h2>${h(title)}</h2>${action}</div>`;
const heading = (title, description = '', action = '') =>
  `<header class="page-heading"><div><h1>${h(title)}</h1>${description ? `<p>${h(description)}</p>` : ''}</div>${action}</header>`;
const empty = (glyph, title, copy, action = '') =>
  `<div class="empty"><span class="empty-mark">${icon(glyph,22)}</span><h3>${h(title)}</h3>${copy ? `<p>${h(copy)}</p>` : ''}${action}</div>`;

async function api(endpoint, { method = 'GET', data, binary, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${endpoint}`, {
      method, cache: 'no-store', credentials: 'same-origin',
      signal,
      ...(binary ? { headers: { 'Content-Type': 'application/octet-stream' }, body: binary } :
        data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    });
  } catch {
    throw new Error('تعذر الاتصال بتحكيم. أعد المحاولة.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && payload.error?.startsWith('الاشتراك غير نشط') && state.account) {
      state.account.active = false;
      location.hash = 'subscription';
    }
    if (response.status === 401 && state.account) {
      clearSession();
      authPage();
    }
    throw Object.assign(new Error(payload.error || 'تعذر تنفيذ الطلب.'), { status: response.status });
  }
  return payload;
}

function clearSession() {
  Object.assign(state, { account: null, authMode: 'login', memo: null, compose: null, editorDirty: false,
    memoLanguage: '', chat: [] });
  state.references.clear();
  state.selected.clear();
  state.clients.clear();
  for (const upload of state.uploads.values()) upload.controller?.abort();
  state.uploads.clear();
  if (dialog.open) dialog.close();
  state.version++;
}

function flash(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.hidden = false;
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 3400);
}

function brand() {
  return `<div class="brand"><span class="brand-mark">${icon('logo',25)}</span>
    <div><strong class="brand-title">تحكيم</strong><span class="brand-detail">مساحة العمل القانونية</span></div></div>`;
}

function artwork() {
  return `<div class="hero-art" aria-hidden="true"><div class="hero-ring"></div>
    <div class="hero-docket">${icon('scale',54)}</div><span class="hero-spark">${icon('spark',24)}</span></div>`;
}

function authPage() {
  const invite = /^#invite=([\w-]{43})$/.exec(location.hash)?.[1];
  const mode = invite ? 'invite' : state.authMode === 'setup' && state.setup ? 'setup' : 'login';
  const info = {
    login: ['تسجيل الدخول', 'ادخل إلى مذكراتك والمكتبة القانونية بحسابك.'],
    setup: ['تهيئة حساب المالك', 'أنشئ الحساب الذي سيدير دعوات العملاء والاشتراكات.'],
    invite: ['تفعيل حساب العميل', 'اختر كلمة مرور لدخول مساحة عملك.'],
  }[mode];
  app.innerHTML = `<main class="auth-layout" id="main"><section class="auth-brand">${brand()}
    <h1>مذكراتك ومراجعك في مساحة واحدة</h1>
    <p>لوحة عمل عربية للمذكرات القضائية والبحث في المصادر الكويتية.</p>${artwork()}</section>
    <div class="auth-body"><section class="auth-box"><h2>${info[0]}</h2><p>${info[1]}</p>
    <form class="stack" data-form="${mode}">
      ${mode === 'setup' ? label('الاسم',input('name','','autocomplete="name" required minlength="2" maxlength="100"')) : ''}
      ${mode !== 'invite' ? label('البريد الإلكتروني',input('email','','type="email" dir="ltr" autocomplete="username" required maxlength="254"')) : ''}
      ${mode === 'setup' ? label('رمز التهيئة',input('code','','dir="ltr" type="password" required autocomplete="off"')) : ''}
      ${label('كلمة المرور',input('password','',`type="password" dir="ltr" maxlength="128" required autocomplete="${mode==='login'?'current-password':'new-password'}" ${mode==='login'?'':'minlength="12"'}`))}
      ${errorBox}${submit(mode === 'login' ? 'دخول' : mode === 'setup' ? 'إنشاء حساب المالك' : 'تفعيل حسابي', 'left')}
    </form>
    ${mode === 'login' && state.setup ? button('تهيئة حساب المالك','setup-mode',null,'subtle') : ''}
    ${mode !== 'login' ? button('العودة إلى تسجيل الدخول','login-mode',null,'subtle') : ''}
    </section></div></main>`;
}

function navItem(title, href, glyph, current) {
  return `<a class="nav-item" href="${h(href)}"${current ? ' aria-current="page"' : ''}>${icon(glyph,18)}${h(title)}</a>`;
}

function shell(route, pageTitle, content) {
  const account = state.account;
  const current = (name, opts = {}) => route.name === name &&
    Object.entries(opts).every(([key,value]) => (route.query.get(key) || 'law') === value);
  const nav = (title, name, glyph, opts) => navItem(title,path(name,opts),glyph,current(name,opts));
  const workNav = account.active ? `<div class="nav-group"><p class="nav-label">مساحة العمل</p>
    ${nav('نظرة عامة','overview','grid')}
    ${nav('مذكراتي','memos','files')}
    ${nav('مذكرة جديدة','compose','edit')}
    ${nav('المحكّم الذكي','arbitrator','spark')}</div>
    <div class="nav-group"><p class="nav-label">المكتبة القانونية</p>
    ${nav(kinds.law,'library','book',{kind:'law'})}
    ${nav(kinds.article,'library','file',{kind:'article'})}
    ${nav('المرافعات والإجراءات','procedures','layers')}
    ${nav(kinds.judgment,'library','scale',{kind:'judgment'})}
    ${nav('دليل المحاكم','courts','logo')}</div>` : '';
  app.innerHTML = `<div class="shell">
    <button type="button" class="overlay" data-action="menu-close" tabindex="-1" aria-label="إغلاق القائمة"></button>
    <aside class="sidebar" id="navigation">${brand()}
      <button class="icon-btn sidebar-close" type="button" data-action="menu-close" aria-label="إغلاق القائمة">${icon('x',18)}</button>
      <nav class="navigation" aria-label="أقسام تحكيم">${workNav}
        <div class="nav-group"><p class="nav-label">الحساب</p>
          ${account.role === 'owner' ? nav('العملاء والاشتراكات','clients','users') : ''}
          ${nav(account.role === 'owner' ? 'سجل التحصيل' : 'اشتراكي','subscription','cards')}
        </div></nav>
      <div class="sidebar-bottom"><a class="account-link" href="#subscription">${avatar(account.name)}
        <span class="account-copy"><strong>${h(account.name)}</strong><small>${account.role === 'owner' ? 'مالك المنصة' : 'حساب عميل'}</small></span>
        <span class="chevron">${icon('chevron',15)}</span></a></div>
    </aside>
    <div class="work-area"><header class="topbar">
      <div class="breadcrumb"><button class="icon-btn menu-button" type="button" data-action="menu-open" aria-label="فتح القائمة" aria-expanded="false" aria-controls="navigation">${icon('menu',19)}</button>
        <span>تحكيم</span>${icon('chevron',13)}<strong>${h(pageTitle)}</strong></div>
      <div class="top-actions"><span class="date-chip">${icon('calendar',16)}${h(date(Date.now()))}</span>
        ${account.active ? `<button class="icon-btn" type="button" data-action="go-search" aria-label="بحث المكتبة">${icon('search',18)}</button>` : ''}
        <button class="icon-btn" type="button" data-action="logout" aria-label="تسجيل الخروج">${icon('logout',18)}</button></div>
    </header>
    ${account.active ? `<a class="arbitrator-launcher" href="#arbitrator" aria-label="فتح المحكّم الذكي"
      title="المحكّم الذكي"${current('arbitrator') ? ' aria-current="page"' : ''}>${icon('spark',25)}</a>` : ''}
    <main class="workspace" id="main" tabindex="-1">${content}</main></div></div>`;
}

function statusBadge(status) { return badge(statuses[status] || status, status); }

function memoTable(records, overview = false) {
  return `<div class="table-wrap"><table aria-label="المذكرات"><thead><tr><th scope="col">المذكرة</th>
    ${overview ? '' : '<th scope="col">رقم القضية</th>'}<th scope="col">الحالة</th><th scope="col">آخر تحديث</th></tr></thead>
    <tbody>${records.map(row => `<tr><td><a class="record-link" href="#memo/${h(row.id)}">${h(row.title)}</a>
    <span class="record-sub">${h(row.memo_type)}</span></td>
    ${overview ? '' : `<td><bdi>${h(row.case_number || '—')}</bdi></td>`}<td>${statusBadge(row.status)}</td><td>${h(date(row.updated_at))}</td></tr>`).join('')}</tbody></table></div>`;
}

function overview(data) {
  const stat = (name, value, href, glyph, tone) => `<a class="stat" href="${href}">
    <span class="stat-icon ${tone}">${icon(glyph,21)}</span><span class="stat-copy"><strong>${n(value)}</strong><span>${h(name)}</span></span>
    <span class="stat-arrow">${icon('chevron',15)}</span></a>`;
  const shortcut = (title, copy, href, glyph, tone = '') => `<li><a class="shortcut" href="${href}">
    <span class="tile-icon ${tone}">${icon(glyph,18)}</span><span class="shortcut-copy"><strong>${h(title)}</strong><span>${h(copy)}</span></span>
    <span class="shortcut-arrow">${icon('chevron',16)}</span></a></li>`;
  return `${heading('مساحة العمل', `أهلًا، ${state.account.name}`)}
    <section class="hero"><div class="hero-content"><p class="hero-kicker">${icon('edit',16)} محرر المذكرات</p>
      <h2>ابدأ مذكرة قضائية</h2><p>أدخل الوقائع واختر مراجعك، ثم راجع المسودة وصدّرها.</p>
      ${link('مذكرة جديدة','#compose','plus','hero-action')}</div>${artwork()}</section>
    <div class="stat-grid">
      ${stat('مذكرات مفتوحة',data.counts.open,'#memos','files','')}
      ${stat('تحتاج مراجعة',data.counts.review,'#memos?status=review','clock','peach')}
      ${stat('معتمدة داخليًا',data.counts.approved,'#memos?status=approved','checkCircle','green')}
    </div>
    <div class="overview-grid">
      <section class="panel">${panelHead('آخر المذكرات',link('عرض الكل','#memos','left','subtle'))}
        ${data.recent.length ? memoTable(data.recent,true) : empty('files','لا توجد مذكرات بعد','ستظهر هنا مسوداتك والمذكرات التي اعتمدتها.')}</section>
      <section class="panel">${panelHead('المراجع الكويتية')}
        <ul class="shortcut-list">
        ${shortcut(kinds.law,`${n(data.references.laws)} سجلًا في فهرس المصادر`,'#library?kind=law','book')}
        ${shortcut(kinds.article,`${n(data.references.articles)} موضع مادة للبحث والمراجعة`,'#library?kind=article','file','peach')}
        ${shortcut('المرافعات والإجراءات','قوالب الصحف والردود والطعون','#procedures','layers','green')}
        ${shortcut('دليل المحاكم','المواقع والاستعلام عبر وزارة العدل','#courts','logo')}
        </ul></section>
    </div>`;
}

function searchControl(name, value, placeholder) {
  return `<div class="search-field">${icon('search',18)}${input(name,value,`type="search" placeholder="${h(placeholder)}" maxlength="140"`)}</div>`;
}

function paging(data, name, query) {
  const pages = Math.max(1, Math.ceil(data.total/data.pageSize));
  if (pages <= 1) return '';
  return `<nav class="page-nav" aria-label="صفحات النتائج">
    ${data.page > 1 ? link('السابق',path(name,{...query,page:data.page-1}),'right') : ''}
    <span>الصفحة ${n(data.page)} من ${n(pages)}</span>
    ${data.page < pages ? link('التالي',path(name,{...query,page:data.page+1}),'left') : ''}</nav>`;
}

function memosPage(data, query) {
  return `${heading('مذكراتي','ابحث في مسوداتك والمذكرات المعتمدة والمؤرشفة.',link('مذكرة جديدة','#compose','plus','primary'))}
    <form class="toolbar panel" data-form="memos-search">
      ${label('البحث',searchControl('q',query.q,'العنوان أو رقم القضية'))}
      ${label('الحالة',`<select name="status">${option('','كل الحالات',query.status)}
        ${Object.entries(statuses).map(([value,title])=>option(value,title,query.status)).join('')}</select>`)}
      ${submit('بحث','search')}</form>
    <div class="results-meta"><span>${n(data.total)} نتيجة</span></div>
    <section class="panel">${data.items.length ? memoTable(data.items) :
      empty('files','لا توجد مذكرات مطابقة','جرّب تغيير عبارة البحث أو الحالة.')}</section>
    ${paging(data,'memos',query)}`;
}

function referenceStatus(item) {
  if (item.citable) return badge('متاح للاستشهاد','approved');
  return item.kind === 'law' ? badge('فهرس مصدر') : badge('للمراجعة','review');
}

function libraryPage(data, query) {
  data.items.forEach(item => state.references.set(item.id,item));
  const kind = query.kind;
  const text = kind === 'law' ? 'ابحث في فهرس التشريعات وافتح الأصل المنشور لدى الجهة الرسمية.' :
    kind === 'article' ? 'راجع رقم المادة وموضعها وإصدار المصدر قبل الاستشهاد.' : 'ابحث في المبادئ والمراجع القضائية المتاحة.';
  return `${heading(kinds[kind],text,state.account.role === 'owner' ? button('إضافة مرجع','add-reference','plus','primary') : '')}
    <nav class="library-tabs" aria-label="أنواع المراجع">
      ${Object.entries(kinds).map(([key,title])=>`<a href="${path('library',{kind:key})}"${kind===key?' aria-current="page"':''}>${h(title)}</a>`).join('')}</nav>
    <form class="toolbar panel" data-form="library-search"><input name="kind" type="hidden" value="${kind}">
      ${label('البحث',searchControl('q',query.q,'اسم القانون أو رقم المادة أو كلمة مفتاحية'))}
      ${label('التصنيف',`<select name="category">${option('','كل التصنيفات',query.category)}
        ${[...new Set([...(query.category?[query.category]:[]),...data.categories])].map(value=>option(value,value,query.category)).join('')}</select>`)}
      ${submit('بحث','search')}</form>
    <div class="results-meta"><span>${n(data.total)} مرجعًا</span>
      ${kind === 'law' ? '<a class="button subtle" href="https://kuwaitalyawm.media.gov.kw/?q=node" target="_blank" rel="noopener noreferrer">الجريدة الرسمية</a>' : ''}</div>
    ${data.items.length ? `<div class="reference-grid">${data.items.map(item=>`<article class="panel reference-card">
      <div class="card-actions">${badge(item.category)}${referenceStatus(item)}</div><h2>${h(item.title)}</h2>
      <p>${h(item.kind === 'law' ? item.authority : item.identity)}</p>
      <div class="card-actions">${button('عرض التفاصيل','reference-detail','book','secondary',`data-id="${h(item.id)}"`)}
      </div></article>`).join('')}</div>` : `<section class="panel">${empty('search','لا توجد نتائج مطابقة','جرّب رقم المادة مع اسم القانون، أو اختر تصنيفًا آخر.')}</section>`}
    ${paging(data,'library',query)}`;
}

async function referenceDialog(item) {
  if (item.origin === 'corpus') {
    const source = item.body ? item : await api(`/corpus/${encodeURIComponent(item.id)}`);
    state.references.set(source.id,source);
    openDialog(source.title,`<div class="stack"><div class="actions">${badge(source.locator)}${badge('نص من الملف','review')}</div>
      <p>${h(source.identity)}</p>
      ${note(source.source.textVerified ? 'طُوبق النص مع النسخة المفهرسة. يحتاج السريان إلى مراجعة.' :
        'نص مستخرج من الملف. راجع الصفحة المصورة وسريان المادة قبل الاعتماد.','warning')}
      ${source.source.issue ? note('سجل المصدر ملاحظة على هذا الموضع.','warning') : ''}
      <div class="corpus-text">${h(source.body)}</div>
      <div class="actions">${link('أضفه إلى مسودة',path('compose',{source:source.id}),'plus','soft','data-close-dialog')}</div></div>`);
    return;
  }
  openDialog(item.title,`<div class="stack"><div class="actions">${referenceStatus(item)}${badge(item.category)}</div>
    ${item.identity !== item.title ? `<p>${h(item.identity)}</p>` : ''}${item.summary ? `<p>${h(item.summary)}</p>` : ''}
    <div class="memo-source"><p>${h([item.authority,item.edition,item.locator].filter(Boolean).join(' · '))}</p></div>
    ${item.kind !== 'law' && !item.citable ? note('تحقق من النسخة النافذة وموضع النص قبل إدراج الاستشهاد.','warning') : ''}
    <div class="actions">${external('فتح المصدر الرسمي',item.sourceUrl)}
      ${item.kind !== 'law' ? link('أضفه إلى مسودة',path('compose',{source:item.id}),'plus','soft','data-close-dialog') : ''}</div>
    ${state.account.role === 'owner' && item.kind !== 'law' ? referenceReview(item) : ''}</div>`);
}

function referenceReview(item) {
  if (item.origin === 'starter') {
    return `<div class="actions">${button('إضافة نسخة مدققة','copy-reference','check','secondary',`data-id="${h(item.id)}"`)}</div>`;
  }
  return `<form class="stack" data-form="review-reference" data-id="${h(item.id)}">
    <input type="hidden" name="approved" value="${!item.citable}">
    ${item.citable ? '' : '<label class="checkline"><input name="checked" type="checkbox" required> راجعت هوية المرجع ونسخته وموضعه في المصدر الرسمي.</label>'}
    ${errorBox}<div>${submit(item.citable ? 'تعليق الاستشهاد' : 'إتاحة الاستشهاد','check')}</div></form>`;
}

function addReferenceDialog(item = {}) {
  openDialog(item.title ? 'إضافة نسخة مدققة' : 'إضافة مرجع قانوني',`<form class="form-grid" data-form="add-reference">
    ${label('نوع المرجع',`<select name="kind">${Object.entries(kinds).map(([value,title])=>option(value,title,item.kind||'article')).join('')}</select>`)}
    ${label('التصنيف',input('category',item.category,'required maxlength="80"'))}
    ${label('عنوان المرجع',input('title',item.title,'required maxlength="220"'),true)}
    ${label('رقم المادة أو الحكم وهويته',input('identity',item.identity,'required maxlength="260"'),true)}
    ${label('الجهة',input('authority',item.authority,'required maxlength="150"'))}
    ${label('النسخة أو تاريخ الإصدار',input('edition',item.edition,'required maxlength="150"'))}
    ${label('الصفحة أو موضع النص',input('locator',item.locator,'required maxlength="120"'))}
    ${label('الرابط الرسمي',input('sourceUrl',item.sourceUrl,'type="url" dir="ltr" required maxlength="2000"'))}
    ${label('النص المدقق أو وصف مضمون المرجع',textarea('summary',item.summary,'required maxlength="1600"'),true)}
    <label class="checkline field span"><input name="checked" type="checkbox"> راجعت الهوية والنسخة والموضع، وأتيح الاستشهاد بالمرجع.</label>
    <div class="field span">${errorBox}<div>${submit('حفظ المرجع','check')}</div></div></form>`);
}

function openDialog(title, html) {
  if (dialog.open) dialog.close();
  dialog.innerHTML = `<header class="panel-head"><h2 id="dialog-title">${h(title)}</h2>
    <button type="button" class="icon-btn" data-action="dialog-close" aria-label="إغلاق النافذة">${icon('x',18)}</button></header>
    <div class="panel-body">${html}</div>`;
  dialog.showModal();
}

function newCompose(query) {
  if (!state.compose) {
    const key = `tahkeem-draft-${state.account.id}`;
    const id = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key,id);
    state.compose = { id, method: state.model ? 'model' : 'template', language: 'ar', attachments: [] };
  }
  const requestedType = query.get('type');
  if (memoTypes.includes(requestedType)) state.compose.type = requestedType;
  const source = query.get('source');
  if (source && state.references.has(source) && state.selected.size < 8) state.selected.add(source);
}

const caseFields = [
  ['facts', 'الوقائع', 'Facts', 12000, 5, 'اكتب كل واقعة في سطر بحسب ترتيبها.'],
  ['evidence', 'المستندات والأدلة', 'Documents and evidence', 5000, 3, 'اذكر المستند والواقعة التي يدعمها.'],
  ['grounds', 'الدفوع أو أوجه الطلب', 'Grounds and submissions', 6000, 4],
  ['opponentGrounds', 'دفوع الخصم', 'Opposing submissions', 4000, 3],
  ['reply', 'الرد على الخصم', 'Reply to opposing submissions', 5000, 3],
  ['requests', 'الطلبات الأصلية', 'Primary relief', 5000, 3],
  ['alternativeRequests', 'الطلبات الاحتياطية', 'Alternative relief', 4000, 3],
];

function caseInputs(data, english = false) {
  return caseFields.map(([name, ar, en, max, rows, placeholder]) => label(english ? en : ar,
    textarea(english ? 'en-' + name : name, data[english ? 'en-' + name : name], `dir="${english ? 'ltr' : 'auto'}"
      maxlength="${max}" rows="${rows}" ${name === 'facts' && !english ? 'required minlength="15"' : ''}
      ${!english && placeholder ? `placeholder="${h(placeholder)}"` : ''}`), name === 'facts' || name === 'evidence')).join('');
}

const fileSize = new Intl.NumberFormat('ar-KW', { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: 2 });

function attachmentRows(items, editable) {
  return items.length ? items.map(item=>`<li class="attachment-row">
    <div class="attachment-name"><strong dir="auto">${h(item.name)}</strong>
    <small>${h(fileSize.format(item.bytes/1_000_000))}</small>
    ${item.status === 'uploading' ? `<progress max="${item.bytes || 1}" value="${Math.min(item.bytes,(item.uploadedParts||0)*(item.partSize||1))}" aria-label="تقدم الرفع"></progress>` : ''}
    ${item.status === 'uploading' && !item.file && editable ? '<small>اختر الملف نفسه لمتابعة رفعه.</small>' : ''}
    ${item.status === 'queued' ? '<small>في انتظار الرفع</small>' : ''}
    ${item.error ? `<small class="form-error">${h(item.error)}</small>` : ''}</div>
    <div class="actions">
      ${item.status === 'ready' ? link('تنزيل',`/api/attachments/${item.id}/download`,'arrowDown','secondary') : ''}
      ${item.error && item.status === 'uploading' && item.file && editable ?
        button('متابعة الرفع','retry-attachment',null,'secondary',`data-id="${item.id}"`) : ''}
      ${editable ? button(item.status === 'uploading' && !item.error ? 'إلغاء' : 'إزالة','remove-attachment',null,'subtle',`data-id="${item.id}"`) : ''}
    </div></li>`).join('') : '<li class="hint">لا توجد مرفقات.</li>';
}

function memoAttachments(memoId, items = [], editable = true) {
  if (!state.attachmentsAvailable && !items.length) return '';
  return `<section class="panel form-section stack" data-attachments="${memoId}" data-editable="${editable}">
    <h2>مرفقات القضية</h2>
    <ul class="attachment-list" aria-live="polite">${attachmentRows(mergedAttachments(memoId,items),editable)}</ul>
    ${editable && state.attachmentsAvailable ? label('إضافة ملفات',`<input type="file" multiple data-memo-id="${memoId}">`) : ''}
    <p class="hint">تُحفظ المرفقات مع القضية. ليدخل مضمونها في الصياغة، اذكر خلاصته في حقل المستندات والأدلة.</p>
  </section>`;
}

function mergedAttachments(memoId, saved) {
  const items = new Map(saved.map(item=>[item.id,item]));
  for (const upload of state.uploads.values()) {
    if (upload.memoId === memoId) items.set(upload.id,upload);
  }
  return [...items.values()];
}

function attachmentRecord(memoId) {
  if (state.memo?.id === memoId) return state.memo;
  if (state.compose?.id === memoId) return state.compose;
  return null;
}

function updateAttachmentPanel(memoId) {
  const panel = app.querySelector(`[data-attachments="${memoId}"]`);
  if (!panel) return;
  const saved = attachmentRecord(memoId)?.attachments || [];
  panel.querySelector('.attachment-list').innerHTML =
    attachmentRows(mergedAttachments(memoId,saved),panel.dataset.editable==='true');
}

async function uploadAttachment(upload, saved) {
  const controller = new AbortController();
  const { memoId, name, bytes, file } = upload;
  Object.assign(upload,{controller,error:'',status:'uploading'});
  updateAttachmentPanel(memoId);
  try {
    const options = {signal:controller.signal};
    const sampleBytes = 65536;
    const sample = new Blob([file.slice(0,sampleBytes), file.slice(-sampleBytes)]);
    const digest = await crypto.subtle.digest('SHA-256',await sample.arrayBuffer());
    const fingerprint = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    if (controller.signal.aborted || !state.uploads.has(upload.id)) return;
    const existing = saved.find(item=>item.status==='uploading' && item.name===name &&
      item.bytes===bytes && item.fingerprint===fingerprint && !state.uploads.has(item.id));
    if (existing) {
      state.uploads.delete(upload.id);
      Object.assign(upload,existing);
      state.uploads.set(upload.id,upload);
    }
    const id = upload.id;
    const created = await api('/attachments',{...options,method:'POST',data:{id,memoId,name,bytes,fingerprint}});
    Object.assign(upload,created);
    updateAttachmentPanel(memoId);
    while (upload.status === 'uploading') {
      const offset = upload.uploadedParts*upload.partSize;
      const part = file.slice(offset,offset+upload.partSize);
      const result = await api(`/attachments/${id}/parts/${upload.uploadedParts}`,{...options,method:'PUT',binary:part});
      Object.assign(upload,result);
      updateAttachmentPanel(memoId);
    }
    upload.file = null;
  } catch (error) {
    if (!controller.signal.aborted) upload.error = error.message;
  } finally {
    upload.controller = null;
    updateAttachmentPanel(memoId);
  }
}

let uploadQueue = Promise.resolve();
function queueUpload(upload) {
  upload.status = 'queued';
  upload.error = '';
  uploadQueue = uploadQueue.then(async ()=>{
    if (state.uploads.has(upload.id) && !upload.removing) {
      await uploadAttachment(upload,attachmentRecord(upload.memoId)?.attachments || []);
    }
  }).catch(error=>flash(error.message));
}

async function deleteAttachment(id) {
  const draft = state.uploads.get(id);
  const panel = app.querySelector('[data-attachments]');
  const memoId = draft?.memoId || panel?.dataset.attachments;
  const memo = attachmentRecord(memoId);
  const row = draft || memo?.attachments?.find(item=>item.id===id);
  if (!row) return;
  if (row.removing) return;
  if (row.status === 'ready' && !window.confirm('هل تريد إزالة هذا المرفق؟')) return;
  row.removing = true;
  draft?.controller?.abort();
  try { await api(`/attachments/${id}`,{method:'DELETE'}); }
  catch (error) {
    if (error.status !== 404) {
      row.removing = false;
      if (draft) draft.error = error.message;
      updateAttachmentPanel(memoId);
      throw error;
    }
  }
  state.uploads.delete(id);
  if (memo?.id === memoId) memo.attachments = (memo.attachments || []).filter(item=>item.id!==id);
  updateAttachmentPanel(memoId);
}

function selectAttachments(memoId, files) {
  for (const file of files) {
    const id = crypto.randomUUID();
    const upload = {id,memoId,file,name:file.name,bytes:file.size};
    state.uploads.set(id,upload);
    queueUpload(upload);
  }
  updateAttachmentPanel(memoId);
}

function composePage(query) {
  newCompose(query);
  const data = state.compose;
  return `${heading('مذكرة جديدة','أدخل ما لديك من الوقائع والطلبات. تحفظ المسودة في حسابك بعد التوليد.',
    link('مذكراتي','#memos','files','secondary'))}
    <form id="compose" class="form-layout" data-form="compose">
      <div class="stack">
        <section class="panel form-section"><h2>بيانات القضية</h2><div class="form-grid">
          ${label('نوع المذكرة',`<select name="type" required>${memoTypes.map(type=>option(type,type,data.type||memoTypes[0])).join('')}</select>`)}
          ${label('لغة المذكرة',`<select name="language">${Object.entries(languages).map(([value,name])=>option(value,name,data.language)).join('')}</select>`)}
          ${label('عنوان المذكرة',input('title',data.title,'required maxlength="140" minlength="3" dir="auto" placeholder="عنوان يسهل العثور عليه"'))}
          ${label('المحكمة',`<select name="court" required>${option('','اختر المحكمة',data.court||'')}${Object.keys(courts).map(court=>option(court,court,data.court)).join('')}</select>`)}
          ${label('رقم القضية',input('number',data.number,'dir="auto" maxlength="60"'))}
          ${label('الدائرة',input('circuit',data.circuit,'dir="auto" maxlength="100"'),true)}
          ${label('مقدم المذكرة وصفته',input('party',data.party,'dir="auto" maxlength="200"'))}
          ${label('الخصم وصفته',input('opponent',data.opponent,'dir="auto" maxlength="200"'))}
        </div></section>
        <section class="panel form-section"><h2>الوقائع والدفوع والطلبات</h2>
          <p class="hint" id="english-entry" hidden>اكتب البيانات بالإنجليزية عند استخدام القالب. يمكنك ترجمة متن عربي بالصياغة الذكية عند توفرها.</p>
          <div class="form-grid">${caseInputs(data)}</div></section>
        <details id="english-copy" class="panel form-section translation-panel" hidden>
          <summary>مدخلات النسخة الإنجليزية</summary>
          <p class="hint">أدخل نص الحقول المقابلة عند استخدام القالب. تستطيع الصياغة الذكية ترجمة الحقول الفارغة من المدخلات العربية.</p>
          <div class="form-grid" lang="en" dir="ltr">
            ${label('English title',input('en-title',data['en-title'],'maxlength="140"'))}
            ${label('Circuit',input('en-circuit',data['en-circuit'],'maxlength="100"'))}
            ${label('Filing party and capacity',input('en-party',data['en-party'],'maxlength="200"'))}
            ${label('Opposing party and capacity',input('en-opponent',data['en-opponent'],'maxlength="200"'))}
            ${caseInputs(data,true)}
          </div>
        </details>
        ${memoAttachments(data.id,data.attachments)}
      </div>
      <aside class="compose-aside">
        <section class="panel form-section"><h2>المراجع</h2>
          <p class="hint">اختر ما يصلح للمراجعة. تظهر الاستشهادات في المتن بعد إتاحة المرجع لها.</p>
          <div class="stack"><div class="search-field">${icon('search',18)}${input('sourceQuery','','type="search" aria-label="بحث المراجع" placeholder="المادة أو المبدأ" maxlength="140"')}</div>
          <div id="compose-references" class="compose-refs" aria-live="polite"><p class="hint">جارٍ تحميل المراجع…</p></div></div>
        </section>
        <section class="panel form-section stack"><h2>طريقة الصياغة</h2>
          <label class="checkline"><input type="radio" name="method" value="template" ${data.method !== 'model'?'checked':''}> قالب مرتب يعتمد على المدخلات</label>
          <label class="checkline"><input type="radio" name="method" value="model" ${data.method === 'model'?'checked':''} ${state.model?'':'disabled'}> تحليل الدفوع والترجمة بالذكاء الاصطناعي</label>
          ${state.model ? '<label class="checkline" id="model-consent" hidden><input type="checkbox" name="allowModel"> أوافق على إرسال النص الذي أدخلته للوقائع والمستندات والدفوع والطلبات إلى خدمة الصياغة. راجع النص واحذف البيانات الحساسة قبل الإرسال.</label>' : '<p class="hint">القوالب متاحة. التحليل والترجمة الآلية يحتاجان إلى خدمة صياغة متصلة.</p>'}
          ${errorBox}${submit('توليد المسودة','spark')}
        </section>
      </aside>
    </form>`;
}

let refRequest = 0;
async function composeReferences(value) {
  const container = document.querySelector('#compose-references');
  if (!container) return;
  const ticket = ++refRequest;
  try {
    const query = encodeURIComponent(value.trim());
    const results = await Promise.all([api(`/library?kind=article&q=${query}`),api(`/library?kind=judgment&q=${query}`)]);
    if (!container.isConnected || ticket !== refRequest) return;
    const options = results.flatMap(result=>result.items);
    options.forEach(item=>state.references.set(item.id,item));
    const list = new Map([...state.selected].map(id=>[id,state.references.get(id)]));
    options.forEach(item=>list.set(item.id,item));
    container.innerHTML = [...list.values()].filter(Boolean).map(item=>`<label class="checkline">
      <input type="checkbox" name="sourceId" value="${h(item.id)}" ${state.selected.has(item.id)?'checked':''}>
      <span>${h(item.title)}<small>${h(item.citable ? 'متاح للاستشهاد' : 'مرجع للمراجعة')}</small></span></label>`).join('') ||
      '<p class="hint">لا توجد مراجع مطابقة.</p>';
  } catch (error) {
    if (container.isConnected && ticket === refRequest) container.innerHTML = note(error.message,'error');
  }
}

function modelConsent() {
  const form = document.querySelector('#compose');
  const check = form?.querySelector('[name=allowModel]');
  if (!check) return;
  const visible = form.elements.method.value === 'model';
  check.closest('label').hidden = !visible;
  check.required = visible;
  if (!visible) check.checked = false;
}

function updateComposeLanguage() {
  const form = document.querySelector('#compose');
  if (!form) return;
  const bilingual = form.elements.language.value === 'both';
  const panel = form.querySelector('#english-copy');
  panel.hidden = !bilingual;
  if (bilingual && form.elements.method.value !== 'model') panel.open = true;
  form.querySelector('#english-entry').hidden = form.elements.language.value !== 'en';
}

function memoPage(memo) {
  if (state.memo?.id !== memo.id) state.memoLanguage = '';
  state.memo = memo;
  memo.sources.filter(item=>item.origin==='corpus').forEach(item=>{
    if (!state.references.has(item.id)) state.references.set(item.id,item);
  });
  state.editorDirty = false;
  const editing = memo.status !== 'archived';
  const documents = memoDocuments(memo);
  const activeLanguage = documents.find(item=>item.language === state.memoLanguage)?.language || documents[0].language;
  state.memoLanguage = activeLanguage;
  return `${heading('مراجعة المذكرة',memo.title,link('مذكراتي','#memos','right','secondary'))}
    <div class="form-layout"><section class="panel form-section">
    <form id="editor" class="stack" data-form="save-memo">
      <div class="actions">${statusBadge(memo.status)}${badge(languages[memo.input?.language] || languages.ar)}
      ${badge(memo.method==='model'?'صياغة مساعدة':memo.method==='manual'?'محررة':'قالب')}
      <span class="hint">آخر تحديث ${h(date(memo.updated_at))}</span></div>
      ${memo.needsCitationReview ? note('راجع الإحالات الواردة في النص وطابقها مع المراجع المعتمدة قبل الاعتماد.','warning') : ''}
      ${label('عنوان المذكرة',input('title',memo.title,`dir="auto" required minlength="3" maxlength="140" ${editing?'':'readonly'}`))}
      ${documents.length > 1 ? `<div class="language-switch" role="group" aria-label="نسخة المذكرة">
        ${documents.map(({language})=>button(languages[language],'memo-language',null,'secondary',
          `data-language="${language}" aria-pressed="${language===activeLanguage}"`)).join('')}</div>` : ''}
      ${documents.map(({language,body},index)=>`<div data-memo-language="${language}" ${language===activeLanguage?'':'hidden'}>
        ${label(language==='ar'?'نص المذكرة':'Memorandum text',textarea(index?'alternateBody':'body',body,
          `class="editor" lang="${language}" dir="${format[language].dir}" required minlength="20" maxlength="${memoBodyLimit}" ${editing?'':'readonly'}`))}
      </div>`).join('')}
      ${errorBox}<div class="actions">
        ${editing ? submit('حفظ التعديلات','check') : ''}
        ${memo.status === 'review' ? button('اعتماد داخلي','approve-memo','checkCircle','soft') : ''}
        ${editing ? button('أرشفة','archive-memo','archive','subtle') : button('استعادة للمراجعة','restore-memo','archive','soft')}
      </div>
    </form></section>
    <aside class="compose-aside">
      <section class="panel form-section stack"><h2>التصدير</h2>
      <div class="actions">${link('تنزيل Word',`/api/memos/${memo.id}/word`,'arrowDown','secondary','data-export')}
      ${button('طباعة أو PDF','print-memo','print','secondary')}</div>
      ${memo.status === 'approved' ? '' : '<p class="hint">يحمل الملف علامة «مسودة للمراجعة» حتى الاعتماد الداخلي.</p>'}</section>
      ${memoAttachments(memo.id,memo.attachments,editing)}
      <section class="panel form-section"><h2>مراجع هذه المذكرة</h2>
      <div class="memo-sources">${memo.sources.length ? memo.sources.map(item=>`<div class="memo-source">
        <strong>${h(item.title)}</strong><p>${h([item.identity,item.edition,item.locator].filter(Boolean).join(' · '))}</p>
        ${sourceButton(item,'عرض المصدر')} ${item.citable ? '' : badge('للمراجعة','review')}</div>`).join('') :
        '<p class="hint">لم تُحدّد مراجع لهذه المسودة.</p>'}</div></section>
    </aside></div>`;
}

function chatTurns() {
  return state.chat.map(({question,language,reply})=>{
    const direction = format[language].dir;
    const citations = new Map(reply.sources.map((source,index)=>[source.id,index+1]));
    reply.sources.forEach(source=>state.references.set(source.id,source));
    return `<div class="chat-turn">
      <p class="chat-question" dir="auto">${h(question)}</p>
      <article class="chat-answer">
        <div lang="${language}" dir="${direction}"><p>${h(reply.intro)}</p>
        ${reply.points.length ? `<ul>${reply.points.map(point=>`<li>${h(point.text)} ${point.sourceIds.map(id=>`<sup>[${citations.get(id)}]</sup>`).join(' ')}</li>`).join('')}</ul>` : ''}</div>
        ${reply.sources.length ? `<ol class="chat-sources">${reply.sources.map(source=>`<li>
          <div><strong dir="auto">${h(source.title)}</strong>
          <p class="hint">${h(source.locator || source.authority)}</p>
          ${source.excerpt ? `<p dir="auto" class="chat-excerpt">${h(source.excerpt)}</p>` : ''}
          <div class="actions">${sourceButton(source,'عرض المصدر')}${referenceStatus(source)}</div></div>
        </li>`).join('')}</ol>` : ''}
        ${reply.mode === 'guide' ? link('مذكرة جديدة','#compose','plus','secondary') : ''}
      </article></div>`;
  }).join('');
}

function arbitratorPage() {
  return `${heading('المحكّم الذكي','اسأل عن مرجع كويتي، أو اطلب إرشادًا في إعداد المذكرة.')}
    <section class="panel form-section chat-panel">
      <div id="chat-transcript" class="chat-transcript" aria-live="polite">
        ${state.chat.length ? chatTurns() : `<div class="chat-suggestions" aria-label="أسئلة مقترحة">
          ${button('ابحث عن قانون الإثبات','chat-example','search','secondary','data-question="قانون الإثبات"')}
          ${button('المادة ٢ من المرافعات','chat-example','book','secondary','data-question="المادة ٢ من قانون المرافعات"')}
          ${button('كيف أعدّ مذكرة دفاع؟','chat-example','edit','secondary','data-question="كيف أكتب مذكرة دفاع؟"')}
        </div>`}
      </div>
      <form class="stack chat-form" data-form="arbitrator">
        ${label('سؤالك',textarea('question','','dir="auto" rows="3" minlength="4" maxlength="1000" required placeholder="اكتب اسم القانون أو رقم المادة أو سؤالك"'))}
        ${state.model ? '<label class="checkline"><input type="checkbox" name="allowModel"> أوافق على إرسال السؤال والسؤال السابق إلى خدمة التحليل. استخدم سؤالًا يخلو من البيانات الشخصية.</label>' : ''}
        ${errorBox}<p class="hint" data-chat-busy role="status" hidden>جارٍ البحث في المكتبة…</p>
        <div class="actions">
          ${submit('إرسال','spark')}
          ${label('لغة الإجابة',`<select name="language">${option('ar',languages.ar,state.chat.at(-1)?.language||'ar')}${option('en',languages.en,state.chat.at(-1)?.language)}</select>`)}
          ${button('محادثة جديدة','chat-reset',null,'subtle','id="chat-reset" ' + (state.chat.length?'':'hidden'))}
        </div>
      </form>
    </section>`;
}

function proceduresPage() {
  const procedures = [
    ['صحيفة دعوى','رتّب بيانات الخصوم والوقائع والطلبات والمستندات المؤيدة.','file'],
    ['مذكرة دفاع','نظّم الوقائع وأوجه الدفاع والرد على طلبات الخصم.','shield'],
    ['صحيفة استئناف','دوّن بيانات الحكم المطعون فيه وحدد أوجه الاعتراض والطلبات.','layers'],
    ['مذكرة رد','رتّب ردودك على الدفوع والنقاط محل الخلاف.','edit'],
    ['مذكرة تمييز','رتّب الأسباب وأشر إلى الحكم المطعون فيه ضمن الوقائع.','scale'],
    ['مذكرة تنفيذ','دوّن بيانات السند التنفيذي والإجراء أو الطلب محل المذكرة.','archive'],
  ];
  return `${heading('المرافعات والإجراءات','قوالب عمل للمذكرات والصحف والطعون.',link('مراجع المرافعات','#library?kind=article&category='+encodeURIComponent('مرافعات وتنفيذ'),'book','secondary'))}
    <div class="guide-grid">${procedures.map(([title,copy,glyph])=>`<article class="panel guide-card">
      <span class="tile-icon">${icon(glyph,20)}</span><h2>${h(title)}</h2><p>${h(copy)}</p>
      ${link('فتح القالب',path('compose',{type:title}),'left','soft')}</article>`).join('')}</div>`;
}

function courtsPage() {
  const official = 'https://moj.gov.kw/AR/Pages/Courts_Loc.aspx';
  const links = [
    ['الاستعلام القضائي','استعلام القضايا والدوائر والجلسات والخبراء والتنفيذ عبر منصة عدل.','https://eservices.moj.gov.kw/adl/searchPages/searchCases.jsp','search'],
    ['دليل مواقع المحاكم','المواقع والعناوين كما تنشرها وزارة العدل.',official,'pin'],
    ['الجريدة الرسمية','القوانين والمراسيم والقرارات والإصدارات.','https://kuwaitalyawm.media.gov.kw/?q=node','book'],
    ['إصدارات المعهد القضائي','مجموعات تشريعية وأبحاث قضائية ومراجع للمبادئ.','https://www.kijls.moj.gov.kw/ar/sections/section4/sub3_section4/Releases/Pages/default.aspx','layers'],
  ];
  const locations = [['العاصمة','قصر العدل، القبلة'],['حولي','مجمع محاكم حولي الجديدة'],['الفروانية','مجمع محاكم الفروانية، الرقعي'],
    ['الجهراء','مجمع محاكم الجهراء'],['الأحمدي','محكمة الأحمدي، جنوب الصباحية'],['مبارك الكبير','محكمة الأسرة، صباح السالم']];
  return `${heading('دليل المحاكم الكويتية','مواقع المحاكم والروابط الرسمية للخدمات القضائية.')}
    <div class="guide-grid">${links.map(([title,copy,url,glyph])=>`<article class="panel guide-card">
      <span class="tile-icon">${icon(glyph,20)}</span><h2>${h(title)}</h2><p>${h(copy)}</p>${external('فتح الخدمة',url)}</article>`).join('')}</div>
    <section class="panel">${panelHead('المحاكم حسب المحافظة',external('الدليل الرسمي',official))}
      <div class="panel-body court-list">${locations.map(([name,where])=>`<article><h3>${h(name)}</h3><p>${h(where)}</p></article>`).join('')}</div></section>`;
}

function clientStatus(client) {
  if (!client.enabled) return badge('موقوف','disabled');
  if (client.active) return badge('نشط','active');
  return client.accessUntil ? badge('منتهي','expired') : badge('بانتظار التفعيل','pending');
}

function clientsPage(clients) {
  state.clients = new Map(clients.map(client=>[client.id,client]));
  return `${heading('العملاء والاشتراكات','أنشئ حسابًا مستقلًا لكل عميل وسجّل دفعات التجديد الشهرية.',
    button('إضافة عميل','add-client','plus','primary'))}
    <section class="panel">${panelHead('حسابات العملاء',badge(`${n(clients.length)} حساب`))}
      ${clients.length ? `<div class="table-wrap"><table aria-label="حسابات العملاء">
      <thead><tr><th scope="col">العميل</th><th scope="col">الحالة</th><th scope="col">صالح حتى</th><th scope="col">الإجراءات</th></tr></thead>
      <tbody>${clients.map(client=>`<tr><td><strong>${h(client.name)}</strong><span class="record-sub"><bdi>${h(client.email)}</bdi></span>
        ${client.joined ? '' : '<span class="record-sub">الدعوة لم تُستخدم بعد</span>'}</td>
      <td>${clientStatus(client)}</td><td>${h(date(client.accessUntil))}</td>
      <td><div class="row-actions">
      ${client.enabled ? button('تسجيل دفعة','renew-client','cards','secondary',`data-id="${client.id}"`) : ''}
      ${client.enabled ? button('رابط دخول جديد','invite-client','link','subtle',`data-id="${client.id}"`) : ''}
      ${button(client.enabled?'إيقاف':'إعادة تفعيل','toggle-client',client.enabled?'x':'check','subtle',`data-id="${client.id}"`)}
      </div></td></tr>`).join('')}</tbody></table></div>` :
      empty('users','لا توجد حسابات عملاء بعد','أضف عميلًا لإنشاء رابط دعوة يستخدمه لاختيار كلمة مروره.')}</section>`;
}

function subscriptionPage(data) {
  const account = data.account;
  const owner = account.role === 'owner';
  return `${heading(owner?'سجل التحصيل':'اشتراكي',owner?'راجع دفعات الاشتراكات المسجّلة.':'اطّلع على حالة الوصول وسجل التجديدات.')}
    ${owner ? '' : `<section class="panel account-summary">${avatar(account.name)}<div><strong>${h(account.name)}</strong>
      <p class="hint">صالح حتى ${h(date(account.accessUntil))}</p></div>${clientStatus(account)}</section>
      ${account.active?'':`<p class="notice warning subscription-notice">تواصل مع مسؤول حسابك لتفعيل الاشتراك أو تجديده.</p>`}`}
    <section class="panel">${panelHead('الدفعات المسجلة')}
      ${data.records.length ? `<div class="table-wrap"><table aria-label="دفعات الاشتراك">
      <thead><tr>${owner?'<th scope="col">العميل</th>':''}<th scope="col">الدفعة</th><th scope="col">المدة</th><th scope="col">المرجع</th><th scope="col">تاريخ التسجيل</th><th scope="col">صالح حتى</th></tr></thead>
      <tbody>${data.records.map(row=>`<tr>${owner?`<td>${h(row.client_name)}</td>`:''}<td><bdi>${h(currency.format(row.amount_fils/1000))}</bdi></td>
      <td>${n(row.months)} شهر</td><td><bdi>${h(row.payment_reference)}</bdi></td><td>${h(date(row.created_at))}</td><td>${h(date(row.access_until))}</td></tr>`).join('')}</tbody></table></div>` :
      empty('cards','لا توجد دفعات مسجّلة','تظهر الدفعات هنا عند تسجيلها من لوحة المالك.')}</section>`;
}

function addClientDialog() {
  openDialog('إضافة عميل',`<form class="stack" data-form="add-client">
    ${label('اسم العميل أو المكتب',input('name','','required minlength="2" maxlength="100"'))}
    ${label('البريد الإلكتروني',input('email','','type="email" dir="ltr" required maxlength="254"'))}
    ${errorBox}${submit('إنشاء الحساب ورابط الدعوة','plus')}</form>`);
}

function invitationDialog(invite) {
  openDialog('رابط دعوة العميل',`<div class="stack"><p class="hint">صلاحية الرابط 48 ساعة ويُستخدم مرة واحدة لاختيار كلمة المرور.</p>
    ${label('رابط الدعوة',input('inviteLink',invite,'readonly dir="ltr"'))}
    <div class="actions">${button('نسخ رابط الدعوة','copy-invite','link','primary')}</div></div>`);
}

function renewDialog(client) {
  openDialog(`تسجيل دفعة — ${client.name}`,`<form class="stack" data-form="renew-client" data-id="${client.id}">
    ${label('المدة بالأشهر',input('months','1','type="number" min="1" max="12" required dir="ltr"'))}
    ${label('المبلغ بالدينار الكويتي',input('amount','','inputmode="decimal" maxlength="9" required dir="ltr" placeholder="0.000"'))}
    ${label('مرجع التحصيل',input('reference','','required minlength="3" maxlength="120" dir="auto"'))}
    <label class="checkline"><input type="checkbox" name="received" required> أؤكد استلام الدفعة خارج المنصة.</label>
    ${errorBox}${submit('حفظ الدفعة وتمديد الاشتراك','check')}</form>`);
}

function readRoute() {
  const [name,idAndQuery] = location.hash.slice(1).split('/');
  if (name === 'memo' && idAndQuery) return { name:'memo', id:idAndQuery, query:new URLSearchParams() };
  const [section,query] = name.split('?');
  return { name:section || 'overview', query:new URLSearchParams(query) };
}

const queryObject = (query,keys) => Object.fromEntries(keys.map(key=>[key,query.get(key)||'']));

async function renderRoute({ focus = false } = {}) {
  if (!state.account) return authPage();
  const ownVersion = ++state.version;
  if (dialog.open) dialog.close();
  const route = readRoute();
  if (!state.account.active && route.name !== 'subscription') {
    location.hash = 'subscription';
    route.name = 'subscription';
  }
  if (route.name === 'clients' && state.account.role !== 'owner') route.name = 'overview';
  const titles = { overview:'نظرة عامة', memos:'مذكراتي', memo:'مراجعة المذكرة', compose:'مذكرة جديدة',
    arbitrator:'المحكّم الذكي',
    library:kinds[route.query.get('kind')] || kinds.law, procedures:'المرافعات والإجراءات', courts:'دليل المحاكم',
    clients:'العملاء والاشتراكات', subscription:state.account.role==='owner'?'سجل التحصيل':'اشتراكي' };
  if (!Object.hasOwn(titles,route.name)) route.name = 'overview';
  const title = titles[route.name];
  const previous = app.querySelector('main');
  if (app.querySelector('.menu-open')) toggleMenu(false);
  if (!previous || previous.classList.contains('auth-layout')) {
    shell(route,title,'<section class="panel"><div class="empty"><p role="status">جارٍ التحميل…</p></div></section>');
  } else previous.setAttribute('aria-busy','true');
  const params = route.query;
  let content;
  try {
    switch (route.name) {
      case 'overview':
        content = overview(await api('/overview'));
        break;
      case 'memos': {
        const query = queryObject(params,['q','status','page']);
        content = memosPage(await api(`/memos?${new URLSearchParams(Object.entries(query).filter(([,value])=>value))}`),query);
        break;
      }
      case 'memo': {
        const memo = await api(`/memos/${encodeURIComponent(route.id)}`);
        if (ownVersion !== state.version) return;
        content = memoPage(memo);
        break;
      }
      case 'compose':
        newCompose(params);
        if (state.attachmentsAvailable) {
          const draft = state.compose;
          draft.attachments = await api(`/attachments?memoId=${draft.id}`);
          if (ownVersion !== state.version) return;
        }
        content = composePage(params);
        break;
      case 'arbitrator':
        content = arbitratorPage();
        break;
      case 'library': {
        const query = queryObject(params,['kind','q','category','page']);
        if (!Object.hasOwn(kinds,query.kind)) query.kind='law';
        const data = await api(`/library?${new URLSearchParams(Object.entries(query).filter(([,value])=>value))}`);
        if (ownVersion !== state.version) return;
        content = libraryPage(data,query);
        break;
      }
      case 'procedures':
        content = proceduresPage();
        break;
      case 'courts':
        content = courtsPage();
        break;
      case 'clients': {
        const clients = await api('/owner/clients');
        if (ownVersion !== state.version) return;
        content = clientsPage(clients);
        break;
      }
      case 'subscription': {
        const data = await api('/subscription');
        if (ownVersion !== state.version) return;
        state.account = data.account;
        content = subscriptionPage(data);
        break;
      }
    }
  } catch (error) {
    if (ownVersion !== state.version) return;
    content = `${heading(title)}<div class="stack">${note(error.message,'error')}
      <div>${button('إعادة المحاولة','retry',null,'secondary')} ${link('حسابي','#subscription',null,'subtle')}</div></div>`;
  }
  if (ownVersion !== state.version) return;
  shell(route,title,content);
  if (route.name === 'compose') {
    modelConsent();
    updateComposeLanguage();
    composeReferences('');
  }
  if (focus) {
    window.scrollTo(0,0);
    const focusTarget = params.get('focus') === 'search' ? app.querySelector('[name=q]') : null;
    (focusTarget || app.querySelector('#main'))?.focus();
  }
}

function setFormError(form,error) {
  const target = form.querySelector('.form-error');
  if (!target) return flash(error.message);
  target.textContent = error.message;
  target.hidden = false;
}

function clearFormError(form) {
  const target = form.querySelector('.form-error');
  if (target) target.hidden = true;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

async function saveMemo(extra = {}) {
  const form = document.querySelector('#editor');
  if (!form?.reportValidity()) return;
  const content = formValues(form);
  const saved = await api(`/memos/${state.memo.id}`,{method:'PATCH',data:{...content,version:state.memo.version,...extra}});
  state.editorDirty = false;
  state.memo = saved;
  await renderRoute();
  flash(saved.status==='approved'?'اعتمدت المذكرة داخليًا.':saved.status==='archived'?'أُرشفت المذكرة.':'حُفظت المذكرة.');
}

function startPrint() {
  if (state.editorDirty) return flash('احفظ تعديلاتك أولًا لتظهر في التصدير.');
  const memo = state.memo;
  const paper = document.querySelector('#print');
  paper.innerHTML = memoDocuments(memo).map(({language,body,title})=>`<section lang="${language}" dir="${format[language].dir}">
    ${memo.status === 'approved' ? '' : `<p class="print-title">${h(format[language].draft)}</p>`}
    ${body.split('\n').filter(line=>line.trim()).map((line,index)=>
      `<p class="print-${memoLineRole(line,index,title,memo.memo_type)||'text'}">${h(line)}</p>`).join('')}
    </section>`).join('');
  window.print();
}

document.addEventListener('submit',async event=>{
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.busy === 'true') return;
  form.dataset.busy = 'true';
  const action = form.dataset.form;
  const controls = [...form.querySelectorAll('button[type=submit]')];
  controls.forEach(control=>{control.disabled=true;});
  const data = formValues(form);
  clearFormError(form);
  try {
    if (['login','invite','setup'].includes(action)) {
      if (action === 'invite') data.code = location.hash.slice(8);
      const result = await api(`/${action}`,{method:'POST',data});
      clearSession();
      state.account = result.account;
      state.model = result.modelAvailable;
      state.attachmentsAvailable = result.attachmentsAvailable;
      state.setup = false;
      history.replaceState(null,'',result.account.active?'#overview':'#subscription');
      await renderRoute({focus:true});
    } else if (action === 'memos-search' || action === 'library-search') {
      const href = path(action === 'memos-search'?'memos':'library',data);
      if (location.hash === href) await renderRoute();
      else location.hash=href;
    } else if (action === 'compose') {
      if ([...state.uploads.values()].some(item=>item.memoId===state.compose.id && ['uploading','queued'].includes(item.status))) {
        throw new Error('انتظر اكتمال رفع المرفقات، أو ألغِ الرفع قبل التوليد.');
      }
      const entries = Object.entries(data);
      const main = Object.fromEntries(entries.filter(([key])=>!key.startsWith('en-')));
      const english = Object.fromEntries(entries.filter(([key])=>key.startsWith('en-')).map(([key,value])=>[key.slice(3),value]));
      const memo = await api('/memos',{method:'POST',data:{...main,id:state.compose.id,
        ...(main.language === 'both' ? {english} : {}), sourceIds:[...state.selected],allowModel:main.allowModel==='on'}});
      sessionStorage.removeItem(`tahkeem-draft-${state.account.id}`);
      for (const upload of state.uploads.values()) if (upload.memoId === memo.id) state.uploads.delete(upload.id);
      state.compose = null;
      state.selected.clear();
      location.hash=`memo/${memo.id}`;
      flash('حُفظت المسودة للمراجعة.');
    } else if (action === 'arbitrator') {
      const generation = state.version;
      const question = data.question.trim();
      const busy = form.querySelector('[data-chat-busy]');
      const reset = form.querySelector('#chat-reset');
      busy.hidden=false;
      reset.disabled=true;
      try {
        const reply = await api('/arbitrator',{method:'POST',data:{question,language:data.language,
          previous:state.chat.at(-1)?.question,allowModel:data.allowModel==='on'}});
        if (state.version !== generation) return;
        state.chat = [...state.chat.slice(-11),{question,language:data.language,reply}];
        const transcript = app.querySelector('#chat-transcript');
        transcript.innerHTML = chatTurns();
        transcript.scrollTop=transcript.scrollHeight;
        form.elements.question.value='';
        if (form.elements.allowModel) form.elements.allowModel.checked=false;
        reset.hidden=false;
        form.elements.question.focus();
      } finally {
        busy.hidden=true;
        reset.disabled=false;
      }
    } else if (action === 'save-memo') {
      await saveMemo();
    } else if (action === 'approve-memo') {
      await saveMemo({status:'approved',reviewed:data.reviewed==='on'});
    } else if (action === 'add-client') {
      const result = await api('/owner/clients',{method:'POST',data});
      await renderRoute();
      invitationDialog(result.invite);
    } else if (action === 'renew-client') {
      await api(`/owner/clients/${form.dataset.id}/renewals`,{method:'POST',data:{
        ...data,amount:data.amount.trim().replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)&15)).replace('٫','.'),
        received:data.received==='on'}});
      await renderRoute();
      flash('سُجّلت الدفعة وحُدّث الاشتراك.');
    } else if (action === 'toggle-client') {
      await api(`/owner/clients/${form.dataset.id}`,{method:'PATCH',data:{enabled:data.enabled==='true'}});
      await renderRoute();
      flash('حُدّثت حالة الحساب.');
    } else if (action === 'add-reference') {
      const checked = data.checked === 'on';
      await api('/owner/references',{method:'POST',data:{...data,checked,citable:checked}});
      await renderRoute();
      flash('حُفظ المرجع.');
    } else if (action === 'review-reference') {
      await api(`/owner/references/${form.dataset.id}`,{method:'PATCH',
        data:{approved:data.approved==='true',checked:data.checked==='on'}});
      await renderRoute();
      flash('حُدّثت إتاحة الاستشهاد.');
    }
  } catch(error) {
    setFormError(form,error);
  } finally {
    form.dataset.busy = 'false';
    controls.forEach(control=>{control.disabled=false;});
  }
});

function toggleMenu(open) {
  const shellElement = app.querySelector('.shell');
  if (!shellElement) return;
  shellElement.classList.toggle('menu-open',open);
  const toggle = app.querySelector('.menu-button');
  toggle.setAttribute('aria-expanded',String(open));
  app.querySelector('.work-area').inert = open;
  (open ? app.querySelector('.sidebar-close') : toggle).focus();
}

document.addEventListener('click', async event=>{
  const buttonEl = event.target.closest('[data-action]');
  const navigation = event.target.closest('a[href^="#"]');
  if (navigation?.classList.contains('arbitrator-launcher') && location.hash === navigation.hash) {
    event.preventDefault();
    app.querySelector('[data-form="arbitrator"] [name="question"]')?.focus();
    return;
  }
  if (navigation && state.editorDirty && !window.confirm('لديك تعديلات غير محفوظة. هل تريد مغادرة المذكرة؟')) {
    event.preventDefault();
    return;
  }
  if (navigation) state.editorDirty = false;
  if (event.target.closest('[data-export]') && state.editorDirty) {
    event.preventDefault();
    return flash('احفظ تعديلاتك أولًا لتظهر في التصدير.');
  }
  if (event.target.closest('[data-close-dialog]')) dialog.close();
  if (!buttonEl) return;
  const {action,id} = buttonEl.dataset;
  const client = state.clients.get(id);
  try {
    switch (action) {
      case 'setup-mode':
        state.authMode='setup'; authPage(); break;
      case 'login-mode':
        state.authMode='login'; history.replaceState(null,'','#'); authPage(); break;
      case 'menu-open':
        toggleMenu(true); break;
      case 'menu-close':
        toggleMenu(false); break;
      case 'dialog-close':
        dialog.close(); break;
      case 'go-search':
        if (state.editorDirty && !window.confirm('لديك تعديلات غير محفوظة. هل تريد فتح المكتبة؟')) break;
        state.editorDirty = false;
        location.hash='library?kind=law&focus=search'; break;
      case 'retry':
        await renderRoute(); break;
      case 'logout':
        if (state.editorDirty && !window.confirm('تسجيل الخروج سيغلق التعديلات غير المحفوظة. هل تتابع؟')) break;
        await api('/logout',{method:'POST',data:{}});
        clearSession(); history.replaceState(null,'','#'); authPage(); break;
      case 'reference-detail':
        await referenceDialog(state.references.get(id)); break;
      case 'copy-reference':
        addReferenceDialog(state.references.get(id)); break;
      case 'add-reference':
        addReferenceDialog({kind:readRoute().query.get('kind')||'law'}); break;
      case 'add-client':
        addClientDialog(); break;
      case 'renew-client':
        renewDialog(client); break;
      case 'invite-client': {
        openDialog('إصدار رابط دخول جديد',`<div class="stack"><p>يحل الرابط الجديد محل الدعوة السابقة لحساب ${h(client.name)}.</p>
          <div>${button('إصدار الرابط','confirm-invite','link','primary',`data-id="${id}"`)}</div></div>`);
        break;
      }
      case 'confirm-invite': {
        buttonEl.disabled=true;
        try {
          const result=await api(`/owner/clients/${id}/invite`,{method:'POST',data:{}});
          invitationDialog(result.invite);
        } finally { buttonEl.disabled=false; }
        break;
      }
      case 'copy-invite': {
        const field = dialog.querySelector('[name=inviteLink]');
        try { await navigator.clipboard.writeText(field.value); flash('نُسخ رابط الدعوة.'); }
        catch { field.focus(); field.select(); flash('حُدد الرابط للنسخ.'); }
        break;
      }
      case 'toggle-client':
        openDialog(client.enabled?'إيقاف الحساب':'إعادة تفعيل الحساب',`<form class="stack" data-form="toggle-client" data-id="${id}">
          <input type="hidden" name="enabled" value="${!client.enabled}">
          <p>${h(client.enabled?`سيُغلق الدخول إلى حساب ${client.name} وتُحفظ مذكراته.`:`سيُفتح دخول ${client.name} وفق مدة الاشتراك المسجلة.`)}</p>
          ${errorBox}${submit(client.enabled?'إيقاف الحساب':'إعادة التفعيل','check')}</form>`);
        break;
      case 'approve-memo':
        if (!document.querySelector('#editor').reportValidity()) break;
        openDialog('اعتماد المذكرة داخليًا',`<form class="stack" data-form="approve-memo">
          <label class="checkline"><input type="checkbox" name="reviewed" required> راجعت الوقائع والطلبات وصحة المراجع وسريانها على القضية.</label>
          ${errorBox}${submit('اعتماد المذكرة','checkCircle')}</form>`);
        break;
      case 'memo-language':
        state.memoLanguage=buttonEl.dataset.language;
        app.querySelectorAll('[data-memo-language]').forEach(panel=>{
          panel.hidden=panel.dataset.memoLanguage!==state.memoLanguage;
        });
        app.querySelectorAll('[data-action="memo-language"]').forEach(control=>{
          control.setAttribute('aria-pressed',String(control.dataset.language===state.memoLanguage));
        });
        break;
      case 'chat-example': {
        const question=app.querySelector('[data-form="arbitrator"] [name="question"]');
        question.value=buttonEl.dataset.question;
        question.focus();
        break;
      }
      case 'chat-reset':
        state.chat=[];
        await renderRoute({focus:true});
        break;
      case 'retry-attachment': {
        const upload = state.uploads.get(id);
        if (upload?.file) { queueUpload(upload); updateAttachmentPanel(upload.memoId); }
        break;
      }
      case 'remove-attachment':
        await deleteAttachment(id);
        break;
      case 'archive-memo':
        await saveMemo({status:'archived'}); break;
      case 'restore-memo':
        await saveMemo({status:'review'}); break;
      case 'print-memo':
        startPrint(); break;
    }
  } catch(error) { flash(error.message); }
});

let searchDelay;
document.addEventListener('input',event=>{
  const field = event.target;
  if (field.closest('#editor')) state.editorDirty=true;
  if (!field.closest('#compose')) return;
  if (field.name === 'sourceQuery') {
    clearTimeout(searchDelay);
    const value = field.value;
    searchDelay=setTimeout(()=>composeReferences(value),250);
  } else if (!['sourceId','allowModel'].includes(field.name)) {
    state.compose[field.name]=field.value;
  }
});

document.addEventListener('change',event=>{
  const field = event.target;
  if (field.matches('input[type="file"][data-memo-id]')) {
    const files = [...field.files];
    field.value = '';
    selectAttachments(field.dataset.memoId,files);
    return;
  }
  if (field.name === 'method') modelConsent();
  if (field.closest('#compose') && ['method','language'].includes(field.name)) updateComposeLanguage();
  if (field.name !== 'sourceId') return;
  if (!field.checked) state.selected.delete(field.value);
  else if (state.selected.size < 8) state.selected.add(field.value);
  else { field.checked=false; flash('يمكنك اختيار ثمانية مراجع.'); }
});

document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && app.querySelector('.menu-open')) toggleMenu(false);
});

window.addEventListener('hashchange',()=>{
  if (!state.account) authPage();
  else renderRoute({focus:true});
});
window.addEventListener('afterprint',()=>{document.querySelector('#print').textContent='';});
window.addEventListener('beforeunload',event=>{
  if (state.editorDirty || [...state.uploads.values()].some(item=>['queued','uploading'].includes(item.status) && !item.error)) {
    event.preventDefault();
    event.returnValue='';
  }
});

async function boot() {
  try {
    const result=await api('/session');
    state.account=result.account;
    state.model=result.modelAvailable;
    state.attachmentsAvailable=result.attachmentsAvailable;
    state.setup=result.setupAvailable;
    if (state.account) {
      if (location.hash.startsWith('#invite=')) history.replaceState(null,'','#overview');
      await renderRoute();
    } else authPage();
  } catch(error) {
    app.innerHTML=`<main id="main" class="loading-screen"><section class="panel form-section stack">
      ${note(error.message,'error')}<button class="button primary" id="boot-retry">إعادة المحاولة</button></section></main>`;
    app.querySelector('#boot-retry').addEventListener('click',boot,{once:true});
  }
}

boot();
