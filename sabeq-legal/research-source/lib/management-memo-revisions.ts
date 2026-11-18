import { getD1 } from "@/db";
import { digest } from "@/lib/management-auth";
import { cleanMultiline, cleanString, RequestError } from "@/lib/request-security";

function requestId(value: unknown) {
  const id = cleanString(value, "معرف الطلب", { min: 1, max: 100 });
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RequestError("تعديل الأرشيف السابق غير متاح من هذا المسار.", 409);
  return id;
}
type MemoRequestText = { output_text: string; status: string; error_code: string; input_json: string };

const linkedMemoText = `SELECT output_text, 'service_records.output_text' AS content_source FROM service_records
  WHERE service_type IN ('memo','memo_archive')
  AND CASE WHEN json_valid(metadata_json) THEN json_extract(metadata_json,'$.managementRequestId') END = ?
  UNION ALL
  SELECT json_extract(result_json,'$.memo'), 'sadad_payments.result_json' FROM sadad_payments
  WHERE CASE WHEN json_valid(result_json) THEN json_extract(result_json,'$.requestId') END = ?`;

function hasDraftInputs(input: string) {
  try {
    const data = JSON.parse(input);
    return typeof data?.facts === "string" && data.facts.trim().length >= 20 &&
      typeof data.requests === "string" && data.requests.trim().length >= 5;
  } catch {
    return false;
  }
}

export async function memoEditState(id: string, row: MemoRequestText) {
  const db = getD1();
  const latest = await db.prepare("SELECT revision, after_text FROM management_memo_revisions WHERE request_id = ? ORDER BY revision DESC LIMIT 1")
    .bind(id).first<{ revision: number; after_text: string }>();
  const revision = latest?.revision || 0, stored = row.output_text.trim() !== "";
  let output_text = stored ? row.output_text : latest?.after_text || "";
  let content_source = stored ? "request.output_text" : output_text.trim() ? "management_memo_revisions.after_text" : null;
  if (!stored && !latest) {
    const { results } = await db.prepare(linkedMemoText).bind(id, id).all<{ output_text: unknown; content_source: string }>();
    for (const candidate of results) {
      if (typeof candidate.output_text !== "string" || !candidate.output_text.trim()) {
        throw new RequestError("تعذّر قراءة نسخة محفوظة مرتبطة بالطلب.", 409);
      }
      if (output_text.trim() && output_text !== candidate.output_text) {
        throw new RequestError("توجد نسخ محفوظة مختلفة مرتبطة بالطلب. يلزم تحديد النسخة الصحيحة.", 409);
      }
      output_text = candidate.output_text;
      content_source = candidate.content_source;
    }
  }
  const attachable = !content_source && revision === 0 &&
    ["failed", "needs_review", "review_pending"].includes(row.status) && hasDraftInputs(row.input_json);
  const hash = await digest(attachable ? JSON.stringify([row.output_text, row.status, row.error_code, row.input_json]) : row.output_text);
  return { output_text, content_source, edit: { revision, hash, editable: stored && row.status !== "running", attachable } };
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
  if (Object.keys(data).some(key => !["id", "text", "expectedHash", "expectedRevision", "attachDraft"].includes(key)) ||
    (Object.hasOwn(data, "attachDraft") && data.attachDraft !== true)) throw new RequestError("بيانات تعديل المذكرة غير صحيحة.");
  const attachDraft = data.attachDraft === true;
  const id = requestId(data.id), text = cleanMultiline(data.text, "المذكرة المصححة", { min: 80, max: 100_000 });
  if (typeof data.expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(data.expectedHash) || !Number.isSafeInteger(data.expectedRevision) || Number(data.expectedRevision) < 0) throw new RequestError("أعد فتح المذكرة قبل حفظ تعديلها.", 409);
  const db = getD1(), row = await db.prepare("SELECT output_text, status, error_code, input_json FROM management_memo_requests WHERE id = ?").bind(id).first<MemoRequestText>();
  if (!row) throw new RequestError("المذكرة غير موجودة.", 404);
  const { edit: state } = await memoEditState(id, row);
  if (!(attachDraft ? state.attachable : state.editable)) throw new RequestError("حالة الطلب الحالية لا تسمح بحفظ النص بهذه الطريقة.", 409);
  if (state.hash !== data.expectedHash || state.revision !== data.expectedRevision) throw new RequestError("تغيرت المذكرة منذ فتحها. انسخ تعديلك ثم أعد فتح النسخة الأحدث.", 409);
  if (text === row.output_text) return { ok: true, unchanged: true, revision: state.revision };
  const revision = state.revision + 1, changeId = crypto.randomUUID();
  const attachCheck = attachDraft ? `AND input_json = ? AND NOT EXISTS (${linkedMemoText})` : "";
  const attachBindings = attachDraft ? [row.input_json, id, id] : [];
  // D1 batch is atomic; both statements compare the unchanged source.
  const result = await db.batch([
    db.prepare(`INSERT INTO management_memo_revisions (id, request_id, revision, before_text, after_text, before_status, before_error_code, created_by)
      SELECT ?, id, ?, output_text, ?, status, error_code, ? FROM management_memo_requests
      WHERE id = ? AND output_text = ? AND status = ? AND error_code = ?
      AND (SELECT COALESCE(MAX(revision),0) FROM management_memo_revisions WHERE request_id = ?) = ? ${attachCheck}`)
      .bind(changeId, revision, text, actor, id, row.output_text, row.status, row.error_code, id, state.revision, ...attachBindings),
    db.prepare(`UPDATE management_memo_requests SET output_text = ?, status = 'needs_review', error_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND output_text = ? AND EXISTS (SELECT 1 FROM management_memo_revisions WHERE id = ?)`)
      .bind(text, attachDraft ? "manual_draft" : "manual_revision", id, row.output_text, changeId),
  ]);
  if (result[0].meta.changes !== 1 || result[1].meta.changes !== 1) throw new RequestError("تغيرت المذكرة أثناء الحفظ. احتفظ بتعديلك وأعد فتح النسخة الأحدث.", 409);
  return { ok: true, revision };
}
