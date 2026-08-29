import { buildSearchAnalysis, searchLegalCorpus } from "../../../../lib/legal-search";
import { privateJson } from "../../../../lib/request-security";
import { requireTenantContext, TenantAccessError } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 240;

function boundedText(value: string | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function parseYear(value: string | null): number | null {
  if (!value) return null;
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1800 && year <= 2200 ? year : null;
}

export async function GET(request: Request) {
  try {
    await requireTenantContext(request);
    const url = new URL(request.url);
    const query = boundedText(url.searchParams.get("q"), MAX_QUERY_LENGTH);
    if (query.length < 2) {
      return privateJson(
        { error: "اكتب كلمتين على الأقل للبحث." },
        { status: 400 },
      );
    }

    const rawYear = url.searchParams.get("year");
    const year = parseYear(rawYear);
    if (rawYear && !year) {
      return privateJson({ error: "السنة المحددة غير صحيحة." }, { status: 400 });
    }

    const results = await searchLegalCorpus({
      query,
      category: boundedText(url.searchParams.get("category"), 120) || undefined,
      documentType: boundedText(url.searchParams.get("type"), 120) || undefined,
      year,
      limit: Number(url.searchParams.get("limit") || 24),
    });

    return privateJson(
      {
        results,
        analysis: buildSearchAnalysis(query, results),
      },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    console.error(
      "Legal search failed",
      error instanceof Error ? error.message : error,
    );
    return privateJson(
      { error: "تعذّر إكمال البحث حالياً. حاول مرة أخرى بعد قليل." },
      { status: 500 },
    );
  }
}
