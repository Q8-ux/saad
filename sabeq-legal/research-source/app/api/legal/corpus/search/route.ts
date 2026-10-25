import { requireServiceEnabled } from "@/lib/service-settings";
import {boundLegislation} from '@/lib/bound-legislation';
import {privateJson,RequestError,errorResponse,enforceRateLimit,corsPreflight,assertSameOrigin} from '@/lib/request-security';
export const OPTIONS=corsPreflight;
export async function GET(request:Request){try{await requireServiceEnabled("library",request);
 assertSameOrigin(request);await enforceRateLimit(request,'bound-legislation-search',90,'hour');
 const q=new URL(request.url).searchParams,query=(q.get('q')||'').trim(),article=q.get('article')||undefined,documentId=q.get('documentId')||undefined;
 if(query.length>300||(!article&&query.length<2)||article&&article.length>30||documentId&&documentId.length>100)throw new RequestError('عبارة البحث أو المرشح غير صحيح.');
 if(article&&!documentId)throw new RequestError('حدد قسم التشريع عند البحث برقم المادة؛ قد يتكرر الرقم بين القوانين.');
 const started=performance.now(),index=await boundLegislation();if(documentId&&!index.documents.some(d=>d.id===documentId))throw new RequestError('قسم غير موجود في الملف.',404);
 const results=index.search(query,8,{documentId,articleNumber:article});
 return privateJson({metadata:index.metadata,results,status:results.length?'extracted_needs_review':'not_found_in_bound_file',message:results.length?'نصوص مستخرجة تحتاج المراجعة.':'غير موجود في الملف المتاح',timing:{searchMs:Math.round(performance.now()-started)},currentLawVerified:false});
 }catch(e){return errorResponse(e);}}
