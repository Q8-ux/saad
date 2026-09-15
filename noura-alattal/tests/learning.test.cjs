const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/learning-core.js');
const K = require('../assets/knowledge-content.js');
const {createEngine} = require('../assets/knowledge-core.js');
const memory = () => {const items = new Map();return {getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};};

test('Arabic questions, transliteration and English concepts reach the intended guide',()=>{
 const e=createEngine(K);
 for(const [query,id] of [['شلون أكتب لوجلاين لفيلمي','logline'],['كيف أبني شخصية مقنعة','character'],['ما تحت النص','subtext'],['character arc','arc'],['اريد مشهد صامت','visual'],['الحبكة','structure']]){
  assert.ok(e.search(query,{type:'guide'}).slice(0,3).some(x=>x.id===id),query);
 }
 assert.equal(e.search('zxqvz123somethingnotintheindex').length,0);
 assert.ok(e.search('لوجلاين')[0]._reasons.length);
 assert.ok(e.search('الشخصية والحوار').some(x=>x._partial));
});
test('search respects combined filters even with concept expansion and approximate matching',()=>{
 const e=createEngine(K);
 const found=e.search('مشهد صامت',{type:'work',region:'كويتي',saved:true},['work:falafel']);
 assert.deepEqual(found.map(x=>x.id),['falafel']);
 assert.equal(e.search('لوجلاين',{type:'work',region:'كويتي',saved:true},[]).length,0);
 assert.equal(e.search('اثنا عشر رجلا غاضبا',{type:'work'})[0].id,'jury');
});
test('concept relationships and learning recommendations only link existing materials',()=>{
 const e=createEngine(K);
 for(const entry of e.entries){const related=e.related(entry.key);for(const work of related.works)assert.ok(K.works.includes(work));}
 for(const u of L.units){assert.ok(K.guides.some(g=>g.id===u.guide));assert.ok(K.templates.some(t=>t.id===u.template));for(const id of u.works)assert.ok(K.works.some(w=>w.id===id));}
 const initial=L.recommend({goal:'short',skills:{}});assert.equal(initial[0].id,'idea');
 const next=L.recommend({goal:'short',skills:{}},{idea:{evidence:'done'}});assert.equal(next[0].id,'character');
 assert.equal(L.recommend({goal:'criticism',skills:{}})[0].id,'local');
 const completed=Object.fromEntries(L.goalOrder.short.map(id=>[id,{evidence:'done'}]));assert.ok(L.recommend({goal:'short'},completed).every(x=>x.done));
});
test('learning and scene state survive reload, reordering and additive import',()=>{
 const storage=memory(),s=L.createStore(storage);
 assert.throws(()=>s.complete('scene','قرأت'),/20/);
 s.complete('scene','اختبرت نقطة التحول في مشهدي بقرار جديد للشخصية.');
 const a=s.scene({heading:'داخلي — غرفة — ليل',intent:'تريد المفتاح',turn:'تجد الباب مفتوحًا'});
 const b=s.scene({heading:'خارجي — شارع — نهار'});
 s.move(b,-1);assert.deepEqual(s.state.scenes.map(x=>x.id),[b,a]);
 const fresh=L.createStore(storage);assert.equal(fresh.state.completed.scene.evidence,s.state.completed.scene.evidence);
 const copy=JSON.parse(JSON.stringify(s.state));s.import(copy);assert.equal(s.state.scenes.length,2);
 copy.scenes[0].heading='خارجي — مدرسة — نهار';s.import(copy);assert.equal(s.state.scenes.length,3);
 assert.equal(new Set(s.state.scenes.map(x=>x.id)).size,3);
 s.remove(a);assert.equal(s.state.scenes.length,2);
});
test('failed saves, oversized imports and malformed backups do not replace the project',()=>{
 const storage=memory(),s=L.createStore(storage);s.scene({heading:'سابق'});const before=s.state;
 storage.setItem=()=>{throw Error('quota');};assert.throws(()=>s.scene({heading:'جديد'}));assert.deepEqual(s.state,before);
 assert.throws(()=>s.profile({title:'جديد'}));assert.deepEqual(s.state,before);
 assert.throws(()=>s.import({version:1}));
 const huge={...before,scenes:Array.from({length:81},()=>({heading:'مشهد'}))};assert.throws(()=>s.import(huge));assert.deepEqual(s.state,before);
});
test('format diagnostics identify scene locations but do not assign literary quality',()=>{
 const r=L.analyze('داخلي — غرفة — ليل\nمريم تضع الظرف على الطاولة.\n\nخارجي — شارع\n');
 assert.equal(r.scenes.length,2);assert.equal(r.scenes[1].line,4);assert.ok(r.warnings.some(w=>w.line===4&&w.title==='راجع زمن المشهد'));
 assert.ok(!('quality' in r));assert.ok(!('score' in r));assert.equal(L.analyze('').warnings.length,0);
 assert.equal(L.analyze('INT. ROOM - DAY\nA door opens.\nEXT. STREET - NIGHT\nA car stops.').scenes.length,2);
 assert.equal(L.analyze('داخلي - غرفة - ليل\n'+'كلمة '.repeat(100)).warnings[0].title,'كتلة نصية طويلة');
});
test('line comparison can reconstruct both versions and safely bounds expensive work',()=>{
 for(const [before,after] of [['أول\nثان\nثالث','أول\nجديد\nثالث'],['','مريم تدخل.'],['أ\nأ\nب','أ\nب\nأ'],['<script>\nنهاية','<img>\nنهاية']]){
  const r=L.compareVersions(before,after);assert.equal(r.limited,false);
  assert.equal(r.rows.filter(x=>x.type!=='added').map(x=>x.text).join('\n'),before);
  assert.equal(r.rows.filter(x=>x.type!=='removed').map(x=>x.text).join('\n'),after);
 }
 assert.equal(L.compareVersions('أ\n'.repeat(600),'ب\n'.repeat(600)).limited,true);
});
