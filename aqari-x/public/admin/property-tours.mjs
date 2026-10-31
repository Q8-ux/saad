import {escapeHTML as esc} from '../core.mjs?v=1.4.0';
import {api, openDialog, closeDialog, withSubmit, toast, icon} from '../ui.mjs?v=1.4.0';
import {getLocale} from '../i18n.mjs?v=1.4.0';
import {normalizeVirtualTour, propertyTour} from '../virtual-tour-data.mjs?v=1.5.0';
import {tourHTML, mountTour} from '../property-tour.mjs?v=1.5.0';
import {tourText} from '../tour-copy.mjs?v=1.5.0';

const copy = {
  manage: ['إدارة الجولة 3D', 'Manage 3D tour', '3D سیر کا انتظام'],
  setup: ['أضف مسح هذا العقار بعد تجهيزه. يظهر للزوار بعد حفظه إذا كان الإعلان منشوراً.', 'Attach a prepared scan of this property. It appears to visitors after saving when the listing is published.', 'اس جائیداد کا تیار اسکین شامل کریں۔ اشتہار شائع ہونے پر محفوظ سیر دکھائی جائے گی۔'],
  kind: ['مصدر الجولة', 'Tour source', 'سیر کا ماخذ'],
  scene: ['مشهد منشور من SuperSplat', 'Published SuperSplat scene', 'شائع شدہ SuperSplat منظر'],
  model: ['رابط ملف مسح SOG أو PLY', 'SOG or PLY scan file URL', 'SOG یا PLY اسکین فائل کا لنک'],
  url: ['رابط الجولة أو ملف المسح', 'Tour or scan file URL', 'سیر یا اسکین فائل کا لنک'],
  settings: ['رابط إعدادات الجولة · اختياري', 'Tour settings JSON URL · optional', 'سیر کی ترتیبات JSON لنک · اختیاری'],
  title: ['عنوان الجولة · اختياري', 'Tour title · optional', 'سیر کا عنوان · اختیاری'],
  hint: ['انسخ رابط المشهد بعد نشره، أو رابط ملف Gaussian Splat جاهز. ملفات المسح الخارجية تحتاج السماح بالتحميل من موقع المكتب.', 'Paste the published scene link or a ready Gaussian Splat file URL. External scan files must allow loading from this website.', 'شائع شدہ منظر یا تیار Gaussian Splat فائل کا لنک دیں۔ بیرونی فائل کو اس ویب سائٹ سے لوڈ ہونے کی اجازت ہونی چاہیے۔'],
  preview: ['معاينة قبل الحفظ', 'Preview before saving', 'محفوظ کرنے سے پہلے دیکھیں'],
  save: ['حفظ الجولة', 'Save tour', 'سیر محفوظ کریں'],
  remove: ['إزالة الجولة من العقار', 'Remove tour from property', 'جائیداد سے سیر ہٹائیں'],
  saved: ['حُفظت الجولة على العقار', 'Tour saved to the property', 'سیر جائیداد پر محفوظ ہوگئی'],
  removed: ['أزيل رابط الجولة؛ بقيت بيانات العقار وصوره', 'Tour link removed; property details and photos retained', 'سیر کا لنک ہٹا دیا گیا؛ تفصیلات اور تصاویر برقرار ہیں'],
  prepare: ['تجهيز المسح', 'Prepare a scan', 'اسکین تیار کریں'],
  prep: ['صوّر العقار من زوايا متداخلة، ثم أعد بناء المسح بأداة مناسبة. نظّفه في المحرر وانشر المشهد، ثم أضف رابطه هنا.', 'Capture overlapping views and reconstruct a scan with a suitable tool. Clean it in the editor, publish the scene, then add its link here.', 'متداخل زاویوں سے تصاویر لے کر مناسب ٹول سے اسکین بنائیں۔ ایڈیٹر میں صاف کرکے منظر شائع کریں اور لنک یہاں شامل کریں۔'],
  editor: ['افتح محرر المسح', 'Open scan editor', 'اسکین ایڈیٹر کھولیں'],
  workflow: ['الالتقاط والمعالجة مرحلتان تسبقان رفع الجولة؛ صور الإعلان العادية لا تتحول تلقائياً إلى مسح.', 'Capture and reconstruction come before attaching a tour; ordinary listing photos do not automatically become a scan.', 'سیر شامل کرنے سے پہلے اسکین بنانا ضروری ہے؛ عام اشتہاری تصاویر خودکار اسکین نہیں بنتیں۔'],
  dashboard: ['اربط كل جولة بعقارها، وراجعها قبل إتاحتها للزوار.', 'Link each tour to its property and preview it before sharing with visitors.', 'ہر سیر کو متعلقہ جائیداد سے منسلک کریں اور پہلے جائزہ لیں۔'],
  available: ['جولات مرفقة', 'Attached tours', 'منسلک سیر'],
  missing: ['عقارات دون جولة', 'Properties without a tour', 'سیر کے بغیر جائیدادیں'],
  search: ['ابحث باسم العقار أو المنطقة', 'Search property or area', 'جائیداد یا علاقے سے تلاش کریں'],
  add: ['أضف جولة', 'Add tour', 'سیر شامل کریں'],
  edit: ['راجع الجولة وعدّلها', 'Review and edit tour', 'سیر دیکھیں اور ترمیم کریں'],
  noResults: ['لا توجد عقارات مطابقة', 'No matching properties', 'کوئی موزوں جائیداد نہیں'],
  noTour: ['لم تُرفق جولة', 'No tour attached', 'سیر منسلک نہیں'],
};
export const adminTourText = key => copy[key]?.[{ar:0,en:1,ur:2}[getLocale()] ?? 0] || key;
const input = (name, label, value = '', extra = '') => `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" ${extra}></label>`;

