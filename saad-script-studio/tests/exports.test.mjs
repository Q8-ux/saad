import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeLayout,renderPdf,renderDocx,selectEpisodes} from '../assets/screenplay-export.mjs';
const project=JSON.parse(fs.readFileSync(new URL('../assets/projects/outside-story.script.json',import.meta.url)));
const fonts={regular:new Uint8Array(fs.readFileSync(new URL('../assets/Amiri-Regular.ttf',import.meta.url))),bold:new Uint8Array(fs.readFileSync(new URL('../assets/Amiri-Bold.ttf',import.meta.url)))};
test('reading export includes all eight covers and the complete 56-scene script',()=>{
  const plan=makeLayout(project,fonts);
  assert.equal(plan.pages.filter(p=>p.kind==='cover').length,8);
  assert.equal(plan.sourceBlocks.length,project.blocks.length);
  assert.equal(new Set(plan.sourceBlocks.map(b=>b.id)).size,project.blocks.length);
  assert.equal(plan.sourceBlocks.filter(b=>b.type==='Scene Heading').length,56);
  assert.equal(new TextDecoder().decode(renderPdf(plan).slice(0,8)),'%PDF-1.3');
  assert.deepEqual(Array.from(renderDocx(plan,fonts).slice(0,4)),[80,75,3,4]);
});
test('single-episode export and saved text use the same current source',()=>{
  const p=structuredClone(project);const b=p.blocks.find(b=>b.type==='Dialogue');b.text='نص محفوظ حديثًا يجب أن يظهر في ملف القراءة.';
  const plan=makeLayout(p,fonts,{episode:1});
  assert.equal(plan.episodeNumbers.length,1);assert.equal(plan.sourceBlocks.filter(b=>b.type==='Scene Heading').length,7);
  assert.ok(plan.sourceBlocks.some(x=>x.id===b.id&&x.text===b.text));
  assert.equal(selectEpisodes(p,8).episodes[0].number,8);
});
test('PDF layout keeps every text row inside the A4 body and headings with a following row',()=>{
  const plan=makeLayout(project,fonts);
  for(const page of plan.pages)for(const row of page.rows){
    assert.ok(row.y>=28);
    const bottom=row.y+Math.max(...row.fields.map(f=>f.lines.length),1)*row.lineHeight;
    assert.ok(bottom<=279,`${page.episode}: bottom ${bottom}`);
  }
});
