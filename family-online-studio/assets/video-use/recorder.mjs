import {dimensions, recordingFormat, totalDuration, validateRanges, detectContainer} from './core.mjs';

function abortError() { return new DOMException('أُلغي التصدير.', 'AbortError'); }
function waitFor(element, event, signal, timeout = 15000) {
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => { clearTimeout(timer); element.removeEventListener(event, done); element.removeEventListener('error', fail); signal?.removeEventListener('abort', aborted); };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('تعذر قراءة التسجيل. جرّب MP4 أو WebM صالحًا.')); };
    const aborted = () => { cleanup(); reject(abortError()); };
    element.addEventListener(event, done, {once: true}); element.addEventListener('error', fail, {once: true});
    signal?.addEventListener('abort', aborted, {once: true});
    timer = setTimeout(() => { cleanup(); reject(new Error('تأخر تحميل التسجيل. أعد المحاولة.')); }, timeout);
    if (signal?.aborted) aborted();
  });
}
export async function loadVideo(video, source, start = 0, signal) {
  if (signal?.aborted) throw abortError();
  if (video.dataset.source !== source.id) {
    const ready = waitFor(video, 'loadedmetadata', signal);
    video.src = source.url; video.dataset.source = source.id; video.load(); await ready;
  }
  const target = Math.min(start, Math.max(0, video.duration - 0.001));
  if (video.readyState < 2) await waitFor(video, 'loadeddata', signal);
  if (Math.abs(video.currentTime - target) > 0.002) {
    const ready = waitFor(video, 'seeked', signal);
    video.currentTime = target; await ready;
  }
  if (video.readyState < 2) await waitFor(video, 'loadeddata', signal);
}
export function paint(canvas, video, cues = [], mediaTime = video.currentTime) {
  const ctx = canvas.getContext('2d', {alpha: false}), w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#071725'; ctx.fillRect(0, 0, w, h);
  if (video.readyState >= 2 && video.videoWidth) {
    const scale = Math.min(w / video.videoWidth, h / video.videoHeight);
    const iw = video.videoWidth * scale, ih = video.videoHeight * scale;
    ctx.drawImage(video, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }
  const cue = cues.find(item => item.start <= mediaTime && item.end > mediaTime);
  if (!cue) return;
  const fontSize = Math.max(22, Math.round(Math.min(w, h) * 0.052));
  ctx.font = '700 ' + fontSize + 'px Cairo, Tahoma, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
  const words = cue.text.replace(/\n/g, ' ').split(/\s+/), lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > w * 0.84) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  // Shrink long captions instead of dropping the end of a sentence.
  const effective = lines.length > 3 ? Math.max(14, Math.floor(fontSize * 3 / lines.length)) : fontSize;
  ctx.font = '700 ' + effective + 'px Cairo, Tahoma, sans-serif';
  const lineHeight = effective * 1.45, bottom = h * (h > w ? 0.73 : 0.85), top = bottom - lineHeight * lines.length;
  ctx.fillStyle = '#07101de6'; ctx.fillRect(w * 0.05, top - effective * 0.45, w * 0.9, lineHeight * lines.length + effective * 0.9);
  ctx.fillStyle = '#fff';
  lines.forEach((text, index) => ctx.fillText(text, w / 2, top + lineHeight * (index + 0.5), w * 0.86));
}
export async function recordProject({canvas, video, sources, ranges, aspect, quality, signal, onProgress}) {
  const format = recordingFormat();
  if (!format || !canvas.captureStream) throw new Error('التصدير غير متاح في هذا المتصفح. احفظ المشروع أو استخدم متصفحًا حديثًا.');
  const checked = validateRanges(ranges, sources), first = sources.find(source => source.id === checked[0].source);
  [canvas.width, canvas.height] = dimensions(aspect, quality, first);
  // Load and seek before creating capture tracks so loading time is not recorded.
  await loadVideo(video, first, checked[0].start, signal);
  paint(canvas,video,first.cues);
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) throw new Error('هذا المتصفح لا يدعم مسار تصدير الصوت.');
  const audio = new Audio(), destination = audio.createMediaStreamDestination(), gain = audio.createGain();
  const elementSource = audio.createMediaElementSource(video);
  elementSource.connect(gain); gain.connect(destination); gain.connect(audio.destination);
  await audio.resume();
  let stream = canvas.captureStream(0);
  if (!stream.getVideoTracks()[0]?.requestFrame) {
    stream.getTracks().forEach(track=>track.stop());
    stream=canvas.captureStream(24);
  }
  const videoTrack=stream.getVideoTracks()[0];
  for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
  const recorder = new MediaRecorder(stream, {mimeType: format.mimeType, videoBitsPerSecond: quality === '1080' ? 7_000_000 : 3_500_000, audioBitsPerSecond: 128000});
  const chunks = [];
  let frame = 0, recording = false, hidden = false, bytes = 0, tooLarge = false;
  const stopped = new Promise((resolve, reject) => {
    recorder.addEventListener('dataavailable', event => {
      if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
      if (bytes > 160 * 1024 * 1024) { tooLarge = true; video.pause(); if (recorder.state !== 'inactive') recorder.stop(); }
    });
    recorder.addEventListener('stop', resolve, {once: true});
    recorder.addEventListener('error', event => reject(event.error || new Error('تعذر تسجيل الفيديو.')), {once: true});
  });
  const abort = () => { video.pause(); if (recorder.state !== 'inactive') recorder.stop(); };
  const visibility = () => { if (document.hidden) { hidden = true; abort(); } };
  signal?.addEventListener('abort', abort); document.addEventListener('visibilitychange', visibility);
  try {
    if (signal?.aborted) throw abortError();
    let elapsed = 0;
    const total = totalDuration(checked);
    for (const range of checked) {
      if (signal?.aborted) throw abortError();
      if (hidden) throw new Error('توقف التصدير لأن الصفحة أصبحت مخفية. أبقِها ظاهرة ثم أعد المحاولة.');
      const source = sources.find(item => item.id === range.source);
      await loadVideo(video, source, range.start, signal);
      paint(canvas, video, source.cues);
      if (!recording) { recorder.start(250); recording = true; }
      else if (recorder.state === 'paused') { recorder.resume(); }
      videoTrack.requestFrame?.();
      gain.gain.cancelScheduledValues(audio.currentTime);
      gain.gain.setValueAtTime(0, audio.currentTime); gain.gain.linearRampToValueAtTime(1, audio.currentTime + 0.03);
      gain.gain.setValueAtTime(1, audio.currentTime + Math.max(0.03, range.end - range.start - 0.03));
      gain.gain.linearRampToValueAtTime(0, audio.currentTime + range.end - range.start);
      let decodedFrame;
      const hasFrameCallback=typeof video.requestVideoFrameCallback==='function';
      const drawFrame=(now,metadata)=>{
        if(signal?.aborted||hidden||video.paused)return;
        paint(canvas,video,source.cues,metadata.mediaTime);
        videoTrack.requestFrame?.();
        decodedFrame=video.requestVideoFrameCallback(drawFrame);
      };
      await video.play();
      if(hasFrameCallback)decodedFrame=video.requestVideoFrameCallback(drawFrame);
      await new Promise((resolve, reject) => {
        let lastTime = video.currentTime, changedAt = performance.now();
        const tick = () => {
          if (signal?.aborted) { reject(abortError()); return; }
          if (hidden) { reject(new Error('توقف التصدير لأن الصفحة أصبحت مخفية. أبقِها ظاهرة ثم أعد المحاولة.')); return; }
          if (video.error) { reject(new Error('توقف تشغيل التسجيل أثناء التصدير.')); return; }
          if (tooLarge) { reject(new Error('تجاوز الملف سعة التصدير على الجهاز. صدّر على دفعات أقصر أو استخدم المحرك المتقدم.')); return; }
          if (video.currentTime !== lastTime) { lastTime = video.currentTime; changedAt = performance.now(); }
          if (performance.now() - changedAt > 20000) { reject(new Error('توقف تشغيل التسجيل. أعد التصدير أو اختر مقطعًا أقصر.')); return; }
          if(!hasFrameCallback){paint(canvas, video, source.cues);videoTrack.requestFrame?.();}
          onProgress?.(Math.min(1, (elapsed + video.currentTime - range.start) / total));
          if (video.currentTime >= range.end || video.ended) { video.pause(); resolve(); return; }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });
      if(decodedFrame!==undefined)video.cancelVideoFrameCallback(decodedFrame);
      if (recorder.state === 'recording') recorder.pause();
      elapsed += range.end - range.start;
    }
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    if (signal?.aborted) throw abortError();
    if (hidden) throw new Error('أُلغي التصدير عند إخفاء الصفحة.');
    if (tooLarge) throw new Error('تجاوز الملف سعة التصدير على الجهاز.');
    const raw = new Blob(chunks, {type: recorder.mimeType || format.mimeType});
    const actual = detectContainer(new Uint8Array(await raw.slice(0,12).arrayBuffer()));
    const blob = new Blob(chunks, {type: actual.mimeType});
    if (!blob.size) throw new Error('لم ينتج ملف فيديو. أعد المحاولة.');
    onProgress?.(1);
    return {blob, extension: actual.extension};
  } finally {
    cancelAnimationFrame(frame); video.pause(); abort();
    signal?.removeEventListener('abort', abort); document.removeEventListener('visibilitychange', visibility);
    stream.getTracks().forEach(track => track.stop()); destination.stream.getTracks().forEach(track => track.stop());
    elementSource.disconnect(); gain.disconnect(); await audio.close();
  }
}
