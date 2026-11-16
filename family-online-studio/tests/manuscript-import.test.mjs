import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describeStudioNetworkFailure } from '../assets/studio-works.mjs';
import { deflateRawSync } from 'node:zlib';
import {
  extractDocxText,
  importManuscriptFile,
  parseManuscriptText,
  prepareImportedDocument,
  summarizeImportedDocument,
} from '../assets/manuscript-import.mjs';

function uint16(value) {
  const output = Buffer.alloc(2);
  output.writeUInt16LE(value);
  return output;
}

function uint32(value) {
  const output = Buffer.alloc(4);
  output.writeUInt32LE(value);
  return output;
}

function makeZip(entries, deflated = false) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const filename = Buffer.from(name);
    const data = Buffer.from(content);
    const compressed = deflated ? deflateRawSync(data) : data;
    const method = deflated ? 8 : 0;
    const localHeader = Buffer.concat([
      Buffer.from('504b0304', 'hex'), uint16(20), uint16(0), uint16(method), uint16(0), uint16(0),
      uint32(0), uint32(compressed.length), uint32(data.length), uint16(filename.length), uint16(0), filename,
    ]);
    local.push(localHeader, compressed);
    central.push(Buffer.concat([
      Buffer.from('504b0102', 'hex'), uint16(20), uint16(20), uint16(0), uint16(method), uint16(0), uint16(0),
      uint32(0), uint32(compressed.length), uint32(data.length), uint16(filename.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(offset), filename,
    ]));
    offset += localHeader.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(central);
  return Buffer.concat([
    ...local,
    centralDirectory,
    Buffer.from('504b0506', 'hex'), uint16(0), uint16(0), uint16(central.length), uint16(central.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0),
  ]);
}

const storedZip = entries => makeZip(entries);
const deflatedZip = entries => makeZip(entries, true);

test('Arabic dramatic text is distributed into episodes, scenes, dialogue, action and characters', () => {
  const plan = parseManuscriptText(`العنوان: تجربة الاستيراد
المؤلف: سعد

الحلقة 1 — البداية
المشهد 1 - داخلي - البيت - ليل
سعد: هلا والله
فاطمة:
أهلين

قطع إلى:

المشهد 2 - خارجي - الشارع - نهار
يمشي سعد في الشارع.`, { fileName: 'episode.txt' });

  assert.equal(plan.recommendedKind, 'series');
  assert.equal(plan.title, 'تجربة الاستيراد');
  assert.deepEqual(plan.metrics, { units: 1, scenes: 2, characters: 2, dialogues: 2, actions: 2, words: 9 });
  assert.deepEqual(plan.document.characters.map(character => character.name), ['سعد', 'فاطمة']);
  assert.equal(plan.document.scenes[0].location, 'البيت');
  assert.equal(plan.document.scenes[0].time, 'ليل');
  assert.deepEqual(plan.warnings, []);
});

test('book text is distributed into chapters, headings, paragraphs, lists and quotes', () => {
  const plan = parseManuscriptText(`# فن السطر الأخير

الفصل الأول: البدايات
هذه فقرة أولى.

## قاعدة مهمة
- لا تشرح النهاية.
> اترك أثرًا بعد السطر.

الفصل الثاني: التطبيق
هذه فقرة ثانية.`, { fileName: 'book.md', preferredKind: 'book-ar' });

  assert.equal(plan.recommendedKind, 'book-ar');
  assert.equal(plan.document.chapters.length, 2);
  assert.deepEqual(plan.document.chapters[0].blocks.map(block => block.type), ['paragraph', 'heading', 'list-item', 'quote']);
  assert.equal(plan.warnings.length, 0);
});

