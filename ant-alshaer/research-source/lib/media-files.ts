export const DIRECT_MEDIA_UPLOAD_BYTES = 800 * 1024;
export const MAX_MEDIA_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENT_FILE_BYTES = 8 * 1024 * 1024;
export const MEDIA_UPLOAD_CHUNK_BYTES = 600 * 1024;
export const MAX_MEDIA_CHUNKS = Math.ceil(MAX_MEDIA_FILE_BYTES / MEDIA_UPLOAD_CHUNK_BYTES);

export type MediaSourceMode = "audio" | "video" | "document" | "image";

const AUDIO_EXTENSIONS = new Set(["flac", "mp3", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mpeg", "webm"]);

const extensionOf = (filename: string) => filename.toLowerCase().split(".").pop() || "";

export function mediaSourceMode(filename: string, contentType: string): MediaSourceMode | null {
  const extension = extensionOf(filename);
  if (["pdf", "docx", "txt", "md"].includes(extension)) return "document";
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return "image";
  if (contentType.toLowerCase().startsWith("video/")) {
    return VIDEO_EXTENSIONS.has(extension) ? "video" : null;
  }
  if (contentType.toLowerCase().startsWith("audio/")) {
    return AUDIO_EXTENSIONS.has(extension) ? "audio" : null;
  }
  if (VIDEO_EXTENSIONS.has(extension) && extension !== "mpeg" && extension !== "webm") return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  return null;
}

export function safeMediaFilename(filename: string, mode: MediaSourceMode) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_") || (mode === "video" ? "story.mp4" : "story.webm");
}

export function mediaChunkKey(userId: string, uploadId: string, chunkIndex: number) {
  return `temp/media/${userId}/${uploadId}/${String(chunkIndex).padStart(3, "0")}`;
}

export const isValidUploadId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
