import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
const source = readFileSync(new URL("../lib/llama-openrouter.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let captured = null;
vm.runInNewContext(compiled, {
  exports, Response, AbortSignal, fetch: async (url, init) => {
    captured = { url, init, request: JSON.parse(init.body) };
    return Response.json({ choices: [{ message: { content: '{"assistantMessage":"فهمت الوقائع"}' }, finish_reason: "stop" }] });
  },
});

test("free Llama endpoint is restricted to free models and no credentials are stored in code", () => {
  assert.equal(exports.DEFAULT_FREE_LLAMA_MODEL, "meta-llama/llama-3.3-70b-instruct:free");
  assert.throws(() => exports.openRouterRequest({ input:"case" }, "meta-llama/llama-3.3-70b-instruct"), /free/);
  assert.equal(source.includes("OPENROUTER_API_KEY="), false);
});

test("compatible assistant response uses the server-only key and provider API", async () => {
  const response = await exports.openRouterAsResponses({ instructions:"case facts only", input:"synthetic facts", max_output_tokens:2000 }, "private-test-token");
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.status, "completed");
  assert.match(data.output_text, /فهمت الوقائع/);
  assert.equal(captured.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(captured.init.headers.Authorization, "Bearer private-test-token");
  assert.equal(captured.request.model, exports.DEFAULT_FREE_LLAMA_MODEL);
  assert.equal(captured.request.messages[1].content, "synthetic facts");
});

test("model intake streaming is bridged to a complete Responses event", async () => {
  const response = await exports.openRouterAsResponses({ instructions:"structured", input:"synthetic", stream:true, text:{ format:{ type:"json_schema",name:"case",schema:{type:"object",properties:{assistantMessage:{type:"string"}},required:["assistantMessage"]} } } }, "private-test-token");
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  assert.match(await response.text(), /response.completed/);
  assert.equal(captured.request.response_format.type, "json_schema");
  assert.equal(captured.request.stream, false);
});
