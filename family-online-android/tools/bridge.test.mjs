import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const messages=[],listeners={},realURL=URL;
class Anchor { constructor(){this.href='';this.download='';}hasAttribute(key){return key==='download';}click(){throw new Error('Native export must intercept blob links');} }
const track={stopped:false,stop(){this.stopped=true;}};
const context={console,Blob,Uint8Array,Promise,setTimeout,clearTimeout,crypto:webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64'),
 URL:{createObjectURL:b=>realURL.createObjectURL(b),revokeObjectURL:u=>realURL.revokeObjectURL(u)},fetch,
 HTMLAnchorElement:Anchor,Element:Anchor,KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
 navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track]})}},
 document:{fonts:{ready:Promise.resolve()},addEventListener:(name,fn)=>{listeners['document-'+name]=fn;},querySelectorAll:()=>[],dispatchEvent:event=>{messages.push({type:'key',key:event.key});}},
 requestAnimationFrame:fn=>fn(),alert:text=>{throw new Error('Unexpected alert: '+text)},
 addEventListener:(name,fn)=>{listeners[name]=fn;},__listeners:listeners,
 nativePort:{postMessage:message=>messages.push(JSON.parse(message)),start(){},close(){}},
};context.window=context;
const sandbox=vm.createContext(context);
vm.runInContext(await readFile('app/src/main/assets/native-bridge.js','utf8'),sandbox);
vm.runInContext("__listeners.message({source:window,origin:'https://evil.example',data:'fo-native-port',ports:[nativePort]})",sandbox);
assert.throws(()=>vm.runInContext("speechSynthesis.cancel()",sandbox),/not ready/);
vm.runInContext("__listeners.message({source:{},origin:'https://q8-ux.github.io',data:'fo-native-port',ports:[nativePort]})",sandbox);
assert.throws(()=>vm.runInContext("speechSynthesis.cancel()",sandbox),/not ready/);
vm.runInContext("__listeners.message({source:window,origin:'https://q8-ux.github.io',data:'fo-native-port',ports:[nativePort]})",sandbox);
vm.runInContext("__listeners.message({source:null,origin:'null',data:'fo-native-port',ports:[nativePort]})",sandbox);
vm.runInContext("speechSynthesis.cancel()",sandbox);
assert.equal(messages.at(-1).type,'tts-stop');
vm.runInContext("__listeners.message({source:null,origin:'',data:'fo-native-port',ports:[nativePort]})",sandbox);
vm.runInContext("__listeners.message({source:null,origin:'https://q8-ux.github.io',data:'fo-native-port',ports:[nativePort]})",sandbox);
const bytes=Uint8Array.from({length:70001},(_,i)=>i%251);context.testBlob=new Blob([bytes],{type:'application/json'});
vm.runInContext("const link=new HTMLAnchorElement();link.href=URL.createObjectURL(testBlob);link.download='نص التجربة.json';link.click();URL.revokeObjectURL(link.href)",sandbox);
const until=Date.now()+5000;while(!messages.some(x=>x.type==='export-end') && Date.now()<until)await new Promise(r=>setTimeout(r,5));
const start=messages.find(x=>x.type==='export-start'),chunks=messages.filter(x=>x.type==='export-chunk'),end=messages.find(x=>x.type==='export-end');
assert.equal(start.name,'نص التجربة.json');assert.equal(start.size,bytes.length);assert.equal(chunks.length,3);assert.ok(end);
assert.deepEqual(chunks.map(x=>x.sequence),[0,1,2]);assert.ok(chunks.every(x=>x.id===start.id));assert.equal(end.id,start.id);
assert.deepEqual(Buffer.concat(chunks.map(x=>Buffer.from(x.data,'base64'))),Buffer.from(bytes));
await vm.runInContext("navigator.mediaDevices.getUserMedia({audio:true})",sandbox);vm.runInContext("__FO_ANDROID_PAUSE__()",sandbox);assert.equal(track.stopped,true);
vm.runInContext("speechSynthesis.speak(new SpeechSynthesisUtterance('مرحبًا'));window.print()",sandbox);
await new Promise(r=>setTimeout(r,5));assert.ok(messages.some(x=>x.type==='tts-speak' && x.text==='مرحبًا'));assert.ok(messages.some(x=>x.type==='print'));
console.log(JSON.stringify({bridge:'passed',checks:['origin gate','70001-byte export survives immediate blob revocation','chunk order and binary integrity','microphone stops in background','native speech and print messages'],deviceTest:false}));
