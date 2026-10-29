import { analyzeMemoDictation } from "@/lib/openai";
import { dictationFields } from "@/lib/memo-dictation";
import { prepareMemoDraft, preparationContext } from "@/lib/memo-preparation";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";
export const OPTIONS = corsPreflight;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireMemoUserOrGuest(request); await requireServiceEnabled("memo", request);
    await enforceRateLimit(request, "prepare-memo", 30);
    const raw = await readJsonObject(request, 200000), context = preparationContext(raw);
    if (context.length < 20) throw new RequestError("أضف وصف القضية أو مرفقاً لبدء إعداد المسودة.", 422);
    let extracted: Record<string, string> = {};
    const needsExtraction = ["facts", "requests", "clientName", "otherParty", "court", "partyRole", "caseType"].some(key => !String(raw[key] || "").trim());
    if (needsExtraction) {
      try { extracted = dictationFields(await analyzeMemoDictation(context, request.signal, cleanLanguage(raw.interfaceLanguage))); }
      catch (error) {
        if (request.signal.aborted) throw error;
        // Preserve available facts and continue with marked, reviewable blanks.
        console.warn("Memo preparation extraction unavailable", { kind: error instanceof Error ? error.name : "unknown" });
      }
    }
    const prepared = prepareMemoDraft(raw, extracted);
    if (String(prepared.input.facts || "").trim().length < 20) throw new RequestError("تعذرت قراءة الوقائع من المدخلات الحالية. بقيت بياناتك محفوظة لإعادة المحاولة.", 422);
    return privateJson(prepared);
  } catch (error) { return errorResponse(error); }
}
