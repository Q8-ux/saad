import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';

const {pleadingFields}=load('../lib/pleading-document.ts');
const draft={facts:'وقائع اصطناعية فقط.',grounds:'منازعة واقعية اصطناعية دون اختلاق قانون.',requests:'رفض الزيادة الاصطناعية.',factualNotes:[],legalResearchNotes:'',fields:Object.fromEntries(Object.keys(pleadingFields).map(k=>[k,'']))};
function reviewer(){return load('../lib/meta-memo-review.ts',{'cloudflare:workers':{env:{}}});}
const reviewInput={primaryInput:'EXACT-PRIMARY-'+('بيانات اصطناعية '.repeat(900))+'-TAIL',originalInput:{clientName:'طرف اصطناعي',facts:'واقعة اصطناعية'},openaiDraft:draft,casePlan:{issues:[]},sources:'مصادر اختبار برمجية فقط'};
const runtime={OPENROUTER_API_KEY:'synthetic-private-review-key',OPENROUTER_MODEL:'meta-llama/llama-3.3-70b-instruct:free'};
test('Meta receives the full exact OpenAI input and draft and returns its corrected content',async()=>{
 const corrected={...draft,grounds:'تصحيح اصطناعي مؤيد بالمدخلات.'};
 let sent;
 const result=await reviewer().reviewMetaMemo(reviewInput,undefined,{runtime,resolve:async value=>value,transport:async(url,init)=>{
  sent={url,init};
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(corrected)}}]});
 }});
 const body=JSON.parse(sent.init.body),input=JSON.parse(body.messages[1].content);
 assert.equal(sent.url,'https://openrouter.ai/api/v1/chat/completions');
 assert.equal(input.primaryInput,reviewInput.primaryInput);
 assert.deepEqual(input.openaiDraft,draft);
 assert.deepEqual(input.originalInput,reviewInput.originalInput);
 assert.equal(body.provider.zdr,true);assert.equal(body.provider.data_collection,'deny');
 assert.doesNotMatch(sent.init.body,/synthetic-private-review-key/);
 assert.equal(result.content.grounds,corrected.grounds);
});
test('a missing or rejected Meta credential cannot become a completed review',async()=>{
 let calls=0;
 await assert.rejects(reviewer().reviewMetaMemo(reviewInput,undefined,{runtime:{},resolve:async v=>v,transport:async()=>{calls++;}}),e=>e.code==='configuration');
 assert.equal(calls,0);
 for(const status of [401,429,502])await assert.rejects(reviewer().reviewMetaMemo(reviewInput,undefined,{runtime,resolve:async v=>v,transport:async()=>Response.json({error:{message:'PRIVATE-UPSTREAM'}},{status})}),e=>['authentication','rate_limit','unavailable'].includes(e.code)&&!e.message.includes('PRIVATE'));
});
test('incomplete Meta JSON is rejected rather than accepted as a successful review',async()=>{
 await assert.rejects(reviewer().reviewMetaMemo(reviewInput,undefined,{runtime,resolve:async v=>v,transport:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{}'}}]})}),e=>e.code==='incomplete');
});

