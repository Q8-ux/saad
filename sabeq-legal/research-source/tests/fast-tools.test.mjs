import {templateHarness} from "./template-harness.mjs";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, deps = {}, globals = {}) { const exports = {}; const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText; vm.runInNewContext(js, { exports, require: name => {if(name === "./gemini")return load("../lib/gemini.ts");if(name.endsWith("/project-context"))return load("../lib/project-context.ts");if(name.endsWith("/judgment-evidence"))return load("../lib/judgment-evidence.ts"); if(name === '@/lib/sabeq-agent-bridge') return {agentPipelineEnabled:()=>false}; if(name === '@/lib/approved-templates') return deps[name] || {};  if(name.endsWith('/legal-voice')) return load('../lib/legal-voice.ts'); if(name === '@/data/legal-sources/reviewed.json') return JSON.parse(readFileSync(new URL('../data/legal-sources/reviewed.json',import.meta.url),'utf8')); if(name.endsWith('/official-legislation')||name === './official-legislation') return load('../lib/official-legislation.ts'); if(name.endsWith('/statutory-text')||name==='./statutory-text')return load('../lib/statutory-text.ts');if(name.endsWith('/legal-citation-review')||name === './legal-citation-review') return load('../lib/legal-citation-review.ts'); if (name.endsWith('/memo-language')) return load('../lib/memo-language.ts'); if (name.endsWith('/interface-language')) return load('../lib/interface-language.ts'); if (name === './pleading-document' || name === '@/lib/pleading-document') return load('../lib/pleading-document.ts'); if (name === './legal-language' || name === '@/lib/legal-language') return load('../lib/legal-language.ts'); if (!(name in deps)) throw Error('Missing dependency '+name); return deps[name]; }, console, URL, Request, Response, Headers, FormData, File, Blob, ReadableStream, TransformStream, Uint8Array, Float32Array, DataView, TextEncoder, TextDecoder, AbortSignal, AbortController, performance, btoa, setTimeout, ...globals }); return exports; }
const security = load('../lib/request-security.ts', { '@/db': {} });
const search = load('../lib/legal-search.ts', { '@/db': {} });
const analysis = load('../lib/intake-analysis.ts', { './legal-search': search });
const context = load('../lib/intake-context.ts');
const stream = load('../lib/intake-stream.ts');
const helpers = load('../lib/legal-tools.ts', { './legal-search': search, './intake-analysis': analysis });
const evidence = [{ documentId: 1, title: 'مصدر اصطناعي', text: 'مقطع اصطناعي للاختبار فقط وليس نصاً تشريعياً ولا يقرر أي حق.', sourceUrl: 'https://example.org/test', documentType: 'قانون' }];
const origin = 'https://example.org';

test('compact output preserves unchanged facts, applies corrections and never guesses client from party order', async () => {
 let payload;
 const api = load('../lib/openai.ts', { 'cloudflare:workers': { env: { OPENAI_API_KEY: 'synthetic' } }, './intake-context': context, './intake-stream': stream }, { fetch: async (_, init) => { payload = JSON.parse(init.body); return Response.json({ output_text: JSON.stringify({ assistantMessage:'فهمت التصحيح.', facts:null, requests:['طلب مصحح'], parties:null, court:'', progress:20, nextQuestions:['ما تاريخ الواقعة؟'], missingInformation:['date'], readyForMemo:false }) }); } });
 const result = await api.conductLegalIntake({ language:'ar', messages:[{role:'user',content:'تصحيح الطلب'}], currentState:{ facts:['واقعة قديمة محفوظة'], requests:['طلب سابق'], parties:[{name:'الخصم',role:'مدعى عليه'}], court:'محكمة الأسرة' }, evidence:'' });
 assert.equal(result.facts[0],'واقعة قديمة محفوظة'); assert.equal(result.requests[0],'طلب مصحح'); assert.equal(result.court,''); assert.equal(result.memoPrefill.clientName,''); assert.equal(result.caseSummary,'واقعة قديمة محفوظة');
 assert.equal(payload.text.format.schema.properties.memoPrefill,undefined); assert.equal(payload.text.format.schema.properties.caseSummary,undefined);
});

