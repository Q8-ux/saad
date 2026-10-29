import { env } from "cloudflare:workers";
import { integrationConfig, operationEvent, saveIntegration } from "@/lib/management-integrations";
import { cleanEmail, cleanString, RequestError } from "@/lib/request-security";

type DeliveryConfig = { fromEmail: string; apiKey: string };
type DeliveryEnvironment = { RESEND_API_KEY?: string; AUTH_FROM_EMAIL?: string };
const INTEGRATION = "verification-email";
const DEFAULT_SENDER = "noreply@sabeq.legal";

export async function verificationEmailDelivery() {
  const saved = await integrationConfig<DeliveryConfig>(INTEGRATION);
  if (saved) return { ...saved, source: "management" as const };
  const runtime = env as unknown as DeliveryEnvironment;
  return {
    fromEmail: runtime.AUTH_FROM_EMAIL?.trim() || "",
    apiKey: runtime.RESEND_API_KEY?.trim() || "",
    source: "environment" as const,
  };
}

function safeSettings(config: Awaited<ReturnType<typeof verificationEmailDelivery>>) {
  const fromEmail = config.fromEmail.match(/<([^<>]+)>$/)?.[1] || config.fromEmail;
  return {
    provider: "resend",
    fromEmail: fromEmail || DEFAULT_SENDER,
    hasApiKey: !!config.apiKey,
    configured: !!config.apiKey && !!config.fromEmail,
    source: config.apiKey ? config.source : "unconfigured",
  };
}

export async function verificationEmailAction(data: Record<string, unknown> | null, actor: string) {
  if (!data) return safeSettings(await verificationEmailDelivery());
  if (data.action !== "save") throw new RequestError("عملية إعداد إرسال الرموز غير مدعومة.");
  const fromEmail = cleanEmail(data.fromEmail).toLowerCase();
  if (fromEmail.split("@")[1] !== "sabeq.legal") {
    throw new RequestError("استخدم عنوان إرسال تابعاً لنطاق sabeq.legal وموثقاً لدى مزود البريد.");
  }
  const suppliedKey = cleanString(data.apiKey, "مفتاح الإرسال", { max: 500, required: false });
  const apiKey = suppliedKey || (await verificationEmailDelivery()).apiKey;
  if (!/^re_[A-Za-z0-9_-]{10,497}$/.test(apiKey)) {
    throw new RequestError("أدخل مفتاح Resend صالحاً بصلاحية إرسال البريد.");
  }
  await saveIntegration(INTEGRATION, { fromEmail, apiKey }, actor);
  await operationEvent("email", "verification-configuration", "تم حفظ إعداد إرسال رموز الدخول");
  return safeSettings({ fromEmail, apiKey, source: "management" });
}
