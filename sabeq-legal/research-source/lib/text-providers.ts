import { matchesJsonSchema } from "./gemini";

export type TextProvider = "openai" | "gemini" | "meta" | "groq" | "nvidia" | "openrouter" | "heretic";
export type TextProviderEnvironment = Record<string, string | undefined>;
type ProviderErrorKind = "configuration" | "authentication" | "rate_limit" | "model_access" | "timeout" | "network" | "incomplete" | "empty_response" | "upstream";
type ProviderErrorReason = "data_policy" | "parameters" | "unavailable" | "access" | "credits";
export class TextProviderError extends Error {
  constructor(public kind: ProviderErrorKind, public status = 503, public upstreamStatus?: number, public reason?: ProviderErrorReason) {
    super(`TEXT_PROVIDER_${kind.toUpperCase()}`);
  }
}

// Classify a bounded private body; never retain or return the upstream message.
async function openRouterErrorReason(response: Response): Promise<ProviderErrorReason | undefined> {
  if (response.status === 402) { await response.body?.cancel().catch(() => {}); return "credits"; }
  if (response.status !== 404) return;
  const reader = response.body?.getReader();
  if (!reader) return;
  try {
    const decoder = new TextDecoder();
    let raw = "", size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); return; }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const message = JSON.parse(raw)?.error?.message;
    if (typeof message !== "string") return;
    if (/data policy|zero[- ]data[- ]retention|\bzdr\b/i.test(message)) return "data_policy";
    if (/requested parameters|support.{0,80}parameters|response[_ ]format|filter by parameters/i.test(message)) return "parameters";
    if (/not allowed|guardrail|allowlist|allowed providers/i.test(message)) return "access";
    if (/no endpoints found|no available providers/i.test(message)) return "unavailable";
  } catch { /* Unknown or malformed diagnostics remain generic. */ }
  finally { reader.releaseLock(); }
}

function hereticEndpoint(value?: string) {
  try {
    const url = new URL(value || "");
    // Heretic hosts are operated by us: refuse plaintext, URL credentials, and redirect-style parameters.
    if (url.protocol !== "https:" || url.pathname !== "/v1/chat/completions" ||
        url.username || url.password || url.search || url.hash) return null;
    return url.toString();
  } catch { return null; }
}

export function textProviderConfig(runtime: TextProviderEnvironment, provider = runtime.LEGAL_AI_PROVIDER?.trim() || "openai", intake = false, requireKey = true) {
  const choices = {
    openai: { apiKey: runtime.OPENAI_API_KEY, model: intake ? runtime.OPENAI_INTAKE_MODEL || "gpt-4.1-mini" : runtime.OPENAI_MODEL || "gpt-5.6", endpoint: "https://api.openai.com/v1/responses" },
    gemini: { apiKey: runtime.GEMINI_API_KEY, model: runtime.GEMINI_MODEL || "gemini-3.8-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/" },
    meta: { apiKey: runtime.MODEL_API_KEY || runtime.META_API_KEY, model: runtime.META_MODEL || "muse-spark-1.3", endpoint: "https://api.meta.ai/v1/chat/completions" },
    groq: { apiKey: runtime.GROQ_API_KEY, model: runtime.GROQ_MODEL || "qwen/qwen3.8-27b", endpoint: "https://api.groq.com/openai/v1/chat/completions" },
    nvidia: { apiKey: runtime.NVIDIA_API_KEY, model: runtime.NVIDIA_MODEL || "", endpoint: "https://integrate.api.nvidia.com/v1/chat/completions" },
    openrouter: { apiKey: runtime.OPENROUTER_API_KEY, model: runtime.OPENROUTER_MODEL || runtime.OPENROUTER_FREE_MODEL || "", endpoint: "https://openrouter.ai/api/v1/chat/completions" },
    heretic: { apiKey: runtime.HERETIC_API_KEY, model: runtime.HERETIC_MODEL || "", endpoint: hereticEndpoint(runtime.HERETIC_CHAT_COMPLETIONS_URL) },
  };
  if (!Object.hasOwn(choices, provider)) throw new TextProviderError("configuration");
  const selected = choices[provider as TextProvider];
  const apiKey = selected.apiKey?.trim();
  const model = selected.model.trim();
  if (requireKey && !apiKey || !/^[a-zA-Z0-9._:/-]{1,180}$/.test(model) ||
      provider === "meta" && /(?:^|[-_:/])contributor(?:$|[-_:/])/i.test(model) ||
      provider === "openrouter" && !model.endsWith(":free") && runtime.OPENROUTER_ALLOW_PAID !== "true" && !(runtime.OPENROUTER_ALLOW_PAID_META === "approved" && /^meta-llama\/llama-[a-zA-Z0-9._-]+$/.test(model)) ||
      provider === "heretic" && !selected.endpoint) throw new TextProviderError("configuration");
  return { provider: provider as TextProvider, apiKey: apiKey || "", model, endpoint: selected.endpoint! };
}

export function textFallbackConfigs(runtime: TextProviderEnvironment, primaryProvider = runtime.LEGAL_AI_PROVIDER?.trim() || "openai", intake = false) {
  const seen = new Set<string>([primaryProvider]);
  const configs: Array<ReturnType<typeof textProviderConfig>> = [];
  for (const raw of (runtime.LEGAL_AI_FALLBACK_PROVIDER || "").split(",")) {
    const candidate = raw.trim();
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    const candidateRuntime = candidate === "openrouter" && !runtime.OPENROUTER_MODEL?.trim() && !runtime.OPENROUTER_FREE_MODEL?.trim()
      ? { ...runtime, OPENROUTER_MODEL: "meta-llama/llama-3.3-70b-instruct:free" }
      : runtime;
    try { configs.push(textProviderConfig(candidateRuntime, candidate, intake)); } catch { /* Unconfigured alternates are skipped without breaking active providers. */ }
  }
  return configs;
}

