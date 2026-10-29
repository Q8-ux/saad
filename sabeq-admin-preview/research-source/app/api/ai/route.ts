import { getD1 } from "@/db";
import { adminResponse, requireAdminPermission, writeAudit } from "@/lib/admin-auth";
import { callPublicService } from "@/lib/public-service";

export async function POST(request: Request) {
  const authorization = await requireAdminPermission("ai.use");
  if ("response" in authorization) return authorization.response;

  const body = await request.text();
  if (body.length > 54_000) return adminResponse({ error: "الطلب أكبر من الحد المسموح." }, 413);
  let input: Record<string, unknown>;
  try { input = JSON.parse(body); } catch { return adminResponse({ error: "صيغة الطلب غير صحيحة." }, 400); }

  const tool = typeof input.tool === "string" ? input.tool.slice(0, 20) : "unknown";
  const upstream = await callPublicService("/api/admin/ai", { method: "POST", body });
  const payload = await upstream.json().catch(() => ({ error: "استجابة غير صالحة من خدمة الذكاء الاصطناعي." })) as Record<string, unknown>;
  if (!upstream.ok) return adminResponse({ error: String(payload.error || "تعذر تنفيذ الأداة.") }, upstream.status);

  const archiveId = crypto.randomUUID();
  const title = typeof payload.title === "string" ? payload.title.slice(0, 300) : tool;
  const output = typeof payload.output === "string" ? payload.output : JSON.stringify(payload.results || []);
  const sources = Array.isArray(payload.sources) ? payload.sources : Array.isArray(payload.results) ? payload.results : [];
  await getD1().prepare(
    `INSERT INTO admin_ai_archive
      (id, staff_email, tool_type, title, input_json, output_text, sources_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
  ).bind(
    archiveId,
    authorization.session.staff.email,
    tool,
    title,
    JSON.stringify(input).slice(0, 50_000),
    output.slice(0, 120_000),
    JSON.stringify(sources).slice(0, 50_000),
  ).run();
  await writeAudit(authorization.session.staff.email, "ai.generated", "ai_archive", archiveId, { tool });
  return adminResponse({ ...payload, archiveId });
}

