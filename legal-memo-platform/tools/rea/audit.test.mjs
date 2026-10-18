import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { checkedFile, collectInputs, publishedScripts, summarize, summarizeSemantics } from './audit.mjs';

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

test('the legal-library workflow skips tooling updates and preserves real imports', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/build-legal-library.yml', import.meta.url), 'utf8');
  const block = workflow.match(/        run: \|\n((?: {10}[^\n]*(?:\n|$))+)/)?.[1];
  assert.ok(block, 'The scope step must have a runnable shell block');
  const script = block.split('\n').map(line => line.slice(10)).join('\n');
  const root = mkdtempSync(path.join(tmpdir(), 'sabeq-library-scope-'));
  try {
    execFileSync('git', ['init', '--quiet', root]);
    const commit = (name, text) => {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), text);
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], { cwd: root });
      return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    };
    const before = commit('legal-memo-platform/gateway.js', 'original');
    const tools = commit('legal-memo-platform/tools/rea/change.js', 'tooling');
    const output = path.join(tmpdir(), path.basename(root) + '.output');
    const check = (previous, current, expected, event = 'push') => {
      writeFileSync(output, '');
      execFileSync('bash', ['-e', '-o', 'pipefail', '-c', script], { cwd: root, env: { ...process.env, BEFORE_SHA: previous, GITHUB_SHA: current, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output } });
      assert.equal(readFileSync(output, 'utf8').trim(), `library=${expected}`);
    };
    try {
      check(before, tools, false);
      check(before, tools, true, 'workflow_dispatch');
      const code = commit('legal-memo-platform/gateway.js', 'changed');
      check(tools, code, true);
      const config = commit('.github/workflows/build-legal-library.yml', 'configuration-only');
      check(code, config, false);
      check('0'.repeat(40), config, true);
    } finally { rmSync(output, { force: true }); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('semantic tracing preserves uncertainty and omits literal contents from reports', () => {
  const result = summarizeSemantics({ evidence_id: 'evidence', normalized_result: { status: 'partial', coverage: { status: 'partial' }, summary: { total_seed_matches: 1, relevant_unknowns: 2 }, nodes: [{ properties: { value: 'PRIVATE' } }] } }, 0);
  assert.equal(result.status, 'partial');
  assert.equal(result.coverage, 'partial');
  assert.equal(result.statistics.relevant_unknowns, 2);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(summarizeSemantics({}, 0).status, 'failed');
  assert.equal(summarizeSemantics({ error: 'PRIVATE', code: 'bad_input' }, 1).status, 'failed');
});
