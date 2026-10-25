import { searchLegalDocuments } from "@/lib/legal-search";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    await requireMemoUserOrGuest(request);
    await requireServiceEnabled("library", request);
    await enforceRateLimit(request, "legal-search", 90, "hour");
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (query.length < 2 || query.length > 180) throw new RequestError("عبارة البحث غير صحيحة.");
    const results = await searchLegalDocuments(query, 12);
    return privateJson({
      results: results.map((item) => ({
        title: item.title,
        category: item.category,
        lawNumber: item.lawNumber,
        lawYear: item.lawYear,
        summary: item.summary,
        sourceUrl: item.sourceUrl,
        officialSource: item.officialSource,
        hasVerifiedText: item.hasVerifiedText,
        corpus: item.corpus,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
