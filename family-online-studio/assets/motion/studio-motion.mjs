import { createPlayer, normalizeProject, recordingFormat, recordVideo, downloadBlob } from './motion-core.mjs';

const WORKS = { barcode: 'باركود', 'outside-story': 'خارج الستوري', 'family-online': 'عائلة أونلاين' };
const FONT = 'Amiri, Tahoma, serif';
let activeDialog;

function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else element.setAttribute(key, String(value));
  }
  element.append(...children); return element;
}

function workContext() {
  const requested = new URL(location.href).searchParams.get('work') || 'family-online';
  const key = Object.hasOwn(WORKS, requested) ? requested : 'family-online';
  const visibleTitle = document.querySelector('.project-name button')?.textContent?.trim();
  return { key, title: visibleTitle || WORKS[key] };
}

function seed(title) {
  return {
    title, author: 'سعد روضان', aspect: 'landscape', duration: 18, mode: 'titles',
    opening: title === 'باركود' ? 'حين تترك التقنية أثرها على حياتنا' : 'لكل حكاية أثر',
    middle: title === 'باركود' ? 'مسلسل يعالج أثر التقنية على المجتمع' : 'تشويق للعمل',
    ending: title,
  };
}

function projectFrom(settings) {
  const scenes = settings.mode === 'teaser'
    ? [{ title: settings.opening, body: '', label: settings.title }, { title: settings.middle, body: '', label: '' }, { title: settings.title, body: settings.ending === settings.title ? `تأليف وسيناريو: ${settings.author}` : settings.ending, label: '' }]
    : [{ title: settings.title, body: '', label: 'تتر العمل' }, { title: settings.author, body: 'تأليف وسيناريو', label: settings.title }, { title: settings.title, body: settings.middle, label: '' }];
  return normalizeProject({ ...settings, theme: 'barcode', brand: '', scenes });
}

function loadSettings(key, title) {
  const defaults = seed(title);
  try {
    const saved = JSON.parse(localStorage.getItem(`studio-motion:v1:${key}`) || 'null');
    if (saved && typeof saved === 'object') for (const name of Object.keys(defaults)) {
      if (typeof saved[name] === typeof defaults[name]) defaults[name] = saved[name];
    }
  } catch { /* Browser storage can be unavailable; editing and export still work. */ }
  defaults.aspect = defaults.aspect === 'portrait' ? 'portrait' : 'landscape';
  defaults.mode = defaults.mode === 'teaser' ? 'teaser' : 'titles';
  defaults.duration = normalizeProject(defaults).duration;
  for (const name of ['title', 'author', 'opening', 'middle', 'ending']) defaults[name] = defaults[name].slice(0, name === 'author' ? 90 : 120);
  return defaults;
}

