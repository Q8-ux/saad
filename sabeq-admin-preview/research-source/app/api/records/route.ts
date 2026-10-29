import { requireAdminPermission } from "@/lib/admin-auth";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET(request: Request) {
  const authorization = await requireAdminPermission("records.view");
  if ("response" in authorization) return authorization.response;
  return forwardPublicResponse(await callPublicService(`/api/admin/records${new URL(request.url).search}`));
}

