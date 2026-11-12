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
assert.ok(serviceData.every(service => service.url.startsWith("https://www.nlk.gov.kw/")),
  "Service links must point only to verified official domain pages");
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
console.log("PASS: JavaScript syntax, 6 complete UI localizations, 8 services, trusted links and baseline accessibility hooks.");
