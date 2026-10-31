import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {parseSrt,validateRanges,outputCues,srt,proposeClips,recordingFormat,detectContainer,projectData,buildEdl,zipFiles,numeric,dimensions} from '../assets/video-use/core.mjs';

const sources=[{id:'take',name:'تسجيل.mp4',duration:8,width:1920,height:1080,size:100,lastModified:1,cues:[
  {start:1,end:2,text:'جملة عربية'}, {start:4,end:5,text:'Video واضح'}
]}];
test('Arabic SRT survives BOM, multiline cues and output offsets',()=>{
  const cues=parseSrt('\uFEFF1\r\n00:00:01,000 --> 00:00:02,000\r\nنص عربي\r\nواضح\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nVideo صحيح');
  assert.equal(cues[0].text,'نص عربي\nواضح');
  const out=outputCues([{source:'take',start:.8,end:2.2},{source:'take',start:3.8,end:5.2}],[{...sources[0],cues}]);
  assert.ok(Math.abs(out[1].start-1.6)<.0001);
  const rebuilt=parseSrt(srt(out));
  assert.equal(rebuilt[1].text,'Video صحيح');assert.equal(rebuilt[1].start,1.6);
});
test('Invalid cut sources, nonfinite times and out-of-bounds ranges are rejected',()=>{
  for(const range of [{source:'missing',start:0,end:1},{source:'take',start:NaN,end:1},{source:'take',start:0,end:99},{source:'take',start:3,end:2}])assert.throws(()=>validateRanges([range],sources));
});
test('Arabic numerals work and invalid subtitle timestamps fail',()=>{
  assert.equal(numeric('١٢٫٥'),12.5);assert.throws(()=>numeric(''));
  assert.throws(()=>parseSrt('1\n00:61:00,000 --> 00:62:00,000\nخطأ'));
  assert.throws(()=>parseSrt('1\n00:00:02,000 --> 00:00:01,000\nخطأ'));
});
test('Subtitle proposals preserve whole cue boundaries and source limits',()=>{
  const result=proposeClips(sources[0].cues,5.1,1,3);
  assert.equal(result.length,2);assert.equal(result[0].start,.85);assert.ok(result[1].end<=5.1);
  assert.throws(()=>proposeClips([],20));
});
test('Exports keep their real supported format',()=>{
  assert.equal(recordingFormat({isTypeSupported:m=>m==='video/webm'}).extension,'webm');
  assert.equal(recordingFormat({isTypeSupported:m=>m==='video/mp4'}).extension,'mp4');
  assert.equal(recordingFormat({isTypeSupported:()=>false}),null);
  assert.equal(detectContainer(new Uint8Array([0x1a,0x45,0xdf,0xa3])).extension,'webm');
  assert.equal(detectContainer(new Uint8Array([0,0,0,32,102,116,121,112])).extension,'mp4');
  assert.throws(()=>detectContainer(new Uint8Array([0,0,0,0,0,0,0,0])));
});
test('Project data contains metadata but excludes media blobs and URLs',()=>{
  const data=projectData({title:'مقتطف',profile:'noura',work:'courses',aspect:'portrait',quality:'720',sources:[{...sources[0],url:'blob:private',file:{private:true}}],ranges:[{source:'take',start:1,end:3}]});
  assert.ok(!JSON.stringify(data).includes('blob:'));assert.ok(!JSON.stringify(data).includes('private'));
  const edl=buildEdl(data);assert.equal(edl.sources.take,'sources/تسجيل.mp4');assert.equal(edl.caption_case,'natural');assert.equal(edl.total_duration_s,2);
});
test('Original and requested canvases remain even and bounded',()=>{
  assert.deepEqual(dimensions('portrait','720',sources[0]),[720,1280]);
  assert.deepEqual(dimensions('original','1080',{width:640,height:360}),[640,360]);
  assert.deepEqual(dimensions('landscape','1080',sources[0]),[1920,1080]);
});
test('ZIP preserves UTF8 filenames and rejects traversal',async()=>{
  const blob=zipFiles([{name:'تجربة.json',data:'{"نص":"صحيح"}'},{name:'engine/code.py',data:'print("ok")\n'}]);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
  assert.throws(()=>zipFiles([{name:'../outside',data:''}]));
  if(process.env.VIDEO_USE_ZIP_FIXTURE)await writeFile(process.env.VIDEO_USE_ZIP_FIXTURE,bytes);
});
