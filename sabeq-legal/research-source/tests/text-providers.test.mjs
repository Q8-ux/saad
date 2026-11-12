import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';
const { compatibleTextResponse, textProviderConfig, textProviderSummary } = load('../lib/text-providers.ts');
const config = textProviderConfig({ LEGAL_AI_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-private-groq' });
const schema = { type: 'object', required: ['facts'], additionalProperties: false, properties: { facts: { type: 'string' } } };
const init = (extra = {}) => ({ body: JSON.stringify({ instructions: 'لا تختلق مصدرًا.', input: 'وقائع اصطناعية فقط.', text: { format: { schema } }, ...extra }) });
const complete = content => Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] });

test('provider selection requires its own key and fixed model; OpenRouter accepts only pinned free models', () => {
  for (const provider of ['unknown', 'nvidia', 'openrouter', '__proto__']) assert.throws(() => textProviderConfig({ NVIDIA_API_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' }, provider));
  assert.throws(() => textProviderConfig({ OPENROUTER_API_KEY: 'synthetic', OPENROUTER_MODEL: 'paid/model' }, 'openrouter'));
  assert.equal(textProviderConfig({ OPENROUTER_API_KEY: 'synthetic', OPENROUTER_MODEL: 'vendor/fixture:free' }, 'openrouter').endpoint, 'https://openrouter.ai/api/v1/chat/completions');
  const summary = textProviderSummary({ LEGAL_AI_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-private-groq', LEGAL_AI_FALLBACK_PROVIDER: 'gemini', GEMINI_API_KEY: 'synthetic-private-gemini' });
  assert.equal(summary.textFallbackProvider, 'gemini');
  assert.doesNotMatch(JSON.stringify(summary), /synthetic-private/);
});

test('malformed, partial, refusal and schema-violating output never reaches consumers', async () => {
  for (const payload of [{}, { choices: [{ finish_reason: 'length', message: { content: '{"facts":"جزء"}' } }] }, { choices: [{ finish_reason: 'stop', message: { refusal: 'blocked', content: '{}' } }] }]) {
    await assert.rejects(compatibleTextResponse(init(), config, async () => Response.json(payload)), error => error.kind === 'incomplete');
  }
  for (const content of ['{}', '{"facts":5}', '{"facts":"اختبار","invented":true}', 'not JSON']) await assert.rejects(compatibleTextResponse(init(), config, async () => complete(content)), error => error.kind === 'incomplete');
});

test('files are rejected locally and cancellation does not contact the vendor', async () => {
  let calls = 0;
  const transport = async () => { calls++; return complete('{"facts":"اختبار"}'); };
  await assert.rejects(compatibleTextResponse(init({ input: [{ type: 'input_file', file_id: 'fixture' }] }), config, transport), error => error.kind === 'configuration');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(compatibleTextResponse({ ...init(), signal: controller.signal }, config, transport), error => error.kind === 'timeout');
  assert.equal(calls, 0);
});

test('redirects never forward credentials; vendor errors and reasoning remain private', async () => {
  let calls = 0;
  await assert.rejects(compatibleTextResponse(init(), config, async (_url, request) => {
    calls++; assert.equal(request.redirect, 'manual');
    assert.doesNotMatch(request.body, /synthetic-private-groq/);
    return new Response('private upstream body', { status: 302, headers: { Location: 'https://untrusted.example.test/' } });
  }), error => error.kind === 'upstream' && !error.message.includes('private upstream'));
  assert.equal(calls, 1);
  const response = await compatibleTextResponse(init({ stream: true }), config, async () => complete('{"facts":"اختبار"}'));
  const events = await response.text();
  assert.match(events, /response.output_text.delta/);
  assert.match(events, /response.completed/);
  assert.doesNotMatch(events, /synthetic-private/);
});

test('Heretic GGUF is opt-in and refuses invalid or missing server configuration', () => {
  const base = { LEGAL_AI_PROVIDER: 'heretic', HERETIC_API_KEY: 'synthetic-heretic-token', HERETIC_MODEL: 'heretic-9b-q4' };
  for (const endpoint of [undefined, '', 'http://gpu.example.test/v1/chat/completions',
    'https://name:password@gpu.example.test/v1/chat/completions',
    'https://gpu.example.test/v1/chat/completions?leak=1',
    'https://gpu.example.test/v1/chat/completions#fragment',
    'https://gpu.example.test/v1/other']) {
    assert.throws(() => textProviderConfig({ ...base, HERETIC_CHAT_COMPLETIONS_URL: endpoint }), error => error.kind === 'configuration');
  }
  assert.throws(() => textProviderConfig({ ...base, HERETIC_API_KEY: '', HERETIC_CHAT_COMPLETIONS_URL: 'https://gpu.example.test/v1/chat/completions' }));
  const summary = textProviderSummary(base);
  assert.equal(summary.textProviderConfigured, false);
  assert.doesNotMatch(JSON.stringify(summary), /synthetic-heretic-token/);
  const config = textProviderConfig({ ...base, HERETIC_CHAT_COMPLETIONS_URL: 'https://gpu.example.test/v1/chat/completions' });
  assert.equal(config.model, 'heretic-9b-q4');
  assert.equal(config.endpoint, 'https://gpu.example.test/v1/chat/completions');
});

test('Heretic uses the existing verified text-only contract without leaking secrets', async () => {
  const cfg = textProviderConfig({
    LEGAL_AI_PROVIDER: 'heretic', HERETIC_API_KEY: 'synthetic-heretic-token',
    HERETIC_MODEL: 'heretic-9b-q4', HERETIC_CHAT_COMPLETIONS_URL: 'https://gpu.example.test/v1/chat/completions',
  });
  const result = await compatibleTextResponse(init(), cfg, async (url, request) => {
    assert.equal(url, 'https://gpu.example.test/v1/chat/completions');
    assert.equal(request.redirect, 'manual');
    assert.equal(request.headers.Authorization, 'Bearer synthetic-heretic-token');
    const body = JSON.parse(request.body);
    assert.equal(body.messages[0].role, 'system');
    assert.match(body.messages[0].content, /لا تختلق مصدرًا/);
    assert.equal(body.messages[1].content, 'وقائع اصطناعية فقط.');
    assert.doesNotMatch(request.body, /synthetic-heretic-token/);
    return complete('{"facts":"وقائع اختبار اصطناعية فقط."}');
  });
  assert.equal((await result.json()).status, 'completed');
  for (const response of [
    Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"facts":"incomplete"}' } }] }),
    Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"wrong":"source"}' } }] }),
    new Response('', { status: 302, headers: { Location: 'https://untrusted.example.test/steal' } }),
  ]) {
    await assert.rejects(compatibleTextResponse(init(), cfg, async () => response));
  }
  let invoked = 0;
  await assert.rejects(compatibleTextResponse(init({ input: [{ type: 'input_file', file_id: 'synthetic-file' }] }), cfg, async () => {
    invoked++;
    return complete('{}');
  }), error => error.kind === 'configuration');
  assert.equal(invoked, 0);
});
