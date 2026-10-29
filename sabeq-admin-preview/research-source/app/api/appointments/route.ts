import { requireAdminPermission, writeAudit } from "@/lib/admin-auth";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET(request: Request) {
  const authorization = await requireAdminPermission("appointments.view");
  if ("response" in authorization) return authorization.response;
  return forwardPublicResponse(await callPublicService(`/api/admin/appointments${new URL(request.url).search}`));
}

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("appointments.manage");
  if ("response" in authorization) return authorization.response;
  const body = await request.text();
  const upstream = await callPublicService("/api/admin/appointments", { method: "POST", body });
  if (upstream.ok) {
    let targetId = "";
    try { targetId = String(JSON.parse(body).id || ""); } catch { /* ignore malformed audit detail */ }
    await writeAudit(authorization.session.staff.email, "appointment.updated", "appointment", targetId);
  }
  return forwardPublicResponse(upstream);
}

