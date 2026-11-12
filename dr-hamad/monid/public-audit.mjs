/**
 * Read-only, source-code SEO audit for Dr Hamad.
 * No patient data or external network calls. Not a Google ranking measurement.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT = fileURLToPath(new URL("./output/public-audit.json", import.meta.url));

export function inspectHtml(html, path) {
  const checks = [];
  function check(id, pass, detail, priority = "medium") {
    checks.push({ id, pass: !!pass, priority, detail });
  }
  const matches = (pattern) => [...html.matchAll(pattern)].map((m) => m[1]);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] ?? "";
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1] ?? "";
  const headings = matches(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi);
  const ids = new Set(matches(/\bid="([^"]+)"/gi));
  const fragments = matches(/\bhref="#([^"]+)"/gi);
  const unresolved = [...new Set(fragments.filter((f) => !ids.has(f)))];
  check("title", title.length >= 15 && title.length <= 90, "Title length: " + title.length, "high");
  check("meta-description", description.length >= 50 && description.length <= 170, "Description length: " + description.length, "high");
  check("canonical", canonical.startsWith("https://q8-ux.github.io/saad/dr-hamad/"), canonical || "Canonical not found", "high");
  check("h1", headings.length === 1, "Number of H1 elements: " + headings.length, "medium");
  check("rtl", /<html[^>]*lang="ar"[^>]*dir="rtl"/i.test(html), "Arabic RTL document declared", "medium");
  check("fragments", unresolved.length === 0, unresolved.length ? "Missing section IDs: " + unresolved.join(", ") : "All same-page targets have IDs", "medium");
  check("og", /<meta\s+property="og:title"/i.test(html) && /<meta\s+property="og:description"/i.test(html), "Open Graph headline/description", "low");
  const externalLinks = matches(/<a\b[^>]*href="(https?:\/\/[^"]+)"/gi);
  check("booking", externalLinks.some((url) => url.startsWith("https://ask.moh.gov.kw")), "Official ministry booking link", "high");
  check("disclaimer", /المحتوى للتثقيف العام|التقييم وخطة العلاج/.test(html), "General information disclaimer", "high");
  return {
    path, title, canonical, checkedAt: new Date().toISOString(), checks,
    passed: checks.filter((c) => c.pass).length,
    failed: checks.filter((c) => !c.pass).length,
    externalLinkCount: externalLinks.length,
  };
}
export async function runAudit({ root = ROOT, output = OUTPUT } = {}) {
  const pages = [];
  for (const filename of ["index.html", "article.html"]) {
    let html;
    try { html = await readFile(new URL(filename, "file://" + root.replace(/\/?$/, "/")), "utf8"); }
    catch { pages.push({ path: filename, error: "File unavailable; manual review needed" }); continue; }
    pages.push(inspectHtml(html, filename));
  }
  const report = {
    project: "dr-hamad",
    kind: "LOCAL_HTML_SEO_AUDIT",
    generatedAt: new Date().toISOString(),
    publicationStatus: "DRAFT_REVIEW_REQUIRED",
    caveat: "Static source audit only; not live site uptime, indexing, search ranking or medical content verification.",
    pages,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  return report;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL("file://" + process.argv[1]))) {
  runAudit().then((r) => console.log("Dr Hamad static SEO audit saved; inspect " + r.pages.length + " page records."))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