test('PCM starts before completion, carries odd bytes, and cannot resume microphone until playback and stream both finish', () => {
 const { PcmPlayer }=load('../lib/pcm-player.ts'); const nodes=[], events=[];
 const audio={state:'running',currentTime:1,destination:{},createBuffer:(_,n,rate)=>({duration:n/rate,getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>{const node={connect(){},disconnect(){},start(at){events.push(['play',at]);},stop(){events.push(['stop']);}};nodes.push(node);return node;}};
 const player=new PcmPlayer(audio,{speaking:()=>events.push(['speaking']),blocked:()=>{},ended:()=>events.push(['ended'])});
 player.append(new Uint8Array([0,128,255]));assert.equal(nodes.length,1);assert.equal(events.some(e=>e[0]==='ended'),false);
 player.append(new Uint8Array([127]));assert.equal(nodes.length,2);nodes[0].onended();nodes[1].onended();assert.equal(events.some(e=>e[0]==='ended'),false);
 player.finish();assert.equal(events.filter(e=>e[0]==='ended').length,1);player.stop();
});

test('PCM blocked playback resumes the buffered samples and stop cancels queued audio', async()=>{
 const { PcmPlayer }=load('../lib/pcm-player.ts');let blocked=0,started=0,stopped=0; const audio={state:'suspended',currentTime:0,destination:{},resume(){this.state='running';},createBuffer:(_,n,rate)=>({duration:n/rate,getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({connect(){},disconnect(){},start(){started++;},stop(){stopped++;}})};
 const p=new PcmPlayer(audio,{speaking(){},blocked(){blocked++;},ended(){}});p.append(new Uint8Array([0,0]));assert.equal(blocked,1);assert.equal(started,0);await p.resume();assert.equal(started,1);p.stop();assert.equal(stopped,1);p.append(new Uint8Array([0,0]));assert.equal(started,1);
});

test('review rejects fabricated document quotations and legal references; source quotes are server owned',()=>{
 const result=helpers.reviewToolOutput({text:'المادة 9999 تعطيك ضماناً',findings:[{quote:'اقتباس غير موجود',issue:'fake',suggestion:'fake'},{quote:'يلتزم الطرف بالدفع خلال شهر',issue:'وضّح تاريخ البداية',suggestion:'خلال شهر من التسليم'}],missing:[],passageIds:['م1:1','م99:1']},'يلتزم الطرف بالدفع خلال شهر.',evidence);
 assert.equal(result.findings.length,1);assert.equal(result.sources.length,1);assert.equal(result.sources[0].quote,evidence[0].text);assert.doesNotMatch(result.text,/9999/);assert.ok(result.warnings.length>=2);
 const absent=helpers.reviewToolOutput({text:'تحسين لغوي',findings:[],missing:[],passageIds:[]},'نص عادي',[]);assert.match(absent.warnings.join(' '),/لا يوجد سند/);
});

test('uploads enforce actual format, count, empty content and streamed byte cap',async()=>{
 const limits=load('../lib/document-limits.ts');const upload=load('../lib/document-upload.ts',{'./request-security':security,'./document-limits':limits});
 assert.equal((await upload.validateDocuments([new File(['%PDF-1.4 synthetic'],'test.pdf',{type:'application/pdf'})])).files.length,1);
 for(const files of [[new File(['fake executable'],'evil.pdf',{type:'application/pdf'})],[new File(['abc'],'evil.exe',{type:'text/plain'})],[new File([],'empty.txt',{type:'text/plain'})],Array.from({length:26},()=>new File(['hello'],'x.txt',{type:'text/plain'}))]) await assert.rejects(upload.validateDocuments(files));
 const req=new Request(origin,{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:new ReadableStream({start(c){c.enqueue(new Uint8Array(limits.MAX_TOTAL_BYTES+1024*1024+1));c.close();}}),duplex:'half'});
 await assert.rejects(upload.readDocumentForm(req),/50/);
});

test('tools refuse unknown action and cross origin, use corpus content, and never archive a guest case',async()=>{
 let calls=0; const tool=load('../app/api/legal/tools/route.ts',{'@/db':{},'@/lib/legal-search':{searchLegalEvidence:async()=>evidence},'@/lib/intake-analysis':analysis,'@/lib/legal-tools':helpers,'@/lib/openai':{openAIErrorResponse:()=>null,runLegalTool:async()=>{calls++;return {text:'صياغة اصطناعية',findings:[],missing:[],passageIds:['م1:1']};}},'@/lib/public-auth':{requireMemoUserOrGuest:async()=>null},'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/service-records':{enforceUserServiceLimit:async()=>{},recordServiceActivity:async()=>assert.fail('guest archived')},'@/lib/request-security':{...security,enforceRateLimit:async()=>{}}}).POST;
 const req=(action,from=origin)=>new Request(origin+'/api/legal/tools',{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify({action,text:'وقائع اصطناعية لاختبار الأداة',language:'ar'})});
 assert.equal((await tool(req('delete_users'))).status,400);assert.equal((await tool(req('draft','https://attacker.example'))).status,403);
 const result=await tool(req('research'));assert.equal(result.status,200);const body=await result.json();assert.equal(body.sources[0].quote,evidence[0].text);assert.equal(calls,0);
 assert.equal((await tool(req('draft'))).status,200);assert.equal(calls,1);
});

test('voice route forwards first PCM chunk before upstream completes and waits for reviewed analysis',async()=>{
 let feed; const calls=[];const turn=load('../app/api/legal/voice-turn/route.ts',{'@/lib/request-security':security,'@/lib/intake-stream':stream,'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'../transcribe/route':{POST:async()=>Response.json({text:'كلام اصطناعي'})},'../assistant/route':{POST:async()=>Response.json({state:{assistantMessage:'رد مراجع'}})},'../speech/route':{POST:async request=>{calls.push(await request.json());return new Response(new ReadableStream({start(c){feed=c;c.enqueue(new Uint8Array([0,0,0,0]));}}),{headers:{'Content-Type':'audio/pcm'}});}}}).POST;
 const form=new FormData();form.set('context','{}');form.set('language','ar');const response=await turn(new Request(origin+'/api/legal/voice-turn',{method:'POST',headers:{Origin:origin},body:form}));
 const reader=stream.readSSE(response.body);let audio=false;
 for(let i=0;i<4;i++){const e=(await reader.next()).value;if(e.type==='audio') audio=true;}
 assert.equal(audio,true);assert.equal(calls[0].stream,true);assert.equal(calls[0].text,'رد مراجع');feed.close();const done=(await reader.next()).value;assert.equal(done.type,'done');assert.equal(done.speechRevision,'streamed-voice-3');await reader.return();
});

test('memo without sources needs no attached law, corrects prose, keeps identifiers, and cannot fabricate authority', async t => {
  const templateStore=templateHarness();t.after(templateStore.cleanup);
  let generations = 0;
  const memo = load('../app/api/legal/memo/route.ts', {
    '@/lib/approved-templates':templateStore.templates,
    '@/lib/legal-search': { ...search, searchLegalEvidenceAcross: async()=>[], searchCassationEvidenceAcross: async()=>[], readHandoffEvidence: async()=>[] },
    '@/lib/openai': { deriveLegalResearchPlan: async()=>({searchQueries:['قرض'],legalIssues:[]}), generateText:async()=>{generations++; return 'should not generate ungrounded authority';},openAIErrorResponse:()=>null },
    '@/lib/public-auth': { requireMemoUserOrGuest:async()=>null }, '@/lib/service-records': { enforceUserServiceLimit:async()=>{},recordServiceActivity:async()=>assert.fail('guest archive') },
    '@/lib/service-settings': { requireServiceEnabled:async()=>{} }, '@/lib/request-security': {...security,enforceRateLimit:async()=>{}},
  }).POST;
  const request=new Request(origin+'/api/legal/memo',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({caseType:'مدني',court:'المحكمة الكلية',clientName:'سالم التجريبي',otherParty:'ناصر الافتراضي',partyRole:'مدعٍ',caseNumber:'0012/2026',facts:'لم يدفع الخصم مبلغ 500 دينار. قدمت الادله في القضيه.',requests:'أطلب التعويظ ورد المبلغ.'})});
  const response=await memo(request); assert.equal(response.status,200);const body=await response.json();
  assert.equal(generations,0);assert.match(body.memo,/0012\/2026/);assert.match(body.memo,/لم يدفع الخصم مبلغ 500/);assert.match(body.memo,/الأدلة في القضية/);assert.match(body.memo,/أطلب التعويض/);assert.doesNotMatch(body.memo,/استكمال البحث|المساعد|ملاحظات المراجعة|مراجعة المسودة|تعذر العثور|غير معتمدة/);assert.ok(!/المادة\s*[\d٠-٩]|الطعن\s*[\d٠-٩]/.test(body.memo));
});

for (const language of ['en','ur']) test(`${language} case prose becomes an Arabic memo when no legal source exists`, async t => {
  const templateStore=templateHarness();t.after(templateStore.cleanup);const calls=[];
  const memo=load('../app/api/legal/memo/route.ts',{
    '@/lib/approved-templates':templateStore.templates,
    '@/lib/legal-search':{...search,searchLegalEvidenceAcross:async()=>[],searchCassationEvidenceAcross:async()=>[],readHandoffEvidence:async()=>[]},
    '@/lib/openai':{deriveLegalResearchPlan:async()=>({searchQueries:[],legalIssues:[]}),generateText:async options=>{calls.push(options);return JSON.stringify({facts:'لم يرد الخصم مبلغ 500 دينار في القضية 0012/2026.',requests:'رد مبلغ 500 دينار.',grounds:'المادة 9999 تمنح تعويضاً مختلقاً'});},openAIErrorResponse:()=>null},
    '@/lib/public-auth':{requireMemoUserOrGuest:async()=>null},'@/lib/service-records':{enforceUserServiceLimit:async()=>{},recordServiceActivity:async()=>assert.fail('guest archive')},
    '@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/request-security':{...security,enforceRateLimit:async()=>{}},
  }).POST;
  const body={language,caseType:'مدني',court:'المحكمة الكلية',clientName:'اسم تجريبي',otherParty:'خصم افتراضي',partyRole:'مدعٍ',caseNumber:'0012/2026',facts:language==='en'?'The defendant has not repaid 500 dinars in case 0012/2026.':'مدعا علیہ نے مقدمہ 0012/2026 میں 500 دینار واپس نہیں کیے۔',requests:language==='en'?'Return the 500 dinars.':'500 دینار واپس کیے جائیں۔'};
  const response=await memo(new Request(origin+'/api/legal/memo',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  assert.equal(response.status,200);const result=await response.json();assert.equal(calls.length,1);assert.match(calls[0].instructions,/ترجمة لغوية/);
  assert.match(result.memo,/لم يرد الخصم مبلغ 500/);assert.match(result.memo,/0012\/2026/);assert.doesNotMatch(result.memo,/9999|The defendant|کیے|منحت/);assert.equal(result.analysis.sourceCount,0);assert.equal(result.document.pages[0].court,undefined);assert.match(result.memo,/المحكمة الكلية/);
});

test('Arabic memo conversion rejects changed identifiers, lost names and untranslated prose', async()=>{
  const {arabicMemoInput}=load('../lib/memo-language.ts');
  const input={clientName:'Alice',otherParty:'Bob',facts:'Alice has not received 500 dinars.',requests:'رد المبلغ'};
  const valid=await arabicMemoInput(input,async()=>JSON.stringify({facts:'لم تتسلم Alice مبلغ 500 دينار.'}));assert.equal(valid.clientName,'Alice');assert.equal(valid.requests,input.requests);
  for(const facts of ['لم تتسلم Alice مبلغ 9999 دينار.','لم تتسلم أليس مبلغ 500 دينار.','Alice has not received 500 dinars.']) await assert.rejects(arabicMemoInput(input,async()=>JSON.stringify({facts})),/Arabic memo translation/);
});