test('the chosen project type controls the final distribution', () => {
  const plan = parseManuscriptText(`الحلقة 1
المشهد 1 - داخلي - مكتب - نهار
نورة: صباح الخير`, { fileName: 'script.txt' });
  const book = prepareImportedDocument(plan, { title: 'نسخة كتاب', kind: 'book-ar' });
  assert.equal(book.kind, 'book');
  assert.equal(book.title, 'نسخة كتاب');
  assert.equal(book.chapters.length, 1);
  assert.ok(book.chapters[0].blocks.some(block => block.text.includes('نورة: صباح الخير')));
  const script = prepareImportedDocument(plan, { title: 'نسخة مسرحية', kind: 'play' });
  assert.equal(script.kind, 'play');
  assert.equal(summarizeImportedDocument(script).dialogues, 1);
});

test('speaker-only dialogue lines stop when the next speaker begins', () => {
  const plan = parseManuscriptText(`المشهد 1 - داخلي - مجلس - ليل
سعد:
مساء الخير
نورة:
مساء النور`, { fileName: 'dialogue.txt', preferredKind: 'play' });
  assert.equal(plan.metrics.dialogues, 2);
  assert.deepEqual(plan.document.characters.map(character => character.name), ['سعد', 'نورة']);
  assert.deepEqual(plan.document.scenes[0].blocks.map(block => block.text), ['مساء الخير', 'مساء النور']);
});

test('Studio JSON backups are normalized before import', async () => {
  const source = {
    document: {
      schemaVersion: 1, kind: 'film', title: 'نسخة آمنة', author: 'سعد', targetMinutes: 90,
      units: [], characters: [{ id: 'old-character', name: 'سعد', role: '', age: '', bio: '', color: '#71516f' }],
      scenes: [{ id: 'old-scene', title: 'المشهد', minutes: 1, location: '', time: '', summary: '', status: 'draft', notes: '', blocks: [{ id: 'old-block', type: 'dialogue', text: 'مرحبًا', characterId: 'old-character' }] }],
      comments: [], notes: '', englishTitle: '', subtitle: '', edition: '', audience: '', durationNote: '', synopsis: '',
    },
  };
  const encoded = JSON.stringify(source);
  const plan = await importManuscriptFile({ name: 'backup.json', size: Buffer.byteLength(encoded), text: async () => encoded });
  assert.equal(plan.title, 'نسخة آمنة');
  assert.notEqual(plan.document.scenes[0].id, 'old-scene');
  assert.equal(plan.document.scenes[0].blocks[0].characterId, plan.document.characters[0].id);
});

test('DOCX text and core metadata are extracted without a server upload', async () => {
  const docx = deflatedZip({
    'word/document.xml': '<?xml version="1.0"?><w:document xmlns:w="w"><w:body><w:p><w:r><w:t>المشهد 1</w:t></w:r></w:p><w:p><w:r><w:t>سعد: مرحبًا</w:t></w:r></w:p></w:body></w:document>',
    'docProps/core.xml': '<?xml version="1.0"?><cp:coreProperties xmlns:cp="cp" xmlns:dc="dc"><dc:title>نص Word</dc:title><dc:creator>سعد</dc:creator></cp:coreProperties>',
  });
  const extracted = await extractDocxText(docx);
  assert.match(extracted.text, /المشهد 1\n\nسعد: مرحبًا/u);
  assert.equal(extracted.title, 'نص Word');
  assert.equal(extracted.author, 'سعد');
});

test('unsafe DOCX external definitions are rejected', async () => {
  const docx = storedZip({
    'word/document.xml': '<!DOCTYPE x [<!ENTITY ext SYSTEM "https://example.invalid/x">]><w:document><w:p><w:r><w:t>&ext;</w:t></w:r></w:p></w:document>',
  });
  await assert.rejects(() => extractDocxText(docx), /تعريفات خارجية/u);
});

