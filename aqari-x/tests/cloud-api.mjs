// Explicit opt-in integration check: this makes metered model/audio requests.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {wavFromPCM} from '../server/openai-assistant.mjs';
const base=process.argv[2];
if(!base||!/^https:\/\/.+\.neon\.tech$/.test(base))throw new Error('Pass the explicitly selected office API URL');
const report={checkedAt:new Date().toISOString(),base,tests:[]};
const post=(path,data)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(75000)});
const json=async(path,data)=>{const r=await post(path,data);assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return r.json();};
const pass=(name,extra={})=>{report.tests.push({name,passed:true,...extra});console.log('PASS '+name);};
const session=await json('/assistant/session',{});assert.equal(session.chatReady,true);assert.equal(session.voiceReady,true);pass('cloud services ready with no secret in the browser response');
await mkdir('.openai/cloud-qa',{recursive:true});let last;
for(const [locale,message] of [
 ['ar','أبحث عن شقة للإيجار في الجابرية ثلاث غرف بميزانية خمسمائة دينار'],
 ['en','A three-bedroom apartment for rent in Jabriya, budget five hundred dinars'],
 ['ur','جابریہ میں کرائے پر تین کمروں کا فلیٹ، بجٹ پانچ سو دینار']
]){
 const reply=await json('/assistant',{message,locale,token:session.token});last=reply;
 assert.equal(reply.method,'openai',reply.fallback);assert.equal(reply.locale,locale);assert.equal(reply.filters.maxPrice,500);
 assert.deepEqual(reply.properties.map(x=>x.id),['initial-08']);assert.ok(!JSON.stringify(reply).includes('51758056'));pass(locale+' semantic search and grounded property result');
 const response=await post('/assistant/speech',{token:session.token,ticket:reply.speechTicket});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^audio\/wav/);
 const audio=Buffer.from(await response.arrayBuffer());assert.equal(audio.subarray(0,4).toString(),'RIFF');assert.ok(audio.length>1000);
 await writeFile('.openai/cloud-qa/'+locale+'.wav',audio);pass(locale+' cloud spoken reply',{bytes:audio.length});
 const sample=audio.length>960044?wavFromPCM(audio.subarray(44,960044)):audio;
 const transcript=await json('/assistant/transcribe',{token:session.token,locale,mime:'audio/wav',content:sample.toString('base64')});
 assert.ok(transcript.text.length>8);assert.match(transcript.text,locale==='en'?/[a-z]/i:/\p{Script=Arabic}/u);pass(locale+' cloud voice-to-text round trip',{transcriptCharacters:transcript.text.length});
}
const other=await json('/assistant/session',{});
assert.equal((await post('/assistant/speech',{token:other.token,ticket:last.speechTicket})).status,403);pass('spoken replies cannot be replayed from another assistant session');
assert.equal((await post('/assistant/speech',{token:session.token,text:'Unapproved text'})).status,403);pass('speech requires a signed office reply instead of arbitrary narration');
const local=await json('/assistant',{message:'apartment in Jabriya',locale:'en'});assert.equal(local.method,'office-data');pass('local search remains available without a cloud session');
report.passed=report.tests.length;await writeFile('tests/cloud-api-results.json',JSON.stringify(report,null,2)+'\n');console.log(`Completed ${report.passed} cloud checks. No client records, bookings, payments or messages were created.`);
