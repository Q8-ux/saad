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
  const unavailable = (error: string) => ({ available: false, error, memos: [], inbox: [], totals: null });
  try {
    const keys = await bridgeKeys();
    const key = await crypto.subtle.importKey("jwk", keys.privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    // The legacy Render gateway can be temporarily unavailable during a deploy
    // or cold start. Retry only transient failures; never retry authentication
    // errors or invalid responses, and never expose private records or tokens.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Every attempt needs a fresh nonce to avoid replay rejection.
        const payload = base64url(new TextEncoder().encode(JSON.stringify({
          iss: SERVICE_ORIGIN, aud: "sabeq-official-operations",
          exp: Math.floor(Date.now() / 1000) + 45, path, nonce: crypto.randomUUID(),
        })));
        const signature = base64url(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(payload))));
        const response = await fetch(`${OFFICIAL_BACKEND}${path}`, {
          headers: { "X-Sabeq-Operations": `${payload}.${signature}`, Accept: "application/json" },
          cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(11_000),
        });
        if (!response.ok) {
          if (attempt === 0 && [429, 502, 503, 504].includes(response.status)) continue;
          return unavailable(`HTTP ${response.status}`);
        }
        if (Number(response.headers.get("content-length") || 0) > 1_000_000) return unavailable("invalid_response");
        const body = await response.text();
        if (body.length > 1_000_000) return unavailable("invalid_response");
        const data = JSON.parse(body);
        if (data.revision !== "operations-monitor-1") return unavailable("invalid_response");
        return { ...data, available: true };
      } catch {
        if (attempt === 1) return unavailable("connection_unavailable");
      }
    }
  } catch { /* Signing key or connection setup failed; current D1 remains readable. */ }
  return unavailable("connection_unavailable");
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
  const generatedOnly = url.searchParams.get("view") === "generated";
  const rows = await getD1().prepare(`SELECT * FROM (
    SELECT id, client_name, email, case_type, case_number, status, error_code, created_at, updated_at, CASE WHEN user_id IS NULL THEN 'guest' ELSE 'user' END AS visitor_type, CASE WHEN length(trim(COALESCE(output_text,''), char(9)||char(10)||char(13)||' ')) > 0 THEN 1 ELSE 0 END AS has_output, origin FROM management_memo_requests
    UNION ALL
    SELECT 'legacy:' || r.id, r.title, COALESCE(u.email,''), 'مذكرة محفوظة سابقاً', '', r.status, '', r.created_at, r.created_at, 'user', CASE WHEN length(trim(COALESCE(r.output_text,''), char(9)||char(10)||char(13)||' ')) > 0 THEN 1 ELSE 0 END, '' AS origin FROM service_records r LEFT JOIN public_users u ON r.user_id = u.id WHERE r.service_type IN ('memo','memo_archive') AND r.metadata_json NOT LIKE '%"managementRequestId"%'
    ) WHERE (? = '' OR client_name LIKE ? OR email LIKE ? OR case_number LIKE ?) AND (? = '' OR status = ?) AND (? = 0 OR has_output = 1) ORDER BY created_at DESC, id LIMIT ? OFFSET ?`)
    .bind(query, `%${query}%`, `%${query}%`, `%${query}%`, status, status, generatedOnly ? 1 : 0, limit, offset).all();
  const official = await officialOperations(new URLSearchParams({ kind: "memos", q: query, status, offset: String(offset), limit: String(limit) }));
  // Historical sources without output-presence metadata remain in All requests.
  const archived = (official.memos || []).filter((row: Record<string, unknown>) => !generatedOnly || row.has_output === true || row.has_output === 1);
  return { memos: [...rows.results.map((row: Record<string, unknown>) => ({ ...row, source: "hosted" })), ...archived.map((row: Record<string, unknown>) => ({ ...row, id: `official:${row.id}`, source: "official" }))].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), hasMore: rows.results.length === limit || (official.hasMore === true && (!generatedOnly || archived.length > 0)), officialAvailable: official.available, officialError: official.error || null, offset };
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
  const [memo, historical, contacts, mail, commands, appointments, events, reads, official] = await Promise.all([
    db.prepare("SELECT COUNT(*) total, SUM(status = 'running') running, SUM(status IN ('failed','cancelled')) failed, SUM(status IN ('needs_review','needs_information')) review FROM management_memo_requests").first(),
    db.prepare("SELECT COUNT(*) total FROM service_records WHERE service_type IN ('memo','memo_archive') AND metadata_json NOT LIKE '%\"managementRequestId\"%'").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') unread FROM contact_messages").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') unread FROM management_emails").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status != 'completed') pending FROM management_commands").first(),
    db.prepare("SELECT COUNT(*) total, SUM(status = 'new') pending FROM consultation_requests").first(),
    db.prepare(`SELECT id, source, kind, title, severity, created_at FROM management_events UNION ALL
      SELECT 'memo:' || id || ':' || status, 'memo', status, 'طلب مذكرة — ' || client_name, CASE WHEN status IN ('failed','cancelled') THEN 'warning' ELSE 'info' END, updated_at FROM management_memo_requests UNION ALL
      SELECT 'contact:' || id, 'contact', 'received', 'رسالة موقع — ' || subject, 'info', created_at FROM contact_messages UNION ALL
      SELECT 'consultation:' || id, 'consultation', status, 'طلب استشارة — ' || name, 'info', created_at FROM consultation_requests ORDER BY created_at DESC LIMIT 100`).all(),
    db.prepare("SELECT event_id FROM management_read_states WHERE email = ? ORDER BY created_at DESC LIMIT 1000").bind(email).all<{ event_id: string }>(),
    officialOperations(new URLSearchParams({ kind: "summary" })),
  ]);
  const seen = new Set(reads.results.map((row: { event_id: string }) => row.event_id));
  const notifications = [...events.results, ...(official.events || []).map((row: Record<string, unknown>) => ({ ...row, id: `official:${row.id}` }))].map(row => ({ ...row, read: seen.has(String(row.id)) })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 100);
  const updatedAt = new Date().toISOString();
  // The current GitHub site and management routes share this D1 store; Render is the previous archive.
  return { memo, historical, contacts, mail, commands, appointments, notifications, connection: { available: true, source: "sabeq-public-service", mode: "shared-database", checkedAt: updatedAt }, official: { available: official.available, totals: official.totals, revision: official.revision || null, trackingSince: official.trackingSince || null, error: official.error || null }, updatedAt, revision: "independent-admin-2" };
}

