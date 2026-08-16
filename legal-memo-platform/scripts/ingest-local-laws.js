#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const {
  analyseLegalDocument,
  attachLegalDocumentSource,
  ensureLegalSchema,
  hasSearchableArabicText,
  markLegalDocumentError,
  saveLegalDocumentText,
  sha256,
  upsertManifest,
} = require('../legal-library');

const sourceDirectory = path.resolve(process.argv[2] || process.env.LOCAL_LAWS_DIR || 'library-imports/قوانين');
const dataDir = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
const dbPath = path.join(dataDir, 'legal-memo.db');
const force = process.argv.includes('--force');
const requestedOcr = process.env.LOCAL_LAWS_OCR_ENABLED === 'true';
const localTesseractLanguages = spawnSync('tesseract', ['--list-langs'], { encoding: 'utf8' }).stdout || '';
if (!requestedOcr && !/(?:^|\n)ara(?:\n|$)/.test(localTesseractLanguages)) process.env.MOJ_OCR_ENABLED = 'false';
const { extractPdfText } = require('./ingest-moj-laws');

function log(message, extra) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  process.stdout.write(`[local-laws] ${new Date().toISOString()} ${message}${suffix}\n`);
}

function libraryUrl(relativePath) {
  return `library://laws/${sha256(Buffer.from(relativePath.normalize('NFC')))}`;
}

async function listPdfs(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listPdfs(fullPath));
    else if (entry.isFile() && /\.pdf$/i.test(entry.name)) files.push(fullPath);
  }
  return files.sort((left, right) => left.localeCompare(right, 'ar'));
}

function documentFromFile(filePath) {
  const relativePath = path.relative(sourceDirectory, filePath).split(path.sep).join('/');
  return {
    title: path.basename(filePath, path.extname(filePath)).replace(/[_-]+/g, ' ').trim(),
    source_url: libraryUrl(relativePath),
    source_label: 'ملف قوانين المرفوع',
    source_type: 'user_library',
    official_source: 'ملف قوانين المرفوع',
    file_path: filePath,
    relative_path: relativePath,
  };
}

function findReusableDocument(db, document, checksum) {
  const bySource = db.prepare(`SELECT d.id,d.status,d.checksum_sha256,d.raw_text
    FROM legal_document_sources s JOIN legal_documents d ON d.id=s.document_id WHERE s.source_url=?`).get(document.source_url);
  if (bySource) return bySource;
  const byChecksum = db.prepare('SELECT id,status,checksum_sha256,raw_text FROM legal_documents WHERE checksum_sha256=? ORDER BY id LIMIT 1').get(checksum);
  if (byChecksum) return byChecksum;
  const identity = analyseLegalDocument(document, '');
  if (!identity.law_number || !identity.law_year) return null;
  return db.prepare(`SELECT id,status,checksum_sha256,raw_text FROM legal_documents
    WHERE law_number=? AND law_year=? AND document_type=?
    ORDER BY CASE WHEN official_source='وزارة العدل الكويتية' THEN 0 ELSE 1 END,id LIMIT 1`)
    .get(identity.law_number, identity.law_year, identity.document_type);
}

function resolveDocument(db, document, checksum) {
  const reusable = findReusableDocument(db, document, checksum);
  if (reusable) {
    attachLegalDocumentSource(db, reusable.id, document);
    return reusable;
  }
  const [created] = upsertManifest(db, [document], 'ملف قوانين المرفوع');
  return db.prepare('SELECT id,status,checksum_sha256,raw_text FROM legal_documents WHERE id=?').get(created.id);
}

async function processDocument(db, document, position, total) {
  let bytes;
  try {
    bytes = await fsp.readFile(document.file_path);
  } catch (error) {
    log('Unable to read uploaded PDF', { position, total, title: document.title, error: error.message });
    return 'failed';
  }
  const checksum = sha256(bytes);
  const current = resolveDocument(db, document, checksum);
  if (!force && current.status === 'ready' && current.checksum_sha256 === checksum && hasSearchableArabicText(current.raw_text)) {
    log('Skipping previously indexed uploaded PDF', { position, total, id: current.id, title: document.title });
    return 'skipped';
  }
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `local-law-${current.id}-`));
  const pdfPath = path.join(workDir, 'document.pdf');
  try {
    await fsp.writeFile(pdfPath, bytes, { mode: 0o600 });
    log('Extracting uploaded PDF', { position, total, id: current.id, title: document.title });
    const extracted = await extractPdfText(pdfPath, workDir);
    const analysis = saveLegalDocumentText(db, current.id, { ...extracted, checksum });
    const qualityOk = hasSearchableArabicText(extracted.text);
    if (!qualityOk) {
      db.prepare("UPDATE legal_documents SET status='needs_ocr',error_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .run('يتطلب الملف OCR عربيًا قبل اعتباره نصًا موثوقًا للبحث.', current.id);
    }
    log('Indexed uploaded legal document', {
      position, total, id: current.id, pages: extracted.pageCount, characters: analysis.text_length,
      chunks: analysis.chunks, status: qualityOk ? 'ready' : 'needs_ocr'
    });
    return qualityOk ? 'ready' : 'needs_ocr';
  } catch (error) {
    markLegalDocumentError(db, current.id, error);
    log('Uploaded document failed', { position, total, id: current.id, error: error.message });
    return 'failed';
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const files = await listPdfs(sourceDirectory);
  if (!files.length) throw new Error(`No PDF files found in ${sourceDirectory}`);
  await fsp.mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  ensureLegalSchema(db);
  const run = db.prepare('INSERT INTO legal_ingestion_runs (source_page,status,documents_found) VALUES (?,?,?)')
    .run('ملف قوانين المرفوع', 'running', files.length);
  const runId = Number(run.lastInsertRowid);
  const counters = { found: files.length, ready: 0, skipped: 0, needs_ocr: 0, failed: 0 };
  try {
    for (let index = 0; index < files.length; index += 1) {
      const status = await processDocument(db, documentFromFile(files[index]), index + 1, files.length);
      counters[status] = (counters[status] || 0) + 1;
      db.prepare('UPDATE legal_ingestion_runs SET documents_ready=?,documents_failed=?,details_json=? WHERE id=?')
        .run(counters.ready, counters.failed, JSON.stringify(counters), runId);
    }
    db.prepare("UPDATE legal_ingestion_runs SET status='completed',documents_ready=?,documents_failed=?,details_json=?,completed_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(counters.ready, counters.failed, JSON.stringify(counters), runId);
    log('Local legal-library ingestion completed', counters);
  } catch (error) {
    db.prepare("UPDATE legal_ingestion_runs SET status='failed',details_json=?,completed_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(JSON.stringify({ ...counters, fatal_error: error.message }), runId);
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`[local-laws] fatal: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { documentFromFile, findReusableDocument, listPdfs };
