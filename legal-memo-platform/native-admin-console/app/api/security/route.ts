import { getD1 } from "@/db";
import { adminResponse, requireAdminPermission } from "@/lib/admin-auth";
import { callPublicService } from "@/lib/public-service";

export async function GET() {
  const authorization = await requireAdminPermission("security.view");
  if ("response" in authorization) return authorization.response;

  const [adminEvents, adminTotals, publicResponse] = await Promise.all([
    getD1().prepare(
      `SELECT id, event_type, severity, route, staff_email, detail_code, created_at
       FROM admin_security_events ORDER BY created_at DESC LIMIT 100`,
    ).all(),
    getD1().prepare(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 ELSE 0 END) AS last_day,
        SUM(CASE WHEN severity = 'critical' AND created_at > datetime('now', '-24 hours') THEN 1 ELSE 0 END) AS critical_last_day
       FROM admin_security_events`,
    ).first(),
    callPublicService("/api/admin/security"),
  ]);

  let publicSecurity: unknown = { events: [], totals: { total: 0, last_day: 0, critical_last_day: 0 }, unavailable: true };
  if (publicResponse.ok) publicSecurity = await publicResponse.json().catch(() => publicSecurity);
  return adminResponse({ admin: { events: adminEvents.results, totals: adminTotals }, public: publicSecurity });
}
