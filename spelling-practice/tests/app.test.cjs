const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../core.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');

function setup(saved=null,failStorage=false,hash=''){
  class Element{
    constructor(id){this.id=id;this.events={};this.attributes={};this.dataset={};this.children=[];this.checked=false;this.hidden=false;this._html='';const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)};}
    addEventListener(t,cb){(this.events[t]??=[]).push(cb)}
    fire(type,props={}){const e={type,button:0,pointerId:1,pointerType:'touch',clientX:50,clientY:100,pressure:.5,preventDefault(){},...props};for(const cb of this.events[type]??[])cb(e)}
    setAttribute(k,v){this.attributes[k]=v}appendChild(c){this.children.push(c)}
    set innerHTML(v){this._html=v;this.children=[]}get innerHTML(){return this._html}
    getBoundingClientRect(){return this.rect??{left:10,top:20,width:340,height:397.8}}
    setPointerCapture(id){this.capture=id}hasPointerCapture(id){return this.capture===id}releasePointerCapture(){this.capture=null}
  }
  const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const colors=C.COLORS.map(color=>{const e=new Element();e.dataset.color=color;return e});
  const drawOps=[];let operation='source-over';const ctx={save(){},restore(){},setTransform(){},clearRect(){},beginPath(){},arc(){},moveTo(){},lineTo(){},fill(){drawOps.push(operation)},stroke(){drawOps.push(operation)},set globalCompositeOperation(v){operation=v}};
  nodes.ink.getContext=()=>ctx;
  const store=new Map(saved?[[C.STORAGE_KEY,saved]]:[]);
  const document={hidden:false,getElementById(id){assert.ok(nodes[id],`HTML node missing: ${id}`);return nodes[id]},querySelectorAll:()=>colors,createElement:()=>new Element(),addEventListener(){}};
  const location={hash};const events={};const window={SpellingCore:C,devicePixelRatio:2,addEventListener(t,f){events[t]=f},print(){window.printed=true}};
  const localStorage={getItem:key=>{if(failStorage)throw Error('blocked');return store.get(key)??null},setItem:(key,value)=>{if(failStorage)throw Error('quota');store.set(key,value)}};
  const context={window,document,location,history:{replaceState(a,b,h){location.hash=h}},localStorage,setTimeout:()=>1,clearTimeout(){},console};
  vm.runInNewContext(code,context,{filename:'app.js'});
  return {nodes,window,location,events,colors,drawOps,state:()=>JSON.parse(store.get(C.STORAGE_KEY)||'null'),saved:()=>store.get(C.STORAGE_KEY),store};
}
function draw(app,props={}){app.nodes.ink.fire('pointerdown',props);app.nodes.ink.fire('pointermove',{clientX:100,clientY:160,...props});app.nodes.ink.fire('pointerup',{clientX:110,clientY:170,...props});}

test('finger drawing saves the final position, reloads, and survives resizing',()=>{
  const a=setup();assert.equal(a.nodes.wordTabs.children.length,6);draw(a);
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
test('completed status persists, controls stop at boundaries, six words print',()=>{
  const a=setup();assert.equal(a.nodes.previous.disabled,true);a.nodes.complete.fire('click');assert.equal(a.state().completed.hot,true);assert.equal(a.nodes.complete.attributes['aria-pressed'],'true');
  a.nodes.wordTabs.children[5].fire('click');assert.equal(a.nodes.wordTitle.textContent,'cry');assert.equal(a.nodes.next.disabled,true);
  a.nodes.printAll.fire('click');assert.equal(a.window.printed,true);assert.equal((a.nodes.printArea.innerHTML.match(/class="print-sheet"/g)||[]).length,6);
});
