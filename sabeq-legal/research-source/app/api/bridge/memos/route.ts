import { getD1 } from "@/db";

// Server-to-server access only. Never expose this key in the browser or repository.
export const dynamic = "force-dynamic";
const encoder = new TextEncoder();
const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
});

function fromHex(input: string) {
  if (!/^[0-9a-f]{64}$/i.test(input)) return null;
  return new Uint8Array(input.match(/../g)!.map(part => Number.parseInt(part, 16)));
}

async function authenticated(request: Request, body: string) {
  const secret = process.env.SABEQ_MEMO_BRIDGE_SECRET;
  if (!secret || secret.length < 32) return false;
  const timestamp = request.headers.get("X-Sabeq-Timestamp") || "";
  const signature = fromHex(request.headers.get("X-Sabeq-Signature") || "");
  if (!/^[0-9]{10,11}$/.test(timestamp) || !signature) return false;
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (age < -60 || age > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(timestamp + "." + body));
}

export async function POST(request: Request) {
  const secret = process.env.SABEQ_MEMO_BRIDGE_SECRET;
  if (!secret || secret.length < 32) return json({ success: false, error: "Bridge not configured" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 4096) return json({ success: false, error: "Request too large" }, 413);
  let body: string;
  try { body = await request.text(); } catch { return json({ success: false, error: "Invalid request" }, 400); }
  if (body.length > 4096) return json({ success: false, error: "Request too large" }, 413);
  if (!(await authenticated(request, body))) return json({ success: false, error: "Unauthorized" }, 401);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("Invalid");
  } catch { return json({ success: false, error: "Invalid JSON" }, 400); }
  const db = getD1();
  try {
    if (data.action === "list") {
      const offset = data.offset ?? 0;
      if (!Number.isSafeInteger(offset) || (offset as number) < 0 || (offset as number) > 100_000) {
        return json({ success: false, error: "Invalid offset" }, 400);
      }
      const rows = await db.prepare(`
        SELECT id, client_name, case_type, case_number, status, created_at,
          CASE WHEN length(trim(coalesce(output_text, ''))) > 0 THEN 1 ELSE 0 END AS has_output
        FROM management_memo_requests ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ?
      `).bind(offset).all();
      const values = rows.results as Array<Record<string, unknown>>;
      return json({ success: true, memos: values.slice(0, 50).map(r => ({
        ...r, has_output: Boolean(r.has_output),
      })), hasMore: values.length > 50 });
    }
    if (data.action === "get") {
      const id = data.id;
      if (typeof id !== "string" || !/^(?:official:)?[a-f0-9-]{36}$/i.test(id)) {
        return json({ success: false, error: "Invalid memo ID" }, 400);
      }
      const normalized = id.startsWith("official:") ? id.slice(9) : id;
      const row = await db.prepare(`
        SELECT id, client_name, case_type, case_number, status, created_at, output_text
        FROM management_memo_requests WHERE id = ?
      `).bind(normalized).first<Record<string, unknown>>();
      if (!row) return json({ success: false, error: "Memo not found" }, 404);
      return json({ success: true, memo: {
        ...row, output_text: row.output_text || "", has_output: Boolean(String(row.output_text || "").trim()),
      } });
    }
    return json({ success: false, error: "Invalid action" }, 400);
  } catch {
    return json({ success: false, error: "Memo source unavailable" }, 503);
  }
}

// Deliberately no GET or CORS: authenticated server-to-server POST only.
