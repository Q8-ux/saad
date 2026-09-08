export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { getD1 } = await import("./db");
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

    console.info(
      `[LEGAL_CORPUS_READY] ${Number(documents?.count ?? 0)} documents / ${Number(chunks?.count ?? 0)} chunks / ${Number(official?.count ?? 0)} official`,
    );
  } catch (error) {
    console.error(
      "[LEGAL_CORPUS_STARTUP_FAILED]",
      error instanceof Error ? error.message : error,
    );
  }
}
