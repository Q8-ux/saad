import { cookies } from "next/headers";
import { getD1 } from "@/db";
import { ADMIN_SESSION_COOKIE, adminResponse, adminTokenHash } from "@/lib/admin-auth";
import { assertAdminOrigin } from "@/lib/admin-security";

export async function POST(request: Request) {
  try { assertAdminOrigin(request); } catch { return adminResponse({ error: "تعذر التحقق من مصدر الطلب." }, 403); }
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
    try { await getD1().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await adminTokenHash(token)).run(); } catch { /* cookie removal is still authoritative */ }
  }
  store.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return adminResponse({ ok: true });
}
