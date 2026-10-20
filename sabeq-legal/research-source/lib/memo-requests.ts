import { getD1 } from "@/db";

export async function startMemoRequest(input: Record<string, unknown>, user: { id: string; email: string } | null, origin: string) {
  const id = crypto.randomUUID();
  await getD1().prepare("INSERT INTO management_memo_requests (id, user_id, client_name, email, case_type, case_number, input_json, origin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running')")
    .bind(id, user?.id || null, String(input.clientName || "").slice(0, 200), user?.email || "", String(input.caseType || "").slice(0, 160), String(input.caseNumber || "").slice(0, 120), JSON.stringify(input).slice(0, 180_000), origin.slice(0, 200)).run();
  return id;
}
export async function finishMemoRequest(id: string, status: "needs_information" | "needs_review" | "generated" | "failed" | "cancelled", output = "", code = "") {
  await getD1().prepare("UPDATE management_memo_requests SET status = ?, output_text = ?, error_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, output.slice(0, 140_000), code.slice(0, 80), id).run();
}
