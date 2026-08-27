import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEmailHtml, buildEmailText, escapeHtml } from './email.templates';

test('escapes untrusted HTML in titles, messages and links', () => {
  const html = buildEmailHtml({
    title: '<script>alert(1)</script>',
    message: 'Hello & goodbye',
    action: { label: 'Open', url: 'https://example.com/?x="bad"' },
  });
  assert.equal(escapeHtml('<>&"\''), '&lt;&gt;&amp;&quot;&#039;');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Hello &amp; goodbye/);
  assert.match(html, /&quot;bad&quot;/);
});

test('creates a readable plain-text fallback', () => {
  const text = buildEmailText({
    title: 'Reset',
    message: 'Choose a new password.',
    action: { label: 'Continue', url: 'https://example.com/reset' },
  });
  assert.match(text, /^Reset/);
  assert.match(text, /Continue: https:\/\/example.com\/reset/);
});
