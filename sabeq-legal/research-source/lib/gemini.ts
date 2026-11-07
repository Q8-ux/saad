type GeminiConfig = { apiKey: string; model: string };
type GeminiErrorKind = "configuration" | "authentication" | "rate_limit" | "model_access" | "timeout" | "network" | "incomplete" | "empty_response" | "upstream";

export class GeminiServiceError extends Error {
  constructor(public kind: GeminiErrorKind, public status = 503, public upstreamStatus?: number) {
    super(`GEMINI_${kind.toUpperCase()}`);
  }
}

type JsonSchema = Record<string, any>;
export const geminiEmptyValue = "__SABEQ_EMPTY__";
// The deployed GenerateContent API accepts Schema, while JSON Schema also
// contains additionalProperties. Enforce the original schema locally as well.
export function geminiSchema(schema: JsonSchema): JsonSchema {
  const result: JsonSchema = {};
  const nullable = schema.anyOf?.some((item: JsonSchema) => item.type === "null");
  const alternatives = schema.anyOf?.filter((item: JsonSchema) => item.type !== "null");
  if (alternatives?.length === 1 && nullable) return { ...geminiSchema(alternatives[0]), nullable: true };
  for (const key of ["title", "description", "enum", "minimum", "maximum", "minItems", "maxItems", "minLength", "maxLength", "pattern", "format", "required"]) {
    if (schema[key] !== undefined) result[key] = schema[key];
  }
  // Keep "clear the previous value" distinct from null (leave it unchanged).
  if (result.enum?.includes("")) {
    result.enum = result.enum.map((value: unknown) => value === "" ? geminiEmptyValue : value);
    if (typeof result.maxLength === "number") result.maxLength = Math.max(result.maxLength, geminiEmptyValue.length);
  }
  if (typeof schema.type === "string") result.type = schema.type.toUpperCase();
  if (schema.properties) result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, geminiSchema(value as JsonSchema)]));
  if (schema.items) result.items = geminiSchema(schema.items);
  if (alternatives?.length) result.anyOf = alternatives.map(geminiSchema);
  if (nullable) result.nullable = true;
  return result;
}

export function decodeGeminiValue(value: unknown, schema: JsonSchema): unknown {
  if (value === geminiEmptyValue && schema.enum?.includes("")) return "";
  if (schema.anyOf) {
    for (const branch of schema.anyOf) {
      const decoded = decodeGeminiValue(value, branch);
      if (matchesJsonSchema(decoded, branch)) return decoded;
    }
    return value;
  }
  if (Array.isArray(value) && schema.items) return value.map(item => decodeGeminiValue(item, schema.items));
  if (value && typeof value === "object" && schema.properties) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Object.hasOwn(schema.properties, key) ? decodeGeminiValue(item, schema.properties[key]) : item]));
  return value;
}

export function matchesJsonSchema(value: unknown, schema: JsonSchema): boolean {
  if (schema.anyOf && !schema.anyOf.some((item: JsonSchema) => matchesJsonSchema(value, item))) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string") {
    if (typeof value !== "string") return false;
    if (schema.minLength !== undefined && value.length < schema.minLength || schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") return false;
  if (["number", "integer"].includes(schema.type)) {
    if (typeof value !== "number" || !Number.isFinite(value) || schema.type === "integer" && !Number.isInteger(value)) return false;
    if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return false;
    if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every(item => matchesJsonSchema(item, schema.items))) return false;
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some((key: string) => !Object.hasOwn(record, key))) return false;
    for (const [key, item] of Object.entries(record)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) { if (!matchesJsonSchema(item, schema.properties[key])) return false; }
      else if (schema.additionalProperties === false) return false;
    }
  }
  return true;
}

// Adapt only text requests; OpenAI file IDs and audio never cross providers.
export async function geminiTextResponse(init: RequestInit, config: GeminiConfig, transport: typeof fetch = fetch): Promise<Response> {
  if (!config.apiKey.trim() || !/^[a-zA-Z0-9._-]+$/.test(config.model)) throw new GeminiServiceError("configuration");
  const body = JSON.parse(String(init.body));
  if (typeof body.input !== "string" || typeof body.instructions !== "string") throw new GeminiServiceError("configuration");
  const generationConfig: Record<string, unknown> = { maxOutputTokens: body.max_output_tokens || 16000 };
  const schema = body.text?.format?.schema;
  const convertedSchema = schema ? geminiSchema(schema) : undefined;
  if (schema) Object.assign(generationConfig, { responseMimeType: "application/json", responseSchema: convertedSchema });
  const usesEmptyValue = convertedSchema && JSON.stringify(convertedSchema).includes(JSON.stringify(geminiEmptyValue));
  const instructions = body.instructions + (usesEmptyValue ? `\nIn schema options, ${geminiEmptyValue} represents an empty string: use it to clear a previous selection or leave a selection unspecified. null means keep the previous value unchanged. Never make up a selection.` : "");
  let response: Response;
  try {
    response = await transport(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: "POST", redirect: "manual",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: "user", parts: [{ text: body.input }] }], generationConfig }),
      signal: init.signal,
    });
  } catch (error) {
    if (init.signal?.aborted || error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new GeminiServiceError("timeout");
    throw new GeminiServiceError("network");
  }
  if (!response.ok) {
    const kind = [401, 403].includes(response.status) ? "authentication" : response.status === 429 ? "rate_limit" : response.status === 404 ? "model_access" : "upstream";
    console.error("Gemini upstream rejected request", { kind, upstreamStatus: response.status });
    throw new GeminiServiceError(kind, kind === "rate_limit" ? 429 : 503, response.status);
  }
  let payload;
  try { payload = await response.json(); } catch { throw new GeminiServiceError("upstream"); }
  const candidate = payload.candidates?.[0];
  if (payload.promptFeedback?.blockReason || candidate?.finishReason !== "STOP") throw new GeminiServiceError("incomplete");
  let text = (candidate.content?.parts || []).filter((part: { thought?: boolean; text?: unknown }) => !part.thought && typeof part.text === "string").map((part: { text: string }) => part.text).join("\n").trim();
  if (!text) throw new GeminiServiceError("empty_response");
  if (schema) {
    let parsed;
    try { parsed = decodeGeminiValue(JSON.parse(text), schema); } catch { throw new GeminiServiceError("incomplete"); }
    if (!matchesJsonSchema(parsed, schema)) throw new GeminiServiceError("incomplete");
    text = JSON.stringify(parsed);
  }
  const result = { status: "completed", output_text: text };
  if (!body.stream) return Response.json(result);
  // Keep the existing SSE contract, emitting only a fully validated completion.
  const events = [{ type: "response.output_text.delta", delta: text }, { type: "response.completed", response: result }];
  return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
