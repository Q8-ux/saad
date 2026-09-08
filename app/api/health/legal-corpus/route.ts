import { getD1 } from "../../../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getD1();
    const documents = await db
      .prepare("SELECT COUNT(*) AS count FROM legal_documents WHERE status='ready'")
      .first<{ count: number }>();
    const chunks = await db
      .prepare("SELECT COUNT(*) AS count FROM legal_chunks")
      .first<{ count: number }>();
    const official = await db
      .prepare("SELECT COUNT(DISTINCT document_id) AS count FROM legal_document_sources WHERE source_type='official_moj'")
      .first<{ count: number }>();

    const documentCount = Number(documents?.count ?? 0);
    const chunkCount = Number(chunks?.count ?? 0);
    const officialDocumentCount = Number(official?.count ?? 0);

    return Response.json(
      {
        ok: documentCount >= 80 && chunkCount >= 700,
        documentCount,
        chunkCount,
        officialDocumentCount,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "Legal corpus health check failed",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { ok: false, documentCount: 0, chunkCount: 0, officialDocumentCount: 0 },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
