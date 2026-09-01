const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const assistantPath = path.join(__dirname, "..", "assets", "voice-assistant.js");
const catalogPath = path.join(__dirname, "..", "assets", "products", "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
let source = fs.readFileSync(assistantPath, "utf8");
source = source.replace(
  "  window.TamweenatAssistant = Object.freeze({",
  "  window.__voiceParserTest = { normal, parsedQuantity, productMentions, quantityForMention, priceNumber, speechText };\n  window.TamweenatAssistant = Object.freeze({",
);

const window = {
  __tamweenatVoiceAssistantLoaded: false,
  TamweenatProductCatalog: catalog.products,
  addEventListener() {},
};
window.window = window;

vm.runInNewContext(source, {
  window,
  location: { pathname: "/saad/tamweenat/login.html" },
  document: {
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; },
    documentElement: { lang: "ar" },
  },
  console,
  setTimeout,
  clearTimeout,
  Intl,
});

const parser = window.__voiceParserTest;
assert.ok(parser, "Voice parser test API was not exposed");

const orderCases = [
  ["أضف 3 عبوات بطاطا مقلية و 2 عبوة جبن شيدر", [3, 2]],
  ["أضف بطاطا مقلية و 2 عبوة جبن شيدر", [1, 2]],
  ["أضف بطاطا مقلية 3 عبوات و جبن شيدر 2 عبوة", [3, 2]],
  ["أضف ٣ عبوات بطاطا مقلية و ٢ عبوة جبن شيدر", [3, 2]],
  ["أبي عبوتين فرايز وثلاث عبوات شيدر", [2, 3]],
  ["أضف بطاطا مقلية عدد 4 وجبن شيدر عدد 2", [4, 2]],
  ["add two packs of fries and three packs of cheddar", [2, 3]],
];

for (const [command, expectedQuantities] of orderCases) {
  const mentions = parser.productMentions(command);
  const quantities = Array.from(mentions, (_, index) => parser.quantityForMention(command, mentions, index));
  assert.deepEqual(quantities, expectedQuantities, command);
}

assert.equal(parser.priceNumber("٦٫٨٠٠ د.ك."), 6.8);
assert.equal(parser.priceNumber("2.500 KWD"), 2.5);
assert.equal(parser.priceNumber("١٬٢٣٤٫٥٠٠ د.ك."), 1234.5);
assert.match(parser.speechText("الإجمالي ٦٫٨٠٠ د.ك."), /دينار كويتي/);
assert.deepEqual(
  Array.from(parser.productMentions("أضف كرتونين حلقات بصل"), (item) => item.canonical),
  ["حلقات بصل لامب ويستون – 1 كغ"],
);
assert.deepEqual(
  Array.from(parser.productMentions("أضف ثلاث عبوات جبن شيدر كرافت"), (item) => item.canonical),
  ["جبن شيدر كرافت – 500 غ"],
);

assert.equal(catalog.products.length, 162);
assert.equal(catalog.priceBasis, "source_website");

console.log(`Voice order parser: ${orderCases.length} order cases passed`);
