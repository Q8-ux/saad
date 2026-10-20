import { getD1 } from "@/db";
import { cleanString, RequestError } from "@/lib/request-security";

export async function listManagedUsers(url: URL, limit = 100) {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const status = url.searchParams.get("status") || "";
  if (status && !["active", "suspended"].includes(status)) throw new RequestError("حالة المستخدم غير صحيحة.");
  const offset = Number(url.searchParams.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) throw new RequestError("رقم الصفحة غير صحيح.");
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const result = await getD1().prepare(`SELECT u.id, u.name, u.phone, u.email, u.status, u.memo_limit, u.assistant_limit, u.email_verified_at, u.created_at,
    (SELECT COUNT(*) FROM service_records r WHERE r.user_id = u.id AND r.service_type = 'memo' AND r.created_at >= datetime('now','start of month')) AS memo_used,
    (SELECT COUNT(*) FROM service_records r WHERE r.user_id = u.id AND r.service_type = 'assistant' AND r.created_at >= datetime('now','start of month')) AS assistant_used
    FROM public_users u WHERE (? = '' OR u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.phone LIKE ? ESCAPE '\\') AND (? = '' OR u.status = ?)
    ORDER BY u.created_at DESC, u.id LIMIT ? OFFSET ?`).bind(q, pattern, pattern, pattern, status, status, limit + 1, offset).all();
  return { users: result.results.slice(0, limit), hasMore: result.results.length > limit, offset, source: "hosted" };
}
export async function updateManagedUser(data: Record<string, unknown>) {
  const id = cleanString(data.id, "المستخدم", { min: 20, max: 80 });
  const db = getD1();
  const existing = await db.prepare("SELECT name, phone, status, memo_limit, assistant_limit FROM public_users WHERE id = ?").bind(id).first<{ name: string; phone: string; status: string; memo_limit: number; assistant_limit: number }>();
  if (!existing) throw new RequestError("المستخدم غير موجود.", 404);
  const status = data.status === undefined ? existing.status : data.status;
  if (status !== "active" && status !== "suspended") throw new RequestError("حالة المستخدم غير صحيحة.");
  const name = data.name === undefined ? existing.name : cleanString(data.name, "الاسم", { min: 2, max: 120 });
  const phone = data.phone === undefined ? existing.phone : cleanString(data.phone, "الهاتف", { max: 40, required: false });
  if (data.email !== undefined || data.role !== undefined) throw new RequestError("لا يمكن تعديل البريد أو منح صلاحية إدارة من هذا النموذج.");
  for (const key of ["memoLimit", "assistantLimit"]) {
    const value = data[key];
    if (value !== undefined && !(typeof value === "number" || (typeof value === "string" && /^-?\d+$/.test(value)))) throw new RequestError("حدود الاستخدام غير صحيحة.");
  }
  const memoLimit = data.memoLimit === undefined ? existing.memo_limit : Number(data.memoLimit);
  const assistantLimit = data.assistantLimit === undefined ? existing.assistant_limit : Number(data.assistantLimit);
  if (!Number.isInteger(memoLimit) || memoLimit < -1 || memoLimit > 500 || !Number.isInteger(assistantLimit) || assistantLimit < -1 || assistantLimit > 5000) throw new RequestError("حدود الاستخدام غير صحيحة.");
  const statements = [db.prepare("UPDATE public_users SET name = ?, phone = ?, status = ?, memo_limit = ?, assistant_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, phone, status, memoLimit, assistantLimit, id)];
  if (status === "suspended") statements.push(db.prepare("DELETE FROM public_user_sessions WHERE user_id = ?").bind(id));
  await db.batch(statements);
  return { ok: true };
}
