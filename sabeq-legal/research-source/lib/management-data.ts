import { getD1 } from "@/db";
import { base64url, openConfig, sealConfig } from "@/lib/management-auth";
import { SERVICE_ORIGIN } from "@/lib/management-integrations";
import { RequestError } from "@/lib/request-security";

export const OFFICIAL_BACKEND = "https://sabeq-legal-research-api.onrender.com";
type SigningKeys = { privateKey: JsonWebKey; publicKey: JsonWebKey };
export async function bridgeKeys(): Promise<SigningKeys> {
  const db = getD1();
  let row = await db.prepare("SELECT sealed FROM management_vault WHERE integration = 'operations-signing'").first<{ sealed: string }>();
  if (!row) {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const keys = { privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey), publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey) };
    await db.prepare("INSERT INTO management_vault (integration, sealed, updated_by) VALUES ('operations-signing', ?, 'system') ON CONFLICT(integration) DO NOTHING").bind(await sealConfig(keys)).run();
    row = await db.prepare("SELECT sealed FROM management_vault WHERE integration = 'operations-signing'").first<{ sealed: string }>();
  }
  if (!row) throw new RequestError("تعذر تهيئة ربط المتابعة.", 503);
  return openConfig<SigningKeys>(row.sealed);
}
export async function officialOperations(params = new URLSearchParams()) {
  const path = `/api/admin/operations${params.size ? `?${params}` : ""}`;
  try {
    const keys = await bridgeKeys();
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ iss: SERVICE_ORIGIN, aud: "sabeq-official-operations", exp: Math.floor(Date.now() / 1000) + 45, path, nonce: crypto.randomUUID() })));
    const key = await crypto.subtle.importKey("jwk", keys.privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const signature = base64url(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(payload))));
    const response = await fetch(`${OFFICIAL_BACKEND}${path}`, { headers: { "X-Sabeq-Operations": `${payload}.${signature}`, Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { available: false, error: `HTTP ${response.status}`, memos: [], inbox: [], totals: null };
    const body = await response.text();
    if (body.length > 1_000_000) throw Error("oversize");
    const data = JSON.parse(body);
    if (data.revision !== "operations-monitor-1") throw Error("unsupported");
    return { ...data, available: true };
  } catch { return { available: false, error: "connection_unavailable", memos: [], inbox: [], totals: null }; }
}
function pagination(url: URL) {
  const offset = Number(url.searchParams.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) throw new RequestError("رقم الصفحة غير صحيح.");
  return { offset, limit: 50, query: (url.searchParams.get("q") || "").trim().slice(0, 160), status: (url.searchParams.get("status") || "").slice(0, 50) };
}
export async function managerMemos(url: URL) {
  const id = url.searchParams.get("id");
  if (id?.startsWith("official:")) {
    const data = await officialOperations(new URLSearchParams({ recordId: id.slice(9) }));
    if (!data.available) throw new RequestError("تعذر الاتصال بسجل الموقع الرسمي.", 502);
    if (!data.record) throw new RequestError("المذكرة غير موجودة.", 404);
    return { memo: { ...data.record, id, source: "official" } };
  }
  if (id) {
    let row;
    if (id.startsWith("legacy:")) row = await getD1().prepare("SELECT r.id, r.title AS client_name, u.email, r.service_type AS case_type, '' AS case_number, r.input_text AS input_json, r.output_text, r.status, r.created_at, r.created_at AS updated_at, '' AS error_code FROM service_records r LEFT JOIN public_users u ON u.id = r.user_id WHERE r.id = ? AND r.service_type IN ('memo','memo_archive')").bind(id.slice(7)).first();
    else row = await getD1().prepare("SELECT * FROM management_memo_requests WHERE id = ?").bind(id).first();
    if (!row) throw new RequestError("المذكرة غير موجودة.", 404);
    return { memo: { ...row, id, source: "hosted" } };
  }
  const { offset, limit, query, status } = pagination(url);
  const rows = await getD1().prepare(`SELECT * FROM (
    SELECT id, client_name, email, case_type, case_number, status, error_code, created_at, updated_at, CASE WHEN user_id IS NULL THEN 'guest' ELSE 'user' END AS visitor_type FROM management_memo_requests
    UNION ALL
    SELECT 'legacy:' || r.id, r.title, COALESCE(u.email,''), 'مذكرة محفوظة سابقاً', '', r.status, '', r.created_at, r.created_at, 'user' FROM service_records r LEFT JOIN public_users u ON r.user_id = u.id WHERE r.service_type IN ('memo','memo_archive') AND r.metadata_json NOT LIKE '%"managementRequestId"%'
    ) WHERE (? = '' OR client_name LIKE ? OR email LIKE ? OR case_number LIKE ?) AND (? = '' OR status = ?) ORDER BY created_at DESC, id LIMIT ? OFFSET ?`)
    .bind(query, `%${query}%`, `%${query}%`, `%${query}%`, status, status, limit, offset).all();
  const official = await officialOperations(new URLSearchParams({ kind: "memos", q: query, status, offset: String(offset), limit: String(limit) }));
  return { memos: [...rows.results.map((row: Record<string, unknown>) => ({ ...row, source: "hosted" })), ...(official.memos || []).map((row: Record<string, unknown>) => ({ ...row, id: `official:${row.id}`, source: "official" }))].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), hasMore: rows.results.length === limit || official.hasMore === true, officialAvailable: official.available, offset };
}
export async function managerInbox(url: URL) {
  const { offset, limit, query } = pagination(url);
  const contacts = await getD1().prepare("SELECT 'contact:' || id AS id, name AS sender, email, subject, message AS body_text, status, created_at AS received_at, 'contact' AS source FROM contact_messages WHERE (? = '' OR name LIKE ? OR email LIKE ? OR subject LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(query, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset).all();
  const emails = await getD1().prepare("SELECT id, sender, recipients AS email, subject, body_text, status, received_at, 'email' AS source FROM management_emails WHERE (? = '' OR sender LIKE ? OR subject LIKE ?) ORDER BY received_at DESC LIMIT ? OFFSET ?").bind(query, `%${query}%`, `%${query}%`, limit, offset).all();
  const official = await officialOperations(new URLSearchParams({ kind: "inbox", q: query, offset: String(offset), limit: String(limit) }));
  return { messages: [...contacts.results, ...emails.results, ...(official.inbox || []).map((row: Record<string, unknown>) => ({ ...row, id: `official:${row.id}`, source: "official" }))].sort((a, b) => String(b.received_at).localeCompare(String(a.received_at))), officialAvailable: official.available, hasMore: contacts.results.length === limit || emails.results.length === limit || official.hasMore === true };
}
export async function managerSnapshot(email: string) {
  const db = getD1();
  const [memo, historical, contacts, mail, commands, appointments, bookings, events, reads, official] = await Promise.all([
    db.prepare("SELECT COUNT(*) total, SUM(status = 'running') running, SUM(status IN ('failed','cancelled')) failed, SUM(status IN ('needs_review','needs_information')) review FROM management_memo_requests").first(),
    db.prepare("SELECT COUNT(*) total FROM service_records WHERE service_type IN ('memo','memo_archive') AND metadata_json NOT LIKE '%\"managementRequestId\"%'").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') unread FROM contact_messages").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') unread FROM management_emails").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status != 'completed') pending FROM management_commands").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') pending FROM consultation_requests").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'pending') pending FROM consultation_bookings").first().catch(() => ({total:0,pending:0})),
    db.prepare(`SELECT id, source, kind, title, severity, created_at FROM management_events UNION ALL
      SELECT 'memo:' || id || ':' || status, 'memo', status, 'طلب مذكرة — ' || client_name, CASE WHEN status IN ('failed','cancelled') THEN 'warning' ELSE 'info' END, updated_at FROM management_memo_requests UNION ALL
      SELECT 'contact:' || id, 'contact', 'received', 'رسالة موقع — ' || subject, 'info', created_at FROM contact_messages UNION ALL
      SELECT 'consultation:' || id, 'consultation', status, 'طلب استشارة — ' || name, 'info', created_at FROM consultation_requests ORDER BY created_at DESC LIMIT 100`).all(),
    db.prepare("SELECT event_id FROM management_read_states WHERE email = ? ORDER BY created_at DESC LIMIT 1000").bind(email).all<{ event_id: string }>(),
    officialOperations(new URLSearchParams({ kind: "summary" })),
  ]);
  const seen = new Set(reads.results.map((row: { event_id: string }) => row.event_id));
  const notifications = [...events.results, ...(official.events || []).map((row: Record<string, unknown>) => ({ ...row, id: `official:${row.id}` }))].map(row => ({ ...row, read: seen.has(String(row.id)) })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 100);
  return { memo, historical, contacts, mail, commands, appointments, bookings, notifications, official: { available: official.available, totals: official.totals, revision: official.revision || null, trackingSince: official.trackingSince || null, error: official.error || null }, updatedAt: new Date().toISOString(), revision: "independent-admin-1" };
}

export async function managerUpdates() {
  try {
    const areas = [["sabeq-legal", "الموقع"], ["legal-memo-platform", "الخلفية الرسمية"], ["sabeq-admin-preview", "مركز الإدارة"]];
    const results = await Promise.all(areas.map(async ([path, area]) => {
      const response = await fetch(`https://api.github.com/repos/Q8-ux/saad/commits?path=${path}&per_page=8`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Sabeq-Management" }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw Error("unavailable");
      const values = await response.json() as Array<{ sha: string; commit: { message: string; committer: { date: string } } }>;
      return values.filter(row => /^[a-f0-9]{40}$/.test(row.sha)).map(row => ({ sha: row.sha, title: row.commit.message.split("\n")[0].slice(0, 300), date: row.commit.committer.date, area, url: `https://github.com/Q8-ux/saad/commit/${row.sha}` }));
    }));
    return { available: true, commits: results.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20) };
  } catch { return { available: false, commits: [] }; }
}
