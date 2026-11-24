import { appErrorResponse, requireAppUser } from "@/lib/app-auth";
import {
  ArchiveError,
  markSubmissionFailed,
  saveMediaSubmission,
  saveTranscription,
  getOwnedDocument,
  saveDeviceDocumentText,
} from "@/lib/archive-store";
import type { UserRecord } from "@/db/schema";
import { DIRECT_MEDIA_UPLOAD_BYTES, mediaSourceMode } from "@/lib/media-files";
import { transcribeMedia, transcriptionErrorResponse } from "@/lib/media-transcription";
import {extractStoryDocument,documentTextErrorResponse} from '@/lib/document-text';
import { MAX_STORY_CHARACTERS } from '@/lib/story-limits';
import { z } from 'zod';

export const runtime = "edge";

// The platform rejects requests around 1 MiB before this route runs, so keep
// the server-side validation aligned with the client-side safe ceiling.
const MAX_AUDIO_BYTES = DIRECT_MEDIA_UPLOAD_BYTES;

export async function POST(request: Request) {
  let activeUser: UserRecord | null = null;
  let activeSubmissionId: string | undefined;
  let documentInput = false;
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
    documentInput = sourceMode === 'document' || sourceMode === 'image';

    const saved = await saveMediaSubmission(activeUser, {
      file: audio,
      sourceMode,
      durationSeconds: Number.isFinite(durationValue) ? Math.max(0, Math.round(durationValue)) : 0,
    });
    activeSubmissionId = saved.submissionId;

    if (documentInput && formData.get('read_on_device') === 'true') {
      return Response.json({ submission_id: activeSubmissionId, original_saved: true, needs_local_read: true }, { status: 202 });
    }

    // Document extraction is read-only. The next /api/poetry request checks the
    // complete extracted text before any creative analysis or poem generation.
    const text = documentInput ? await extractStoryDocument(audio) : await transcribeMedia(audio);
    if (!text) {
      return Response.json({ code: "NO_SPEECH_DETECTED", error: "لم يظهر كلام واضح في التسجيل. جرّب في مكان أهدأ." }, { status: 422 });
    }

    await saveTranscription(activeUser.id, activeSubmissionId, text);
    return Response.json({ text, submission_id: activeSubmissionId, original_saved:true });
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
    const response = documentInput ? documentTextErrorResponse(error) : transcriptionErrorResponse(error);
    const data = await response.json() as Record<string,unknown>;
    return Response.json({...data, ...(activeSubmissionId ? {submission_id:activeSubmissionId,original_saved:true} : {})}, {status:response.status});
  }
}

const documentId = z.string().uuid();
export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const id = documentId.safeParse(new URL(request.url).searchParams.get('submission_id'));
    if (!id.success) return Response.json({ error: 'معرف الملف غير صالح.' }, { status: 400 });
    const row = await getOwnedDocument(user.id, id.data);
    return Response.json({ submission_id: row.id, filename: row.audioFilename, content_type: row.audioContentType, text: row.storyText }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) { return appErrorResponse(error); }
}

// Device OCR is editable user input, never trusted instructions or a safety
// verdict. /api/poetry still screens the full text before creating any output.
export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const data = z.object({ submission_id: documentId, text: z.string().trim().min(1).max(MAX_STORY_CHARACTERS) }).safeParse(await request.json());
    if (!data.success) return Response.json({ error: 'النص غير صالح أو يتجاوز ٣٠ ألف حرف.' }, { status: 400 });
    await saveDeviceDocumentText(user.id, data.data.submission_id, data.data.text);
    return Response.json({ submission_id: data.data.submission_id, text: data.data.text, original_saved: true });
  } catch (error) { return appErrorResponse(error); }
}
