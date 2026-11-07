import { appErrorResponse, requireAppUser } from "@/lib/app-auth";
import { getBucket } from "@/db";
import { ArchiveError, markSubmissionFailed, saveMediaSubmission, saveTranscription } from "@/lib/archive-store";
import {
  MAX_MEDIA_CHUNKS,
  MAX_MEDIA_FILE_BYTES,
  isValidUploadId,
  mediaChunkKey,
  mediaSourceMode,
  safeMediaFilename,
} from "@/lib/media-files";
import { transcribeMedia, transcriptionErrorResponse } from "@/lib/media-transcription";
import type { UserRecord } from "@/db/schema";

export const runtime = "edge";

type ProcessBody = {
  upload_id?: string;
  filename?: string;
  content_type?: string;
  total_chunks?: number;
  total_size?: number;
};

export async function POST(request: Request) {
  let activeUser: UserRecord | null = null;
  let activeSubmissionId: string | undefined;
  let cleanupKeys: string[] = [];
  try {
    activeUser = await requireAppUser();
    const body = (await request.json()) as ProcessBody;
    const uploadId = String(body.upload_id || "");
    const filename = String(body.filename || "").slice(0, 180);
    const contentType = String(body.content_type || "").slice(0, 100);
    const totalChunks = Number(body.total_chunks || 0);
    const totalSize = Number(body.total_size || 0);
    const sourceMode = mediaSourceMode(filename, contentType);

    if (
      !isValidUploadId(uploadId) ||
      !sourceMode ||
      !Number.isInteger(totalChunks) ||
      totalChunks < 1 ||
      totalChunks > MAX_MEDIA_CHUNKS ||
      !Number.isInteger(totalSize) ||
      totalSize < 1 ||
      totalSize > MAX_MEDIA_FILE_BYTES
    ) {
      return Response.json({ error: "بيانات الملف غير صالحة أو أن صيغته غير مدعومة." }, { status: 400 });
    }

    cleanupKeys = Array.from(
      { length: totalChunks },
      (_, index) => mediaChunkKey(activeUser!.id, uploadId, index),
    );
    const objects = await Promise.all(cleanupKeys.map((key) => getBucket().get(key)));
    if (objects.some((object) => !object)) {
      return Response.json({ error: "لم يكتمل رفع الملف. أعد المحاولة من البداية." }, { status: 409 });
    }

    const buffers = await Promise.all(objects.map((object) => object!.arrayBuffer()));
    const receivedSize = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    if (receivedSize !== totalSize) {
      return Response.json({ error: "لم يصل الملف كاملًا. أعد رفعه مرة أخرى." }, { status: 409 });
    }

    const mediaFile = new File(buffers, safeMediaFilename(filename, sourceMode), {
      type: contentType || (sourceMode === "video" ? "video/mp4" : "audio/mpeg"),
    });
    const saved = await saveMediaSubmission(activeUser, { file: mediaFile, sourceMode });
    activeSubmissionId = saved.submissionId;

    const text = await transcribeMedia(mediaFile);
    if (!text) {
      return Response.json({ code: "NO_SPEECH_DETECTED", error: "لم يظهر كلام واضح في الملف. جرّب ملفًا بصوت أوضح." }, { status: 422 });
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
  } finally {
    if (cleanupKeys.length) {
      await getBucket().delete(cleanupKeys).catch(() => undefined);
    }
  }
}
