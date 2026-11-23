import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { openConfig, sealConfig } from "@/lib/management-vault";
import { operationEvent } from "@/lib/management-integrations";
import { cleanString, RequestError } from "@/lib/request-security";
import { compatibleTextResponse, textProviderConfig, textProviderSummary, TextProviderError, type TextProviderEnvironment } from "./text-providers";
import { resolveTextEnvironment, type ManagedMetaProvider } from "./text-runtime";

const INTEGRATION = "meta-text-provider";
export const DEFAULT_META_MODEL = "meta-llama/llama-4-scout";
async function savedRow() {
  return getD1().prepare("SELECT sealed FROM management_vault WHERE integration = ?").bind(INTEGRATION).first<{ sealed: string }>();
}
export async function savedMetaProvider(): Promise<ManagedMetaProvider | null> {
  const row = await savedRow();
  return row ? openConfig<ManagedMetaProvider>(row.sealed) : null;
}
async function settingsSummary(saved: ManagedMetaProvider | null) {
  const runtime = env as unknown as TextProviderEnvironment;
  const effective = await resolveTextEnvironment(runtime, async () => saved);
  const summary = textProviderSummary(effective);
  return {
    provider: "openrouter", model: saved?.model || DEFAULT_META_MODEL,
    enabled: saved?.enabled === true && runtime.LEGAL_AI_MANAGED_SETTINGS === "enabled",
    hasApiKey: Boolean(saved?.apiKey), revision: saved?.revision || "unconfigured", testedAt: saved?.testedAt || null,
    managedSettingsAvailable: runtime.LEGAL_AI_MANAGED_SETTINGS === "enabled",
    activeProvider: summary.textProvider, activeModel: summary.textModel,
    fallbackProvider: summary.textFallbackProvider, dataCollection: "deny", allowPaidModel: saved?.allowPaidModel === true,
  };
}
async function commitSetting(value: ManagedMetaProvider, previous: string | null, actor: string) {
  const sealed = await sealConfig(value), database = getD1();
  const row = previous
    ? await database.prepare("UPDATE management_vault SET sealed = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE integration = ? AND sealed = ? RETURNING integration").bind(sealed, actor, INTEGRATION, previous).first()
    : await database.prepare("INSERT INTO management_vault (integration, sealed, updated_by) VALUES (?, ?, ?) ON CONFLICT(integration) DO NOTHING RETURNING integration").bind(INTEGRATION, sealed, actor).first();
  if (!row) throw new RequestError("تغيّر إعداد الربط من جلسة أخرى. حدّث الصفحة ثم أعد المحاولة.", 409);
}

export async function probeMetaProvider(apiKey: string, model: string, signal?: AbortSignal, transport: typeof fetch = fetch, allowPaidModel = false) {
  const config = textProviderConfig({ OPENROUTER_API_KEY: apiKey, OPENROUTER_MODEL: model, OPENROUTER_ALLOW_PAID_META: allowPaidModel ? "approved" : "" }, "openrouter");
  const timeout = AbortSignal.timeout(23_000);
  const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const schema = { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } };
  for (const operation of ["memo", "assistant"]) {
    const response = await compatibleTextResponse({
      body: JSON.stringify({ instructions: "اختبار اتصال اصطناعي فقط. أعد JSON يحوي حقل text بعبارة عربية قصيرة. لا تذكر قانوناً أو حكماً أو وقائع عميل.", input: JSON.stringify({ operation, synthetic: true, task: "أكّد بالعربية أن هذه تجربة تقنية فقط." }), max_output_tokens: 512, text: { format: { schema } }, store: false }),
      signal: bounded,
    }, config, transport);
    const result = await response.json() as { output_text: string };
    const text = JSON.parse(result.output_text).text;
    if (typeof text !== "string" || !/[\u0621-\u064a]/.test(text) || text.trim().length < 5) throw new TextProviderError("incomplete");
  }
  bounded.throwIfAborted();
  return new Date().toISOString();
}
function probeFailure(error: unknown): never {
  if (error instanceof TextProviderError) {
    const messages: Record<string, string> = {
      authentication: "رفض OpenRouter المفتاح أو صلاحياته. لم يتغير المزود الحالي.",
      rate_limit: "وصل OpenRouter إلى حد الطلبات. أعد الاختبار لاحقاً؛ لم يتغير الربط الحالي.",
      model_access: "النموذج المحدد غير متاح لهذا المفتاح. لم يتغير المزود الحالي.",
      timeout: "انتهت مهلة اختبار OpenRouter. لم يُفعّل الربط الجديد.",
      incomplete: "لم يُرجع النموذج استجابة عربية كاملة مطابقة للتنسيق المطلوب. لم يُفعّل الربط.",
      empty_response: "أعاد النموذج استجابة فارغة. لم يُفعّل الربط.",
    };
    throw new RequestError(messages[error.kind] || "تعذر اختبار OpenRouter. راجع المفتاح والنموذج والرصيد؛ لم يتغير الربط الحالي.", error.kind === "rate_limit" ? 429 : 502);
  }
  throw new RequestError("تعذر إكمال اختبار OpenRouter. لم يتغير الربط الحالي.", 502);
}

