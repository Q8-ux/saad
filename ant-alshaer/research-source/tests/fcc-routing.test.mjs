import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { z } from 'zod';
import { setRuntimeBindings } from '../lib/runtime-bindings.ts';

const output = new URL('../.sites-runtime/fcc-routing-test.mjs', import.meta.url);
await mkdir(new URL('../.sites-runtime/', import.meta.url), { recursive: true });
await build({ stdin: { contents: 'export { parsePoetryResponse } from "./lib/free-llm"; export { fccChatEndpoint, textProviderConfig, textProviderSummary } from "./lib/text-providers";', resolveDir: new URL('../', import.meta.url).pathname, loader: 'ts' }, outfile: output.pathname, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { parsePoetryResponse, fccChatEndpoint, textProviderConfig, textProviderSummary } = await import(output.href);
const settings = { POETRY_AI_PROVIDER: 'fcc', FCC_BASE_URL: 'https://fcc.poetry-service.com/v1/', FCC_API_KEY: 'synthetic-gateway', FCC_MODEL: 'nvidia_nim/synthetic-model', OPENAI_API_KEY: 'synthetic-openai' };
const schema = z.object({ facts: z.string().min(1) }).strict();
const request = { model: 'ignored-original-model', input: [{ role: 'system', content: 'احفظ معنى القصة.' }, { role: 'user', content: 'قصة اختبار خالية من البيانات الشخصية.' }], max_output_tokens: 500 };
const valid = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"facts":"اختبار"}' } }] });
const originalFetch = globalThis.fetch;

test('FCC routes structured poetry through its own key and explicit model', async () => {
  setRuntimeBindings(settings);
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://fcc.poetry-service.com/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer synthetic-gateway');
    assert.equal(init.redirect, 'manual');
    const body = JSON.parse(init.body);
    assert.equal(body.model, settings.FCC_MODEL);
    assert.equal(body.messages[1].content, request.input[1].content);
    assert.ok(body.messages[0].content.includes('"required":["facts"]'));
    assert.equal(body.max_tokens, 500);
    assert.equal(body.stream, false);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.ok(!JSON.stringify(init).includes(settings.OPENAI_API_KEY));
    return valid();
  };
  try { assert.deepEqual((await parsePoetryResponse(null, request, schema)).output_parsed, { facts: 'اختبار' }); assert.equal(calls, 1); }
  finally { globalThis.fetch = originalFetch; }
});

test('FCC rejects incomplete configuration and unsafe endpoints before sending anything', () => {
  for (const base of [undefined, '', 'http://fcc.poetry-service.com/v1', 'https://127.0.0.1/v1', 'https://[::1]/v1', 'https://localhost/v1', 'https://host.local/v1', 'https://10.0.0.1/v1', 'https://user:password@fcc.poetry-service.com/v1', 'https://fcc.poetry-service.com/v1?key=hidden', 'https://fcc.poetry-service.com/v1#hidden', 'https://fcc.poetry-service.com:8082/v1', 'https://fcc.poetry-service.com/admin']) {
    assert.throws(() => fccChatEndpoint(base));
  }
  for (const overrides of [{ FCC_BASE_URL: '' }, { FCC_MODEL: '' }, { FCC_API_KEY: '' }, { FCC_API_KEY: 'bad\r\nkey' }]) {
    assert.throws(() => textProviderConfig({ ...settings, ...overrides }, 'fcc'));
  }
  assert.equal(fccChatEndpoint('https://fcc.poetry-service.com'), 'https://fcc.poetry-service.com/v1/chat/completions');
});

test('FCC preserves validation and never retries partial, refused, unauthenticated or ambiguous responses elsewhere', async () => {
  setRuntimeBindings({ ...settings, POETRY_AI_FALLBACK_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-backup' });
  const responses = [
    () => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"facts":"partial"}' } }] }),
    () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }),
    () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'invalid json' } }] }),
    () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"facts":"x"}', refusal: 'refused' } }] }),
    () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"facts":"x"}', tool_calls: [{}] } }] }),
    () => Response.json({}, { status: 401 }),
    () => new Response(null, { status: 307, headers: { Location: 'https://elsewhere.poetry-service.com' } }),
    () => { throw new TypeError('ambiguous network failure'); },
    () => { throw new DOMException('timed out', 'TimeoutError'); },
  ];
  for (const response of responses) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return response(); };
    try { await assert.rejects(parsePoetryResponse(null, request, schema)); assert.equal(calls, 1); }
    finally { globalThis.fetch = originalFetch; }
  }
});

test('an explicit gateway rejection can use only the configured backup once', async () => {
  setRuntimeBindings({ ...settings, POETRY_AI_FALLBACK_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-backup' });
  for (const status of [429, 502, 503, 504]) {
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      if (calls === 1) return Response.json({}, { status });
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(init.headers.Authorization, 'Bearer synthetic-backup');
      return valid();
    };
    try { assert.equal((await parsePoetryResponse(null, request, schema)).output_parsed.facts, 'اختبار'); assert.equal(calls, 2); }
    finally { globalThis.fetch = originalFetch; }
  }
});

test('the admin summary follows the poetry configuration and contains no credentials or address', () => {
  const summary = textProviderSummary(settings);
  assert.equal(summary.textProvider, 'fcc');
  assert.equal(summary.textModel, settings.FCC_MODEL);
  assert.equal(summary.textProviderConfigured, true);
  assert.equal(textProviderSummary({ ...settings, FCC_API_KEY: '' }).textProviderConfigured, false);
  assert.equal(textProviderSummary({}).textProvider, 'openai');
  for (const secret of [settings.FCC_API_KEY, settings.OPENAI_API_KEY, settings.FCC_BASE_URL]) assert.ok(!JSON.stringify(summary).includes(secret));
});
