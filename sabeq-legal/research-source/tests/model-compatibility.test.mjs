import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client(model, transport, environment = {}) {
  const cache = new Map();
  const logs = [];
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const exports = {};
    cache.set(url.href, exports);
    const js = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(js, {
      exports,
      require(name) {
        if (name === 'cloudflare:workers') return { env: {
          OPENAI_API_KEY: 'synthetic-test-key', OPENAI_MODEL: model, OPENAI_INTAKE_MODEL: model, ...environment,
        } };
        return load(new URL(`${name}.ts`, url));
      },
      console: { error: (...values) => logs.push(values) },
      fetch: transport, URL, Request, Response, Headers, FormData, File, Blob,
      ReadableStream, TextEncoder, TextDecoder, AbortSignal, AbortController, setTimeout,
    });
    return exports;
  }
  return { api: load(new URL('../lib/openai.ts', import.meta.url)), logs };
}

function upstream(requests) {
  return async (url, init) => {
    if (url.endsWith('/files') && init.method === 'POST') return Response.json({ id: 'file-synthetic' });
    if (init.method === 'DELETE') return Response.json({ deleted: true });
    const body = JSON.parse(init.body);
    requests.push(body);
    // Emulate the real provider constraint, rather than stubbing the app's helper.
    if (body.model.startsWith('gpt-4') && Object.hasOwn(body, 'reasoning')) {
      return Response.json({ error: { code: 'unsupported_parameter', type: 'invalid_request_error', param: 'reasoning' } }, { status: 400 });
    }
    const kind = body.text?.format?.name;
    const output = kind === 'legal_research_plan' ? { searchQueries: ['عبارة اصطناعية'], legalIssues: [] }
      : kind === 'legal_case_intake' ? { assistantMessage: 'طلب افتراضي.', nextQuestions: [], legalBasis: [], progress: 10, phase: 'gathering', readyForMemo: false }
      : kind === 'sabeq_legal_tool' ? { text: 'نص افتراضي.', findings: [], missing: [], passageIds: [] }
      : { facts: 'وقائع اختبار اصطناعية فقط.', requests: 'طلب اختبار.', grounds: '', fields: {}, factualNotes: [], legalResearchNotes: '', warnings: [] };
    return Response.json({ status: 'completed', output_text: kind ? JSON.stringify(output) : 'نص اختبار فقط.' });
  };
}

test('configured GPT-4.1 model can research, draft, extract, dictate, chat and use tools', async () => {
  const requests = [];
  const { api } = client('gpt-4.1-mini', upstream(requests));
  assert.equal((await api.deriveLegalResearchPlan('وقائع اصطناعية للاختبار فقط.')).searchQueries.length, 1);
  const schema = { type: 'object', additionalProperties: false, required: ['facts'], properties: { facts: { type: 'string' } } };
  assert.match(await api.generateText({ instructions: 'اختبار فقط', input: 'بيانات اصطناعية', schema }), /وقائع اختبار/);
  assert.equal(await api.generateText({ instructions: 'اختبار فقط', input: 'بيانات اصطناعية' }), 'نص اختبار فقط.');
  await api.analyzeLegalDocuments([new File(['%PDF-1.4 synthetic fixture only'], 'synthetic.pdf', { type: 'application/pdf' })]);
  await api.analyzeMemoDictation('نص اختبار افتراضي دون بيانات شخصية.');
  await api.conductLegalIntake({ language: 'ar', messages: [{ role: 'user', content: 'اختبار' }], evidence: '' });
  await api.runLegalTool({ action: 'summary', text: 'وقائع اصطناعية', language: 'ar', evidence: '', passageIds: [] });
  assert.equal(requests.length, 7);
  assert.ok(requests.every(body => !Object.hasOwn(body, 'reasoning') && body.store === false));
  assert.equal(requests[1].text.format.strict, true);
  assert.deepEqual(requests[1].text.format.schema, schema);
});

test('reasoning model retains low effort and incomplete drafting remains an error', async () => {
  const requests = [];
  const { api } = client('gpt-5.6', upstream(requests));
  await api.generateText({ instructions: 'synthetic', input: 'synthetic' });
  assert.deepEqual(requests[0].reasoning, { effort: 'low' });
  const incomplete = client('gpt-4.1-mini', async () => Response.json({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: '{"facts":"partial"' }));
  await assert.rejects(incomplete.api.generateText({ instructions: 'synthetic', input: 'synthetic' }), error => error.kind === 'incomplete');
});

test('unsupported parameter diagnostics omit raw messages and credentials', async () => {
  const { api, logs } = client('gpt-4.1-mini', async () => Response.json({ error: {
    code: 'unsupported_parameter', type: 'invalid_request_error', param: 'reasoning.effort',
    message: 'PRIVATE_CASE_TEXT synthetic-test-key',
  } }, { status: 400, headers: { 'x-request-id': 'req_synthetic' } }));
  await assert.rejects(api.generateText({ instructions: 'synthetic', input: 'synthetic' }), error => error.kind === 'upstream');
  assert.equal(logs[0][1].param, 'reasoning.effort');
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_CASE_TEXT|synthetic-test-key/);
});

