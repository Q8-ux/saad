#!/usr/bin/env node
'use strict';

const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  attachLegalDocumentSource,
  ensureLegalSchema,
  hasSearchableArabicText,
  saveLegalDocumentText,
  upsertManifest,
} = require('../legal-library');

const targetPath = path.resolve(process.argv[2] || process.env.TARGET_LEGAL_DB || 'data/legal-memo.db');
const sourcePath = path.resolve(process.argv[3] || process.env.SOURCE_LEGAL_DB || 'local-legal-data/legal-memo.db');

function log(message, extra) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  process.stdout.write(`[legal-merge] ${new Date().toISOString()} ${message}${suffix}\n`);
}

function sourceMappings(db, document) {
  const mappings = db.prepare(`SELECT source_url,source_label,source_type
    FROM legal_document_sources WHERE document_id=? ORDER BY id`).all(document.id);
  if (mappings.length) return mappings;
  return [{
    source_url: document.source_url,
    source_label: document.official_source || 'ملف قوانين المرفوع',
    source_type: 'user_library',
  }];
}

function findTargetDocument(db, document, mappings) {
  const bySource = db.prepare(`SELECT d.* FROM legal_document_sources s
    JOIN legal_documents d ON d.id=s.document_id WHERE s.source_url=?`).get(mappings[0]?.source_url);
  if (bySource) return bySource;
  if (document.law_number && document.law_year) {
    const byIdentity = db.prepare(`SELECT * FROM legal_documents
      WHERE law_number=? AND law_year=? AND document_type=?
      ORDER BY CASE WHEN official_source='وزارة العدل الكويتية' THEN 0 ELSE 1 END,id LIMIT 1`)
      .get(document.law_number, document.law_year, document.document_type);
    if (byIdentity) return byIdentity;
  }
  return db.prepare('SELECT * FROM legal_documents WHERE title=? ORDER BY id LIMIT 1').get(document.title);
}

function createTargetDocument(db, document, mappings) {
  const primary = mappings[0];
  const [created] = upsertManifest(db, [{
    title: document.title,
    source_url: primary.source_url,
    source_label: primary.source_label,
    source_type: primary.source_type,
    official_source: document.official_source,
  }], document.source_page || 'ملف قوانين المرفوع');
  return db.prepare('SELECT * FROM legal_documents WHERE id=?').get(created.id);
}

function main() {
  const target = new DatabaseSync(targetPath);
  const source = new DatabaseSync(sourcePath);
  target.exec('PRAGMA journal_mode = WAL');
  target.exec('PRAGMA foreign_keys = ON');
  source.exec('PRAGMA query_only = ON');
  ensureLegalSchema(target);

  const counters = { source_ready: 0, copied_text: 0, kept_target_text: 0, new_documents: 0, skipped_unusable: 0, sources_attached: 0 };
  try {
    const documents = source.prepare('SELECT * FROM legal_documents ORDER BY id').all();
    for (const document of documents) {
      if (!hasSearchableArabicText(document.raw_text)) {
        counters.skipped_unusable += 1;
        continue;
      }
      counters.source_ready += 1;
      const mappings = sourceMappings(source, document);
      let targetDocument = findTargetDocument(target, document, mappings);
      if (!targetDocument) {
        targetDocument = createTargetDocument(target, document, mappings);
        counters.new_documents += 1;
      }
      for (const mapping of mappings) {
        attachLegalDocumentSource(target, targetDocument.id, mapping);
        counters.sources_attached += 1;
      }
      if (!hasSearchableArabicText(targetDocument.raw_text)) {
        saveLegalDocumentText(target, targetDocument.id, {
          text: document.raw_text,
          checksum: document.checksum_sha256,
          pageCount: document.page_count,
        });
        counters.copied_text += 1;
      } else {
        counters.kept_target_text += 1;
      }
    }
    const totals = target.prepare(`SELECT COUNT(*) AS documents,
      SUM(status='ready') AS ready, SUM(LENGTH(raw_text)) AS characters,
      (SELECT COUNT(*) FROM legal_chunks) AS chunks,
      (SELECT COUNT(*) FROM legal_document_sources) AS sources
      FROM legal_documents`).get();
    log('Merged searchable uploaded-law data', { ...counters, totals });
  } finally {
    source.close();
    target.close();
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`[legal-merge] fatal: ${error.stack || error.message}\n`);
  process.exitCode = 1;
}
