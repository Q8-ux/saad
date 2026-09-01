const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const assistantPath = path.join(__dirname, "..", "assets", "voice-assistant.js");
let source = fs.readFileSync(assistantPath, "utf8");
source = source.replace(
  "  window.TamweenatAssistant = Object.freeze({",
  "  window.__voiceParserTest = { normal, parsedQuantity, productMentions, quantityForMention, priceNumber, speechText };\n  window.TamweenatAssistant = Object.freeze({",
);

const window = {
  __tamweenatVoiceAssistantLoaded: false,
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
  ["أضف 3 كراتين بطاطا مقلية و 2 كرتون جبن شيدر", [3, 2]],
  ["أضف بطاطا مقلية و 2 كرتون جبن شيدر", [1, 2]],
  ["أضف بطاطا مقلية 3 كراتين و جبن شيدر 2 كرتون", [3, 2]],
  ["أضف ٣ كراتين بطاطا مقلية و ٢ كرتون جبن شيدر", [3, 2]],
  ["أبي كرتونين فرايز وثلاث كراتين شيدر", [2, 3]],
  ["أضف بطاطا مقلية عدد 4 وجبن شيدر عدد 2", [4, 2]],
  ["add two cartons of fries and three boxes of cheddar", [2, 3]],
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
  ["حلقات بصل مجمدة"],
);
assert.deepEqual(
  Array.from(parser.productMentions("أضف ثلاث علب معجون طماطم"), (item) => item.canonical),
  ["معجون طماطم للمطاعم"],
);

console.log(`Voice order parser: ${orderCases.length} order cases passed`);
