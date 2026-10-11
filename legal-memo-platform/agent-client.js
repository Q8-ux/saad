'use strict';
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

class AgentClient {
  constructor({ python = process.env.SABEQ_AGENT_PYTHON || '/opt/sabeq-agents/bin/python', timeoutMs = 180000, spawnWorker = spawn } = {}) {
    this.python = python;
    this.timeoutMs = timeoutMs;
    this.spawnWorker = spawnWorker;
    this.child = null;
    this.pending = null;
  }
  start() {
    if (this.child) return;
    const child = this.spawnWorker(this.python, ['-m', 'sabeq_agents.worker'], {
      cwd: path.join(__dirname, 'agents'),
      env: { ...process.env, PYTHONUNBUFFERED: '1', TELEMETRY_DISABLED: 'true' },
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    this.child = child;
    const lines = createInterface({ input: child.stdout });
    lines.on('line', line => {
      try {
        const value = JSON.parse(line);
        if (this.pending?.id === value.id) {
          const pending = this.pending;
          this.pending = null;
          clearTimeout(pending.timer);
          value.ok ? pending.resolve(value.result) : pending.reject(new Error('agent_failed'));
        }
      } catch (_) { this.stop('agent_protocol_failed'); }
    });
    child.on('error', () => { if (this.child === child) this.stop('agent_unavailable'); });
    child.on('exit', () => { if (this.child === child) this.stop('agent_unavailable'); });
  }
  request(op, payload) {
    // One model run per instance; reject overload before retaining case data.
    if (this.pending) return Promise.reject(new Error('agent_busy'));
    this.start();
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timer = setTimeout(() => this.stop('agent_timeout'), this.timeoutMs);
      this.pending = { id, resolve, reject, timer };
      this.child.stdin.write(JSON.stringify({ id, op, payload }) + '\n', error => {
        if (error) this.stop('agent_unavailable');
      });
    });
  }
  stop(reason = 'agent_stopped') {
    const pending = this.pending;
    this.pending = null;
    if (pending) { clearTimeout(pending.timer); pending.reject(new Error(reason)); }
    const child = this.child;
    this.child = null;
    child?.kill('SIGKILL');
  }
}
module.exports = { AgentClient };