export function tourDashboardHTML(properties) {
  const editable = properties.filter(p => !['archived', 'completed'].includes(p.status));
  const count = editable.filter(propertyTour).length;
  return `<section data-i18n-skip><div class="page-intro"><h1>${esc(tourText('tours'))}</h1><p>${esc(adminTourText('dashboard'))}</p></div><div class="tour-stat-row"><span><b>${count}</b> ${esc(adminTourText('available'))}</span><span><b>${editable.length-count}</b> ${esc(adminTourText('missing'))}</span></div><label class="field"><span>${esc(adminTourText('search'))}</span><input type="search" id="tour-property-search" autocomplete="off"></label><div class="tour-property-list">${editable.map(p=>`<article class="tour-property-row" data-tour-property data-search="${esc(p.title+' '+p.location)}"><div><h2>${esc(p.title)}</h2><p>${esc(p.location)}</p><span class="badge">${esc(propertyTour(p)?tourText('badge'):adminTourText('noTour'))}</span></div><button class="btn secondary" data-action="manage-tour" data-id="${esc(p.id)}">${esc(adminTourText(propertyTour(p)?'edit':'add'))}</button></article>`).join('')}</div><p id="tour-no-results" class="hint" hidden>${esc(adminTourText('noResults'))}</p><details class="tour-preparation"><summary>${esc(adminTourText('prepare'))}</summary><p>${esc(adminTourText('prep'))}</p><a class="btn secondary small" href="https://superspl.at/editor" target="_blank" rel="noopener noreferrer">${esc(adminTourText('editor'))}</a><p class="fineprint">${esc(adminTourText('workflow'))}</p></details></section>`;
}

export function mountTourDashboard(root) {
  const search = root.querySelector('#tour-property-search');
  if (!search) return;
  search.oninput = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    root.querySelectorAll('[data-tour-property]').forEach(row => {
      row.hidden = !row.dataset.search.toLocaleLowerCase().includes(query);
      if (!row.hidden) visible++;
    });
    root.querySelector('#tour-no-results').hidden = visible > 0;
  };
}

export function openPropertyTour(property, onSaved) {
  if (!property) return;
  const existing = propertyTour(property);
  let previewCleanup;
  openDialog(adminTourText('manage'), `<div data-i18n-skip><h3>${esc(property.title)}</h3><p class="muted">${esc(adminTourText('setup'))}</p><form id="property-tour-form"><label class="field"><span>${esc(adminTourText('kind'))}</span><select name="kind"><option value="scene" ${existing?.kind==='model'?'':'selected'}>${esc(adminTourText('scene'))}</option><option value="model" ${existing?.kind==='model'?'selected':''}>${esc(adminTourText('model'))}</option></select></label>${input('url',adminTourText('url'),existing?.url,'type="url" required maxlength="2048" dir="ltr" autocomplete="off" placeholder="https://…"')}${input('title',adminTourText('title'),existing?.title,'type="text" maxlength="120"')}<div data-tour-settings>${input('settingsUrl',adminTourText('settings'),existing?.settingsUrl,'type="url" maxlength="2048" dir="ltr" autocomplete="off"')}</div><p class="hint">${esc(adminTourText('hint'))}</p><div class="form-actions"><button class="btn primary" type="submit">${esc(adminTourText('save'))}</button><button class="btn secondary" type="button" data-tour-preview>${esc(adminTourText('preview'))}</button>${existing?`<button class="btn ghost" type="button" data-tour-remove>${esc(adminTourText('remove'))}</button>`:''}</div></form><div id="tour-preview-root"></div><details class="tour-preparation"><summary>${esc(adminTourText('prepare'))}</summary><p>${esc(adminTourText('prep'))}</p><a class="btn secondary small" href="https://superspl.at/editor" target="_blank" rel="noopener noreferrer">${icon('building')}${esc(adminTourText('editor'))}</a></details></div>`, () => {
    const modal = document.querySelector('#modal');
    const form = modal.querySelector('#property-tour-form');
    const fields = form.elements;
    const sourceChanged = () => { const model = fields.kind.value === 'model'; form.querySelector('[data-tour-settings]').hidden = !model; fields.settingsUrl.disabled = !model; };
    sourceChanged(); fields.kind.onchange = sourceChanged;
    const current = () => normalizeVirtualTour({kind:fields.kind.value,url:fields.url.value,title:fields.title.value,settingsUrl:fields.settingsUrl.disabled?'':fields.settingsUrl.value});
    form.querySelector('[data-tour-preview]').onclick = () => {
      if (!form.reportValidity()) return;
      try {
        const p = {...property,virtualTour:current()};
        previewCleanup?.();
        modal.querySelector('#tour-preview-root').innerHTML = tourHTML(p);
        previewCleanup = mountTour(modal, p);
      } catch (error) { toast(error.message,true); }
    };
    const save = async tour => {
      await api('/admin/properties/'+encodeURIComponent(property.id)+'/tour',{method:'PUT',data:{virtualTour:tour,expectedUpdatedAt:property.updatedAt}});
      previewCleanup?.(); closeDialog(); toast(adminTourText(tour?'saved':'removed')); await onSaved?.();
    };
    form.onsubmit = event => {event.preventDefault();withSubmit(form,()=>save(current()));};
    const remove = form.querySelector('[data-tour-remove]');
    if (remove) remove.onclick = () => withSubmit(form,()=>save(null));
  });
}
