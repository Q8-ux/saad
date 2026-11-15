import test from 'node:test';
import assert from 'node:assert/strict';
import {BEATS,validateBeats,reviewEpisode,reviewLastLine} from './barcode-dialogue-review.mjs';

const ranges=[[1,1],...Array.from({length:14},(_,i)=>[i+2,i+2])];
test('fifteen beats cover every scene in order',()=>{
 assert.equal(BEATS.length,15);
 assert.equal(validateBeats(ranges,15),true);
 assert.throws(()=>validateBeats(ranges.slice(0,14),15),/fifteen/);
});
test('script doctor never modifies the input manuscript',()=>{
 const scenes=Array.from({length:15},(_,i)=>({
  number:i+1,events:[
   {type:'dialogue',speaker:'سعود',text:'أرسلت الأوراق؟'},
   {type:'dialogue',speaker:'عثمان',text:'إي، أرسلتها لأحمد'},
  ]
 }));
 const before=JSON.stringify(scenes);
 const result=reviewEpisode({workId:'barcode',episode:1,scenes,beatRanges:ranges});
 assert.equal(JSON.stringify(scenes),before);
 assert.equal(result.manuscriptChanged,false);
 assert.equal(result.beatMap.length,15);
 assert.equal(result.sceneCount,15);
});
test('refuses cross-project manuscripts',()=>{
 assert.throws(()=>reviewEpisode({workId:'outside-story',episode:1,scenes:[{number:1,events:[]}],beatRanges:ranges}),/Barcode/);
});
test('last line is editorial heuristic not an AI verdict',()=>{
 const result=reviewLastLine([{type:'dialogue',speaker:'الأب',text:'هذي أمانة مو ملكنا'}],{theme:'أمانة'});
 assert.equal(result.heuristic,true);
 assert.ok(result.score>=0);
});
