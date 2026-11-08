export class APIError extends Error {
  constructor(message, status = 0, payload = {}) { super(message); this.name = 'APIError'; this.status = status; this.payload = payload; }
}
export function validateBase(value) {
  const u = new URL(String(value).trim());
  if (u.username || u.password || u.search || u.hash) throw new Error('استخدم رابط الخدمة دون بيانات دخول أو معاملات إضافية.');
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('رابط الخدمة يجب أن يستخدم HTTPS؛ يُسمح بالاتصال المحلي على جهازك.');
  return u.href.replace(/\/$/, '');
}
export function errorMessage(data, status) {
  if (data?.code === 'engine_not_configured') return 'بوابة الاتصال جاهزة، ومحرك الصوت يحتاج خادمًا بذاكرة مناسبة. التسجيل والتحرير متاحان الآن.';
  if (data?.code === 'engine_unreachable') return 'محرك الصوت لا يستجيب حاليًا. تحقق من الخادم ثم أعد المحاولة.';
  if (status === 401) return 'أدخل مفتاح وصول صحيحًا في إعدادات الاتصال.';
  if (status === 413) return 'حجم الملف أكبر من الحد المسموح به للخدمة.';
  if (status === 202 && data?.detail?.downloading) return 'بدأ تنزيل نموذج التفريغ. انتظر اكتماله في محركات الصوت، ثم أعد التفريغ.';
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map(e=>`${e.loc?.slice(-1)[0] || ''}: ${e.msg}`).join('، ');
  return data?.detail?.message || data?.message || `تعذّر الطلب (${status}).`;
}
export class VoiceboxAPI {
  constructor(base = '', token = '') { this.base = base ? validateBase(base) : ''; this.token = token; }
  async request(path, {method='GET', data, signal, binary=false, timeout=90000} = {}) {
    if (!this.base) throw new APIError('أدخل رابط خدمة الصوت في إعدادات الاتصال.');
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('مسار الخدمة غير صالح.');
    const controller = new AbortController();
    const cancel = ()=>controller.abort(signal?.reason);
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, {once:true});
    const timer = timeout > 0 ? setTimeout(()=>controller.abort(), timeout) : null;
    const headers = {Accept: binary ? '*/*' : 'application/json'};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let body;
    if (data instanceof FormData) body = data;
    else if (data !== undefined) { headers['Content-Type']='application/json'; body=JSON.stringify(data); }
    try {
      const response = await fetch(this.base+path,{method,headers,body,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
      if (!response.ok || response.status === 202) {
        const payload = await response.json().catch(()=>({}));
        throw new APIError(errorMessage(payload,response.status),response.status,payload);
      }
      return binary ? await response.blob() : response.status===204 ? null : await response.json();
    } catch(e) {
      if (e instanceof APIError) throw e;
      if (e.name==='AbortError') throw new APIError(signal?.aborted ? 'أوقفت المتابعة.' : 'انتهت مهلة الانتظار. يمكنك متابعة المهمة من السجل.');
      throw new APIError('تعذّر الاتصال بخدمة الصوت. تحقق من الرابط والاتصال والسماح لهذا الموقع.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort',cancel); }
  }
  async pollGeneration(id, {signal,onUpdate=()=>{},maxWait=20*60*1000}={}) {
    const start = Date.now();
    while (Date.now()-start<maxWait) {
      if (signal?.aborted) throw new APIError('أوقفت متابعة المهمة.');
      const item=await this.request('/history/'+encodeURIComponent(id),{signal});
      onUpdate(item);
      if (item.status==='completed') return item;
      if (item.status==='failed') throw new APIError(item.error || 'تعذّر التوليد. افتح السجل للمحاولة مجددًا.');
      if (item.status==='cancelled'||item.status==='canceled') throw new APIError('أُلغيت المهمة.');
      await new Promise((resolve,reject)=>{
        const end=()=>{signal?.removeEventListener('abort',abort);resolve();};
        const timer=setTimeout(end,2200);
        const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new APIError('أوقفت متابعة المهمة.'));};
        signal?.addEventListener('abort',abort,{once:true});
      });
    }
    throw new APIError('المهمة ما زالت تستغرق وقتًا. يمكنك متابعة حالتها من السجل.');
  }
}