export function textProviderSummary(runtime: TextProviderEnvironment) {
  const provider = runtime.LEGAL_AI_PROVIDER?.trim() || "openai";
  let model: string | null = null;
  let configured = false;
  try { const config = textProviderConfig(runtime, undefined, false, false); model = config.model; configured = Boolean(config.apiKey); } catch { /* Configuration only; not a live provider probe. */ }
  const fallbacks = textFallbackConfigs(runtime, provider).map(item => item.provider);
  const fallback = fallbacks[0] || null;
  const policy = fallbacks.length > 1 ? "explicit-rejection-chain" : fallbacks.length === 1 ? "explicit-rejection-once" : null;
  return { textProvider: provider, textModel: model, textProviderConfigured: configured, textFallbackProvider: fallback, textFallbackProviders: fallbacks, textFallbackPolicy: policy, textProviderRevision: "free-llm-routing-1" };
}

function openRouterWireSchema(schema: Record<string, any>): Record<string, any> {
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "pattern", "format"].includes(k)) continue;
    if (k === "properties" && v && typeof v === "object") {
      out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, openRouterWireSchema(pv as Record<string, any>)]));
    } else if (k === "items" && v && typeof v === "object") {
      out.items = openRouterWireSchema(v as Record<string, any>);
    } else if (k === "anyOf" && Array.isArray(v)) {
      out.anyOf = v.map(item => openRouterWireSchema(item));
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Text only. File IDs, audio and image payloads stay with their existing client.
export async function compatibleTextResponse(init: RequestInit, config: ReturnType<typeof textProviderConfig>, transport: typeof fetch = fetch): Promise<Response> {
  if (!["meta", "groq", "nvidia", "openrouter", "heretic"].includes(config.provider)) throw new TextProviderError("configuration");
  const body = JSON.parse(String(init.body));
  if (typeof body.instructions !== "string" || typeof body.input !== "string") throw new TextProviderError("configuration");
  const schema = body.text?.format?.schema;
  const instructions = body.instructions + (schema ? "\nأعد JSON فقط مطابقًا لهذا المخطط، دون شرح أو Markdown:\n" + JSON.stringify(schema) : "");
  const tokenLimit = body.max_output_tokens || 16000;
  const tokenBudget = config.provider === "meta"
    ? { max_completion_tokens: tokenLimit, prompt_cache_retention: "in_memory" }
    : { max_tokens: tokenLimit };
  const extraHeaders = config.provider === "openrouter"
    ? { "HTTP-Referer": "https://www.sabeq.legal/", "X-Title": "Sabeq Legal" }
    : {};
  const privacyOptions = config.provider === "openrouter"
    ? { provider: { data_collection: "deny", zdr: true } }
    : {};
  const formatOption = !schema ? {} : config.provider === "openrouter"
    ? { response_format: { type: "json_schema", json_schema: { name: typeof body.text?.format?.name === "string" ? body.text.format.name : "sabeq_response", strict: false, schema: openRouterWireSchema(schema) } } }
    : { response_format: { type: "json_object" } };
  const sendRequest = (responseFormatOverride: Record<string, unknown>) => transport(config.endpoint, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}`, ...extraHeaders },
    body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: instructions }, { role: "user", content: body.input }], ...tokenBudget, ...privacyOptions, stream: false, ...responseFormatOverride }),
    signal: init.signal,
  });
  let response: Response;
  let preclassifiedReason: ProviderErrorReason | undefined;
  try {
    init.signal?.throwIfAborted();
    response = await sendRequest(formatOption);
    if (schema && config.provider === "openrouter" && [400, 404].includes(response.status)) {
      preclassifiedReason = response.status === 404 ? await openRouterErrorReason(response) : "parameters";
      if (preclassifiedReason === "parameters") {
        preclassifiedReason = undefined;
        init.signal?.throwIfAborted();
        response = await sendRequest({});
      }
    }
  } catch (error) {
    if (init.signal?.aborted || error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new TextProviderError("timeout");
    throw new TextProviderError("network");
  }
  if (!response.ok) {
    const kind = [401, 403].includes(response.status) ? "authentication" : response.status === 429 ? "rate_limit" : response.status === 404 ? "model_access" : "upstream";
    const reason = config.provider === "openrouter" ? (preclassifiedReason ?? await openRouterErrorReason(response)) : undefined;
    throw new TextProviderError(kind, kind === "rate_limit" ? 429 : 503, response.status, reason);
  }
  let payload;
  try { const raw = await response.text(); if (raw.length > 250000) throw new Error(); payload = JSON.parse(raw); } catch { throw new TextProviderError("incomplete"); }
  const choice = payload.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal || choice.message?.tool_calls?.length) throw new TextProviderError("incomplete");
  const rawText = choice.message?.content;
  if (typeof rawText !== "string" || !rawText.trim()) throw new TextProviderError("empty_response");
  let text = rawText.trim();
  if (schema) {
    let stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!stripped.startsWith("{") && !stripped.startsWith("[")) {
      const start = stripped.indexOf("{"), end = stripped.lastIndexOf("}");
      if (start >= 0 && end > start) stripped = stripped.slice(start, end + 1);
    }
    try {
      const parsed = JSON.parse(stripped);
      if (!matchesJsonSchema(parsed, schema)) throw new Error();
      text = stripped;
    } catch { throw new TextProviderError("incomplete"); }
  }
  const result = { status: "completed", output_text: text };
  if (!body.stream) return Response.json(result);
  const events = [{ type: "response.output_text.delta", delta: result.output_text }, { type: "response.completed", response: result }];
  return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
