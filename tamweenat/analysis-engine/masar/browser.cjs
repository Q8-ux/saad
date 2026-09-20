// Our adapter uses the separately installed upstream manager; no upstream source is vendored.
const readline = require('node:readline');
const path = require('node:path');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const input = readline.createInterface({input: process.stdin});
const pending = new Map();
const emit = value => process.stdout.write(JSON.stringify(value) + '\n');
let started = false, seq = 0;
input.on('line', line => {
  const msg = JSON.parse(line);
  if (!started) { started = true; run(msg).catch(() => { emit({type:'error'}); process.exit(1); }); }
  else { const resolve = pending.get(msg.id); if(resolve) { pending.delete(msg.id); resolve(msg); } }
});

async function run(config) {
  const upstream = createRequire(path.join(config.root, 'package.json'));
  const {chromium} = upstream('patchright');
  const {BrowserManager} = require(path.join(config.root, 'dist/src/browser/browser-manager.js'));
  const profile = config.profile;
  const manager = new BrowserManager();
  try {
    const context = await chromium.launchPersistentContext(profile, {
      headless: true, serviceWorkers: 'block', acceptDownloads: false,
      executablePath: config.executablePath || undefined,
      proxy: {server: 'http://127.0.0.1:9', bypass: '<-loopback>'},
      args: ['--disable-quic', '--disable-background-networking', '--disable-sync',
             '--force-webrtc-ip-handling-policy=disable_non_proxied_udp']
    });
    manager.setContext(context, profile);
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.route('**/*', async route => {
      const request = route.request();
      if(request.method() !== 'GET' || !/^https?:\/\//.test(request.url()) ||
         ['image','media','font','websocket'].includes(request.resourceType())) return route.abort();
      const id = ++seq;
      const result = new Promise(resolve => pending.set(id, resolve));
      emit({type:'fetch', id, url:request.url(), method:request.method(), document:request.isNavigationRequest()});
      const reply = await result;
      if (reply.error) return route.abort();
      return route.fulfill({status:reply.status, headers:reply.headers, body:Buffer.from(reply.body, 'base64')});
    });
    const page = context.pages()[0] || await context.newPage();
    context.on('page', p => { if(p !== page) p.close().catch(() => {}); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    const response = await page.goto(config.url, {waitUntil:'domcontentloaded', timeout:40000});
    await page.waitForLoadState('networkidle', {timeout:8000}).catch(() => {});
    const html = await page.content();
    if(Buffer.byteLength(html) > 2000000) throw new Error('Output limit');
    emit({type:'result', url:page.url(), status:response?.status() || 0, html});
  } finally {
    await manager.closeAndCleanup();
    fs.rmSync(profile, {recursive:true, force:true});
    input.close();
  }
}