function openStudio() {
  if (activeDialog?.open) { activeDialog.focus(); return; }
  const { key, title } = workContext();
  const storageKey = `studio-motion:v1:${key}`;
  const settings = loadSettings(key, title);
  let recording;
  let destroyed = false;
  const dialog = node('dialog', { class: 'pm-dialog', 'aria-labelledby': 'pm-title', dir: 'rtl' });
  activeDialog = dialog;
  const close = node('button', { type: 'button', class: 'pm-close', 'aria-label': 'إغلاق التترات والتشويقات' }, 'إغلاق');
  const heading = node('h2', { id: 'pm-title' }, 'التترات والتشويقات');
  const help = node('p', { class: 'pm-help' }, 'صمّم حركة بالكلمات والرسوم. إعدادات الفيديو مستقلة عن نص العمل؛ احفظها على هذا الجهاز عند الحاجة.');
  const header = node('header', { class: 'pm-header' }, node('div', {}, heading, help), close);
  const panel = node('form', { class: 'pm-fields', 'aria-label': 'إعدادات المقطع' });
  panel.addEventListener('submit', event => event.preventDefault());
  const inputs = [];
  const status = node('p', { class: 'pm-status', role: 'status', 'aria-live': 'polite' });
  const canvas = node('canvas', { width: '1280', height: '720', role: 'img', 'aria-label': `معاينة تتر ${title}` });
  const preview = node('div', { class: 'pm-preview' }, canvas);
  const play = node('button', { type: 'button', class: 'pm-secondary' }, 'تشغيل المعاينة');
  const range = node('input', { type: 'range', min: '0', max: String(settings.duration), step: '.1', value: '.8', 'aria-label': 'موضع المعاينة' });
  const stamp = node('output', { class: 'pm-time', dir: 'ltr' }, '0 / 18');
  const player = createPlayer(canvas, projectFrom(settings), FONT, (time, playing) => {
    range.value = String(time); stamp.textContent = `${Math.floor(time)} / ${settings.duration}`;
    play.textContent = playing ? 'إيقاف مؤقت' : 'تشغيل المعاينة'; play.setAttribute('aria-pressed', String(playing));
  });
  const refresh = () => { if (destroyed || recording) return; range.max = String(settings.duration); player.set(projectFrom(settings)); };
  const choice = (label, property, values) => {
    const group = node('div', { class: 'pm-choices', role: 'group', 'aria-label': label });
    values.forEach(([value, text]) => {
      const button = node('button', { type: 'button', 'aria-pressed': String(settings[property] === value) }, text);
      inputs.push(button);
      button.addEventListener('click', () => {
        settings[property] = value;
        [...group.children].forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        teaserFields.hidden = settings.mode !== 'teaser'; refresh();
      }); group.append(button);
    });
    return node('div', { class: 'pm-field' }, node('span', {}, label), group);
  };
  const field = (label, property, max = 120) => {
    const input = node(property === 'middle' ? 'textarea' : 'input', { maxlength: max, ...(property === 'middle' ? { rows: 2 } : { type: 'text' }) });
    input.value = settings[property]; inputs.push(input);
    input.addEventListener('input', () => { settings[property] = input.value; refresh(); });
    return node('label', { class: 'pm-field' }, node('span', {}, label), input);
  };
  const teaserFields = node('div', { class: 'pm-teaser-fields' }, field('النص الافتتاحي', 'opening'), field('العبارة الختامية', 'ending'));
  teaserFields.hidden = settings.mode !== 'teaser';
  panel.append(choice('نوع المقطع', 'mode', [['titles', 'تتر'], ['teaser', 'تشويق']]), choice('المقاس', 'aspect', [['landscape', 'أفقي 16:9'], ['portrait', 'عمودي 9:16']]), field('عنوان العمل', 'title', 90), field('اسم الكاتب', 'author', 90), field('الفكرة التشويقية', 'middle'), teaserFields);
  const duration = node('input', { type: 'number', min: '12', max: '30', step: '1', value: settings.duration, inputmode: 'numeric' }); inputs.push(duration);
  duration.addEventListener('change', () => { settings.duration = normalizeProject({ duration: duration.value }).duration; duration.value = settings.duration; refresh(); });
  panel.append(node('label', { class: 'pm-field' }, node('span', {}, 'المدة بالثواني · من 12 إلى 30'), duration));
  const videoFormat = recordingFormat();
  const image = node('button', { type: 'button', class: 'pm-secondary' }, 'تنزيل صورة PNG');
  const video = node('button', { type: 'button', class: 'pm-primary' }, videoFormat ? `تنزيل فيديو ${videoFormat.extension.toUpperCase()}` : 'تصدير الفيديو غير مدعوم');
  video.disabled = !videoFormat;
  const save = node('button', { type: 'button', class: 'pm-secondary' }, 'حفظ إعدادات هذا العمل');
  const cancel = node('button', { type: 'button', class: 'pm-secondary', hidden: true }, 'إلغاء التصدير');
  const note = node('p', { class: 'pm-export-note' }, 'يُصدَّر المقطع بلا صوت. أبقِ هذه الصفحة ظاهرة أثناء تسجيل الفيديو. النص التشويقي قابل للتعديل ولا يغيّر المخطوط.');
  const progress = node('progress', { max: '1', value: '0', hidden: true, 'aria-label': 'تقدم تصدير الفيديو' });
  const controls = node('div', { class: 'pm-playback' }, play, range, stamp);
  const exports = node('div', { class: 'pm-export-actions' }, video, image, save, cancel);
  const view = node('div', { class: 'pm-view' }, preview, controls, exports, progress, note, status);
  dialog.append(header, node('div', { class: 'pm-layout' }, panel, view));
  play.addEventListener('click', () => player.play());
  range.addEventListener('input', () => player.seek(range.value));
  save.addEventListener('click', () => {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); status.textContent = 'حُفظت إعدادات المقطع لهذا العمل على هذا الجهاز.'; }
    catch { status.textContent = 'تعذر حفظ الإعدادات على هذا الجهاز؛ يمكنك تنزيل المقطع.'; }
  });
  const fontsReady = async () => { await document.fonts.load('32px Amiri'); await document.fonts.ready; };
  image.addEventListener('click', async () => {
    try {
      await fontsReady(); if (destroyed) return;
      player.pause();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('image');
      downloadBlob(blob, `${key}-motion.png`); status.textContent = 'جُهّزت صورة PNG للتنزيل.';
    } catch { status.textContent = 'تعذر تنزيل الصورة. أعد المحاولة.'; }
  });
  const busy = value => {
    [...inputs, play, range, save, image, video].forEach(input => { input.disabled = value; });
    video.disabled = value || !videoFormat; cancel.hidden = !value; progress.hidden = !value;
  };
  video.addEventListener('click', async () => {
    player.pause(); recording = new AbortController(); busy(true);
    status.textContent = 'جارٍ تجهيز الفيديو…';
    try {
      await fontsReady(); if (destroyed) return;
      const result = await recordVideo(canvas, projectFrom(settings), FONT, { signal: recording.signal, onProgress: value => { progress.value = value; } });
      if (!destroyed) { downloadBlob(result.blob, `${key}-motion.${result.extension}`); status.textContent = 'جُهّز الفيديو للتنزيل.'; }
    } catch (error) {
      if (!destroyed) status.textContent = error.name === 'AbortError' ? 'أُلغي التصدير؛ إعداداتك محفوظة في الأداة.' : error.message === 'hidden' ? 'توقف التصدير لأن الصفحة أصبحت مخفية. أعد المحاولة مع إبقاء الصفحة ظاهرة.' : 'تعذر تصدير الفيديو في هذا المتصفح. جرّب متصفحاً أحدث أو نزّل صورة PNG.';
    } finally { recording = null; if (!destroyed) { busy(false); refresh(); } }
  });
  cancel.addEventListener('click', () => recording?.abort());
  const cleanup = () => { destroyed = true; recording?.abort(); player.destroy(); dialog.remove(); if (activeDialog === dialog) activeDialog = null; };
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', cleanup, { once: true });
  document.body.append(dialog); dialog.showModal(); refresh();
  fontsReady().then(() => { if (!destroyed && !recording && !player.playing) player.seek(.8); }).catch(() => { status.textContent = 'تعذر تحميل خط العرض؛ أعد فتح الأداة بعد اكتمال اتصال الصفحة.'; });
}

function attach() {
  const actions = document.querySelector('.top-actions');
  if (!actions || actions.querySelector('[data-studio-motion]')) return;
  const requested = new URL(location.href).searchParams.get('work');
  if (requested === 'last-line-en') return;
  const button = node('button', { type: 'button', class: 'button pm-launch', 'data-studio-motion': 'true' }, 'التترات والتشويقات');
  button.addEventListener('click', openStudio);
  const works = actions.querySelector('.works-launch');
  if (works) works.after(button); else actions.prepend(button);
}

new MutationObserver(attach).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
attach();
