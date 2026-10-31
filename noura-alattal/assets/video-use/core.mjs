export const VERSION = 1;
export function numeric(value) {
  const text = String(value).replace(/[٠-٩]/g, c => c.charCodeAt(0) - 1632).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 1776).replace('٫', '.');
  const number = Number(text);
  if (!text.trim() || !Number.isFinite(number)) throw new Error('أدخل وقتًا صحيحًا بالثواني.');
  return number;
}
export function filename(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 180 || /[/\\\0\r\n]/.test(name) || name === '.' || name === '..') throw new Error('اسم التسجيل غير صالح.');
  return name;
}
export function parseSrt(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('ملف الترجمة كبير جدًا.');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) throw new Error('ملف الترجمة فارغ.');
  const stamp = value => {
    const match = value.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)[,.](\d{3})$/);
    if (!match) throw new Error('توقيت غير صالح في ملف SRT.');
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  const cues = normalized.split(/\n[ \t]*\n/).map(block => {
    const lines = block.split('\n');
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const match = lines.shift()?.trim().match(/^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!match) throw new Error('تعذر قراءة ملف SRT. راجع صيغة التوقيت.');
    const start = stamp(match[1]), end = stamp(match[2]);
    const body = lines.join('\n').replace(/<[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '').trim();
    if (end <= start || !body || body.length > 2000) throw new Error('إحدى عبارات الترجمة فارغة أو توقيتها غير صحيح.');
    return {start, end, text: body};
  }).sort((a, b) => a.start - b.start);
  if (cues.length > 5000) throw new Error('ملف الترجمة يتجاوز 5000 عبارة.');
  return cues;
}
export function validateRanges(ranges, sources) {
  if (!Array.isArray(ranges) || !ranges.length || ranges.length > 100) throw new Error('أضف من مقطع واحد إلى 100 مقطع.');
  return ranges.map(range => {
    const source = sources.find(item => item.id === range.source);
    if (!source) throw new Error('أعد اختيار التسجيل الأصلي للمقاطع المحفوظة.');
    const start = numeric(range.start), end = numeric(range.end);
    if (start < 0 || end - start < 0.1 || end > source.duration + 0.04) throw new Error('راجع البداية والنهاية؛ الحد الأدنى للمقطع عُشر ثانية.');
    return {source: source.id, start, end: Math.min(end, source.duration)};
  });
}
export function totalDuration(ranges) { return ranges.reduce((sum, range) => sum + range.end - range.start, 0); }
export function outputCues(ranges, sources) {
  let offset = 0;
  const output = [];
  for (const range of validateRanges(ranges, sources)) {
    const cues = sources.find(source => source.id === range.source).cues || [];
    for (const cue of cues) {
      const start = Math.max(cue.start, range.start), end = Math.min(cue.end, range.end);
      if (end > start) output.push({start: start - range.start + offset, end: end - range.start + offset, text: cue.text});
    }
    offset += range.end - range.start;
  }
  return output;
}
export function srt(cues) {
  const stamp = value => {
    let ms = Math.max(0, Math.round(value * 1000));
    const hours = Math.floor(ms / 3600000); ms %= 3600000;
    const minutes = Math.floor(ms / 60000); ms %= 60000;
    const seconds = Math.floor(ms / 1000); ms %= 1000;
    return [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0');
  };
  return cues.map((cue, i) => (i + 1) + '\n' + stamp(cue.start) + ' --> ' + stamp(cue.end) + '\n' + cue.text + '\n').join('\n');
}
export function proposeClips(cues, duration, target = 45, count = 3) {
  if (!cues.length) throw new Error('أضف ترجمة SRT للتسجيل أولًا. الاقتراح يعتمد على حدود العبارات، وراجعه قبل التصدير.');
  const groups = [];
  let index = 0;
  while (index < cues.length && groups.length < count) {
    const first = cues[index], start = Math.max(0, first.start - 0.15);
    let end = first.end, consumed = 0;
    do { end = cues[index].end; index++; consumed++; }
    while (index < cues.length && end - start < target);
    if (end > start && consumed) groups.push({start, end: Math.min(duration, end + 0.2)});
  }
  return groups;
}
export function dimensions(aspect, quality, source) {
  const long = quality === '1080' ? 1920 : 1280;
  if (aspect === 'portrait') return [Math.round(long * 9 / 16), long];
  if (aspect === 'landscape') return [long, Math.round(long * 9 / 16)];
  const scale = Math.min(1, long / Math.max(source.width, source.height));
  return [source.width, source.height].map(n => Math.max(2, Math.round(n * scale / 2) * 2));
}
export function recordingFormat(Recorder = globalThis.MediaRecorder) {
  if (!Recorder?.isTypeSupported) return null;
  for (const [mimeType, extension] of [
    ['video/mp4;codecs=avc1.42001E,mp4a.40.2', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm'], ['video/mp4', 'mp4']
  ]) if (Recorder.isTypeSupported(mimeType)) return {mimeType, extension};
  return null;
}
export function detectContainer(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return {extension:'webm',mimeType:'video/webm'};
  if (bytes.length >= 8 && String.fromCharCode(...bytes.slice(4,8)) === 'ftyp') return {extension:'mp4',mimeType:'video/mp4'};
  throw new Error('تعذر التحقق من صيغة الفيديو الناتج. استخدم المحرك المتقدم.');
}
export function projectData({title, profile, work, aspect, quality, sources, ranges}) {
  const checked = validateRanges(ranges, sources);
  return {
    type: 'video-use-project', version: VERSION, title: String(title).slice(0, 120),
    profile, work, aspect, quality,
    sources: sources.map(({id, name, duration, size, lastModified, cues}) => ({id, name: filename(name), duration, size, lastModified, cues: cues || []})),
    ranges: checked
  };
}
export function buildEdl(project) {
  const ranges = validateRanges(project.ranges, project.sources);
  const sources = Object.fromEntries(project.sources.map(source => [source.id, 'sources/' + filename(source.name)]));
  const first = project.sources.find(source => source.id === ranges[0].source);
  return {version: 1, sources, ranges, grade: 'none', overlays: [], caption_case: 'natural',
    subtitles: 'master.srt', total_duration_s: totalDuration(ranges),
    delivery: {aspect: project.aspect, quality: project.quality}, source_files: project.sources.map(({id, name, size, lastModified}) => ({id, name, size, lastModified})),
    subtitle_style: 'FontName=DejaVu Sans,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=60'};
}
export function zipFiles(files) {
  const encoder = new TextEncoder(), parts = [], directory = [];
  let offset = 0, size = 0;
  const crc = bytes => {
    let value = 0xffffffff;
    for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
    return (value ^ 0xffffffff) >>> 0;
  };
  for (const file of files) {
    if (file.name.startsWith('/') || file.name.split('/').includes('..') || file.name.includes('\\')) throw new Error('مسار غير صالح في المشروع.');
    const name = encoder.encode(file.name), bytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const checksum = crc(bytes), header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint32(14, checksum, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint32(16, checksum, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); central.set(name, 46);
    parts.push(header, bytes); directory.push(central); offset += header.length + bytes.length; size += central.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], {type: 'application/zip'});
}
