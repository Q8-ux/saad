import { getD1 } from "../../../../db";
import { cleanArabicLegalText } from "../../../../lib/legal-text";
import { privateJson } from "../../../../lib/request-security";
import { requireTenantContext, TenantAccessError } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

type CountRow = { count: number };
type CategoryRow = { category: string; count: number };
type TypeRow = { document_type: string; count: number };
type IndexedAtRow = { indexedAt: string | null };
type RecentDocument = {
  id: number;
  title: string;
  category: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  official_source: string;
  source_url: string;
};

export async function GET(request: Request) {
  try {
    await requireTenantContext(request);
    const db = getD1();
    const [
      documentCount,
      chunkCount,
      officialCount,
      libraryCount,
      categories,
      types,
      recent,
      lastIndexed,
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM legal_documents").first<CountRow>(),
      db.prepare("SELECT COUNT(*) AS count FROM legal_chunks").first<CountRow>(),
      db
        .prepare(
          "SELECT COUNT(DISTINCT document_id) AS count FROM legal_document_sources WHERE source_type = 'official_moj'",
        )
        .first<CountRow>(),
      db
        .prepare(
          "SELECT COUNT(DISTINCT document_id) AS count FROM legal_document_sources WHERE source_type = 'user_library'",
        )
        .first<CountRow>(),
      db
        .prepare(
          "SELECT category, COUNT(*) AS count FROM legal_documents GROUP BY category ORDER BY count DESC, category",
        )
        .all<CategoryRow>(),
      db
        .prepare(
          "SELECT document_type, COUNT(*) AS count FROM legal_documents GROUP BY document_type ORDER BY count DESC, document_type",
        )
        .all<TypeRow>(),
      db
        .prepare(
          "SELECT id,title,category,document_type,law_number,law_year,official_source,source_url FROM legal_documents ORDER BY COALESCE(law_year,0) DESC, id DESC LIMIT 8",
        )
        .all<RecentDocument>(),
      db
        .prepare("SELECT MAX(updated_at) AS indexedAt FROM legal_documents")
        .first<IndexedAtRow>(),
    ]);

    return privateJson({
      documents: documentCount?.count ?? 0,
      chunks: chunkCount?.count ?? 0,
      officialDocuments: officialCount?.count ?? 0,
      libraryDocuments: libraryCount?.count ?? 0,
      categories: categories.results ?? [],
      types: types.results ?? [],
      recent: (recent.results ?? []).map((document) => ({
        ...document,
        title: cleanArabicLegalText(document.title),
      })),
      indexedAt: lastIndexed?.indexedAt ?? "",
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    console.error(
      "Legal stats failed",
      error instanceof Error ? error.message : error,
    );
    return privateJson(
      { error: "تعذّر تحميل الإحصاءات حالياً. حاول مرة أخرى بعد قليل." },
      { status: 500 },
    );
  }
}
