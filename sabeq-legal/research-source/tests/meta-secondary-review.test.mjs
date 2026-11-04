import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/meta-secondary-review.ts", import.meta.url), "utf8");
const primary = readFileSync(new URL("../lib/openai.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/legal/memo/route.ts", import.meta.url), "utf8");

function configured(env) {
  const tsOutput = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(tsOutput, {
    exports,
    require: (name) => {
      if (name === "cloudflare:workers") return {env};
      if (name === "./llama-openrouter") return {
        DEFAULT_FREE_LLAMA_MODEL:"meta-llama/llama-3.3-70b-instruct:free",
        openRouterAsResponses: async () => {throw Error("Unexpected third-party call");},
      };
      throw Error("Unexpected module");
    },
  });
  return exports;
}

test("second opinion is disabled by default even if a provider key exists", () => {
  assert.equal(configured({OPENROUTER_API_KEY:"sample"}).secondaryReviewConfigured({OPENROUTER_API_KEY:"sample"}),false);
});

test("second opinion requires two explicit server-side permissions and a key", () => {
  const module = configured({});
  assert.equal(module.secondaryReviewConfigured({SABEQ_META_SECOND_REVIEW:"enabled", OPENROUTER_API_KEY:"sample"}),false);
  assert.equal(module.secondaryReviewConfigured({SABEQ_META_CASE_DATA_APPROVED:"approved", OPENROUTER_API_KEY:"sample"}),false);
  assert.equal(module.secondaryReviewConfigured({SABEQ_META_SECOND_REVIEW:"enabled",SABEQ_META_CASE_DATA_APPROVED:"approved"}),false);
  assert.equal(module.secondaryReviewConfigured({SABEQ_META_SECOND_REVIEW:"enabled",SABEQ_META_CASE_DATA_APPROVED:"approved",OPENROUTER_API_KEY:"sample"}),true);
});

test("unapproved case text is not sent to an external model", async () => {
  const module = configured({OPENROUTER_API_KEY:"sample"});
  assert.equal(await module.reviewMissingLegalIssues([{issue:"synthetic issue"}],"Synthetic grounds"),null);
});

test("OpenAI remains primary for drafting and intake and secondary concerns gap review only", () => {
  assert.ok(primary.includes('getOpenAIEnvironment()'));
  assert.ok(!primary.includes('freeLlamaEnvironment'));
  assert.ok(!primary.includes('openRouterAsResponses'));
  assert.ok(route.includes('reviewMissingLegalIssues(checkedPlan.issues, content.grounds, signal)'));
  assert.ok(route.includes('reviewLegalCitations'));
  assert.ok(route.includes('prepareBoundDraft'));
});
