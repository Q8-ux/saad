import { getD1 } from "@/db";
import { requirePublicUser } from "@/lib/public-auth";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanEmail, cleanLanguage, cleanMultiline, cleanPhone, cleanString, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePublicUser(request);
    await requireServiceEnabled("consultation", request);
    const data = await readJsonObject(request, 16_000);
    if (String(data.website || "").trim()) return privateJson({ ok: true }, 201);
    await enforceRateLimit(request, "consultation", 4, "day");
    const name = cleanString(data.name, "الاسم", { min: 2, max: 120 });
    const phone = cleanPhone(data.phone);
    const email = cleanEmail(data.email);
    const caseType = cleanString(data.caseType, "نوع القضية", { min: 2, max: 120 });
    const preferredContact = cleanString(data.preferredContact, "طريقة التواصل", { min: 2, max: 40 });
    const message = cleanMultiline(data.message, "التفاصيل", { max: 3_000, required: false });
    const language = cleanLanguage(data.language);
    await getD1().prepare(
      `INSERT INTO consultation_requests (user_id, name, phone, email, case_type, preferred_contact, message, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(user.id, name, phone, email, caseType, preferredContact, message, language).run();
    return privateJson({ ok: true }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
