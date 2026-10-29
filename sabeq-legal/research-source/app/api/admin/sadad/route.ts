import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { sadadManagement } from "@/lib/sadad-payments";
import { readJsonObject, RequestError } from "@/lib/request-security";
export async function GET(request: Request) {
  const denied=await requireAdminService(request); if(denied) return denied;
  try { return adminJson(await sadadManagement(null,"administrative-service")); }
  catch(error) { return adminJson({error:error instanceof RequestError?error.message:"تعذر قراءة إعدادات سداد."},error instanceof RequestError?error.status:503); }
}
export async function POST(request: Request) {
  const denied=await requireAdminService(request); if(denied) return denied;
  try { return adminJson(await sadadManagement(await readJsonObject(request,20000),"administrative-service")); }
  catch(error) { return adminJson({error:error instanceof RequestError?error.message:"تعذر الاتصال بإعدادات سداد."},error instanceof RequestError?error.status:503); }
}
