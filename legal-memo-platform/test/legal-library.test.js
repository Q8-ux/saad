'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const {
  analyseLegalDocument,
  chunkLegalText,
  ensureLegalSchema,
  getLegalStats,
  parseMojLawsHtml,
  saveLegalDocumentText,
  searchLegalDocuments,
  upsertManifest,
} = require('../legal-library');

test('extracts and deduplicates only official Ministry PDFs', () => {
  const html = `
    <a href="/AR/Documents/MojDocs/Law59-2025.pdf"><img alt="pdf"></a>
    <a href="/AR/Documents/MojDocs/Law59-2025.pdf">قانون رقم 59 لسنة 2025 بشأن تعديل بعض أحكام قانون المرافعات المدنية والتجارية</a>
    <a href="https://other.example/law.pdf">مصدر غير رسمي</a>
    <a href="/AR/Documents/readme.txt">ليس PDF</a>`;
  const documents = parseMojLawsHtml(html);
  assert.equal(documents.length, 1);
  assert.equal(documents[0].title, 'قانون رقم 59 لسنة 2025 بشأن تعديل بعض أحكام قانون المرافعات المدنية والتجارية');
  assert.equal(documents[0].source_url, 'https://moj.gov.kw/AR/Documents/MojDocs/Law59-2025.pdf');
});

test('ships the verified Ministry snapshot with 89 unique official PDFs', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seed', 'moj-laws-manifest.json'), 'utf8'));
  assert.equal(manifest.document_count, 89);
  assert.equal(manifest.documents.length, 89);
  assert.equal(new Set(manifest.documents.map(item => item.source_url)).size, 89);
  assert.ok(manifest.documents.every(item => new URL(item.source_url).hostname === 'moj.gov.kw'));
});

test('classifies the identity and amendment risk without inventing a legal conclusion', () => {
  const result = analyseLegalDocument(
    { title: 'مرسوم بقانون رقم 72 لسنة 2025 بشأن الدعاوي قليلة القيمة' },
    'المادة 1\nتسري الأحكام الآتية.\nالمادة 2\nيلغى كل حكم يخالف هذا القانون.',
    4,
  );
  assert.equal(result.document_type, 'مرسوم بقانون');
  assert.equal(result.law_number, 72);
  assert.equal(result.law_year, 2025);
  assert.equal(result.category, 'مرافعات وتنفيذ');
  assert.equal(result.article_count, 2);
  assert.equal(result.has_amendment_signal, true);
  assert.match(result.summary, /يجب ربطه بالنص الأصلي قبل الاعتماد/);
});

test('does not confuse a constitutional-court law with the Constitution itself', () => {
  const result = analyseLegalDocument({ title: 'قانون رقم 14 لسنة 1973 بشأن إنشاء المحكمة الدستورية' }, '');
  assert.equal(result.document_type, 'قانون');
  assert.equal(result.category, 'دستوري وقضائي');
});

test('chunks legal text into ordered searchable segments', () => {
  const body = `${'مقدمة القانون '.repeat(100)}\nالمادة 1\n${'نص المادة الأولى '.repeat(300)}\nالمادة 2\n${'نص المادة الثانية '.repeat(300)}`;
  const chunks = chunkLegalText(body, 1500, 150);
  assert.ok(chunks.length > 2);
  assert.deepEqual(chunks.map(chunk => chunk.chunk_index), chunks.map((_chunk, index) => index));
  assert.ok(chunks.every(chunk => chunk.text.length <= 1600));
  assert.ok(chunks.some(chunk => chunk.reference?.includes('المادة')));
});

test('adds a non-destructive legal library schema and supports retrieval', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE existing_cases (id INTEGER PRIMARY KEY, title TEXT)');
  db.prepare('INSERT INTO existing_cases (title) VALUES (?)').run('قضية قائمة');
  ensureLegalSchema(db);
  const [document] = upsertManifest(db, [{
    title: 'قانون رقم 67 لسنة 1980 بإصدار القانون المدني',
    source_url: 'https://moj.gov.kw/AR/Documents/MojDocs/civil.pdf',
  }]);
  saveLegalDocumentText(db, document.id, {
    text: 'المادة 1\nتسري أحكام القانون المدني على المسائل المدنية.\nالمادة 2\nالعقد شريعة المتعاقدين.',
    checksum: 'abc123',
    pageCount: 2,
  });
  assert.equal(db.prepare('SELECT COUNT(*) count FROM existing_cases').get().count, 1);
  const results = searchLegalDocuments(db, { query: 'العقد المتعاقدين' });
  assert.equal(results.items.length, 1);
  assert.equal(results.items[0].law_number, 67);
  const stats = getLegalStats(db);
  assert.equal(stats.total, 1);
  assert.equal(stats.ready, 1);
  db.close();
});
