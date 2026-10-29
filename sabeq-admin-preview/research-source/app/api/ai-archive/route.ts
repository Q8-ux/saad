import { getD1 } from "@/db";
import { adminResponse, requireAdminPermission } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const authorization = await requireAdminPermission("archive.view");
  if ("response" in authorization) return authorization.response;
  const url = new URL(request.url);
  const tool = (url.searchParams.get("tool") || "").trim().slice(0, 20);
  const rows = await getD1().prepare(
    `SELECT id, staff_email, tool_type, title, input_json, output_text, sources_json, status, created_at
     FROM admin_ai_archive WHERE (? = '' OR tool_type = ?)
     ORDER BY created_at DESC LIMIT 150`,
  ).bind(tool, tool).all();
  return adminResponse({ archive: rows.results });
}

