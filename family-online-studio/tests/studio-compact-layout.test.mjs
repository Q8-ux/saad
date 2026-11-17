import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = async relative => readFile(new URL(relative, import.meta.url), 'utf8');

test('command menu groups existing actions without duplicating their original handlers', async () => {
  const code = await source('../assets/studio-command-menu.mjs');
  for (const label of ['الأعمال', 'الكتابة', 'الصوت', 'الملفات', 'المساعدة']) assert.match(code, new RegExp(label, 'u'));
  assert.match(code, /category\(button\)/);
  assert.match(code, /updateGroups\(\)/);
  assert.match(code, /data-command-selected/);
  assert.match(code, /button\.closest\('\.studio-command-groups'\)/);
  assert.match(code, /saveSource\.click\(\)/);
  assert.match(code, /onCommand/);
  assert.doesNotMatch(code, /localStorage|sessionStorage/);
});

test('single workspace dropdown delegates actions to existing React navigation buttons', async () => {
  const code = await source('../assets/studio-compact-layout.mjs');
  assert.match(code, /querySelectorAll\(':scope > button'\)/);
  assert.match(code, /if \(button && !button\.disabled\) button\.click\(\)/);
  assert.match(code, /aria-current/);
  assert.match(code, /tab[s]?\.before\(label\)/);
  assert.match(code, /studio-workspace-picker/);
  assert.doesNotMatch(code, /fetch\(|localStorage|sessionStorage/);
});

test('Word and script formatting controls remain mounted and are toggled without replacing the React tree', async () => {
  const code = await source('../assets/studio-compact-layout.mjs');
  const css = await source('../assets/studio-compact-layout.css');
  assert.match(code, /aria-controls/);
  assert.match(code, /تنسيق النص وأدوات Word/u);
  assert.match(code, /\.editor-toolbar, \.book-tools, \.viewbar \.view-tools/);
  assert.match(css, /@media screen/);
  assert.match(css, /@media print/);
  assert.match(css, /\.book-tools\[data-compact-toolbar="true"\]/);
  assert.match(css, /\.book-save/);
  assert.match(css, /\.editor-toolbar\[data-compact-toolbar="true"\]/);
  assert.doesNotMatch(code, /removeChild\(|replaceWith\(/);
});

test('entry includes compact styles after existing styles and preserves all export formats', async () => {
  const [html,menu,readme] = await Promise.all([
    source('../index.html'),
    source('../assets/studio-command-menu.mjs'),
    source('../README.md')
  ]);
  assert.match(html, /studio-command-menu\.mjs\?v=20261117-compact1/);
  assert.match(html, /studio-compact-layout\.mjs\?v=20261117-compact1/);
  assert.match(html, /studio-compact-layout\.css\?v=20261117-compact1/);
  assert.ok(html.indexOf('studio-compact-layout.css') > html.indexOf('studio-french.css'));
  assert.match(menu, /studio-command-save/);
  assert.match(readme, /Word/u);
  assert.match(readme, /PDF/u);
});
