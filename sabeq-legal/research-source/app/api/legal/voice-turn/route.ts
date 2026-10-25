import { readSSE } from "@/lib/intake-stream";
import { POST as transcribe } from "../transcribe/route";
import { POST as analyse } from "../assistant/route";
import { POST as speak } from "../speech/route";
import { assertSameOrigin, corsPreflight, errorResponse, privateJson, RequestError } from "@/lib/request-security";
import { requireServiceEnabled } from "@/lib/service-settings";

export const OPTIONS = corsPreflight;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireServiceEnabled("assistant", request);
    const started = performance.now();
    // Transcription owns the bounded multipart read, user/service gates, format and rate checks.
    const copy = request.clone();
    const transcriptResponse = await transcribe(request);
    if (!transcriptResponse.ok) { void copy.body?.cancel().catch(() => {}); return transcriptResponse; }
    const transcript = await transcriptResponse.json() as { text: string; timing?: unknown };
    const form = await copy.formData();
    const context = form.get("context");
    if (typeof context !== "string" || context.length > 80_000) throw new RequestError("سياق المحادثة غير صالح أو أكبر من الحد المسموح.");
    let data: Record<string, unknown>;
    try { data = JSON.parse(context); } catch { throw new RequestError("سياق المحادثة غير صالح."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new RequestError("سياق المحادثة غير صالح.");
    const cancellation = new AbortController();
    const signal = AbortSignal.any([request.signal, cancellation.signal]);
    const internal = (path: string, body: unknown) => {
      const headers = new Headers(request.headers); headers.delete("content-length"); headers.set("Content-Type", "application/json");
      return new Request(new URL(path, request.url), { method: "POST", headers, body: JSON.stringify(body), signal });
    };
    let cancelled = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: unknown) => { if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); };
        try {
          send({ type: "transcript", text: transcript.text, timing: transcript.timing });
          signal.throwIfAborted();
          const response = await analyse(internal("/api/legal/assistant", { message: transcript.text, messages: data.messages, currentState: data.currentState, language: form.get("language"), voiceTurn: true, stream: true }));
          let analysis: { state?: { assistantMessage: string }; error?: string; timing?: unknown } = {};
          if (response.ok && response.headers.get("Content-Type")?.includes("text/event-stream") && response.body) {
            let complete = false;
            for await (const event of readSSE(response.body)) {
              signal.throwIfAborted();
              if (event.type === "error") throw new Error(event.error || "تعذر تحليل القضية.");
              if (event.type === "text" || event.type === "stage") send(event);
              if (event.type === "done") { analysis = event; complete = true; }
            }
            if (!complete) throw new Error("انقطع تحليل القضية قبل اكتماله.");
          } else analysis = await response.json();
          if (!response.ok || !analysis.state) throw new Error(analysis.error || "تعذر إكمال تحليل القضية.");
          signal.throwIfAborted();
          // Only the server-reviewed reply can enter TTS; no client-supplied answer is accepted.
          send({ type: "analysis", result: analysis });
          const audio = await speak(internal("/api/legal/speech", { text: analysis.state.assistantMessage, language: form.get("language"), voice: form.get("voice") || "coral", stream: true }));
          if (!audio.ok) { const error = await audio.json() as { error?: string }; throw new Error(error.error || "تعذر إنشاء الصوت. الرد المكتوب متاح."); }
          if (!audio.body) throw new Error("لم يصل الصوت. الرد المكتوب متاح.");
          const format = audio.headers.get("Content-Type")?.includes("audio/pcm") ? "pcm16le" : "mp3";
          send({ type: "audio_start", format, sampleRate: 24_000, channels: 1 });
          const reader = audio.body.getReader(); let bytesSent = 0, firstAudioMs: number | null = null;
          try {
            while (true) {
              signal.throwIfAborted();
              const { value, done } = await reader.read(); if (done) break;
              bytesSent += value.length;
              if (bytesSent > 8 * 1024 * 1024) throw new Error("تجاوز الرد الصوتي الحجم المسموح.");
              for (let offset = 0; offset < value.length; offset += 24_000) {
                let binary = ""; for (const byte of value.subarray(offset, offset + 24_000)) binary += String.fromCharCode(byte);
                if (firstAudioMs === null) firstAudioMs = Math.round(performance.now() - started);
                send({ type: "audio", data: btoa(binary), format });
              }
            }
          } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
          if (!bytesSent) throw new Error("لم يصل الصوت. الرد المكتوب متاح.");
          send({ type: "done", speechRevision: "streamed-voice-3", timing: { totalMs: Math.round(performance.now() - started), firstAudioMs, speech: audio.headers.get("Server-Timing") } });
        } catch (error) {
          if (!signal.aborted) send({ type: "error", error: error instanceof Error ? error.message : "تعذر إكمال المحادثة الصوتية." });
        } finally { if (!cancelled) controller.close(); }
      },
      cancel() { cancelled = true; cancellation.abort(); },
    });
    const headers = new Headers(privateJson({}).headers);
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "private, no-store, no-transform");
    headers.set("X-Accel-Buffering", "no");
    headers.set("X-Speech-Revision", "streamed-voice-3");
    return new Response(body, { headers });
  } catch (error) {
    return error instanceof RequestError ? errorResponse(error) : privateJson({ error: "تعذر بدء المحادثة الصوتية." }, 503);
  }
}
