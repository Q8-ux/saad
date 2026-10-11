import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const bundle = fs.readFileSync(new URL('../public/assets/app.js', import.meta.url), 'utf8');
const wait = () => new Promise(resolve => setImmediate(resolve));
function setup(fetchImpl) {
  const dom = new JSDOM(html, { url: 'https://q8-ux.github.io/saad/phone-track/', runScripts: 'outside-only' });
  const requests = [];
  const copied = [];
  dom.window.fetch = fetchImpl || (async url => {
    requests.push(String(url));
    const code = new URL(url).pathname.match(/\/data\/(\d+)\.json$/)?.[1];
    assert.ok(code, 'Only calling-code metadata is requested');
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(new URL(`../public/data/${code}.json`, import.meta.url))) };
  });
  Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async text => copied.push(text) } });
  dom.window.eval(bundle);
  const $ = id => dom.window.document.getElementById(id);
  const submit = input => {
    $('phone').value = input;
    $('phone').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    $('phone-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  };
  return { dom, $, submit, requests, copied };
}
test('the Arabic form reads digits, shows actual data, copies a report and clears it', async () => {
  const { dom, $, submit, requests, copied } = setup();
  try {
    assert.equal($('country').value, 'KW');
    assert.equal($('analyze').disabled, false);
    submit('٥٠٠١٢٣٤٥');
    await wait(); await wait();
    assert.equal($('report').hidden, false);
    assert.equal($('country-value').textContent, 'الكويت');
    assert.equal($('carrier-value').textContent, 'فيفا');
    assert.match($('timezone-value').textContent, /Asia\/Kuwait/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0], 'https://q8-ux.github.io/saad/phone-track/data/965.json');
    assert.ok(!requests[0].includes('50012345'));
    $('copy-report').click();
    await wait();
    assert.match(copied[0], /المشغل الأصلي/);
    $('clear').click();
    assert.equal($('phone').value, '');
    assert.equal($('report').hidden, true);
    assert.equal($('empty-state').hidden, false);
    assert.equal(dom.window.localStorage.length, 0);
  } finally { dom.window.close(); }
});
test('a changed input cannot receive an older in-flight report', async () => {
  let complete;
  const { dom, $, submit } = setup(() => new Promise(resolve => { complete = resolve; }));
  try {
    submit('50012345');
    assert.equal($('analyze').disabled, true);
    $('phone').value = '123';
    $('phone').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    complete({ ok: true, json: async () => JSON.parse(fs.readFileSync(new URL('../public/data/965.json', import.meta.url))) });
    await wait(); await wait();
    assert.equal($('report').hidden, true);
    assert.equal($('analyze').disabled, false);
  } finally { dom.window.close(); }
});
test('optional metadata failures preserve the verified formatting results', async () => {
  const { dom, $, submit } = setup(async () => { throw new Error('offline'); });
  try {
    submit('+442083661177');
    await wait(); await wait();
    assert.equal($('report').hidden, false);
    assert.equal($('e164-value').textContent, '+442083661177');
    assert.match($('metadata-message').textContent, /تعذر تحميل/);
    assert.equal($('analyze').disabled, false);
    submit('<script>alert(1)</script>');
    assert.equal($('error-message').hidden, false);
    assert.equal($('report').hidden, true);
    assert.equal($('phone').getAttribute('aria-invalid'), 'true');
  } finally { dom.window.close(); }
});
