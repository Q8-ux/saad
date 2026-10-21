const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const M=require('../motion.js');

function context(){return {save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},fillText(){},translate(){},setLineDash(){},beginPath(){},arc(){},moveTo(){},lineTo(){},stroke(){},fill(){},drawImage(){}};}

test('every English and number model fits the separate lesson canvas; Arabic remains joined in its original guide',()=>{
  let count=0;
  for(const word of C.WORDS){
    const plan=M.buildPlan(word);
    if(word.lang==='ar'){assert.equal(plan,null);continue;}
    count++;assert.ok(plan.length>0);assert.equal(plan.title,word.trace||word.word);
    assert.ok(plan.duration>=6&&plan.duration<=16);
    for(const stroke of plan.strokes){
      assert.ok(stroke.length>0);
      for(const p of stroke.points||[stroke]){assert.ok(Number.isFinite(p.x)&&p.x>=0&&p.x<=M.WIDTH,word.id);assert.ok(Number.isFinite(p.y)&&p.y>=0&&p.y<680,word.id);}
    }
  }
  assert.equal(count,51);
});

test('curves retain exact endpoints and malformed or unsupported path commands fail closed',()=>{
  const curves=M.samplePath('M2 4C8 12 17 -3 22 8H30V40L44 50');
  assert.deepEqual(curves[0][0],{x:2,y:4});assert.deepEqual(curves[0].at(-1),{x:44,y:50});
  assert.ok(curves[0].some(p=>p.x===22&&p.y===8));
  assert.throws(()=>M.samplePath('M1 2Q3 4 5 6'));assert.throws(()=>M.samplePath('M1'));
  const sit=M.buildPlan(C.WORDS.find(w=>w.id==='sit'));assert.equal(sit.strokes.filter(s=>s.kind==='dot').length,1);
});

test('lead-in and final hold show a complete model without changing a learner record',()=>{
  assert.equal(M.progressAt(0,8),0);assert.equal(M.progressAt(.5,8),0);assert.equal(M.progressAt(8,8),1);assert.equal(M.progressAt(99,8),1);
  const word=C.WORDS.find(w=>w.id==='garden'),before=JSON.stringify(word),plan=M.buildPlan(word);
  for(const progress of [0,.25,.75,1])M.drawFrame(context(),plan,progress);
  assert.equal(JSON.stringify(word),before);assert.equal(plan.illustrated,true);
});

test('recording chooses a real MIME container and includes only the bundled word audio',async()=>{
  const keys=['AudioContext','MediaRecorder','fetch','document','requestAnimationFrame','cancelAnimationFrame'];
  const previous=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
  let stoppedTracks=0,closed=0,starts=0,stoppedSources=0,automatic=true;
  const urls=[];
  class Audio{
    constructor(){this.currentTime=0;this.state='running';}
    resume(){return Promise.resolve();}
    decodeAudioData(){return Promise.resolve({duration:.8});}
    createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{stop(){stoppedTracks++;}}]}};}
    createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){stoppedSources++;}};}
    close(){closed++;this.state='closed';return Promise.resolve();}
  }
  class Recorder{
    static isTypeSupported(type){return type==='video/webm';}
    constructor(stream,{mimeType}){this.mimeType=mimeType;this.state='inactive';assert.equal(stream.getTracks().length,2);}
    start(){this.state='recording';}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['synthetic frames plus audio'])});this.onstop();});}
  }
  const canvas={getContext:()=>context(),captureStream:()=>{const tracks=[{stop(){stoppedTracks++;}}];return {getTracks:()=>tracks,addTrack:track=>tracks.push(track)};}};
  try{
    globalThis.AudioContext=Audio;globalThis.MediaRecorder=Recorder;
    globalThis.document=new EventTarget();document.hidden=false;
    globalThis.fetch=async(url,options)=>{urls.push(url);assert.equal(options.credentials,'same-origin');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
    globalThis.requestAnimationFrame=cb=>automatic?setTimeout(()=>cb(performance.now()+40000),0):0;globalThis.cancelAnimationFrame=clearTimeout;
    const plan=M.buildPlan(C.WORDS[0]);
    const result=await M.recordLesson(canvas,plan,{audioUrl:'audio/hot.mp3?v=2'});
    assert.equal(result.extension,'webm');assert.ok(result.blob.size);assert.deepEqual(urls,['audio/hot.mp3?v=2']);
    assert.equal(starts,2);assert.equal(stoppedSources,2);assert.equal(stoppedTracks,2);assert.equal(closed,1);
    automatic=false;
    const controller=new AbortController();const pending=M.recordLesson(canvas,plan,{audioUrl:'audio/hot.mp3?v=2',signal:controller.signal});
    await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(pending,{name:'AbortError'});
    assert.equal(stoppedTracks,4);assert.equal(closed,2);
    const hidden=M.recordLesson(canvas,plan,{audioUrl:'audio/hot.mp3?v=2'});await new Promise(resolve=>setImmediate(resolve));document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));await assert.rejects(hidden,/hidden/);
    assert.equal(stoppedTracks,6);assert.equal(closed,3);
    await assert.rejects(M.recordLesson(canvas,plan,{audioUrl:'https://outside.example/voice.mp3'}),/audio/);assert.equal(urls.length,3);
  }finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
