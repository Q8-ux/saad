import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {buildContentPlan,moneyPrinterTask,preparedVideoProject,contentZip,contentWritingBrief} from '../content-core.mjs';

const input={title:'قصص و روايات',script:'لم يرسل سعد 450 دينارا. ثم سأل شمشون ودليلة عن الخبر.',aspect:'9:16',duration:6,images:[{name:'first.png'},{name:'second.jpg'}]};

test('scene plan preserves Arabic words, numbers and negation without gaps in timing',()=>{
  const plan=buildContentPlan(input);
  assert.equal(plan.script,input.script);
  assert.equal(plan.scenes.map(x=>x.text).join(' '),input.script);
  assert.equal(plan.scenes[0].start,0);assert.equal(plan.scenes[0].end,plan.scenes[1].start);assert.equal(plan.scenes[1].end,6);
  assert.deepEqual([plan.width,plan.height],[720,1280]);
});

test('invalid size, missing media and overlong audio fail before rendering',()=>{
  for(const patch of [{script:''},{title:''},{duration:Infinity},{duration:181},{images:[]},{images:Array(13).fill({name:'x.png'})},{aspect:'__proto__'}])assert.throws(()=>buildContentPlan({...input,...patch}));
});

test('MoneyPrinter batch uses verified field names and real local asset paths',()=>{
  const task=moneyPrinterTask(buildContentPlan(input),'audio/narration.wav',['media/001.png','media/002.jpg']);
  assert.equal(task.video_aspect,'9:16');assert.equal(task.custom_audio_file,'audio/narration.wav');
  assert.equal(task.video_source,'local');assert.equal(task.video_language,'ar');assert.equal(task.video_script,input.script);
  assert.deepEqual(task.video_materials,[{provider:'local',url:'media/001.png'},{provider:'local',url:'media/002.jpg'}]);
  for(const key of ['aspect_ratio','custom_audio_url','api_key','publish'])assert.equal(Object.hasOwn(task,key),false);
  assert.throws(()=>moneyPrinterTask(buildContentPlan(input),'audio/narration.wav',['one.png']));
});

test('prepared project contains only the upstream offline renderer contract',()=>{
  const project=preparedVideoProject(buildContentPlan(input),'prepared/video.webm','audio/narration.wav');
  assert.equal(project.scenes[0].audio,'audio/narration.wav');assert.equal(project.scenes[0].narration,input.script);
  assert.deepEqual(Object.keys(project).sort(),['project_id','scenes','settings']);
  assert.equal(project.settings.bgm_volume,0);
});

test('ZIP round trip verifies CRC, UTF-8 text and asset bytes using Python zipfile',async()=>{
  const zip=await contentZip([{name:'tasks.json',data:'[{}]'},{name:'audio/test.wav',data:new Blob([new Uint8Array([0,1,2,255])])},{name:'نص.txt',data:'لم يتغير 450'}]);
  const code="import io,sys,json,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; assert z.read('audio/test.wav')==bytes([0,1,2,255]); print(json.dumps(z.read('نص.txt').decode('utf-8'),ensure_ascii=False))";
  const result=spawnSync('python3',['-c',code],{input:Buffer.from(await zip.arrayBuffer()),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout),'لم يتغير 450');
});

test('archive rejects traversal paths and duplicates',async()=>{
  await assert.rejects(contentZip([{name:'../voice.wav',data:'x'}]));
  await assert.rejects(contentZip([{name:'audio.wav',data:'x'},{name:'audio.wav',data:'y'}]));
});

test('writing brief quotes its topic and requests sources rather than inventing a script',()=>{
  assert.match(contentWritingBrief('شمشون','كويتي'),/كويتية طبيعية/);
  assert.ok(contentWritingBrief('موضوع').includes(JSON.stringify('موضوع')));
});
