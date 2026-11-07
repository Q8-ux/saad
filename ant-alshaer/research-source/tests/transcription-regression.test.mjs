import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { setRuntimeBindings } from '../lib/runtime-bindings.ts';

const output = new URL('../.sites-runtime/transcription-regression.mjs', import.meta.url);
await mkdir(new URL('../.sites-runtime/', import.meta.url), { recursive: true });
await build({ entryPoints: [new URL('../lib/media-transcription.ts', import.meta.url).pathname], outfile: output.pathname, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { transcribeMedia, transcriptionErrorResponse } = await import(output.href);
const nativeFetch = globalThis.fetch;

test('gpt-transcribe uses the supported plural language field at the HTTP boundary', async () => {
  setRuntimeBindings({ OPENAI_API_KEY: 'synthetic-only-key' });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "data:,") return new Response("");
    calls++;
    const request = new Request(input, init);
    assert.equal(new URL(request.url).pathname, '/v1/audio/transcriptions');
    const form = await request.formData();
    assert.equal(form.get('model'), 'gpt-transcribe');
    if (form.has('language')) return Response.json({ error: { type: 'invalid_request_error', code: 'unsupported_parameter', param: 'language', message: 'synthetic unsupported field' } }, { status: 400 });
    assert.deepEqual(form.getAll('languages[]'), ['ar']);
    assert.ok(form.get('file') instanceof File);
    return Response.json({ text: 'هذه قصة اصطناعية لاختبار عودة التسجيل وتحليله.' });
  };
  try {
    const text = await transcribeMedia(new File(['synthetic audio boundary only'], 'test.webm', { type: 'audio/webm' }), { enforcePoetrySafety: false });
    assert.match(text, /عودة التسجيل/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = nativeFetch; }
});

test('provider configuration errors are not blamed on the user audio format', async () => {
  setRuntimeBindings({ OPENAI_API_KEY: 'synthetic-only-key' });
  globalThis.fetch = async () => Response.json({ error: { type: 'invalid_request_error', code: 'unsupported_parameter', param: 'language', message: 'private vendor detail' } }, { status: 400 });
  try {
    let failure;
    try { await transcribeMedia(new File(['synthetic'], 'test.webm', { type: 'audio/webm' }), { enforcePoetrySafety: false }); } catch (error) { failure = error; }
    assert.ok(failure);
    const response = transcriptionErrorResponse(failure);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /private vendor detail|synthetic-only-key/);
  } finally { globalThis.fetch = nativeFetch; }
});
