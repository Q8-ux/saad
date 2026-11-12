/**
 * Dr Hamad — Monid research adapter, manual and privacy-first.
 * Node.js 20+; no patient data and no browser secrets.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const TOPICS = Object.freeze({
  "seo-kuwait": "Google organic search results for orthopaedic knee and hip surgery educational topics in Kuwait",
  "knee-education": "Web search for knee osteoarthritis research guideline updates NICE AAOS Cochrane",
  "hip-education": "Web search for hip replacement rehabilitation evidence guidelines AAOS NICE",
  "social-public": "Public Instagram profile engagement and public posts analytics without personal or private data",
});

const URL_BASE = "https://api.monid.ai";
const DEFAULT_REPORT = fileURLToPath(new URL("./output/report.json", import.meta.url));
const ALLOWLIST = fileURLToPath(new URL("./approved-endpoints.json", import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validId(s) {
  return typeof s === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(s);
}
function validEndpoint(s) {
  return typeof s === "string" && /^\/[a-zA-Z0-9_./-]{1,160}$/.test(s) && !s.includes("..");
}
function cleanError(response) {
  return "Monid returned HTTP " + response.status + " (request details withheld)";
}
async function request({ key, path, body, method = "POST", fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  try {
    const response = await fetchImpl(URL_BASE + path, {
      method,
      headers: {
        Authorization: "Bearer " + key,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(cleanError(response));
    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Unexpected Monid response");
    return { data, httpStatus: response.status };
  } finally {
    clearTimeout(timeout);
  }
}
function requirePrice(price, maxPriceUsd) {
  if (!price || price.type !== "PER_CALL" || price.currency !== "USD"
    || !Number.isFinite(price.amount) || price.amount < 0
    || price.amount > maxPriceUsd) {
    throw new Error("Paid run blocked: price must be a verified fixed USD price within cap");
  }
}
function validateProviderResult(data) {
  if (data.status === "FAILED" || (data.providerResponse?.httpStatus ?? 200) >= 400) {
    throw new Error("Monid provider run failed; inspect provider status manually");
  }
}
export async function runResearch({ env = process.env, fetchImpl = globalThis.fetch, pause = sleep, allowlist = ALLOWLIST } = {}) {
  const key = env.MONID_API_KEY;
  if (!key || !/^monid_[\w-]+/.test(key)) throw new Error("MONID_API_KEY is missing or invalid");
  const topic = env.MONID_TOPIC || "seo-kuwait";
  if (!Object.hasOwn(TOPICS, topic)) throw new Error("Unapproved topic");
  const mode = env.MONID_MODE || "discover";
  let payload;

  if (mode === "discover") {
    const { data } = await request({
      key, path: "/v1/discover",
      body: { query: TOPICS[topic], limit: 5 }, fetchImpl,
    });
    payload = {
      query: TOPICS[topic],
      candidates: (Array.isArray(data.results) ? data.results : []).slice(0, 5).map((r) => ({
        provider: r.provider, name: r.providerName, endpoint: r.endpoint,
        description: r.description, price: r.price,
      })),
    };
  } else if (mode === "inspect" || mode === "run") {
    const provider = env.MONID_PROVIDER, endpoint = env.MONID_ENDPOINT;
    if (!validId(provider) || !validEndpoint(endpoint)) throw new Error("Valid provider and endpoint required");
    const { data: detail } = await request({
      key, path: "/v1/inspect", body: { provider, endpoint }, fetchImpl,
    });
    if (mode === "inspect") {
      payload = {
        provider, endpoint, description: detail.description, price: detail.price,
        inputSchema: detail.inputSchema, docUrl: detail.docUrl, notes: detail.notes,
      };
    } else {
      if (env.MONID_ENABLE_RUN !== "YES") throw new Error("Paid run requires explicit manual enablement");
      const configs = JSON.parse(await readFile(allowlist, "utf8"));
      if (!Array.isArray(configs)) throw new Error("Invalid approved endpoints configuration");
      const approved = configs.find((c) => c.topic === topic && c.provider === provider && c.endpoint === endpoint);
      if (!approved || !approved.input || typeof approved.input !== "object" || Array.isArray(approved.input)) {
        throw new Error("Endpoint not reviewed and approved for this topic");
      }
      const cap = Number(approved.maxPriceUsd);
      if (!Number.isFinite(cap) || cap < 0 || cap > 0.05) throw new Error("Maximum price cap is invalid");
      requirePrice(detail.price, cap);
      let result = await request({
        key, path: "/v1/run",
        body: { provider, endpoint, input: approved.input }, fetchImpl,
      });
      let data = result.data;
      if (result.httpStatus === 202) {
        const runId = data.runId;
        if (!validId(runId)) throw new Error("Invalid asynchronous run identifier");
        let complete = false;
        for (let i = 0; i < 8; i++) {
          await pause(2500);
          ({ data } = await request({
            key, method: "GET", path: "/v1/runs/" + runId, fetchImpl,
          }));
          if (data.status === "FAILED" || data.status === "COMPLETED") { complete = true; break; }
        }
        if (!complete) throw new Error("Provider run pending; check Monid dashboard");
      }
      validateProviderResult(data);
      const resultText = JSON.stringify(data.output ?? null);
      payload = {
        provider, endpoint, status: data.status, runId: data.runId,
        providerHttpStatus: data.providerResponse?.httpStatus ?? null,
        resultCount: data.resultCount ?? null,
        output: resultText.length <= 100000 ? data.output : { truncated: true },
        actualCost: data.billing?.actualCost ?? null,
      };
    }
  } else {
    throw new Error("Unsupported mode");
  }

  const report = {
    service: "monid", project: "dr-hamad", mode, topic,
    generatedAt: new Date().toISOString(),
    publicationStatus: "DRAFT_REVIEW_REQUIRED",
    medicalDisclaimer: "Discovery or external results are not medical evidence. Review original publications before public use.",
    payload,
  };
  const file = env.MONID_OUTPUT || DEFAULT_REPORT;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  return report;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL("file://" + process.argv[1]))) {
  runResearch()
    .then((r) => console.log("Monid " + r.mode + " complete. Editorial review required."))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
}
