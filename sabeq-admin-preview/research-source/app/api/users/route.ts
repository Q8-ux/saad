import { requireAdminPermission, writeAudit } from "@/lib/admin-auth";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET(request: Request) {
  const authorization = await requireAdminPermission("users.view");
  if ("response" in authorization) return authorization.response;
  const query = new URL(request.url).search;
  return forwardPublicResponse(await callPublicService(`/api/admin/users${query}`));
}

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("users.manage");
  if ("response" in authorization) return authorization.response;
  const body = await request.text();
  const upstream = await callPublicService("/api/admin/users", { method: "POST", body });
  if (upstream.ok) {
    let targetId = "";
    try { targetId = String(JSON.parse(body).id || ""); } catch { /* ignore malformed audit detail */ }
    await writeAudit(authorization.session.staff.email, "user.updated", "public_user", targetId);
  }
  return forwardPublicResponse(upstream);
}