test('new-project interface exposes review-first file import and account-scoped saving', async () => {
  const [works, styles] = await Promise.all([
    readFile(new URL('../assets/studio-works.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../assets/studio-workspaces.css', import.meta.url), 'utf8'),
  ]);
  assert.match(works, /البدء من ملف/u);
  assert.match(works, /prepareImportedDocument/u);
  assert.match(works, /\/api\/manuscript\?work=/u);
  assert.match(works, /النص المنظّم داخل حسابك فقط/u);
  assert.match(works, /\.pdf/u);
  assert.match(works, /\/api\/import-document/u);
  assert.match(works, /\/api\/transcribe/u);
  assert.doesNotMatch(works, /المفاصل الخمسة عشر|الفصول الأربعة/u);
  assert.doesNotMatch(works, /localStorage|sessionStorage/u);
  assert.match(styles, /\.workspace-import-summary/u);
  assert.match(styles, /\.workspace-file-input/u);
});

test('PDF and image files use the authenticated extractor then enter the same distribution engine', async () => {
  const file = { name: 'episode.pdf', type: 'application/pdf', size: 4500 };
  let received;
  const plan = await importManuscriptFile(file, { extractFile: async (value, details) => {
    received = { value, details };
    return { text: 'الحلقة 1\nالمشهد 1 - داخلي - بيت - ليل\nسعد: وصلت', format: 'PDF', warnings: ['مراجعة OCR'] };
  } });
  assert.equal(received.value, file);
  assert.equal(received.details.media, false);
  assert.equal(plan.recommendedKind, 'series');
  assert.equal(plan.metrics.scenes, 1);
  assert.equal(plan.metrics.dialogues, 1);
  assert.ok(plan.warnings.includes('مراجعة OCR'));
});

test('audio files are transcribed through the supplied extractor without showing route choices', async () => {
  let media = false;
  const plan = await importManuscriptFile({ name: 'idea.m4a', type: 'audio/mp4', size: 3000 }, { extractFile: async (_file, details) => {
    media = details.media;
    return { text: 'المشهد 1\nنورة: هذه فكرة مسجلة', format: 'تفريغ تسجيل صوتي' };
  } });
  assert.equal(media, true);
  assert.equal(plan.metrics.dialogues, 1);
});

test('HTML and subtitle formats are cleaned before structural analysis', async () => {
  const html = await importManuscriptFile({ name: 'draft.html', type: 'text/html', size: 200, text: async () => '<h1>الفصل الأول</h1><p>فقرة أولى</p>' });
  assert.equal(html.recommendedKind, 'book-ar');
  assert.match(html.sourceText, /فقرة أولى/u);
  assert.doesNotMatch(html.sourceText, /<p>/u);
  const srt = await importManuscriptFile({ name: 'scene.srt', type: 'text/plain', size: 200, text: async () => '1\n00:00:01,000 --> 00:00:02,000\nالمشهد 1\nسعد: أهلاً' });
  assert.equal(srt.metrics.dialogues, 1);
  assert.doesNotMatch(srt.sourceText, /00:00/u);
});

test('new-project workflow translates unavailable gateway errors and avoids ambiguous duplicate creation', async () => {
  const network = describeStudioNetworkFailure(new TypeError('Failed to fetch'), true);
  assert.match(network.message, /ربما حُفظ المشروع بالفعل/u);
  assert.match(network.message, /قبل تكرار الإنشاء/u);
  const readFailure = describeStudioNetworkFailure(new TypeError('Failed to fetch'));
  assert.match(readFailure.message, /تعذر الاتصال بخادم الأعمال/u);
  assert.doesNotMatch(readFailure.message, /Failed to fetch/u);
  assert.match(describeStudioNetworkFailure(Object.assign(new Error('timeout'), { name: 'TimeoutError' })).message, /تأخر رد خادم الأعمال/u);
  const regular = new Error('خطأ في التحقق من البيانات');
  assert.equal(describeStudioNetworkFailure(regular), regular);

  const source = await readFile(new URL('../assets/studio-works.mjs', import.meta.url), 'utf8');
  assert.match(source, /يلزم رفع ملف وتحليله/u);
  assert.match(source, /إعادة الاتصال وتحديث أعمالي/u);
  assert.match(source, /لم يُحذف المشروع تلقائيًا/u);
  assert.doesNotMatch(source, /action: 'delete', id: createdId/u);
});
