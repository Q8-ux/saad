import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { deployedShell, fixtureName, startFixture } from './fixture.mjs';

const binary = process.argv[2] || 'obscura';
const editor = '#source-memo-editor';
const firstMemo = '#source-list .memo-list-item';

async function readEditor(fixture, stage) {
  const browser = spawn(binary, ['mcp', '--allow-private-network'], { stdio: ['pipe', 'pipe', 'ignore'] });
  const lines = createInterface({ input: browser.stdout });
  const replies = lines[Symbol.asyncIterator]();
  const stopped = new Promise(resolve => browser.once('close', resolve));
  browser.on('error', () => lines.close());
  browser.stdin.on('error', () => lines.close());
  const timer = setTimeout(() => browser.kill(), 45_000);
  let id = 0;

  const send = message => browser.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
  async function call(method, params) {
    const requestId = ++id;
    send({ id: requestId, method, params });
    for (;;) {
      const { value: line, done } = await replies.next();
      if (done) throw new Error('Browser stopped before replying');
      const message = JSON.parse(line);
      if (message.id !== requestId) continue;
      if (!message.result || message.result.isError) throw new Error('Browser command failed');
      return message.result;
    }
  }
  const tool = (name, args) => call('tools/call', { name: 'browser_' + name, arguments: args });
  const visit = path => tool('navigate', { url: fixture.origin + path, waitUntil: 'domcontentloaded' });
  const wait = selector => tool('wait_for', { selector, timeout: 8 });
  const click = selector => tool('click', { selector });
  const fill = (selector, value) => tool('fill', { selector, value });

  try {
    await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'sabeq-memo-check', version: '1' } });
    send({ method: 'notifications/initialized' });
    stage('إرسال المذكرة الاصطناعية وحفظها');
    await visit('/memo');
    await click('#memo-fixture button');
    await wait('#memo-result[data-state]');
    const saved = fixture.saved();
    const stored = saved?.requestId && fixture.stored(saved.requestId);
    if (!saved?.memo || stored?.output_text !== saved.memo || stored.status !== 'needs_review') {
      throw new Error('Synthetic memo was not saved');
    }

    stage('دخول لوحة Bolt في البيئة المعزولة');
    await visit('/admin/');
    await wait('#login-form');
    await fill('#username', 'obscura-fixture');
    await fill('#password', 'synthetic-fixture-only');
    await click('#login-btn');
    const memos = '[data-section="generated_memos"]';
    await wait(memos);
    await click(memos);

    stage('ظهور الطلب في القائمة وفتح المحرر');
    await wait(firstMemo + ' button');
    const rows = await tool('evaluate', { expression: `document.querySelector(${JSON.stringify(firstMemo + ' strong')}).textContent.includes(${JSON.stringify(fixtureName)})` });
    if (rows.content?.[0]?.text !== 'true') throw new Error('Synthetic memo missing from the list');
    await click(firstMemo + ' button');
    await wait(editor);
    const result = await tool('evaluate', { expression: `(() => {
      const editor = document.querySelector(${JSON.stringify(editor)});
      return JSON.stringify({text:editor.textContent,dir:editor.getAttribute('dir'),editable:String(editor.contentEditable)});
    })()` });
    return { ...JSON.parse(result.content[0].text), storedText: stored.output_text };
  } finally {
    clearTimeout(timer);
    browser.stdin.end();
    browser.kill();
    await stopped;
    lines.close();
  }
}

let step = 'تحميل نسخة لوحة Bolt المنشورة';
try {
  const { script, version } = await deployedShell();
  console.log(`نسخة واجهة Bolt المستخدمة في الاختبار ${version}`);
  for (const emptyEditor of [false, true]) {
    step = 'تهيئة قاعدة بيانات الاختبار';
    const fixture = await startFixture(script, emptyEditor);
    try {
      const result = await readEditor(fixture, name => { step = name; });
      step = 'مطابقة نص المحرر مع النص المحفوظ';
      const matches = result.text === result.storedText;
      const exact = matches && result.dir === 'rtl' && result.editable === 'true';
      if (emptyEditor ? exact || result.editable !== 'false' : !exact) {
        console.error(`تطابق النص ${matches}، الاتجاه RTL ${result.dir === 'rtl'}، قابلية التعديل ${result.editable === 'true'}.`);
        throw new Error('Unexpected editor state');
      }
      console.log(emptyEditor ? 'نجح اختبار الانحدار للمذكرة التي لا يظهر نصها في المحرر.' : 'نجح الإرسال والحفظ وعرض النص كاملًا في محرر Bolt باتجاه RTL.');
    } catch {
      const saved = fixture.saved();
      if (saved?.status) console.error(`استجابة مسار المذكرة الاصطناعية HTTP ${saved.status}.`);
      throw new Error('Memo browser check failed');
    } finally {
      await fixture.close();
    }
  }
} catch {
  console.error(`تعذر اجتياز فحص Obscura عند مرحلة ${step}.`);
  process.exitCode = 1;
}
