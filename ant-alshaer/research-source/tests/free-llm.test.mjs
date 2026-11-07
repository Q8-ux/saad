import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { z } from 'zod';
import { setRuntimeBindings } from '../lib/runtime-bindings.ts';
import { appUpdateAction } from '../lib/app-release.ts';

const output = new URL('../.sites-runtime/free-llm-test.mjs', import.meta.url);
await mkdir(new URL('../.sites-runtime/', import.meta.url), { recursive: true });
await build({ entryPoints: [new URL('../lib/free-llm.ts', import.meta.url).pathname], outfile: output.pathname, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { parsePoetryResponse } = await import(output.href);
const schema = z.object({ facts: z.string() }).strict();
const request = { model: 'synthetic-model', input: [{ role: 'system', content: 'احفظ معنى القصة.' }, { role: 'user', content: 'قصة اصطناعية فقط.' }], max_output_tokens: 500 };
const originalFetch = globalThis.fetch;

test('selected Groq can generate validated poetry data without an OpenAI key', async () => {
  setRuntimeBindings({ POETRY_AI_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-groq' });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer synthetic-groq');
    const body = JSON.parse(init.body);
    assert.equal(body.messages[1].content, request.input[1].content);
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"facts":"قصة اصطناعية فقط."}' } }] });
  };
  try { assert.equal((await parsePoetryResponse(null, request, schema)).output_parsed.facts, 'قصة اصطناعية فقط.'); }
  finally { globalThis.fetch = originalFetch; }
});

test('a named backup recovers explicit rejection once and never receives the primary key', async () => {
  setRuntimeBindings({ POETRY_AI_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-groq', POETRY_AI_FALLBACK_PROVIDER: 'gemini', GEMINI_API_KEY: 'synthetic-gemini' });
  const urls = [];
  globalThis.fetch = async (url, init) => {
    urls.push(url);
    if (url.includes('groq.com')) return Response.json({}, { status: 429 });
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers['x-goog-api-key'], 'synthetic-gemini');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"facts":"اختبار"}' }] } }] });
  };
  try { assert.equal((await parsePoetryResponse(null, request, schema)).output_parsed.facts, 'اختبار'); assert.equal(urls.length, 2); }
  finally { globalThis.fetch = originalFetch; }
});

test('truncation, invalid JSON, authentication and ambiguous network failure never cross providers', async () => {
  setRuntimeBindings({ POETRY_AI_PROVIDER: 'groq', GROQ_API_KEY: 'synthetic-groq', POETRY_AI_FALLBACK_PROVIDER: 'gemini', GEMINI_API_KEY: 'synthetic-gemini' });
  for (const mode of ['partial', 'schema', 'auth', 'network']) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (mode === 'network') throw new TypeError('synthetic unavailable');
      if (mode === 'auth') return Response.json({}, { status: 401 });
      return Response.json({ choices: [{ finish_reason: mode === 'partial' ? 'length' : 'stop', message: { content: '{}' } }] });
    };
    try { await assert.rejects(parsePoetryResponse(null, request, schema)); assert.equal(calls, 1); }
    finally { globalThis.fetch = originalFetch; }
  }
});

test('default existing provider retains the original request and validates output', async () => {
  setRuntimeBindings({});
  let seen;
  const client = { responses: { parse: async input => { seen = input; return { output_parsed: { facts: 'اختبار' } }; } } };
  assert.equal((await parsePoetryResponse(client, request, schema)).output_parsed.facts, 'اختبار');
  assert.equal(seen, request);
});

test('new releases reload only when idle and never interrupt a draft or recording', () => {
  assert.equal(appUpdateAction('one', 'one', false, false), 'none');
  assert.equal(appUpdateAction('one', undefined, false, false), 'none');
  assert.equal(appUpdateAction('one', 'two', false, false), 'reload');
  assert.equal(appUpdateAction('one', 'two', true, false), 'defer');
  assert.equal(appUpdateAction('one', 'two', false, true), 'defer');
});
