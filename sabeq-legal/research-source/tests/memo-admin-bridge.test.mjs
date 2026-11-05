import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../app/api/bridge/memos/route.ts', import.meta.url), 'utf8');
test('memo bridge signs raw request with HMAC and enforces age', () => {
  for (const expected of ['SABEQ_MEMO_BRIDGE_SECRET', 'crypto.subtle.verify', 'X-Sabeq-Timestamp', 'X-Sabeq-Signature', 'age > 300', 'age < -60']) {
    assert.ok(source.includes(expected), expected);
  }
});
test('memo bridge serves metadata on list and full text only on get', () => {
  assert.match(source, /LIMIT 51 OFFSET/);
  assert.match(source, /hasMore: values.length > 50/);
  assert.match(source, /WHERE id = \?/);
  assert.match(source, /output_text: row.output_text/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin/);
});
