import { getD1 } from "@/db";

export async function startMemoRequest(input: Record<string, unknown>, user: { id: string; email: string } | null, origin: string) {
  const id = crypto.randomUUID();
  await getD1().prepare("INSERT INTO management_memo_requests (id, user_id, client_name, email, case_type, case_number, input_json, origin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running')")
    .bind(id, user?.id || null, String(input.clientName || "").slice(0, 200), user?.email || "", String(input.caseType || "").slice(0, 160), String(input.caseNumber || "").slice(0, 120), JSON.stringify(input).slice(0, 180_000), origin.slice(0, 200)).run();
  return id;
}
type MemoStatus = "needs_information" | "review_pending" | "needs_review" | "generated" | "failed" | "cancelled";
function checkedOutput(output: string) {
  if (typeof output !== "string" || !output.trim() || output.length > 140_000) throw Error("memo_invalid_output");
  return output;
}
function updateStatement(db: ReturnType<typeof getD1>, id: string, status: MemoStatus, output: string, code: string) {
  if (status === "needs_review" || status === "generated") checkedOutput(output);
  // A downstream failure is metadata, never an instruction to erase a saved draft.
  return db.prepare(`UPDATE management_memo_requests SET
    status = CASE WHEN trim(?) = '' AND length(trim(output_text)) > 0 THEN status ELSE ? END,
    output_text = CASE WHEN trim(?) = '' THEN output_text ELSE ? END,
    error_code = CASE WHEN trim(?) = '' AND length(trim(output_text)) > 0 THEN error_code ELSE ? END,
    updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(output.trim() ? output : "", status, output.trim() ? output : "", output, output.trim() ? output : "", code.slice(0, 80), id);
}
async function verifySaved(db: ReturnType<typeof getD1>, id: string, output: string) {
  const row = await db.prepare("SELECT output_text, status FROM management_memo_requests WHERE id = ?").bind(id).first<{output_text:string;status:string}>();
  if (!row || (output.trim() && (row.output_text !== output || !["needs_review", "generated"].includes(row.status)))) throw Error("memo_persistence_unconfirmed");
}
export async function finishMemoRequest(id: string, status: MemoStatus, output = "", code = "") {
  const db = getD1();
  await updateStatement(db, id, status, output, code).run();
  await verifySaved(db, id, output);
}
export async function completeMemoRequest(id: string, output: string, history?: {userId:string;title:string;inputText:string;metadata:Record<string,unknown>}) {
  checkedOutput(output);
  const db = getD1(), statements = [updateStatement(db,id,"needs_review",output,"draft_generated")];
  if (history) statements.push(db.prepare(`INSERT INTO service_records (id,user_id,service_type,title,input_text,output_text,metadata_json,status)
    SELECT ?,user_id,'memo',?,?,output_text,?,'completed' FROM management_memo_requests WHERE id = ? AND user_id = ?
    ON CONFLICT(id) DO UPDATE SET output_text=excluded.output_text, metadata_json=excluded.metadata_json`)
    .bind("memo:"+id,history.title.slice(0,240),history.inputText.slice(0,50_000),JSON.stringify({...history.metadata,managementRequestId:id}),id,history.userId));
  // D1 batch is transactional: the ledger and optional user archive commit together.
  await db.batch(statements);
  await verifySaved(db,id,output);
}
