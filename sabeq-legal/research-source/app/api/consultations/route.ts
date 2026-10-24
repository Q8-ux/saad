import { reserveConsultation } from "@/lib/management-appointments";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;
export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request,"office-consultation-booking",6,"hour");
    const data=await readJsonObject(request,10_000);
    return privateJson(await reserveConsultation(data));
  }catch(error){return errorResponse(error);}
}
