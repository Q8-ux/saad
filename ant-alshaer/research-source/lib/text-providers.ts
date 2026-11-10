import { matchesJsonSchema } from "./gemini";

export type TextProvider = "openai" | "gemini" | "groq" | "nvidia" | "openrouter" | "fcc";
export type TextProviderEnvironment = Record<string, string | undefined>;
type ProviderErrorKind = "configuration" | "authentication" | "rate_limit" | "model_access" | "timeout" | "network" | "incomplete" | "empty_response" | "upstream";
export class TextProviderError extends Error {
  constructor(public kind: ProviderErrorKind, public status = 503, public upstreamStatus?: number) {
    super(`TEXT_PROVIDER_${kind.toUpperCase()}`);
  }
}

// The gateway address is deployment configuration, never a visitor-supplied URL.
// Workers cannot reach a developer's localhost FCC process.
export function fccChatEndpoint(base: string | undefined) {
  let url: URL;
  try { url = new URL(base?.trim() || ""); } catch { throw new TextProviderError("configuration"); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      (url.port && url.port !== "443") || !["/", "/v1", "/v1/"].includes(url.pathname) ||
      !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host)) {
    throw new TextProviderError("configuration");
  }
  url.pathname = "/v1/chat/completions";
  return url.href;
}

export function textProviderConfig(runtime: TextProviderEnvironment, provider = runtime.POETRY_AI_PROVIDER?.trim() || "openai", intake = false, requireKey = true) {
  if (provider === "fcc") {
    const apiKey = runtime.FCC_API_KEY?.trim() || "";
    const model = runtime.FCC_MODEL?.trim() || "";
    if ((requireKey && !apiKey) || /[\r\n\0]/.test(apiKey) || !/^[a-zA-Z0-9._:/-]{1,180}$/.test(model)) throw new TextProviderError("configuration");
    return { provider: "fcc" as TextProvider, apiKey, model, endpoint: fccChatEndpoint(runtime.FCC_BASE_URL) };
  }
  const choices = {
    openai: { apiKey: runtime.OPENAI_API_KEY, model: intake ? runtime.OPENAI_INTAKE_MODEL || "gpt-4.1-mini" : runtime.OPENAI_MODEL || "gpt-5.6", endpoint: "https://api.openai.com/v1/responses" },
    gemini: { apiKey: runtime.GEMINI_API_KEY, model: runtime.GEMINI_MODEL || "gemini-3.8-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/" },
    groq: { apiKey: runtime.GROQ_API_KEY, model: runtime.GROQ_MODEL || "qwen/qwen3.8-27b", endpoint: "https://api.groq.com/openai/v1/chat/completions" },
    nvidia: { apiKey: runtime.NVIDIA_API_KEY, model: runtime.NVIDIA_MODEL || "", endpoint: "https://integrate.api.nvidia.com/v1/chat/completions" },
    openrouter: { apiKey: runtime.OPENROUTER_API_KEY, model: runtime.OPENROUTER_MODEL || "", endpoint: "https://openrouter.ai/api/v1/chat/completions" },
  };
  if (!Object.hasOwn(choices, provider)) throw new TextProviderError("configuration");
  const selected = choices[provider as keyof typeof choices];
  const apiKey = selected.apiKey?.trim();
  const model = selected.model.trim();
  if (requireKey && !apiKey || !/^[a-zA-Z0-9._:/-]{1,180}$/.test(model) || provider === "openrouter" && !model.endsWith(":free")) throw new TextProviderError("configuration");
  return { provider: provider as TextProvider, apiKey: apiKey || "", model, endpoint: selected.endpoint };
}

export function textProviderSummary(runtime: TextProviderEnvironment) {
  const provider = runtime.POETRY_AI_PROVIDER?.trim() || "openai";
  let model: string | null = null;
  let configured = false;
  let fallback: string | null = null;
  try { const config = textProviderConfig(runtime, undefined, false, false); model = config.model; configured = Boolean(config.apiKey); } catch { /* Configuration only; not a live provider probe. */ }
  const alternate = runtime.POETRY_AI_FALLBACK_PROVIDER?.trim();
  if (alternate && alternate !== provider) {
    try { fallback = textProviderConfig(runtime, alternate).provider; } catch { /* An absent alternate never changes the primary. */ }
  }
  return { textProvider: provider, textModel: model, textProviderConfigured: configured, textFallbackProvider: fallback, textFallbackPolicy: fallback ? "explicit-rejection-once" : null, textProviderRevision: "fcc-routing-1" };
}

// Text only. File IDs, audio and image payloads stay with their existing client.
export async function compatibleTextResponse(init: RequestInit, config: ReturnType<typeof textProviderConfig>, transport: typeof fetch = fetch): Promise<Response> {
  if (!["groq", "nvidia", "openrouter", "fcc"].includes(config.provider)) throw new TextProviderError("configuration");
  const body = JSON.parse(String(init.body));
  if (typeof body.instructions !== "string" || typeof body.input !== "string") throw new TextProviderError("configuration");
  const schema = body.text?.format?.schema;
  const instructions = body.instructions + (schema ? "\nأعد JSON فقط مطابقًا لهذا المخطط، دون شرح أو Markdown:\n" + JSON.stringify(schema) : "");
  let response: Response;
  try {
    init.signal?.throwIfAborted();
    response = await transport(config.endpoint, {
      method: "POST", redirect: "manual",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: instructions }, { role: "user", content: body.input }], max_tokens: body.max_output_tokens || 16000, stream: false, ...(schema ? { response_format: { type: "json_object" } } : {}) }),
      signal: init.signal,
    });
  } catch (error) {
    if (init.signal?.aborted || error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new TextProviderError("timeout");
    throw new TextProviderError("network");
  }
  if (!response.ok) {
    const kind = [401, 403].includes(response.status) ? "authentication" : response.status === 429 ? "rate_limit" : response.status === 404 ? "model_access" : "upstream";
    throw new TextProviderError(kind, kind === "rate_limit" ? 429 : 503, response.status);
  }
  let payload;
  try { const raw = await response.text(); if (raw.length > 250000) throw new Error(); payload = JSON.parse(raw); } catch { throw new TextProviderError("incomplete"); }
  const choice = payload.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal || choice.message?.tool_calls?.length) throw new TextProviderError("incomplete");
  const text = choice.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new TextProviderError("empty_response");
  if (schema) {
    try { if (!matchesJsonSchema(JSON.parse(text), schema)) throw new Error(); } catch { throw new TextProviderError("incomplete"); }
  }
  const result = { status: "completed", output_text: text.trim() };
  if (!body.stream) return Response.json(result);
  const events = [{ type: "response.output_text.delta", delta: result.output_text }, { type: "response.completed", response: result }];
  return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
