'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once, EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { AgentClient } = require('../agent-client');
const { agentRouter } = require('../agent-router');

async function server(t, client) {
  const app = express();
  app.use('/internal/sabeq-agents', agentRouter({ client, token: 't'.repeat(48) }));
  const s = app.listen(0, '127.0.0.1');
  await once(s, 'listening');
  t.after(() => s.close());
  return `http://127.0.0.1:${s.address().port}/internal/sabeq-agents`;
}
test('internal route authenticates before parsing or sending any data to Python', async t => {
  let calls = 0;
  const url = await server(t, { request: async () => { calls++; return {}; } });
  for (const headers of [{}, { Authorization: 'Bearer wrong' }, { Authorization: 'Bearer ' + 't'.repeat(48), Origin: 'https://sabeq.legal' }]) {
    const r = await fetch(url + '/memo', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: 'malformed secret body' });
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, 0);
});
test('invalid or oversized payload cannot invoke the model', async t => {
  let calls = 0;
  const url = await server(t, { request: async () => { calls++; return {}; } });
  for (const [body, status] of [['bad JSON', 400], ['[]', 400], [JSON.stringify({text:'x'.repeat(230000)}), 413]]) {
    const r = await fetch(url + '/memo', { method: 'POST', headers: { Authorization: 'Bearer ' + 't'.repeat(48), 'Content-Type': 'application/json' }, body });
    assert.equal(r.status, status);
  }
  assert.equal(calls, 0);
});
test('provider and validation diagnostics never escape the internal endpoint', async t => {
  const url = await server(t, { request: async () => { throw Error('secret key and private case facts'); } });
  const r = await fetch(url + '/memo', { method:'POST', headers:{Authorization:'Bearer '+'t'.repeat(48),'Content-Type':'application/json'}, body:'{}' });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error:'agent_failed' });
});
test('overload is rejected and a hung worker is killed without replaying a paid job', async () => {
  let killed = 0, spawned = 0;
  const client = new AgentClient({ timeoutMs:30, spawnWorker:()=>{
    spawned++;
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {killed++;};
    return child;
  }});
  const pending = client.request('memo', {facts:'synthetic'});
  await assert.rejects(client.request('memo', {}), /agent_busy/);
  await assert.rejects(pending, /agent_timeout/);
  assert.equal(killed, 1); assert.equal(spawned, 1); assert.equal(client.pending, null);
});
test('real Python worker returns library versions and no-source memo without API calls', { skip:!process.env.SABEQ_TEST_PYTHON }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'sabeq-knowledge-test-'));
  const beforeKey = process.env.OPENAI_API_KEY, beforeRoot = process.env.SABEQ_COGNEE_ROOT;
  process.env.OPENAI_API_KEY = 'test-placeholder-never-sent'; process.env.SABEQ_COGNEE_ROOT = root;
  const client = new AgentClient({ python:process.env.SABEQ_TEST_PYTHON, timeoutMs:15000 });
  t.after(()=>{client.stop();rmSync(root,{recursive:true,force:true});if(beforeKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=beforeKey;if(beforeRoot===undefined)delete process.env.SABEQ_COGNEE_ROOT;else process.env.SABEQ_COGNEE_ROOT=beforeRoot;});
  const status = await client.request('status');
  assert.equal(status.versions.langgraph, '1.2.12'); assert.equal(status.knowledgeReady, false);
  const payload = {requestId:randomUUID(),language:'ar',documentKind:'claim',template:{id:'test',version:1,kind:'claim',title:'نموذج اختبار',sourceSha256:'a'.repeat(64)},caseData:{facts:'واقعة اصطناعية لا تتعلق بعميل حقيقي ولم يسدد مبلغ الاختبار.',requests:'إلزام الخصم بسداد مبلغ الاختبار.'},fields:{},sources:[]};
  const result = await client.request('memo', payload);
  assert.equal(result.requestId, payload.requestId); assert.equal(result.content.facts, payload.caseData.facts);
  assert.equal(result.audit.modelRequests, 0); assert.equal(result.audit.missingSources, true);
  assert.deepEqual(result.audit.steps, ['validate','knowledge','draft','audit']);
});
