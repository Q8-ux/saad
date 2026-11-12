'use strict';

function hereticEndpoint(value) {
  try {
    const url = new URL(value || '');
    if (url.protocol !== 'https:' || !url.pathname.endsWith('/chat/completions') ||
        url.username || url.password || url.search || url.hash) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function textAiConfig(env = process.env) {
  const provider = (env.LEGAL_AI_PROVIDER || 'openai').trim().toLowerCase();
  const choices = {
    openai: { key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4.1-mini' },
    gemini: { key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.8-flash' },
    meta: { key: env.MODEL_API_KEY, model: env.META_MODEL || 'muse-spark-1.3' },
    groq: { key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'qwen/qwen3.8-27b', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
    nvidia: { key: env.NVIDIA_API_KEY, model: env.NVIDIA_MODEL || '', endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions' },
    openrouter: { key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || '', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    heretic: { key: env.HERETIC_API_KEY, model: env.HERETIC_MODEL || '', endpoint: hereticEndpoint(env.HERETIC_CHAT_COMPLETIONS_URL) },
  };
  const selected = Object.hasOwn(choices, provider) ? choices[provider] : undefined;
  const model = selected?.model.trim() || '';
  return { provider, model, apiKey: selected?.key?.trim() || '', endpoint: selected?.endpoint, configured: Boolean(selected?.key?.trim() && /^[a-zA-Z0-9._:/-]{1,180}$/.test(model) && (provider !== 'openrouter' || model.endsWith(':free')) && (provider !== 'heretic' || Boolean(selected?.endpoint))) };
}

function aiError(code, status = 503) {
  return Object.assign(new Error(code), { code, status });
}

function createSingleTextAiClient({ env = process.env, OpenAI, fetchImpl = fetch } = {}) {
  const config = textAiConfig(env);
  if (!config.configured) return null;
  if (['groq', 'nvidia', 'openrouter', 'heretic'].includes(config.provider)) return { responses: { create: async (input, options = {}) => {
    if (typeof input.input !== 'string' || typeof input.instructions !== 'string') throw aiError('unsupported_text_input', 400);
    options.signal?.throwIfAborted();
    const response = await fetchImpl(config.endpoint, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: input.instructions }, { role: 'user', content: input.input }], max_tokens: input.max_output_tokens || 16000, stream: false, ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}) }),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(75000)]) : AbortSignal.timeout(75000),
    });
    if (!response.ok) throw aiError(`${config.provider}_request_failed`, response.status);
    let payload;
    try { const raw = await response.text(); if (raw.length > 250000) throw Error(); payload = JSON.parse(raw); } catch { throw aiError('ai_response_invalid'); }
    const choice = payload.choices?.[0];
    if (choice?.finish_reason !== 'stop' || choice.message?.refusal || choice.message?.tool_calls?.length) throw aiError('ai_response_incomplete');
    if (typeof choice.message?.content !== 'string' || !choice.message.content.trim()) throw aiError('ai_response_empty');
    return { status: 'completed', output_text: choice.message.content.trim() };
  } } };
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

function createTextAiClient(options = {}) {
  const env = options.env || process.env;
  const primary = createSingleTextAiClient(options);
  if (!primary) return null;
  const config = textAiConfig(env);
  return { responses: { create: async (input, requestOptions = {}) => {
    try { return await primary.responses.create(input, requestOptions); }
    catch (error) {
      const alternate = env.LEGAL_AI_FALLBACK_PROVIDER?.trim().toLowerCase();
      const explicitRejection = /^(?:groq|nvidia|openrouter|heretic|gemini|meta)_request_failed$/.test(error.code || '') || config.provider === 'openai' && typeof error.status === 'number';
      if (requestOptions.signal?.aborted || !explicitRejection || ![429, 502, 503, 504].includes(error.status) || !alternate || alternate === config.provider) throw error;
      const fallback = createSingleTextAiClient({ ...options, env: { ...env, LEGAL_AI_PROVIDER: alternate } });
      if (!fallback) throw error;
      return fallback.responses.create(input, requestOptions);
    }
  } } };
}

module.exports = { textAiConfig, createTextAiClient };
