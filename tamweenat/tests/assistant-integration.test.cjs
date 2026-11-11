const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const restaurant = read("tamweenat/login.html");
const home = read("tamweenat/index.html");
const admin = read("tamweenat-admin/index.html");
const support = read("tamweenat/assets/support-runtime.js");
const voice = read("tamweenat/assets/voice-assistant.js");
const api = read("tamweenat-api/server.js");

// The public storefront uses the lightweight cart/assistant runtime; the login URL redirects to it.
assert.ok(restaurant.includes('location.replace("./")'), 'restaurant login must redirect to storefront');
assert.ok(home.includes('assistant-v1.js'), 'storefront must provide ordering assistant');
assert.ok(home.includes('cart-v2.js'), 'storefront must provide the live basket');
assert.ok(admin.includes('admin-v23.js'), 'admin must load its own dashboard');
// Legacy bundled pages, when present, still require support runtime before their loader.
for (const [name, source] of [["restaurant", restaurant], ["home", home], ["admin", admin]]) {
  if (source.includes('loader-807f1f72f7f0.js')) {
    assert.ok(source.includes('support-runtime.js'), `${name} must load the reliability runtime`);
    assert.ok(source.indexOf('support-runtime.js') < source.indexOf('loader-807f1f72f7f0.js'));
  }
}
assert.match(support, /service_temporarily_unavailable/);
assert.match(support, /\/api\/ai\/catalog-assistant/);
assert.match(voice, /askSmartAssistant/);
assert.match(voice, /analysisFromAssistantPlan/);
assert.match(voice, /TamweenatAssistant/);
assert.match(api, /ASSISTANT_PLAN_SCHEMA/);
assert.match(api, /assistantRateLimit/);
assert.match(api, /\['add','remove','checkout'\]\.includes\(intent\)/, "mutating assistant plans must require confirmation");
assert.match(api, /store:false/, "assistant responses must not be stored by the model provider");

const release = JSON.parse(read("tamweenat/release-manifest.json"));
assert.equal(release.supportRuntimeVersion, "2.0.0");
assert.equal(release.voiceAssistantVersion, "2.0.0");
assert.equal(release.voiceAssistantApprovalRequired, true);

console.log("Tamweenat assistant integration checks passed");
