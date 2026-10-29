import { getD1 } from "@/db";
import { adminResponse, requireAdminPermission } from "@/lib/admin-auth";

export async function GET() {
  const authorization = await requireAdminPermission("audit.view");
  if ("response" in authorization) return authorization.response;
  const rows = await getD1().prepare(
    `SELECT id, staff_email, action, target_type, target_id, details_json, created_at
     FROM admin_audit ORDER BY created_at DESC LIMIT 300`,
  ).all();
  return adminResponse({ audit: rows.results });
}
