import { requirePublicUser } from "@/lib/public-auth";
import { recordServiceActivity } from "@/lib/service-records";
import { requireServiceEnabled } from "@/lib/service-settings";
import { assertSameOrigin, cleanMultiline, cleanString, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject, RequestError } from "@/lib/request-security";

export const OPTIONS = corsPreflight;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePublicUser(request);
    await requireServiceEnabled("memo", request);
    await enforceRateLimit(request, "legal-archive-memo", 20, "hour");
    const raw = await readJsonObject(request, 140_000);
    const memo = cleanMultiline(raw.memo, "المذكرة", { min: 20, max: 100_000 });
    const title = cleanString(raw.title, "العنوان", { max: 240, required: false }) || "المذكرة القانونية";
    const documentKind = cleanString(raw.documentKind, "صيغة المستند", { max: 40, required: false });
    const template = cleanString(raw.template, "القالب", { max: 120, required: false });
    await recordServiceActivity({
      userId: user.id,
      serviceType: "memo_archive",
      title,
      outputText: memo,
      metadata: { documentKind, template, archivedManually: true },
      status: "archived",
    });
    return privateJson({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) return errorResponse(error);
    return privateJson({ error: "تعذر أرشفة المذكرة حالياً. حاول مرة أخرى." }, 503);
  }
}
