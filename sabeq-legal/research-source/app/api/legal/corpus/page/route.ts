import { requireServiceEnabled } from "@/lib/service-settings";
import {boundLegislation} from '@/lib/bound-legislation';
import {privateJson,RequestError,errorResponse,enforceRateLimit,corsPreflight,assertSameOrigin} from '@/lib/request-security';
export const OPTIONS=corsPreflight;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function GET(request:Request){try{await requireServiceEnabled("library",request);
 assertSameOrigin(request);await enforceRateLimit(request,'bound-source-page',120,'hour');
 const q=new URL(request.url).searchParams,n=Number(q.get('page'));
 if(!Number.isInteger(n)||n<1||n>1710)throw new RequestError('رقم الصفحة غير صحيح.');
 const p=(await boundLegislation()).page(n);if(!p)throw new RequestError('غير موجود في الملف المتاح.',404);
 if(q.get('format')==='json')return privateJson(p);
 const nav=[p.previousPage,p.nextPage].filter(Boolean).map(i=>`<a href="?page=${i}">صفحة ${i}</a>`).join(' · ');
 const html=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(p.title)} — صفحة ${n}</title><body><main><h1>${escape(p.title)}</h1><p>مسار التشريعات — صفحة PDF ${n}؛ المطبوعة ${escape(p.printed||'غير محددة')}</p><p>نص مستخرج من ملف المستخدم، يحتاج مراجعة الأصل والهوامش والحدود. لا يثبت سريان القانون أو اكتمال المادة. لا يوجد تحقق خارجي.</p><nav>${nav}</nav><pre style="white-space:pre-wrap;font-size:20px;line-height:1.9">${escape(p.text)}</pre>${p.ocr?`<h2>طبقة OCR مستقلة تحتاج مراجعة</h2><pre style="white-space:pre-wrap">${escape(p.ocr.text)}</pre>`:''}<small>بصمة المصدر: ${escape(p.sourceSha256)}</small></main></body></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Legal-Sources-Revision':'bound-legislation-20261015'}});
 }catch(e){return errorResponse(e);}}
