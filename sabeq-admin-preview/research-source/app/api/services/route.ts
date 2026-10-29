import { requireAdminPermission, writeAudit } from "@/lib/admin-auth";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET() {
  const authorization = await requireAdminPermission("services.view");
  if ("response" in authorization) return authorization.response;
  return forwardPublicResponse(await callPublicService("/api/admin/services"));
}

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("services.manage");
  if ("response" in authorization) return authorization.response;
  const body = await request.text();
  const upstream = await callPublicService("/api/admin/services", { method: "POST", body });
  if (upstream.ok) {
    let targetId = "";
    try { targetId = String(JSON.parse(body).serviceKey || ""); } catch { /* ignore malformed audit detail */ }
    await writeAudit(authorization.session.staff.email, "service.updated", "service", targetId);
  }
  return forwardPublicResponse(upstream);
}

