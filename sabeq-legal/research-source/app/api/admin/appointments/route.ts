import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { cleanString, readJsonObject, RequestError } from "@/lib/request-security";

const allowedStatuses = new Set(["new", "confirmed", "completed", "cancelled"]);

export async function GET(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  const status = (new URL(request.url).searchParams.get("status") || "").trim();
  const rows = await getD1().prepare(
    `SELECT id, user_id, name, phone, email, case_type, preferred_contact, message, language, status, created_at
     FROM consultation_requests WHERE (? = '' OR status = ?) ORDER BY created_at DESC LIMIT 150`,
  ).bind(status, status).all();
  return adminJson({ appointments: rows.results });
}

export async function POST(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  try {
    const data = await readJsonObject(request, 4_000);
    const id = Number(data.id);
    const status = cleanString(data.status, "الحالة", { min: 3, max: 30 });
    if (!Number.isInteger(id) || id < 1 || !allowedStatuses.has(status)) throw new RequestError("بيانات الموعد غير صحيحة.");
    const result = await getD1().prepare("UPDATE consultation_requests SET status = ? WHERE id = ?").bind(status, id).run();
    if (!result.meta.changes) return adminJson({ error: "الموعد غير موجود." }, 404);
    return adminJson({ ok: true });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "تعذر تحديث الموعد." }, error instanceof RequestError ? error.status : 400);
  }
}
