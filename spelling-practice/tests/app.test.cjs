const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../core.js');
const M=require('../motion.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');

function setup(saved=null,failStorage=false,hash='',recordMock=null){
  class Element{
    constructor(id){this.id=id;this.events={};this.attributes={};this.dataset={};this.children=[];this.checked=false;this.hidden=false;this._html='';const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)};}
    addEventListener(t,cb){(this.events[t]??=[]).push(cb)}
    fire(type,props={}){const e={type,button:0,pointerId:1,pointerType:'touch',clientX:50,clientY:100,pressure:.5,preventDefault(){},...props};for(const cb of this.events[type]??[])cb(e)}
    scrollIntoView(){this.scrolled=true}focus(){this.focused=true}removeAttribute(k){delete this.attributes[k]}querySelectorAll(){return []}setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]??null}appendChild(c){this.children.push(c)}
    set innerHTML(v){this._html=v;this.children=[]}get innerHTML(){return this._html}
    getBoundingClientRect(){return this.rect??{left:10,top:20,width:340,height:397.8}}
    setPointerCapture(id){this.capture=id}hasPointerCapture(id){return this.capture===id}releasePointerCapture(){this.capture=null}
  }
  const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const colors=C.COLORS.map(color=>{const e=new Element();e.dataset.color=color;return e});
  const drawOps=[];let operation='source-over';const ctx={save(){},restore(){},setTransform(){},clearRect(){},beginPath(){},arc(){},moveTo(){},lineTo(){},fill(){drawOps.push(operation)},stroke(){drawOps.push(operation)},set globalCompositeOperation(v){operation=v}};
  nodes.ink.getContext=()=>ctx;
  const motionOps=[];const motionContext={save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},fillText(){},translate(){},setLineDash(){},beginPath(){},arc(){},moveTo(){},lineTo(){},stroke(){motionOps.push('stroke')},fill(){motionOps.push('fill')},drawImage(){motionOps.push('picture')}};
  nodes.motionCanvas.getContext=()=>motionContext;
  nodes.wordImage.complete=true;nodes.wordImage.naturalWidth=320;nodes.wordImage.naturalHeight=200;nodes.wordImage.decode=()=>Promise.resolve();
  const player=nodes.pronunciation;player.currentTime=0;player.paused=true;player.plays=0;player.loads=0;player.pause=()=>{player.paused=true;player.fire('pause')};player.load=()=>{player.loads++};player.play=()=>{player.plays++;player.paused=false;player.fire('playing');return Promise.resolve()};
  const store=new Map(saved?[[C.STORAGE_KEY,saved]]:[]);
  const documentEvents={};
  const document={hidden:false,getElementById(id){assert.ok(nodes[id],`HTML node missing: ${id}`);return nodes[id]},querySelectorAll:()=>colors,createElement:()=>new Element(),addEventListener(t,f){documentEvents[t]=f}};
  const frames=new Map();let frameId=0,now=0;
  const location={hash};const events={};const window={SpellingCore:C,SpellingMotion:M,devicePixelRatio:2,addEventListener(t,f){events[t]=f},print(){window.printed=true}};
  const audioContexts=[];
  if(recordMock){nodes.motionCanvas.captureStream=()=>{};window.AudioContext=class{constructor(){this.state='running';audioContexts.push(this)}resume(){return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}};window.SpellingMotion={...M,recordingFormat:()=>({mimeType:'video/webm',extension:'webm'}),recordLesson:recordMock};}
  const localStorage={getItem:key=>{if(failStorage)throw Error('blocked');return store.get(key)??null},setItem:(key,value)=>{if(failStorage)throw Error('quota');store.set(key,value)}};
  const context={window,document,location,history:{replaceState(a,b,h){location.hash=h}},localStorage,setTimeout:()=>1,clearTimeout(){},console,AbortController,URL,performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(code,context,{filename:'app.js'});
  return {nodes,window,location,events,document,documentEvents,colors,drawOps,motionOps,frames,audioContexts,advance(ms){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));},state:()=>JSON.parse(store.get(C.STORAGE_KEY)||'null'),saved:()=>store.get(C.STORAGE_KEY),store};
}
function draw(app,props={}){app.nodes.ink.fire('pointerdown',props);app.nodes.ink.fire('pointermove',{clientX:100,clientY:160,...props});app.nodes.ink.fire('pointerup',{clientX:110,clientY:170,...props});}

