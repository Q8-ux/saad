const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const PUBLIC_DIR = path.join(process.cwd(), "public");

function localPath(reference) {
  return path.join(PUBLIC_DIR, reference.split("?")[0].replace(/^\//, ""));
}

test("the page, stylesheet and manifest reference existing local assets", () => {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(PUBLIC_DIR, "style.css"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, "manifest.webmanifest"), "utf8"));

  const htmlReferences = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)]
    .map(match => match[1])
    .filter(reference => !reference.startsWith("/socket.io/"));
  const cssReferences = [...css.matchAll(/url\(["']?(\/[^"')]+)["']?\)/g)].map(match => match[1]);
  const manifestReferences = (manifest.icons || []).map(icon => icon.src);

  [...new Set([...htmlReferences, ...cssReferences, ...manifestReferences])].forEach(reference => {
    assert.equal(fs.existsSync(localPath(reference)), true, `Missing public asset: ${reference}`);
  });

  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.dir, "rtl");
  assert.equal(manifest.icons.some(icon => icon.sizes === "512x512"), true);
});

test("the V5 stylesheet parses without CSSOM errors", () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, "style.css"), "utf8");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));

  const dom = new JSDOM(`<style>${css}</style>`, { virtualConsole });
  const rules = dom.window.document.styleSheets[0]?.cssRules.length || 0;

  assert.equal(errors.length, 0);
  assert.ok(rules > 250, `Expected the full design system, received ${rules} CSS rules.`);
  dom.window.close();
});
