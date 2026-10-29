import { requireAdminPermission, writeAudit } from "@/lib/admin-auth";
import { assertAdminOrigin, readAdminJson } from "@/lib/admin-security";
import { callPublicService, forwardPublicResponse } from "@/lib/public-service";

export async function GET() {
  const authorization = await requireAdminPermission("payments.view");
  if ("response" in authorization) return authorization.response;
  return forwardPublicResponse(await callPublicService("/api/admin/sadad"));
}

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("payments.manage");
  if ("response" in authorization) return authorization.response;
  try { assertAdminOrigin(request); } catch { return Response.json({ error: "تعذر التحقق من مصدر الطلب." }, { status: 403 }); }

  try {
    const data = await readAdminJson(request, 20_000);
    const safeBody = JSON.stringify(data);
    const upstream = await callPublicService("/api/admin/sadad", { method: "POST", body: safeBody });
    if (upstream.ok) {
      await writeAudit(
        authorization.session.staff.email,
        data.action === "test" ? "payment.tested" : "payment.updated",
        "payment_gateway",
        typeof data.provider === "string" ? data.provider : "primary",
        { action: data.action, provider: data.provider, mode: data.mode, enabled: Boolean(data.enabled) },
      );
    }
    return forwardPublicResponse(upstream);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تنفيذ الطلب." }, { status: 400 });
  }
}