test('finger drawing saves the final position, reloads, and survives resizing',()=>{
  const a=setup();assert.equal(a.nodes.wordTabs.children.length,28);assert.equal(a.nodes.subjectTabs.children.length,5);draw(a);
  const stroke=a.state().pages['hot:trace'][0];assert.equal(stroke.points.length,3);assert.equal(stroke.points.at(-1).x,294.1);
  a.nodes.ink.rect={left:0,top:0,width:700,height:819};a.events.resize();assert.equal(a.nodes.ink.width,1400);assert.deepEqual(a.state().pages['hot:trace'][0],stroke);
  const b=setup(a.saved());assert.equal(b.nodes.wordTitle.textContent,'hot');assert.ok(b.drawOps.length);assert.equal(b.nodes.undo.disabled,false);
});
test('each word and recall mode use independent ink; hiding removes answer tabs',()=>{
  const a=setup();draw(a);a.nodes.next.fire('click');assert.equal(a.nodes.wordTitle.textContent,'sit');assert.equal(a.nodes.clear.disabled,true);draw(a);
  a.nodes.recallMode.fire('click');assert.equal(a.nodes.clear.disabled,true);assert.ok(!a.nodes.guide.innerHTML.includes('stroke-dasharray="0.01 6.3"'));assert.equal(a.nodes.wordTabs.children[0].textContent,'كلمة ١');draw(a);
  assert.equal(a.state().pages['hot:trace'].length,1);assert.equal(a.state().pages['sit:trace'].length,1);assert.equal(a.state().pages['sit:recall'].length,1);
  a.nodes.traceMode.fire('click');assert.equal(a.nodes.clear.disabled,false);a.nodes.previous.fire('click');assert.equal(a.nodes.wordTitle.textContent,'hot');assert.equal(a.nodes.clear.disabled,false);
});
test('clear is reversible, undo removes an individual stroke, and eraser stays saved',()=>{
  const a=setup();draw(a);a.nodes.clear.fire('click');assert.equal(a.state().pages['hot:trace'].length,0);a.nodes.undo.fire('click');assert.equal(a.state().pages['hot:trace'].length,1);
  a.nodes.eraser.fire('click');draw(a);assert.equal(a.state().pages['hot:trace'].at(-1).tool,'eraser');assert.ok(a.drawOps.includes('destination-out'));
  a.nodes.undo.fire('click');assert.equal(a.state().pages['hot:trace'].length,1);
});
test('stylus-only mode rejects fingers; a second pointer cannot hijack a stroke',()=>{
  const a=setup();a.nodes.penOnly.checked=true;draw(a);assert.equal(a.state(),null);
  a.nodes.ink.fire('pointerdown',{pointerId:5,pointerType:'pen',pressure:.8});a.nodes.ink.fire('pointerdown',{pointerId:7});a.nodes.ink.fire('pointermove',{pointerId:7,clientX:250});a.nodes.ink.fire('pointercancel',{pointerId:5});
  assert.equal(a.state().pages['hot:trace'].length,1);assert.equal(a.state().pages['hot:trace'][0].points.length,1);assert.equal(a.state().pages['hot:trace'][0].points[0].p,.8);
});
test('an empty coalesced-events list still records moves',()=>{
  const a=setup();a.nodes.ink.fire('pointerdown');a.nodes.ink.fire('pointermove',{clientX:100,getCoalescedEvents:()=>[]});a.nodes.ink.fire('pointerup');assert.ok(a.state().pages['hot:trace'][0].points.length>=2);
});
test('blocked/corrupt storage and malformed links do not prevent training',()=>{
  const a=setup(null,true,'#%broken');draw(a);assert.ok(a.drawOps.length);assert.ok(a.nodes.saveState.textContent.includes('تعذّر'));
  const b=setup('{bad');assert.equal(b.nodes.wordTitle.textContent,'hot');draw(b);assert.equal(b.state().version,1);
});
test('subject navigation stops at boundaries and printing covers all words or one subject',()=>{
  const a=setup();assert.equal(a.nodes.previous.disabled,true);a.nodes.complete.fire('click');assert.equal(a.state().completed.hot,true);assert.equal(a.nodes.complete.attributes['aria-pressed'],'true');
  a.nodes.wordTabs.children[13].fire('click');assert.equal(a.nodes.wordTitle.textContent,'wash');assert.equal(a.nodes.next.disabled,false);assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/wash.mp3?v=2');
  a.nodes.wordTabs.children[27].fire('click');assert.equal(a.nodes.wordTitle.textContent,'energy');assert.equal(a.nodes.next.disabled,true);
  a.nodes.printAll.fire('click');assert.equal(a.window.printed,true);assert.equal((a.nodes.printArea.innerHTML.match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,59);
  a.nodes.printSubject.fire('click');assert.equal((a.nodes.printArea.innerHTML.match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,28);
});
test('bundled MP3 plays on the tap without speech synthesis; repeat restarts it',()=>{
  const a=setup();const player=a.nodes.pronunciation;assert.equal('speechSynthesis'in a.window,false);assert.equal(player.getAttribute('src'),'audio/hot.mp3?v=2');
  a.nodes.listen.fire('click');assert.equal(player.plays,1);assert.equal(player.paused,false);assert.equal(a.nodes.listenLabel.textContent,'أسمع وأتعلّم');
  player.currentTime=.5;a.nodes.listen.fire('click');assert.equal(player.plays,2);assert.equal(player.currentTime,0);
  player.fire('ended');assert.equal(a.nodes.listenLabel.textContent,'اسمع الكلمة');
});
test('navigating stops old audio and selects the correct clip in recall mode',()=>{
  const a=setup();a.nodes.listen.fire('click');a.nodes.next.fire('click');assert.equal(a.nodes.pronunciation.paused,true);assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/sit.mp3?v=2');
  a.nodes.recallMode.fire('click');a.nodes.listen.fire('click');assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/sit.mp3?v=2');assert.equal(a.nodes.wordTitle.textContent,'أكتب من الذاكرة');
});
test('blocked playback exposes native controls and stale rejections do not affect another word',async()=>{
  const a=setup();a.nodes.pronunciation.play=()=>Promise.reject(Error('blocked'));a.nodes.listen.fire('click');await Promise.resolve();assert.equal(a.nodes.pronunciation.hidden,false);assert.ok(a.nodes.toast.textContent.includes('مشغّل الصوت'));
  const b=setup();let reject;b.nodes.pronunciation.play=()=>new Promise((_,r)=>{reject=r});b.nodes.pronunciation.hidden=true;b.nodes.listen.fire('click');b.nodes.next.fire('click');reject(Error('old'));await Promise.resolve();assert.equal(b.nodes.pronunciation.hidden,true);
});
test('subject switches select words and audio from the photographed columns',()=>{
  const a=setup();draw(a);a.nodes.subjectTabs.children[1].fire('click');assert.equal(a.nodes.wordTitle.textContent,'creeper');assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/creeper.mp3?v=2');assert.equal(a.nodes.previous.disabled,true);assert.equal(a.nodes.wordTabs.children.length,14);
  a.nodes.next.fire('click');assert.equal(a.nodes.wordTitle.textContent,'climber');
  a.nodes.subjectTabs.children[2].fire('click');assert.equal(a.nodes.wordTitle.textContent,'apple');a.nodes.wordTabs.children[7].fire('click');assert.equal(a.nodes.wordTitle.textContent,'Kuwait');assert.equal(a.nodes.wordTitle.classList.contains('long-word'),true);
  a.nodes.subjectTabs.children[0].fire('click');assert.equal(a.nodes.wordTitle.textContent,'hot');assert.equal(a.nodes.clear.disabled,false);
});
test('water is shared across science and social without losing handwriting',()=>{
  const a=setup();a.nodes.subjectTabs.children[1].fire('click');a.nodes.wordTabs.children[10].fire('click');draw(a);assert.equal(a.nodes.wordTitle.textContent,'water');
  a.nodes.subjectTabs.children[2].fire('click');assert.equal(a.nodes.wordTitle.textContent,'water');assert.equal(a.nodes.clear.disabled,false);assert.equal(a.nodes.navCount.textContent,'١٢ / ١٤');
  assert.equal(a.state().pages['water:trace'].length,1);
});
test('direct links open the corresponding subject and retain the circular avatar',()=>{
  const a=setup(null,false,'#sunlight');assert.equal(a.nodes.wordTitle.textContent,'sunlight');assert.ok(a.nodes.subjectLabel.textContent.includes('الإنجليزي'));assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/sunlight.mp3?v=2');
  assert.ok(html.includes('avatar-v1.png'));assert.ok(html.includes('داخل دائرة'));
});
test('Arabic practice changes language, direction and hint and uses its own audio',()=>{
  const a=setup(null,false,'#ardaras');assert.equal(a.nodes.wordTitle.textContent,'دَرَسَ');assert.equal(a.nodes.wordTitle.lang,'ar');assert.equal(a.nodes.wordTitle.dir,'rtl');assert.ok(a.nodes.writingHint.textContent.includes('اليمين إلى اليسار'));assert.equal(a.nodes.wordTabs.children.length,8);assert.equal(a.nodes.subjectNote.hidden,false);assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/ardaras.mp3?v=2');
  assert.equal(a.nodes.meaning.textContent,'دَ · رَ · سَ');assert.equal((a.nodes.guide.innerHTML.match(/data-diacritic="fatha"/g)||[]).length,6);
  draw(a);a.nodes.recallMode.fire('click');assert.ok(!a.nodes.guide.innerHTML.includes('data-guide="arabic"'));a.nodes.traceMode.fire('click');assert.equal(a.nodes.clear.disabled,false);a.nodes.printSubject.fire('click');assert.equal((a.nodes.printArea.innerHTML.match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,8);
});
test('number pages show and print the digit and English name, and keep their boundaries',()=>{
  const a=setup(null,false,'#numone');assert.equal(a.nodes.wordTitle.textContent,'1 = One');assert.equal(a.nodes.wordTitle.dir,'ltr');assert.equal(a.nodes.wordTabs.children.length,10);assert.equal(a.nodes.previous.disabled,true);assert.equal(a.nodes.subjectNote.hidden,true);
  a.nodes.wordTabs.children[9].fire('click');assert.equal(a.nodes.wordTitle.textContent,'10 = Ten');assert.equal(a.nodes.next.disabled,true);assert.equal(a.nodes.pronunciation.getAttribute('src'),'audio/numten.mp3?v=2');a.nodes.printSubject.fire('click');assert.equal((a.nodes.printArea.innerHTML.match(/class="print-sheet(?: arabic-sheet)?"/g)||[]).length,10);
});


test('illustrated English words open separately, switch pictures and hide them in recall',()=>{
  const a=setup();assert.equal(a.nodes.wordPicture.hidden,true);a.nodes.openPictures.fire('click');
  assert.equal(a.nodes.wordTitle.textContent,'air');assert.equal(a.nodes.wordImage.getAttribute('src'),'pictures/air-v1.webp');assert.equal(a.nodes.wordPicture.hidden,false);assert.ok(a.nodes.subjectLabel.textContent.includes('الإنجليزي'));
  draw(a);a.nodes.next.fire('click');assert.equal(a.nodes.wordTitle.textContent,'leaf');assert.equal(a.nodes.wordImage.getAttribute('src'),'pictures/leaf-v1.webp');assert.equal(a.nodes.clear.disabled,true);
  a.nodes.previous.fire('click');assert.equal(a.nodes.clear.disabled,false);a.nodes.recallMode.fire('click');assert.equal(a.nodes.wordPicture.hidden,true);assert.equal(a.nodes.wordImage.getAttribute('src'),null);
  a.nodes.traceMode.fire('click');assert.equal(a.nodes.wordImage.getAttribute('src'),'pictures/air-v1.webp');
  a.nodes.printPictures.fire('click');assert.equal((a.nodes.printArea.innerHTML.match(/<article /g)||[]).length,14);assert.equal((a.nodes.printArea.innerHTML.match(/<img /g)||[]).length,14);
  a.nodes.subjectTabs.children[3].fire('click');assert.equal(a.nodes.wordPicture.hidden,true);assert.equal(a.nodes.pictureEntry.hidden,true);assert.equal(a.nodes.printPictures.hidden,true);
});
test('first picture print waits for all image decodes and reports a missing image',async()=>{
  const a=setup();let finish;a.nodes.printArea.querySelectorAll=()=>[{decode:()=>new Promise(resolve=>{finish=resolve})}];
  a.nodes.printPictures.fire('click');assert.equal(a.window.printed,undefined);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(a.window.printed,true);
  const b=setup();b.nodes.printArea.querySelectorAll=()=>[{decode:()=>Promise.reject(Error('missing'))}];b.nodes.printPictures.fire('click');await new Promise(resolve=>setImmediate(resolve));assert.equal(b.window.printed,undefined);assert.ok(b.nodes.toast.textContent.includes('تعذّر تحميل إحدى الرسومات'));
});

test('writing animation starts only on request and never writes to saved ink or completion',async()=>{
  const a=setup(null,false,'#garden');draw(a);const saved=a.saved();
  assert.equal(a.frames.size,0);assert.equal(a.nodes.motionPanel.hidden,true);
  a.nodes.motionWatch.fire('click');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.nodes.motionPanel.hidden,false);assert.equal(a.frames.size,1);a.advance(3000);
  assert.ok(a.motionOps.length);assert.ok(a.nodes.motionSeek.value>0);assert.equal(a.saved(),saved);
  a.nodes.motionWatch.fire('click');assert.equal(a.frames.size,0);
  a.nodes.motionSlow.fire('click');assert.equal(a.nodes.motionSlow.attributes['aria-pressed'],'true');
  a.nodes.motionClose.fire('click');assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.motionWatch.focused,true);assert.equal(a.saved(),saved);
});

test('recall, word changes, Arabic and page hiding stop the model and do not reveal the answer',async()=>{
  const a=setup();a.nodes.motionWatch.fire('click');await new Promise(resolve=>setImmediate(resolve));a.advance(1000);
  a.nodes.recallMode.fire('click');assert.equal(a.frames.size,0);assert.equal(a.nodes.wordMotion.hidden,true);assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.motionCanvas.attributes['aria-label'],'نموذج كتابة الكلمة');
  a.nodes.traceMode.fire('click');a.nodes.motionWatch.fire('click');await new Promise(resolve=>setImmediate(resolve));a.nodes.next.fire('click');assert.equal(a.frames.size,0);assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.wordTitle.textContent,'sit');
  a.nodes.motionWatch.fire('click');await new Promise(resolve=>setImmediate(resolve));a.document.hidden=true;a.documentEvents.visibilitychange();assert.equal(a.frames.size,0);assert.equal(a.nodes.motionPanel.hidden,true);
  const b=setup(null,false,'#ardaras');assert.equal(b.nodes.wordMotion.hidden,true);assert.equal(b.nodes.wordTitle.textContent,'دَرَسَ');
});

