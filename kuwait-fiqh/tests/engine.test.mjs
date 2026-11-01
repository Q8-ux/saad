import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalize,queryTokens,indexKey,shard,intersect,highlight,excerpt,validLocation,validateBackup} from '../engine.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('data/catalog.json');
test('45 distinct official volumes have complete chunks and source provenance',()=>{
  assert.equal(catalog.volumes.length,45);let total=0;
  for(const [i,v]of catalog.volumes.entries()){
    assert.equal(v.id,i+1);assert.match(v.pdf,/^https:\/\/content\.awqaf\.gov\.kw\/.*\.pdf$/);assert.match(v.doc,/^https:\/\/content\.awqaf\.gov\.kw\/.*\.doc$/);assert.match(v.sha256,/^[0-9a-f]{64}$/);
    let count=0;for(let start=0;start<v.paragraphs;start+=128){const chunk=read(`data/volumes/${String(v.id).padStart(2,'0')}/${String(start/128).padStart(3,'0')}.json`);assert.equal(chunk.start,start);assert.equal(chunk.id,v.id);for(const p of chunk.paragraphs){assert.equal(typeof p.t,'string');assert.equal(typeof p.h,'string');}count+=chunk.paragraphs.length;}
    assert.equal(count,v.paragraphs);total+=count;
  }
  assert.equal(total,catalog.paragraphs);
});
test('vocalized Fitr passages in official volume 23 are retrievable by unvocalized input',()=>{
  const terms=queryTokens('ما حكم زكاة الفطر؟').map(indexKey);
  const lists=terms.map(t=>read(`data/index/${String(shard(t)).padStart(2,'0')}.json`)[t]);
  const found=intersect(lists);assert.ok(found.length>5);assert.ok(found.includes(2303710));
  const source=read('data/volumes/23/028.json').paragraphs[3710%128].t;
  assert.ok(normalize(source).includes('زكاة الفطر'));assert.ok(highlight(source,['زكاة']).includes('<mark>'));assert.ok(normalize(excerpt(source,['زكاة'])).includes('زكاة'));
});
test('hamzas, vocalization, and clitics preserve useful search distinctions',()=>{
  assert.equal(normalize('إِجَارَةٌ'),'اجارة');assert.equal(indexKey('والوقف'),'وقف');assert.equal(indexKey('الوقف'),indexKey('وقف'));assert.ok(queryTokens('شروط الوقف').includes('شروط'));assert.deepEqual(queryTokens('ما هو هذا؟'),[]);
});
test('rendered source and notes cannot inject HTML',()=>{
  assert.equal(highlight('<img src=x onerror=alert(1)>',['img']),'&lt;<mark>img</mark> src=x onerror=alert(1)&gt;');assert.ok(!highlight('<script>الوقف</script>',['الوقف']).includes('<script>'));
});
test('backup validation rejects unrelated formats and out-of-volume locations',()=>{
  assert.throws(()=>validateBackup({format:'wrong',version:1,items:[]},catalog));assert.throws(()=>validateBackup({format:'kuwait-fiqh-notes',version:1,items:[{volume:46,location:0,note:'',saved:true}]},catalog));assert.equal(validLocation(1,-1,catalog),false);assert.equal(validLocation(1,0,catalog),true);
  const data=validateBackup({format:'kuwait-fiqh-notes',version:1,items:[{volume:1,location:0,note:'<script>ملاحظتي</script>',saved:true,secret:'drop'}]},catalog);assert.equal(data[0].secret,undefined);assert.equal(data[0].note,'<script>ملاحظتي</script>');
});
test('each published source chunk is addressable across a boundary and at the final paragraph',()=>{
  for(const v of catalog.volumes){for(const location of [0,127,128,v.paragraphs-1]){const part=read(`data/volumes/${String(v.id).padStart(2,'0')}/${String(Math.floor(location/128)).padStart(3,'0')}.json`);assert.ok(part.paragraphs[location%128].t);}}
});
