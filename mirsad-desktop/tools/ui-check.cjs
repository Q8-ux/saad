// Development-only browser tests. Fixtures are injected at the HTTP boundary;
// the shipped executable contains no demonstration mode or generated readings.
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium} = require(runtimeModules ? path.join(runtimeModules, 'playwright') : 'playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.MIRSAD_UI_RESULTS || path.join(root, 'test-results');
fs.mkdirSync(out, {recursive: true});

async function run() {
  const binary = process.env.MIRSAD_REVIEW_BINARY || path.join(root, 'mirsad-review');
  const backend = spawn(binary, ['--headless'], {env: {...process.env, MIRSAD_TEST_DATA: path.join(out, 'data')}, stdio: ['ignore', 'pipe', 'pipe']});
  let browser;
  const results = [];
  try {
    const url = await new Promise((resolve, reject) => {
      let text = '';
      backend.stdout.on('data', b => {text += b; if (text.includes('\n')) resolve(text.trim().split('\n')[0]);});
      backend.once('error', reject);
      setTimeout(() => reject(Error('Backend startup timeout')), 10000).unref();
    });
    browser = await chromium.launch({headless: true, ...(process.env.MIRSAD_BROWSER ? {executablePath: process.env.MIRSAD_BROWSER} : {}), args: ['--no-sandbox']});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => {if (new URL(r.url()).origin !== new URL(url).origin) external.push(r.url());});
    await page.goto(url);
    await page.locator('.hero-panel').waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.title(), 'مرصد الكمبيوتر');
    await page.screenshot({path: path.join(out, 'overview-real-unavailable.png'), fullPage: true});
    const nativeState = await page.evaluate(async () => (await fetch('/api/state')).json());
    assert.equal(nativeState.sections.wifi.status, 'error');
    assert.equal(await page.locator('.stat-value').first().innerText(), '—');
    results.push('Actual unavailable hardware state shows no invented readings');
    for (const name of ['wifi','bluetooth','neighbors','adapters','ports','traffic','charts','hardware','system','capabilities','reports','overview']) {
      await page.locator(`[data-route="${name}"]`).click();
      await page.waitForFunction(key => location.hash === '#'+key, name);
      assert.equal(await page.locator('#page-content').count(), 1);
    }
    results.push('All twelve sections navigate without JavaScript errors');

    const fixture = structuredClone(nativeState);
    fixture.logs = [{time: new Date().toISOString(), text: 'بيانات اختبار محلية للواجهة فقط', level: 'info'}];
    const now = new Date().toISOString();
    const wifi = Array.from({length:101}, (_,i) => ({ssid: i === 0 ? '<img src=x onerror=alert(1)>' : 'شبكة اختبار '+i, bssid: '02:00:00:00:'+String(Math.floor(i/100)).padStart(2,'0')+':'+String(i%100).padStart(2,'0'), signal: i%101, rssi: -95+i%60, channel: i%11+1, frequency:2412000, band:'2.4',security:'WPA2',adapter:'بطاقة اختبار',cached:false,observedAt:now}));
    fixture.sections.wifi = {id:'wifi',status:'ready',message:'بيانات اختبار محلية — ليست قياسات جهاز المستخدم',updatedAt:now,data:wifi};
    fixture.history = {[wifi[1].adapter+'|'+wifi[1].bssid]:[{time:new Date(Date.now()-30000).toISOString(),rssi:-70,signal:60},{time:now,rssi:-65,signal:70}]};
    await page.route('**/api/state', r => r.fulfill({json:fixture}));
    await page.evaluate(() => {location.hash='wifi';});
    await page.getByText('<img src=x onerror=alert(1)>', {exact:true}).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 40);
    assert.equal(await page.locator('tbody img').count(), 0);
    await page.getByRole('button', {name:'التالي', exact:true}).click();
    assert.equal(await page.locator('tbody tr').count(), 40);
    await page.locator('#search-wifi').fill('شبكة اختبار 100');
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.locator('#search-wifi').fill('غير موجود في النتائج');
    await page.getByText('لا توجد نتائج مطابقة', {exact:true}).waitFor();
    results.push('101 rows, pagination, search, and hostile network-name escaping pass');
    await page.locator('#search-wifi').fill('');
    await page.evaluate(() => {location.hash='charts';});
    await page.locator('.chart-line').waitFor();
    assert.equal(await page.locator('.chart-bar').count(), 14);
    results.push('Channel and RSSI charts derive from supplied measurements');

    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(() => {location.hash='wifi';});
      await page.locator('#search-wifi').waitFor();
      const sizes=await page.evaluate(()=>({viewport:innerWidth,body:document.body.scrollWidth}));
      assert.ok(sizes.body<=sizes.viewport+1, JSON.stringify(sizes));
      await page.screenshot({path:path.join(out,'wifi-'+width+'.png'),fullPage:true});
      results.push('No page overflow at '+width+'px');
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>{document.documentElement.style.zoom='200%';});
    const zoomSizes=await page.evaluate(()=>({body:document.body.scrollWidth,visible:document.documentElement.clientWidth}));
    assert.ok(zoomSizes.body<=zoomSizes.visible+1,JSON.stringify(zoomSizes));
    await page.evaluate(()=>{document.documentElement.style.zoom='';});
    await page.locator('#help-button').click();
    await page.locator('#help-dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#help-dialog[open]').count(),0);
    results.push('200% CSS zoom reflow and keyboard dialog close pass');

    fixture.sections.wifi.status='error';fixture.sections.wifi.message='رسالة تعذر اختبارية';
    await page.getByText(/النتائج المعروضة أدناه من قراءة سابقة/).waitFor();
    results.push('Failed refresh explicitly labels retained readings as previous');
    fixture.sections.wifi={id:'wifi',status:'ready',data:[],message:'فحص اختبار بلا نتائج',updatedAt:now};
    await page.getByText('لم تظهر نتائج في هذه القراءة',{exact:true}).waitFor();
    results.push('Successful empty scan differs from errors and idle states');

    await page.evaluate(()=>{location.hash='reports';});
    await page.getByRole('button',{name:'حفظ الفحص الحالي',exact:true}).waitFor();
    await page.getByRole('button',{name:'حفظ الفحص الحالي',exact:true}).click();
    await page.locator('.session-row').first().waitFor();
    const downloadPromise=page.waitForEvent('download');
    await page.locator('a[href="/api/export?format=html"]').click();
    const download=await downloadPromise;
    const downloaded=path.join(out,download.suggestedFilename());await download.saveAs(downloaded);
    assert.ok(fs.readFileSync(downloaded,'utf8').includes('dir="rtl"'));
    results.push('Actual local archive and Arabic HTML download pass');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    fs.writeFileSync(path.join(out,'ui-validation.json'),JSON.stringify({passed:true,checks:results,errors,externalRequests:external},null,2));
    console.log(JSON.stringify({passed:true,checks:results.length,errors,externalRequests:external}));
  } finally {if(browser) await browser.close();backend.kill();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
