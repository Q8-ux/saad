import { adminResponse, getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await getAdminSession();
  return session
    ? adminResponse({ staff: session.staff })
    : adminResponse({ error: "غير مصرح." }, 401);
}

