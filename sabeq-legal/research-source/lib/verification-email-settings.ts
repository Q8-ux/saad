import { env } from "cloudflare:workers";
import { integrationConfig, operationEvent, saveIntegration } from "@/lib/management-integrations";
import { cleanEmail, cleanString, RequestError } from "@/lib/request-security";

type DeliveryConfig = { fromEmail: string; apiKey: string };
type DeliveryEnvironment = { RESEND_API_KEY?: string; AUTH_FROM_EMAIL?: string };
const INTEGRATION = "verification-email";
const DEFAULT_SENDER = "noreplay@sabeq.legal";

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

async function checkSender(config: Awaited<ReturnType<typeof verificationEmailDelivery>>) {
  const domain = safeSettings(config).fromEmail.split("@")[1];
  const base = { checkedAt: new Date().toISOString(), domain, deliveryTested: false, records: [] as { record: string; name: string; type: string; value: string; status: string; priority?: number }[] };
  const result = (status: string) => ({ ...base, status });
  if (!config.apiKey || !config.fromEmail) return result("missing_settings");
  if (domain !== "sabeq.legal") return result("unknown");
  async function read(path: string) {
    const response = await fetch(`https://api.resend.com${path}`, { method: "GET", redirect: "manual", headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { status: response.status, data: null };
    if (Number(response.headers.get("content-length") || 0) > 160_000) throw Error("oversized");
    const text = await response.text();
    if (text.length > 160_000) throw Error("oversized");
    return { status: response.status, data: JSON.parse(text) as Record<string, unknown> };
  }
  const rejected = (status: number) => result(status === 401 ? "key_rejected" : status === 403 ? "domain_read_forbidden" : "unknown");
  try {
    const list = await read("/domains");
    if (list.status !== 200) return rejected(list.status);
    if (!Array.isArray(list.data?.data)) return result("unknown");
    const match = list.data.data.find(row => row && row.name === domain);
    if (!match) return result(list.data.has_more === false ? "domain_missing" : "unknown");
    if (typeof match.id !== "string" || !/^[a-f0-9-]{36}$/i.test(match.id)) return result("unknown");
    const detail = await read(`/domains/${match.id}`);
    if (detail.status !== 200) return rejected(detail.status);
    if (detail.data?.name !== domain || !Array.isArray(detail.data.records) || detail.data.records.length > 30) return result("unknown");
    const records = detail.data.records.filter(row => row && ["SPF", "DKIM"].includes(row.record));
    for (const row of records) {
      if (![row.record, row.name, row.type, row.value, row.status].every(value => typeof value === "string" && value.length > 0 && value.length <= 1000) || !["TXT", "MX", "CNAME"].includes(row.type)) return result("unknown");
      base.records.push({ record: row.record, name: row.name, type: row.type, value: row.value, status: row.status, ...(Number.isSafeInteger(row.priority) ? { priority: row.priority } : {}) });
    }
    const capabilities = detail.data.capabilities as { sending?: string } | undefined;
    const verified = capabilities?.sending === "enabled" && records.some(row => row.record === "SPF") && records.some(row => row.record === "DKIM") && records.every(row => row.status === "verified");
    return result(verified ? "verified" : "domain_unverified");
  } catch { return result("unknown"); }
}

export async function verificationEmailAction(data: Record<string, unknown> | null, actor: string) {
  if (!data) return safeSettings(await verificationEmailDelivery());
  if (data.action === "check") {
    const config = await verificationEmailDelivery();
    return { ...safeSettings(config), check: await checkSender(config) };
  }
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
