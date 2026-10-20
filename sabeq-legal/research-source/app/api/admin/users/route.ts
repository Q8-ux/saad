import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { listManagedUsers, updateManagedUser } from "@/lib/user-management";
import { readJsonObject, RequestError } from "@/lib/request-security";

export async function GET(request: Request) {
  const denied = requireAdminService(request);
  if (denied) return denied;
  try { return adminJson(await listManagedUsers(new URL(request.url))); }
  catch (error) { return adminJson({ error: error instanceof RequestError ? error.message : "تعذر قراءة المستخدمين." }, error instanceof RequestError ? error.status : 503); }
}
export async function POST(request: Request) {
  const denied = requireAdminService(request);
  if (denied) return denied;
  try { return adminJson(await updateManagedUser(await readJsonObject(request, 8_000))); }
  catch (error) { return adminJson({ error: error instanceof RequestError ? error.message : "تعذر تحديث المستخدم." }, error instanceof RequestError ? error.status : 503); }
}
