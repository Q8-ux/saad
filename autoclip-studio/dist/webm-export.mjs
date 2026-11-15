import {fixWebmDuration} from './vendor/webm-duration.mjs';

const EBML = 0x1a45dfa3;
const SEGMENT = 0x18538067;
const SEEK_HEAD = 0x114d9b74;
const INFO = 0x1549a966;
const TIMESTAMP_SCALE = 0x2ad7b1;
const CLUSTER = 0x1f43b675;

function elementAt(bytes, start) {
  const idWidth = Math.clz32(bytes[start]) - 23;
  const sizeOffset = start + idWidth;
  const sizeWidth = Math.clz32(bytes[sizeOffset]) - 23;
  const content = sizeOffset + sizeWidth;
  if (idWidth > 4 || sizeWidth > 8 || content > bytes.length) return null;

  let id = 0;
  for (let offset = start; offset < sizeOffset; offset += 1) id = id * 256 + bytes[offset];
  const mask = 0xff >> sizeWidth;
  let size = bytes[sizeOffset] & mask;
  let unknown = size === mask;
  for (let offset = sizeOffset + 1; offset < content; offset += 1) {
    size = size * 256 + bytes[offset];
    unknown = unknown && bytes[offset] === 0xff;
  }
  return {id, content, end: unknown ? Infinity : content + size, unknown};
}

function canPatchInfo(bytes, info) {
  // The duration helper uses the 1 ms TimestampScale used by Chrome MediaRecorder.
  for (let offset = info.content; offset < info.end;) {
    const child = elementAt(bytes, offset);
    if (!child || child.unknown || child.end > info.end) return false;
    if (child.id === TIMESTAMP_SCALE) {
      let scale = 0;
      for (let index = child.content; index < child.end; index += 1) scale = scale * 256 + bytes[index];
      return scale === 1_000_000;
    }
    offset = child.end;
  }
  return false;
}

function liveMetadataEnd(bytes) {
  const header = elementAt(bytes, 0);
  if (header?.id !== EBML || header.end >= bytes.length) return null;
  const segment = elementAt(bytes, header.end);
  if (segment?.id !== SEGMENT || !segment.unknown) return null;

  let patchableInfo = false;
  for (let offset = segment.content; offset < bytes.length;) {
    const child = elementAt(bytes, offset);
    if (child?.id === CLUSTER) return patchableInfo ? offset : null;
    if (!child || child.id === SEEK_HEAD || child.end > bytes.length) return null;
    if (child.id === INFO) patchableInfo = canPatchInfo(bytes, child);
    offset = child.end;
  }
  return null;
}

export async function packRecordedWebm(blob, durationMs) {
  const header = new Uint8Array(await blob.slice(0, 64 * 1024).arrayBuffer());
  const metadataEnd = liveMetadataEnd(header);
  if (metadataEnd === null) return blob;

  // Editing only metadata leaves the unknown-size Cluster boundaries intact.
  const metadata = blob.slice(0, metadataEnd, blob.type);
  const fixed = await fixWebmDuration(metadata, durationMs, {logger: false});
  if (fixed === metadata) return blob;
  return new Blob([fixed, blob.slice(metadataEnd)], {type: blob.type});
}
