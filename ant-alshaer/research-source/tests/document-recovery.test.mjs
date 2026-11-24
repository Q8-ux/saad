import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

const workerUrl = new URL('../dist/server/index.js', import.meta.url);
workerUrl.searchParams.set('document-recovery', String(process.pid));
const { default: worker } = await import(workerUrl.href);
const miniflare = new Miniflare({ modules: true, script: "export default {fetch(){return new Response('ok')}}", d1Databases: ['DB'], r2Buckets: ['BUCKET'] });
const bucket = await miniflare.getR2Bucket('BUCKET');
// The built Worker runs in Node in this test. Miniflare's RPC cannot marshal
// Node's Headers into writeHttpMetadata; adapt only that runtime boundary.
const nodeBucket = {
  put: (...args) => bucket.put(...args), delete: (...args) => bucket.delete(...args),
  get: async (...args) => {
    const object = await bucket.get(...args);
    if (!object) return null;
    const bytes = await object.arrayBuffer();
    return { body: new Response(bytes).body, arrayBuffer: async () => bytes.slice(0), writeHttpMetadata: headers => {
      if (object.httpMetadata?.contentType) headers.set('content-type', object.httpMetadata.contentType);
    } };
  },
};
const env = {
  DB: await miniflare.getD1Database('DB'), BUCKET: nodeBucket,
  USER_AUTH_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  GUEST_ACCESS_ENABLED: 'true', AUTH_TEST_MODE: 'true', ASSETS: { fetch: async () => new Response('not found', { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };
const request = (path, cookie, init = {}) => worker.fetch(new Request(`http://terminal.local${path}`, { ...init, headers: { ...init.headers, ...(cookie ? { cookie } : {}) } }), env, context);
const patch = (id, cookie, text) => request('/api/transcribe', cookie, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ submission_id: id, text }) });
const story = 'عاد صديقي من السفر فاستقبلناه بالفرح والوفاء وكتبنا له قصيدة ترحيب';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xM0AAAAASUVORK5CYII=', 'base64');

test('real upload, archive and document recovery routes work without an AI key and preserve account boundaries', async t => {
  t.after(() => miniflare.dispose());
  const sessions = await Promise.all([request('/api/me'), request('/api/me')]);
  assert.ok(sessions.every(response => response.ok));
  const [ownerCookie, foreignCookie] = sessions.map(response => (response.headers.get('set-cookie') || '').split(';')[0]);
  const owner = await sessions[0].json();
  const form = new FormData(); form.set('media', new File([png], 'saved-story.png', { type: 'image/png' })); form.set('read_on_device', 'true');
  const response = await request('/api/transcribe', ownerCookie, { method: 'POST', body: form });
  assert.equal(response.status, 202, await response.clone().text()); const saved = await response.json();
  assert.equal(saved.original_saved, true); assert.equal(saved.needs_local_read, true);
  assert.equal((await request(`/api/transcribe?submission_id=${saved.submission_id}`, ownerCookie)).status, 200);
  const original = await request(`/api/audio/${saved.submission_id}`, ownerCookie);
  assert.equal(original.status, 200, await original.clone().text());
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), png);
  assert.match(original.headers.get('content-disposition'), /^attachment;/);

  assert.equal((await patch(saved.submission_id, ownerCookie, story)).status, 200);
  const metadata = await (await request(`/api/transcribe?submission_id=${saved.submission_id}`, ownerCookie)).json();
  assert.equal(metadata.text, story); assert.equal(metadata.filename, 'saved-story.png');
  const row = await env.DB.prepare('SELECT user_id, transcription_text FROM submissions WHERE id = ?').bind(saved.submission_id).first();
  assert.equal(row.user_id, owner.id); assert.equal(row.transcription_text, story);
  assert.equal((await request(`/api/transcribe?submission_id=${saved.submission_id}`, foreignCookie)).status, 404);
  assert.equal((await patch(saved.submission_id, foreignCookie, 'نص من حساب آخر لا يسمح باستبداله')).status, 404);
  assert.equal((await patch(saved.submission_id, ownerCookie, 'أ'.repeat(30_001))).status, 400);
  assert.equal((await patch('invalid', ownerCookie, story)).status, 400);
  await env.DB.prepare("UPDATE submissions SET state = 'analyzed', analysis_json = '{}' WHERE id = ?").bind(saved.submission_id).run();
  assert.equal((await patch(saved.submission_id, ownerCookie, 'لا يستبدل نتيجة قائمة')).status, 409);

  // A large document follows the same durable upload protocol, not a separate
  // unprotected or AI-dependent endpoint.
  const bytes = Buffer.alloc(900_000, 32); bytes.write('%PDF-1.7\nsynthetic upload transport fixture\n');
  const uploadId = crypto.randomUUID(); const chunkSize = 600 * 1024;
  const count = Math.ceil(bytes.length / chunkSize);
  for (let i = 0; i < count; i++) {
    const chunk = new FormData(); chunk.set('chunk', new Blob([bytes.subarray(i * chunkSize, Math.min(bytes.length, (i + 1) * chunkSize))]), `chunk-${i}.bin`);
    for (const [key, value] of Object.entries({ upload_id: uploadId, chunk_index: i, total_chunks: count, total_size: bytes.length, filename: 'chunked-story.pdf', content_type: 'application/pdf' })) chunk.set(key, String(value));
    assert.equal((await request('/api/media/chunk', ownerCookie, { method: 'POST', body: chunk })).status, 200);
  }
  const processed = await request('/api/media/process', ownerCookie, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upload_id: uploadId, filename: 'chunked-story.pdf', content_type: 'application/pdf', total_chunks: count, total_size: bytes.length, read_on_device: true }) });
  assert.equal(processed.status, 202, await processed.clone().text()); const chunked = await processed.json(); assert.equal(chunked.needs_local_read, true);
  assert.deepEqual(Buffer.from(await (await request(`/api/audio/${chunked.submission_id}`, ownerCookie)).arrayBuffer()), bytes);
});

await mkdir(new URL('../.sites-runtime/', import.meta.url), { recursive: true });
const readerBundle = new URL('../.sites-runtime/browser-document-test.mjs', import.meta.url);
await build({ entryPoints: [new URL('../lib/browser-document.ts', import.meta.url).pathname], outfile: readerBundle.pathname, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { needsBrowserDocumentRead, checkedBrowserDocumentText } = await import(readerBundle.href);
test('device extraction rejects empty and oversized output without silently truncating it', () => {
  assert.equal(checkedBrowserDocumentText(` \n${story}\n `), story);
  assert.throws(() => checkedBrowserDocumentText(' \n '));
  assert.throws(() => checkedBrowserDocumentText('أ'.repeat(30_001)));
  for (const name of ['a.PDF', 'a.png', 'a.jpg', 'a.jpeg', 'a.webp']) assert.equal(needsBrowserDocumentRead(name), true);
  for (const name of ['a.html', 'a.svg', 'a.docx', 'a.txt']) assert.equal(needsBrowserDocumentRead(name), false);
});
