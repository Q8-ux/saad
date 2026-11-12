import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectHtml } from "./public-audit.mjs";
import { runWeekly } from "./run-all.mjs";

const sample = '<!doctype html><html lang="ar" dir="rtl"><head>'
  + '<title>الدكتور حمد ساكت العنزي - عيادة المفاصل</title>'
  + '<meta name="description" content="معلومات تثقيفية عن العظام والمفاصل وأسباب ألم الركبة والورك مع روابط مواعيد العيادة الرسمية.">'
  + '<meta property="og:title" content="Hamad">'
  + '<meta property="og:description" content="Clinic">'
  + '<link rel="canonical" href="https://q8-ux.github.io/saad/dr-hamad/"></head>'
  + '<body><h1>الدكتور حمد</h1><a href="#clinic">العيادة</a><section id="clinic"></section>'
  + '<a href="https://ask.moh.gov.kw">حجز</a><p>المحتوى للتثقيف العام</p></body></html>';

test("HTML source audit verifies important SEO and safety metadata", () => {
  const audit = inspectHtml(sample, "index.html");
  assert.equal(audit.failed, 0);
  assert.equal(audit.checks.length, 9);
});
test("HTML audit reports missing internal navigation targets without changing source", () => {
  const audit = inspectHtml(sample.replace('id="clinic"', 'id="other"'), "index.html");
  assert.ok(audit.checks.find((c) => c.id === "fragments" && !c.pass));
});
test("weekly report works with no Monid secret and never accesses paid endpoints", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hamad-weekly-"));
  const output = join(dir, "weekly.json");
  let requested = 0;
  const result = await runWeekly({
    env: {},
    audit: async () => ({ pages: [{ failed: 0 }] }),
    discover: async () => { requested++; throw new Error("should not call Monid"); },
    output,
  });
  assert.equal(requested, 0);
  assert.equal(result.paidRunCount, 0);
  assert.equal(result.topics.length, 4);
  assert.equal(result.status, "MONID_AWAITING_KEY__SEO_AUDIT_READY");
  assert.equal(JSON.parse(await readFile(output,"utf8")).topics[0].status,"AWAITING_MONID_API_KEY");
});
test("weekly Monid discovery and price inspection are free-mode only", async () => {
  const dir=await mkdtemp(join(tmpdir(), "hamad-weekly-"));
  const calls=[];
  const result=await runWeekly({
    env: {MONID_API_KEY:"monid_live_unit_test"},
    audit:async()=>({pages:[]}),
    output:join(dir,"weekly.json"),
    discover:async({env})=>{
      calls.push(env.MONID_MODE);
      if(env.MONID_MODE === "discover") return {payload:{candidates:[{provider:"apify",endpoint:"/search",price:{type:"PER_CALL",amount:.01,currency:"USD"}}]}};
      return {payload:{price:{type:"PER_CALL",amount:.01,currency:"USD"},inputSchema:{type:"object"}}};
    },
  });
  assert.equal(result.status,"MONID_DISCOVERY_COMPLETE");
  assert.equal(result.paidRunCount,0);
  assert.deepEqual(calls,["discover","inspect","discover","inspect","discover","inspect","discover","inspect"]);
});
