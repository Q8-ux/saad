const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root=__dirname;
const engine=require(path.join(root,'engine.js'));
for(const name of ['index.html','app.js','engine.js','styles.css','assets/episode.json','assets/timeline.json','assets/episode.mp3','assets/Cairo.ttf','assets/khawarizmiat-script.pdf','assets/khawarizmiat-script.docx']){
  assert(fs.statSync(path.join(root,name)).size>0,name);
}
for(const name of ['app.js','engine.js'])execFileSync(process.execPath,['--check',path.join(root,name)]);
const ep=JSON.parse(fs.readFileSync(path.join(root,'assets/episode.json'),'utf8'));
const timeline=JSON.parse(fs.readFileSync(path.join(root,'assets/timeline.json'),'utf8'));
assert.equal(ep.duration,300);assert.equal(ep.scenes.length,10);
assert.equal(ep.scenes[0].start,0);assert.equal(ep.scenes.at(-1).end,300);
ep.scenes.forEach((s,i)=>{assert(s.end>s.start);if(i)assert.equal(s.start,ep.scenes[i-1].end);});
let end=0;
for(const t of timeline){assert(t.start>=end-.01);assert(t.end>t.start&&t.end<=300);end=t.end;assert(ep.scenes.some(s=>s.id===t.scene&&t.start>=s.start&&t.end<=s.end));}
const scripted=ep.scenes.flatMap(s=>s.lines);
for(const line of scripted){assert.equal(timeline.filter(t=>t.sourceId===line.id).map(t=>t.text).join(' '),line.text);}
assert.equal(engine.checkPuzzle(['record','edit','publish']),true);
assert.equal(engine.checkPuzzle(['publish','record','edit']),false);
assert.deepEqual(engine.feedOrder('publish'),['accusation','context']);
assert.deepEqual(engine.feedOrder('context'),['context','accusation']);
let state=engine.defaultState();state.choice='publish';assert.equal(engine.rankClips(state)[0].id,'s3');
state=engine.defaultState();state.visits=2;assert(engine.rankClips(state)[0].tags.includes('knocks'));
const memory={value:null,getItem(){return this.value},setItem(k,v){this.value=v}};
state.choice='context';state.reveal=100;engine.saveState(memory,state);assert.equal(engine.loadState(memory).choice,'context');
const corrupt=engine.sanitizeState({position:999,likes:['s3','s3','garbage'],watched:{s7:Infinity}});
assert.equal(corrupt.position,300);assert.deepEqual(corrupt.likes,['s3']);
console.log('Verified ten contiguous scenes, all dialogue words, caption timings, saved choices, changed feed order, puzzle and replay recommendations.');
