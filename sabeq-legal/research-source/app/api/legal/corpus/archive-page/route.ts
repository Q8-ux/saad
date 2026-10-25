import { requireServiceEnabled } from "@/lib/service-settings";
import { archiveSourcePage } from '@/lib/legislation-workbench';
import { privateJson,errorResponse,enforceRateLimit,corsPreflight,assertSameOrigin,RequestError } from '@/lib/request-security';
export const OPTIONS=corsPreflight;
export async function GET(request:Request){try{await requireServiceEnabled("library",request);
 assertSameOrigin(request);await enforceRateLimit(request,'reviewed-archive-page',120,'hour');
 const raw=new URL(request.url).searchParams.get('page');if(!raw||!/^\d+$/.test(raw))throw new RequestError('رقم الصفحة غير صحيح.');
 return privateJson(await archiveSourcePage(Number(raw)));
}catch(e){return errorResponse(e);}}
