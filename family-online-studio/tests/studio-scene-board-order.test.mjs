import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reorderSceneByNumber,cleanSceneTitle,cleanSceneDocument} from '../assets/scene-board-order.mjs';

const source = await readFile(new URL('../assets/app.mjs',import.meta.url),'utf8');
const css = await readFile(new URL('../assets/studio-compact-layout.css',import.meta.url),'utf8');

function makeDoc() {
  return {
    title:'عمل اختباري',
    scenes:[
      {id:'a',title:'المشهد الأول',unitId:'episode-1',blocks:[{id:'block-a',type:'dialogue',text:'نص محفوظ'}]},
      {id:'b',title:'منزل العائلة - ليل',unitId:'episode-1',blocks:[{id:'block-b',type:'action',text:'وصف ثابت'}]},
      {id:'c',title:'المشهد 3',unitId:'episode-2',blocks:[]},
      {id:'d',title:'مشهد 4',unitId:'episode-2',blocks:[]}
    ],
    comments:[{id:'note',sceneId:'a',blockId:'block-a',text:'الملاحظة ثابتة'}],
  };
}

test('old numbered labels are not a second independent scene number', () => {
  for(const label of ['المشهد الأول','المشهد 1','المشهد (2)','مشهد 03','مشهد ٤','المشهد رقم ۲','المشهد السابع']){
    assert.equal(cleanSceneTitle(label),'',label);
  }
  assert.equal(cleanSceneTitle('المشهد 2 - بيت العائلة'),'بيت العائلة');
  assert.equal(cleanSceneTitle('مشهد ١: داخلي - صباح'),'داخلي - صباح');
  assert.equal(cleanSceneTitle('المشهد ١ - المشهد ٢ - المكان'),'المكان');
  assert.equal(cleanSceneTitle('المشهد الجديد'),'المشهد الجديد');
  assert.equal(cleanSceneTitle('بيت العائلة - ليل'),'بيت العائلة - ليل');
  assert.equal(cleanSceneTitle('فصل بين المشهدين'),'فصل بين المشهدين');
});

test('reordering by number moves scene IDs and removes duplicate numeric titles, preserving content',()=>{
  const original=makeDoc();
  const next=reorderSceneByNumber(original,'a',3);
  assert.deepEqual(next.scenes.map(scene=>scene.id),['b','c','a','d']);
  assert.deepEqual(original.scenes.map(scene=>scene.id),['a','b','c','d']);
  assert.deepEqual(next.scenes.map(scene=>scene.title),['منزل العائلة - ليل','','','']);
  assert.equal(next.scenes[2].blocks[0].text,'نص محفوظ');
  assert.equal(next.scenes[2].unitId,'episode-1');
  assert.deepEqual(next.comments,original.comments);
  assert.equal(original.scenes[0].title,'المشهد الأول');
});

test('multiple moves, manual titles, and competing old labels cannot produce duplicate position numbers',()=>{
  const start=makeDoc();
  let current=reorderSceneByNumber(start,'b',4);
  current=reorderSceneByNumber(current,'c',1);
  current=reorderSceneByNumber(current,'d',2);
  assert.deepEqual(current.scenes.map(scene=>scene.id),['c','d','a','b']);
  assert.deepEqual(current.scenes.map(scene=>scene.title),['','','','منزل العائلة - ليل']);
  const numbers=current.scenes.map((_,index)=>index+1);
  assert.deepEqual(numbers,[1,2,3,4]);
  assert.equal(new Set(numbers).size,current.scenes.length);
});

test('direct export sanitization handles legacy saved documents without mutating author content',()=>{
  const original=makeDoc();
  original.scenes[0].title='المشهد ٢ - المطبخ';
  const prepared=cleanSceneDocument(original);
  assert.deepEqual(prepared.scenes.map(scene=>scene.title),['المطبخ','منزل العائلة - ليل','','']);
  assert.equal(original.scenes[0].title,'المشهد ٢ - المطبخ');
  assert.deepEqual(prepared.scenes[0].blocks,original.scenes[0].blocks);
  assert.strictEqual(cleanSceneDocument(prepared),prepared);
});

test('invalid positions and scene identifiers do not change any other scene',()=>{
  const doc=makeDoc();
  for(const value of [0,5,-1,1.2,NaN,'invalid']){
    assert.strictEqual(reorderSceneByNumber(doc,'a',value),doc);
  }
  assert.strictEqual(reorderSceneByNumber(doc,'missing',2),doc);
  assert.strictEqual(reorderSceneByNumber(null,'a',1),null);
});

test('all storyboard ordering controls use the same scene-position function',()=>{
  assert.match(source,/import\{reorderSceneByNumber as moveSceneNumber,cleanSceneTitle as sceneTitle,cleanSceneDocument as cleanScenes\}/);
  assert.match(source,/className:"scene-position-picker"/);
  assert.match(source,/value:m\+1,onChange:p=>X\(E=>moveSceneNumber\(E,f.id,Number\(p.target.value\)\)\)/);
  assert.match(source,/children:v.scenes.map\(\(E,M\)=>\(0,i.jsx\)\("option",\{value:M\+1/);
  assert.doesNotMatch(source,/className:"card-number"/);
  assert.match(source,/onClick:\(\)=>X\(p=>moveSceneNumber\(p,f.id,m\)\)/);
  assert.match(source,/onClick:\(\)=>X\(p=>moveSceneNumber\(p,f.id,m\+2\)\)/);
  assert.equal((source.match(/moveSceneNumber\(M,M\.scenes\[Number\(E\)\]\?\.id,m\+1\)/g)||[]).length,2);
});

test('storyboard title input never duplicates a numeric title in saved data',()=>{
  assert.match(source,/className:"scene-board-details"/);
  assert.match(source,/عنوان المشهد \(دون رقم\)/u);
  assert.match(source,/value:sceneTitle\(f.title\)/);
  assert.match(source,/Lt\(f.id,\{title:sceneTitle\(p.target.value\)\}/);
  assert.match(source,/Lt\(f.id,\{unitId:p.target.value\|\|void 0\}\)/);
  assert.match(source,/Lt\(f.id,\{location:p.target.value\}/);
  assert.match(source,/Lt\(f.id,\{time:p.target.value\}/);
  assert.match(source,/Lt\(f.id,\{summary:p.target.value\}/);
  assert.match(css,/\.scene-position-picker/);
  assert.match(css,/\.scene-board-details/);
});

test('reader editor and Word/PDF export use one position number, never a stale number in scene titles',()=>{
  assert.match(source,/sceneTitle\(l.title\)/);
  assert.match(source,/value:sceneTitle\(H.title\)/);
  assert.match(source,/Em\(cleanScenes\(v\)\)/);
  assert.match(source,/Em\(cleanScenes\(Oe\)\)/);
  assert.match(source,/Uf\(cleanScenes\(v\)\)/);
  assert.match(source,/Uf\(cleanScenes\(v\),Ae\)/);
  assert.match(source,/children:\[m\+1," — ",sceneTitle\(f.title\)\|\|"بلا عنوان"\]/);
});
