'use strict';
const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');

function authorized(req, token) {
  if (!token || token.length < 32 || req.headers.origin) return false;
  const value = String(req.headers.authorization || '');
  const digest = text => createHash('sha256').update(text).digest();
  return timingSafeEqual(digest(value), digest(`Bearer ${token}`));
}

function agentRouter({ client, token = process.env.SABEQ_AGENT_BRIDGE_TOKEN } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!authorized(req, token)) return res.status(401).json({ error: 'unauthorized' });
    next();
  });
  router.get('/status', async (_req, res) => {
    try { res.json(await client.request('status')); }
    catch (_) { res.status(503).json({ error: 'agent_unavailable' }); }
  });
  router.post('/memo', express.json({ limit: '220kb' }), async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'invalid_request' });
    try { res.json(await client.request('memo', req.body)); }
    catch (error) {
      const code = ['agent_timeout', 'agent_busy', 'agent_unavailable'].includes(error.message) ? error.message : 'agent_failed';
      res.status(code === 'agent_timeout' ? 504 : 503).json({ error: code });
    }
  });
  router.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'invalid_request' }));
  return router;
}
module.exports = { agentRouter, authorized };
