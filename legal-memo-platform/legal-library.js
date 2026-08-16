'use strict';

const crypto = require('crypto');

const OFFICIAL_SOURCE = 'وزارة العدل الكويتية';
const DEFAULT_SOURCE_PAGE = 'https://moj.gov.kw/AR/Pages/MojLaws.aspx';

function decodeHtmlEntities(value = '') {
  const named = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    zwnj: '', zwj: '',
  };
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : '';
    }
    return named[entity.toLowerCase()] ?? '';
  });
}

function cleanTitle(value = '') {
  return decodeHtmlEntities(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArabicText(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/\r/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getArabicTextQuality(value = '') {
  const text = normalizeArabicText(value);
  const arabicCharacters = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCharacters = (text.match(/[A-Za-z]/g) || []).length;
  const letterCharacters = arabicCharacters + latinCharacters;
  return {
    text_length: text.length,
    arabic_characters: arabicCharacters,
    latin_characters: latinCharacters,
    arabic_ratio: letterCharacters ? arabicCharacters / letterCharacters : 0,
  };
}

function hasSearchableArabicText(value = '') {
  const quality = getArabicTextQuality(value);
  return quality.arabic_characters >= 80 && quality.arabic_ratio >= 0.35;
}

function fileTitleFromUrl(url) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' ');
    return cleanTitle(name) || 'مستند قانوني';
  } catch {
    return 'مستند قانوني';
  }
}

