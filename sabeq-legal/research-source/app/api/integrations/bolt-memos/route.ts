import { env } from "cloudflare:workers";
import { managerMemos } from "@/lib/management-data";

// Private, read-only server-to-server bridge. Never expose this endpoint's
// signing secret, private submissions, or response through a public CORS route.
export const dynamic = "force-dynamic";
const maxBodyBytes = 4096;
const allowedAgeSeconds = 60;
const encoder = new TextEncoder();
const json = (value: unknown, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" },
});
function equalHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function signature(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const secret = (env as unknown as { SABEQ_BOLT_MEMO_BRIDGE_SECRET?: string }).SABEQ_BOLT_MEMO_BRIDGE_SECRET || "";
  if (secret.length < 32) return json({ error: "Memo bridge not configured" }, 503);
  const timestamp = request.headers.get("x-sabeq-timestamp") || "";
  const supplied = request.headers.get("x-sabeq-signature") || "";
  const epoch = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d{10}$/.test(timestamp) || !Number.isSafeInteger(epoch) || Math.abs(now - epoch) > allowedAgeSeconds || !/^[a-f0-9]{64}$/.test(supplied)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBodyBytes) return json({ error: "Payload too large" }, 413);
  const body = await request.text();
  if (encoder.encode(body).length > maxBodyBytes) return json({ error: "Payload too large" }, 413);
  if (!equalHex(supplied, await signature(secret, timestamp + "." + body))) return json({ error: "Unauthorized" }, 401);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Invalid request" }, 400);
  } catch { return json({ error: "Invalid request" }, 400); }

  try {
    if (payload.action === "list") {
      const offset = payload.offset;
      if (offset !== undefined && (!Number.isSafeInteger(offset) || Number(offset) < 0 || Number(offset) > 100_000)) return json({ error: "Invalid pagination" }, 400);
      // Include running, failed and review-pending requests as well as completed memos.
      const params = new URLSearchParams({ offset: String(offset || 0) });
      const url = new URL("https://sabeq.legal/api/management/memos?" + params);
      const result = await managerMemos(url);
      // Do not transfer form inputs or draft content as part of the list.
      const records = (result.memos || []).slice(0, 50).map((row: Record<string, unknown>) => ({
        id: row.id, client_name: row.client_name || "", case_type: row.case_type || "",
        case_number: row.case_number || "", status: row.status || "", created_at: row.created_at || "",
        updated_at: row.updated_at || "", has_output: row.has_output === true || row.has_output === 1, source: row.source || "hosted",
      }));
      return json({ success: true, memos: records, hasMore: result.hasMore === true, offset: result.offset || 0, source: "sabeq-site" });
    }
    if (payload.action === "get") {
      const id = payload.id;
      if (typeof id !== "string" || !/^(?:official:|legacy:)?[a-zA-Z0-9_-]{8,96}$/.test(id)) return json({ error: "Invalid memo ID" }, 400);
      const url = new URL("https://sabeq.legal/api/management/memos?id=" + encodeURIComponent(id));
      const result = await managerMemos(url);
      const memo = result.memo as Record<string, unknown>;
      return json({ success: true, memo: {
        id: memo.id, client_name: memo.client_name || memo.title || "", case_type: memo.case_type || memo.service_type || "",
        case_number: memo.case_number || "", status: memo.status || "", created_at: memo.created_at || "",
        has_output: typeof memo.output_text === "string" && memo.output_text.trim().length > 0,
        output_text: typeof memo.output_text === "string" ? memo.output_text.slice(0, 140_000) : "",
        source: memo.source || "hosted",
      } });
    }
    return json({ error: "Unknown action" }, 400);
  } catch { return json({ error: "Memo source unavailable" }, 502); }
}

export async function GET() { return json({ error: "Method not allowed" }, 405); }
