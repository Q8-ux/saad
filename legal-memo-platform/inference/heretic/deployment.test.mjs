import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = name => readFile(new URL(`./${name}`, import.meta.url), "utf8");

test("GPU service requires bearer secret, no public inference port, and no prompt logging", async () => {
  const compose = await read("compose.yaml");
  assert.match(compose, /server-cuda/);
  assert.match(compose, /--api-key-file/);
  assert.match(compose, /inference_api_key/);
  assert.match(compose, /--log-disable/);
  assert.match(compose, /capabilities: \[gpu\]/);
  assert.doesNotMatch(compose, /8080:8080/);
  assert.match(compose, /model_cache:/);
  assert.match(compose, /--no-mmproj/);
});

test("TLS ingress exposes only chat completions and denies all other routes", async () => {
  const caddy = await read("Caddyfile");
  assert.match(caddy, /\{\$HERETIC_HOSTNAME\}/);
  assert.match(caddy, /method POST/);
  assert.match(caddy, /path \/v1\/chat\/completions/);
  assert.match(caddy, /respond 404/);
});

test("synthetic smoke test uses HTTPS and does not print user content", async () => {
  const smoke = await read("smoke-test.mjs");
  assert.match(smoke, /endpoint.protocol !== "https:"/);
  assert.match(smoke, /syntheticDataOnly: true/);
  assert.doesNotMatch(smoke, /console\.log\(.*message\.content/);
});
