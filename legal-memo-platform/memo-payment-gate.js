'use strict';

const service = 'https://sabeq-legal-public.centrino.chatgpt.site';

function memoPaymentGate(transport = fetch) {
  return async (req, res, next) => {
    try {
      const response = await transport(service + '/api/payments/sadad', {
        headers: { Accept: 'application/json' }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error('policy_unavailable');
      const policy = await response.json();
      if (typeof policy.required !== 'boolean' || typeof policy.enabled !== 'boolean') throw Error('invalid_policy');
      if (!policy.enabled) return res.status(503).json({ error: 'خدمة المذكرات متوقفة مؤقتاً بقرار الإدارة.' });
      if (!policy.required && !req.body?.paymentId) return next();
      // A paid request uses the authoritative D1 reservation and recovery path.
      const upstream = await transport(service + '/api/legal/memo', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://q8-ux.github.io', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
        body: JSON.stringify(req.body || {}), redirect: 'error', signal: AbortSignal.timeout(250000),
      });
      const body = await upstream.text();
      if (body.length > 1000000) throw Error('oversize');
      let data; try { data = JSON.parse(body); } catch { throw Error('invalid_response'); }
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'تعذر التحقق من طلب المذكرة ورسومها. احتفظ ببياناتك وإيصال الدفع وأعد المحاولة؛ لا تدفع مجدداً.' });
    }
  };
}

function legacyMemoPaymentGate(transport = fetch) {
  return async (_req, res, next) => {
    try {
      const response = await transport(service + '/api/payments/sadad', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error('policy_unavailable');
      const policy = await response.json();
      if (typeof policy.required !== 'boolean' || typeof policy.enabled !== 'boolean') throw Error('invalid_policy');
      if (!policy.enabled) return res.status(503).json({ error: 'خدمة المذكرات متوقفة مؤقتاً.' });
      if (policy.required) return res.status(402).json({ error: 'يلزم إكمال إعداد المذكرة والدفع من مولد المذكرات المعتمد في موقع سابق.', url: 'https://q8-ux.github.io/saad/sabeq-legal/' });
      return next();
    } catch { return res.status(503).json({ error: 'تعذر التحقق من رسوم الخدمة. أعد المحاولة لاحقاً.' }); }
  };
}
module.exports = { memoPaymentGate, legacyMemoPaymentGate };
