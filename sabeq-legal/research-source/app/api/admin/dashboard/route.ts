import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";

// Guest memo requests are saved in management_memo_requests, not service_records.
// Deduplicate registered-user activity when it was also mirrored to the request ledger.
export async function GET(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  const db = getD1();
  const [users, appointments, activities, recentAppointments, recentRecords, settings] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) AS suspended
      FROM public_users`).first(),
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed
      FROM consultation_requests`).first(),
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN service_type = 'memo' THEN 1 ELSE 0 END) AS memos,
      SUM(CASE WHEN service_type = 'assistant' THEN 1 ELSE 0 END) AS questions,
      SUM(CASE WHEN service_type = 'document_analysis' THEN 1 ELSE 0 END) AS analyses
      FROM (
        SELECT CASE WHEN service_type IN ('memo','memo_archive') THEN 'memo' ELSE service_type END AS service_type, created_at
        FROM service_records
        WHERE service_type NOT IN ('memo','memo_archive')
          OR COALESCE(metadata_json,'') NOT LIKE '%"managementRequestId"%'
        UNION ALL
        SELECT 'memo', created_at FROM management_memo_requests
      ) WHERE created_at >= datetime('now', 'start of month')`).first(),
    db.prepare(`SELECT id, name, email, phone, case_type, preferred_contact, status, created_at
      FROM consultation_requests ORDER BY created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT id, service_type, title, status, created_at, user_name, user_email
      FROM (
        SELECT 'memo:' || m.id AS id, 'memo' AS service_type,
          COALESCE(NULLIF(m.client_name,''),'طلب مذكرة') AS title,
          m.status, m.created_at,
          COALESCE(NULLIF(u.name,''), NULLIF(m.client_name,''), 'ضيف') AS user_name,
          COALESCE(NULLIF(m.email,''), u.email, '') AS user_email
        FROM management_memo_requests m LEFT JOIN public_users u ON u.id = m.user_id
        UNION ALL
        SELECT 'legacy:' || r.id, r.service_type, r.title, r.status, r.created_at,
          COALESCE(u.name,'ضيف'), COALESCE(u.email,'')
        FROM service_records r LEFT JOIN public_users u ON u.id = r.user_id
        WHERE r.service_type NOT IN ('memo','memo_archive')
          OR COALESCE(r.metadata_json,'') NOT LIKE '%"managementRequestId"%'
      ) ORDER BY created_at DESC LIMIT 8`).all(),
    db.prepare(`SELECT service_key, enabled, payment_required, price_fils, currency, updated_at
      FROM service_settings ORDER BY service_key`).all(),
  ]);
  return adminJson({
    users: users || { total: 0, active: 0, suspended: 0 },
    appointments: appointments || { total: 0, pending: 0, confirmed: 0 },
    activities: activities || { total: 0, memos: 0, questions: 0, analyses: 0 },
    recentAppointments: recentAppointments.results,
    recentRecords: recentRecords.results,
    settings: settings.results,
  });
}