function parseMojLawsHtml(html, sourcePage = DEFAULT_SOURCE_PAGE) {
  const anchors = /<a\b[^>]*href\s*=\s*(["'])([^"']+\.pdf(?:\?[^"']*)?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  const byUrl = new Map();
  let match;
  while ((match = anchors.exec(String(html)))) {
    let url;
    try {
      url = new URL(decodeHtmlEntities(match[2]), sourcePage);
    } catch {
      continue;
    }
    if (url.hostname.toLowerCase() !== 'moj.gov.kw') continue;
    if (!/\/ar\/documents\/mojdocs\//i.test(url.pathname) || !/\.pdf$/i.test(url.pathname)) continue;
    url.hash = '';
    const href = url.href;
    const title = cleanTitle(match[3]);
    const previous = byUrl.get(href);
    if (!previous || title.length > previous.title.length) {
      byUrl.set(href, { title: title || fileTitleFromUrl(href), source_url: href });
    }
  }
  return [...byUrl.values()];
}

function parseArabicNumber(value) {
  if (!value) return null;
  const converted = String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const number = Number.parseInt(converted, 10);
  return Number.isFinite(number) ? number : null;
}

function extractIdentity(title = '') {
  const compact = cleanTitle(title);
  const yearMatch = compact.match(/(?:لسنة|لسنه|سنة)\s*([0-9٠-٩]{4})/);
  const numberMatch = compact.match(/(?:رقم|قانون|مرسوم بقانون|قرار(?: وزاري)?|تعميم(?: إداري)?)\s*(?:رقم\s*)?([0-9٠-٩]{1,5})(?=\s*(?:لسنة|لسنه|سنة))/);
  let documentType = 'مستند تشريعي';
  if (/^(?:دستور|الدستور)(?:\s|$)/.test(compact)) documentType = 'دستور';
  else if (/مرسوم\s+بقانون/.test(compact)) documentType = 'مرسوم بقانون';
  else if (/مرسوم/.test(compact)) documentType = 'مرسوم';
  else if (/قرار\s+وزاري/.test(compact)) documentType = 'قرار وزاري';
  else if (/قرار/.test(compact)) documentType = 'قرار';
  else if (/تعميم/.test(compact)) documentType = 'تعميم';
  else if (/لائحة/.test(compact)) documentType = 'لائحة';
  else if (/قانون/.test(compact)) documentType = 'قانون';
  return {
    document_type: documentType,
    law_number: parseArabicNumber(numberMatch?.[1]),
    law_year: parseArabicNumber(yearMatch?.[1]),
  };
}

const CATEGORY_RULES = [
  ['مكافحة غسل الأموال والإرهاب', /غسل الأموال|غسل الاموال|تمويل الإرهاب|تمويل الارهاب|مكافحة الإرهاب|مكافحة الارهاب|أسلحة الدمار|اسلحة الدمار|مجلس الأمن|مجلس الامن/],
  ['أحوال شخصية', /الأحوال الشخصية|الاحوال الشخصية|الجعفرية|الزواج|الطلاق|الحضانة|المواريث/],
  ['جزائي', /الجزاء|الجريمة|المخدرات|المؤثرات العقلية|الاتجار بالأشخاص|تهريب المهاجرين|الفساد|المحكوم عليهم|المجرمين/],
  ['مرافعات وتنفيذ', /المرافعات|الإعلان الإلكتروني|الدعاوي قليلة القيمة|التنفيذ|الإثبات/],
  ['عقاري وتوثيق', /العقار|العقارية|التسجيل العقاري|التوثيق|الوكالات العقارية/],
  ['مالي ومصرفي', /الإفلاس|الائتمانية|التأمين|المصرفي|الأوراق المالية|أسواق المال|الذمة المالية/],
  ['دستوري وقضائي', /الدستور|المحكمة الدستورية|القضاء|الفتوى والتشريع/],
  ['عمالي', /قانون العمل|العمل في القطاع|العمالة|الخدمة المدنية|التأمينات الاجتماعية/],
  ['إعلام وتقنية', /المطبوعات|النشر|الإعلام|الاتصالات|تقنية المعلومات|المعلومات الإلكترونية/],
  ['دولي واتفاقيات', /اتفاقية|بروتوكول|العهد الدولي|الأمم المتحدة|دول مجلس التعاون|التعاون بين|وثائق ختامية/],
  ['مدني وتجاري', /القانون المدني|التجارة|التجارية|البحرية|الشركات|الوكالة التجارية/],
  ['إداري', /الجهاز الإداري|الهيئة العامة|إنشاء هيئة|وزارة|حوكمة|المساعدات العامة/],
];

function classifyLegalDocument(title = '', text = '') {
  const titleCategory = CATEGORY_RULES.find(([, matcher]) => matcher.test(cleanTitle(title)))?.[0];
  if (titleCategory) return titleCategory;
  const sample = String(text).slice(0, 12000);
  return CATEGORY_RULES.find(([, matcher]) => matcher.test(sample))?.[0] || 'تشريعات عامة';
}

const KEYWORD_RULES = [
  'الدستور', 'المرافعات', 'القانون المدني', 'التجارة', 'الشركات', 'الإفلاس',
  'الجزاء', 'الأحوال الشخصية', 'العمل', 'العمالة المنزلية', 'التوثيق',
  'التسجيل العقاري', 'غسل الأموال', 'تمويل الإرهاب', 'مكافحة الفساد',
  'أسواق المال', 'التأمين', 'الاتجار بالأشخاص', 'المخدرات', 'الإعلام',
  'الإعلان الإلكتروني', 'التنفيذ', 'الإثبات', 'المحكمة الدستورية',
];

function extractKeywords(title = '', text = '', category = '') {
  const sample = `${title} ${String(text).slice(0, 50000)}`;
  const keywords = KEYWORD_RULES.filter(keyword => sample.includes(keyword));
  if (category && !keywords.includes(category)) keywords.unshift(category);
  return [...new Set(keywords)].slice(0, 12);
}

function analyseLegalDocument(document, text = '', pageCount = null) {
  const normalized = normalizeArabicText(text);
  const identity = extractIdentity(document.title);
  const category = classifyLegalDocument(document.title, normalized);
  const articleMatches = normalized.match(/(?:^|\n)\s*المادة\s*(?:\(|رقم\s*)?[0-9٠-٩]+/gm) || [];
  const amendment = /تعديل|بتعديل|إلغاء|بإلغاء|يُلغى|يلغى/.test(`${document.title} ${normalized.slice(0, 10000)}`);
  const pieces = [
    `${identity.document_type}${identity.law_number ? ` رقم ${identity.law_number}` : ''}${identity.law_year ? ` لسنة ${identity.law_year}` : ''}.`,
    `التصنيف الموضوعي: ${category}.`,
  ];
  if (pageCount) pieces.push(`عدد صفحات الملف: ${pageCount}.`);
  if (articleMatches.length) pieces.push(`تم التعرف آليًا على ${articleMatches.length} مادة مرقمة.`);
  if (amendment) pieces.push('يتضمن العنوان أو النص مؤشرات إلى تعديل أو إلغاء تشريعي، ويجب ربطه بالنص الأصلي قبل الاعتماد.');
  if (!normalized) pieces.push('لم يُستخرج نص قابل للبحث بعد؛ يحتفظ السجل بالرابط الرسمي وحالة المعالجة.');
  return {
    ...identity,
    category,
    keywords: extractKeywords(document.title, normalized, category),
    summary: pieces.join(' '),
    article_count: articleMatches.length,
    has_amendment_signal: amendment,
    text_length: normalized.length,
  };
}

function chunkLegalText(input, maxChars = 6000, overlap = 500) {
  const text = normalizeArabicText(input);
  if (!text) return [];
  const starts = [];
  const articlePattern = /(?:^|\n)(\s*المادة\s*(?:\(|رقم\s*)?[0-9٠-٩]+[^\n]*)/gm;
  let match;
  while ((match = articlePattern.exec(text))) starts.push({ index: match.index + (match[0].startsWith('\n') ? 1 : 0), reference: cleanTitle(match[1]) });

  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + maxChars, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end);
      if (boundary > cursor + Math.floor(maxChars * 0.65)) end = boundary;
    }
    const reference = [...starts].reverse().find(item => item.index <= cursor)?.reference || null;
    chunks.push({
      chunk_index: chunks.length,
      text: text.slice(cursor, end).trim(),
      char_start: cursor,
      char_end: end,
      reference,
    });
    if (end >= text.length) break;
    cursor = Math.max(cursor + 1, end - overlap);
  }
  return chunks.filter(chunk => chunk.text);
}

function ensureLegalSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      source_page TEXT NOT NULL,
      official_source TEXT NOT NULL DEFAULT '${OFFICIAL_SOURCE}',
      document_type TEXT NOT NULL DEFAULT 'مستند تشريعي',
      law_number INTEGER,
      law_year INTEGER,
      category TEXT NOT NULL DEFAULT 'تشريعات عامة',
      summary TEXT NOT NULL DEFAULT '',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      raw_text TEXT NOT NULL DEFAULT '',
      checksum_sha256 TEXT,
      page_count INTEGER,
      article_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      fetched_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS legal_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      reference TEXT,
      text TEXT NOT NULL,
      char_start INTEGER NOT NULL,
      char_end INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, chunk_index),
      FOREIGN KEY (document_id) REFERENCES legal_documents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS legal_ingestion_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_page TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      documents_found INTEGER NOT NULL DEFAULT 0,
      documents_ready INTEGER NOT NULL DEFAULT 0,
      documents_failed INTEGER NOT NULL DEFAULT 0,
      details_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS legal_document_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      source_label TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'official',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES legal_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_legal_documents_year ON legal_documents(law_year);
    CREATE INDEX IF NOT EXISTS idx_legal_documents_category ON legal_documents(category);
    CREATE INDEX IF NOT EXISTS idx_legal_documents_status ON legal_documents(status);
    CREATE INDEX IF NOT EXISTS idx_legal_chunks_document ON legal_chunks(document_id, chunk_index);
    CREATE INDEX IF NOT EXISTS idx_legal_document_sources_document ON legal_document_sources(document_id);
  `);
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS legal_chunks_fts USING fts5(
      title, body, document_id UNINDEXED, chunk_index UNINDEXED, reference UNINDEXED,
      tokenize='unicode61 remove_diacritics 2'
    )`);
  } catch (error) {
    console.warn('SQLite FTS5 is unavailable; legal search will use LIKE:', error.message);
  }
}

function attachLegalDocumentSource(db, documentId, document) {
  const sourceLabel = document.source_label || document.official_source || OFFICIAL_SOURCE;
  const sourceType = document.source_type || (sourceLabel === OFFICIAL_SOURCE ? 'official_moj' : 'uploaded');
  db.prepare(`INSERT INTO legal_document_sources (document_id,source_url,source_label,source_type)
    VALUES (?,?,?,?)
    ON CONFLICT(source_url) DO UPDATE SET
      document_id=excluded.document_id,
      source_label=excluded.source_label,
      source_type=excluded.source_type,
      updated_at=CURRENT_TIMESTAMP`).run(documentId, document.source_url, sourceLabel, sourceType);
}

