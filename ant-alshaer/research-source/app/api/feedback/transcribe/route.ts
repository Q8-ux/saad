import { appErrorResponse, requireAppUser } from "@/lib/app-auth";
import { ArchiveError } from "@/lib/archive-store";
import { DIRECT_MEDIA_UPLOAD_BYTES, mediaSourceMode } from "@/lib/media-files";
import { transcribeMedia, transcriptionErrorResponse } from "@/lib/media-transcription";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    await requireAppUser();
    const formData = await request.formData();
    const media = formData.get("media");
    if (!(media instanceof File) || media.size === 0) {
      return Response.json({ error: "لم تصل ملاحظة صوتية صالحة." }, { status: 400 });
    }
    if (media.size > DIRECT_MEDIA_UPLOAD_BYTES) {
      return Response.json({ error: "الملاحظة الصوتية طويلة. سجّل ملاحظة أقصر." }, { status: 413 });
    }
    if (mediaSourceMode(media.name, media.type) !== "audio") {
      return Response.json({ error: "صيغة الملاحظة الصوتية غير مدعومة." }, { status: 415 });
    }

    const text = await transcribeMedia(media);
    if (!text) {
      return Response.json({ code: "NO_SPEECH_DETECTED", error: "لم يظهر كلام واضح. اقترب من الميكروفون وأعد التسجيل." }, { status: 422 });
    }
    return Response.json({ text });
  } catch (error) {
    if (error instanceof ArchiveError) return appErrorResponse(error);
    return transcriptionErrorResponse(error);
  }
}
