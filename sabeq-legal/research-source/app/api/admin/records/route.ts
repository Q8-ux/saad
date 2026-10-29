import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";

export async function GET(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "").trim().slice(0, 50);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 50)));
  const rows = await getD1().prepare(
    `SELECT r.id, r.service_type, r.title, r.input_text, r.output_text, r.metadata_json, r.status, r.created_at,
      u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM service_records r INNER JOIN public_users u ON u.id = r.user_id
     WHERE (? = '' OR r.service_type = ?)
     ORDER BY r.created_at DESC LIMIT ?`,
  ).bind(type, type, limit).all();
  return adminJson({ records: rows.results });
}
