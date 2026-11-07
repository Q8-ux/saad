import OpenAI from "openai";
import { assertSafePoetryContent, contentSafetyErrorResponse } from "@/lib/content-safety";
import { getRuntimeStringBinding } from "@/lib/runtime-bindings";

export function getTranscriptionClient() {
  const apiKey = getRuntimeStringBinding("OPENAI_API_KEY");
  if (!apiKey) throw new Error("MISSING_API_KEY");
  return new OpenAI({ apiKey, timeout: 60000, maxRetries: 0 });
}

export async function transcribeMedia(file: File, options?: { enforcePoetrySafety?: boolean }) {
  const client = getTranscriptionClient();
  const model = getRuntimeStringBinding("OPENAI_TRANSCRIBE_MODEL") || "gpt-transcribe";
  const transcription = await client.audio.transcriptions.create({
    file,
    model,
    ...(model === "gpt-transcribe" ? { languages: ["ar"] } : { language: "ar" }),
    response_format: "json",
    prompt:
      "هذا تسجيل باللهجة الكويتية أو الخليجية لحدث شخصي سيُحوّل لاحقًا إلى شعر نبطي. حافظ على أسماء الأشخاص والأماكن إن وردت، واكتب الكلام بالعربية بوضوح من غير تحويل اللهجة إلى فصحى متكلفة.",
  });
  const text = transcription.text?.trim() || "";
  if (!text) return "";
  if (options?.enforcePoetrySafety !== false) {
    await assertSafePoetryContent(client, [text], "transcript");
  }
  return text;
}

export function transcriptionErrorResponse(error: unknown) {
  const safetyResponse = contentSafetyErrorResponse(error);
  if (safetyResponse) return safetyResponse;
  if (error instanceof Error && error.message === "MISSING_API_KEY") {
    return Response.json({ error: "خدمة استخراج الكلام غير متصلة حاليًا." }, { status: 503 });
  }
  if (error instanceof OpenAI.APIError) {
    const safeToken = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : "unknown";
    console.error("transcription_request_failed", { status: error.status, code: safeToken(error.code), param: safeToken(error.param) });
    if (["language", "languages", "model", "prompt", "response_format"].includes(error.param || "") || error.status === 403 || error.status === 404) {
      return Response.json({ code: "TRANSCRIPTION_CONFIGURATION", error: "تعذّر تشغيل خدمة استخراج الكلام. تم تسجيل خلل الإعداد لدى الإدارة؛ تسجيلك ليس بصيغة خاطئة." }, { status: 503 });
    }
    if (error.status === 429) {
      return Response.json(
        { error: "خدمة استخراج الكلام مشغولة الآن أو أن رصيدها يحتاج تفعيلًا. جرّب بعد قليل." },
        { status: 429 },
      );
    }
    if (error.status === 401) {
      return Response.json(
        { error: "تعذّر الاتصال بخدمة استخراج الكلام. إعداد المفتاح يحتاج مراجعة." },
        { status: 503 },
      );
    }
    if (error.status === 400 || error.status === 415) {
      return Response.json(
        { error: "صيغة الملف أو ترميزه غير مدعوم. جرّب MP3 أو M4A أو WAV أو MP4 أو WebM." },
        { status: 415 },
      );
    }
  }
  return Response.json(
    { error: "تعذّر استخراج الكلام من الملف. تأكد من وجود صوت واضح ثم أعد المحاولة." },
    { status: 500 },
  );
}
