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


test('Works and Logout remain visibly accessible in all editor views without bypassing existing account actions', async () => {
  const code = await source('../assets/studio-command-menu.mjs');
  const css = await source('../assets/studio-compact-layout.css');
  assert.match(code, /studio-quick-navigation/);
  assert.match(code, /studio-quick-works/);
  assert.match(code, /studio-quick-logout/);
  assert.match(code, /worksButton\.addEventListener\('click',openWorks\)/);
  assert.match(code, /exitButton\.addEventListener\('click',signOut\)/);
  assert.match(code, /source\.click\(\)/);
  assert.match(code, /studio-sign-out/);
  assert.match(code, /قد توجد تعديلات لم تُحفظ/u);
  assert.match(css, /\.studio-quick-navigation/);
  assert.match(css, /position: fixed/);
  assert.match(css, /@media print/);
});

test('touch drawer scrolls while dynamically hidden actions are excluded from keyboard focus', async () => {
  const code = await source('../assets/studio-command-menu.mjs');
  const css = await source('../assets/studio-compact-layout.css');
  assert.match(code, /button\[data-command-category\]:not\(\[data-command-selected\]\)/);
  assert.match(code, /panel\.scrollTop=0/);
  assert.match(code, /selectedGroup=group\.id;updateGroups\(\);panel\.scrollTop=0/);
  assert.doesNotMatch(code, /if\(opened\)panel\.scrollTop=0/);
  assert.match(css, /touch-action: pan-y !important/);
  assert.match(css, /overflow-y: auto !important/);
  assert.match(css, /-webkit-overflow-scrolling: touch/);
  assert.match(css, /overscroll-behavior-y: contain !important/);
});
