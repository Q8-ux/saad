import { getD1 } from "@/db";
import { digest } from "@/lib/management-auth";
import { cleanMultiline, cleanString, RequestError } from "@/lib/request-security";

function requestId(value: unknown) {
  const id = cleanString(value, "معرف الطلب", { min: 1, max: 100 });
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("تعديل الأرشيف السابق غير متاح من هذا المسار.", 409);
  return id;
}
export async function memoEditState(id: string, output: string, status: string) {
  const row = await getD1().prepare("SELECT COALESCE(MAX(revision),0) AS revision FROM management_memo_revisions WHERE request_id = ?").bind(id).first<{ revision: number }>();
  return { revision: Number(row?.revision || 0), hash: await digest(output), editable: Boolean(output.trim()) && status !== "running" };
}
export async function readMemoRevision(url: URL) {
  const id = requestId(url.searchParams.get("id"));
  if (!(await getD1().prepare("SELECT id FROM management_memo_requests WHERE id = ?").bind(id).first())) throw new RequestError("المذكرة غير موجودة.", 404);
  const raw = url.searchParams.get("revision");
  if (raw !== null) {
    const revision = Number(raw);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new RequestError("رقم النسخة غير صحيح.");
    const row = await getD1().prepare("SELECT revision, before_text, after_text, before_status, before_error_code, created_by, created_at FROM management_memo_revisions WHERE request_id = ? AND revision = ?").bind(id, revision).first();
    if (!row) throw new RequestError("النسخة غير موجودة.", 404);
    return { revision: row };
  }
  return { revisions: (await getD1().prepare("SELECT revision, created_by, created_at FROM management_memo_revisions WHERE request_id = ? ORDER BY revision DESC LIMIT 200").bind(id).all()).results };
}
export async function saveMemoRevision(data: Record<string, unknown>, actor: string) {
  if (Object.keys(data).some(key => !["id", "text", "expectedHash", "expectedRevision"].includes(key))) throw new RequestError("بيانات تعديل المذكرة غير صحيحة.");
  const id = requestId(data.id), text = cleanMultiline(data.text, "المذكرة المصححة", { min: 80, max: 100_000 });
  if (typeof data.expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(data.expectedHash) || !Number.isSafeInteger(data.expectedRevision) || Number(data.expectedRevision) < 0) throw new RequestError("أعد فتح المذكرة قبل حفظ تعديلها.", 409);
  const db = getD1(), row = await db.prepare("SELECT output_text, status, error_code FROM management_memo_requests WHERE id = ?").bind(id).first<{ output_text: string; status: string; error_code: string }>();
  if (!row) throw new RequestError("المذكرة غير موجودة.", 404);
  const state = await memoEditState(id, row.output_text, row.status);
  if (!state.editable) throw new RequestError("لا يوجد نص محفوظ قابل للتعديل أو أن التوليد لم ينته بعد.", 409);
  if (state.hash !== data.expectedHash || state.revision !== data.expectedRevision) throw new RequestError("تغيرت المذكرة منذ فتحها. انسخ تعديلك ثم أعد فتح النسخة الأحدث.", 409);
  if (text === row.output_text) return { ok: true, unchanged: true, revision: state.revision };
  const revision = state.revision + 1, changeId = crypto.randomUUID();
  // D1 batch is atomic; both statements compare the unchanged source.
  const result = await db.batch([
    db.prepare(`INSERT INTO management_memo_revisions (id, request_id, revision, before_text, after_text, before_status, before_error_code, created_by)
      SELECT ?, id, ?, output_text, ?, status, error_code, ? FROM management_memo_requests
      WHERE id = ? AND output_text = ? AND status = ? AND error_code = ?
      AND (SELECT COALESCE(MAX(revision),0) FROM management_memo_revisions WHERE request_id = ?) = ?`)
      .bind(changeId, revision, text, actor, id, row.output_text, row.status, row.error_code, id, state.revision),
    db.prepare(`UPDATE management_memo_requests SET output_text = ?, status = 'needs_review', error_code = 'manual_revision', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND output_text = ? AND EXISTS (SELECT 1 FROM management_memo_revisions WHERE id = ?)`)
      .bind(text, id, row.output_text, changeId),
  ]);
  if (result[0].meta.changes !== 1 || result[1].meta.changes !== 1) throw new RequestError("تغيرت المذكرة أثناء الحفظ. احتفظ بتعديلك وأعد فتح النسخة الأحدث.", 409);
  return { ok: true, revision };
}
