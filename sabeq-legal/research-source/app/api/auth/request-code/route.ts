import { assertSameOrigin, corsPreflight, errorResponse, privateJson } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

// The public website now uses office-provisioned username/password credentials.
// This legacy endpoint intentionally never creates or sends verification codes.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return privateJson({ error: "تم إيقاف رمز البريد مؤقتاً. سجّل الدخول باسم المستخدم وكلمة المرور." }, 410);
  } catch (error) { return errorResponse(error); }
}
