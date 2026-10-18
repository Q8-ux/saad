import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SERIES,readRoute,episodeBlocks,splitScenes,applyEdits} from '../assets/catalog.mjs';
const p=JSON.parse(fs.readFileSync(new URL('../data/outside-story.script.json',import.meta.url),'utf8'));

test('one catalog keeps Barcode first and Outside Story second',()=>{
  assert.deepEqual(SERIES.map(s=>s.id),['barcode','outside-story']);
  assert.equal(SERIES[0].episodes.length,10);assert.equal(SERIES[1].episodes.length,8);
});
test('shared-page routing validates series and episode boundaries',()=>{
  assert.deepEqual(readRoute('#series=outside-story&episode=8'),{series:SERIES[1],episode:8});
  assert.equal(readRoute('#series=outside-story&episode=9').episode,null);
  assert.equal(readRoute('#series=barcode&episode=-1').episode,null);
  assert.equal(readRoute('#series=unknown&episode=1').series.id,'barcode');
});
test('all eight episodes retain every original scene and paragraph in order',()=>{
  const scenes=Array.from({length:8},(_,i)=>splitScenes(episodeBlocks(p,i+1)));
  assert.deepEqual(scenes.map(s=>s.length),[7,7,7,7,7,7,7,7]);
  const expected=p.blocks.filter(b=>b.type!=='General');
  const actual=scenes.flat(1).flatMap(s=>[s.heading,...s.blocks]);
  assert.deepEqual(actual,expected);
  assert.equal(new Set(actual.map(b=>b.id)).size,actual.length);
  assert.ok(actual.some(b=>b.text.includes('وايد يسألوني: شلون')));
});
test('local edits remain isolated by original block id without changing the source or other episodes',()=>{
  const id=episodeBlocks(p,1).find(b=>b.type==='Dialogue').id;
  const before=JSON.stringify(p);const edited=applyEdits(p,{[id]:'تعديل للمراجعة'});
  assert.equal(edited.blocks.find(b=>b.id===id).text,'تعديل للمراجعة');
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(episodeBlocks(edited,8),episodeBlocks(p,8));
  assert.deepEqual(edited.story,p.story);
});
test('all ten original Barcode scripts remain readable independently',()=>{
  for(let n=1;n<=10;n++){
    const context={window:{}};vm.createContext(context);
    vm.runInContext(fs.readFileSync(new URL(`../data/episode-${n}.js`,import.meta.url),'utf8'),context);
    const episode=context.window[`BARCODE_EPISODE_${n}`];
    assert.equal(typeof episode.text,'string');assert.ok(episode.text.length>5000);
  }
});
test('legacy login handlers and a single shared page remain present',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.equal((html.match(/<main\b/g)||[]).length,1);
  assert.ok(html.includes('id="series-list"'));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
  assert.ok(script.includes('function go()'));assert.ok(script.includes('function logout()'));
  assert.ok(script.includes('function openBarcodeEp(i)'));
});
