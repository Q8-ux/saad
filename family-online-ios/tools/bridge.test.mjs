import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const code=await readFile('Sources/WritingStudio/Resources/native-bridge.js','utf8');
function fixture(origin='https://q8-ux.github.io',pathname='/saad/family-online-studio/'){
 const messages=[],listeners={},realURL=URL;
 class Anchor{hasAttribute(key){return key==='download';}click(){throw Error('Export not intercepted');}}
 const track={stopped:false,stop(){this.stopped=true;}};
 const context={Blob,Uint8Array,Promise,setTimeout,crypto:webcrypto,fetch,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),
 URL:{createObjectURL:blob=>realURL.createObjectURL(blob),revokeObjectURL:url=>realURL.revokeObjectURL(url)},
 location:{origin,pathname},webkit:{messageHandlers:{studioNative:{postMessage:value=>messages.push(value)}}},
 HTMLAnchorElement:Anchor,Element:Anchor,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track]})}},
 document:{fonts:{ready:Promise.resolve()},addEventListener:(name,fn)=>listeners[name]=fn},
 requestAnimationFrame:fn=>fn(),alert:text=>{throw Error(text);}};
 context.window=context;context.top=context;
 return {sandbox:vm.createContext(context),context,messages,track};
}
for(const [origin,path] of [['https://evil.example','/saad/family-online-studio/'],['https://q8-ux.github.io','/saad/other/']]){
 const f=fixture(origin,path);vm.runInContext(code,f.sandbox);assert.equal(f.context.__foIOSInstalled,undefined);
}
const f=fixture();vm.runInContext(code,f.sandbox);assert.equal(f.context.__foIOSInstalled,true);
const bytes=Uint8Array.from({length:70001},(_,i)=>i%251);f.context.testBlob=new Blob([bytes]);
vm.runInContext("const a=new HTMLAnchorElement();a.href=URL.createObjectURL(testBlob);a.download='نص.json';a.click();URL.revokeObjectURL(a.href)",f.sandbox);
const deadline=Date.now()+5000;while(!f.messages.some(x=>x.type==='export-end')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));
const chunks=f.messages.filter(x=>x.type==='export-chunk');assert.equal(chunks.length,3);
assert.deepEqual(chunks.map(x=>x.sequence),[0,1,2]);assert.deepEqual(Buffer.concat(chunks.map(x=>Buffer.from(x.data,'base64'))),Buffer.from(bytes));
await vm.runInContext('navigator.mediaDevices.getUserMedia({audio:true})',f.sandbox);
vm.runInContext("__FO_IOS_PAUSE__();speechSynthesis.speak(new SpeechSynthesisUtterance('مرحبًا'));window.print()",f.sandbox);
await new Promise(r=>setTimeout(r,5));assert.ok(f.track.stopped);
assert.ok(f.messages.some(x=>x.type==='tts-speak'&&x.text==='مرحبًا'));assert.ok(f.messages.some(x=>x.type==='print'));
console.log('iOS bridge origin, 70001-byte export, background microphone, speech and print protocol passed (Node VM; no device test)');
