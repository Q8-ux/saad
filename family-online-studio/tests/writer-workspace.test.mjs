import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';

test('WriterSolo is an internal full-screen workspace without an external redirect', async () => {
  const [app, style, index, chunks] = await Promise.all([
    readFile(new URL('../assets/app.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../assets/writer-workspace.css', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readdir(new URL('../assets/chunks/', import.meta.url)),
  ]);
  const javascript = app + (await Promise.all(chunks.filter(name => name.endsWith('.mjs')).map(name => readFile(new URL('../assets/chunks/' + name, import.meta.url), 'utf8')))).join('');

  assert.match(javascript, /مساحة WriterSolo الداخلية/u);
  assert.match(javascript, /العودة إلى الاستوديو/u);
  for (const label of ['القائمة', 'المشروع', 'البطاقات', 'التعليقات', 'الأدوات', 'التحليل', 'المساعدة', 'الحساب']) {
    assert.match(javascript, new RegExp(label, 'u'));
  }
  assert.match(javascript, /أدوات تنسيق السيناريو/u);
  assert.match(app, /writer-workspace-Y6EFKEVU\.mjs\?v=solo-ar-2/u);
  assert.match(style, /\.writer-workspace-bar/u);
  assert.match(style, /\.writer-solo-dock/u);
  assert.match(style, /\.writer-solo-panel/u);
  assert.match(style, /@media \(max-width: 900px\)/u);
  assert.doesNotMatch(javascript + index, /writersolo\.com/u);
  assert.doesNotMatch(index, /writer-solo\.mjs|writer-solo\.css/u);
});
