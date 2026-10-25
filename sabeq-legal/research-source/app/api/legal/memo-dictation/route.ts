import { analyzeMemoDictation, openAIErrorResponse } from "@/lib/openai";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, cleanMultiline, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";
export const OPTIONS = corsPreflight;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await requireMemoUserOrGuest(request); await requireServiceEnabled("memo", request);
    await enforceRateLimit(request, "memo-dictation", 30, "hour");
    const raw = await readJsonObject(request, 50000);
    const transcript = cleanMultiline(raw.transcript, "الإملاء", { min: 2, max: 10000 });
    return privateJson({ analysis: await analyzeMemoDictation(transcript, request.signal, cleanLanguage(raw.language)) });
  } catch (error) {
    if (error instanceof RequestError) return errorResponse(error);
    const issue = openAIErrorResponse(error, "تعذر فهم الإملاء. يمكنك تصحيح النص وإعادة المحاولة.");
    return privateJson({ error: issue?.message || "تعذر فهم الإملاء. يمكنك تصحيح النص وإعادة المحاولة." }, issue?.status || 503);
  }
}
