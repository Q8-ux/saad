import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {newProject,block,validateProject,parseText,scenes,moveScene,toFdx,fromFdx,toFountain,review,validateScene,snapshot,printBody} from '../assets/core.mjs';

const arabic='داخلي - مكتب قديم - نهار\nيجلس جابر قرب النافذة، ويحمل ملفاً باسم Project 7.\nجابر: أين الخريطة؟\nخالد: بجانب الكرسي.\n\nخارجي - شارع - ليل\nتخرج مريم، وتقرأ: ١٢ / 12.';
test('Arabic conversion preserves dialogue, mixed text and all substantive lines',()=>{
  const {blocks}=parseText(arabic);const p=newProject();p.blocks=blocks;
  assert.equal(scenes(p).length,2);
  assert.deepEqual(blocks.filter(b=>b.type==='Character').map(b=>b.text),['جابر','خالد']);
  assert.equal(blocks.find(b=>b.type==='Dialogue').text,'أين الخريطة؟');
  assert.ok(blocks.some(b=>b.text.includes('Project 7')));
  assert.ok(blocks.some(b=>b.text.includes('١٢ / 12')));
  assert.deepEqual(review(p),[]);
});
test('FDX is real XML and round trips Arabic, punctuation, scene numbers and types',()=>{
  const p=newProject('جابر & خالد <قصة>');p.author='سعد روضان';p.blocks=[block('Scene Heading','داخلي - مكتب - نهار',{number:'12A'}),block('Action','تَوقّف جابر <قرب الباب> & قال: "هنا".'),block('Character','جابر'),block('Dialogue','هل حفظت الملف Test.pdf؟')];
  const xml=toFdx(p);const decoded=fromFdx(xml,DOMParser);
  assert.equal(decoded.metadata.title,p.title);assert.equal(decoded.metadata.author,p.author);
  assert.deepEqual(decoded.blocks.map(b=>[b.type,b.text,b.number||'']),p.blocks.map(b=>[b.type,b.text,b.number||'']));
  assert.ok(xml.includes('&lt;قصة&gt;'));assert.ok(xml.includes('&amp;'));
  assert.throws(()=>fromFdx('<FinalDraft><Content>',DOMParser));
  assert.throws(()=>fromFdx('<!DOCTYPE x><FinalDraft/>',DOMParser));
});
test('Fountain forced elements preserve Arabic screenplay types on reimport',()=>{
  const p=newProject('المفتاح');p.author='كاتب';p.blocks=parseText(arabic).blocks;
  const text=toFountain(p);const result=parseText(text,{fountain:true});
  assert.equal(result.metadata.title,'المفتاح');assert.equal(result.metadata.author,'كاتب');
  assert.deepEqual(result.blocks.map(b=>[b.type,b.text]),p.blocks.map(b=>[b.type,b.text]));
});
test('moving a scene carries its dialogue and retains its summary',()=>{
  const p=newProject();p.blocks=parseText(arabic).blocks;p.blocks[0].summary='بحث عن الخريطة';
  const first=scenes(p)[0];const before=first.blocks.map(b=>b.text);
  assert.equal(moveScene(p,first.id,1),true);
  assert.deepEqual(scenes(p)[1].blocks.map(b=>b.text),before);
  assert.equal(scenes(p)[1].summary,'بحث عن الخريطة');
  assert.equal(moveScene(p,first.id,1),false);
});
test('snapshots are independent and malformed imports cannot replace a project',()=>{
  const p=newProject();p.blocks=parseText(arabic).blocks;snapshot(p,'الأصل');p.blocks[0].text='تغيير';
  assert.notEqual(p.snapshots[0].blocks[0].text,p.blocks[0].text);
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(restored.snapshots.length,1);
  assert.throws(()=>validateProject({blocks:[{type:'Fake',text:'x'}]}));
  assert.throws(()=>validateProject({...p,snapshots:[{name:'فساد',blocks:[{type:'Fake',text:'x'}]}]}));
});
test('generated malformed dialogue is rejected before committing a scene',()=>{
  assert.throws(()=>validateScene({blocks:[{type:'Action',text:'يطرق الباب.'},{type:'Dialogue',text:'افتح الباب.'}]},'داخلي - بيت - ليل'));
  assert.equal(validateScene({blocks:[{type:'Action',text:'يطرق الباب.'},{type:'Character',text:'سالم'},{type:'Dialogue',text:'افتح الباب.'}]},'داخلي - بيت - ليل').length,4);
});
test('print output escapes markup and uses RTL without changing text',()=>{
  const p=newProject('<script>alert(1)</script>');p.author='سعد';p.blocks=[block('Scene Heading','داخلي - غرفة - نهار'),block('Action','جابر وخالد: لا تتغيّر الحروف.')];
  const html=printBody(p);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('dir="rtl"'));assert.ok(html.includes('جابر وخالد: لا تتغيّر الحروف.'));
});
