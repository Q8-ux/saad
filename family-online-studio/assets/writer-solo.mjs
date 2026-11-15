export const WRITER_SOLO_URL = 'https://writersolo.com/';
const GUIDE_URL = 'https://github.com/Q8-ux/saad/tree/main/screenplay-drama-engine#مسار-الكتابة';
const MAX_DRAFT_BYTES = 24 * 1024 * 1024;

const formats = {
  series: { label: 'المسلسل', unit: 'الحلقة', template: 'Right-to-Left Screenplay', extension: 'fdx' },
  film: { label: 'الفيلم', unit: 'الفصل', template: 'Right-to-Left Screenplay', extension: 'fdx' },
  play: { label: 'المسرحية', unit: 'الفصل', template: 'Stageplay', extension: 'fdx' },
  book: { label: 'الكتاب', unit: 'القسم', template: 'Book', extension: 'txt' },
};

const dramaRules = [
  'حدّد مشكلة البطل والثيمة أولًا. افتتح بصورة أو فعل، ثم عرّف الشخصيات والعلاقات التي تؤثر في اختياره.',
  'اجعل الحدث المحرّك يستدعي فعلًا، وأظهر كلفة الخيارات قبل القرار الذي ينقل الحكاية إلى مرحلتها التالية.',
  'اربط الخط الموازي بقرار البطل أو بعاقبته. راقب التصاعد والذروة وما ينتج عنهما على منحنى فريتاغ.',
];

export function writingRules(kind) {
  if (kind === 'book') return [
    'للرواية، خطّط لتحولات الحكاية عبر الفصول واستعمل المفاصل بحسب إيقاعها.',
    'للكتاب المعرفي، حدّد سؤال الفصل، ورتّب الشرح والدليل والأمثلة، ثم راجع ما يصل إلى القارئ في ختامه.',
  ];
  return [...dramaRules, kind === 'play'
    ? 'اضغط المفاصل المتقاربة داخل مشهد أو فصل عند الحاجة، وأعطِ التحوّل مساحةً بقدر أثره على الخشبة.'
    : kind === 'series'
      ? 'وزّع المفاصل الخمسة عشر حسب إيقاع الحلقة. عند وجود فواصل بث، استخدم الفصول الأربعة لتوقيت القفلات.'
      : 'وزّع المفاصل الخمسة عشر بحسب إيقاع الحكاية وأثر قرارات الشخصيات.'];
}

function formatFor(work) {
  if (!work || !Object.hasOwn(formats, work.kind)) throw new Error('نوع العمل غير متاح للتبادل.');
  return formats[work.kind];
}

function currentUnit(work, id) {
  const scene = work.scenes.find(item => item.id === id);
  return scene?.unitId && work.units.find(unit => unit.id === scene.unitId);
}

export function availableWriterSoloScopes(work, activeId) {
  const { label, unit } = formatFor(work);
  const scopes = [{ value: 'all', label: `${label} كامل${work.kind === 'play' ? 'ة' : 'ًا'}` }];
  if (work.kind === 'book') {
    if ([...work.frontMatter, ...work.chapters].some(section => section.id === activeId)) {
      scopes.push({ value: 'section', label: 'القسم الحالي' });
    }
    return scopes;
  }
  if (work.scenes.some(scene => scene.id === activeId)) {
    if (currentUnit(work, activeId)) scopes.push({ value: 'unit', label: `${unit} الحالي${work.kind === 'series' ? 'ة' : ''}` });
    scopes.push({ value: 'scene', label: 'المشهد الحالي' });
  }
  return scopes;
}

const xmlEscapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
function xml(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/gu, '\uFFFD')
    .replace(/[&<>"']/gu, char => xmlEscapes[char]);
}

function paragraph(type, text, { number, bold, italic } = {}) {
  if (!text) return '';
  const style = [bold && 'Bold', italic && 'Italic'].filter(Boolean).join('+');
  const attrs = number === undefined ? '' : ` Number="${number}"`;
  const textAttrs = style ? ` Style="${style}"` : '';
  return `<Paragraph Type="${type}"${attrs}><Text${textAttrs}>${xml(text)}</Text></Paragraph>`;
}

const fdxTypes = { action: 'Action', sound: 'Action', song: 'Lyrics', heading: 'General', transition: 'Transition' };
function exportFdx(work, scenes) {
  const names = new Map(work.characters.map(character => [character.id, character.name]));
  const units = new Map(work.units.map(unit => [unit.id, unit.title]));
  const lines = [];
  let lastUnit;
  for (const scene of scenes) {
    if (scene.unitId !== lastUnit) {
      lastUnit = scene.unitId;
      lines.push(paragraph(work.kind === 'play' ? 'New Act' : 'General', units.get(lastUnit)));
    }
    const number = work.scenes.indexOf(scene) + 1;
    const label = [scene.time, scene.location, scene.title].filter(Boolean).join(' - ');
    lines.push(paragraph('Scene Heading', label || `المشهد ${number}`, { number }));
    for (const block of scene.blocks) {
      if (!block.text) continue;
      if (block.type === 'dialogue') {
        const speaker = names.get(block.characterId) || block.label || 'متحدث غير محدد';
        lines.push(paragraph('Character', speaker));
        lines.push(paragraph('Dialogue', block.text, block));
      } else {
        const line = block.type === 'song' && block.label ? `${block.label}: ${block.text}` : block.text;
        lines.push(paragraph(fdxTypes[block.type] || 'General', line, block));
      }
    }
  }
  const cover = [paragraph('Title', work.title), paragraph('Author', work.author)].filter(Boolean).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<FinalDraft DocumentType="Script" Template="No" Version="1">\n<Content>\n${lines.filter(Boolean).join('\n')}\n</Content>\n<TitlePage><Content>\n${cover}\n</Content></TitlePage>\n</FinalDraft>\n`;
}

function bookText(work, sections, whole) {
  const title = whole ? [work.title, work.subtitle, work.author, work.edition] : [work.title];
  const partStarts = new Map(whole ? (work.parts ?? []).map(part => [part.from, part.title]) : []);
  const chapters = sections.flatMap(section => [
    partStarts.get(section.number),
    section.number && !/^\s*[0-9٠-٩]+\s*[:.\-–—)]/u.test(section.title)
      ? `${section.number}. ${section.title}` : section.title,
    ...section.blocks.map(block => block.text),
  ]);
  return [...title, ...chapters].filter(Boolean).join('\n\n') + '\n';
}

export function buildWriterSoloExport(work, activeId, scope) {
  const format = formatFor(work);
  if (!availableWriterSoloScopes(work, activeId).some(option => option.value === scope)) {
    throw new Error('النطاق المحدد غير متاح لهذا العمل.');
  }
  const current = work.kind === 'book'
    ? [...work.frontMatter, ...work.chapters].find(section => section.id === activeId)
    : work.scenes.find(scene => scene.id === activeId);
  const unit = work.kind === 'book' ? undefined : currentUnit(work, activeId);
  const suffix = scope === 'unit' ? unit.title : scope === 'all' ? '' : current.title;
  const name = [work.title, suffix].filter(Boolean).join(' - ').replace(/[<>:"/\\|?*\u0000-\u001F\u202A-\u202E]/gu, ' ').trim().slice(0, 125);
  const base = `${name || 'Studio'} - WriterSolo`;
  if (work.kind === 'book') {
    const sections = scope === 'all' ? [...work.frontMatter, ...work.chapters] : [current];
    return { name: `${base}.txt`, mime: 'text/plain;charset=utf-8', text: bookText(work, sections, scope === 'all') };
  }
  const scenes = scope === 'all' ? work.scenes : scope === 'unit'
    ? work.scenes.filter(scene => scene.unitId === unit.id) : [current];
  return { name: `${base}.fdx`, mime: 'application/xml;charset=utf-8', text: exportFdx(work, scenes) };
}

export function readWriterSoloDraft(text, filename, kind, Parser = globalThis.DOMParser) {
  if (kind === 'book' && /\.txt$/iu.test(filename)) {
    const draft = text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
    if (!draft.trim() || draft.includes('\u0000')) throw new Error('اختر ملف نص قابلًا للقراءة.');
    return draft;
  }
  if (kind === 'book' || !/\.fdx$/iu.test(filename)) throw new Error('اختر الصيغة المذكورة بجوار زر المعاينة.');
  if (/<!\s*(DOCTYPE|ENTITY)\b/iu.test(text)) throw new Error('صيغة ملف FDX غير مدعومة.');
  const xmlDoc = new Parser().parseFromString(text, 'application/xml');
  const root = xmlDoc.documentElement;
  const content = root?.localName === 'FinalDraft' && [...root.children].find(node => node.localName === 'Content');
  if (!content || xmlDoc.getElementsByTagName('parsererror').length) throw new Error('تعذر قراءة ملف FDX.');
  const paragraphs = Array.from(content.getElementsByTagName('Paragraph')).flatMap(node => {
    const value = [...node.children].filter(child => child.localName === 'Text').map(child => child.textContent).join('');
    if (!value.trim()) return [];
    const type = node.getAttribute('Type');
    const number = node.getAttribute('Number');
    return [{ type, value: type === 'Scene Heading' && number ? `${number}. ${value}` : value }];
  });
  if (!paragraphs.length) throw new Error('ملف FDX لا يحتوي على نص قابل للعرض.');
  return paragraphs.map((item, index) => {
    if (item.type === 'Character') return `${item.value}:`;
    if (item.type === 'Dialogue' || item.type === 'Parenthetical' || index === 0) return item.value;
    return `\n${item.value}`;
  }).join('\n');
}

function downloadFile(doc, file) {
  const env = doc.defaultView;
  const url = env.URL.createObjectURL(new env.Blob([file.text], { type: file.mime }));
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  env.setTimeout(() => env.URL.revokeObjectURL(url), 30000);
}

export function openWriterSolo({ getWork, activeId, trigger }) {
  if (!trigger?.isConnected || !getWork()) return;
  const owner = trigger.ownerDocument;
  const env = owner.defaultView;
  const previous = owner.querySelector('.writer-solo-dialog');
  if (previous?.open) return previous;
  const work = getWork();
  const format = formatFor(work);
  const editor = trigger.closest('.studio');
  const make = (tag, value = '') => {
    const element = owner.createElement(tag);
    element.textContent = value;
    return element;
  };
  const button = (value, handler) => {
    const element = make('button', value);
    element.type = 'button';
    element.addEventListener('click', handler);
    return element;
  };
  const link = (value, url) => {
    const element = make('a', value);
    element.href = url;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    return element;
  };

  const dialog = make('dialog');
  dialog.className = 'writer-solo-dialog';
  dialog.dir = 'rtl';
  if (editor?.classList.contains('dark')) dialog.dataset.theme = 'dark';
  dialog.setAttribute('aria-labelledby', 'writer-solo-title');
  const heading = make('h2', 'WriterSolo');
  heading.id = 'writer-solo-title';
  const header = make('header');
  const close = button('إغلاق', () => dialog.close());
  header.append(heading, close);
  const title = make('p', work.title);
  title.className = 'writer-solo-work';
  title.dir = 'auto';
  const explanation = make('p', `نزّل نسخة للعمل، ثم افتحها في WriterSolo. القالب المناسب لهذا النوع هو `);
  const template = make('bdi', format.template);
  explanation.append(template, ' .');

  const scope = make('select');
  const scopes = availableWriterSoloScopes(work, activeId);
  for (const option of scopes) {
    const element = make('option', option.label);
    element.value = option.value;
    scope.append(element);
  }
  scope.value = scopes.find(option => option.value === 'unit' || option.value === 'section')?.value ?? 'all';
  const scopeLabel = make('label', 'نطاق النسخة');
  scopeLabel.append(scope);
  const actions = make('div');
  actions.className = 'writer-solo-actions';
  const status = make('p');
  status.className = 'writer-solo-status';
  status.setAttribute('role', 'status');
  const download = button(`تنزيل ${format.extension.toUpperCase()}`, () => {
    try {
      downloadFile(owner, buildWriterSoloExport(getWork(), activeId, scope.value));
      status.textContent = 'النسخة في تنزيلات جهازك. اختر Import داخل WriterSolo.';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'تعذر إعداد النسخة.';
    }
  });
  download.className = 'writer-solo-primary';
  actions.append(download, link('فتح WriterSolo', WRITER_SOLO_URL));
  const review = make('details');
  review.append(make('summary', 'معاينة مسودة عائدة'));
  const input = make('input');
  input.type = 'file';
  input.accept = `.${format.extension}`;
  const fileLabel = make('label', `اختر ملف ${format.extension.toUpperCase()} من WriterSolo`);
  fileLabel.append(input);
  const preview = make('textarea');
  preview.readOnly = true;
  preview.dir = 'auto';
  preview.rows = 8;
  preview.hidden = true;
  preview.setAttribute('aria-label', 'نص المسودة المستوردة');
  const reviewStatus = make('p');
  reviewStatus.setAttribute('role', 'status');
  const copy = button('نسخ المسودة', async () => {
    try {
      await env.navigator.clipboard.writeText(preview.value);
      reviewStatus.textContent = 'نُسخت المسودة. يمكنك لصق التعديل المطلوب في محرر العمل.';
    } catch {
      preview.focus();
      preview.select();
      reviewStatus.textContent = 'حُدّد النص. انسخه باستخدام أمر النسخ في جهازك.';
    }
  });
  copy.hidden = true;
  let readSequence = 0;
  input.addEventListener('change', async () => {
    const revision = ++readSequence;
    preview.value = '';
    preview.hidden = copy.hidden = true;
    reviewStatus.textContent = '';
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_DRAFT_BYTES) {
      reviewStatus.textContent = 'الملف أكبر من ٢٤ ميغابايت. صدّر الجزء المطلوب وحده.';
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      if (revision !== readSequence || !dialog.isConnected) return;
      const bytes = new Uint8Array(buffer);
      const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
        : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
      preview.value = readWriterSoloDraft(new TextDecoder(encoding).decode(bytes), file.name, work.kind, env.DOMParser);
      preview.hidden = copy.hidden = false;
      reviewStatus.textContent = 'المسودة جاهزة للمراجعة والنسخ.';
    } catch (error) {
      if (revision === readSequence && dialog.isConnected) {
        reviewStatus.textContent = error instanceof Error ? error.message : 'تعذرت معاينة المسودة.';
      }
    }
  });
  review.append(fileLabel, preview, copy, reviewStatus);
  const guide = make('details');
  guide.append(make('summary', 'قواعد الكتابة'));
  const list = make('ul');
  for (const rule of writingRules(work.kind)) list.append(make('li', rule));
  guide.append(list, link('مسار الكتابة على GitHub', GUIDE_URL));
  dialog.append(header, title, explanation, scopeLabel, actions, status, review, guide);

  const terminate = () => dialog.close();
  const observer = new env.MutationObserver(() => {
    if (!editor?.isConnected || !trigger.isConnected) terminate();
  });
  const endEvents = ['studio-session-expired', 'studio-sign-out'];
  for (const event of endEvents) env.addEventListener(event, terminate);
  dialog.addEventListener('close', () => {
    readSequence += 1;
    observer.disconnect();
    for (const event of endEvents) env.removeEventListener(event, terminate);
    dialog.remove();
    const menu = owner.querySelector('.studio-command-toggle');
    const returnTo = trigger.closest('[inert]') ? menu : trigger;
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
  }, { once: true });
  owner.body.append(dialog);
  dialog.showModal();
  observer.observe(owner.getElementById('root') || owner.body, { childList: true, subtree: true });
  close.focus();
  return dialog;
}
