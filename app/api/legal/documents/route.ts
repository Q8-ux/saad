import { getD1 } from "../../../../db";
import { toD1LikePattern } from "../../../../lib/d1-like";
import { cleanArabicLegalText } from "../../../../lib/legal-text";
import { privateJson } from "../../../../lib/request-security";
import { requireTenantContext, TenantAccessError } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

function positivePage(value: string | null): number {
  const page = Number(value || 1);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

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
  source_type: string;
};

export async function GET(request: Request) {
  try {
    await requireTenantContext(request);
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 240);
    const category = (url.searchParams.get("category") ?? "").trim().slice(0, 120);
    const page = positivePage(url.searchParams.get("page"));
    const pageSize = 20;
    const conditions: string[] = [];
    const binds: Array<string | number> = [];

    if (query) {
      const patterns = query
        .split(/\s+/)
        .filter((token) => token.length >= 2)
        .slice(0, 10)
        .map(toD1LikePattern)
        .filter((pattern): pattern is string => pattern !== null);

      if (patterns.length) {
        conditions.push(
          `(${patterns
            .map(
              () =>
                "(d.title LIKE ? ESCAPE '\\' OR d.summary LIKE ? ESCAPE '\\')",
            )
            .join(" OR ")})`,
        );
        for (const pattern of patterns) binds.push(pattern, pattern);
      } else {
        // A non-empty query with no D1-safe token must never fall through to
        // an unfiltered library listing.
        conditions.push("1=0");
      }
    }
    if (category) {
      conditions.push("d.category = ?");
      binds.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const db = getD1();
    const count = await db
      .prepare(`SELECT COUNT(*) AS count FROM legal_documents d ${where}`)
      .bind(...binds)
      .first<{ count: number }>();
    const rows = await db
      .prepare(`
        SELECT d.id,d.title,d.category,d.document_type,d.law_number,d.law_year,
               d.summary,d.official_source,d.source_url,d.source_page,d.page_count,
               d.article_count,
               COALESCE(
                 (SELECT CASE WHEN SUM(CASE WHEN s.source_type='official_moj' THEN 1 ELSE 0 END)>0
                   THEN 'official_moj' WHEN COUNT(*)>0 THEN 'user_library' ELSE 'unknown' END
                  FROM legal_document_sources s WHERE s.document_id=d.id),
                 'unknown'
               ) AS source_type
        FROM legal_documents d
        ${where}
        ORDER BY COALESCE(d.law_year,0) DESC, d.title
        LIMIT ? OFFSET ?
      `)
      .bind(...binds, pageSize, (page - 1) * pageSize)
      .all<DocumentRow>();

    return privateJson({
      documents: (rows.results ?? []).map((document) => ({
        ...document,
        title: cleanArabicLegalText(document.title),
        summary: cleanArabicLegalText(document.summary),
      })),
      total: count?.count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    console.error(
      "Legal documents query failed",
      error instanceof Error ? error.message : error,
    );
    return privateJson(
      { error: "تعذّر تحميل الوثائق حالياً. حاول مرة أخرى بعد قليل." },
      { status: 500 },
    );
  }
}
