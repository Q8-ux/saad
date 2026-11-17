import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reorderSceneByNumber} from '../assets/scene-board-order.mjs';

const source = await readFile(new URL('../assets/app.mjs',import.meta.url),'utf8');
const css = await readFile(new URL('../assets/studio-compact-layout.css',import.meta.url),'utf8');

function makeDoc() {
  return {
    title:'عمل اختباري',
    scenes:[
      {id:'a',title:'المشهد الأول',unitId:'episode-1',blocks:[{id:'block-a',type:'dialogue',text:'نص محفوظ'}]},
      {id:'b',title:'منزل العائلة - ليل',unitId:'episode-1',blocks:[{id:'block-b',type:'action',text:'وصف ثابت'}]},
      {id:'c',title:'المشهد 3',unitId:'episode-2',blocks:[]},
      {id:'d',title:'مشهد 4',unitId:'episode-2',blocks:[]},
    ],
    comments:[{id:'note',sceneId:'a',blockId:'block-a',text:'الملاحظة ثابتة'}]
  };
}

test('moving a scene to a specified number changes the order, without changing the underlying scene identity',()=>{
  const original=makeDoc();
  const next=reorderSceneByNumber(original,'a',3);
  assert.deepEqual(next.scenes.map(scene=>scene.id),['b','c','a','d']);
  assert.deepEqual(original.scenes.map(scene=>scene.id),['a','b','c','d']);
  assert.equal(next.scenes[2].title,'المشهد 3');
  assert.equal(next.scenes[2].blocks[0].text,'نص محفوظ');
  assert.equal(next.scenes[2].unitId,'episode-1');
  assert.deepEqual(next.comments,original.comments);
  assert.equal(next.scenes[1].title,'المشهد 2');
  assert.equal(next.scenes[0].title,'منزل العائلة - ليل');
});

test('repositioning supports the start and end, and renumbers only plain template titles',()=>{
  const start=makeDoc();
  const last=reorderSceneByNumber(start,'b',4);
  assert.deepEqual(last.scenes.map(scene=>scene.id),['a','c','d','b']);
  assert.deepEqual(last.scenes.map(scene=>scene.title),['المشهد 1','المشهد 2','المشهد 3','منزل العائلة - ليل']);
  const first=reorderSceneByNumber(last,'b',1);
  assert.deepEqual(first.scenes.map(scene=>scene.id),['b','a','c','d']);
  assert.equal(first.scenes[1].title,'المشهد 2');
  assert.equal(first.scenes[0].title,'منزل العائلة - ليل');
});

test('invalid scene number or missing scene ID leaves the exact original document unchanged',()=>{
  const doc=makeDoc();
  for(const value of [0,5,-1,1.2,NaN,'invalid']) {
    assert.strictEqual(reorderSceneByNumber(doc,'a',value),doc);
  }
  assert.strictEqual(reorderSceneByNumber(doc,'missing',2),doc);
  assert.strictEqual(reorderSceneByNumber(doc,'a',1),doc);
  assert.strictEqual(reorderSceneByNumber(null,'a',1),null);
});

test('storyboard number selection uses stable scene IDs and the same manuscript reorder function',()=>{
  assert.match(source,/import\{reorderSceneByNumber as moveSceneNumber\}/);
  assert.match(source,/className:"scene-position-picker"/);
  assert.match(source,/value:m\+1,onChange:p=>X\(E=>moveSceneNumber\(E,f.id,Number\(p.target.value\)\)\)/);
  assert.match(source,/children:v.scenes.map\(\(E,M\)=>\(0,i.jsx\)\("option",\{value:M\+1/);
  assert.match(source,/className:"card-number",children:String\(m\+1\)/);
});

test('storyboard has editable scene title, episode, location, time and summary',()=>{
  assert.match(source,/className:"scene-board-details"/);
  assert.match(source,/className:"scene-board-fields"/);
  for(const text of ['عنوان المشهد','الحلقة أو الفصل','المكان','الوقت','ملخص المشهد','حفظ التعديلات']) {
    assert.ok(source.includes(text),text);
  }
  assert.match(source,/Lt\(f.id,\{title:p.target.value\}/);
  assert.match(source,/Lt\(f.id,\{unitId:p.target.value\|\|void 0\}\)/);
  assert.match(source,/Lt\(f.id,\{location:p.target.value\}/);
  assert.match(source,/Lt\(f.id,\{time:p.target.value\}/);
  assert.match(source,/Lt\(f.id,\{summary:p.target.value\}/);
  assert.match(source,/onClick:\(\)=>St\(f.id\),children:"فتح المشهد في المحرر"/);
  assert.match(css,/\.scene-position-picker/);
  assert.match(css,/\.scene-board-details/);
  assert.match(css,/@media print[\s\S]*\.scene-position-picker,[\s\S]*\.scene-board-details/);
});
