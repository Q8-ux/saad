import { requireServiceEnabled } from "@/lib/service-settings";
import {boundLegislation} from '@/lib/bound-legislation';
import {privateJson,corsPreflight,enforceRateLimit,assertSameOrigin,errorResponse} from '@/lib/request-security';
export const OPTIONS=corsPreflight;
export async function GET(request:Request){try{await requireServiceEnabled("library",request);assertSameOrigin(request);await enforceRateLimit(request,'bound-corpus-info',120,'hour');const index=await boundLegislation();return privateJson({sourceVerification:index.metadata,documents:index.documents.map(d=>({id:d.id,title:d.title,startPage:d.start,endPage:d.end})),notice:'اختر القسم ورقم المادة عبر /api/legal/corpus/search. لا يعتمد رقم قانون أو سنة من الاستخراج الآلي دون مراجعة.'});}catch(e){return errorResponse(e);}}
