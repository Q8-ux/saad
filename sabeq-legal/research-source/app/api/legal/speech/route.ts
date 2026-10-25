import { generateLegalSpeech, streamLegalSpeech, openAIErrorResponse } from "@/lib/openai";
import { DEFAULT_LEGAL_VOICE, resolveLegalVoice, isLegalVoice } from "@/lib/legal-voice";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanLanguage, cleanMultiline, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  try {
    const started = performance.now();
    assertSameOrigin(request);
    const user = await requireMemoUserOrGuest(request);
    await requireServiceEnabled("assistant", request);
    await enforceRateLimit(request, "legal-speech", user ? 60 : 30, "hour");
    const data = await readJsonObject(request, 12_000);
    const text = cleanMultiline(data.text, "نص القراءة", { min: 2, max: 2_500 });
    const language = cleanLanguage(data.language);
    const requestedVoice = data.voice ?? DEFAULT_LEGAL_VOICE;
    const voice = resolveLegalVoice(language, requestedVoice);
    if (language !== "ar" && !isLegalVoice(requestedVoice)) throw new RequestError("الصوت المختار غير مدعوم.");
    const streaming = data.stream === true;
    const audio = await (streaming ? streamLegalSpeech : generateLegalSpeech)(text, language, voice, request.signal);
    return new Response(audio, {
      headers: {
        "Access-Control-Allow-Origin": "https://q8-ux.github.io",
        "Access-Control-Expose-Headers": "Server-Timing, X-Speech-Revision",
        "Vary": "Origin",
        "X-Speech-Revision": language === "ar" ? "gulf-male-voice-4" : streaming ? "streamed-voice-3" : "connected-voice-1",
        "X-Audio-Format": streaming ? "pcm16le;rate=24000;channels=1" : "mp3",
        "X-Accel-Buffering": "no",
        "Server-Timing": `speech;dur=${Math.round(performance.now() - started)}`,
        "Content-Type": streaming ? "audio/pcm" : "audio/mpeg",
        "Cache-Control": "private, no-store, no-transform",
        "Content-Disposition": streaming ? "inline; filename=legal-assistant.pcm" : "inline; filename=legal-assistant.mp3",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const openAIError = openAIErrorResponse(error, "تعذر إنشاء القراءة الصوتية حالياً.");
    if (openAIError) return privateJson({ error: openAIError.message }, openAIError.status);
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر إنشاء القراءة الصوتية حالياً." }, 503);
  }
}
