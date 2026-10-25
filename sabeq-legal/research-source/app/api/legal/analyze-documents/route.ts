import { readDocumentForm, validateDocuments } from "@/lib/document-upload";
import { analyzeLegalDocuments, openAIErrorResponse } from "@/lib/openai";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { recordServiceActivity } from "@/lib/service-records";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, corsPreflight, enforceRateLimit, errorResponse, privateJson, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireMemoUserOrGuest(request);
    await requireServiceEnabled("memo", request);
    await enforceRateLimit(request, "legal-document-analysis", 12, "hour");
    const form = await readDocumentForm(request);
    const { files, totalBytes } = await validateDocuments(form.getAll("documents"));
    const started = performance.now();
    const analysis = await analyzeLegalDocuments(files, form.get("purpose") === "review", request.signal, cleanLanguage(form.get("language")));
    if (user) {
      await recordServiceActivity({ userId: user.id, serviceType: "document_analysis", title: `تحليل ${files.length} مستندات`, outputText: JSON.stringify(analysis), metadata: { documentCount: files.length, totalBytes, filenames: files.map((file) => file.name.slice(0, 180)) } });
    }
    return privateJson({ analysis, documentCount: files.length, totalBytes, timing: { totalMs: Math.round(performance.now() - started) } });
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر تحليل المستندات حالياً. يرجى المحاولة مجدداً.");
    if (openAIError) return privateJson({ error: openAIError.message }, openAIError.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر تحليل المستندات حالياً. يرجى المحاولة مجدداً." }, 503);
  }
}
