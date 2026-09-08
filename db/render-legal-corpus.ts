import "server-only";

import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const CORPUS_MARKER = "ministry-legal-library-artifact-9264576540-v1";
const DOCUMENT_ID_OFFSET = 100000;
const CHUNK_ID_OFFSET = 1000000;
const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const NON_WORD = /[^a-z0-9\u0621-\u063a\u0641-\u064a]+/gi;

type Prepared = {
  run: (...params: unknown[]) => { changes?: number };
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
};

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Prepared;
  transaction: (fn: () => void) => () => void;
};

type LegacyDocument = {
  id: number;
  title: string;
  source_url: string;
  source_page: string;
  official_source: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  category: string;
  summary: string;
  keywords_json: string;
  page_count: number | null;
  article_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type LegacyChunk = {
  id: number;
  document_id: number;
  chunk_index: number;
  reference: string | null;
  text: string;
  char_start: number;
  char_end: number;
  created_at: string;
};

function normalizeArabic(value: string): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(ARABIC_DIACRITICS, "")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function restoreRenderLegalCorpus(
  target: SqliteDatabase,
  dataDir: string,
): void {
  const seedPath = path.resolve(process.cwd(), "seed", "legal-library.sqlite.gz");
  if (!fs.existsSync(seedPath)) return;

  target.exec(`
    CREATE TABLE IF NOT EXISTS __render_corpus_seeds (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      document_count INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0
    );
  `);

  const applied = target
    .prepare("SELECT name FROM __render_corpus_seeds WHERE name=? LIMIT 1")
    .get(CORPUS_MARKER);
  if (applied) return;

  const sourcePath = path.join(dataDir, "verified-ministry-legal-library.sqlite");
  const compressed = fs.readFileSync(seedPath);
  fs.writeFileSync(sourcePath, zlib.gunzipSync(compressed));

  const source = new Database(sourcePath, {
    readonly: true,
    fileMustExist: true,
  }) as unknown as SqliteDatabase;

  try {
    const documents = source
      .prepare(
        "SELECT id,title,source_url,source_page,official_source,document_type,law_number,law_year,category,summary,keywords_json,page_count,article_count,status,created_at,updated_at FROM legal_documents WHERE status='ready' ORDER BY id",
      )
      .all() as unknown as LegacyDocument[];
    const chunks = source
      .prepare(
        "SELECT id,document_id,chunk_index,reference,text,char_start,char_end,created_at FROM legal_chunks ORDER BY id",
      )
      .all() as unknown as LegacyChunk[];

    if (!documents.length || !chunks.length) {
      throw new Error("Verified Ministry legal corpus is empty.");
    }

    const deleteByUrl = target.prepare(
      "DELETE FROM legal_documents WHERE source_url=?",
    );
    const insertDocument = target.prepare(`
      INSERT INTO legal_documents (
        id,title,source_url,source_page,official_source,document_type,
        law_number,law_year,category,summary,keywords_json,search_text,
        page_count,article_count,status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const insertSource = target.prepare(`
      INSERT INTO legal_document_sources (
        document_id,source_url,source_label,source_type,created_at
      ) VALUES (?,?,?,?,CURRENT_TIMESTAMP)
    `);
    const insertChunk = target.prepare(`
      INSERT INTO legal_chunks (
        id,document_id,chunk_index,reference,text,search_terms,
        char_start,char_end,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?)
    `);

    const importCorpus = target.transaction(() => {
      for (const document of documents) {
        deleteByUrl.run(document.source_url);
      }

      for (const document of documents) {
        const documentId = DOCUMENT_ID_OFFSET + Number(document.id);
        const searchText = normalizeArabic(
          `${document.title} ${document.summary} ${document.keywords_json}`,
        );
        insertDocument.run(
          documentId,
          document.title,
          document.source_url,
          document.source_page,
          document.official_source || "وزارة العدل الكويتية",
          document.document_type,
          document.law_number,
          document.law_year,
          document.category,
          document.summary || "",
          document.keywords_json || "[]",
          searchText,
          document.page_count,
          numberValue(document.article_count),
          "ready",
          document.created_at || new Date().toISOString(),
          document.updated_at || new Date().toISOString(),
        );
        insertSource.run(
          documentId,
          document.source_url,
          document.official_source || "وزارة العدل الكويتية",
          "official_moj",
        );
      }

      for (const chunk of chunks) {
        insertChunk.run(
          CHUNK_ID_OFFSET + Number(chunk.id),
          DOCUMENT_ID_OFFSET + Number(chunk.document_id),
          Number(chunk.chunk_index),
          chunk.reference,
          chunk.text,
          normalizeArabic(chunk.text),
          Number(chunk.char_start),
          Number(chunk.char_end),
          chunk.created_at || new Date().toISOString(),
        );
      }

      target
        .prepare(
          "INSERT INTO __render_corpus_seeds (name,document_count,chunk_count) VALUES (?,?,?)",
        )
        .run(CORPUS_MARKER, documents.length, chunks.length);
    });

    importCorpus();
    console.info(
      `[LEGAL_CORPUS_RESTORED] ${documents.length} documents / ${chunks.length} chunks`,
    );
  } finally {
    (source as unknown as { close?: () => void }).close?.();
  }
}
