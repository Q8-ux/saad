export function newId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function formatTime(value, decimals = false) {
  const n = Math.max(0, Number(value) || 0);
  const h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, s = Math.floor(n) % 60;
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + (decimals ? '.' + Math.floor((n % 1) * 10 + .0001) : '');
}
export function parseTime(text) {
  const clean = String(text).trim().replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace('٫', '.');
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(clean)) return NaN;
  const parts = clean.split(':').map(Number);
  if (parts.length > 1 && parts.slice(1).some(n => n >= 60)) return NaN;
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}
export function validRange(start, end, duration) {
  return [start, end, duration].every(Number.isFinite) && start >= 0 && end - start >= .1 && end <= duration + .001;
}
export function normalizeServer(input) {
  const u = new URL(input.trim());
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) throw new Error('invalidServer');
  return u.origin + u.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}
export function videoPlatform(input) {
  const u = new URL(input.trim());
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('invalidLink');
  const host = u.hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return 'youtube';
  if (['bilibili.com', 'www.bilibili.com', 'm.bilibili.com', 'b23.tv'].includes(host)) return 'bilibili';
  throw new Error('invalidLink');
}
export function parseProject(value) {
  if (!value || value.app !== 'autoclip-studio' || value.version !== 1 || !Array.isArray(value.clips) || value.clips.length > 100 || !value.source || typeof value.source.name !== 'string' || !Number.isSafeInteger(value.source.size) || value.source.size < 1 || !Number.isFinite(value.source.duration) || value.source.duration <= 0) throw new Error('invalidProject');
  const clips = value.clips.map(c => {
    if (!c || typeof c.title !== 'string' || c.title.length > 100 || !['original', '9:16', '16:9'].includes(c.ratio) || !validRange(c.start, c.end, value.source.duration)) throw new Error('invalidProject');
    return { title:c.title, start:c.start, end:c.end, ratio:c.ratio };
  });
  return { source:{name:value.source.name.slice(0,255),size:value.source.size,duration:value.source.duration}, clips };
}
export function exportDimensions(w, h, ratio) {
  if (ratio === '9:16') return { width:720, height:1280 };
  if (ratio === '16:9') return { width:1280, height:720 };
  const scale = Math.min(1,1280/w,720/h);
  return {width:Math.max(2,Math.round(w*scale/2)*2),height:Math.max(2,Math.round(h*scale/2)*2)};
}
export function cropRect(w, h, targetW, targetH) {
  const target = targetW/targetH, source = w/h;
  return source > target ? { x:(w-h*target)/2,y:0,w:h*target,h } : { x:0,y:(h-w/target)/2,w,h:w/target };
}
