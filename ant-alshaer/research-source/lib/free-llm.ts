import OpenAI from "openai";
import { z } from "zod";
import { getRuntimeBindings } from "./runtime-bindings";
import { compatibleTextResponse, textProviderConfig, TextProviderError, type TextProviderEnvironment } from "./text-providers";
import { geminiTextResponse, GeminiServiceError } from "./gemini";

type ParseInput = Parameters<OpenAI["responses"]["parse"]>[0];

export async function parsePoetryResponse<T extends z.ZodType>(client: OpenAI | null, request: ParseInput, schema: T): Promise<{ output_parsed: z.infer<T> | null }> {
  const bindings = getRuntimeBindings();
  const runtime = bindings as unknown as TextProviderEnvironment;
  const primary = runtime.POETRY_AI_PROVIDER?.trim() || "openai";
  const alternate = runtime.POETRY_AI_FALLBACK_PROVIDER?.trim();
  async function run(provider: string) {
    if (provider === "openai") {
      if (!client) throw new Error("MISSING_API_KEY");
      const response = await client.responses.parse(request);
      if (!response.output_parsed) throw new TextProviderError("incomplete");
      return { output_parsed: schema.parse(response.output_parsed) };
    }
    const config = textProviderConfig(runtime, provider);
    const input = request.input;
    if (!Array.isArray(input) || input.some(item => !item || typeof item !== 'object' || !('role' in item) || !['system', 'user'].includes(String(item.role)) || !('content' in item) || typeof item.content !== 'string')) throw new TextProviderError("configuration");
    const messages = input as Array<{ role: string; content: string }>;
    const init = {
      body: JSON.stringify({ instructions: messages.filter(item => item.role === "system").map(item => item.content).join("\n\n"), input: messages.filter(item => item.role === "user").map(item => item.content).join("\n\n"), max_output_tokens: request.max_output_tokens, text: { format: { schema: z.toJSONSchema(schema) } } }),
      signal: AbortSignal.timeout(18000),
    };
    const response = provider === "gemini" ? await geminiTextResponse(init, config) : await compatibleTextResponse(init, config);
    const payload = await response.json() as { output_text: string };
    const parsed = schema.safeParse(JSON.parse(payload.output_text));
    if (!parsed.success) throw new TextProviderError("incomplete");
    return { output_parsed: parsed.data };
  }
  try { return await run(primary); }
  catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : error instanceof TextProviderError || error instanceof GeminiServiceError ? error.upstreamStatus : undefined;
    // A returned/partial result, cancelled request or ambiguous network failure never crosses providers.
    if (!alternate || alternate === primary || ![429, 502, 503, 504].includes(status || 0)) throw error;
    return run(alternate);
  }
}
