import test from 'node:test';
import assert from 'node:assert/strict';
import {episodesFromProject,proposedSummary,summaryMismatch} from '../assets/series-summary.mjs';

const names=['البذرة','الطريق الخطر','الأثر','الحساب المفتوح','ما يخصني','فرحة عثمان','الطريق إلى سيول','أمانة'];
const project=count=>({
  title:'باركود',author:'سعد روضان',genre:'دراما اجتماعية',dialect:'كويتية',blocks:
  Array.from({length:count},(_,i)=>({type:'General',text:'الحلقة '+(i+1)+' — '+(names[i]||'باركود')}))
});
test('الفهرس يتبع الحلقات المفتوحة في المشروع ويحفظ ترتيبها',()=>{
  const p=project(8),episodes=episodesFromProject(p);
  assert.equal(episodes.length,8);
  assert.deepEqual(episodes.map(e=>e.title),names);
  assert.equal(summaryMismatch(p,episodes),false);
});
test('نسخة باركود المضمنة القديمة من عشر حلقات لا تصدر بوصفها نهائية',()=>{
  const p=project(10),episodes=episodesFromProject(p);
  assert.equal(episodes.length,10);
  assert.equal(summaryMismatch(p,episodes),true);
  const summary=proposedSummary(p,episodes);
  assert.doesNotMatch(summary.points,/تبدأ الأزمة من أجور متأخرة/);
});
test('التعريف والقصة موجزان ولا يكشفان نص الحوار أو المشاهد',()=>{
  const p=project(8),summary=proposedSummary(p);
  assert.match(summary.logline,/مبرمج كويتي/);
  assert.equal(Object.keys(summary.episodeNotes).length,8);
  assert.equal(summary.points.trim().split('\n').length,6);
});
test('تظل التعديلات اليدوية ذات أولوية على الصياغة الافتراضية',()=>{
  const p=project(8);p.presentation={logline:'صياغتي المعتمدة',episodeNotes:{'8':'عنوان تعريفي من المؤلف'}};
  const summary=proposedSummary(p);
  assert.equal(summary.logline,'صياغتي المعتمدة');
  assert.equal(summary.episodeNotes['8'],'عنوان تعريفي من المؤلف');
});
test('يدعم أرقام الحلقات العربية المكتوبة بالكلمات أو بالأرقام',()=>{
  const p={title:'خارج الستوري',blocks:[{type:'General',text:'الحلقة الأولى | عودة'},
      {type:'General',text:'الحلقة ٢: الحدث'},{type:'General',text:'الحلقة الثانية | لا تكرر'}]};
  assert.deepEqual(episodesFromProject(p).map(e=>e.title),['عودة','الحدث']);
  assert.equal(summaryMismatch(p),false);
});
