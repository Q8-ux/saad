import { availableAppointments } from "@/lib/management-appointments";
import { errorResponse, corsPreflight, privateJson } from "@/lib/request-security";
export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;
export async function GET() {
  try { return privateJson(await availableAppointments()); }
  catch(error){ return errorResponse(error); }
}
