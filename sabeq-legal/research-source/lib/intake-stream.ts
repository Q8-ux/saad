// Parse SSE incrementally, including UTF-8 characters split between network chunks.
export async function* readSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (data && data !== "[DONE]") yield JSON.parse(data);
      }
      if (done) break;
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function partialAssistantMessage(json: string): string {
  const match = /"assistantMessage"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(json);
  if (!match) return "";
  const safe = match[1].replace(/\\(?:u[0-9a-fA-F]{0,3})?$/, "");
  try { return JSON.parse(`"${safe}"`); } catch { return ""; }
}
