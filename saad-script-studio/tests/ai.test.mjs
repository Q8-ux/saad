import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGemini} from '../assets/ai.mjs';
const fakeKey='test-api-key-not-a-secret';
const list={models:[{name:'models/gemini-test-flash',displayName:'Test flash',supportedGenerationMethods:['generateContent'],outputTokenLimit:16000}]};
const response=data=>({ok:true,status:200,json:async()=>data});
test('API keys are sent in headers and a model is discovered before generation',async()=>{
  const calls=[];
  const ai=makeGemini({fetchImpl:async(url,options)=>{calls.push({url,options});return response(url.includes(':generateContent')?{candidates:[{finishReason:'STOP',content:{parts:[{text:'{"value":"جابر"}'}]}}],usageMetadata:{promptTokenCount:21,candidatesTokenCount:8}}:list);}});
  await ai.connect(fakeKey);assert.equal(ai.model,'models/gemini-test-flash');
  const output=await ai.generate('اكتب بالعربية');assert.equal(output.value,'جابر');
  assert.ok(calls.every(c=>!c.url.includes(fakeKey)));
  assert.ok(calls.every(c=>c.options.headers['x-goog-api-key']===fakeKey));
  assert.equal(ai.usage.requests,1);assert.equal(ai.usage.promptTokens,21);
  ai.disconnect();assert.equal(ai.connected,false);await assert.rejects(ai.generate('x'),/اربط/);assert.equal(calls.length,2);
});
test('provider truncation, invalid JSON and quota failures do not pass as completed writing',async()=>{
  for(const bad of [response({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"x":'}]}}]}),response({candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]}),{ok:false,status:429,json:async()=>({})}]){
    const ai=makeGemini({fetchImpl:async(url)=>url.includes(':generateContent')?bad:response(list)});await ai.connect(fakeKey);await assert.rejects(ai.generate('test'));
  }
});
test('cancel aborts the in-flight request without automatic retries',async()=>{
  let attempts=0;
  const ai=makeGemini({fetchImpl:async(url,options)=>{
    if(!url.includes(':generateContent'))return response(list);
    attempts++;return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true});});
  }});
  await ai.connect(fakeKey);const controller=new AbortController();const pending=ai.generate('test',controller.signal);controller.abort();await assert.rejects(pending,/إيقاف/);assert.equal(attempts,1);
});
