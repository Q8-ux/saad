import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { guestRequest, GUEST_OFFICE, GUEST_READ_ONLY } from '../source/lib/guest-data.ts';
import { renderFixture } from './ui-fixtures.mjs';

test('guest can read every preview resource without any network request', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Guest reached the production network'); };
  try {
    for (const path of ['/api/auth/me', '/api/office', '/api/legal/stats', '/api/office/contact', '/api/office/members', '/api/office/audit', '/api/office/lookup?resource=cases', '/api/office/case-links?id=1', '/api/legal/documents', '/api/legal/search?q=خدمات', '/api/legal/document?id=1', '/api/legal/review?id=1', '/api/admin/offices', '/api/admin/legal-sync']) {
      const response = await guestRequest(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok(await response.json());
    }
    const search = await (await guestRequest('/api/legal/search?q=خدمات')).json();
    assert.equal(search.results.length, 1);
    assert.equal(search.results[0].review.canCite, false);
    const links = await (await guestRequest('/api/office/case-links?id=1')).json();
    assert.equal(links.groups.hearings[0].title, GUEST_OFFICE.hearings[0].title);
  } finally { globalThis.fetch = originalFetch; }
});

test('all guest writes and unknown reads fail closed and preserve sample data', async () => {
  const before = JSON.stringify(GUEST_OFFICE);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const path of ['/api/office', '/api/memo', '/api/legal/review', '/api/legal/upload', '/api/office/contact', '/api/admin/offices', '/api/admin/platform-account', '/api/auth/password', '/api/auth/username']) {
      const response = await guestRequest(path, { method, body: JSON.stringify({ confirmed: true, password: 'never-sent' }) });
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.equal((await response.json()).error, GUEST_READ_ONLY);
    }
  }
  assert.equal((await guestRequest(new Request('https://guest.invalid/api/office', {method: 'POST'}))).status, 403);
  for (const path of ['/api/legal/original?id=1', '/api/office/private', '/unknown']) assert.equal((await guestRequest(path)).status, 403);
  const copy = await (await guestRequest('/api/office')).json();
  copy.clients[0].name = 'changed outside the fixtures';
  assert.equal(JSON.stringify(GUEST_OFFICE), before);
});

test('direct entry exposes all ten sections and a localized preview notice', () => {
  const expected = { dashboard:'لوحة التحكم', search:'محرك البحث القانوني', library:'قاعدة القوانين', clients:'العملاء', cases:'القضايا', hearings:'الجلسات والمهام', invoices:'الفواتير', memos:'مولّد المذكرات', settings:'الإعدادات', admin:'إدارة المكاتب والمستخدمين' };
  for (const [screen, heading] of Object.entries(expected)) {
    const html = renderFixture('ar', screen, false, true);
    assert.ok(html.includes(heading), `${screen} renders`);
    assert.ok(html.includes('إعادة بدء العرض'), `${screen} has an exit`);
    assert.equal((html.match(/class="nav-button /g) || []).length, 10, `${screen} has all sections`);
    assert.ok(html.includes('جميع الأقسام متاحة للاستعراض ببيانات تجريبية'));
    assert.ok(!html.includes('href="/api/legal/original'));
  }
  for (const language of ['ar','en','ur']) {
    const html=renderFixture(language,'dashboard',false,true);
    assert.ok(!html.includes('pending-workspace'));
    assert.ok(!html.includes('login-page'));
    assert.ok(!html.includes('href="/api/auth/'));
  }

});

test('all shared UI API calls use the scoped request adapter', () => {
  for (const file of ['app/legal-office-app.tsx','app/office-tools.tsx','app/document-review-panel.tsx']) {
    const source=readFileSync(new URL('../source/'+file,import.meta.url),'utf8');
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const direct=[];
    function inspect(node) {
      if(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text==='fetch') direct.push(node.pos);
      ts.forEachChild(node,inspect);
    }
    inspect(ast);
    assert.deepEqual(direct,[],file);
  }
  const entry=readFileSync(new URL('../source/main.tsx',import.meta.url),'utf8');
  assert.ok(entry.includes('<LegalOfficeApp guestMode'));
  assert.ok(!/LoginPanel|GuestPreview|local-auth/.test(entry));
  const adapter=readFileSync(new URL('../source/app/office-request.tsx',import.meta.url),'utf8');
  assert.ok(!/\bfetch\(/.test(adapter));
  const html=readFileSync(new URL('../source/index.html',import.meta.url),'utf8');
  assert.ok(html.includes("connect-src 'none'"));
});
