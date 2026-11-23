import { PcmPlayer } from "./pcm-player";
import { MAX_AUDIO_BYTES, voiceCopy, type LegalVoice, type VoicePhase } from "./legal-voice";
import { readSSE } from "./intake-stream";
import type { LegalIntakeState } from "./openai";
export type VoiceAnalysisResult = { state: LegalIntakeState };

type Options = {
  language: "ar" | "en" | "ur";
  voice: LegalVoice;
  continuous: boolean;
  request: (path: string, init: RequestInit) => Promise<Response>;
  context: () => { messages: unknown[]; currentState: unknown };
  onAnalysis: (text: string, result: VoiceAnalysisResult) => void;
  onTranscript: (text: string) => void;
  onText?: (text: string) => void;
  onState: (phase: VoicePhase, error: string) => void;
};

/** One session owns the microphone, one analysis and one reply. Never stores case/audio data. */
export class LegalVoiceConversation {
  phase: VoicePhase = "idle";
  private epoch = 0;
  private abort: AbortController | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private output: AudioBufferSourceNode | null = null;
  private pcm: PcmPlayer | null = null;
  private pendingAudio: AudioBuffer | null = null;
  private disposed = false;
  constructor(private options: () => Options) {}

  private set(phase: VoicePhase, error = "") {
    this.phase = phase;
    if (!this.disposed) this.options().onState(phase, error);
  }
  private alive(id: number) { return !this.disposed && id === this.epoch; }
  private releaseInput() {
    const recorder = this.recorder; this.recorder = null;
    if (recorder) {
      recorder.onstop = null; recorder.ondataavailable = null; recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
  }
  stop() {
    this.epoch++; this.abort?.abort(); this.abort = null;
    this.releaseInput(); this.pendingAudio = null; this.pcm?.stop(); this.pcm = null;
    if (this.output) { this.output.onended = null; try { this.output.stop(); } catch {} this.output.disconnect(); this.output = null; }
    this.set("stopped");
  }
  dispose() {
    this.disposed = true; this.stop();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
  }
  async toggle() {
    if (this.disposed) return;
    if (this.phase === "listening") { this.finish(); return; }
    if (this.phase === "blocked") { if (this.pcm) await this.pcm.resume(); else await this.play(this.epoch); return; }
    if (["requesting", "transcribing", "analyzing", "preparing", "speaking"].includes(this.phase)) { this.stop(); return; }
    this.stop(); const id = this.epoch;
    this.abort = new AbortController();
    this.set("requesting");
    try {
      const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error(this.options().language === "ar" ? voiceCopy.ar.unavailable : voiceCopy[this.options().language].unavailable);
      if (!this.context || this.context.state === "closed") this.context = new Audio();
      // Resume synchronously from the user's tap before awaiting microphone permission.
      await this.context.resume();
      if (!this.alive(id)) return;
      await this.capture(id);
    } catch (error) { this.fail(error, id, true); }
  }
  finish() {
    if (this.phase !== "listening" || !this.recorder || this.recorder.state === "inactive") return;
    this.set("transcribing");
    this.recorder.stop();
  }
  private async capture(id: number) {
    if (!this.alive(id)) return;
    this.set("requesting");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    if (!this.alive(id)) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined);
    this.recorder = recorder;
    const chunks: Blob[] = []; let size = 0;
    recorder.ondataavailable = event => {
      if (!this.alive(id)) return;
      size += event.data.size;
      if (size > MAX_AUDIO_BYTES) { this.fail(new Error(voiceCopy[this.options().language].tooLarge), id); return; }
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => this.fail(new Error(voiceCopy[this.options().language].failed), id);
    recorder.onstop = () => {
      if (!this.alive(id) || this.recorder !== recorder) return;
      if (this.phase !== "transcribing") { this.fail(new Error(voiceCopy[this.options().language].failed), id); return; }
      const audio = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      this.releaseInput();
      void this.process(audio, id);
    };
    // Pauses and quiet speech are not end-of-turn signals. The visitor
    // explicitly finishes; cancellation and the byte limit still release input.
    recorder.start(250); this.set("listening");
  }
  private async process(audio: Blob, id: number) {
    try {
      if (!audio.size) throw new Error(voiceCopy[this.options().language].empty);
      this.set("transcribing");
      const signal = this.abort!.signal;
      const form = new FormData();
      const extension = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", audio, `voice.${extension}`);
      form.append("language", this.options().language); form.append("scope", "assistant");
      form.append("context", JSON.stringify(this.options().context()));
      form.append("voice", this.options().voice);
      const response = await this.options().request("/api/legal/voice-turn", { method: "POST", body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(110_000)]) });
      if (!response.ok) { const error = await this.json(response); throw new Error(error.error || voiceCopy[this.options().language].failed); }
      if (!response.headers.get("Content-Type")?.includes("text/event-stream") || !response.body) throw new Error(voiceCopy[this.options().language].failed);
      let transcript = "", reviewed = false, complete = false, byteLength = 0, pcm = false;
      const audioChunks: Uint8Array[] = [];
      for await (const event of readSSE(response.body)) {
        if (!this.alive(id)) return;
        if (event.type === "error") throw new Error(event.error || voiceCopy[this.options().language].failed);
        if (event.type === "transcript" && typeof event.text === "string") {
          transcript = event.text; this.options().onTranscript(transcript); this.set("analyzing");
        }
        if (event.type === "text" && typeof event.text === "string") this.options().onText?.(event.text);
        if (event.type === "analysis") {
          if (!transcript || reviewed || !event.result?.state?.assistantMessage) throw new Error(voiceCopy[this.options().language].failed);
          this.options().onAnalysis(transcript, event.result); reviewed = true; this.set("preparing");
        }
        if (event.type === "audio_start" && event.format === "pcm16le") {
          if (!reviewed || this.pcm || event.sampleRate !== 24_000 || event.channels !== 1) throw new Error(voiceCopy[this.options().language].failed);
          pcm = true;
          this.pcm = new PcmPlayer(this.context!, { speaking: () => { if (this.alive(id)) this.set("speaking"); }, blocked: () => { if (this.alive(id)) this.set("blocked"); }, ended: () => this.afterPlayback(id) });
        }
        if (event.type === "audio") {
          if (!reviewed || typeof event.data !== "string") throw new Error(voiceCopy[this.options().language].failed);
          const binary = atob(event.data); byteLength += binary.length;
          if (byteLength > 8 * 1024 * 1024) throw new Error(voiceCopy[this.options().language].failed);
          const chunk = Uint8Array.from(binary, character => character.charCodeAt(0));
          if (pcm) this.pcm!.append(chunk); else audioChunks.push(chunk);
        }
        if (event.type === "done") complete = true;
      }
      if (!this.alive(id)) return;
      if (!complete || !reviewed || !byteLength) throw new Error(voiceCopy[this.options().language].failed);
      if (pcm) { this.pcm!.finish(); return; }
      const bytes = new Uint8Array(byteLength); let offset = 0;
      for (const chunk of audioChunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const decoded = await this.context!.decodeAudioData(bytes.buffer);
      if (!this.alive(id)) return;
      this.pendingAudio = decoded;
      await this.play(id);
    } catch (error) { this.fail(error, id); }
  }
  private async json(response: Response): Promise<{ text?: string; error?: string }> {
    try { return await response.json(); } catch { throw new Error(voiceCopy[this.options().language].failed); }
  }
  private async play(id: number) {
    if (!this.alive(id) || !this.pendingAudio || !this.context) return;
    try { await this.context.resume(); } catch { if (this.alive(id)) this.set("blocked"); return; }
    if (!this.alive(id)) return;
    if (this.context.state !== "running") { this.set("blocked"); return; }
    const source = this.context.createBufferSource(); source.buffer = this.pendingAudio;
    this.pendingAudio = null; this.output = source;
    source.connect(this.context.destination);
    source.onended = () => {
      if (!this.alive(id)) return;
      source.disconnect(); this.output = null;
      this.afterPlayback(id);
    };
    this.set("speaking"); source.start();
  }
  private afterPlayback(id: number) {
    if (!this.alive(id)) return;
    this.pcm = null;
    if (this.options().continuous) void this.capture(id).catch(error => this.fail(error, id, true));
    else { this.abort = null; this.set("idle"); }
  }
  private fail(error: unknown, id: number, permission = false) {
    if (!this.alive(id)) return;
    this.stop();
    const copy = voiceCopy[this.options().language];
    const message = error instanceof Error ? error.message : copy.failed;
    this.set("error", permission && error instanceof DOMException ? copy.denied : message);
  }
}
