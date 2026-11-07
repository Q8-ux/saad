'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { textAiConfig, createTextAiClient } = require('../text-ai');
const { openAiError } = require('../openai-errors');

const env = { LEGAL_AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'synthetic-gemini-key' };
const input = { instructions: 'لا تختلق مادة؛ اذكر نقص المصادر.', input: 'وقائع مصطنعة؛ لا توجد مصادر.', temperature: 0.1 };
function gemini(payload, status = 200, inspect = () => {}) {
  return createTextAiClient({ env, fetchImpl: async (url, init) => { inspect(url, init); return new Response(JSON.stringify(payload), { status }); } });
}
const completed = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'نقص المصادر؛ المسودة تحتاج مراجعة.' }] } }] };

test('provider choice is explicit and never silently falls back to another key', () => {
  assert.equal(textAiConfig({ GEMINI_API_KEY: 'synthetic' }).provider, 'openai');
  for (const provider of ['gemini', 'meta', 'unknown']) {
    assert.equal(createTextAiClient({ env: { LEGAL_AI_PROVIDER: provider, OPENAI_API_KEY: 'synthetic' } }), null);
  }
});

test('Gemini preserves instructions, facts and missing-source warning; key is only in header', async () => {
  const client = gemini(completed, 200, (url, init) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    assert.equal(init.headers['x-goog-api-key'], env.GEMINI_API_KEY);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    const body = JSON.parse(init.body);
    assert.equal(body.systemInstruction.parts[0].text, input.instructions);
    assert.equal(body.contents[0].parts[0].text, input.input);
    assert.equal(body.generationConfig.temperature, 0.1);
    assert.doesNotMatch(url + init.body, /synthetic-gemini-key/);
  });
  assert.equal((await client.responses.create(input)).output_text, completed.candidates[0].content.parts[0].text);
});

test('Gemini rejects blocked, truncated, absent, empty and malformed results', async () => {
  for (const payload of [
    { promptFeedback: { blockReason: 'SAFETY' } }, {},
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'جزء غير مكتمل' }] } }] },
    { candidates: [{ finishReason: 'STOP', content: { parts: [] } }] },
    { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private reasoning' }] } }] },
  ]) await assert.rejects(gemini(payload).responses.create(input), /ai_response_/);
  const malformed = createTextAiClient({ env, fetchImpl: async () => new Response('not JSON') });
  await assert.rejects(malformed.responses.create(input), /ai_response_invalid/);
});

test('upstream rejection never exposes provider body or retries against another provider', async () => {
  let calls = 0;
  const client = gemini({ error: { message: 'private key and prompt' } }, 429, () => calls++);
  await assert.rejects(client.responses.create(input), error => error.status === 429 && !error.message.includes('private'));
  assert.equal(calls, 1);
  for (const provider of ['gemini', 'meta']) {
    assert.match(openAiError({ status: 401, code: `${provider}_request_failed` }).message, /مزود النص القانوني/);
    assert.doesNotMatch(openAiError({ status: 401, code: `${provider}_request_failed` }).message, /OpenAI/);
  }
});

test('file inputs never accidentally reach the text-only Gemini transport', async () => {
  await assert.rejects(gemini(completed).responses.create({ instructions: '', input: [{ type: 'input_file', file_id: 'synthetic' }] }), /unsupported_text_input/);
});

test('cancellation reaches Gemini fetch', async () => {
  const controller = new AbortController(); controller.abort();
  const client = createTextAiClient({ env, fetchImpl: async (_url, init) => { init.signal.throwIfAborted(); } });
  await assert.rejects(client.responses.create(input, { signal: controller.signal }), { name: 'AbortError' });
});

test('Meta uses the official server endpoint and disables response storage', async () => {
  let options, request;
  class Client { constructor(value) { options = value; this.responses = { create: async value => { request = value; return { output_text: 'مسودة', status: 'completed' }; } }; } }
  const client = createTextAiClient({ env: { LEGAL_AI_PROVIDER: 'meta', MODEL_API_KEY: 'synthetic-meta' }, OpenAI: Client });
  await client.responses.create({ ...input, store: true });
  assert.deepEqual(options, { apiKey: 'synthetic-meta', baseURL: 'https://api.meta.ai/v1' });
  assert.equal(request.model, 'muse-spark-1.3');
  assert.equal(request.store, false);
  assert.equal(request.input, input.input);
});

test('OpenAI keeps its model and rejects incomplete Responses', async () => {
  class Client { constructor() { this.responses = { create: async () => ({ status: 'incomplete', output_text: 'partial' }) }; } }
  const client = createTextAiClient({ env: { OPENAI_API_KEY: 'synthetic' }, OpenAI: Client });
  assert.equal(textAiConfig({}).model, 'gpt-4.1-mini');
  await assert.rejects(client.responses.create(input), /ai_response_incomplete/);
});

test('gateway text routes and council share the provider, while files and audio retain their own client', () => {
  const source = fs.readFileSync(require.resolve('../gateway'), 'utf8');
  for (const route of ['assistant', 'draft-tools', 'memo']) {
    const start = source.indexOf(`app.post('/api/legal/${route}'`);
    assert.match(source.slice(start, source.indexOf('\n});', start)), /requireTextAi\(res\)/);
  }
  for (const route of ['transcribe', 'analyze-documents']) {
    const start = source.indexOf(`app.post('/api/legal/${route}'`);
    assert.match(source.slice(start, source.indexOf('\n});', start)), /requireAi\(res\)/);
  }
  assert.match(source, /runLegalCouncil\(\{ client, model: AI_MODEL/);
});
