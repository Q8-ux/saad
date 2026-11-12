import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import vm from "node:vm";

const directory = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(directory, "index.html"), "utf8");
const js = readFileSync(resolve(directory, "app.js"), "utf8");
const css = readFileSync(resolve(directory, "styles.css"), "utf8");

// Compile the entire app, then evaluate only its STATIC TRANSLATION AND SERVICE DATA.
// Do not execute browser functionality in this Node test.
new vm.Script(js, { filename: "app.js" });
const staticCode = js.slice(0, js.indexOf("const dom ="));
assert.ok(staticCode.includes("const translations ="), "Static data missing");
const context = vm.createContext({});
vm.runInContext(staticCode + "\nthis.__data = { translations, serviceData };", context);
const { translations, serviceData } = context.__data;

const locales = ["ar", "en", "fr", "ur", "hi", "zh"];
assert.deepEqual(Object.keys(translations).sort(), [...locales].sort());
const uiKeys = [...html.matchAll(/data-i18n(?:-placeholder|-title)?="([^"]+)"/g)].map(match => match[1]);
for (const locale of locales) {
  for (const key of uiKeys) {
    assert.ok(translations[locale][key], locale + " missing UI label: " + key);
  }
  for (const service of serviceData) {
    const item = translations[locale].service[service.id];
    assert.ok(Array.isArray(item) && item.length === 2 && item.every(Boolean),
      locale + " missing service: " + service.id);
  }
}
assert.equal(serviceData.length, 8, "Expected eight grounded services");
assert.ok(serviceData.every(service => service.url === "./page.html?topic=" + service.id),
  "Every homepage service must open its own internal detail route");
assert.ok(!html.includes("nlk.gov.kw") && !js.includes("nlk.gov.kw"),
  "No homepage link may send the visitor back to the previous site");
const detailHtml = readFileSync(resolve(directory, "page.html"), "utf8");
const detailJs = readFileSync(resolve(directory, "pages.js"), "utf8");
const detailCss = readFileSync(resolve(directory, "pages.css"), "utf8");
new vm.Script(detailJs, { filename: "pages.js" });
const detailsContext = vm.createContext({});
const preamble = detailJs.slice(0, detailJs.indexOf("const store="));
assert.ok(preamble.includes("const localization"), "Internal page text data missing");
vm.runInContext(preamble + "\nthis.__details = { pages, localization };", detailsContext);
const { pages, localization } = detailsContext.__details;
assert.equal(Object.keys(pages).length, 14, "Expected 14 independently addressable topics");
for (const locale of locales) {
  const group = localization[locale];
  assert.ok(group && group.ui, "Missing internal page locale: " + locale);
  for (const topic of Object.keys(pages)) {
    const copy = group.topics[topic];
    assert.ok(Array.isArray(copy) && copy.length === 5 && copy.every(Boolean),
      "Missing internal page content: " + locale + "/" + topic);
  }
}
for (const match of html.matchAll(/href="\.\/page\.html\?topic=([^"&]+)"/g)) {
  assert.ok(Object.hasOwn(pages, match[1]), "Broken internal topic: " + match[1]);
}
assert.ok(detailHtml.includes('id="detail-points"'), "Detail content container missing");
assert.ok(detailCss.includes(".inner-body"), "Detail responsive CSS missing");
assert.ok(!detailHtml.includes("nlk.gov.kw"), "Detail template contains old site links");
assert.ok(html.includes('content="noindex,nofollow"'), "Prototype should not be indexed");
assert.ok(html.includes('class="prototype-note"'), "Unofficial disclaimer missing");
assert.ok(css.includes("prefers-reduced-motion"), "Reduced-motion support missing");
assert.ok(css.includes("family=Cairo:wght@400;500;600;700;800"), "Cairo web-font import missing");
assert.ok(css.includes('html[lang="ar"] body'), "Arabic locale font selector missing");
assert.ok(css.includes('font-family: "Cairo", "Noto Sans Arabic"'), "Arabic Cairo font not configured");
assert.ok(css.includes("transition:none!important;animation:none!important}}"),
  "Critical CSS reduced-motion rule was truncated");
assert.ok(!css.includes("Noor"), "Obsolete Noor font rules still present");
assert.ok(js.includes('document.documentElement.dir='), "Direction switching missing");
console.log("PASS: syntax, Cairo, six locales, 14 internal topics, 8 redirected service cards and no legacy links.");
