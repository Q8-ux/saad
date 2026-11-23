/** Incremental PCM16 little-endian playback. No network, storage, or credentials. */
export class PcmPlayer {
  private nodes = new Set<AudioBufferSourceNode>();
  private pending: AudioBuffer[] = [];
  private carry: number | null = null;
  private nextAt = 0;
  private complete = false;
  private stopped = false;
  private notified = false;
  private bytes = 0;
  constructor(private context: AudioContext, private hooks: { speaking: () => void; blocked: () => void; ended: () => void }) {}
  append(bytes: Uint8Array) {
    if (this.stopped) return;
    this.bytes += bytes.length;
    if (this.bytes > 8 * 1024 * 1024) throw new Error("تعذر تشغيل الصوت: تجاوز الحد المسموح.");
    const data = new Uint8Array(bytes.length + (this.carry === null ? 0 : 1));
    if (this.carry !== null) { data[0] = this.carry; data.set(bytes, 1); } else data.set(bytes);
    const length = data.length - data.length % 2;
    this.carry = data.length % 2 ? data[data.length - 1] : null;
    if (!length) return;
    const buffer = this.context.createBuffer(1, length / 2, 24_000);
    const samples = buffer.getChannelData(0), view = new DataView(data.buffer);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    this.pending.push(buffer); this.flush();
  }
  private flush() {
    if (this.stopped) return;
    if (this.context.state !== "running") { this.hooks.blocked(); return; }
    if (this.pending.length) this.hooks.speaking();
    while (this.pending.length) {
      const buffer = this.pending.shift()!;
      const node = this.context.createBufferSource(); node.buffer = buffer; node.connect(this.context.destination);
      const at = Math.max(this.context.currentTime + .06, this.nextAt); this.nextAt = at + buffer.duration;
      this.nodes.add(node);
      node.onended = () => { node.disconnect(); this.nodes.delete(node); this.maybeEnded(); };
      node.start(at);
    }
    this.maybeEnded();
  }
  finish() {
    if (this.carry !== null || !this.bytes) throw new Error("انقطع الصوت قبل اكتماله. الرد المكتوب متاح.");
    this.complete = true; this.maybeEnded();
  }
  async resume() {
    try { await this.context.resume(); } catch { if (!this.stopped) this.hooks.blocked(); return; }
    this.flush();
  }
  private maybeEnded() {
    if (!this.stopped && this.complete && !this.pending.length && !this.nodes.size && !this.notified) {
      this.notified = true; this.hooks.ended();
    }
  }
  stop() {
    this.stopped = true; this.pending = []; this.carry = null;
    for (const node of this.nodes) { node.onended = null; try { node.stop(); } catch {} node.disconnect(); }
    this.nodes.clear();
  }
}
