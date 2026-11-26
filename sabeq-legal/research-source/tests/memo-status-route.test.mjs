import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const requestId = "00000000-0000-4000-8000-000000000001";

function route({ row, user }) {
  const source = readFileSync(new URL("../app/api/legal/memo/route.ts", import.meta.url), "utf8");
  const exports = {};
  const calls = { prepared: 0, bound: [], rate: [] };
  class RequestError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
  }
  const generic = new Proxy({}, { get() { return () => { throw new Error("Unexpected POST dependency in GET status test"); }; } });
  const database = {
    prepare(sql) {
      calls.prepared += 1;
      assert.match(sql, /management_memo_requests/);
      return {
        bind(...values) {
          calls.bound.push(values);
          return { async first() { return row; } };
        },
      };
    },
  };
  const security = {
    assertSameOrigin() {},
    corsPreflight() {},
    async enforceRateLimit(_request, key, limit, period) { calls.rate.push({ key, limit, period }); },
    errorResponse(error) { return Response.json({ error: error.message }, { status: error.status || 500 }); },
    privateJson(data, status = 200) { return Response.json(data, { status }); },
    RequestError,
  };
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require(name) {
      if (name === "@/db") return { getD1: () => database };
      if (name === "@/lib/public-auth") return { requireMemoUserOrGuest: async () => user };
      if (name === "@/lib/request-security") return security;
      return generic;
    },
    Request, Response, URL, AbortSignal, crypto, console,
  });
  return { GET: exports.GET, calls };
}

function statusRequest(id = requestId) {
  return new Request(`https://sabeq.example/api/legal/memo?id=${encodeURIComponent(id)}`, {
    headers: { Origin: "https://www.sabeq.legal" },
  });
}

test("memo status returns only the allowlisted state and draft-presence flag", async () => {
  const { GET, calls } = route({
    user: { id: "user-1" },
    row: { user_id: "user-1", status: "needs_review", has_draft: 1, output_text: "PRIVATE DRAFT", error_code: "PRIVATE ERROR" },
  });
  const response = await GET(statusRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await response.json())), {
    requestId,
    status: "needs_review",
    hasDraft: true,
  });
  assert.deepEqual(calls.bound, [[requestId]]);
  assert.deepEqual(calls.rate, [{ key: "memo-request-status", limit: 120, period: "hour" }]);
});

test("memo status hides an account-bound request from a different user", async () => {
  const { GET } = route({
    user: { id: "user-2" },
    row: { user_id: "user-1", status: "needs_review", has_draft: 1 },
  });
  const response = await GET(statusRequest());
  assert.equal(response.status, 404);
  assert.deepEqual(JSON.parse(JSON.stringify(await response.json())), { error: "تعذر العثور على طلب المذكرة." });
});

test("guest memo status requires the exact UUID capability and returns no private record data", async () => {
  const { GET, calls } = route({
    user: null,
    row: { user_id: null, status: "running", has_draft: 0, input_json: "PRIVATE CASE" },
  });
  const response = await GET(statusRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await response.json())), { requestId, status: "running", hasDraft: false });
  assert.deepEqual(calls.bound, [[requestId]]);
});

test("invalid memo references are rejected before database access", async () => {
  const { GET, calls } = route({ user: null, row: null });
  const response = await GET(statusRequest("not-a-request-id"));
  assert.equal(response.status, 400);
  assert.equal(calls.prepared, 0);
});
