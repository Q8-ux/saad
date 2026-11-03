import { assertSameOrigin, corsPreflight, errorResponse, privateJson } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

// The public website no longer accepts email-code challenges for sign-in.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return privateJson({ error: "التحقق من البريد متوقف مؤقتاً. سجّل الدخول باسم المستخدم وكلمة المرور." }, 410);
  } catch (error) { return errorResponse(error); }
}