function upsertManifest(db, documents, sourcePage = DEFAULT_SOURCE_PAGE) {
  const select = db.prepare('SELECT id FROM legal_documents WHERE source_url = ?');
  const insert = db.prepare(`INSERT INTO legal_documents
    (title,source_url,source_page,official_source,document_type,law_number,law_year,category,summary,keywords_json,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const update = db.prepare(`UPDATE legal_documents SET title=?,source_page=?,official_source=?,document_type=?,law_number=?,law_year=?,category=?,summary=?,keywords_json=?,updated_at=CURRENT_TIMESTAMP WHERE source_url=?`);
  const output = [];
  db.exec('BEGIN');
  try {
    for (const document of documents) {
      const analysis = analyseLegalDocument(document, '');
      const sourceLabel = document.official_source || document.source_label || OFFICIAL_SOURCE;
      const values = [document.title, sourcePage, sourceLabel, analysis.document_type, analysis.law_number, analysis.law_year, analysis.category, analysis.summary, JSON.stringify(analysis.keywords)];
      const existing = select.get(document.source_url);
      if (existing) {
        update.run(...values, document.source_url);
        attachLegalDocumentSource(db, existing.id, document);
        output.push({ ...document, id: existing.id });
      } else {
        const result = insert.run(document.title, document.source_url, sourcePage, sourceLabel, analysis.document_type, analysis.law_number, analysis.law_year, analysis.category, analysis.summary, JSON.stringify(analysis.keywords), 'pending');
        const id = Number(result.lastInsertRowid);
        attachLegalDocumentSource(db, id, document);
        output.push({ ...document, id });
      }
    }
    db.exec('COMMIT');
    return output;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function hasFts(db) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='legal_chunks_fts'").get());
}

function saveLegalDocumentText(db, id, { text, checksum, pageCount }) {
  const document = db.prepare('SELECT * FROM legal_documents WHERE id=?').get(id);
  if (!document) throw new Error(`Legal document ${id} not found`);
  const normalized = normalizeArabicText(text);
  const analysis = analyseLegalDocument(document, normalized, pageCount);
  const chunks = chunkLegalText(normalized);
  const update = db.prepare(`UPDATE legal_documents SET raw_text=?,checksum_sha256=?,page_count=?,article_count=?,document_type=?,law_number=?,law_year=?,category=?,summary=?,keywords_json=?,status=?,error_message=NULL,fetched_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`);
  const insertChunk = db.prepare('INSERT INTO legal_chunks (document_id,chunk_index,reference,text,char_start,char_end) VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM legal_chunks WHERE document_id=?').run(id);
    if (hasFts(db)) db.prepare('DELETE FROM legal_chunks_fts WHERE document_id=?').run(id);
    update.run(normalized, checksum, pageCount, analysis.article_count, analysis.document_type, analysis.law_number, analysis.law_year, analysis.category, analysis.summary, JSON.stringify(analysis.keywords), normalized ? 'ready' : 'text_unavailable', id);
    for (const chunk of chunks) {
      insertChunk.run(id, chunk.chunk_index, chunk.reference, chunk.text, chunk.char_start, chunk.char_end);
      if (hasFts(db)) db.prepare('INSERT INTO legal_chunks_fts (title,body,document_id,chunk_index,reference) VALUES (?,?,?,?,?)').run(document.title, chunk.text, id, chunk.chunk_index, chunk.reference);
    }
    db.exec('COMMIT');
    return { ...analysis, chunks: chunks.length };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function markLegalDocumentError(db, id, error) {
  db.prepare("UPDATE legal_documents SET status='error',error_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(String(error?.message || error).slice(0, 1000), id);
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function serializeDocument(row, includeText = false) {
  if (!row) return null;
  const output = { ...row, keywords: safeJson(row.keywords_json, []) };
  delete output.keywords_json;
  if (!includeText) delete output.raw_text;
  return output;
}

function makeFtsQuery(query) {
  return normalizeArabicText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => token.length >= 2)
    .slice(0, 10)
    .map(token => `"${token.replace(/"/g, '')}"*`)
    .join(' OR ');
}

