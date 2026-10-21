// Original renderer; no creator videos, prompts, case data, or external services are loaded.
export const PALETTES = Object.freeze({
  legal: { background: '#081f2c', ink: '#f4f8f8', muted: '#c4d6db', accent: '#75d1c8' },
  barcode: { background: '#10191d', ink: '#f5f1e8', muted: '#c4cbd0', accent: '#a6d4ce' },
});

const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
export function normalizeProject(input = {}) {
  const duration = Number(input.duration);
  return {
    theme: input.theme === 'legal' ? 'legal' : 'barcode',
    language: ['ar', 'en', 'ur'].includes(input.language) ? input.language : 'ar',
    aspect: input.aspect === 'portrait' ? 'portrait' : 'landscape',
    duration: Number.isFinite(duration) ? Math.min(30, Math.max(12, duration)) : 18,
    title: clean(input.title, 90),
    brand: clean(input.brand, 100),
    scenes: (Array.isArray(input.scenes) ? input.scenes : []).slice(0, 4).map(scene => ({
      title: clean(scene?.title, 90), body: clean(scene?.body, 220), label: clean(scene?.label, 80),
    })),
  };
}

export function sceneAt(project, seconds) {
  const count = Math.max(1, project.scenes.length);
  const time = Math.min(project.duration, Math.max(0, Number(seconds) || 0));
  const length = project.duration / count;
  const index = Math.min(count - 1, Math.floor(time / length));
  return { index, progress: Math.min(1, (time - index * length) / length), scene: project.scenes[index] || { title: project.title, body: '', label: '' } };
}

function linesFor(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function write(ctx, text, y, size, width, font, color, maxLines = 4) {
  let actual = size;
  let lines;
  do {
    ctx.font = `400 ${actual}px ${font}`;
    lines = linesFor(ctx, text, width);
    if (lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= width)) break;
    actual -= 2;
  } while (actual > 16);
  const leading = actual * 1.55;
  ctx.fillStyle = color;
  lines.forEach((line, index) => ctx.fillText(line, ctx.canvas.width / 2, y + (index - (lines.length - 1) / 2) * leading));
  return lines.length * leading;
}

export function drawFrame(ctx, project, seconds, font = 'Tahoma, sans-serif') {
  const { width: w, height: h } = ctx.canvas;
  const palette = PALETTES[project.theme];
  const portrait = h > w;
  const scale = Math.min(w / 960, h / 540);
  const { index, progress, scene } = sceneAt(project, seconds);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = project.language === 'en' ? 'ltr' : 'rtl';

  if (project.theme === 'barcode') {
    for (let n = 0; n < 73; n++) {
      const x = w * .08 + n * w * .0116;
      ctx.fillStyle = n % 3 ? '#a6d4ce18' : '#a6d4ce30';
      ctx.fillRect(x, h * .10, (n * 7 % 4 + 1) * scale, h * .78);
    }
    ctx.fillStyle = '#75d1c855';
    ctx.fillRect(w * .06, h * (.16 + progress * .68), w * .88, 2 * scale);
    ctx.fillStyle = '#10191de8';
    ctx.fillRect(w * .06, h * .28, w * .88, h * .46);
  } else {
    ctx.strokeStyle = '#75d1c83d';
    ctx.lineWidth = 2 * scale;
    for (let n = 0; n < 3; n++) {
      const x = w * (.32 + n * .18);
      ctx.beginPath(); ctx.arc(x, h * .20, 18 * scale, 0, Math.PI * 2); ctx.stroke();
      if (n < 2) { ctx.beginPath(); ctx.moveTo(x + 24 * scale, h * .20); ctx.lineTo(x + w * .18 - 24 * scale, h * .20); ctx.stroke(); }
      ctx.fillStyle = n === (project.language === 'en' ? index : 2 - index) ? palette.accent : palette.muted;
      ctx.font = `400 ${19 * scale}px ${font}`;
      ctx.fillText(project.language === 'en' ? String(n + 1) : ['٣', '٢', '١'][n], x, h * .20);
    }
  }

  // Fade the complete phrase; never animate Arabic letters separately.
  const entry = Math.min(1, Math.max(0, progress * 10));
  const exit = Math.min(1, Math.max(0, (1 - progress) * 10));
  ctx.globalAlpha = Math.min(entry, exit);
  ctx.translate(0, (1 - entry) * 12 * scale);
  const maxWidth = w * .82;
  write(ctx, scene.label, h * .32, 21 * scale, maxWidth, font, palette.accent, 2);
  const titleHeight = write(ctx, scene.title, h * .47, (portrait ? 100 : 54) * scale, maxWidth, font, palette.ink, 3);
  write(ctx, scene.body, Math.max(h * .65, h * .47 + titleHeight / 2 + 38 * scale), 28 * scale, maxWidth, font, palette.muted, 4);
  ctx.globalAlpha = 1;
  write(ctx, project.brand, h * .90, 19 * scale, maxWidth, font, palette.muted, 2);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(w * .08, h * .96, w * .84 * Math.min(1, Math.max(0, seconds / project.duration)), 3 * scale);
  ctx.restore();
}

