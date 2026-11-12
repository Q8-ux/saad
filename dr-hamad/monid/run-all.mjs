/**
 * Weekly research coordinator: free local audit always; Monid discovery/inspection
 * only when its secret is available. Never executes a paid /v1/run.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TOPICS, runResearch } from "./research.mjs";
import { runAudit } from "./public-audit.mjs";

const OUTPUT = fileURLToPath(new URL("./output/weekly-summary.json", import.meta.url));

export async function runWeekly({ env = process.env, discover = runResearch, audit = runAudit, output = OUTPUT } = {}) {
  const seoAudit = await audit();
  const hasKey = /^monid_live_[A-Za-z0-9_-]+$/.test(env.MONID_API_KEY ?? "");
  const topics = [];
  for (const topic of Object.keys(TOPICS)) {
    if (!hasKey) {
      topics.push({ topic, status: "AWAITING_MONID_API_KEY", inspected: [], candidates: [] });
      continue;
    }
    try {
      const report = await discover({
        env: { ...env, MONID_MODE: "discover", MONID_TOPIC: topic,
          MONID_OUTPUT: fileURLToPath(new URL("./output/" + topic + "-discover.json", import.meta.url)) },
      });
      const candidates = report.payload.candidates ?? [];
      const inspected = [];
      for (const candidate of candidates.filter((c) => c.provider && c.endpoint).slice(0, 2)) {
        try {
          const inspectedReport = await discover({
            env: { ...env, MONID_MODE: "inspect", MONID_TOPIC: topic,
              MONID_PROVIDER: candidate.provider, MONID_ENDPOINT: candidate.endpoint,
              MONID_OUTPUT: fileURLToPath(new URL("./output/" + topic + "-" + inspected.length + "-inspect.json", import.meta.url)) },
          });
          inspected.push({
            provider: candidate.provider, endpoint: candidate.endpoint,
            price: inspectedReport.payload.price,
            inputSchema: inspectedReport.payload.inputSchema,
            docUrl: inspectedReport.payload.docUrl,
          });
        } catch (e) {
          inspected.push({ provider: candidate.provider, endpoint: candidate.endpoint, status: "ERROR", error: e.message });
        }
      }
      topics.push({ topic, status: "DISCOVERY_COMPLETE", candidates, inspected });
    } catch (e) {
      topics.push({ topic, status: "MONID_ERROR", error: e.message, inspected: [], candidates: [] });
    }
  }
  const summary = {
    project: "dr-hamad",
    mode: "FREE_DISCOVERY_AND_QA_ONLY",
    published: false,
    generatedAt: new Date().toISOString(),
    status: !hasKey ? "MONID_AWAITING_KEY__SEO_AUDIT_READY"
      : topics.some((t) => t.status === "MONID_ERROR") ? "MONID_PARTIAL_ERRORS" : "MONID_DISCOVERY_COMPLETE",
    paidRunCount: 0,
    editorialApprovalRequired: true,
    caveat: "This does not prove SEO rank, Instagram reach, clinical validity, or access to private analytics.",
    localSeoAudit: {
      checkedPages: seoAudit.pages?.length ?? 0,
      pagesWithFindings: (seoAudit.pages ?? []).filter((p) => p.failed > 0).length,
    },
    topics,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
  return summary;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL("file://" + process.argv[1]))) {
  runWeekly().then((r) => {
    console.log("Dr Hamad weekly QA: " + r.status);
    if (r.status !== "MONID_DISCOVERY_COMPLETE") console.log("::warning::" + r.status + "; review the report artifact.");
  }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
