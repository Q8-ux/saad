/**
 * Optional server-side bridge for Meta Llama models hosted by OpenRouter.
 * Disabled unless the operator explicitly configures SABEQ_LLM_PROVIDER.
 * Never put OPENROUTER_API_KEY in a GitHub Pages bundle or repository file.
 */
export const DEFAULT_FREE_LLAMA_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
export const FREE_LLAMA_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type ResponsesPayload = {
  instructions?: string;
  input?: string;
  stream?: boolean;
  max_output_tokens?: number;
  text?: { format?: { type?: string; name?: string; schema?: Record<string, unknown>; strict?: boolean } };
};

export function openRouterRequest(body: ResponsesPayload, model = DEFAULT_FREE_LLAMA_MODEL) {
  if (!/^[a-z0-9][a-z0-9._/-]{2,110}:free$/i.test(model)) {
    throw new Error("Only explicitly free OpenRouter model IDs are allowed.");
  }
  return {
    model,
    messages: [
      { role: "system", content: body.instructions || "You are an assistant. Return only supported facts." },
      { role: "user", content: typeof body.input === "string" ? body.input : JSON.stringify(body.input || "") },
    ],
    stream: false, // Convert a validated complete response to Responses-style SSE below.
    max_tokens: Math.max(512, Math.min(body.max_output_tokens || 4096, 16000)),
    ...(body.text?.format?.type === "json_schema" && body.text.format.schema ? {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: body.text.format.name || "case_analysis",
          strict: true,
          schema: body.text.format.schema,
        },
      },
    } : {}),
  };
}

export async function openRouterAsResponses(body: ResponsesPayload, apiKey: string, model = DEFAULT_FREE_LLAMA_MODEL, signal?: AbortSignal): Promise<Response> {
  if (!apiKey.trim()) return Response.json({ error: { code: "missing_api_key", type: "configuration" } }, { status: 503 });
  const request = openRouterRequest(body, model);
  const result = await fetch(FREE_LLAMA_ENDPOINT, {
    method: "POST", redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://q8-ux.github.io/saad/sabeq-legal/",
      "X-Title": "Sabeq Legal",
    },
    body: JSON.stringify(request),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(65_000)]) : AbortSignal.timeout(65_000),
  });
  if (!result.ok) {
    // No API credentials, prompt text, or client case details in diagnostics.
    return Response.json({ error: { type: result.status === 429 ? "rate_limit" : "provider_error", code: "llama_provider_failed" } }, { status: result.status });
  }
  const response = await result.json() as { choices?: Array<{ message?: { content?: string | null }; finish_reason?: string | null }> };
  const answer = response.choices?.[0]?.message?.content?.trim();
  if (!answer || response.choices?.[0]?.finish_reason === "length") {
    return Response.json({ error: { code: "incomplete", type: "upstream" } }, { status: 502 });
  }
  const synthetic = { status: "completed", output_text: answer };
  if (body.stream) {
    return new Response(`data: ${JSON.stringify({ type: "response.completed", response: synthetic })}\n\n`, { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return Response.json(synthetic, { headers: { "Cache-Control": "no-store" } });
}

