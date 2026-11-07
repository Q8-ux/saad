'use strict';

function textAiConfig(env = process.env) {
  const provider = (env.LEGAL_AI_PROVIDER || 'openai').trim().toLowerCase();
  const choices = {
    openai: { key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4.1-mini' },
    gemini: { key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.8-flash' },
    meta: { key: env.MODEL_API_KEY, model: env.META_MODEL || 'muse-spark-1.3' },
  };
  const selected = choices[provider];
  return { provider, model: selected?.model.trim() || '', apiKey: selected?.key?.trim() || '', configured: Boolean(selected?.key?.trim()) };
}

function aiError(code, status = 503) {
  return Object.assign(new Error(code), { code, status });
}

function createTextAiClient({ env = process.env, OpenAI, fetchImpl = fetch } = {}) {
  const config = textAiConfig(env);
  if (!config.configured) return null;
  if (config.provider !== 'gemini') {
    const client = new OpenAI({ apiKey: config.apiKey, ...(config.provider === 'meta' ? { baseURL: 'https://api.meta.ai/v1' } : {}) });
    return { responses: { create: async (input, options) => {
      let result;
      try { result = await client.responses.create({ ...input, model: config.model, store: false }, options); }
      catch (error) {
        if (config.provider === 'meta') throw aiError('meta_request_failed', Number(error.status) || 503);
        throw error;
      }
      if (result.status === 'incomplete' || result.status === 'failed') throw aiError('ai_response_incomplete');
      if (!result.output_text?.trim()) throw aiError('ai_response_empty');
      return result;
    } } };
  }
  return { responses: { create: async (input, options = {}) => {
    // File IDs and multimodal input belong to the separate document client.
    if (typeof input.input !== 'string' || typeof input.instructions !== 'string') throw aiError('unsupported_text_input', 400);
    const generationConfig = { maxOutputTokens: input.max_output_tokens || 16000 };
    if (typeof input.temperature === 'number') generationConfig.temperature = input.temperature;
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: input.instructions }] }, contents: [{ role: 'user', parts: [{ text: input.input }] }], generationConfig }),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(75000)]) : AbortSignal.timeout(75000),
    });
    if (!response.ok) throw aiError('gemini_request_failed', response.status);
    let payload;
    try { payload = await response.json(); } catch { throw aiError('ai_response_invalid'); }
    const candidate = payload.candidates?.[0];
    if (payload.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') throw aiError('ai_response_incomplete');
    const output_text = (candidate.content?.parts || []).filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('\n').trim();
    if (!output_text) throw aiError('ai_response_empty');
    return { output_text, status: 'completed' };
  } } };
}

module.exports = { textAiConfig, createTextAiClient };
