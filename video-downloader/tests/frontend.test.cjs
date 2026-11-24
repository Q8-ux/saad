const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

function browser({publicMode = true, storedPassword = '', infoFailure = false, downloadFailure = false} = {}) {
  const elements = new Map(), calls = [], saved = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', style: {}, handlers: {}, hidden: false,
      classList: {toggle() {}, add() {}, remove() {}},
      addEventListener(name, handler) {this.handlers[name] = handler;},
      removeAttribute(name) {delete this[name];}, scrollIntoView() {},
    });
    return elements.get(id);
  }
  element('quality').value = '360';
  const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json'}});
  class BrowserURL extends URL {}
  BrowserURL.createObjectURL = () => 'blob:test';
  BrowserURL.revokeObjectURL = () => {};
  const context = {
    document: {getElementById: element, body: {appendChild() {}}, createElement() {
      return {click() {saved.push(this.download);}, remove() {}};
    }},
    URL: BrowserURL, URLSearchParams, Blob, AbortController, console,
    localStorage: {getItem() {return null;}, setItem() {}, removeItem() {}},
    sessionStorage: {getItem() {return storedPassword;}, setItem() {}, removeItem() {}},
    setTimeout(fn, ms) {return ms === 30000 ? 0 : setTimeout(fn, ms);}, clearTimeout,
    async fetch(url, options = {}) {
      calls.push({url, options});
      if (url.endsWith('/api/health')) return json({engine: 'yt-dlp', status: 'ok', configured: true, public_app_mode: publicMode});
      if (url.endsWith('/info')) return infoFailure ? json({detail: 'تعذر تحليل المقطع'}, 422) : json({platform: 'YouTube', id: 'sample', title: 'Sample'});
      if (url.endsWith('/download')) return downloadFailure ? json({detail: 'تجاوزت طلبات التطبيق الحد المؤقت. حاول بعد ساعة.'}, 429) : new Response(new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]), {headers: {'Content-Type': 'video/mp4'}});
      throw Error('Unexpected URL: ' + url);
    },
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return {context, element, calls, saved};
}

test('fresh visitor downloads while startup connects, without a password or metadata prerequisite', async () => {
  const b = browser();
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.context.download('video');
  const requests = b.calls.filter(c => !c.url.endsWith('/api/health'));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.endsWith('/api/public/download'));
  assert.equal(requests[0].options.headers['X-Download-Key'], undefined);
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(JSON.parse(requests[0].options.body).quality, '360');
  assert.match(b.saved[0], /\.mp4$/);
});

test('public audio requests do not send a previously stored private credential', async () => {
  const b = browser({storedPassword: 'test-session-credential'});
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.context.download('audio');
  const request = b.calls.find(c => c.url.endsWith('/download'));
  assert.ok(request.url.endsWith('/api/public/download'));
  assert.equal(request.options.headers['X-Download-Key'], undefined);
  assert.equal(JSON.parse(request.options.body).kind, 'audio');
  assert.match(b.saved[0], /\.mp3$/);
});

test('private servers retain their authenticated route', async () => {
  const b = browser({publicMode: false, storedPassword: 'test-session-credential'});
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.context.download('video');
  const request = b.calls.find(c => c.url.endsWith('/download'));
  assert.ok(request.url.endsWith('/api/download'));
  assert.equal(request.options.headers['X-Download-Key'], 'test-session-credential');
});

test('failed optional metadata inspection does not prevent direct download', async () => {
  const b = browser({infoFailure: true});
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.element('lookup').handlers.submit({preventDefault() {}});
  await b.context.download('video');
  assert.equal(b.saved.length, 1);
});

test('editing the input downloads the new URL rather than stale preview data', async () => {
  const b = browser();
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.element('lookup').handlers.submit({preventDefault() {}});
  b.element('url').value = 'https://vimeo.com/76979871';
  await b.context.download('video');
  const request = b.calls.find(c => c.url.endsWith('/download'));
  assert.equal(JSON.parse(request.options.body).url, b.element('url').value);
});

test('quota failures show the server message and never report a saved file', async () => {
  const b = browser({downloadFailure: true});
  b.element('url').value = 'https://youtu.be/jNQXAC9IVRw';
  await b.context.download('video');
  assert.equal(b.saved.length, 0);
  assert.match(b.element('feedback').textContent, /حاول بعد ساعة/);
  assert.equal(b.element('mp4').disabled, false);
});

test('download controls are visible before optional preview and reject non-platform URLs', () => {
  assert.ok(html.indexOf('id="mp4"') < html.indexOf('id="result"'));
  assert.equal((html.match(/id="mp4"/g) || []).length, 1);
  const b = browser();
  for (const url of ['https://localhost/admin', 'https://youtube.com.evil.test/watch?v=a', 'http://youtu.be/abc', 'https://youtu.be/']) {
    assert.equal(b.context.platformFromUrl(url), null);
  }
});
