import { managerMemos } from "@/lib/management-data";

// Read-only bridge: validate the current admin session before reading private memo data.
export const dynamic = "force-dynamic";
const adminVerifyUrl = "https://tuhxdirrffnxtosqaoiq.supabase.co/functions/v1/admin-verify";
const maxBodyBytes = 2048;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
async function hasAdminSession(request: Request) {
  const match = /^Bearer ([A-Za-z0-9._~-]{16,256})$/.exec(request.headers.get("authorization") || "");
  if (!match) return false;
  try {
    const response = await fetch(adminVerifyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: match[1] }), redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return false;
    const raw = await response.text();
    if (raw.length > 4096) return false;
    const session = JSON.parse(raw);
    return session?.valid === true && ["super_admin", "admin", "operations_supervisor"].includes(session.role);
  } catch { return false; }
}
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > maxBodyBytes) return json({ error: "Payload too large" }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBodyBytes) return json({ error: "Payload too large" }, 413);
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Invalid request" }, 400); }
  catch { return json({ error: "Invalid request" }, 400); }
  if (!(await hasAdminSession(request))) return json({ error: "Unauthorized" }, 401);
  try {
    if (payload.action === "list") {
      const offset = payload.offset ?? 0;
      if (!Number.isSafeInteger(offset) || Number(offset) < 0 || Number(offset) > 100000) return json({ error: "Invalid pagination" }, 400);
      const result = await managerMemos(new URL("https://sabeq-legal-public.centrino.chatgpt.site/api/management/memos?offset=" + String(offset)));
      const records = (result.memos || []).slice(0, 50).map((row: Record<string, unknown>) => ({ id: row.id, client_name: row.client_name || "", case_type: row.case_type || "", case_number: row.case_number || "", status: row.status || "", created_at: row.created_at || "", updated_at: row.updated_at || "", has_output: row.has_output === true || row.has_output === 1, source: row.source || "hosted" }));
      return json({ success: true, memos: records, hasMore: result.hasMore === true, offset: result.offset || 0, source: "sabeq-site" });
    }
    if (payload.action === "get") {
      const id = payload.id;
      if (typeof id !== "string" || !/^(?:official:|legacy:)?[a-zA-Z0-9_-]{8,96}$/.test(id)) return json({ error: "Invalid memo ID" }, 400);
      const result = await managerMemos(new URL("https://sabeq-legal-public.centrino.chatgpt.site/api/management/memos?id=" + encodeURIComponent(id)));
      const memo = result.memo as Record<string, unknown> | undefined;
      if (!memo) return json({ error: "Memo not found" }, 404);
      return json({ success: true, memo: { id: memo.id, client_name: memo.client_name || memo.title || "", case_type: memo.case_type || memo.service_type || "", case_number: memo.case_number || "", status: memo.status || "", created_at: memo.created_at || "", has_output: typeof memo.output_text === "string" && memo.output_text.trim().length > 0, output_text: typeof memo.output_text === "string" ? memo.output_text.slice(0, 140000) : "", source: memo.source || "hosted" } });
    }
    return json({ error: "Unknown action" }, 400);
  } catch { return json({ error: "Memo source unavailable" }, 502); }
}
export async function GET() { return json({ error: "Method not allowed" }, 405); }
