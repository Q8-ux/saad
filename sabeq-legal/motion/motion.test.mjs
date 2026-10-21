import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProject, sceneAt, recordingFormat, drawFrame, recordVideo } from './motion-core.mjs';

test('untrusted settings stay bounded and invalid durations cannot hang export', () => {
  const p = normalizeProject({ duration: Infinity, title: '<script>plain text</script>', scenes: Array.from({ length: 90 }, () => ({ body: 'س'.repeat(600) })) });
  assert.equal(p.duration, 18); assert.equal(p.scenes.length, 4); assert.equal(p.scenes[0].body.length, 220);
  assert.equal(p.title, '<script>plain text</script>');
  assert.equal(normalizeProject({ duration: -1 }).duration, 12);
});

test('scene boundaries and last frame are deterministic', () => {
  const p = normalizeProject({ duration: 18, scenes: [{ title: 'أ' }, { title: 'ب' }, { title: 'ج' }] });
  assert.equal(sceneAt(p, 0).index, 0); assert.equal(sceneAt(p, 6).index, 1);
  assert.equal(sceneAt(p, 18).index, 2); assert.equal(sceneAt(p, -10).progress, 0);
});

test('recording format chooses the real extension and handles missing support', () => {
  assert.equal(recordingFormat(null), null);
  assert.deepEqual(recordingFormat({ isTypeSupported: type => type === 'video/webm;codecs=vp8' }), { mimeType: 'video/webm;codecs=vp8', extension: 'webm' });
  assert.equal(recordingFormat({ isTypeSupported: type => type === 'video/mp4' }).extension, 'mp4');
});

test('Arabic drawing preserves phrases and stays reproducible', () => {
  const draws = [];
  const ctx = { canvas: { width: 1280, height: 720 }, save() {}, restore() {}, clearRect() {}, fillRect() {}, translate() {}, beginPath() {}, arc() {}, stroke() {}, moveTo() {}, lineTo() {}, measureText: text => ({ width: text.length * 20 }), fillText: (...args) => draws.push(args) };
  const p = normalizeProject({ theme: 'legal', scenes: [{ title: 'راجع المسودة', body: 'مع المختص', label: '١ / ٣' }] });
  drawFrame(ctx, p, 1.5, 'Tahoma'); const first = JSON.stringify(draws); draws.length = 0;
  drawFrame(ctx, p, 1.5, 'Tahoma'); assert.equal(JSON.stringify(draws), first);
  assert.ok(draws.some(([text]) => text === 'راجع المسودة')); assert.equal(ctx.direction, 'rtl');
});

test('recording releases tracks on completion, cancellation, and page hiding', async () => {
  const previous = Object.fromEntries(['document', 'MediaRecorder', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]));
  let stopped = 0;
  let automaticFrames = true;
  const context = { canvas: { width: 1280, height: 720 }, save() {}, restore() {}, clearRect() {}, fillRect() {}, translate() {}, measureText: text => ({ width: text.length * 10 }), fillText() {} };
  const canvas = { getContext: () => context, captureStream: () => ({ getTracks: () => [{ stop: () => stopped++ }] }) };
  class Recorder {
    static isTypeSupported(type) { return type === 'video/webm'; }
    constructor(stream, { mimeType }) { this.state = 'inactive'; this.mimeType = mimeType; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable({ data: new Blob(['synthetic test frames']) }); this.onstop(); }); }
  }
  try {
    globalThis.document = new EventTarget(); document.hidden = false;
    globalThis.MediaRecorder = Recorder;
    globalThis.requestAnimationFrame = callback => automaticFrames ? setTimeout(() => callback(performance.now() + 40_000), 0) : 0;
    globalThis.cancelAnimationFrame = clearTimeout;
    const p = normalizeProject({ duration: 12, scenes: [{ title: 'باركود' }] });
    const result = await recordVideo(canvas, p, 'Tahoma');
    assert.equal(result.extension, 'webm'); assert.ok(result.blob.size); assert.equal(stopped, 1);
    automaticFrames = false;
    const controller = new AbortController();
    const cancelled = recordVideo(canvas, p, 'Tahoma', { signal: controller.signal }); controller.abort();
    await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal(stopped, 2);
    const hidden = recordVideo(canvas, p, 'Tahoma'); document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
    await assert.rejects(hidden, /hidden/); assert.equal(stopped, 3);
  } finally {
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
});
