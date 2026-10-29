import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";

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
      FROM service_records
      WHERE created_at >= datetime('now', 'start of month')`).first(),
    db.prepare(`SELECT id, name, email, phone, case_type, preferred_contact, status, created_at
      FROM consultation_requests ORDER BY created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT r.id, r.service_type, r.title, r.status, r.created_at, u.name AS user_name, u.email AS user_email
      FROM service_records r INNER JOIN public_users u ON u.id = r.user_id
      ORDER BY r.created_at DESC LIMIT 8`).all(),
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
