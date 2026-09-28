const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {create}=require('../integrations/recorded-audio.js');
class FakeAudio{
 constructor(){this.events=new Map();this.attrs={};this.paused=true;this.readyState=0;this.currentTime=0;this.failure=null;}
 addEventListener(n,f){if(!this.events.has(n))this.events.set(n,new Set());this.events.get(n).add(f);}
 removeEventListener(n,f){this.events.get(n)?.delete(f);}
 emit(n){for(const fn of this.events.get(n)||[])fn();}
 set src(s){this.attrs.src=s;this.readyState=0;this.currentTime=0;}
 getAttribute(n){return this.attrs[n]||null;}
 removeAttribute(n){delete this.attrs[n];}
 metadata(){this.readyState=1;this.emit('loadedmetadata');}
 play(){if(this.failure)return Promise.reject(this.failure);this.paused=false;this.emit('play');this.emit('playing');return Promise.resolve();}
 pause(){const wasPlaying=!this.paused;this.paused=true;if(wasPlaying)this.emit('pause');}
 load(){this.readyState=0;}
}
const track=(start=0,end=100,src='assets/audio/basics.mp3')=>({src,start,end,title:'درس تجريبي'});
function setup(){const audio=new FakeAudio(),states=[];const player=create(audio,{onState:s=>states.push(s)});return{audio,player,states};}

test('recorded playback works without browser speech synthesis and waits for metadata to seek',async()=>{
 const{audio,player,states}=setup();player.setQueue([track(12,35)]);
 const playing=player.play();audio.metadata();assert.equal(await playing,true);
 assert.equal(audio.currentTime,12);assert.equal(audio.paused,false);
 assert.equal(states.at(-1).state,'playing');
 player.stop();assert.equal(audio.paused,true);assert.equal(audio.currentTime,12);
 audio.emit('pause');assert.equal(states.at(-1).state,'idle');
});

test('a passage playlist advances within one recording and stops at the final range',async()=>{
 const{audio,player,states}=setup();player.setQueue([track(10,20),track(40,50)]);audio.metadata();await player.play();
 audio.currentTime=20.1;audio.emit('timeupdate');assert.equal(audio.currentTime,40);assert.equal(audio.paused,false);
 audio.currentTime=50.1;audio.emit('timeupdate');assert.equal(audio.paused,true);assert.equal(states.at(-1).state,'ended');
 await player.play();assert.equal(audio.currentTime,10);assert.equal(audio.paused,false);
});

test('native pause keeps the queue stationary and native replay starts the first clip',async()=>{
 const{audio,player}=setup();player.setQueue([track(10,20),track(40,50)]);audio.metadata();await player.play();
 audio.pause();audio.currentTime=21;audio.emit('timeupdate');assert.equal(audio.currentTime,21);
 await audio.play();audio.emit('timeupdate');assert.equal(audio.currentTime,40);
 audio.currentTime=51;audio.emit('timeupdate');assert.equal(audio.paused,true);
 await audio.play();assert.equal(audio.currentTime,10);assert.equal(audio.paused,false);
});

test('play rejection is actionable, and leaving the page releases the player',async()=>{
 const{audio,player,states}=setup();player.setQueue([track()]);audio.failure={name:'NotAllowedError'};
 assert.equal(await player.play(),false);assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/اضغط زر التشغيل/);
 player.destroy();assert.equal(audio.paused,true);assert.equal(audio.getAttribute('src'),null);
 assert.equal([...audio.events.values()].reduce((n,s)=>n+s.size,0),0);
});

test('all lessons and assistant passages have version-matched local recordings',()=>{
 const base=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(base,'content.js'),'utf8'),box={window:{}};
 vm.runInNewContext(source,box);vm.runInNewContext(fs.readFileSync(path.join(base,'audio-manifest.js'),'utf8'),box);
 const manifest=box.window.ETF_AUDIO;
 assert.equal(manifest.contentSha256,crypto.createHash('sha256').update(source).digest('hex'));
 for(const lesson of box.window.ETF_CONTENT.lessons){const audio=manifest.lessons[lesson.id];
  assert.ok(audio.duration>10);assert.match(audio.src,/^assets\/audio\/[a-z]+\.mp3$/);
  const bytes=fs.readFileSync(path.join(base,audio.src));assert.ok(bytes.length>10000);
  assert.equal(bytes.length,audio.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),audio.sha256);
  let last=0;lesson.sections.forEach((_,i)=>{const c=audio.sections[lesson.id+'-'+i];assert.ok(c.start>=last&&c.end>c.start&&c.end<=audio.duration);last=c.end;});
 }
});
