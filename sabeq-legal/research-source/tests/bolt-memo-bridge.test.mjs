import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/api/integrations/bolt-memos/route.ts', import.meta.url), 'utf8');
const executable = stripTypeScriptTypes(source.replace(/^import .*management-data.*;\s*/m, ''))
  .replace(/^export /gm, '') + '\nthis.handlers = { POST, GET };';
const token = 'synthetic-admin-session-0001';
const records = ['running', 'failed', 'needs_review', 'generated'].map((status, i) => ({
  id: `official:synthetic_${i}`, client_name: 'Synthetic party', status,
  has_output: i > 1 ? 1 : 0, input_json: 'PRIVATE INPUT', input_text: 'PRIVATE FACTS',
  output_text: 'SYNTHETIC LEGAL GROUNDS', source: 'hosted',
}));

function fixture({ role = 'admin', valid = true, verifyStatus = 200, storageError = false } = {}) {
  const calls = { verify: [], storage: [] };
  const context = vm.createContext({
    URL, Request, Response, TextEncoder, AbortSignal,
    fetch: async (url, init) => {
      calls.verify.push({ url, init });
      return Response.json({ valid, role }, { status: verifyStatus });
    },
    managerMemos: async url => {
      calls.storage.push(url);
      if (storageError) throw new Error('private database details');
      return url.searchParams.has('id')
        ? { memo: records.find(row => row.id === url.searchParams.get('id')) }
        : { memos: records, hasMore: true, offset: Number(url.searchParams.get('offset')) };
    },
  });
  vm.runInContext(executable, context);
  const post = (body, authorization = `Bearer ${token}`) => context.handlers.POST(new Request('https://example.test/api/integrations/bolt-memos', {
    method: 'POST', headers: authorization ? { Authorization: authorization } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
  return { ...context.handlers, post, calls };
}

test('real route rejects absent and malformed sessions before accessing storage', async () => {
  const f = fixture();
  for (const auth of ['', 'Bearer forged', 'Basic anything']) assert.equal((await f.post({ action: 'list' }, auth)).status, 401);
  assert.equal(f.calls.verify.length, 0);
  assert.equal(f.calls.storage.length, 0);
});

test('only verified administration roles can read the memo source', async () => {
  for (const options of [{ valid: false }, { role: 'viewer' }, { verifyStatus: 302 }, { verifyStatus: 401 }]) {
    const f = fixture(options);
    assert.equal((await f.post({ action: 'list' })).status, 401);
    assert.equal(f.calls.storage.length, 0);
  }
  for (const role of ['super_admin', 'admin', 'operations_supervisor']) {
    const f = fixture({ role });
    assert.equal((await f.post({ action: 'list' })).status, 200);
    assert.equal(f.calls.storage.length, 1);
  }
});

test('verification uses the canonical service and rejects redirects without forwarding sessions', async () => {
  const f = fixture();
  const response = await f.post({ action: 'list' });
  assert.equal(response.status, 200);
  const { url, init } = f.calls.verify[0];
  assert.equal(url, 'https://tuhxdirrffnxtosqaoiq.supabase.co/functions/v1/admin-verify');
  assert.equal(init.redirect, 'manual');
  assert.deepEqual(JSON.parse(init.body), { token });
  assert.equal(init.headers.Authorization, undefined);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('list includes every request status and omits facts and generated text', async () => {
  const f = fixture();
  const payload = await (await f.post({ action: 'list', offset: 50 })).json();
  assert.deepEqual(payload.memos.map(row => row.status), ['running', 'failed', 'needs_review', 'generated']);
  assert.deepEqual(payload.memos.map(row => row.has_output), [false, false, true, true]);
  assert.equal(payload.offset, 50);
  assert.equal(payload.hasMore, true);
  assert.equal(f.calls.storage[0].searchParams.get('view'), null);
  for (const row of payload.memos) for (const field of ['input_json', 'input_text', 'output_text']) assert.equal(Object.hasOwn(row, field), false);
});

test('detail returns generated text only after authentication and performs a read', async () => {
  const f = fixture();
  const response = await f.post({ action: 'get', id: records[2].id });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.memo.output_text, 'SYNTHETIC LEGAL GROUNDS');
  assert.equal(payload.memo.has_output, true);
  assert.equal(Object.hasOwn(payload.memo, 'input_text'), false);
  assert.equal(Object.hasOwn(payload.memo, 'input_json'), false);
  assert.equal(f.calls.storage[0].searchParams.get('id'), records[2].id);
  assert.equal((await f.post({ action: 'get', id: 'official:missing_record' })).status, 404);
});

test('invalid bodies, actions, pagination and identifiers never reach storage', async () => {
  const f = fixture();
  for (const body of ['invalid', '[]', 'null']) assert.equal((await f.post(body)).status, 400);
  assert.equal((await f.post('x'.repeat(2049))).status, 413);
  for (const body of [{ action: 'delete' }, { action: 'list', offset: -1 }, { action: 'list', offset: 1.2 }, { action: 'list', offset: '50' }, { action: 'list', offset: 100001 }, { action: 'get', id: '../private' }]) {
    assert.equal((await f.post(body)).status, 400);
  }
  assert.equal(f.calls.storage.length, 0);
  assert.equal((await f.GET()).status, 405);
  assert.equal(f.PUT, undefined);
  assert.equal(f.DELETE, undefined);
});

test('storage failure returns a sanitized error without private details', async () => {
  const f = fixture({ storageError: true });
  const response = await f.post({ action: 'list' });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'Memo source unavailable' });
});