test('Gemini serves drafting, legal research, intake, dictation and tools with their original schemas', async () => {
  const requests = [];
  const { api } = client('gpt-4.1-mini', async (url, init) => {
    assert.match(url, /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3.8-flash:generateContent$/);
    assert.equal(init.headers['x-goog-api-key'], 'synthetic-gemini-key');
    assert.equal(init.headers.Authorization, undefined);
    const body = JSON.parse(init.body); requests.push(body);
    assert.ok(body.systemInstruction.parts[0].text.length);
    function synthetic(schema) {
      if (schema.anyOf) return synthetic(schema.anyOf[0]);
      if (schema.enum) return schema.enum[0];
      if (schema.type === 'OBJECT') return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, child]) => [key, synthetic(child)]));
      if (schema.type === 'ARRAY') return [];
      if (schema.type === 'BOOLEAN') return false;
      if (['INTEGER','NUMBER'].includes(schema.type)) return schema.minimum || 0;
      return 'اختبار اصطناعي';
    }
    const output = synthetic(body.generationConfig.responseSchema);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] });
  }, { LEGAL_AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'synthetic-gemini-key' });
  const schema = { type: 'object', required: ['facts'], properties: { facts: { type: 'string' } } };
  await api.generateText({ instructions: 'لا تختلق مصادر؛ حالة اصطناعية فقط.', input: 'وقائع اختبار.', schema });
  await api.deriveLegalResearchPlan('وقائع اختبار.');
  await api.conductLegalIntake({ language: 'ar', messages: [{ role: 'user', content: 'اختبار اصطناعي' }], evidence: '' });
  await api.analyzeMemoDictation('وقائع اختبار اصطناعية.');
  await api.runLegalTool({ action: 'summary', text: 'وقائع اصطناعية', language: 'ar', evidence: '', passageIds: [] });
  assert.equal(requests.length, 5);
  assert.equal(requests[0].generationConfig.responseSchema.type, 'OBJECT');
  assert.deepEqual(requests[0].generationConfig.responseSchema.required, schema.required);
  assert.ok(requests.every(body => body.generationConfig.responseMimeType === 'application/json'));
});

test('Gemini can clear an obsolete court while null still leaves it unchanged', async () => {
  for (const [court, expected] of [['__SABEQ_EMPTY__', ''], [null, 'محكمة الأسرة']]) {
    const { api } = client('gpt-4.1-mini', async (_url, init) => {
      const body=JSON.parse(init.body);
      function fixture(schema) {
        if(schema.anyOf)return fixture(schema.anyOf[0]);
        if(schema.enum)return schema.enum[0];
        if(schema.type==='OBJECT')return Object.fromEntries(Object.entries(schema.properties||{}).map(([key,child])=>[key,fixture(child)]));
        if(schema.type==='ARRAY')return [];
        if(schema.type==='BOOLEAN')return false;
        if(['INTEGER','NUMBER'].includes(schema.type))return schema.minimum||0;
        return 'اختبار اصطناعي';
      }
      const output=fixture(body.generationConfig.responseSchema);
      Object.assign(output,{court,courtCircuit:null,parties:null,facts:null,requests:null});
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
    },{LEGAL_AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-gemini-key'});
    const result=await api.conductLegalIntake({language:'ar',messages:[{role:'user',content:'تصحيح وقائع اصطناعية للاختبار فقط.'}],currentState:{court:'محكمة الأسرة',facts:['واقعة اصطناعية محفوظة'],requests:['طلب اصطناعي محفوظ']},evidence:''});
    assert.equal(result.court,expected);
    assert.equal(result.memoPrefill.court,expected);
    assert.doesNotMatch(result.assistantMessage,/__SABEQ_EMPTY__/);
  }
});

test('Gemini recovers explicit temporary rejection within three attempts', async () => {
  let calls=0;
  const {api}=client('unused',async()=>++calls<3 ? Response.json({}, {status:503}) : Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'synthetic recovered output'}]}}]}),{LEGAL_AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-gemini-key'});
  assert.equal(await api.generateText({instructions:'synthetic',input:'synthetic'}),'synthetic recovered output');
  assert.equal(calls,3);
});

test('Gemini retry budget preserves failures and never repeats invalid or accepted incomplete output', async () => {
  for(const [status,expected] of [[503,3],[400,1],[401,1],[429,1],[200,1]]) {
    let calls=0;
    const {api}=client('unused',async()=>{calls++;return Response.json(status===200?{candidates:[{finishReason:'MAX_TOKENS'}]}:{},{status});},{LEGAL_AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-gemini-key'});
    await assert.rejects(api.generateText({instructions:'synthetic',input:'synthetic'}));
    assert.equal(calls,expected);
  }
});

test('cancellation prevents a retry after an explicit temporary rejection', async () => {
  const controller=new AbortController();let calls=0;
  const {api}=client('unused',async()=>{calls++;controller.abort();return Response.json({},{status:503});},{LEGAL_AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-gemini-key'});
  await assert.rejects(api.generateText({instructions:'synthetic',input:'synthetic',signal:controller.signal}),error=>error.kind==='timeout');
  assert.equal(calls,1);
});
