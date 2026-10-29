import { requireAdminPermission } from "@/lib/admin-auth";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET() {
  const authorization = await requireAdminPermission("dashboard.view");
  if ("response" in authorization) return authorization.response;
  return forwardPublicResponse(await callPublicService("/api/admin/dashboard"));
}

