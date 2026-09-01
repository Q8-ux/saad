const assert = require("node:assert/strict");
const fs = require("node:fs");
const zlib = require("node:zlib");

const bundles = [
  "tamweenat/assets/app-892215184719.js.gz",
  "tamweenat/assets/app-9e47eff7f33a.js.gz",
  "tamweenat-admin/assets/app-892215184719.js.gz",
  "tamweenat-admin/assets/app-9e47eff7f33a.js.gz",
];

for (const file of bundles) {
  const source = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");

  assert.doesNotMatch(source, /wa\.me|whatsapp|واتساب/i, `${file} must not open WhatsApp`);
  assert.match(source, /`button`,\{type:`button`,className:`support-card`,"data-nav-id":`orders`/, `${file} support card must stay inside the system`);
  assert.match(source, /n===`restaurant`\?\[`overview`,`catalog`,`orders`\]/, `${file} restaurant bottom navigation must be explicit`);
  assert.match(source, /"data-nav-id":e\.id,"aria-label":R\[e\.id\],"aria-current":r===e\.id\?`page`/, `${file} bottom navigation labels and destinations must remain associated`);
  assert.match(source, /className:`mobile-cart-nav`,"data-nav-id":`cart`,"aria-label":R\.cart/, `${file} cart button must open the internal cart`);
  assert.match(source, /className:`product-card`/, `${file} must contain product cards`);
  assert.doesNotMatch(source, /className:`product-card`[^]{0,1200}href:/, `${file} product cards must not be external links`);
}

console.log(`Internal navigation: ${bundles.length} bundles passed`);
