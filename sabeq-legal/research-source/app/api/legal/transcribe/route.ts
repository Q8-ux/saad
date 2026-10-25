import { openAIErrorResponse, transcribeArabicLegalAudio } from "@/lib/openai";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, corsPreflight, enforceRateLimit, errorResponse, privateJson, RequestError } from "@/lib/request-security";
import { MAX_AUDIO_BYTES, validAudioContainer } from "@/lib/legal-voice";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  try {
    const started = performance.now();
    assertSameOrigin(request);
    const user = await requireMemoUserOrGuest(request);
    const announcedLength = Number(request.headers.get("content-length") || 0);
    if (announcedLength > MAX_AUDIO_BYTES + 200_000) throw new RequestError("حجم التسجيل أكبر من الحد المسموح.", 413);
    await enforceRateLimit(request, "legal-transcribe", user ? 60 : 30, "hour");

    if (!request.headers.get("content-type")?.includes("multipart/form-data")) throw new RequestError("صيغة التسجيل الصوتي غير مدعومة.", 415);
    // Bound the streamed request as well as Content-Length before multipart parsing.
    const reader = request.body?.getReader();
    if (!reader) throw new RequestError("لم يصل تسجيل صوتي صالح.");
    const parts: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_AUDIO_BYTES + 200_000) { await reader.cancel(); throw new RequestError("حجم التسجيل أكبر من الحد المسموح.", 413); }
      parts.push(value);
    }
    const form = await new Response(new Blob(parts as BlobPart[]), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const scope = form.get("scope");
    if (scope !== null && scope !== "memo" && scope !== "assistant") throw new RequestError("مسار التسجيل غير صالح.");
    await requireServiceEnabled(scope === "assistant" ? "assistant" : "memo", request);

    const audio = form.get("audio");
    if (!(audio instanceof File) || !audio.size) throw new RequestError("لم يصل تسجيل صوتي صالح.");
    if (audio.size > MAX_AUDIO_BYTES) throw new RequestError("حجم التسجيل أكبر من الحد المسموح.", 413);
    if (!(await validAudioContainer(audio))) {
      throw new RequestError("صيغة التسجيل الصوتي غير مدعومة.", 415);
    }

    const language = cleanLanguage(form.get("language"));
    const modelStarted = performance.now();
    const text = await transcribeArabicLegalAudio(audio, language, request.signal);
    const result = privateJson({ text, speechRevision: "connected-voice-1", timing: { transcriptionMs: Math.round(performance.now() - modelStarted), totalMs: Math.round(performance.now() - started) } });
    result.headers.set("Server-Timing", `transcription;dur=${Math.round(performance.now() - modelStarted)}`);
    return result;
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر تحويل التسجيل إلى نص. يرجى المحاولة مجدداً.");
    if (openAIError) return privateJson({ error: openAIError.message }, openAIError.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر تحويل التسجيل إلى نص. يرجى المحاولة مجدداً." }, 503);
  }
}
