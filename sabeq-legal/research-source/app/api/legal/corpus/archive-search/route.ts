import { requireServiceEnabled } from "@/lib/service-settings";
import { searchArchiveForAssistant } from '@/lib/legislation-workbench';
import { privateJson,errorResponse,enforceRateLimit,corsPreflight,assertSameOrigin,RequestError } from '@/lib/request-security';
export const OPTIONS=corsPreflight;
export async function GET(request:Request){try{await requireServiceEnabled("library",request);
 assertSameOrigin(request);await enforceRateLimit(request,'reviewed-archive-search',90,'hour');
 const q=(new URL(request.url).searchParams.get('q')||'').trim();if(q.length<2||q.length>300)throw new RequestError('عبارة البحث غير صحيحة.');
 const results=await searchArchiveForAssistant(q,4);
 return privateJson({results,status:results.length?'visually_verified_fields':'not_found_in_verified_fields',currentLawVerified:false,draftingEligible:false});
}catch(e){return errorResponse(e);}}
