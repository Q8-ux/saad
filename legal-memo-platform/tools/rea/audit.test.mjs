import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { checkedFile, collectInputs, publishedScripts, summarize } from './audit.mjs';

test('only tracked Sabeq source and the currently linked bundle enter the analysis', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'sabeq-scope-test-'));
  try {
    execFileSync('git', ['init', '--quiet', root]);
    const files = {
      'sabeq-legal/index.html': '<script type="module" src="/saad/sabeq-legal/assets/current.js"></script>',
      'sabeq-legal/assets/current.js': 'export const current = true;',
      'sabeq-legal/assets/old.js': 'export const old = true;',
      'sabeq-legal/research-source/app/sabeq-site.tsx': 'export const page = 1;',
      'legal-memo-platform/gateway.js': 'module.exports = {};',
      'legal-memo-platform/package.json': '{"name":"backend"}',
      'legal-memo-platform/.env.local': 'PRIVATE=do-not-copy',
      'legal-memo-platform/private-case-files/case.js': 'private document',
      'sabeq-legal/research-source/data/client.js': 'private data',
      'other-project/app.js': 'another project',
    };
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), text);
    }
    execFileSync('git', ['add', '.'], { cwd: root });
    writeFileSync(path.join(root, 'sabeq-legal/research-source/app/untracked.ts'), 'untracked');
    const groups = collectInputs(root);
    assert.deepEqual(groups['published-bundle'], ['sabeq-legal/assets/current.js']);
    assert.deepEqual(groups['frontend-source'], ['sabeq-legal/research-source/app/sabeq-site.tsx']);
    assert.deepEqual(groups.backend, ['legal-memo-platform/gateway.js', 'legal-memo-platform/package.json']);
    symlinkSync(path.join(root, 'other-project/app.js'), path.join(root, 'legal-memo-platform/linked.js'));
    execFileSync('git', ['add', 'legal-memo-platform/linked.js'], { cwd: root });
    assert.throws(() => collectInputs(root), /symbolic link/);
    assert.throws(() => checkedFile(root, '../outside'), /outside/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a remote, escaped or absent published asset cannot widen the analysis scope', () => {
  for (const src of ['https://example.com/app.js', 'assets/../../other.js', '/other-project/app.js']) {
    assert.throws(() => publishedScripts(`<script src="${src}"></script>`), /local Sabeq/);
  }
  assert.throws(() => publishedScripts('<html></html>'), /No published/);
});

test('partial evidence from a failed REA run stays failed and raw data is omitted', () => {
  const normalized_result = { root_artifact_sha256: 'a'.repeat(64), graph: { graph_id: 'graph', coverage: { status: 'partial' }, nodes: [{ kind: 'unknown', properties: { value: 'PRIVATE' } }] }, statistics: { parsed_javascript_files: 0 } };
  const result = summarize({ error: 'PRIVATE', code: 'capability_unavailable', details: { partial_observation: { evidence_id: 'evidence', normalized_result, raw_result: 'PRIVATE' } } }, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.graph_coverage, 'partial');
  assert.equal(result.unknown_nodes, 1);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(summarize({ evidence_id: 'evidence', normalized_result }, 1).status, 'failed');
  assert.throws(() => summarize({}, 0), /unrecognized/);
});