test('a picture decoding failure from an old word cannot reopen or update another page',async()=>{
  const a=setup(null,false,'#air');let reject;a.nodes.wordImage.complete=false;a.nodes.wordImage.decode=()=>new Promise((resolve,r)=>{reject=r});
  a.nodes.motionWatch.fire('click');a.nodes.next.fire('click');reject(Error('old image'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.nodes.wordTitle.textContent,'leaf');assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.motionStatus.textContent,'');assert.equal(a.frames.size,0);
});

test('navigating during export aborts the old recording and releases its audio context',async()=>{
  let options;
  const a=setup(null,false,'#garden',(canvas,plan,settings)=>{options=settings;return new Promise((resolve,reject)=>settings.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError'))));});
  a.nodes.motionWatch.fire('click');await new Promise(resolve=>setImmediate(resolve));a.nodes.motionVideo.fire('click');await new Promise(resolve=>setImmediate(resolve));
  assert.ok(options);assert.equal(options.audioUrl,'audio/garden.mp3?v=2');assert.equal(a.nodes.motionWatch.disabled,true);
  a.nodes.next.fire('click');await new Promise(resolve=>setImmediate(resolve));assert.equal(options.signal.aborted,true);assert.equal(options.audioContext.state,'closed');assert.equal(a.nodes.motionStatus.textContent,'');assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.motionWatch.disabled,false);
});

test('closing while a picture decode stalls releases audio before recording starts',async()=>{
  const a=setup(null,false,'#air',()=>{throw Error('Recording must not start before image decode')});
  a.nodes.wordImage.complete=false;a.nodes.wordImage.decode=()=>new Promise(()=>{});
  a.nodes.motionWatch.fire('click');a.nodes.motionVideo.fire('click');
  assert.equal(a.audioContexts.length,1);assert.equal(a.audioContexts[0].state,'running');
  a.nodes.motionClose.fire('click');assert.equal(a.audioContexts[0].state,'closed');assert.equal(a.nodes.motionPanel.hidden,true);assert.equal(a.nodes.motionWatch.disabled,false);
});
