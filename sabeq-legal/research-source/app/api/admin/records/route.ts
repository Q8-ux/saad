import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";

// The public memo endpoint persists guest and paid requests before generation
// in management_memo_requests. Do not confuse this ledger with service_records.
export async function GET(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const rawType = (url.searchParams.get("type") || "").trim().slice(0, 50);
  const type = rawType === "memo_archive" ? "memo" : rawType;
  const requestedLimit = Number(url.searchParams.get("limit") || 50);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
  const rows = await getD1().prepare(`SELECT * FROM (
    SELECT 'memo:' || m.id AS id, 'memo' AS service_type,
      COALESCE(NULLIF(m.client_name,''),'طلب مذكرة') AS title,
      COALESCE(m.input_json,'') AS input_text,
      COALESCE(m.output_text,'') AS output_text, '{}' AS metadata_json,
      m.status, m.created_at,
      m.user_id,
      COALESCE(NULLIF(u.name,''),NULLIF(m.client_name,''),'ضيف') AS user_name,
      COALESCE(NULLIF(m.email,''),u.email,'') AS user_email,
      COALESCE(u.phone,'') AS user_phone
    FROM management_memo_requests m LEFT JOIN public_users u ON m.user_id = u.id
    UNION ALL
    SELECT 'legacy:' || r.id,
      CASE WHEN r.service_type IN ('memo','memo_archive') THEN 'memo' ELSE r.service_type END AS service_type,
      r.title, r.input_text, r.output_text, COALESCE(r.metadata_json,'{}'),
      r.status, r.created_at, r.user_id,
      COALESCE(u.name,'ضيف'), COALESCE(u.email,''), COALESCE(u.phone,'')
    FROM service_records r LEFT JOIN public_users u ON u.id = r.user_id
    WHERE r.service_type NOT IN ('memo','memo_archive')
       OR COALESCE(r.metadata_json,'') NOT LIKE '%"managementRequestId"%'
  ) WHERE (? = '' OR service_type = ?)
    ORDER BY created_at DESC, id LIMIT ?`)
    .bind(type, type, limit).all();
  return adminJson({ records: rows.results });
}
