import { appErrorResponse, requireAppUser } from "@/lib/app-auth";
import {
  ArchiveError,
  markSubmissionFailed,
  saveMediaSubmission,
  saveTranscription,
} from "@/lib/archive-store";
import type { UserRecord } from "@/db/schema";
import { DIRECT_MEDIA_UPLOAD_BYTES, mediaSourceMode } from "@/lib/media-files";
import { transcribeMedia, transcriptionErrorResponse } from "@/lib/media-transcription";

export const runtime = "edge";

// The platform rejects requests around 1 MiB before this route runs, so keep
// the server-side validation aligned with the client-side safe ceiling.
const MAX_AUDIO_BYTES = DIRECT_MEDIA_UPLOAD_BYTES;

export async function POST(request: Request) {
  let activeUser: UserRecord | null = null;
  let activeSubmissionId: string | undefined;
  try {
    activeUser = await requireAppUser();
    const formData = await request.formData();
    const audio = formData.get("media") || formData.get("audio");
    const durationValue = Number(formData.get("duration_seconds") || 0);

    if (!(audio instanceof File)) {
      return Response.json({ error: "لم يصل ملف صوتي أو مرئي صالح." }, { status: 400 });
    }
    if (audio.size === 0) {
      return Response.json({ error: "الملف فارغ. اختر ملفًا يحتوي على صوت واضح." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json(
        { error: "الملف كبير للرفع دفعة واحدة. استخدم زر رفع الملفات ليُرسل على أجزاء." },
        { status: 413 },
      );
    }

    const sourceMode = mediaSourceMode(audio.name, audio.type);
    if (!sourceMode) {
      return Response.json(
        { error: "صيغة الملف غير مدعومة. اختر صوتًا أو فيديو بصيغة شائعة." },
        { status: 415 },
      );
    }

    const saved = await saveMediaSubmission(activeUser, {
      file: audio,
      sourceMode,
      durationSeconds: Number.isFinite(durationValue) ? Math.max(0, Math.round(durationValue)) : 0,
    });
    activeSubmissionId = saved.submissionId;

    const text = await transcribeMedia(audio);
    if (!text) {
      return Response.json({ code: "NO_SPEECH_DETECTED", error: "لم يظهر كلام واضح في التسجيل. جرّب في مكان أهدأ." }, { status: 422 });
    }

    await saveTranscription(activeUser.id, activeSubmissionId, text);
    return Response.json({ text, submission_id: activeSubmissionId });
  } catch (error) {
    if (activeUser && activeSubmissionId) {
      await markSubmissionFailed(activeUser.id, activeSubmissionId).catch(() => undefined);
    }
    if (
      error instanceof ArchiveError ||
      (error instanceof Error &&
        (error.message.includes("D1 binding") ||
          error.message.includes("R2 binding") ||
          error.message.includes("no such table")))
    ) {
      return appErrorResponse(error);
    }
    return transcriptionErrorResponse(error);
  }
}
