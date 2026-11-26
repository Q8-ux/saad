'use strict';
const $ = s => document.querySelector(s);
const fmt = new Intl.NumberFormat('ar-KW', { maximumFractionDigits: 1 });
const pageDefs = {
  overview: ['نظرة عامة', 'جهازك تحت النظر', 'ملخص الفحوص والقدرات المتوفرة على الكمبيوتر.', 'overview'],
  wifi: ['الواي فاي', 'البيئة اللاسلكية', 'نقاط الوصول وقوة الإشارة والقنوات المسجلة في تقرير الفحص.', 'wifi'],
  bluetooth: ['البلوتوث', 'الأجهزة القريبة', 'الأجهزة التقليدية وإعلانات البلوتوث منخفض الطاقة.', 'bluetooth'],
  neighbors: ['الشبكة المحلية', 'ضمن نطاق اتصالك', 'جدول الجيران واكتشاف محدود للأجهزة في شبكتك الخاصة.', 'network'],
  adapters: ['محولات الشبكة', 'مسارات الاتصال', 'البطاقات والعناوين والبوابات وملقمات الأسماء.', 'adapter'],
  ports: ['المنافذ والاتصالات', 'اتصالات هذا الكمبيوتر', 'اتصالات الشبكة والمنافذ المحلية والبرامج المرتبطة بها.', 'ports'],
  traffic: ['حركة الشبكة', 'عدادات فعلية', 'إجماليات النقل ومعدل التغير بين قراءتين متتاليتين.', 'traffic'],
  charts: ['القنوات وتتبع الإشارة', 'قراءة أوضح', 'توزيع شبكات الواي فاي حسب القناة وتاريخ قوة الإشارة.', 'chart'],
  hardware: ['الأجهزة المتصلة', 'عتاد الكمبيوتر', 'أجهزة USB والشبكات والبلوتوث والمنافذ التسلسلية.', 'usb'],
  system: ['معلومات الجهاز', 'مصدر واضح للقراءات', 'معلومات المتصفح، أو مواصفات الكمبيوتر وحمايته من التقرير المحفوظ.', 'shield'],
  capabilities: ['الوظائف والحدود', 'ما يدعمه البرنامج', 'تمييز الوظائف المدمجة عما يحتاج قطعة خاصة أو دعمًا إضافيًا.', 'tools'],
  reports: ['التقارير والأرشيف', 'نتائجك محفوظة عندك', 'تصدير القراءات وحفظ الفحوص دون خدمات سحابية.', 'report'],
};
const iconPaths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  bluetooth: '<path d="m7 7 11 10-6 5V2l6 5L7 17"/>',
  network: '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v4M5.5 16v-4h13v4"/>',
  adapter: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 9h10M7 12h3"/>',
  ports: '<path d="M7 3v6M17 3v6M4 9h16v4a8 8 0 0 1-16 0v-4ZM12 21v2"/>',
  traffic: '<path d="M3 18h18M3 6h18M7 2 3 6l4 4M17 14l4 4-4 4"/>',
  chart: '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
  usb: '<path d="M12 21V3m-3 3 3-3 3 3M12 15l-5-4V8M12 12l5-3V6"/><circle cx="12" cy="21" r="2"/><circle cx="7" cy="7" r="1.5"/><rect x="15.5" y="3" width="3" height="3"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
  tools: '<path d="m14 6 4-4a6 6 0 0 0-7 7l-8 8a3 3 0 0 0 4 4l8-8a6 6 0 0 0 7-7l-4 4-4-4Z"/>',
  report: '<path d="M6 2h8l4 4v16H6V2ZM14 2v5h5M9 11h6M9 15h6M9 18h3"/>',
  scan: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M4 12h16"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  refresh: '<path d="M20 7a9 9 0 1 0 1 8M20 2v6h-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  save: '<path d="M3 3h15l3 3v15H3V3ZM7 3v6h10V3M7 21v-8h10v8"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
};
let state = null, config = null, route = 'overview', lastSignature = '', started = false, toastTimer;
let sessionCache = null, band = '2.4', selectedSignal = '', autoWifi = false, autoTraffic = false;
const searches = {}, pages = {}, trafficRates = new Map();
let trafficPrevious = null;

