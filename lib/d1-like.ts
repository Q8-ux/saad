const D1_MAX_LIKE_PATTERN_BYTES = 50;
const utf8Encoder = new TextEncoder();

/**
 * Cloudflare D1 limits each LIKE/GLOB pattern to 50 UTF-8 bytes.
 * Return null when a value cannot be searched safely as one pattern so the
 * caller can fall back to token matching instead of failing the whole query.
 */
export function toD1LikePattern(value: string): string | null {
  const escaped = value.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;
  return utf8Encoder.encode(pattern).byteLength <= D1_MAX_LIKE_PATTERN_BYTES
    ? pattern
    : null;
}

