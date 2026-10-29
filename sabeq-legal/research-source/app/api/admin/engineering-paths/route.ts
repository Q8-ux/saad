import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { engineeringPathStatus } from "@/lib/engineering-paths";
export async function GET(request: Request) {
  const denied=await requireAdminService(request); if(denied) return denied;
  try { return adminJson(await engineeringPathStatus()); }
  catch { return adminJson({error:"تعذر فحص الربط الإداري مؤقتاً."},503); }
}
