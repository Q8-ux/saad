const MAX_TEXT_BYTES = 2_000_000;
const MAX_DOCX_BYTES = 10_000_000;
const MAX_EXTERNAL_BYTES = 25_000_000;
const MAX_MEDIA_BYTES = 8_000_000;
const MAX_DOCX_ENTRY_BYTES = 4_000_000;
const MAX_SCENES = 400;
const MAX_CHARACTERS = 100;
const MAX_UNITS = 100;
const MAX_BLOCKS = 10_000;
const SCRIPT_KINDS = new Set(['film', 'series', 'play']);
const BOOK_KINDS = new Set(['book-ar', 'book-en']);
const BLOCK_TYPES = new Set(['dialogue', 'action', 'sound', 'song', 'heading', 'transition']);
const BOOK_BLOCK_TYPES = new Set(['paragraph', 'heading', 'list-item', 'quote']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'html', 'htm', 'xml', 'csv', 'tsv', 'srt', 'vtt']);
const EXTERNAL_EXTENSIONS = new Set(['pdf', 'doc', 'odt', 'rtf', 'wps', 'epub', 'pages', 'ppt', 'pptx', 'odp', 'key', 'xls', 'xlsx', 'ods', 'numbers', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'heic']);
const MEDIA_EXTENSIONS = new Set(['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'mpeg', 'mpga']);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

let fallbackId = 0;
function id(prefix) {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${++fallbackId}`;
  return `${prefix}_${token}`.slice(0, 100);
}

function text(value, maximum = 30_000) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/gu, '').slice(0, maximum);
}

function normalized(value) {
  return text(value, MAX_TEXT_BYTES).replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '').normalize('NFC');
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/u).filter(Boolean).length;
}

function sourceSize(value) {
  return encoder.encode(value).length;
}

function ensureTextSize(value) {
  if (!value.trim()) throw new Error('الملف فارغ ولا يحتوي نصًا قابلًا للاستيراد.');
  if (sourceSize(value) > MAX_TEXT_BYTES) throw new Error('النص المستخرج أكبر من الحد المسموح (٢ ميغابايت). قسّم الملف ثم أعد المحاولة.');
}

function extension(name = '') {
  const match = /\.([^.]+)$/u.exec(name.toLowerCase());
  return match?.[1] || '';
}

function plainMarkup(value) {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<xi:include|<xinclude/iu.test(value)) throw new Error('يحتوي الملف تعريفات خارجية غير مسموحة.');
  return decodeXml(value
    .replace(/<(?:br|hr)\b[^>]*\/?\s*>/giu, '\n')
    .replace(/<\/?(?:p|div|li|h[1-6]|tr|section|article)\b[^>]*>/giu, '\n')
    .replace(/<[^>]+>/gu, ' '))
    .replace(/[ \t]+\n/gu, '\n').replace(/[ \t]{2,}/gu, ' ').replace(/\n{3,}/gu, '\n\n').trim();
}

function captionText(value) {
  return value.split(/\r?\n/u).filter(line => {
    const item = line.trim();
    return item && !/^WEBVTT(?:\s|$)/iu.test(item) && !/^\d+$/u.test(item)
      && !/^\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3}\s+-->\s+/u.test(item);
  }).map(line => line.replace(/<[^>]+>/gu, '').trim()).join('\n');
}

function fileStem(name = '') {
  return name.replace(/\.[^.]+$/u, '').replace(/[_-]+/gu, ' ').trim().slice(0, 250) || 'عمل مستورد';
}

function metadataFrom(value, name = '') {
  const lines = normalized(value).split('\n');
  const ignored = new Set();
  let title = '';
  let author = '';
  for (let index = 0; index < Math.min(lines.length, 40); index += 1) {
    const line = lines[index].trim();
    const titleMatch = /^(?:title|العنوان|اسم العمل)\s*[:：]\s*(.+)$/iu.exec(line);
    const authorMatch = /^(?:author|written by|المؤلف|تأليف|كتابة)\s*[:：]\s*(.+)$/iu.exec(line);
    if (titleMatch && !title) { title = titleMatch[1].trim().replace(/[،؛]+$/u, '').trim(); ignored.add(index); }
    if (authorMatch && !author) { author = authorMatch[1].trim().replace(/[،؛]+$/u, '').trim(); ignored.add(index); }
  }
  if (!title) {
    const first = lines.findIndex(line => line.trim());
    const candidate = first >= 0 ? lines[first].trim().replace(/^#{1,2}\s*/u, '') : '';
    if (candidate && candidate.length <= 120 && !isSceneHeading(candidate) && !isUnitHeading(candidate)) {
      title = candidate;
      ignored.add(first);
    }
  }
  return { title: text(title || fileStem(name), 250).trim(), author: text(author, 250).trim(), ignored };
}

function arabicRatio(value) {
  const letters = value.match(/\p{Letter}/gu) || [];
  if (!letters.length) return 0;
  return (value.match(/[\u0600-\u06FF]/gu) || []).length / letters.length;
}

function isUnitHeading(line) {
  return /^(?:#{1,2}\s*)?(?:(?:الحلقة|الفصل(?:\s+المسرحي)?|الباب|الجزء)(?=\s|[:：\d٠-٩-]|$)|(?:act|episode)\b)/iu.test(line.trim());
}

function isSceneHeading(line) {
  const value = line.trim();
  return /^(?:[.#]+\s*)?(?:المشهد|مشهد)(?=\s|[:：\d٠-٩-]|$)/iu.test(value)
    || /^(?:INT|EXT|INT\/?EXT|I\/?E)\.?[\s-]/iu.test(value)
    || (/^\.(?!\.)/u.test(value) && value.length <= 250);
}

function isBookChapter(line) {
  const value = line.trim();
  return /^(?:#\s*)?(?:(?:الفصل|الباب|المقدمة|تمهيد|الخاتمة)(?=\s|[:：\d٠-٩-]|$)|(?:chapter|introduction|preface|conclusion)\b)/iu.test(value)
    || /^#(?!#)\s+\S/u.test(value);
}

function probableSpeaker(value) {
  const cleaned = value.replace(/^@/u, '').replace(/\s*\([^)]{1,80}\)\s*$/u, '').trim();
  if (!cleaned || cleaned.length > 100 || cleaned.split(/\s+/u).length > 6) return '';
  if (/^(?:العنوان|المؤلف|تأليف|كتابة|المشهد|مشهد|الحلقة|الفصل|داخلي|خارجي|ليل|نهار|صوت|إضاءة|مؤثرات|قطع|انتقال|title|author|int|ext|cut|fade)$/iu.test(cleaned)) return '';
  if (!/^[\p{Letter}\p{Mark}\d ._'’\-]+$/u.test(cleaned)) return '';
  return cleaned;
}

function detectKind(value) {
  const sceneCount = value.split('\n').filter(isSceneHeading).length;
  const dialogueCount = value.split('\n').filter(line => {
    const match = /^([^:：]{1,100})[:：]\s*\S/u.exec(line.trim());
    return Boolean(match && probableSpeaker(match[1]));
  }).length;
  if (/(?:^|\s)(?:الحلقة|episode)\s*[\d٠-٩]/imu.test(value)) return 'series';
  if (/(?:^|\s)(?:الفصل المسرحي|act)\s*[\d٠-٩]/imu.test(value) || /مسرحي[ةه]/u.test(value.slice(0, 2_000))) return 'play';
  if (sceneCount || dialogueCount >= 2 || /^(?:INT|EXT)\./imu.test(value)) return 'film';
  return arabicRatio(value) >= 0.2 ? 'book-ar' : 'book-en';
}

/**
 * Turns explicit spoken episode, scene and character cues into editable lines.
 * Ambiguous transcript portions remain text; the parser never invents scenes.
 */
export function normalizeSpokenManuscript(input) {
  let source = normalized(input).trim();
  if (!source) return source;
  const numbers = new Map([
    ['الأول', '1'], ['الأولى', '1'], ['اول', '1'], ['اولى', '1'],
    ['الثاني', '2'], ['الثانية', '2'], ['الثالث', '3'], ['الثالثة', '3'],
    ['الرابع', '4'], ['الرابعة', '4'], ['الخامس', '5'], ['الخامسة', '5'],
    ['السادس', '6'], ['السادسة', '6'], ['السابع', '7'], ['السابعة', '7'],
    ['الثامن', '8'], ['الثامنة', '8'], ['التاسع', '9'], ['التاسعة', '9'],
    ['العاشر', '10'], ['العاشرة', '10'],
  ]);
  source = source.replace(/(?<!\p{Script=Arabic})(الحلقة|الحلقه|المشهد|مشهد)\s+(?:رقم\s+)?(الأول|الأولى|اول|اولى|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة|الثامن|الثامنة|التاسع|التاسعة|العاشر|العاشرة)(?!\p{Script=Arabic})/gu,
    (_match, type, number) => type + ' ' + numbers.get(number));
  source = source.replace(/(الحلقة|الحلقه|المشهد|مشهد)\s+(?:رقم\s+)?([٠-٩۰-۹]+)/gu,
    (_match, type, digits) => type + ' ' + digits.replace(/[٠-٩۰-۹]/gu, digit =>
      String(digit.charCodeAt(0) - (digit.charCodeAt(0) <= 0x0669 ? 0x0660 : 0x06f0))));
  // ASR often emits a single paragraph. Split at explicit labels and numbered headings.
  source = source.replace(/(?:^|[\s،؛.!?])(?=(?:عنوان\s+(?:المشروع|العمل)|اسم\s+(?:المشروع|العمل)|المؤلف|تأليف|الحلقة\s+\d+|الحلقه\s+\d+|المشهد\s+\d+|مشهد\s+\d+|وصف\s+(?:المشهد|الحركة)|حوار\s+|الشخصية\s+))/gu,
    boundary => boundary.trim() ? boundary.trim() + '\n' : '\n');
  source = source.replace(/(?:^|\n)\s*(?:عنوان\s+(?:المشروع|العمل)|اسم\s+(?:المشروع|العمل))\s*[:：]?\s*/gu, '\nالعنوان: ');
  source = source.replace(/(?:^|\n)\s*(?:المؤلف|تأليف)\s*[:：]?\s*/gu, '\nالمؤلف: ');
  source = source.replace(/(?:^|\n)\s*(?:وصف\s+(?:المشهد|الحركة)|الوصف)\s*[:：]?\s*/gu, '\nوصف: ');
  source = source.replace(/(?:^|\n)\s*(?:حوار\s+)?(?:الشخصية|المتحدث)\s+([\p{Script=Arabic}\p{Mark}][\p{Script=Arabic}\p{Mark}\s]{1,60}?)\s+(?:تقول|يقول|قالت|قال|ترد|يرد|تسأل|يسأل)\s*[:：]?\s*/gu, '\n$1: ');
  source = source.replace(/(?:^|\n)\s*حوار\s+([\p{Script=Arabic}\p{Mark}][\p{Script=Arabic}\p{Mark}\s]{1,50}?)\s*[:：]\s*/gu, '\n$1: ');
  source = source.replace(/(?:^|[،؛.!?\n])\s*([\p{Script=Arabic}\p{Mark}]{2,35})\s+(?:تقول|يقول|قالت|قال|ترد|يرد|تسأل|يسأل)\s*[:：]?\s*/gu,
    (_match, speaker) => '\n' + speaker + ': ');
  return source.replace(/[ \t]+\n/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim();
}

function sceneDetails(raw, number) {
  const cleaned = raw.trim().replace(/^\.(?!\.)/u, '').replace(/^(?:المشهد|مشهد)\s*(?:رقم\s*)?[\d٠-٩]*\s*[:.\-–—]?\s*/iu, '').trim();
  const timeMatch = /(?:^|[\s\-–—])((?:ليل|نهار|صباح|مساء|فجر|day|night|morning|evening))(?:$|[\s\-–—])/iu.exec(` ${cleaned} `);
  const placeMatch = /^(?:INT|EXT|INT\/?EXT|I\/?E)\.?\s*[-–—]?\s*([^\-–—]+?)(?:\s*[-–—]\s*(?:DAY|NIGHT|MORNING|EVENING))?$/iu.exec(cleaned);
  const arabicPlace = cleaned.split(/\s*[-–—]\s*/u).filter(part => !/^(?:داخلي|خارجي|ليل|نهار|صباح|مساء|فجر)$/iu.test(part));
  return {
    title: text(cleaned || `المشهد ${number}`, 250),
    location: text(placeMatch?.[1]?.trim() || arabicPlace.at(-1) || '', 250),
    time: text(timeMatch?.[1] || '', 250),
  };
}

function scriptBase(title, author, kind) {
  return {
    schemaVersion: 1,
    kind: SCRIPT_KINDS.has(kind) ? kind : 'film',
    contentRevision: 'project-file-import-v1',
    targetMinutes: kind === 'series' ? 45 : kind === 'play' ? 90 : 90,
    title: text(title || 'عمل مستورد', 250).trim() || 'عمل مستورد',
    englishTitle: '', subtitle: '', author: text(author, 250),
    edition: 'نسخة مستوردة', audience: '', durationNote: '', synopsis: '',
    units: [], characters: [], scenes: [], notes: '', comments: [],
  };
}

function addCharacter(document, name) {
  const cleaned = probableSpeaker(name) || text(name, 100).trim() || 'متحدث غير محدد';
  const existing = document.characters.find(character => character.name.localeCompare(cleaned, 'ar', { sensitivity: 'base' }) === 0);
  if (existing) return existing.id;
  if (document.characters.length >= MAX_CHARACTERS) return null;
  const character = { id: id('char'), name: cleaned, role: '', age: '', bio: '', color: '#71516f' };
  document.characters.push(character);
  return character.id;
}

function addBlock(scene, type, value, extra = {}) {
  const content = text(value).trim();
  if (!content) return;
  if (scene.blocks.length >= 1_500) throw new Error('أحد المشاهد يتجاوز الحد الأقصى للفقرات. قسّم المشهد ثم أعد المحاولة.');
  scene.blocks.push({ id: id('block'), type, text: content, ...extra });
}

function parseScript(value, options = {}) {
  const source = normalized(value);
  ensureTextSize(source);
  const meta = metadataFrom(source, options.fileName);
  const kind = SCRIPT_KINDS.has(options.kind) ? options.kind : (SCRIPT_KINDS.has(detectKind(source)) ? detectKind(source) : 'film');
  const document = scriptBase(meta.title, meta.author, kind);
  const lines = source.split('\n');
  let currentUnit;
  let currentScene;
  let pending = [];
  let explicitScenes = 0;
  let dialogueBlocks = 0;
  let blockCount = 0;

  const ensureScene = (heading = '') => {
    if (!currentScene || heading) {
      if (document.scenes.length >= MAX_SCENES) throw new Error('يتجاوز الملف الحد الأقصى لعدد المشاهد (٤٠٠).');
      const details = sceneDetails(heading, document.scenes.length + 1);
      currentScene = {
        id: id('scene'), title: details.title, minutes: 0,
        ...(currentUnit ? { unitId: currentUnit } : {}),
        location: details.location, time: details.time, summary: '', status: 'draft', blocks: [], notes: '',
      };
      document.scenes.push(currentScene);
    }
    return currentScene;
  };
  const flush = () => {
    const content = pending.join('\n').trim();
    pending = [];
    if (!content) return;
    addBlock(ensureScene(), 'action', content);
    blockCount += 1;
  };

  for (let index = 0; index < lines.length; index += 1) {
    if (meta.ignored.has(index)) continue;
    const raw = lines[index];
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (isUnitHeading(line)) {
      flush();
      if (document.units.length < MAX_UNITS) {
        const unit = { id: id('unit'), title: text(line.replace(/^#+\s*/u, ''), 250), summary: '' };
        document.units.push(unit);
        currentUnit = unit.id;
        currentScene = undefined;
      }
      continue;
    }
    if (isSceneHeading(line)) {
      flush();
      ensureScene(line);
      explicitScenes += 1;
      continue;
    }
    const sound = /^(?:صوت|مؤثرات(?:\s+صوتية)?|إضاءة|sfx|sound)\s*[:：]\s*(.+)$/iu.exec(line);
    const song = /^(?:أغنية|غناء|lyrics)\s*[:：]\s*(.+)$/iu.exec(line);
    const transition = /^(?:(?:قطع|انتقال)(?:\s+إلى)?|إظلام|cut\s+to|fade\s+(?:in|out)|dissolve\s+to)\s*[:：]\s*(.*)$/iu.exec(line)
      || /^(?:قطع\s+إلى|انتقال\s+إلى|إظلام|cut\s+to|fade\s+(?:in|out)|dissolve\s+to)$/iu.exec(line);
    if (sound || song || transition || /^>\s*\S/u.test(line) || /^##+\s*\S/u.test(line)) {
      flush();
      const type = sound ? 'sound' : song ? 'song' : transition || line.startsWith('>') ? 'transition' : 'heading';
      const content = sound?.[1] || song?.[1] || transition?.[1] || line.replace(/^(?:>|##+)\s*/u, '') || line;
      addBlock(ensureScene(), type, content);
      blockCount += 1;
      continue;
    }
    const spokenAction = /^(?:وصف|حركة|أحداث)\s*[:：]\s*(.+)$/u.exec(line);
    if (spokenAction) {
      flush();
      addBlock(ensureScene(), 'action', spokenAction[1]);
      blockCount += 1;
      continue;
    }
    const inline = /^([^:：]{1,100})[:：]\s*(.+)$/u.exec(line);
    if (inline && probableSpeaker(inline[1])) {
      flush();
      const characterId = addCharacter(document, inline[1]);
      addBlock(ensureScene(), 'dialogue', inline[2], characterId ? { characterId } : { label: text(inline[1], 120) });
      dialogueBlocks += 1;
      blockCount += 1;
      continue;
    }
    const speakerOnly = /^@(.{1,100})$/u.exec(line) || /^([^:：]{1,100})[:：]\s*$/u.exec(line)
      || (/^[A-Z][A-Z\d ._'’\-]{1,99}$/u.test(line) ? [line, line] : null);
    if (speakerOnly && probableSpeaker(speakerOnly[1])) {
      flush();
      const spoken = [];
      let cursor = index + 1;
      for (; cursor < lines.length && lines[cursor].trim(); cursor += 1) {
        const candidate = lines[cursor].trim();
        const nextInline = /^([^:：]{1,100})[:：]\s*.*$/u.exec(candidate);
        const nextSpeaker = /^@(.{1,100})$/u.exec(candidate);
        if (isSceneHeading(candidate) || isUnitHeading(candidate)
          || (nextInline && probableSpeaker(nextInline[1])) || (nextSpeaker && probableSpeaker(nextSpeaker[1]))) break;
        spoken.push(candidate);
      }
      if (spoken.length) {
        const characterId = addCharacter(document, speakerOnly[1]);
        addBlock(ensureScene(), 'dialogue', spoken.join('\n'), characterId ? { characterId } : { label: text(speakerOnly[1], 120) });
        dialogueBlocks += 1;
        blockCount += 1;
        index = cursor - 1;
        continue;
      }
    }
    pending.push(raw.trimEnd());
    if (pending.join('\n').length > 29_000) flush();
    if (blockCount > MAX_BLOCKS) throw new Error('يتجاوز الملف الحد الأقصى للفقرات القابلة للاستيراد.');
  }
  flush();
  ensureScene();
  const warnings = [];
  if (!explicitScenes) warnings.push('لم تُكتشف عناوين مشاهد صريحة؛ جُمعت الفقرات في مشهد أول ويمكن تقسيمه من المحرر.');
  if (!dialogueBlocks) warnings.push('لم يُكتشف حوار بصيغة «اسم الشخصية: النص»؛ صُنّف النص وصفًا وحركة.');
  return { document, warnings, confidence: explicitScenes && dialogueBlocks ? 'high' : explicitScenes || dialogueBlocks ? 'medium' : 'low' };
}

function bookBase(title, author, language) {
  return {
    schemaVersion: 1, kind: 'book', language,
    title: text(title || 'كتاب مستورد', 250).trim() || 'كتاب مستورد',
    subtitle: '', author: text(author, 200), edition: 'نسخة مستوردة',
    frontMatter: [], chapters: [], notes: '',
  };
}

function parseBook(value, options = {}) {
  const source = normalized(value);
  ensureTextSize(source);
  const meta = metadataFrom(source, options.fileName);
  const language = options.kind === 'book-en' ? 'en' : options.kind === 'book-ar' ? 'ar' : arabicRatio(source) >= 0.2 ? 'ar' : 'en';
  const document = bookBase(meta.title, meta.author, language);
  const lines = source.split('\n');
  let chapter;
  let pending = [];
  let explicitChapters = 0;
  let blocks = 0;
  const ensureChapter = (heading = '') => {
    if (!chapter || heading) {
      if (document.chapters.length >= 500) throw new Error('يتجاوز الملف الحد الأقصى لعدد الفصول (٥٠٠).');
      chapter = { id: id('chapter'), title: text(heading.replace(/^#+\s*/u, '').trim() || (language === 'ar' ? 'النص' : 'Text'), 1_000), number: document.chapters.length + 1, blocks: [], notes: '' };
      document.chapters.push(chapter);
    }
    return chapter;
  };
  const add = (type, value) => {
    const content = text(value).trim();
    if (!content) return;
    const target = ensureChapter();
    if (target.blocks.length >= 1_500) throw new Error('أحد فصول الكتاب يتجاوز الحد الأقصى للفقرات. قسّم الفصل ثم أعد المحاولة.');
    target.blocks.push({ id: id('paragraph'), type, text: content });
    blocks += 1;
    if (blocks > MAX_BLOCKS) throw new Error('يتجاوز الملف الحد الأقصى للفقرات القابلة للاستيراد.');
  };
  const flush = () => {
    const content = pending.join('\n').trim();
    pending = [];
    add('paragraph', content);
  };
  for (let index = 0; index < lines.length; index += 1) {
    if (meta.ignored.has(index)) continue;
    const raw = lines[index];
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (isBookChapter(line)) {
      flush();
      ensureChapter(line);
      explicitChapters += 1;
      continue;
    }
    if (/^##+\s+\S/u.test(line)) { flush(); add('heading', line.replace(/^##+\s*/u, '')); continue; }
    if (/^(?:[-*•]|\d+[.)]|[٠-٩]+[.)])\s+\S/u.test(line)) { flush(); add('list-item', line.replace(/^(?:[-*•]|\d+[.)]|[٠-٩]+[.)])\s+/u, '')); continue; }
    if (/^>\s*\S/u.test(line)) { flush(); add('quote', line.replace(/^>\s*/u, '')); continue; }
    pending.push(raw.trimEnd());
    if (pending.join('\n').length > 29_000) flush();
  }
  flush();
  ensureChapter();
  const warnings = explicitChapters ? [] : ['لم تُكتشف عناوين فصول صريحة؛ أُدرج النص في فصل واحد ويمكن تقسيمه من محرر الكتاب.'];
  return { document, warnings, confidence: explicitChapters ? 'high' : blocks > 1 ? 'medium' : 'low' };
}

function decodeXml(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return value.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/giu, (match, numeric, name) => {
    if (name) return named[name.toLowerCase()];
    const code = numeric.toLowerCase().startsWith('x') ? Number.parseInt(numeric.slice(1), 16) : Number.parseInt(numeric, 10);
    return Number.isInteger(code) && code >= 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : '�';
  });
}

function xmlText(value) {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<xi:include|<xinclude/iu.test(value)) throw new Error('ملف Word يحتوي تعريفات خارجية غير مسموحة.');
  return decodeXml(value
    .replace(/<w:tab\b[^>]*\/?\s*>/giu, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/giu, '\n')
    .replace(/<\/w:p\s*>/giu, '\n\n')
    .replace(/<\/w:tr\s*>/giu, '\n')
    .replace(/<[^>]+>/gu, ''))
    .replace(/[ \t]+\n/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim();
}

function findEndOfCentralDirectory(view) {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

async function inflateRaw(bytes, limit) {
  if (typeof DecompressionStream !== 'function') throw new Error('هذا المتصفح لا يدعم فك ملف Word. حدّث المتصفح أو استخدم TXT.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('ملف Word يفك إلى حجم غير آمن.'); }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

async function readZipEntry(bytes, entry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error('بنية ملف Word غير صالحة.');
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (start < 0 || end > bytes.byteLength) throw new Error('بنية ملف Word غير مكتملة.');
  const compressed = bytes.subarray(start, end);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRaw(compressed, Math.min(entry.uncompressedSize + 1_024, MAX_DOCX_ENTRY_BYTES));
  throw new Error('طريقة ضغط ملف Word غير مدعومة.');
}

export async function extractDocxText(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.byteLength || bytes.byteLength > MAX_DOCX_BYTES) throw new Error('حجم ملف Word غير مسموح (الحد ١٠ ميغابايت).');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndOfCentralDirectory(view);
  if (end < 0) throw new Error('الملف ليس DOCX صالحًا.');
  const count = view.getUint16(end + 10, true);
  const centralOffset = view.getUint32(end + 16, true);
  if (count > 10_000 || centralOffset >= bytes.byteLength) throw new Error('بنية ملف Word غير آمنة.');
  const wanted = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('فهرس ملف Word غير صالح.');
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if ((flags & 1) !== 0) throw new Error('ملفات Word المشفّرة بكلمة مرور غير مدعومة.');
    if (uncompressedSize > MAX_DOCX_ENTRY_BYTES) throw new Error('أحد مكونات ملف Word أكبر من الحد الآمن.');
    if (['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml', 'docProps/core.xml'].includes(name)) {
      wanted.set(name, { method, compressedSize, uncompressedSize, localOffset });
    }
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  if (!wanted.has('word/document.xml')) throw new Error('لا يحتوي ملف Word على مستند قابل للقراءة.');
  const read = async name => wanted.has(name) ? decoder.decode(await readZipEntry(bytes, wanted.get(name))) : '';
  const documentXml = await read('word/document.xml');
  const footnotes = await read('word/footnotes.xml');
  const endnotes = await read('word/endnotes.xml');
  const core = await read('docProps/core.xml');
  const titleMatch = /<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/iu.exec(core);
  const authorMatch = /<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/iu.exec(core);
  const body = [xmlText(documentXml), footnotes ? xmlText(footnotes) : '', endnotes ? xmlText(endnotes) : ''].filter(Boolean).join('\n\n');
  ensureTextSize(body);
  return { text: body, title: titleMatch ? decodeXml(titleMatch[1]).trim() : '', author: authorMatch ? decodeXml(authorMatch[1]).trim() : '' };
}

function normalizeScriptDocument(raw) {
  if (!raw || typeof raw !== 'object' || !SCRIPT_KINDS.has(raw.kind) || !Array.isArray(raw.scenes)) throw new Error('نسخة JSON لا تحتوي مشروع سيناريو صالحًا.');
  const document = scriptBase(raw.title, raw.author, raw.kind);
  document.englishTitle = text(raw.englishTitle, 250);
  document.subtitle = text(raw.subtitle, 250);
  document.edition = text(raw.edition || 'نسخة مستوردة', 250);
  document.audience = text(raw.audience, 300);
  document.durationNote = text(raw.durationNote, 500);
  document.synopsis = text(raw.synopsis);
  document.notes = text(raw.notes, 100_000);
  document.targetMinutes = Number.isFinite(raw.targetMinutes) ? Math.max(0, Math.min(600, raw.targetMinutes)) : 90;
  const unitIds = new Map();
  for (const source of (Array.isArray(raw.units) ? raw.units : []).slice(0, MAX_UNITS)) {
    const unit = { id: id('unit'), title: text(source?.title, 250), summary: text(source?.summary) };
    unitIds.set(source?.id, unit.id); document.units.push(unit);
  }
  const characterIds = new Map();
  for (const source of (Array.isArray(raw.characters) ? raw.characters : []).slice(0, MAX_CHARACTERS)) {
    const name = text(source?.name, 100).trim();
    if (!name) continue;
    const character = { id: id('char'), name, role: text(source?.role, 150), age: text(source?.age, 50), bio: text(source?.bio), color: /^#[0-9a-f]{6}$/iu.test(source?.color || '') ? source.color : '#71516f' };
    characterIds.set(source?.id, character.id); document.characters.push(character);
  }
  for (const [index, source] of raw.scenes.slice(0, MAX_SCENES).entries()) {
    const scene = {
      id: id('scene'), title: text(source?.title || `المشهد ${index + 1}`, 250), minutes: Number.isFinite(source?.minutes) ? Math.max(0, Math.min(300, source.minutes)) : 0,
      ...(unitIds.has(source?.unitId) ? { unitId: unitIds.get(source.unitId) } : {}),
      location: text(source?.location, 250), time: text(source?.time, 250), summary: text(source?.summary),
      status: ['draft', 'review', 'ready'].includes(source?.status) ? source.status : 'draft', blocks: [], notes: text(source?.notes),
    };
    for (const block of (Array.isArray(source?.blocks) ? source.blocks : []).slice(0, 1_500)) {
      if (!BLOCK_TYPES.has(block?.type)) continue;
      const content = text(block?.text).trim();
      if (!content) continue;
      const characterId = characterIds.get(block?.characterId);
      scene.blocks.push({ id: id('block'), type: block.type, text: content, ...(characterId ? { characterId } : block.type === 'dialogue' ? { label: text(block?.label || 'متحدث غير محدد', 120) } : {}), ...(block?.bold === true ? { bold: true } : {}), ...(block?.italic === true ? { italic: true } : {}) });
    }
    document.scenes.push(scene);
  }
  if (!document.scenes.length) document.scenes.push({ id: id('scene'), title: 'المشهد الأول', minutes: 0, location: '', time: '', summary: '', status: 'draft', blocks: [], notes: '' });
  return document;
}

function normalizeBookDocument(raw) {
  if (!raw || typeof raw !== 'object' || raw.kind !== 'book' || !Array.isArray(raw.chapters)) throw new Error('نسخة JSON لا تحتوي مشروع كتاب صالحًا.');
  const document = bookBase(raw.title, raw.author, raw.language === 'en' ? 'en' : 'ar');
  document.subtitle = text(raw.subtitle, 500);
  document.edition = text(raw.edition || 'نسخة مستوردة', 250);
  document.notes = text(raw.notes, 100_000);
  const normalizeSection = (source, index, frontMatter = false) => ({
    id: id(frontMatter ? 'front' : 'chapter'), title: text(source?.title || (frontMatter ? '' : `الفصل ${index + 1}`), 1_000),
    ...(frontMatter ? {} : { number: index + 1 }),
    blocks: (Array.isArray(source?.blocks) ? source.blocks : []).slice(0, 1_500).flatMap(block => {
      const content = text(block?.text).trim();
      return content ? [{ id: id('paragraph'), type: BOOK_BLOCK_TYPES.has(block?.type) ? block.type : 'paragraph', text: content }] : [];
    }), notes: text(source?.notes),
  });
  document.frontMatter = (Array.isArray(raw.frontMatter) ? raw.frontMatter : []).slice(0, 50).map((section, index) => normalizeSection(section, index, true));
  document.chapters = raw.chapters.slice(0, 500).map((section, index) => normalizeSection(section, index));
  if (!document.chapters.length) document.chapters.push({ id: id('chapter'), title: document.language === 'ar' ? 'النص' : 'Text', number: 1, blocks: [], notes: '' });
  return document;
}

function scriptToBook(source, kind) {
  const language = kind === 'book-en' ? 'en' : 'ar';
  const document = bookBase(source.title, source.author, language);
  const names = new Map(source.characters.map(character => [character.id, character.name]));
  const units = new Map(source.units.map(unit => [unit.id, unit.title]));
  const groups = new Map();
  for (const [index, scene] of source.scenes.entries()) {
    const key = scene.unitId || scene.id;
    if (!groups.has(key)) groups.set(key, { title: units.get(scene.unitId) || scene.title || `${language === 'ar' ? 'الفصل' : 'Chapter'} ${groups.size + 1}`, scenes: [] });
    groups.get(key).scenes.push({ scene, index });
  }
  document.chapters = [...groups.values()].slice(0, 500).map((group, chapterIndex) => {
    const blocks = [];
    for (const { scene, index } of group.scenes) {
      blocks.push({ id: id('paragraph'), type: 'heading', text: scene.title || `${language === 'ar' ? 'المشهد' : 'Scene'} ${index + 1}` });
      for (const block of scene.blocks) {
        const content = block.type === 'dialogue' ? `${names.get(block.characterId) || block.label || 'متحدث'}: ${block.text}` : block.text;
        blocks.push({ id: id('paragraph'), type: block.type === 'heading' ? 'heading' : 'paragraph', text: text(content) });
      }
    }
    return { id: id('chapter'), title: text(group.title, 1_000), number: chapterIndex + 1, blocks: blocks.slice(0, 1_500), notes: '' };
  });
  if (!document.chapters.length) document.chapters.push({ id: id('chapter'), title: language === 'ar' ? 'النص' : 'Text', number: 1, blocks: [], notes: '' });
  return document;
}

function bookToScript(source, kind) {
  const document = scriptBase(source.title, source.author, kind);
  for (const [index, chapter] of source.chapters.slice(0, MAX_SCENES).entries()) {
    document.scenes.push({
      id: id('scene'), title: text(chapter.title || `المشهد ${index + 1}`, 250), minutes: 0, location: '', time: '', summary: '', status: 'draft', notes: '',
      blocks: chapter.blocks.slice(0, 1_500).flatMap(block => {
        const content = text(block.text).trim();
        return content ? [{ id: id('block'), type: block.type === 'heading' ? 'heading' : 'action', text: content }] : [];
      }),
    });
  }
  if (!document.scenes.length) document.scenes.push({ id: id('scene'), title: 'المشهد الأول', minutes: 0, location: '', time: '', summary: '', status: 'draft', blocks: [], notes: '' });
  return document;
}

export function summarizeImportedDocument(document) {
  if (document.kind === 'book') {
    const blocks = [...document.frontMatter, ...document.chapters].flatMap(section => section.blocks);
    return { chapters: document.chapters.length, paragraphs: blocks.length, headings: blocks.filter(block => block.type === 'heading').length, words: blocks.reduce((sum, block) => sum + wordCount(block.text), 0) };
  }
  const blocks = document.scenes.flatMap(scene => scene.blocks);
  return { units: document.units.length, scenes: document.scenes.length, characters: document.characters.length, dialogues: blocks.filter(block => block.type === 'dialogue').length, actions: blocks.filter(block => block.type !== 'dialogue').length, words: blocks.reduce((sum, block) => sum + wordCount(block.text), 0) };
}

function planFor(document, details = {}) {
  return {
    document,
    fileName: details.fileName || '',
    format: details.format || 'نص',
    title: document.title,
    author: document.author || '',
    recommendedKind: document.kind === 'book' ? (document.language === 'en' ? 'book-en' : 'book-ar') : document.kind,
    confidence: details.confidence || 'high',
    warnings: details.warnings || [],
    sourceText: details.sourceText,
    metrics: summarizeImportedDocument(document),
  };
}

export function parseManuscriptText(value, options = {}) {
  const source = normalized(value);
  ensureTextSize(source);
  const chosen = SCRIPT_KINDS.has(options.preferredKind) || BOOK_KINDS.has(options.preferredKind) ? options.preferredKind : detectKind(source);
  const parsed = BOOK_KINDS.has(chosen) ? parseBook(source, { fileName: options.fileName, kind: chosen }) : parseScript(source, { fileName: options.fileName, kind: chosen });
  return planFor(parsed.document, { fileName: options.fileName, format: options.format || 'نص', confidence: parsed.confidence, warnings: parsed.warnings, sourceText: source });
}

export function prepareImportedDocument(plan, { title, kind }) {
  if (!plan?.document) throw new Error('اختر ملفًا صالحًا قبل إنشاء المشروع.');
  const targetKind = SCRIPT_KINDS.has(kind) || BOOK_KINDS.has(kind) ? kind : plan.recommendedKind;
  let document;
  if (plan.sourceText) {
    document = BOOK_KINDS.has(targetKind)
      ? parseBook(plan.sourceText, { fileName: plan.fileName, kind: targetKind }).document
      : parseScript(plan.sourceText, { fileName: plan.fileName, kind: targetKind }).document;
  } else if (BOOK_KINDS.has(targetKind)) {
    document = plan.document.kind === 'book' ? normalizeBookDocument(plan.document) : scriptToBook(plan.document, targetKind);
    document.language = targetKind === 'book-en' ? 'en' : 'ar';
  } else {
    document = plan.document.kind === 'book' ? bookToScript(plan.document, targetKind) : normalizeScriptDocument(plan.document);
    document.kind = targetKind;
  }
  document.title = text(title || plan.title || document.title, 250).trim() || document.title;
  return document;
}

export async function importManuscriptFile(file, options = {}) {
  if (!file || typeof file.name !== 'string') throw new Error('اختر ملفًا من جهازك.');
  const ext = extension(file.name);
  const mime = String(file.type || '').toLowerCase();
  const localFormat = TEXT_EXTENSIONS.has(ext) || ['fountain', 'fdx', 'json', 'docx'].includes(ext) || mime.startsWith('text/');
  const externallyExtracted = EXTERNAL_EXTENSIONS.has(ext) || MEDIA_EXTENSIONS.has(ext) || (ext === 'docx' && file.size > MAX_DOCX_BYTES)
    || mime === 'application/pdf' || mime.startsWith('image/') || mime.startsWith('audio/') || mime === 'video/mp4' || !localFormat;
  if (externallyExtracted) {
    const maximum = MEDIA_EXTENSIONS.has(ext) || mime.startsWith('audio/') || mime === 'video/mp4' ? MAX_MEDIA_BYTES : MAX_EXTERNAL_BYTES;
    if (file.size > maximum) throw new Error(`حجم الملف أكبر من الحد المسموح (${maximum === MAX_MEDIA_BYTES ? '٨' : '٢٥'} ميغابايت).`);
    if (typeof options.extractFile !== 'function') throw new Error('يحتاج هذا النوع إلى محرك التحليل الآمن في الاستوديو. أعد المحاولة من الموقع المنشور.');
    const media = MEDIA_EXTENSIONS.has(ext) || mime.startsWith('audio/') || mime === 'video/mp4';
    const extracted = await options.extractFile(file, { media });
    if (!extracted || typeof extracted.text !== 'string') throw new Error('لم يُرجع محرك التحليل نصًا صالحًا.');
    const interpreted = media ? normalizeSpokenManuscript(extracted.text) : extracted.text;
    const plan = parseManuscriptText(interpreted, { fileName: file.name, preferredKind: options.preferredKind, format: extracted.format || 'نص مستخرج' });
    plan.warnings = [...(Array.isArray(extracted.warnings) ? extracted.warnings : []), ...plan.warnings].slice(0, 12);
    return plan;
  }
  if (!TEXT_EXTENSIONS.has(ext) && !['fountain', 'fdx', 'json', 'docx'].includes(ext) && !mime.startsWith('text/')) {
    throw new Error('تعذر تحديد صيغة الملف. استخدم PDF أو ملفًا مكتبيًا أو نصيًا أو صورة أو تسجيلًا صوتيًا.');
  }
  if (ext === 'docx') {
    if (file.size > MAX_DOCX_BYTES) throw new Error('حجم ملف Word أكبر من ١٠ ميغابايت.');
    const extracted = await extractDocxText(await file.arrayBuffer());
    const plan = parseManuscriptText(extracted.text, { fileName: file.name, preferredKind: options.preferredKind, format: 'Word (DOCX)' });
    if (extracted.title && plan.title === fileStem(file.name)) plan.title = plan.document.title = text(extracted.title, 250);
    if (extracted.author && !plan.author) plan.author = plan.document.author = text(extracted.author, 200);
    return plan;
  }
  if (file.size > MAX_TEXT_BYTES) throw new Error('حجم الملف أكبر من ٢ ميغابايت.');
  const source = normalized(await file.text());
  ensureTextSize(source);
  if (ext === 'fdx' || ext === 'fountain') {
    const exchange = await import('./chunks/writer-exchange-SRX7NQ2B.mjs');
    const imported = ext === 'fdx' ? exchange.parseFdx(source) : exchange.parseFountain(source);
    const document = normalizeScriptDocument(imported);
    if (SCRIPT_KINDS.has(options.preferredKind)) document.kind = options.preferredKind;
    return planFor(document, { fileName: file.name, format: ext === 'fdx' ? 'Final Draft (FDX)' : 'Fountain', confidence: 'high', warnings: [] });
  }
  if (ext === 'json') {
    let parsed;
    try { parsed = JSON.parse(source); } catch { throw new Error('ملف JSON غير صالح.'); }
    const raw = parsed?.document || parsed?.doc || parsed;
    const document = raw?.kind === 'book' ? normalizeBookDocument(raw) : normalizeScriptDocument(raw);
    return planFor(document, { fileName: file.name, format: 'نسخة استيديو JSON', confidence: 'high', warnings: [] });
  }
  const prepared = ext === 'html' || ext === 'htm' || ext === 'xml' ? plainMarkup(source)
    : ext === 'srt' || ext === 'vtt' ? captionText(source)
      : source;
  const format = ext === 'md' || ext === 'markdown' ? 'Markdown'
    : ext === 'html' || ext === 'htm' ? 'HTML'
      : ext === 'xml' ? 'XML'
        : ext === 'csv' || ext === 'tsv' ? 'جدول نصي'
          : ext === 'srt' || ext === 'vtt' ? 'نص ترجمة'
            : 'نص';
  return parseManuscriptText(prepared, { fileName: file.name, preferredKind: options.preferredKind, format });
}