function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
function icon(name) { const n = el('span', 'nav-icon'); n.setAttribute('aria-hidden', 'true'); n.innerHTML = '<svg viewBox="0 0 24 24">' + (iconPaths[name] || iconPaths.info) + '</svg>'; return n; }
function button(text, action, cls = 'secondary', symbol = '', id = '') { const n = el('button', 'button ' + cls); n.type = 'button'; if (id) n.id = id; if (symbol) n.append(icon(symbol)); n.append(document.createTextNode(text)); n.addEventListener('click', action); return n; }
function display(v) { if (v == null || v === '') return '—'; if (Array.isArray(v)) return v.filter(x => x != null && x !== '').join('، ') || '—'; if (typeof v === 'boolean') return v ? 'نعم' : 'لا'; return String(v); }
function num(v) { return v == null ? '—' : fmt.format(v); }
function when(t, full = false) { if (!t) return 'لم يُسجل'; const d = new Date(t); if (!Number.isFinite(d.getTime()) || d.getFullYear() < 2000) return 'لم يُسجل'; return new Intl.DateTimeFormat('ar-KW', full ? { dateStyle: 'short', timeStyle: 'short' } : { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d); }
function bytes(v) { if (v == null || !Number.isFinite(Number(v))) return '—'; const n = Number(v), units = ['بايت', 'ك.بايت', 'م.بايت', 'ج.بايت', 'ت.بايت']; let x = n, i = 0; while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; } return num(x) + ' ' + units[i]; }
function badge(text, kind = 'neutral') { return el('span', 'badge ' + kind, text); }
function status(s) { if (!s) return badge('لم يُفحص'); return ({ ready: () => badge('اكتملت القراءة', 'success'), running: () => badge('جارٍ الفحص', 'running'), error: () => badge('تعذرت القراءة', 'error'), idle: () => badge('لم يُفحص') }[s.status] || (() => badge('غير متاح')))(); }
function section(id) { return state?.sections?.[id] || { status: 'idle', data: [], message: 'لم يبدأ الفحص بعد' }; }
function rows(id) { const d = section(id).data; return Array.isArray(d) ? d : (d && typeof d === 'object' ? [d] : []); }
function toast(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
async function api(path, data) { return window.MirsadWeb.api(path, data); }
async function scan(id = 'all', active = false) { try { const r = await api('/api/scan', { section: id, active }); if (!r.started) toast('هذا الفحص جارٍ بالفعل'); await poll(true); } catch (e) { toast(userError(e)); } }
async function setting(page) { try { await api('/api/settings', { page }); } catch (e) { toast(userError(e)); } }
function buildNavigation() {
  const nav = $('#navigation'); nav.replaceChildren();
  for (const [key, def] of Object.entries(pageDefs)) {
    if (key === 'capabilities') nav.append(el('div', 'nav-separator'));
    const b = el('button', 'nav-button'); b.type = 'button'; b.dataset.route = key; b.append(icon(def[3]), el('span', '', def[0])); b.addEventListener('click', () => { if(location.hash==='#'+key)setRoute();else location.hash=key; }); nav.append(b);
  }
}
function setRoute() { const key = location.hash.slice(1); route = pageDefs[key] ? key : 'overview'; $('.sidebar').classList.remove('open'); $('#menu-button').setAttribute('aria-expanded', 'false'); render(); }
function buildActions() {
  const out = $('#page-actions'); out.replaceChildren();
  const open=()=>showReportDialog();
  if(route==='overview'){out.append(button('فتح تقرير الفحص',open,'primary','report','open-report'),button('قراءة المتصفح',useBrowserMode,'secondary','adapter','read-browser'));return;}
  if(route==='reports'){out.append(button('فتح تقرير',open,'primary','report'),button('حفظ القراءات',saveSession,'secondary','save'));return;}
  if(state.web?.mode!=='report'&&route==='bluetooth'){
    const choose=button('اختيار جهاز بلوتوث',()=>scan('bluetooth'),'primary','bluetooth','choose-bluetooth');out.append(choose);
    const read=button('قراءة خصائص الجهاز',readBluetoothDetails,'secondary','refresh','read-bluetooth');read.disabled=!rows('bluetooth').length;out.append(read);return;
  }
  if(state.web?.mode!=='report'&&route==='hardware'){out.append(button('اختيار منفذ تسلسلي',()=>scan('serial'),'primary','usb','choose-serial'));}
  if(state.web?.mode!=='report'&&route==='system')out.append(button('تحديث معلومات المتصفح',()=>scan('system'),'primary','refresh'));
  out.append(button(state.web?.mode==='report'?'فتح تقرير أحدث':'فتح تقرير الكمبيوتر',open,'secondary','report','open-report'));
}
function render() {
  if (!state) return;
  const focus = document.activeElement, focusID = focus?.id, cursor = typeof focus?.selectionStart === 'number' ? focus.selectionStart : null;
  const scrollTop = document.scrollingElement.scrollTop;
  const d = pageDefs[route]; $('#page-title').textContent = d[0]; $('#page-eyebrow').textContent = d[1]; $('#page-description').textContent = d[2]; $('#breadcrumb-current').textContent = d[0];
  document.querySelectorAll('[data-route]').forEach(n => { n.classList.toggle('active', n.dataset.route === route); n.setAttribute('aria-current', n.dataset.route === route ? 'page' : 'false'); });
  buildActions(); renderWebSource();
  const running = Object.values(state.sections).filter(s => s.status === 'running'); $('#global-progress').hidden = running.length === 0;
  $('#progress-label').textContent = 'الفحوص الجارية: ' + num(running.length); $('#progress-detail').textContent = 'تظهر النتائج فور اكتمال كل قراءة';
  const target = $('#page-content'); target.replaceChildren();
  const fns = { overview: overviewPage, charts: chartsPage, reports: reportsPage, capabilities: capabilitiesPage, system: systemPage, hardware: hardwarePage };
  (fns[route] || (() => dataPage(route)))(target);
  const updated = Object.values(state.sections).map(s => s.updatedAt).filter(t => new Date(t).getFullYear() >= 2000).sort().at(-1);
  $('#last-updated').textContent = updated ? 'آخر قراءة: ' + when(updated) : 'لم تكتمل قراءة بعد';
  if (focusID) { const n = document.getElementById(focusID); if (n) { n.focus({ preventScroll: true }); if (cursor != null && n.setSelectionRange) n.setSelectionRange(cursor, cursor); } }
  document.scrollingElement.scrollTop = scrollTop;
}
function notice(text, kind = '', actions = []) { const n = el('div', 'notice ' + kind); n.append(icon('info')); const content = el('div'); content.append(el('p', '', text)); if (actions.length) { const a = el('div', 'inline-actions'); a.append(...actions); content.append(a); } n.append(content); return n; }
function sectionNotice(id) {
  const s = section(id), text = s.status === 'idle' ? 'لم يُفحص هذا القسم بعد. استخدم زر تحديث الفحص لبدء القراءة.' : s.message;
  let msg = text; if (s.status === 'error' && rows(id).length) msg += ' النتائج المعروضة أدناه من قراءة سابقة في ' + when(s.updatedAt, true) + '.';
  const a = id === 'wifi' && s.status === 'error' ? [button('إعدادات الموقع', () => setting('location'), 'secondary'), button('إعدادات الواي فاي', () => setting('wifi'), 'secondary')] : [];
  return notice(msg, s.status === 'error' ? 'error' : '', a);
}
function panel(title, subtitle = '', action = null) { const n = el('div', 'panel'), h = el('div', 'panel-heading'), text = el('div'); text.append(el('h2', '', title)); if (subtitle) text.append(el('p', '', subtitle)); h.append(text); if (action) h.append(action); n.append(h); return n; }
function empty(title, text, symbol = 'search', action = null) { const n = el('div', 'empty-state'), i = el('div', 'empty-icon'); i.append(icon(symbol)); n.append(i, el('h3', '', title), el('p', '', text)); if (action) n.append(action); return n; }
function overviewPage(target) {
  const sys = rows('system')[0];
  const hero = el('div', 'hero-panel'), copy = el('div', 'hero-copy'); copy.append(el('span', 'pill', state.web?.mode==='report'?'تقرير محفوظ · قراءة محلية':'مرصد ويب · خصوصية محلية'), el('h2', '', state.web?.mode==='report'?'تفاصيل تقريرك، بوضوح':'قراءات جهازك، بواجهة عربية'), el('p', '', 'افتح تقرير مرصد لعرض الشبكات والأجهزة والقنوات، أو اقرأ ما يتيحه المتصفح. كل نتيجة تحمل مصدرها ووقت قراءتها.'));
  const meta = el('div', 'hero-meta'); for (const [name, text] of [['adapter', sys?.Computer || (state.web?.mode==='report'?'جهاز التقرير':'هذا المتصفح')], ['shield', 'بياناتك تبقى على جهازك'], ['clock', 'لا اشتراك ولا مفاتيح خدمات']]) { const s = el('span'); s.append(icon(name), document.createTextNode(text)); meta.append(s); } copy.append(meta);
  const art = el('div', 'hero-art'); art.setAttribute('aria-hidden', 'true'); art.innerHTML = '<svg class="radar-graphic" viewBox="0 0 220 220"><circle class="radar-ring" cx="110" cy="110" r="90"/><circle class="radar-ring" cx="110" cy="110" r="65"/><circle class="radar-ring" cx="110" cy="110" r="38"/><path class="radar-cross" d="M20 110h180M110 20v180"/><path fill="#56dcc51a" d="M110 110 110 20A90 90 0 0 1 174 46Z"/><path class="radar-beam" d="m110 110 64-64"/><circle class="radar-spot" cx="110" cy="110" r="5"/><circle class="radar-spot" cx="68" cy="142" r="4"/><circle class="radar-spot" cx="146" cy="123" r="3"/><circle class="radar-spot" cx="97" cy="62" r="3"/></svg><span class="art-caption">رسم توضيحي</span>';
  hero.append(copy, art); target.append(hero);
  const stats = el('div', 'stats-grid');
  for (const [id, name, symbol, note] of [['wifi', 'نقاط وصول الواي فاي', 'wifi', 'وفق بطاقة الجهاز وأذوناته'], ['neighbors', 'سجلات الشبكة المحلية', 'network', 'وفق جدول الجيران في ويندوز'], ['bluetooth', 'أجهزة البلوتوث', 'bluetooth', 'المعروفة أو المرصودة في الفحص'], ['adapters', 'محولات الشبكة', 'adapter', 'المحولات التي يعرّفها النظام']]) {
    const s = section(id), card = el('div', 'stat-card'), top = el('div', 'stat-top'), i = el('span', 'stat-icon'); i.append(icon(symbol)); top.append(el('span', '', name), i); const value = s.status === 'ready' || rows(id).length ? num(rows(id).length) : '—'; card.append(top, el('div', 'stat-value', value), el('p', 'stat-bottom', s.status === 'error' && rows(id).length ? 'قراءة سابقة — تعذر التحديث' : s.status === 'error' ? 'تعذرت القراءة — راجع القسم' : s.status === 'running' ? 'جارٍ القراءة' : state.web?.mode==='report'?'سجلات من التقرير المحفوظ':rows(id).length?'اختيارات أذنت بها في المتصفح':'تُعرض عند فتح تقرير الكمبيوتر')); stats.append(card);
  } target.append(stats);
  const grid = el('div', 'dashboard-grid'), checks = panel('حالة الأقسام', 'المصدر يحدد ما يمكن عرضه في كل قسم'), body = el('div', 'panel-body');
  for (const [id, label, symbol] of [['wifi', 'شبكات الواي فاي', 'wifi'], ['bluetooth', 'البلوتوث', 'bluetooth'], ['neighbors', 'الشبكة المحلية', 'network'], ['ports', 'المنافذ والاتصالات', 'ports'], ['hardware', 'الأجهزة المتصلة', 'usb'], ['security', 'جدار الحماية', 'shield']]) { const row = el('div', 'check-row'), labelEl = el('span', 'check-label'); labelEl.append(icon(symbol), document.createTextNode(label)); row.append(labelEl, status(section(id))); body.append(row); } checks.append(body);
  const activity = panel('سجل العمليات', 'القراءات وفتح التقارير داخل مرصد'), logs = el('div', 'panel-body');
  if (!state.logs.length) logs.append(el('p', 'activity-text muted', 'سيظهر سجل العمليات عند بدء الفحص.'));
  for (const entry of state.logs.slice(-5).reverse()) { const row = el('div', 'activity-row'), text = el('div'); text.append(el('p', 'activity-text', entry.text), el('p', 'activity-time', when(entry.time))); row.append(el('span', 'activity-mark ' + entry.level), text); logs.append(row); } activity.append(logs); grid.append(checks, activity); target.append(grid);
  const hint = el('div', 'overview-hint'); hint.append(icon('info'), el('span', '', 'الموقع يقرأ التقرير داخل متصفحك. مسح الواي فاي ومنافذ ويندوز يحتاج برنامج الكمبيوتر؛ لا تُنشأ قراءات عند غيابها.')); target.append(hint);
}
const translatedStates = { Up: 'متصل', Down: 'متوقف', Disconnected: 'غير متصل', Disabled: 'معطل', Unknown: 'غير معروف', NotPresent: 'غير موجود', OK: 'يعمل', Error: 'خطأ', Degraded: 'أداء متراجع', Established: 'اتصال قائم', Listen: 'استماع', Listening: 'استماع', Bound: 'محجوز', Closed: 'مغلق', CloseWait: 'انتظار إغلاق', Closing: 'قيد الإغلاق', DeleteTcb: 'قيد الإزالة', FinWait1: 'انتظار إنهاء أول', FinWait2: 'انتظار إنهاء ثانٍ', LastAck: 'انتظار إقرار أخير', SynReceived: 'استقبال طلب اتصال', SynSent: 'إرسال طلب اتصال', TimeWait: 'انتظار مؤقت', Unreachable: 'متعذر الوصول', Incomplete: 'غير مكتمل', Probe: 'قيد التحقق', Delay: 'انتظار التحقق', Stale: 'سجل سابق', Reachable: 'يمكن الوصول إليه', Permanent: 'دائم', Domain: 'نطاق المؤسسة', Private: 'خاصة', Public: 'عامة', Allow: 'سماح', Block: 'حجب', NotConfigured: 'غير محدد في هذا الملف', Bluetooth: 'بلوتوث', Net: 'شبكة', Ports: 'منافذ اتصال', USB: 'ناقل تسلسلي عام', USBDevice: 'جهاز USB', On: 'مفعّل', Off: 'متوقف' };
function translated(v) { return translatedStates[v] || display(v); }
function mono(v) { return el('bdi', 'mono ltr', display(v)); }
function textCell(v) { return el('span', '', display(v)); }
function stateCell(v) { return badge(translated(v), ['Up', 'OK', 'Established', 'Reachable', 'استجاب'].includes(v) ? 'success' : ['Stale', 'Unreachable', 'Disconnected', 'Error'].includes(v) ? 'warn' : 'neutral'); }
function signalCell(row) { const n = el('div', 'signal-wrap'), bars = el('span', 'signal-bars'); bars.setAttribute('aria-hidden', 'true'); for (let i = 1; i <= 4; i++) bars.append(el('i', row.signal >= (i - 1) * 25 + 1 ? 'on' : '')); n.append(el('bdi', 'signal-value', num(row.signal) + '٪'), bars); return n; }
const columns = {
  wifi: [['الشبكة', r => { const n = el('div'); n.append(el('span', 'cell-primary', r.ssid), el('small', 'cell-secondary', r.cached ? 'محفوظة لدى النظام وقت الفحص' : state.web?.mode==='report'?'قراءة وقت حفظ التقرير':'قراءة متاحة')); return n; }], ['جودة الإشارة', signalCell], ['القوة', r => mono(r.rssi + ' dBm')], ['القناة', r => textCell(num(r.channel))], ['النطاق', r => mono(r.band + ' GHz')], ['الحماية', r => badge(r.security, r.security === 'مفتوحة' ? 'warn' : 'neutral')], ['عنوان نقطة الوصول', r => mono(r.bssid)], ['المحول', r => textCell(r.adapter)], ['وقت الرصد', r => textCell(when(r.observedAt))]],
  bluetooth: [['الجهاز', r => el('span', 'cell-primary', r.name)], ['النوع', r => textCell(r.kind)], ['العنوان', r => mono(r.address)], ['القوة', r => r.rssi == null ? textCell('غير متاحة') : mono(r.rssi + ' dBm')], ['الاتصال', r => r.kind === 'بلوتوث منخفض الطاقة' ? textCell('إعلان مرصود') : badge(r.connected ? 'متصل' : 'غير متصل', r.connected ? 'success' : 'neutral')], ['الاقتران', r => r.paired==null?textCell('غير مكشوف للمتصفح'):r.kind === 'بلوتوث منخفض الطاقة' ? textCell('لا يحدده الإعلان') : textCell(r.paired ? 'مقترن' : 'غير مقترن')], ['وقت الرصد أو الاختيار', r => textCell(when(r.seenAt))]],
  neighbors: [['عنوان الجهاز', r => mono(r.ip)], ['العنوان الفيزيائي', r => mono(r.mac)], ['الحالة', r => stateCell(r.state)], ['المحول', r => textCell(r.interface)], ['المصدر', r => textCell(r.source)], ['زمن الرد', r => textCell(r.rtt == null ? 'لم يُقَس' : num(r.rtt) + ' مللي ثانية')]],
  adapters: [['المحول', r => el('span', 'cell-primary', r.Name)], ['الحالة', r => stateCell(r.Status)], ['الوصف', r => textCell(r.Description)], ['العناوين', r => mono(display(r.IPv4))], ['البوابة', r => mono(display(r.Gateway))], ['ملقمات الأسماء', r => mono(display(r.DNS))], ['سرعة الارتباط', r => mono(r.LinkSpeed)], ['العنوان الفيزيائي', r => mono(r.MAC)]],
  ports: [['البرنامج', r => el('span', 'cell-primary', display(r.Process))], ['البروتوكول', r => mono(r.Protocol)], ['العنوان المحلي', r => mono(r.LocalAddress)], ['المنفذ المحلي', r => mono(r.LocalPort)], ['العنوان المقابل', r => mono(r.RemoteAddress)], ['المنفذ المقابل', r => mono(r.RemotePort)], ['الحالة', r => stateCell(r.State)], ['معرّف العملية', r => mono(r.PID)]],
  traffic: [['المحول', r => el('span', 'cell-primary', r.Name)], ['المستلم', r => textCell(bytes(r.ReceivedBytes))], ['المرسل', r => textCell(bytes(r.SentBytes))], ['الاستلام بالثانية', r => textCell(trafficRates.has(r.Name) ? bytes(trafficRates.get(r.Name).rx) + '/ثانية' : state.web?.mode==='report'?'غير مقاس في هذا التقرير':'ينتظر قراءة ثانية')], ['الإرسال بالثانية', r => textCell(trafficRates.has(r.Name) ? bytes(trafficRates.get(r.Name).tx) + '/ثانية' : state.web?.mode==='report'?'غير مقاس في هذا التقرير':'ينتظر قراءة ثانية')], ['أخطاء الاستلام', r => textCell(num(r.ReceivedErrors))], ['أخطاء الإرسال', r => textCell(num(r.SentErrors))]],
  hardware: [['الجهاز', r => el('span', 'cell-primary', display(r.Name))], ['الفئة', r => textCell(translated(r.Class))], ['الحالة', r => stateCell(r.Status)], ['برنامج التشغيل', r => mono(r.Service)], ['معرّف الجهاز', r => mono(r.DeviceID)]],
  serial: [['المنفذ', r => mono(r.Port)], ['الاسم', r => textCell(r.Name)], ['الوصف', r => textCell(r.Description)], ['الحالة', r => stateCell(r.Status)]],
  security: [['ملف الشبكة', r => textCell(translated(r.Profile))], ['جدار الحماية', r => badge(r.Enabled ? 'مفعّل' : 'متوقف', r.Enabled ? 'success' : 'warn')], ['الإجراء الوارد', r => textCell(translated(r.Inbound))], ['الإجراء الصادر', r => textCell(translated(r.Outbound))]],
};
function makeTable(id, title = '', dataOverride = null) {
  const wrap = el('div', 'panel'); if (title) { const h = el('div', 'panel-heading'); h.append(el('h2', '', title)); wrap.append(h); }
  const toolbar = el('div', 'section-toolbar'), search = el('div', 'search-field'), input = el('input'); input.type = 'search'; input.placeholder = 'ابحث داخل النتائج…'; input.setAttribute('aria-label', 'البحث في نتائج ' + (title || pageDefs[id]?.[0] || id)); input.id = 'search-' + id; input.value = searches[id] || ''; search.append(icon('search'), input); const count = el('span', 'table-count'); toolbar.append(search, count); wrap.append(toolbar);
  const holder = el('div'), footer = el('div', 'table-footer'); wrap.append(holder, footer);
  function draw() {
    const all = dataOverride || rows(id), query = (searches[id] || '').toLowerCase(); const filtered = query ? all.filter(r => Object.values(r).map(display).join(' ').toLowerCase().includes(query)) : all;
    const pageCount = Math.max(1, Math.ceil(filtered.length / 40)); pages[id] = Math.min(pages[id] || 0, pageCount - 1); const chunk = filtered.slice(pages[id] * 40, pages[id] * 40 + 40); count.textContent = 'النتائج: ' + num(filtered.length); holder.replaceChildren(); footer.replaceChildren();
    if (!chunk.length) {
      const s = section(id); holder.append(empty(query ? 'لا توجد نتائج مطابقة' : s.status === 'running' ? 'جارٍ قراءة الجهاز' : s.status === 'error' ? 'لم تتوفر قراءة' : s.status === 'idle' ? 'جاهز للفحص' : 'لم تظهر نتائج في هذه القراءة', query ? 'جرّب عبارة أخرى أو امسح البحث.' : s.status === 'running' ? 'يستغرق فحص بعض الأجهزة بضع ثوانٍ.' : s.status === 'error' ? 'راجع سبب التعذر أعلاه ثم أعد الفحص.' : 'عدم ظهور نتائج لا يثبت غياب الأجهزة. تحقق من الاتصال والأذونات.', pageDefs[id]?.[3] || 'search')); footer.hidden = true; return;
    }
    footer.hidden = false; const scroll = el('div', 'table-scroll'), table = el('table'), thead = el('thead'), tr = el('tr'); table.setAttribute('aria-label', title || pageDefs[id]?.[0] || 'نتائج الفحص'); const defs = id==='bluetooth'&&state.web?.mode==='browser'?[...columns[id],['البطارية',r=>textCell(r.battery==null?'غير متاحة':num(r.battery)+'٪')],['الجهة الصانعة',r=>textCell(r.manufacturer)],['الطراز',r=>textCell(r.model)],['البرنامج الثابت',r=>textCell(r.firmware)]]:columns[id]; for (const [label] of defs) { const th = el('th', '', label); th.scope = 'col'; tr.append(th); } thead.append(tr); table.append(thead); const tbody = el('tbody'); for (const row of chunk) { const tr = el('tr'); for (const [, cell] of defs) { const td = el('td'); td.append(cell(row)); tr.append(td); } tbody.append(tr); } table.append(tbody); scroll.append(table); holder.append(scroll);
    footer.append(el('span', '', 'صفحة ' + num(pages[id] + 1) + ' من ' + num(pageCount))); const nav = el('div', 'page-nav'), previous = button('السابق', () => { pages[id]--; draw(); }, 'quiet'), next = button('التالي', () => { pages[id]++; draw(); }, 'quiet'); previous.disabled = pages[id] === 0; next.disabled = pages[id] >= pageCount - 1; nav.append(previous, next); footer.append(nav);
  }
  input.addEventListener('input', () => { searches[id] = input.value; pages[id] = 0; draw(); }); draw(); return wrap;
}
function autoToggle(id) { const label = el('label', 'toggle-label'), input = el('input'); input.type = 'checkbox'; input.id = 'auto-' + id; input.checked = id === 'wifi' ? autoWifi : autoTraffic; input.addEventListener('change', () => { if (id === 'wifi') autoWifi = input.checked; else autoTraffic = input.checked; }); label.append(input, document.createTextNode('تحديث تلقائي كل ١٥ ثانية')); return label; }
function dataPage(id, target = $('#page-content')) { target.append(sectionNotice(id)); const meta = el('div', 'section-meta'); meta.append(status(section(id)), el('span', '', 'آخر قراءة ناجحة: ' + when(section(id).updatedAt, true)));  target.append(meta, makeTable(id)); }
function hardwarePage(target) { target.append(sectionNotice('hardware'), makeTable('hardware')); const space = el('div', 'spaced'); space.append(sectionNotice('serial'), makeTable('serial', 'المنافذ التسلسلية')); target.append(space); }
function systemPage(target) {
  target.append(sectionNotice('system')); const sys = rows('system')[0], specs = el('div', 'spec-grid'); const browserSystem=state.web?.mode==='browser'||Object.prototype.hasOwnProperty.call(sys||{},'BrowserOnline'); const labels = browserSystem?[['Computer','المنصة المبلغ عنها'],['OS','النظام المبلغ عنه'],['CPU','عدد المعالجات المنطقية المبلغ عنها'],['MemoryGB','الذاكرة التقريبية المتاحة للمتصفح'],['Build','هوية المتصفح'],['BrowserOnline','الإبلاغ عن اتصال — ليس اختبار إنترنت'],['BrowserConnection','تقدير المتصفح للاتصال']]:[['Computer','اسم الكمبيوتر'],['OS','نظام التشغيل'],['CPU','المعالج'],['MemoryGB','الذاكرة'],['Architecture','بنية النظام'],['Build','رقم البناء'],['Boot','آخر بدء للنظام']];
  if (sys) { for (const [key, label] of labels) { const card = el('div', 'spec-card'); card.append(el('small', '', label), el('strong', '', key === 'MemoryGB' ? (sys[key]==null?'غير متاح':num(sys[key]) + ' جيجابايت') : key === 'Boot' ? when(sys[key], true) : display(sys[key]))); specs.append(card); } target.append(specs); } else { const p = el('div', 'panel'); p.append(empty('لم تتوفر مواصفات الجهاز', 'تظهر المعلومات التي يتيحها المتصفح أو التي يحتويها التقرير.', 'adapter')); target.append(p); }
  const space = el('div', 'spaced'); space.append(sectionNotice('security'), makeTable('security', 'جدار حماية ويندوز')); target.append(space);
}
function svgChart(inner, label, width = 600, height = 260) { const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); n.setAttribute('viewBox', `0 0 ${width} ${height}`); n.setAttribute('role', 'img'); n.setAttribute('aria-label', label); n.innerHTML = inner; return n; }
function chartsPage(target) {
  target.append(sectionNotice('wifi')); const grid = el('div', 'charts-grid'), channels = panel('توزيع الشبكات على القنوات', 'قراءات الملف المحفوظ حسب القناة، وليست فحصًا حيًا'), controls = el('div', 'chart-controls'), select = el('select', 'select-control'); select.id = 'band-select'; select.setAttribute('aria-label', 'نطاق تردد الواي فاي'); for (const [value, label] of [['2.4', 'نطاق ٢٫٤ جيجاهرتز'], ['5', 'نطاق ٥ جيجاهرتز'], ['6', 'نطاق ٦ جيجاهرتز']]) { const o = el('option', '', label); o.value = value; o.selected = value === band; select.append(o); } select.addEventListener('change', () => { band = select.value; render(); }); controls.append(select); channels.append(controls);
  const chart = el('div', 'chart-wrap'), data = rows('wifi').filter(r => r.band === band && (state.web?.mode==='report' || !r.cached)), counts = new Map(); for (const r of data) counts.set(r.channel, (counts.get(r.channel) || 0) + 1);
  if (!data.length) chart.append(empty('لا توجد قراءات لهذا النطاق', 'افتح تقرير مرصد يحتوي على الواي فاي، أو اختر نطاقًا آخر من التقرير.', 'chart'));
  else {
    const keys = band === '2.4' ? Array.from({ length: 14 }, (_, i) => i + 1) : [...counts.keys()].sort((a, b) => a - b); const max = Math.max(...counts.values(), 1), w = 600, baseline = 216, pad = 45, dx = (w - 2 * pad) / keys.length; let markup = '';
    for (let i = 0; i <= max && i <= 6; i++) { const val = i * max / Math.min(max, 6), y = baseline - val / max * 170; markup += `<line class="chart-grid" x1="${pad}" x2="${w - 20}" y1="${y}" y2="${y}"/><text class="chart-axis" x="27" y="${y + 4}" text-anchor="middle">${num(val)}</text>`; }
    keys.forEach((key, i) => { const n = counts.get(key) || 0, x = pad + i * dx + dx * .16, h = n / max * 170; markup += `<rect class="chart-bar" x="${x}" y="${baseline - h}" width="${dx * .68}" height="${h}" rx="3"/><text class="chart-axis" x="${x + dx * .34}" y="239" text-anchor="middle">${num(key)}</text>`; }); chart.append(svgChart(markup, 'عدد نقاط الوصول المسجلة لكل قناة')); }
  channels.append(chart, el('p', 'chart-summary', 'هذا الرسم يصف شبكات الواي فاي المرئية، ولا يقيس التشويش أو كامل الطيف الراديوي.'));
  const signal = panel('تاريخ قوة الإشارة', 'القراءات المسجلة في التقرير لنقطة الوصول المختارة'), choose = el('div', 'chart-controls'), picker = el('select', 'select-control'); picker.id = 'signal-select'; picker.setAttribute('aria-label', 'نقطة الوصول المراد تتبعها');
  const available = rows('wifi').filter(r => state.history[r.adapter + '|' + r.bssid]?.length); if (!available.some(r => r.adapter + '|' + r.bssid === selectedSignal)) selectedSignal = available[0] ? available[0].adapter + '|' + available[0].bssid : '';
  if (!available.length) { const o = el('option', '', 'بانتظار قراءات فعلية'); picker.append(o); picker.disabled = true; }
  for (const r of available) { const o = el('option', '', r.ssid + ' — ' + r.bssid); o.value = r.adapter + '|' + r.bssid; o.selected = o.value === selectedSignal; picker.append(o); } picker.addEventListener('change', () => { selectedSignal = picker.value; render(); }); choose.append(picker); signal.append(choose);
  const plot = el('div', 'chart-wrap'), points = state.history[selectedSignal] || [];
  if (points.length < 2) plot.append(empty('يلزم رصد نقطتين على الأقل', 'افتح تقريرًا يحتوي تاريخًا فعليًا للإشارة. الموقع لا يولّد نقاط قياس مفقودة.', 'chart'));
  else {
    const lo = Math.min(-90, ...points.map(p => p.rssi - 5)), hi = Math.max(-30, ...points.map(p => p.rssi + 5)), start = new Date(points[0].time).getTime(), end = new Date(points.at(-1).time).getTime(), width = 500; let markup = '';
    for (let i = 0; i <= 4; i++) { const y = 30 + i * 44; markup += `<line class="chart-grid" x1="48" x2="480" y1="${y}" y2="${y}"/><text class="chart-axis" x="25" y="${y + 4}" text-anchor="middle">${Math.round(hi - i / 4 * (hi - lo))}</text>`; }
    const path = points.map((p, i) => { const x = 48 + (new Date(p.time).getTime() - start) / Math.max(1, end - start) * 432, y = 206 - (p.rssi - lo) / (hi - lo) * 176; return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' '); markup += `<path class="chart-line" d="${path}"/>`; plot.append(svgChart(markup, 'تغير قوة الإشارة بالديسيبل ملي واط مع الوقت', width, 250));
  }
  signal.append(plot, el('p', 'chart-summary', 'قوة الإشارة لا تعني مسافة أو اتجاهًا. عدد القراءات: ' + num(points.length))); grid.append(channels, signal); target.append(grid);
}
function capabilitiesPage(target) { target.append(notice('هذه قدرات نسخة الويب. عرض تقرير محفوظ لا يمنح الموقع وصولًا مباشرًا إلى عتاد الكمبيوتر.')); const grid = el('div', 'capability-grid'); for (const c of state.capabilities) { const card = el('article', 'capability-card'), labels = { supported: ['متاح في الموقع', 'success'], hardware: ['يتطلب قطعة ودعمًا إضافيًا', 'warn'], unavailable: ['غير متاح مباشرة', 'neutral'], excluded: ['خارج نطاق البرنامج', 'neutral'] }, [label, kind] = labels[c.status] || labels.unavailable; card.append(badge(label, kind), el('h3', '', c.name), el('p', '', c.detail)); grid.append(card); } target.append(grid); }
function reportsPage(target) {
  target.append(notice('يُحفظ الأرشيف في هذا المتصفح فقط. تقارير الكمبيوتر قد تحتوي أسماء الأجهزة وعناوينها؛ لا يرفعها مرصد إلى خادم.'));
  const grid=el('div','export-grid');
  for(const [format,name,detail]of [['html','تقرير عربي للطباعة','ملف مستقل يُفتح محليًا ويمكن حفظه PDF من نافذة الطباعة.'],['csv','جدول بيانات القراءات','سجلات مفصلة، مع أسماء الحقول بالعربية، لبرنامج الجداول.'],['json','نسخة القراءات كاملة','صيغة يمكن فتحها مجددًا في مرصد، مع المصدر والأوقات.']]){
    const card=el('article','export-card');card.append(el('div','export-icon',format.toUpperCase()),el('h2','',name),el('p','',detail),button('تنزيل الملف',()=>downloadReport(format),'secondary','download'));grid.append(card);
  }target.append(grid);
  const archive=panel('الأرشيف داخل المتصفح','آخر ٢٠ تقريرًا حفظتها هنا',button('حفظ القراءات الحالية',saveSession,'quiet','save'));const body=el('div','panel-body');body.id='session-list';archive.append(body);target.append(archive);
  const actions=el('div','archive-actions');actions.append(button('فتح تقرير من الجهاز',showReportDialog,'secondary','report'),button('مسح الأرشيف المحلي',clearLocalArchive,'quiet danger-button'));target.append(actions);drawSessions();if(sessionCache===null)loadSessions();
}
function drawSessions(){const body=$('#session-list');if(!body)return;body.replaceChildren();if(!sessionCache?.length){body.append(el('p','muted activity-text',sessionCache===null?'جارٍ قراءة الأرشيف…':'لم تحفظ تقريرًا بعد. استخدم «حفظ القراءات الحالية».'));return;}
 for(const item of sessionCache){const row=el('div','session-row');const actions=el('div','session-actions');actions.append(button('فتح',async()=>{try{window.MirsadWeb.openArchive(item.name);await poll(true);location.hash='overview';toast('فُتح التقرير المحفوظ.');}catch(e){toast(userError(e));}},'quiet'),button('تنزيل',()=>{try{downloadReport('json',window.MirsadWeb.archiveSnapshot(item.name));}catch(e){toast(userError(e));}},'quiet'));row.append(mono(item.name),actions);body.append(row);}}
async function loadSessions() { try { sessionCache = await api('/api/sessions'); drawSessions(); } catch (e) { toast(userError(e)); } }
async function saveSession() { try { const r = await api('/api/save', {}); toast('حُفظ الفحص على جهازك: ' + r.name); sessionCache = null; await loadSessions(); } catch (e) { toast(userError(e)); } }
function updateTraffic(next) { if(next.web?.mode==='report'){trafficPrevious=null;trafficRates.clear();return;} const s = next.sections.traffic; if (s.status !== 'ready' || !Array.isArray(s.data)) return; if (trafficPrevious?.time === s.updatedAt) return; const now = Date.parse(s.updatedAt); trafficRates.clear(); if (trafficPrevious) { const dt = (now - Date.parse(trafficPrevious.time)) / 1000; if (dt > 0 && dt < 120) { for (const row of s.data) { const old = trafficPrevious.rows.find(r => r.Name === row.Name); if (old && row.ReceivedBytes >= old.ReceivedBytes && row.SentBytes >= old.SentBytes) trafficRates.set(row.Name, { rx: (row.ReceivedBytes - old.ReceivedBytes) / dt, tx: (row.SentBytes - old.SentBytes) / dt }); } } } trafficPrevious = { time: s.updatedAt, rows: s.data }; }
async function poll(force = false) { try { const next = await api('/api/state'); updateTraffic(next); const signature = JSON.stringify(next); state = next; $('#connection-error').hidden = true; $('#connection-label').textContent = next.web?.mode==='report'?'عرض تقرير محفوظ':'وضع المتصفح'; if (force || signature !== lastSignature) { lastSignature = signature; render(); } if (!started && !next.installing) { started = true; await scan('all'); } } catch (e) { $('#connection-error').textContent = 'انقطع الاتصال بالبرنامج المحلي. أعد فتح ملف مرصد إذا أغلقت الخدمة.'; $('#connection-error').hidden = false; $('#connection-label').textContent = 'الاتصال متوقف'; } }
function userError(e){const m=String(e?.message||'');if(/[\u0600-\u06ff]/.test(m))return m;if(['NotFoundError','AbortError'].includes(e?.name))return 'أُلغي الاختيار؛ لم تُقرأ بيانات جهاز جديد.';if(['NotAllowedError','SecurityError'].includes(e?.name))return 'لم يمنح المتصفح الإذن المطلوب. راجع إعداداته أو افتح تقرير الكمبيوتر.';return 'تعذر إكمال العملية في هذا المتصفح. تحقق من دعم الوظيفة واتصال الجهاز.';}
function showReportDialog(){ $('#report-error').hidden=true; $('#report-dialog').showModal(); }
async function loadReportText(value,name){try{window.MirsadWeb.importReport(value,name);sessionCache=null;await poll(true);$('#report-dialog').close();$('#report-text').value='';location.hash='overview';toast('فُتح التقرير محليًا دون رفعه.');}catch(e){$('#report-error').textContent=userError(e);$('#report-error').hidden=false;}}
async function useBrowserMode(){window.MirsadWeb.resetBrowser();await poll(true);toast('تعرض الآن المعلومات التي يتيحها هذا المتصفح.');}
async function readBluetoothDetails(){const b=$('#read-bluetooth');if(b)b.disabled=true;try{await window.MirsadWeb.readSelectedBluetooth();await poll(true);}catch(e){toast(userError(e));}finally{if(b)b.disabled=false;}}
function downloadReport(format,snapshot){try{const text=window.MirsadWeb.exportText(format,snapshot);const type={json:'application/json',csv:'text/csv',html:'text/html'}[format];const blob=new Blob([text],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Mirsad-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+format;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}catch(e){toast(userError(e));}}
async function clearLocalArchive(){if(!window.confirm('هل تريد مسح التقارير المحفوظة في هذا المتصفح؟ الملفات التي نزّلتها لن تُحذف.'))return;try{window.MirsadWeb.clearArchive();sessionCache=[];drawSessions();toast('مُسح الأرشيف المحلي.');}catch(e){toast(userError(e));}}
function renderWebSource(){const target=$('#web-source-banner');if(!target)return;target.replaceChildren();const fromReport=state.web?.mode==='report';const wrap=el('div','web-source-card '+(fromReport?'from-report':'')),info=el('div');info.append(el('strong','',fromReport?'عرض تقرير محفوظ':'القراءة المتاحة في المتصفح'),el('p','',fromReport?'الملف: '+state.web.filename+' — القراءات بأوقاتها الأصلية، ولا تمثل فحصًا حيًا.':'يمكن قراءة معلومات المتصفح واختيار جهاز متوافق بإذنك. لقراءات الواي فاي والشبكة والمنافذ: افتح تقرير مرصد.'));wrap.append(icon(fromReport?'report':'adapter'),info,button(fromReport?'فتح تقرير أحدث':'فتح تقرير',showReportDialog,'secondary','report'));target.append(wrap);}
async function init(){
 buildNavigation();window.addEventListener('hashchange',setRoute);route=pageDefs[location.hash.slice(1)]?location.hash.slice(1):'overview';
 $('#menu-button').addEventListener('click',()=>{const opened=$('.sidebar').classList.toggle('open');$('#menu-button').setAttribute('aria-expanded',String(opened));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.sidebar').classList.contains('open')){$('.sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');$('#menu-button').focus();}});
 $('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());$('#help-close').addEventListener('click',()=>$('#help-dialog').close());$('#help-done').addEventListener('click',()=>$('#help-dialog').close());
 $('#stop-scans').addEventListener('click',()=>toast('لا يوجد فحص لنظام الكمبيوتر جارٍ من الموقع.'));
 for(const id of ['report-close','report-cancel'])$('#'+id).addEventListener('click',()=>$('#report-dialog').close());
 $('#choose-report-file').addEventListener('click',()=>$('#report-file').click());
 $('#report-load').addEventListener('click',()=>loadReportText($('#report-text').value,'تقرير ملصوق'));
 $('#report-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024){$('#report-error').textContent='أقصى حجم للتقرير ١٠ ميجابايت.';$('#report-error').hidden=false;return;}await loadReportText(await file.text(),file.name);e.target.value='';});
 config=await api('/api/config');await poll(true);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
}
init();
