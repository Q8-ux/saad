const gatewayTimeout = 35_000;

function secureEndpoint(value, path, production) {
  const base = new URL(value);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.hash || base.search ||
      (base.protocol === 'http:' && production)) throw Error('Invalid model endpoint');
  return new URL(path, base);
}

function parseContent(content) {
  if (typeof content !== 'string' || content.length > 50_000) throw Error('Incomplete text response');
  return JSON.parse(content);
}

export function modelFromEnvironment(env, request = fetch) {
  if (env.OLLAMA_URL && env.OLLAMA_MODEL) {
    const endpoint = secureEndpoint(env.OLLAMA_URL, '/api/chat', env.NODE_ENV === 'production');
    return {
      async complete({ messages, schema }) {
        const response = await request(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error',
          signal: AbortSignal.timeout(gatewayTimeout),
          body: JSON.stringify({ model: env.OLLAMA_MODEL, stream: false, format: schema,
            options: { temperature: 0.15, num_predict: 6000 }, messages }),
        });
        if (!response.ok) throw Error('Text provider unavailable');
        const output = await response.json();
        if (!output.done || output.done_reason === 'length') throw Error('Incomplete text response');
        return parseContent(output.message?.content);
      },
    };
  }
  if (!env.TAHKEEM_AI_MODEL || !env.NEON_AI_GATEWAY_BASE_URL || !env.NEON_AI_GATEWAY_TOKEN) return null;
  const endpoint = secureEndpoint(env.NEON_AI_GATEWAY_BASE_URL, '/v1/chat/completions', true);
  const modelId = env.TAHKEEM_AI_MODEL;
  const headers = { Authorization: `Bearer ${env.NEON_AI_GATEWAY_TOKEN}` };
  let modelStatus;
  let expires = 0;
  function available() {
    if (Date.now() < expires) return modelStatus;
    expires = Date.now() + 5 * 60_000;
    modelStatus = (async () => {
      const result = await request(new URL('/v1/models', endpoint), {
        headers, redirect: 'error', signal: AbortSignal.timeout(3500),
      });
      if (!result.ok) return false;
      const { data } = await result.json();
      return Array.isArray(data) && data.some(model => model.id === modelId && model.enabled !== false);
    })().catch(() => {
      expires = Date.now() + 30_000;
      return false;
    });
    return modelStatus;
  }
  return {
    available,
    async complete({ messages, schema }) {
      if (!await available()) throw Error('Text provider unavailable');
      const response = await request(endpoint, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, redirect: 'error',
        signal: AbortSignal.timeout(gatewayTimeout),
        body: JSON.stringify({
          model: modelId, max_tokens: 8000,
          response_format: { type: 'json_schema', json_schema: { name: 'tahkeem_response', schema } },
          messages,
        }),
      });
      if (!response.ok) {
        if ([402, 403].includes(response.status)) expires = 0;
        throw Error('Text provider unavailable');
      }
      const result = (await response.json()).choices?.[0];
      if (result?.finish_reason !== 'stop') throw Error('Incomplete text response');
      return parseContent(result.message?.content);
    },
  };
}

export function askModel(model, system, data, schema) {
  return model.complete({ schema, messages: [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify(data) },
  ] });
}
