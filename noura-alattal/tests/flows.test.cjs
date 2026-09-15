const test=require('node:test');
const assert=require('node:assert/strict');
const {createStore}=require('../assets/demo-state.js');
const {createEngine,normalize}=require('../assets/knowledge-core.js');
const data=require('../assets/knowledge-content.js');
function memory(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function enrolled(){const storage=memory(),d=createStore(storage);d.signIn('متدرّب','learner@example.test');const order=d.createOrder('scene');d.pay(order.id,'success');return {d,storage};}
test('subscriptions require demo sign-in and payment outcomes never charge or unlock on decline/cancel',()=>{
 const d=createStore(memory());assert.throws(()=>d.createOrder('scene'));d.signIn('متدرّب','learner@example.test');
 for(const result of ['declined','cancelled']){const order=d.createOrder('scene');d.pay(order.id,result);assert.equal(d.active('scene'),false);assert.throws(()=>d.completeLesson('scene',0));}
 const o=d.createOrder('scene');d.pay(o.id,'success');d.pay(o.id,'success');assert.equal(d.state.enrollments.length,1);assert.equal(d.state.orders.filter(o=>o.status==='demo_paid').length,1);assert.throws(()=>d.completeLesson('characters',0));
});
test('full learning, workshop, submission, revision, approval and certificate journey survives reload',()=>{
 const {d,storage}=enrolled();assert.equal(d.certificateReady('scene'),false);[0,1,2].forEach(i=>d.completeLesson('scene',i));d.completeLesson('scene',1);assert.deepEqual(d.state.progress.scene,[0,1,2]);d.joinWorkshop('scene');d.addMessage('scene','سؤال عن رغبة الشخصية');
 const a=d.submitAssignment('scene','مشهد أول','نص أصلي أول');assert.throws(()=>d.review(a.id,'راجعه','approved'));d.enterTeacher();d.review(a.id,'وضّح العائق','revision');assert.equal(d.certificateReady('scene'),false);d.enterStudent();d.submitAssignment('scene','مشهد منقح','نص أصلي منقح');assert.equal(d.state.assignments[0].history.length,1);assert.equal(d.state.assignments[0].status,'pending');d.enterTeacher();d.review(a.id,'الهدف والعائق واضحان الآن','approved');
 const reloaded=createStore(storage);assert.equal(reloaded.certificateReady('scene'),true);assert.equal(reloaded.state.workshops.scene.messages.length,1);assert.equal(reloaded.state.assignments[0].feedback,'الهدف والعائق واضحان الآن');
});
test('sign-out protects enrolled content and signing back in restores the local demo',()=>{const {d}=enrolled();d.signOut();assert.throws(()=>d.completeLesson('scene',0));d.signIn();d.completeLesson('scene',0);assert.deepEqual(d.state.progress.scene,[0]);});
test('price snapshots stay stable and course settings preserve edited lessons',()=>{
 const d=createStore(memory());d.signIn();const order=d.createOrder('scene');d.enterTeacher();d.editLesson('scene',0,{title:'عنوان معدل',body:'شرح معدل',task:'تمرين معدل'});d.settings('scene',{priceFils:65000,date:'2027-01-10'});assert.equal(d.state.courseSettings.scene.lessons[0].title,'عنوان معدل');assert.equal(d.price('scene'),65000);d.enterStudent();d.pay(order.id,'success');assert.equal(d.state.orders[0].amountFils,45000);assert.throws(()=>d.editLesson('scene',0,{title:'x',body:'y',task:'z'}));
});
test('failed persistence does not report or keep successful account and payment mutations',()=>{
 const storage=memory(),d=createStore(storage);d.signIn();const order=d.createOrder('scene');storage.setItem=()=>{throw Error('quota');};assert.throws(()=>d.pay(order.id,'success'));assert.equal(d.active('scene'),false);assert.equal(d.state.orders[0].status,'demo_pending');
});
test('returned order and state objects cannot mutate the store',()=>{const d=createStore(memory());d.signIn();const o=d.createOrder('scene');o.amountFils=1;d.state.orders[0].status='demo_paid';assert.equal(d.state.orders[0].amountFils,45000);assert.equal(d.state.orders[0].status,'demo_pending');});
test('invalid inputs fail without altering the existing demo',()=>{const {d}=enrolled();const before=JSON.stringify(d.state);assert.throws(()=>d.completeLesson('scene',1.5));assert.throws(()=>d.submitAssignment('scene','',''));assert.throws(()=>d.pay('unknown','success'));assert.equal(JSON.stringify(d.state),before);});
test('corrupted saved structures fall back without breaking the page',()=>{const s=memory();s.setItem('noura-enrollment-demo-v1','{"version":1,"orders":[],"enrollments":[],"assignments":[],"profile":{"name":"a"},"progress":null}');const d=createStore(s);assert.equal(d.loadError,true);assert.equal(d.state.signedIn,false);d.signIn();assert.equal(d.state.signedIn,true);});
test('search supports Arabic diacritics, hamza, mixed case and English terms',()=>{const e=createEngine(data);assert.equal(normalize('إِعادَة الْكِتَابَة'),'اعاده الكتابه');assert.ok(e.search('الْحِوَار').some(e=>e.id==='dialogue'));assert.ok(e.search('LOGLINE').some(e=>e.id==='logline'));assert.equal(e.search('بس يا بحر')[0].id,'sea');assert.equal(e.search('شيءغيرموجودتماما').length,0);});
test('search filters compose, and each regional collection contains verified records',()=>{const e=createEngine(data);for(const r of ['عالمي','عربي','كويتي']){const found=e.search('',{type:'work',region:r});assert.ok(found.length>=2);assert.ok(found.every(w=>w.region===r));}assert.ok(e.search('',{group:'الشخصيات',level:'مبتدئ'}).every(g=>g.group==='الشخصيات'&&g.level==='مبتدئ'));assert.equal(e.search('',{saved:true},['guide:scene']).length,1);});
test('research notes, bookmarks, read status and template fields survive export and import',()=>{const e=createEngine(data),s=e.createStore(memory());s.toggle('guide:scene');s.toggle('guide:scene','read');s.note('guide:scene','ملاحظة <script> وليست HTML');s.template('scene',{place:'غرفة — ليل',hero:'مريم',unknown:'ignored'});const imported=e.createStore(memory());imported.import(JSON.parse(JSON.stringify(s.state)));assert.equal(imported.state.notes['guide:scene'].text,'ملاحظة <script> وليست HTML');assert.equal(imported.state.templates.scene.place,'غرفة — ليل');assert.equal(imported.state.templates.scene.unknown,undefined);assert.deepEqual(imported.state.read,['guide:scene']);assert.throws(()=>s.note('not-real','note'));});
test('reference storage failure preserves existing entries',()=>{const m=memory(),s=createEngine(data).createStore(m);s.note('guide:scene','سابق');m.setItem=()=>{throw Error('quota');};assert.throws(()=>s.note('guide:scene','جديد'));assert.equal(s.state.notes['guide:scene'].text,'سابق');});
test('all reference links, relationships and template references are complete',()=>{
 assert.equal(data.guides.length,24);assert.equal(data.works.length,8);assert.equal(data.terms.length,16);assert.equal(data.templates.length,6);
 const e=createEngine(data);assert.equal(new Set(e.entries.map(x=>x.key)).size,e.entries.length);
 for(const s of Object.values(data.sources))assert.equal(new URL(s.url).protocol,'https:');
 for(const g of data.guides){assert.ok(g.body&&g.example&&g.exercise&&g.steps.length===3);for(const w of g.works)assert.ok(data.works.some(x=>x.id===w));for(const r of g.refs)assert.ok(data.sources[r]);}
 for(const w of data.works){assert.ok(data.sources[w.ref]);assert.equal(w.watch.length,3);for(const g of w.guides)assert.ok(data.guides.some(x=>x.id===g));}
 for(const t of [...data.terms,...data.templates])assert.ok(data.guides.some(g=>g.id===t.guide));
});
