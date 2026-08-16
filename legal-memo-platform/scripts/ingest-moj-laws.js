#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const {
  DEFAULT_SOURCE_PAGE,
  ensureLegalSchema,
  markLegalDocumentError,
  parseMojLawsHtml,
  saveLegalDocumentText,
  sha256,
  upsertManifest,
} = require('../legal-library');

const sourcePage = process.env.MOJ_LAWS_URL || DEFAULT_SOURCE_PAGE;
const dataDir = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
const dbPath = path.join(dataDir, 'legal-memo.db');
const seedManifestPath = path.join(__dirname, '..', 'seed', 'moj-laws-manifest.json');
const force = process.argv.includes('--force');
const metadataOnly = process.argv.includes('--metadata-only');
const noOcr = process.argv.includes('--no-ocr') || process.env.MOJ_OCR_ENABLED === 'false';
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1])) : Infinity;
const requestDelayMs = Math.max(0, Number(process.env.MOJ_REQUEST_DELAY_MS || 800));
const maximumBytes = Math.max(1, Number(process.env.MOJ_MAX_PDF_MB || 250)) * 1024 * 1024;

function log(message, extra) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  process.stdout.write(`[moj-ingest] ${new Date().toISOString()} ${message}${suffix}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.MOJ_REQUEST_TIMEOUT_MS || 120000));
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'Sabeq-Legal-Library/1.0 (+official-document-indexing)',
          'accept-language': 'ar-KW,ar;q=0.9,en;q=0.7',
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1500);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function downloadPdf(url) {
  const response = await fetchWithRetry(url, { headers: { accept: 'application/pdf,*/*;q=0.8' } });
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maximumBytes) throw new Error(`PDF exceeds ${Math.round(maximumBytes / 1024 / 1024)} MB`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maximumBytes) throw new Error(`PDF exceeds ${Math.round(maximumBytes / 1024 / 1024)} MB`);
  if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Official URL did not return a PDF file');
  return bytes;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      const output = Buffer.concat(stdout).toString('utf8');
      const errors = Buffer.concat(stderr).toString('utf8');
      if (code === 0) resolve({ stdout: output, stderr: errors });
      else reject(new Error(`${command} exited ${code}: ${errors.slice(0, 600)}`));
    });
  });
}

async function getPageCount(pdfPath) {
  try {
    const result = await run('pdfinfo', [pdfPath]);
    const match = result.stdout.match(/^Pages:\s+(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

async function pdftotext(pdfPath, textPath) {
  try {
    await run('pdftotext', ['-enc', 'UTF-8', '-layout', pdfPath, textPath]);
    return await fsp.readFile(textPath, 'utf8');
  } catch (error) {
    log('pdftotext failed; OCR may be used', { error: error.message.slice(0, 180) });
    return '';
  }
}

async function ocrPdf(pdfPath, workDir, pageCount) {
  if (noOcr || !pageCount) return '';
  const maximumPages = Math.max(1, Number(process.env.MOJ_OCR_MAX_PAGES || 1000));
  if (pageCount > maximumPages) {
    log('OCR skipped because document is too long', { pageCount, maximumPages });
    return '';
  }
  const output = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const prefix = path.join(workDir, `page-${String(page).padStart(4, '0')}`);
    const imagePath = `${prefix}.png`;
    await run('pdftoppm', ['-f', String(page), '-l', String(page), '-singlefile', '-r', '160', '-png', pdfPath, prefix]);
    const result = await run('tesseract', [imagePath, 'stdout', '-l', 'ara+eng', '--psm', '6']);
    output.push(result.stdout);
    await fsp.rm(imagePath, { force: true });
    if (page % 25 === 0) log('OCR progress', { page, pageCount });
  }
  return output.join('\n\n');
}

async function extractPdfText(pdfPath, workDir) {
  const pageCount = await getPageCount(pdfPath);
  const textPath = path.join(workDir, 'document.txt');
  let text = await pdftotext(pdfPath, textPath);
  const usefulCharacters = text.replace(/\s/g, '').length;
  const expectedFloor = Math.min(2000, Math.max(300, Number(pageCount || 1) * 80));
  if (usefulCharacters < expectedFloor) {
    const ocrText = await ocrPdf(pdfPath, workDir, pageCount);
    if (ocrText.replace(/\s/g, '').length > usefulCharacters) text = ocrText;
  }
  return { text, pageCount };
}

async function processDocument(db, document, position, total) {
  const current = db.prepare('SELECT id,status,checksum_sha256 FROM legal_documents WHERE id=?').get(document.id);
  if (!force && current?.status === 'ready') {
    log('Skipping previously indexed document', { position, total, id: document.id, title: document.title });
    return 'skipped';
  }
  log('Downloading official PDF', { position, total, id: document.id, title: document.title });
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `moj-law-${document.id}-`));
  const pdfPath = path.join(workDir, 'document.pdf');
  try {
    const bytes = await downloadPdf(document.source_url);
    await fsp.writeFile(pdfPath, bytes, { mode: 0o600 });
    const checksum = sha256(bytes);
    if (!force && current?.checksum_sha256 === checksum && current?.status === 'ready') return 'skipped';
    const extracted = await extractPdfText(pdfPath, workDir);
    const analysis = saveLegalDocumentText(db, document.id, { ...extracted, checksum });
    log('Indexed legal document', { position, total, id: document.id, pages: extracted.pageCount, characters: analysis.text_length, chunks: analysis.chunks, status: analysis.text_length ? 'ready' : 'text_unavailable' });
    return analysis.text_length ? 'ready' : 'text_unavailable';
  } catch (error) {
    markLegalDocumentError(db, document.id, error);
    log('Document failed', { position, total, id: document.id, error: error.message });
    return 'failed';
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  await fsp.mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  ensureLegalSchema(db);
  const runResult = db.prepare('INSERT INTO legal_ingestion_runs (source_page,status) VALUES (?,?)').run(sourcePage, 'running');
  const runId = Number(runResult.lastInsertRowid);
  const counters = { found: 0, ready: 0, skipped: 0, text_unavailable: 0, failed: 0 };
  try {
    let parsed;
    try {
      log('Fetching Ministry of Justice law index', { sourcePage });
      const response = await fetchWithRetry(sourcePage, { headers: { accept: 'text/html,application/xhtml+xml' } });
      const html = await response.text();
      parsed = parseMojLawsHtml(html, sourcePage);
      if (!parsed.length) throw new Error('No official PDF links were found on the Ministry page');
    } catch (error) {
      const seed = JSON.parse(await fsp.readFile(seedManifestPath, 'utf8'));
      parsed = Array.isArray(seed.documents) ? seed.documents : [];
      if (!parsed.length) throw error;
      log('Live index unavailable; using the verified Ministry manifest snapshot', { reason: error.message, found: parsed.length, capturedAt: seed.captured_at });
    }
    const documents = upsertManifest(db, parsed, sourcePage).slice(0, limit);
    counters.found = parsed.length;
    db.prepare('UPDATE legal_ingestion_runs SET documents_found=? WHERE id=?').run(parsed.length, runId);
    log('Official manifest saved', { found: parsed.length, selected: documents.length, metadataOnly });
    if (!metadataOnly) {
      for (let index = 0; index < documents.length; index += 1) {
        const status = await processDocument(db, documents[index], index + 1, documents.length);
        counters[status] = (counters[status] || 0) + 1;
        db.prepare('UPDATE legal_ingestion_runs SET documents_ready=?,documents_failed=?,details_json=? WHERE id=?')
          .run(counters.ready, counters.failed, JSON.stringify(counters), runId);
        if (index + 1 < documents.length) await sleep(requestDelayMs);
      }
    }
    db.prepare("UPDATE legal_ingestion_runs SET status='completed',documents_ready=?,documents_failed=?,details_json=?,completed_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(counters.ready, counters.failed, JSON.stringify(counters), runId);
    log('Ingestion completed', counters);
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
    process.stderr.write(`[moj-ingest] fatal: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { extractPdfText, fetchWithRetry };
