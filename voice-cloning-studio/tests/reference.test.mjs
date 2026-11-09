import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceBounds,validateReferenceFile,maxReferenceBytes} from '../reference.mjs';
test('reference selection preserves the chosen 20–50 second interval and rejects invalid bounds',()=>{
 assert.deepEqual(referenceBounds(65,20,50),{start:20,end:50,length:30});
 for(const [duration,start,end] of [[65,0,9],[65,0,31],[65,50,70],[65,30,20],[301,0,20],[Infinity,0,20]])assert.throws(()=>referenceBounds(duration,start,end));
});
test('local reference rejects empty, oversized and non-media inputs',()=>{
 assert.doesNotThrow(()=>validateReferenceFile({name:'phone.mp4',type:'video/mp4',size:500000}));
 assert.doesNotThrow(()=>validateReferenceFile({name:'phone.m4a',type:'',size:500000}));
 for(const file of [{size:0,type:'audio/wav'}, {size:maxReferenceBytes+1,type:'video/mp4'}, {size:100,name:'source.html',type:'text/html'}])assert.throws(()=>validateReferenceFile(file));
});
