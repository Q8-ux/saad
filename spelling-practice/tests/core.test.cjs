const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const fs=require('node:fs');
const path=require('node:path');

test('all 42 photographed entries are covered by 41 distinct word pages',()=>{
  const columns=[
    ['hot','sit','ant','garden','go','bag','cry','down','left','play','kind','read','sleep','wash'],
    ['creeper','climber','buds','energy','grow','plants','air','animals','sunlight','soil','water','flower','leaf','healthy'],
    ['apple','orange','carrot','potato','pilot','nurse','chef','Kuwait','parents','children','soap','water','comb','learn']
  ];
  C.SUBJECTS.slice(0,3).forEach((s,i)=>assert.deepEqual(C.subjectWords(s.id).slice(0,14).map(w=>w.word),columns[i]));
  assert.equal(C.WORDS.length,59);assert.equal(new Set(C.WORDS.map(w=>w.id)).size,59);
  assert.equal(C.SUBJECTS.slice(0,3).reduce((n,s)=>n+Math.min(s.ids.length,14),0),42);
  assert.deepEqual(C.WORDS.slice(0,7).map(w=>w.id),['hot','sit','ant','go','bag','cry','garden']);
  for(const w of C.WORDS)if(w.lang!=='ar')for(const letter of w.trace||w.word)assert.ok(C.GLYPHS[letter]);
});
test('center-line dot guides fit every word and disappear in recall mode',()=>{
  for(const w of C.WORDS){
    const word=w.trace||w.word;
    const l=C.wordLayout(word);assert.ok(l.x>=59.999);assert.ok(l.x+l.width*l.scale<=940.001);
    const trace=C.sheetSvg(word);assert.equal((trace.match(w.lang==='ar'?/data-guide="arabic"/g:/stroke-dasharray="0.01 6.3"/g)||[]).length,2);
    assert.equal((C.sheetSvg(word,'recall').match(/stroke-dasharray="0.01 6.3"/g)||[]).length,0);
  }
  assert.throws(()=>C.wordLayout('<script>'));
});
test('touch/stylus coordinates stay aligned when the board resizes',()=>{
  const wide=C.pointerPoint({clientX:510,clientY:605,pointerType:'touch'}, {left:10,top:20,width:1000,height:1170});
  const narrow=C.pointerPoint({clientX:180,clientY:218.9,pointerType:'touch'}, {left:10,top:20,width:340,height:397.8});
  assert.equal(wide.x,500);assert.equal(wide.y,585);assert.equal(narrow.x,500);assert.equal(narrow.y,585);
  const outside=C.pointerPoint({clientX:-100,clientY:9999,pointerType:'pen',pressure:.8}, {left:0,top:0,width:340,height:397.8});
  assert.deepEqual(outside,{x:0,y:1170,p:.8});
});
test('restored strokes are bounded, validated and kept separate by word and mode',()=>{
  const good={tool:'pen',color:C.COLORS[1],width:9,points:[{x:12,y:24,p:.7}]};
  const raw={version:1,index:99,color:'javascript:bad',mode:'recall',completed:{hot:true,sit:'true',unlisted:true},pages:{'hot:trace':[good], 'hot:recall':[{tool:'eraser',color:'bad',width:200,points:[{x:-5,y:9999,p:5},null,{x:'bad',y:2}]}], 'unlisted:trace':[good]}};
  const s=C.normalizeState(raw);assert.equal(s.index,58);assert.equal(s.subject,'numbers');assert.equal(s.mode,'recall');assert.equal(s.color,C.COLORS[0]);assert.deepEqual(s.completed,{hot:true});
  assert.deepEqual(s.pages['hot:trace'][0],good);assert.equal(s.pages['hot:recall'][0].width,50);assert.deepEqual(s.pages['hot:recall'][0].points,[{x:0,y:1170,p:1}]);assert.equal(s.pages['unlisted:trace'],undefined);
  assert.deepEqual(C.normalizeState(null),C.emptyState());
});
test('eraser removes ink on its own layer; no background is painted',()=>{
  let operation='source-over';const operations=[];
  const ctx={save(){},restore(){},beginPath(){},arc(){},fill(){operations.push(operation)},moveTo(){},lineTo(){},stroke(){operations.push(operation)},set globalCompositeOperation(v){operation=v}};
  C.drawStroke(ctx,{tool:'eraser',color:C.COLORS[0],width:30,points:[{x:4,y:6,p:.5},{x:9,y:10,p:.6}]});
  C.drawStroke(ctx,{tool:'pen',color:C.COLORS[0],width:9,points:[{x:4,y:6,p:.5}]});
  assert.deepEqual(operations,['destination-out','source-over']);
});
test('printing produces one page per distinct practice and the selected subject count',()=>{
  const all=C.printMarkup(C.WORDS);assert.equal((all.match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,59);assert.equal((all.match(/<h1(?:[^>]*)>/g)||[]).length,59);
  assert.equal((C.printMarkup([C.WORDS[3]]).match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,1);
  assert.ok(all.includes('<h1>garden</h1>'));assert.ok(all.includes('<h1>Kuwait</h1>'));assert.ok(all.includes('<h1>down</h1>'));
  assert.equal((all.match(/<h1>water<\/h1>/g)||[]).length,1);
  for(const s of C.SUBJECTS)assert.equal((C.printMarkup(C.subjectWords(s.id)).match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,s.ids.length);
});
test('every word has a bundled audio file and the publication manifest matches',()=>{
  const audio=path.join(__dirname,'../audio');const manifest=JSON.parse(fs.readFileSync(path.join(audio,'manifest.json'),'utf8'));
  assert.deepEqual(manifest,C.WORDS.map(w=>w.id));
  for(const id of manifest)assert.ok(fs.statSync(path.join(audio,id+'.mp3')).size>1000,id);
});
test('saved pages and completion for the original seven words survive expansion',()=>{
  const ids=['hot','sit','ant','go','bag','cry','garden'];
  for(const [index,id] of ids.entries()){
    const points=[{x:20,y:30,p:.5}],stroke={tool:'pen',color:C.COLORS[0],width:9,points};
    const s=C.normalizeState({version:1,index,completed:{[id]:true},pages:{[id+':trace']:[stroke]}});
    assert.equal(C.WORDS[s.index].id,id);assert.equal(s.subject,'english');assert.equal(s.completed[id],true);assert.deepEqual(s.pages[id+':trace'][0].points,points);
  }
});
test('Arabic examples preserve all eight three-letter words and fathas',()=>{
  const words=C.subjectWords('arabic');assert.deepEqual(words.map(w=>w.word),['دَرَسَ','صَعَدَ','خَطَرَ','عَطَسَ','شَعَرَ','سَطَعَ','خَدَعَ','زَرَعَ']);
  const guides=require('../arabic-guides.js');
  for(const w of words){
    assert.equal(w.lang,'ar');assert.equal(w.word.replace(/\p{M}/gu,'').length,3);assert.equal((w.word.match(/َ/g)||[]).length,3);
    assert.deepEqual(w.meaning.split(' · '),w.word.match(/.َ/gu));
    const marks=[...guides[w.word].markup.matchAll(/data-diacritic="fatha" d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)"/g)];
    assert.equal(marks.length,3,w.word+' must show all three fathas');
    for(const [,x1,y1,x2,y2] of marks){assert.ok(Number(x2)>Number(x1));assert.ok(Number(y2)<Number(y1),'a fatha rises to the right');}
    const page=C.sheetSvg(w.word);assert.ok(page.includes('direction="rtl"'));assert.equal((page.match(/data-guide="arabic"/g)||[]).length,2);assert.equal((page.match(/data-diacritic="fatha"/g)||[]).length,6);
    assert.equal((C.printMarkup([w]).match(/data-diacritic="fatha"/g)||[]).length,6);assert.ok(!C.sheetSvg(w.word,'recall').includes('data-guide="arabic"'));
  }
});
test('number practice matches the supplied 1–10 names and traces digits too',()=>{
  const words=C.subjectWords('numbers');assert.deepEqual(words.map(w=>w.word),['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten']);
  words.forEach((w,i)=>{assert.equal(w.number,i+1);assert.equal(w.trace,`${i+1} = ${w.word}`);assert.ok(C.sheetSvg(w.trace).includes('stroke-dasharray'));});
});


test('each supplied picture has its own English page, local asset and printed sheet',()=>{
  const expected=['air','leaf','buds','soil','grow','water','plants','flower','climber','creeper','sunlight','animals','healthy','energy'];
  const words=C.pictureWords();assert.deepEqual(words.map(w=>w.id),expected);
  assert.deepEqual(C.subjectWords('english').slice(14).map(w=>w.id),expected);
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../pictures/manifest.json'),'utf8'));
  assert.deepEqual(manifest.pictures.map(p=>p.id),expected);
  for(const [i,w] of words.entries()){
    assert.equal(w.picture,'pictures/'+w.id+'-v1.webp');
    const picture=manifest.pictures[i],bytes=fs.readFileSync(path.join(__dirname,'..',w.picture));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(picture.width>=140&&picture.height>=150);
    const page=C.printMarkup([w]);assert.equal((page.match(/<article /g)||[]).length,1);
    assert.equal((page.match(/<img /g)||[]).length,1);assert.ok(page.includes('src="'+w.picture+'"'));
    assert.ok(page.includes('<h1>'+w.word+'</h1>'));assert.equal((page.match(/stroke-dasharray="0.01 6.3"/g)||[]).length,2);
  }
  const all=C.printMarkup(words);assert.equal((all.match(/<article /g)||[]).length,14);assert.equal((all.match(/<img /g)||[]).length,14);
  assert.equal(C.subjectWords('english').length,28);assert.equal(C.WORDS.length,59);
});
