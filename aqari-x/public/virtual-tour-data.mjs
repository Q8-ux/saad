// Shared by the browser and server. This module never fetches a supplied URL.
export function tourHTTPS(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('رابط الجولة غير صالح');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('أدخل رابط HTTPS كاملاً للجولة'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') ||
      host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) {
    throw new Error('استخدم رابط HTTPS عاماً دون بيانات دخول');
  }
  url.hash = '';
  return url;
}

export function normalizeVirtualTour(input) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('بيانات الجولة غير صالحة');
  const kind = input.kind;
  if (!['scene', 'model'].includes(kind)) throw new Error('اختر مشهداً منشوراً أو ملف مسح جاهزاً');
  const url = tourHTTPS(input.url);
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length > 120) throw new Error('عنوان الجولة بحد أقصى 120 حرفاً');
  const result = {version: 1, kind, url: '', title};
  if (kind === 'scene') {
    if (url.hostname !== 'superspl.at') throw new Error('أدخل رابط مشهد منشور من SuperSplat');
    const scene = url.pathname.match(/^\/scene\/([a-zA-Z0-9_-]{6,80})\/?$/)?.[1] ||
      (/^\/s\/?$/.test(url.pathname) ? url.searchParams.get('id') : null);
    if (!scene || !/^[a-zA-Z0-9_-]{6,80}$/.test(scene)) throw new Error('رابط المحرر ليس جولة؛ انسخ رابط المشهد بعد نشره');
    result.url = 'https://superspl.at/s?id=' + encodeURIComponent(scene);
  } else {
    if (!/\.(ply|sog)$/i.test(url.pathname)) throw new Error('استخدم ملف Gaussian Splat بصيغة PLY أو SOG');
    result.url = url.href;
    if (input.settingsUrl) {
      const settings = tourHTTPS(input.settingsUrl);
      if (!/\.json$/i.test(settings.pathname)) throw new Error('ملف إعدادات الجولة يجب أن يكون JSON');
      result.settingsUrl = settings.href;
    }
  }
  return result;
}

export function propertyTour(property) {
  try { return normalizeVirtualTour(property?.virtualTour); } catch { return null; }
}

export function tourFrameURL(input, base = import.meta.url) {
  const tour = normalizeVirtualTour(input);
  if (!tour) return '';
  if (tour.kind === 'scene') return tour.url;
  const url = new URL('./tour-viewer/', base);
  url.searchParams.set('content', tour.url);
  if (tour.settingsUrl) url.searchParams.set('settings', tour.settingsUrl);
  url.searchParams.set('noanim', '');
  return url.href;
}
