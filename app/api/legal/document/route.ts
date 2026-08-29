import { getD1 } from "../../../../db";
import {
  cleanArabicLegalText,
  isUsableIndexedLegalText,
  legalTextFingerprint,
} from "../../../../lib/legal-text";
import { privateJson } from "../../../../lib/request-security";
import { requireTenantContext, TenantAccessError } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

const CHUNKS_PER_PAGE = 8;

type DocumentRow = {
  id: number;
  title: string;
  category: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  summary: string;
  official_source: string;
  source_url: string;
  source_page: string;
  page_count: number | null;
  article_count: number;
  status: string;
  source_type: string;
};

type ChunkRow = {
  id: number;
  chunk_index: number;
  reference: string | null;
  text: string;
};

function positiveInteger(value: string | null, fallback = 1): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    await requireTenantContext(request);
    const url = new URL(request.url);
    const documentId = positiveInteger(url.searchParams.get("id"), 0);
    if (!documentId) {
      return privateJson({ error: "معرّف الوثيقة غير صالح." }, { status: 400 });
    }

    const page = Math.min(200, positiveInteger(url.searchParams.get("page")));
    const db = getD1();
    const document = await db
      .prepare(
        `SELECT d.id,d.title,d.category,d.document_type,d.law_number,d.law_year,
                d.summary,d.official_source,d.source_url,d.source_page,d.page_count,
                d.article_count,d.status,
                COALESCE(
                  (SELECT CASE WHEN SUM(CASE WHEN s.source_type='official_moj' THEN 1 ELSE 0 END)>0
                    THEN 'official_moj' WHEN COUNT(*)>0 THEN 'user_library' ELSE 'unknown' END
                   FROM legal_document_sources s WHERE s.document_id=d.id),
                  'unknown'
                ) AS source_type
         FROM legal_documents d
         WHERE d.id=?
         LIMIT 1`,
      )
      .bind(documentId)
      .first<DocumentRow>();

    if (!document) {
      return privateJson(
        { error: "لم نعثر على الوثيقة القانونية المطلوبة." },
        { status: 404 },
      );
    }

    const indexedChunks = await db
      .prepare(
        `SELECT id,chunk_index,reference,text
         FROM legal_chunks
         WHERE document_id=?
         ORDER BY chunk_index ASC, id ASC`,
      )
      .bind(documentId)
      .all<ChunkRow>();

    // Never turn an OCR clean-up into a legal-text correction. Validate each
    // original passage before it is cleaned or displayed, then exclude it when
    // it contains mixed-script or repeated-header corruption.
    const seenPassages = new Set<string>();
    const readableChunks = (indexedChunks.results ?? []).flatMap((chunk) => {
      if (!isUsableIndexedLegalText(chunk.text)) return [];
      const text = cleanArabicLegalText(chunk.text);
      const fingerprint = legalTextFingerprint(text);
      if (!fingerprint || seenPassages.has(fingerprint)) return [];
      seenPassages.add(fingerprint);
      return [{ ...chunk, text }];
    });
    const totalChunks = readableChunks.length;
    const rejectedChunks = (indexedChunks.results ?? []).length - totalChunks;
    const pageOffset = (page - 1) * CHUNKS_PER_PAGE;
    const pageChunks = readableChunks.slice(pageOffset, pageOffset + CHUNKS_PER_PAGE);

    return privateJson({
      document: {
        ...document,
        title: cleanArabicLegalText(document.title),
        summary: cleanArabicLegalText(document.summary),
      },
      chunks: pageChunks.map((chunk, index) => ({
        ...chunk,
        // Number passages in the readable source, not by their original OCR
        // offset, because rejected headers do not represent legal content.
        chunk_index: pageOffset + index,
      })),
      page,
      pageSize: CHUNKS_PER_PAGE,
      totalChunks,
      rejectedChunks,
      needsReindex: document.status !== "ready" || rejectedChunks > 0,
      hasMore: page * CHUNKS_PER_PAGE < totalChunks,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    console.error(
      "Legal source load failed",
      error instanceof Error ? error.message : error,
    );
    return privateJson(
      { error: "تعذّر فتح المصدر حالياً. حاول مرة أخرى بعد قليل." },
      { status: 500 },
    );
  }
}
