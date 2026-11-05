import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source = readFileSync(new URL("../app/api/integrations/bolt-memos/route.ts", import.meta.url),"utf8");
test("generated memo bridge is private and does not allow anonymous list",()=>{
  assert.match(source,/SABEQ_BOLT_MEMO_BRIDGE_SECRET/);
  assert.match(source,/x-sabeq-timestamp/);
  assert.match(source,/x-sabeq-signature/);
  assert.match(source,/equalHex\(supplied,/);
  assert.match(source,/allowedAgeSeconds/);
  assert.match(source,/export async function GET\(\)/);
  assert.doesNotMatch(source,/Access-Control-Allow-Origin/);
});
test("generated list omits submissions and returns sanitized metadata",()=>{
  assert.match(source,/view: "generated"/);
  assert.match(source,/has_output:/);
  assert.match(source,/managerMemos\(url\)/);
  assert.doesNotMatch(source,/input_json:/);
  assert.doesNotMatch(source,/input_text:/);
});
test("detail is read-only and retains generated legal grounds",()=>{
  assert.match(source,/payload.action === "get"/);
  assert.match(source,/output_text: typeof memo.output_text/);
  assert.doesNotMatch(source,/export async function PUT/);
  assert.doesNotMatch(source,/UPDATE management_memo_requests/);
});
