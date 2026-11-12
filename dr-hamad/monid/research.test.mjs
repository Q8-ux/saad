import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResearch } from "./research.mjs";

const env = (extras = {}) => ({
  MONID_API_KEY: "monid_test_synthetic",
  MONID_TOPIC: "seo-kuwait",
  MONID_MODE: "discover",
  ...extras,
});
const mock = (status, body) => async (url, options) => {
  assert.equal(new URL(url).origin, "https://api.monid.ai");
  assert.equal(options.headers.Authorization, "Bearer monid_test_synthetic");
  return { ok: status >= 200 && status < 300, status, json: async () => body };
};
const temp = async () => mkdtemp(join(tmpdir(), "dr-hamad-monid-"));

test("discovers candidate tools with a fixed non-patient query", async () => {
  const dir = await temp(), reportFile = join(dir, "report.json");
  const response = mock(200, { results: [{ provider:"demo", providerName:"Demo",endpoint:"/search", price:{type:"PER_CALL",amount:0.003,currency:"USD"} }] });
  const report = await runResearch({ env: env({ MONID_OUTPUT:reportFile }), fetchImpl:response });
  assert.equal(report.publicationStatus, "DRAFT_REVIEW_REQUIRED");
  assert.equal(report.payload.candidates[0].provider,"demo");
  const saved = JSON.parse(await readFile(reportFile, "utf8"));
  assert.equal(saved.payload.candidates.length,1);
  assert.ok(!JSON.stringify(saved).includes("monid_test_synthetic"));
});
test("inspects tool and exposes schema but does not run it", async () => {
  const dir = await temp(), calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(url);
    return mock(200, { price:{type:"PER_CALL",amount:0.01,currency:"USD"},inputSchema:{ type:"object" } })(url, opts);
  };
  const result=await runResearch({env:env({MONID_MODE:"inspect",MONID_PROVIDER:"demo",MONID_ENDPOINT:"/search",MONID_OUTPUT:join(dir,"report.json")}),fetchImpl});
  assert.equal(result.mode,"inspect");
  assert.equal(calls.length,1);
  assert.match(calls[0],/\/inspect$/);
});
test("rejects missing key, arbitrary topic, and invalid endpoint", async () => {
  await assert.rejects(runResearch({env:env({MONID_API_KEY:""})}),/MONID_API_KEY/);
  await assert.rejects(runResearch({env:env({MONID_TOPIC:"patient-specific"})}),/Unapproved topic/);
  await assert.rejects(runResearch({env:env({MONID_MODE:"inspect",MONID_PROVIDER:"demo",MONID_ENDPOINT:"https://evil.tld"})}),/Valid provider/);
});
test("blocks paid call unless explicitly enabled and allowlisted", async () => {
  const dir = await temp(), allowlist = join(dir,"allowlist.json");
  await writeFile(allowlist,"[]");
  const fetchImpl = mock(200,{price:{type:"PER_CALL",amount:0.01,currency:"USD"}});
  const base = env({MONID_MODE:"run",MONID_PROVIDER:"demo",MONID_ENDPOINT:"/search",MONID_OUTPUT:join(dir,"report.json")});
  await assert.rejects(runResearch({env:base,fetchImpl,allowlist}),/explicit manual enablement/);
  await assert.rejects(runResearch({env:{...base,MONID_ENABLE_RUN:"YES"},fetchImpl,allowlist}),/not reviewed and approved/);
});
test("enforces fixed-cost cap before calling paid endpoint", async () => {
  const dir=await temp(),allowlist=join(dir,"allowlist.json"), calls=[];
  await writeFile(allowlist,JSON.stringify([{topic:"seo-kuwait",provider:"demo",endpoint:"/search",maxPriceUsd:0.02,input:{query:"knee surgery Kuwait"}}]));
  const fetchImpl=async(url,opts)=>{
    calls.push(url);
    return mock(200, {price:{type:"PER_CALL",amount:0.04,currency:"USD"}})(url,opts);
  };
  await assert.rejects(runResearch({env:env({MONID_MODE:"run",MONID_PROVIDER:"demo",MONID_ENDPOINT:"/search",MONID_ENABLE_RUN:"YES"}),fetchImpl,allowlist}),/price must be/);
  assert.equal(calls.length,1);
});
test("runs one approved fixed-price request and stores draft", async () => {
  const dir=await temp(),allowlist=join(dir,"allowlist.json"),output=join(dir,"out.json"),calls=[];
  await writeFile(allowlist,JSON.stringify([{topic:"seo-kuwait",provider:"demo",endpoint:"/search",maxPriceUsd:0.02,input:{query:"knee Kuwait"}}]));
  const fetchImpl=async(url,opts)=>{
    calls.push(url);
    if(url.endsWith("/inspect")) return mock(200,{price:{type:"PER_CALL",amount:0.01,currency:"USD"}})(url,opts);
    return mock(200,{status:"COMPLETED",output:{links:[]},runId:"demo001",providerResponse:{httpStatus:200},billing:{actualCost:{value:10000,unit:"MICRO_DOLLAR",currency:"USD"}}})(url,opts);
  };
  const result=await runResearch({env:env({MONID_MODE:"run",MONID_PROVIDER:"demo",MONID_ENDPOINT:"/search",MONID_ENABLE_RUN:"YES",MONID_OUTPUT:output}),fetchImpl,allowlist});
  assert.equal(result.payload.status,"COMPLETED");
  assert.equal(calls.length,2);
  assert.equal(JSON.parse(await readFile(output,"utf8")).publicationStatus,"DRAFT_REVIEW_REQUIRED");
});
