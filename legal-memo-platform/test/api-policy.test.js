'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { corsPolicy } = require('../cors-policy');
const { openAiError, openAiErrorDetails } = require('../openai-errors');

function request(origin, method = 'POST') {
  const headers = { Vary: 'Accept-Encoding' };
  const result = { headers, status: 200, next: false, ended: false };
  const res = {
    vary(value) { headers.Vary += `, ${value}`; },
    setHeader(name, value) { headers[name] = value; },
    status(code) { result.status = code; return res; },
    json(body) { result.body = body; result.ended = true; return res; },
    end() { result.ended = true; return res; },
  };
  corsPolicy({ method, headers: origin === undefined ? {} : { origin } }, res, () => { result.next = true; });
  return result;
}

test('SABEQ domains can send authenticated JSON requests without a wildcard', () => {
  for (const origin of ['https://sabeq.legal', 'https://www.sabeq.legal', 'https://q8-ux.github.io', 'https://sabeq-legal-render.onrender.com']) {
    const result = request(origin);
    assert.equal(result.next, true);
    assert.equal(result.headers['Access-Control-Allow-Origin'], origin);
    assert.equal(result.headers['Access-Control-Allow-Credentials'], 'true');
    assert.equal(result.headers.Vary, 'Accept-Encoding, Origin');
  }
});

test('JSON preflight returns 204 and permits Content-Type and Authorization', () => {
  const result = request('https://www.sabeq.legal', 'OPTIONS');
  assert.equal(result.status, 204);
  assert.equal(result.ended, true);
  assert.equal(result.next, false);
  assert.match(result.headers['Access-Control-Allow-Headers'], /Content-Type, Authorization/);
  assert.match(result.headers['Access-Control-Allow-Methods'], /POST/);
});

test('untrusted origins and lookalike domains never reach the API handler', () => {
  for (const origin of ['null', 'https://sabeq.legal.evil.example', 'https://evil.example', 'http://sabeq.legal']) {
    for (const method of ['POST', 'OPTIONS']) {
      const result = request(origin, method);
      assert.equal(result.status, 403);
      assert.equal(result.next, false);
      assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    }
  }
});

test('same-origin gateway updates and requests without Origin keep working', () => {
  const sameOrigin = request('https://sabeq-legal-research-api.onrender.com', 'PATCH');
  assert.equal(sameOrigin.next, true);
  assert.match(sameOrigin.headers['Access-Control-Allow-Methods'], /PATCH, DELETE/);
  const serverRequest = request(undefined, 'GET');
  assert.equal(serverRequest.next, true);
  assert.equal(serverRequest.headers['Access-Control-Allow-Origin'], undefined);
});

test('existing local frontend development origins remain supported', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
    assert.equal(request(origin).next, true);
  }
});

test('OpenAI authentication failures identify server credentials without revealing them', () => {
  for (const status of [401, 403]) {
    const mapped = openAiError({ status, message: 'private upstream message' });
    assert.equal(mapped.status, 503);
    assert.match(mapped.message, /مفتاح OpenAI/);
    assert.doesNotMatch(mapped.message, /private/);
  }
});

test('OpenAI exhausted quota is distinguished from temporary rate limiting', () => {
  const quota = openAiError({ status: 429, code: 'insufficient_quota' });
  const rateLimit = openAiError({ status: 429, code: 'rate_limit_exceeded' });
  assert.match(quota.message, /الفوترة/);
  assert.notEqual(quota.message, rateLimit.message);
  assert.match(rateLimit.message, /بعد قليل/);
  assert.equal(openAiError({ status: 502 }).status, 503);
});

test('diagnostic logs exclude provider messages, prompts, keys and request headers', () => {
  const details = openAiErrorDetails({
    status: 429, code: 'insufficient_quota', request_id: 'req_test',
    message: 'private provider message', headers: { authorization: 'private credential' },
    request: { input: 'private question' },
  });
  assert.deepEqual(details, { status: 429, code: 'insufficient_quota', requestId: 'req_test' });
  assert.doesNotMatch(JSON.stringify(details), /private/);
});
