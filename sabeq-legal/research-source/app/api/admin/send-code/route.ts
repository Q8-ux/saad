import { requireAdminService, adminJson } from "@/lib/admin-service-auth";
import { EmailDeliveryError, sendVerificationCode } from "@/lib/email";
import { cleanEmail, cleanString, readJsonObject, RequestError } from "@/lib/request-security";

export async function POST(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  try {
    const data = await readJsonObject(request, 4_000);
    const name = cleanString(data.name, "الاسم", { min: 2, max: 120 });
    const email = cleanEmail(data.email).toLowerCase();
    const code = cleanString(data.code, "الرمز", { min: 6, max: 6 });
    if (!/^\d{6}$/.test(code)) throw new RequestError("رمز التحقق غير صحيح.");
    await sendVerificationCode({ to: email, name, code, language: "ar" });
    return adminJson({ ok: true });
  } catch (error) {
    if (error instanceof EmailDeliveryError) return adminJson({ error: "تعذر إرسال رمز الدخول حالياً." }, 503);
    return adminJson({ error: error instanceof RequestError ? error.message : "تعذر إرسال رمز الدخول حالياً." }, error instanceof RequestError ? error.status : 503);
  }
}

