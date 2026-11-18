import { getD1 } from "@/db";
import { sendSavedDraft } from "@/lib/gmail";

export async function startMemoRequest(input: Record<string, unknown>, user: { id: string; email: string } | null, origin: string) {
  const id = crypto.randomUUID();
  await getD1().prepare("INSERT INTO management_memo_requests (id, user_id, client_name, email, case_type, case_number, input_json, origin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running')")
    .bind(id, user?.id || null, String(input.clientName || "").slice(0, 200), user?.email || "", String(input.caseType || "").slice(0, 160), String(input.caseNumber || "").slice(0, 120), JSON.stringify(input).slice(0, 180_000), origin.slice(0, 200)).run();
  return id;
}
export async function finishMemoRequest(id: string, status: "needs_information" | "needs_review" | "generated" | "failed" | "cancelled", output = "", code = "") {
  const saved = output.slice(0, 140_000), hasText = Boolean(saved.trim());
  const updated = await getD1().prepare(`UPDATE management_memo_requests SET status = ?, output_text = ?, error_code = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND error_code NOT IN ('manual_draft','manual_revision')
    AND (? = 1 OR length(trim(output_text, char(9)||char(10)||char(13)||' ')) = 0) RETURNING id`)
    .bind(status, saved, code.slice(0, 80), id, Number(hasText)).first();
  if (updated && hasText && (status === "generated" || status === "needs_review")) {
    try { await sendSavedDraft(id); }
    catch { console.error("gmail_draft_delivery_failed", { stage: "saved_draft_preserved" }); }
  }
}
