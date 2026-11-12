import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("live GPU deploy is only manual on main and cannot run without explicit cost approval and secrets", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/sabeq-heretic-gpu-deploy.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  push:/m);
  assert.match(workflow, /deploy_to_authorized_gpu:/);
  assert.match(workflow, /default: false/);
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /inputs.deploy_to_authorized_gpu == true/);
  assert.match(workflow, /environment: sabeq-heretic-gpu/);
  assert.match(workflow, /SABEQ_GPU_SSH_PRIVATE_KEY/);
  assert.match(workflow, /SABEQ_GPU_SSH_KNOWN_HOSTS/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no|ssh-keyscan|curl .*\| bash/);
  assert.match(workflow, /smoke-test.mjs/);
  assert.match(workflow, /synthetic prompt only/i);
});
