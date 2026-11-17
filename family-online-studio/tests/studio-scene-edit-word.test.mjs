import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../assets/app.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('../assets/studio-compact-layout.css',import.meta.url),'utf8');

test('each scene in navigation exposes Edit targeting its own scene ID',()=>{
  assert.match(app,/className:"scene-link-row"/);
  assert.match(app,/className:"scene-edit-shortcut","aria-label":"تحرير "\+\(f.title\|\|"المشهد "\+W\(m\+1\)\),onClick:\(\)=>St\(f.id\),children:"تحرير"/);
  assert.match(app,/onClick:\(\)=>St\(f.id\),className:"scene-link "/);
  assert.doesNotMatch(app,/onClick:\(\)=>St\(H.id\),children:"تحرير"/);
});

test('scene board and first line of each reader scene expose Edit',()=>{
  assert.match(app,/className:"scene-card-edit"/);
  assert.match(app,/className:"reader-edit-scene reader-edit-scene-top"/);
  assert.match(app,/className:"reader-edit-scene reader-edit-scene-top"[^}]*onClick:\(\)=>St\(f.id\)/);
  assert.match(app,/className:"reader-edit-scene reader-edit-scene-top"[\s\S]*?\(0,i.jsx\)\(Zc,\{scene:f,index:m/);
});

test('top of both editor and read view exports the entire current work as Word using existing exporter',()=>{
  const instances=app.match(/className:"scene-word-export"/g)||[];
  assert.equal(instances.length,2);
  assert.match(app,/className:"scene-word-export",disabled:S,onClick:\(\)=>\{S\|\|\(z\(!0\),Em\(cleanScenes\(v\)\)/);
  assert.match(app,/جارٍ تجهيز Word…/u);
  assert.match(app,/تصدير العمل Word/u);
  assert.match(app,/مستند Word/u);
});

test('new controls do not print and preserve existing formatting',()=>{
  assert.match(css,/\.scene-link-row/);
  assert.match(css,/\.scene-edit-shortcut/);
  assert.match(css,/\.reader-edit-scene-top/);
  assert.match(css,/\.scene-word-export/);
  assert.match(css,/@media print[\s\S]*\.scene-word-export,[\s\S]*\.reader-edit-scene-top/);
});
