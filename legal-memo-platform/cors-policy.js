'use strict';

// Only the deployed SABEQ frontends and the gateway's own web app may use CORS.
const allowedOrigins = new Set([
  'https://sabeq.legal',
  'https://www.sabeq.legal',
  'https://q8-ux.github.io',
  'https://sabeq-legal-render.onrender.com',
  'https://sabeq-legal-research-api.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function corsPolicy(req, res, next) {
  const origin = String(req.headers.origin || '');
  res.vary('Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'هذا النطاق غير مسموح له بالاتصال بالخادم.' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    // The gateway also proxies the existing app's update/delete endpoints.
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

module.exports = { corsPolicy };
