import { getD1 } from "@/db";
import { getPublicUser } from "@/lib/public-auth";
import { userPermissions } from "@/lib/user-management";
import { RequestError } from "@/lib/request-security";

export async function requireServiceEnabled(serviceKey: "consultation" | "assistant" | "memo" | "library", request?: Request) {
  const setting = await getD1().prepare(
    "SELECT enabled FROM service_settings WHERE service_key = ? LIMIT 1",
  ).bind(serviceKey).first<{ enabled: number }>();
  if (setting && !Number(setting.enabled)) throw new RequestError("هذه الخدمة متوقفة مؤقتاً بقرار الإدارة.", 503);
  if (request?.headers.get("authorization")) {
    const user = await getPublicUser(request);
    if (!user) throw new RequestError("انتهت جلسة الحساب. سجّل الدخول مجدداً.", 401);
    if (user) {
      if (user.status !== "active") throw new RequestError("هذا الحساب غير متاح حالياً.", 403);
      const policy = await getD1().prepare("SELECT permissions_json FROM user_access_policies WHERE user_id = ?").bind(user.id).first<{ permissions_json: string }>();
      if (!userPermissions(policy?.permissions_json)[serviceKey]) throw new RequestError("هذه الخدمة غير متاحة ضمن صلاحيات حسابك. تواصل مع الإدارة.", 403);
    }
  }
}
