import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';
const { geminiTextResponse, geminiSchema, matchesJsonSchema, decodeGeminiValue, geminiEmptyValue } = load('../lib/gemini.ts');
const config = { apiKey: 'synthetic-private-key', model: 'gemini-3.8-flash' };
const init = (extra = {}) => ({ body: JSON.stringify({ instructions: 'لا تختلق قانوناً؛ بيّن نقص المصادر.', input: 'وقائع اصطناعية.', ...extra }) });
const good = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'مسودة تحتاج مراجعة.' }] } }] };
test('key stays in the vendor header; completed output retains the Responses contract', async () => {
  const response = await geminiTextResponse(init(), config, async (url, request) => {
    assert.equal(request.redirect, 'manual');
    assert.equal(request.headers['x-goog-api-key'], config.apiKey);
    assert.doesNotMatch(url + request.body, /synthetic-private-key/);
    const body = JSON.parse(request.body);
    assert.equal(body.systemInstruction.parts[0].text, 'لا تختلق قانوناً؛ بيّن نقص المصادر.');
    assert.equal(body.contents[0].parts[0].text, 'وقائع اصطناعية.');
    return Response.json(good);
  });
  assert.deepEqual(await response.json(), { status: 'completed', output_text: 'مسودة تحتاج مراجعة.' });
});
test('blocked, truncated and empty output never becomes an approved completion', async () => {
  for (const body of [{}, {promptFeedback:{blockReason:'SAFETY'}}, {candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'جزء مبتور'}]}}]}, {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'}]}}]}]) {
    await assert.rejects(geminiTextResponse(init(), config, async () => Response.json(body)), error => ['incomplete','empty_response'].includes(error.kind));
  }
});
test('upstream errors expose no vendor payload and preserve authentication and quota classifications', async () => {
  for (const [status, kind] of [[401,'authentication'],[403,'authentication'],[404,'model_access'],[429,'rate_limit'],[500,'upstream']]) {
    await assert.rejects(geminiTextResponse(init(), config, async () => Response.json({error:{message:'PRIVATE_CASE_TEXT synthetic-private-key'}},{status})), error => error.kind === kind && !error.message.includes('PRIVATE'));
  }
});
test('file IDs are rejected before contacting Gemini', async () => {
  await assert.rejects(geminiTextResponse(init({input:[{type:'input_file',file_id:'synthetic'}]}), config, async()=>{throw Error('must not send');}), error=>error.kind==='configuration');
});
test('cancellation reaches transport and never triggers an alternate provider', async () => {
  const controller = new AbortController();controller.abort();
  let calls=0;
  await assert.rejects(geminiTextResponse({...init(),signal:controller.signal}, config, async (_url,request)=>{calls++;request.signal.throwIfAborted();}),error=>error.kind==='timeout');
  assert.equal(calls,1);
});
test('validated buffered text supports existing SSE consumers', async () => {
  const response=await geminiTextResponse(init({stream:true}),config,async()=>Response.json(good));
  const events=(await response.text()).trim().split('\n\n').map(line=>JSON.parse(line.slice(6)));
  assert.equal(response.headers.get('Content-Type'),'text/event-stream');
  assert.equal(events[0].type,'response.output_text.delta');
  assert.equal(events[1].type,'response.completed');
  assert.equal(events[1].response.output_text,'مسودة تحتاج مراجعة.');
});

test('original JSON schema still rejects omitted, extra, mistyped and out-of-range fields', () => {
  const schema={type:'object',additionalProperties:false,required:['facts','count','notes'],properties:{facts:{type:'string',minLength:3},count:{type:'integer',minimum:1},notes:{anyOf:[{type:'array',maxItems:1,items:{type:'string'}},{type:'null'}]}}};
  assert.equal(matchesJsonSchema({facts:'synthetic',count:1,notes:null},schema),true);
  for(const value of [{facts:'synthetic',count:1},{facts:'synthetic',count:'1',notes:null},{facts:'synthetic',count:0,notes:[]},{facts:'x',count:1,notes:[]},{facts:'synthetic',count:1,notes:['a','b']},{facts:'synthetic',count:1,notes:[],invented:true}]) assert.equal(matchesJsonSchema(value,schema),false);
  assert.equal(matchesJsonSchema(JSON.parse('{"facts":"synthetic","count":1,"notes":[],"toString":"extra"}'),schema),false);
  const converted=geminiSchema(schema);
  assert.equal(converted.type,'OBJECT');assert.equal(converted.properties.notes.type,'ARRAY');assert.equal(converted.properties.notes.nullable,true);
  const unknownCourt={anyOf:[{type:'string',enum:['','محكمة اصطناعية للاختبار']},{type:'null'}]};
  assert.deepEqual(Array.from(geminiSchema(unknownCourt).enum),[geminiEmptyValue,'محكمة اصطناعية للاختبار']);
  assert.equal(geminiSchema(unknownCourt).nullable,true);
  assert.equal(matchesJsonSchema('',unknownCourt),true);
  assert.equal(matchesJsonSchema(null,unknownCourt),true);
  assert.equal(decodeGeminiValue(geminiEmptyValue,unknownCourt),'');
  assert.equal(decodeGeminiValue(null,unknownCourt),null);
});
test('a schema-violating Gemini completion is withheld before returning text or SSE', async () => {
  const schema={type:'object',additionalProperties:false,required:['facts'],properties:{facts:{type:'string'}}};
  for(const text of ['{}','{"facts":5}','{"facts":"ok","extra":"invented"}']) {
    await assert.rejects(geminiTextResponse(init({text:{format:{schema}}}),config,async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]})),error=>error.kind==='incomplete');
  }
});