export function recordingFormat(Recorder = globalThis.MediaRecorder) {
  if (!Recorder?.isTypeSupported) return null;
  for (const [mimeType, extension] of [['video/mp4;codecs=avc1.42E01E', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm;codecs=vp8', 'webm'], ['video/webm', 'webm']]) {
    if (Recorder.isTypeSupported(mimeType)) return { mimeType, extension };
  }
  return null;
}

export function recordVideo(canvas, project, font, { signal, onProgress = () => {} } = {}) {
  const format = recordingFormat();
  if (!format || !canvas.captureStream) return Promise.reject(new Error('unsupported'));
  if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30);
    const chunks = [];
    let recorder;
    let frame = 0;
    let timer;
    let failure;
    const cleanup = () => {
      cancelAnimationFrame(frame); clearTimeout(timer);
      stream.getTracks().forEach(track => track.stop());
      signal?.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', visibility);
    };
    const stop = error => {
      failure ||= error;
      cancelAnimationFrame(frame);
      if (recorder?.state === 'recording') recorder.stop();
      else { cleanup(); reject(failure || new Error('recording')); }
    };
    const abort = () => stop(new DOMException('Cancelled', 'AbortError'));
    const visibility = () => { if (document.hidden) stop(new Error('hidden')); };
    try {
      recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 4_000_000 });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => stop(new Error('recording'));
      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (failure || !blob.size) reject(failure || new Error('empty'));
        else resolve({ blob, extension: recorder.mimeType.includes('mp4') ? 'mp4' : 'webm' });
      };
      signal?.addEventListener('abort', abort, { once: true });
      document.addEventListener('visibilitychange', visibility);
      drawFrame(canvas.getContext('2d'), project, .08, font);
      recorder.start(250);
      const start = performance.now();
      const tick = now => {
        const elapsed = (now - start) / 1000;
        drawFrame(canvas.getContext('2d'), project, Math.min(elapsed, project.duration - .08), font);
        onProgress(Math.min(1, elapsed / project.duration));
        if (elapsed >= project.duration) stop();
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      timer = setTimeout(() => stop(new Error('timeout')), (project.duration + 8) * 1000);
    } catch (error) { cleanup(); reject(error); }
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function createPlayer(canvas, initial, font, onTime = () => {}) {
  let project = normalizeProject(initial);
  let position = .8;
  let frame = 0;
  let playing = false;
  const paint = () => { drawFrame(canvas.getContext('2d'), project, position, font); onTime(position, playing); };
  const pause = () => { playing = false; cancelAnimationFrame(frame); paint(); };
  const visibility = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', visibility);
  return {
    get project() { return project; },
    get playing() { return playing; },
    pause,
    seek(value) { pause(); position = Math.min(project.duration - .08, Math.max(.08, Number(value) || .08)); paint(); },
    set(value) {
      pause(); project = normalizeProject(value);
      [canvas.width, canvas.height] = project.aspect === 'portrait' ? [720, 1280] : [1280, 720];
      position = .8; paint();
    },
    play() {
      if (playing) { pause(); return; }
      if (position >= project.duration - .1) position = .08;
      playing = true;
      const start = performance.now() - position * 1000;
      const tick = now => {
        position = Math.min(project.duration - .08, (now - start) / 1000); paint();
        if (position >= project.duration - .08) pause();
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    destroy() { pause(); document.removeEventListener('visibilitychange', visibility); },
  };
}