function searchLegalDocuments(db, options = {}) {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
  const offset = (page - 1) * limit;
  const query = normalizeArabicText(options.query || '');
  const where = [];
  const values = [];
  if (options.category) { where.push('d.category=?'); values.push(options.category); }
  if (options.year) { where.push('d.law_year=?'); values.push(Number(options.year)); }
  if (options.documentType) { where.push('d.document_type=?'); values.push(options.documentType); }
  if (options.status) { where.push('d.status=?'); values.push(options.status); }

  if (query && hasFts(db)) {
    const fts = makeFtsQuery(query);
    if (fts) {
      const filters = where.length ? `AND ${where.join(' AND ')}` : '';
      const matched = db.prepare(`SELECT d.*, snippet(legal_chunks_fts,1,'<mark>','</mark>',' … ',24) AS excerpt, bm25(legal_chunks_fts) AS rank
        FROM legal_chunks_fts JOIN legal_documents d ON d.id=legal_chunks_fts.document_id
        WHERE legal_chunks_fts MATCH ? ${filters}
        ORDER BY rank, d.law_year DESC LIMIT ?`).all(fts, ...values, Math.min(500, (page * limit) * 6));
      const unique = [...new Map(matched.map(row => [row.id, row])).values()];
      const rows = unique.slice(offset, offset + limit);
      return { items: rows.map(row => serializeDocument(row)), page, limit, total: rows.length, search_mode: 'fts5' };
    }
  }

  if (query) {
    where.push('(d.title LIKE ? OR d.summary LIKE ? OR d.raw_text LIKE ?)');
    const like = `%${query}%`;
    values.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM legal_documents d ${clause}`).get(...values).count;
  const rows = db.prepare(`SELECT d.* FROM legal_documents d ${clause} ORDER BY COALESCE(d.law_year,0) DESC,d.id DESC LIMIT ? OFFSET ?`).all(...values, limit, offset);
  return { items: rows.map(row => serializeDocument(row)), page, limit, total, search_mode: query ? 'like' : 'browse' };
}

function getLegalDocument(db, id) {
  const document = db.prepare('SELECT * FROM legal_documents WHERE id=?').get(id);
  if (!document) return null;
  const chunks = db.prepare('SELECT chunk_index,reference,text,char_start,char_end FROM legal_chunks WHERE document_id=? ORDER BY chunk_index').all(id);
  const sources = db.prepare('SELECT source_url,source_label,source_type FROM legal_document_sources WHERE document_id=? ORDER BY id').all(id);
  return { ...serializeDocument(document, true), chunks, sources };
}

function getLegalStats(db) {
  const totals = db.prepare(`SELECT COUNT(*) total,
    SUM(status='ready') ready,SUM(status='pending') pending,SUM(status='text_unavailable') text_unavailable,SUM(status='error') errors,
    SUM(LENGTH(raw_text)) text_characters,SUM(article_count) articles FROM legal_documents`).get();
  const categories = db.prepare('SELECT category,COUNT(*) count FROM legal_documents GROUP BY category ORDER BY count DESC').all();
  const sources = db.prepare('SELECT COUNT(*) count FROM legal_document_sources').get().count;
  const latestRun = db.prepare('SELECT * FROM legal_ingestion_runs ORDER BY id DESC LIMIT 1').get() || null;
  return { ...totals, categories, sources, latest_run: latestRun };
}

function findRelevantLegalContext(db, query, limit = 8) {
  const normalized = normalizeArabicText(query);
  if (!normalized) return [];
  if (hasFts(db)) {
    const fts = makeFtsQuery(normalized);
    if (fts) return db.prepare(`SELECT d.title,d.source_url,d.law_number,d.law_year,c.reference,
      snippet(legal_chunks_fts,1,'','',' … ',45) excerpt,bm25(legal_chunks_fts) rank
      FROM legal_chunks_fts JOIN legal_documents d ON d.id=legal_chunks_fts.document_id
      JOIN legal_chunks c ON c.document_id=d.id AND c.chunk_index=legal_chunks_fts.chunk_index
      WHERE legal_chunks_fts MATCH ? ORDER BY rank LIMIT ?`).all(fts, limit);
  }
  const terms = normalized.split(/\s+/).filter(term => term.length >= 3).slice(0, 4);
  if (!terms.length) return [];
  const where = terms.map(() => 'c.text LIKE ?').join(' OR ');
  return db.prepare(`SELECT d.title,d.source_url,d.law_number,d.law_year,c.reference,substr(c.text,1,1000) excerpt
    FROM legal_chunks c JOIN legal_documents d ON d.id=c.document_id WHERE ${where} LIMIT ?`).all(...terms.map(term => `%${term}%`), limit);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  DEFAULT_SOURCE_PAGE,
  OFFICIAL_SOURCE,
  analyseLegalDocument,
  chunkLegalText,
  classifyLegalDocument,
  attachLegalDocumentSource,
  ensureLegalSchema,
  extractIdentity,
  findRelevantLegalContext,
  getLegalDocument,
  getLegalStats,
  getArabicTextQuality,
  hasSearchableArabicText,
  markLegalDocumentError,
  normalizeArabicText,
  parseMojLawsHtml,
  saveLegalDocumentText,
  searchLegalDocuments,
  sha256,
  upsertManifest,
};
