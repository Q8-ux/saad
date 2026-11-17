import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RealtimeConversation} from '../assets/chunks/studio-realtime.mjs';

function browser(t,{permission,blocked=false,session}={}){
 const names=['navigator','document','RTCPeerConnection','isSecureContext','setTimeout','clearTimeout'];
 const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const calls=[],tracks=[],peers=[],players=[],timers=new Map();let seq=0;
 const stream=()=>{const track={enabled:true,stopped:false,onended:null,stop(){this.stopped=true;}};tracks.push(track);return{getTracks:()=>[track],getAudioTracks:()=>[track]};};
 const mediaDevices={async getUserMedia(constraints){calls.push(constraints);return permission?permission(constraints,stream):stream();}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices}});
 Object.defineProperty(globalThis,'isSecureContext',{configurable:true,value:true});
 globalThis.setTimeout=(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.document={createElement(){const audio={srcObject:null,setAttribute(){},async play(){if(blocked)throw Error('autoplay blocked');},pause(){this.paused=true;},remove(){this.removed=true;}};players.push(audio);return audio;}};
 globalThis.RTCPeerConnection=class{constructor(){this.connectionState='connected';this.dc={readyState:'open',sent:[],send(s){this.sent.push(JSON.parse(s));},close(){this.closed=true;}};peers.push(this);}addTrack(){}createDataChannel(){return this.dc;}async createOffer(){return{sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'};}async setLocalDescription(){}async setRemoteDescription(){this.remote=true;this.dc.onopen?.();}close(){this.closed=true;}};
 const events={states:[],errors:[],transcripts:[],playback:[],ended:0};
 const options={session:session||asyncSession,lookup:async()=>({sources:[]}),onState:s=>events.states.push(s),onError:s=>events.errors.push(s),onTranscript:(...args)=>events.transcripts.push(args),onPlaybackBlocked:s=>events.playback.push(s),onSources(){},onEnded(){events.ended++;}};
 async function asyncSession(){return{sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',maxDurationSeconds:600};}
 t.after(()=>{for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
 return{calls,tracks,peers,players,events,options,stream,timers,fire(delay){for(const [id,timer]of [...timers])if(timer.delay===delay){timers.delete(id);timer.fn();}},unblock(){blocked=false;}};
}
test('microphone starts only from the explicit start action and reaches listening',async t=>{
 const h=browser(t),live=new RealtimeConversation(h.options);assert.equal(h.calls.length,0);await live.start();assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0],{audio:{echoCancellation:true,noiseSuppression:true}});assert.ok(h.events.states.includes('permission'));assert.ok(h.events.states.includes('connecting'));assert.equal(h.events.states.at(-1),'listening');live.stop();assert.ok(h.tracks[0].stopped);
});
test('unsupported Android constraints fall back once to default audio',async t=>{
 let attempts=0;const h=browser(t,{permission(constraints,stream){if(++attempts===1)throw Object.assign(Error('constraint'),{name:'OverconstrainedError'});assert.deepEqual(constraints,{audio:true});return stream();}}),live=new RealtimeConversation(h.options);await live.start();assert.equal(h.calls.length,2);assert.equal(h.events.states.at(-1),'listening');live.stop();
});
test('permission denial and a busy microphone give specific guidance without repeated prompts',async t=>{
 const h=browser(t,{permission(){throw Object.assign(Error('device'),{name:'NotReadableError'});}}),live=new RealtimeConversation(h.options);await live.start();assert.equal(h.calls.length,1);assert.match(h.events.errors[0],/الميكروفون مشغول/u);assert.equal(h.events.states.at(-1),'idle');
 h.calls.length=0;navigator.mediaDevices.getUserMedia=async()=>{h.calls.push({});throw Object.assign(Error('denied'),{name:'NotAllowedError'});};await live.start();assert.equal(h.calls.length,1);assert.match(h.events.errors.at(-1),/أذونات هذا الموقع/u);
});
test('stopping during permission acquisition stops a late stream and never opens a session',async t=>{
 let grant,sessionCalls=0;const h=browser(t,{permission:()=>new Promise(resolve=>grant=resolve),session:async()=>{sessionCalls++;return{sdp:'v=0',maxDurationSeconds:600};}}),live=new RealtimeConversation(h.options),pending=live.start();live.stop();grant(h.stream());await pending;assert.ok(h.tracks[0].stopped);assert.equal(sessionCalls,0);assert.equal(h.peers.length,0);
});
test('mute selected while permission is pending is applied as soon as the microphone opens',async t=>{
 let grant;const h=browser(t,{permission:()=>new Promise(resolve=>grant=resolve)}),live=new RealtimeConversation(h.options),pending=live.start();live.setMuted(true);grant(h.stream());await pending;assert.equal(h.tracks[0].enabled,false);live.setMuted(false);assert.equal(h.tracks[0].enabled,true);live.stop();
});
test('a short mobile network disconnection keeps the microphone and recovers; sustained failure releases it',async t=>{
 const h=browser(t),live=new RealtimeConversation(h.options);await live.start();const pc=h.peers[0];pc.connectionState='disconnected';pc.onconnectionstatechange();assert.equal(h.events.states.at(-1),'reconnecting');assert.equal(pc.closed,undefined);assert.equal(h.tracks[0].stopped,false);pc.connectionState='connected';pc.onconnectionstatechange();h.fire(10000);assert.equal(pc.closed,undefined);assert.equal(h.events.states.at(-1),'listening');pc.connectionState='disconnected';pc.onconnectionstatechange();h.fire(10000);assert.ok(pc.closed);assert.ok(h.tracks[0].stopped);assert.match(h.events.errors.at(-1),/انقطع الاتصال/u);
});
test('blocked playback recovers through the visible play control',async t=>{
 const h=browser(t,{blocked:true}),live=new RealtimeConversation(h.options);await live.start();h.peers[0].ontrack({streams:[h.stream()]});await Promise.resolve();await Promise.resolve();assert.equal(h.events.playback.at(-1),true);h.unblock();await live.resumeAudio();assert.equal(h.events.playback.at(-1),false);live.stop();assert.equal(h.players[0].srcObject,null);
});
test('attachments, transcript events and typed conversation history survive the voice transition',async t=>{
 const h=browser(t),live=new RealtimeConversation({...h.options,history:[{role:'user',content:'السؤال السابق'}],attachments:['نص الملف الحالي']});await live.start();live.attachContext('مرفق إضافي');const dc=h.peers[0].dc;assert.deepEqual(dc.sent.map(event=>event.item.content[0].text),['السؤال السابق','نص الملف الحالي','مرفق إضافي']);dc.onmessage({data:JSON.stringify({type:'conversation.item.input_audio_transcription.completed',item_id:'u1',transcript:'أكمل المشهد'})});dc.onmessage({data:JSON.stringify({type:'response.output_audio_transcript.delta',item_id:'a1',delta:'حاضر'})});assert.equal(h.events.transcripts.length,2);live.stop();
});
test('a rejected voice session releases media and reports the server error accurately',async t=>{
 const h=browser(t,{session:async()=>{throw Error('خدمة الصوت غير متاحة مؤقتًا');}}),live=new RealtimeConversation(h.options);await live.start();assert.ok(h.tracks[0].stopped);assert.ok(h.peers[0].closed);assert.match(h.events.errors.at(-1),/خدمة الصوت غير متاحة/u);
});
test('mobile controls precede attachments, remain scrollable, and the live tab starts the connection',async()=>{
 const [js,css]=await Promise.all(['../assets/chunks/library-assistant-I5KUSPHA.mjs','../assets/library-assistant.css'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));assert.ok(js.indexOf('className:"library-live state-"')<js.indexOf('className:"library-attachments"'));assert.ok(js.indexOf('className:"library-live-actions"')<js.indexOf('className:"library-orb"'));assert.match(js,/r==="live"&&!_&&x&&!fileBusy\)void gt\(\)/);assert.match(css,/\.library-assistant\{overflow-y:auto/);assert.match(js,/studio-realtime.mjs\?v=20261118-voice2/);
});
