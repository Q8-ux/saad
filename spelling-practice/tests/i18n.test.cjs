const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const I=require('../i18n.js');
const C=require('../core.js');
const M=require('../motion.js');

test('all interface keys have Arabic and English translations with matching placeholders',()=>{
  for(const [key,pair] of Object.entries(I.TEXT)){
    assert.equal(pair.length,2,key);assert.ok(pair.every(text=>typeof text==='string'&&text.trim()),key);
    assert.deepEqual(pair[0].match(/\{\w+\}/g)||[],pair[1].match(/\{\w+\}/g)||[],key);
    assert.ok(!/[\u0600-\u06ff]/.test(pair[1]),key+' must have an English interface translation');
  }
  for(const subject of C.SUBJECTS)assert.ok(I.t(subject.id,'en'));
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const [,key] of html.matchAll(/data-i18n(?:-aria-label|-alt|-content)?="([^"]+)"/g))assert.ok(I.t(key,'en'));
  assert.ok(html.indexOf('i18n.js?')<html.indexOf('core.js?'));assert.ok(html.indexOf('i18n.js?')<html.indexOf('motion.js?'));
});

test('locale validation and numbers never alter lesson data or the original storage key',()=>{
  assert.equal(I.resolveLocale('?lang=en','ar'),'en');assert.equal(I.resolveLocale('?lang=ar','en'),'ar');assert.equal(I.resolveLocale('?lang=invalid','en'),'en');assert.equal(I.resolveLocale('','invalid'),'ar');
  assert.equal(I.digits(59,'ar'),'٥٩');assert.equal(I.digits(59,'en'),'59');assert.notEqual(I.LANGUAGE_KEY,C.STORAGE_KEY);
  for(const word of C.WORDS){assert.equal(I.meaning(word,'ar'),word.meaning);if(word.lang==='ar')assert.equal(I.meaning(word,'en'),word.meaning);else{assert.ok(I.meaning(word,'en'));assert.ok(!/[\u0600-\u06ff]/.test(I.meaning(word,'en')));}}
});

test('worksheet translations change labels only; all original paths and Arabic marks remain',()=>{
  for(const word of C.WORDS){
    const trace=word.trace||word.word;
    const en=C.sheetSvg(trace,'trace',false,'en'),ar=C.sheetSvg(trace,'trace',false,'ar');
    assert.deepEqual([...en.matchAll(/<path [^>]*>/g)].map(m=>m[0]),[...ar.matchAll(/<path [^>]*>/g)].map(m=>m[0]));
    assert.ok(en.includes('Trace the dots'));assert.ok(ar.includes('أتتبّع النقاط'));
  }
  for(const locale of ['ar','en']){
    const markup=C.printMarkup(C.WORDS,locale);assert.equal((markup.match(/<article /g)||[]).length,59);assert.equal((markup.match(/<img /g)||[]).length,14);assert.equal((markup.match(/data-diacritic="fatha"/g)||[]).length,48);
  }
});

test('rendered video captions follow the interface language while tracing the same word',()=>{
  const word=C.WORDS.find(w=>w.id==='garden'),plan=M.buildPlan(word),before=JSON.stringify(plan);
  const labels=[];const ctx={save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},fillText(text){labels.push({text,dir:this.direction})},translate(){},setLineDash(){},beginPath(){},arc(){},moveTo(){},lineTo(){},stroke(){},fill(){},drawImage(){}};
  M.drawFrame(ctx,plan,.5,{locale:'en'});assert.equal(labels[0].text,I.t('videoTitle','en'));assert.equal(labels[0].dir,'ltr');assert.equal(labels[1].text,I.meaning(word,'en'));
  labels.length=0;M.drawFrame(ctx,plan,.5,{locale:'ar'});assert.equal(labels[0].text,I.t('videoTitle','ar'));assert.equal(labels[0].dir,'rtl');assert.equal(labels[1].text,'حديقة');assert.equal(JSON.stringify(plan),before);
});