export async function metaProviderAction(data: Record<string, unknown> | null, actor: string, signal?: AbortSignal) {
  const row = await savedRow();
  const saved = row ? await openConfig<ManagedMetaProvider>(row.sealed) : null;
  if (!data) return settingsSummary(saved);
  if (!Object.keys(data).every(key => ["action", "revision", "apiKey", "model", "allowPaidModel"].includes(key))) throw new RequestError("حقول إعداد الربط غير مدعومة.");
  if (data.revision !== (saved?.revision || "unconfigured")) throw new RequestError("تغيّر إعداد الربط. حدّث الصفحة ثم أعد المحاولة.", 409);
  if (data.action === "disable") {
    if (!saved) return settingsSummary(null);
    const next = { ...saved, enabled: false, revision: crypto.randomUUID() };
    await commitSetting(next, row!.sealed, actor);
    await operationEvent("admin", "meta-provider-disabled", "تم إيقاف ربط Meta والعودة إلى المزود الأساسي");
    return settingsSummary(next);
  }
  if (data.action !== "activate") throw new RequestError("عملية ربط Meta غير مدعومة.");
  const runtime = env as unknown as TextProviderEnvironment;
  if (runtime.LEGAL_AI_MANAGED_SETTINGS !== "enabled") throw new RequestError("إعداد ربط النماذج من اللوحة لم يُفعّل على الخادم بعد.", 409);
  const apiKey = cleanString(data.apiKey, "مفتاح OpenRouter", { max: 500, required: false }) || saved?.apiKey || "";
  if (!/^sk-or-v1-[A-Za-z0-9_-]{20,480}$/.test(apiKey)) throw new RequestError("أدخل مفتاح API صالحاً من OpenRouter في هذه الخانة المحمية.");
  const model = cleanString(data.model, "اسم النموذج", { max: 180 });
  if (!/^meta-llama\/llama-[a-zA-Z0-9._-]+(?::free)?$/.test(model)) throw new RequestError("اختر معرف نموذج Meta Llama صالحاً.");
  const allowPaidModel = data.allowPaidModel === true;
  if (!model.endsWith(":free") && !allowPaidModel) throw new RequestError("هذا نموذج مدفوع. يلزم اختيار الموافقة على تكلفته في اللوحة قبل الاختبار والتفعيل.");
  let testedAt: string;
  try { testedAt = await probeMetaProvider(apiKey, model, signal, fetch, allowPaidModel); } catch (error) { return probeFailure(error); }
  const next: ManagedMetaProvider = { apiKey, model, enabled: true, testedAt, revision: crypto.randomUUID(), allowPaidModel };
  await commitSetting(next, row?.sealed || null, actor);
  await operationEvent("admin", "meta-provider-enabled", "تم اختبار وتفعيل Meta للمذكرات والمساعد القانوني");
  return settingsSummary(next);
}