// Read-only, administrator-scoped recovery inventory. Never copies or rewrites
// legal submissions; an absent record cannot be reconstructed from a request log.
export async function managerMemoRecovery(url: URL) {
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || "";
  const valid = (value: string) => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
    const d = new Date(value + "T00:00:00.000Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  if ((start && !valid(start)) || (end && !valid(end)) || (start && end && start > end)) {
    throw new RequestError("حدد تاريخ بداية ونهاية صحيحين لجرد المذكرات.");
  }
  const lower = start ? start + " 00:00:00" : "0000-01-01 00:00:00";
  const upper = end ? end + " 23:59:59" : "9999-12-31 23:59:59";
  const db = getD1();
  const [current, archived, origin, official] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN LENGTH(TRIM(COALESCE(output_text,''))) > 0 THEN 1 ELSE 0 END) AS with_text,
      SUM(CASE WHEN LENGTH(TRIM(COALESCE(output_text,''))) = 0 THEN 1 ELSE 0 END) AS without_text,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN status IN ('failed','cancelled','needs_information') THEN 1 ELSE 0 END) AS incomplete,
      MIN(created_at) AS earliest, MAX(created_at) AS latest
      FROM management_memo_requests WHERE created_at >= ? AND created_at <= ?`).bind(lower, upper).first(),
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN LENGTH(TRIM(COALESCE(output_text,''))) > 0 THEN 1 ELSE 0 END) AS with_text,
      SUM(CASE WHEN LENGTH(TRIM(COALESCE(output_text,''))) = 0 THEN 1 ELSE 0 END) AS without_text,
      MIN(created_at) AS earliest, MAX(created_at) AS latest
      FROM service_records WHERE service_type IN ('memo','memo_archive')
        AND COALESCE(metadata_json,'') NOT LIKE '%"managementRequestId"%'
        AND created_at >= ? AND created_at <= ?`).bind(lower, upper).first(),
    db.prepare(`SELECT
      SUM(CASE WHEN origin LIKE 'https://q8-ux.github.io%' THEN 1 ELSE 0 END) AS github_site,
      SUM(CASE WHEN origin LIKE 'https://sabeq.legal%' OR origin LIKE 'https://www.sabeq.legal%' THEN 1 ELSE 0 END) AS official_site,
      SUM(CASE WHEN origin NOT LIKE 'https://q8-ux.github.io%' AND origin NOT LIKE 'https://sabeq.legal%' AND origin NOT LIKE 'https://www.sabeq.legal%' THEN 1 ELSE 0 END) AS other
      FROM management_memo_requests WHERE created_at >= ? AND created_at <= ?`).bind(lower, upper).first(),
    officialOperations(new URLSearchParams({ kind: "summary" })),
  ]);
  const safe = (value: unknown) => Math.max(0, Number(value || 0));
  const compact = (row: Record<string, unknown> | null, running = false) => ({
    total: safe(row?.total), withText: safe(row?.with_text), withoutText: safe(row?.without_text),
    ...(running ? { running: safe(row?.running), incomplete: safe(row?.incomplete) } : {}),
    earliest: row?.earliest || null, latest: row?.latest || null,
  });
  return {
    checkedAt: new Date().toISOString(), range: { start: start || null, end: end || null },
    current: compact(current as Record<string, unknown> | null, true),
    savedHistory: compact(archived as Record<string, unknown> | null),
    currentOrigins: { github: safe(origin?.github_site), official: safe(origin?.official_site), other: safe(origin?.other) },
    olderRender: {
      available: official.available, totalAllTime: official.available ? safe(official.totals?.memos) : null,
      historyAvailable: official.historyAvailable === true,
      trackingSince: official.trackingSince || null, error: official.error || null,
      dateFiltered: false,
    },
    note: "هذا جرد للسجلات الموجودة، وليس استعادة للسجلات المفقودة. إحصاء Render يخص جميع التواريخ ولا يشمل نصوص المذكرات التي لم تُحفظ.",
  };
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
