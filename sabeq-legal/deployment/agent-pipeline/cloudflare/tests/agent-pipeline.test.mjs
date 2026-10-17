import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, templateHarness } from './template-harness.mjs';

const caseData = {caseType:'مدني',court:'المحكمة الكلية',clientName:'شخص اختباري',otherParty:'خصم اختباري',partyRole:'مدعٍ',facts:'واقعة اصطناعية للاختبار فقط بشأن مبلغ لم يتم سداده.',requests:'إلزام الخصم بسداد مبلغ الاختبار.'};
const template = {id:'test',version:1,kind:'claim',title:'نموذج اختبار',sourceSha256:'a'.repeat(64)};
const evidence = [{documentId:1,chunkId:7,title:'مرجع عام اصطناعي',text:'المادة 12 نص اختبار.',reference:'المادة 12',sourceUrl:'https://example.org/public-test',documentType:'قانون',officialSource:'اختبار'}];
const content = {facts:caseData.facts,requests:caseData.requests,grounds:'تطبيق اصطناعي 【م1】',fields:{},factualNotes:[],legalResearchNotes:''};
function bridge(runtime) {
 const security=load('../lib/request-security.ts',{'@/db':{}});
 const search=load('../lib/legal-search.ts',{'@/db':{}});
 return load('../lib/sabeq-agent-bridge.ts',{'cloudflare:workers':{env:runtime},'./legal-search':search,'./request-security':security});
}
const runtime={SABEQ_AGENT_ENABLED:'true',SABEQ_AGENT_URL:'https://agents.example.org/internal/sabeq-agents/memo',SABEQ_AGENT_BRIDGE_TOKEN:'t'.repeat(48)};
function reply(payload, overrides={}) {
 return Response.json({requestId:payload.requestId,content,audit:{steps:['validate','knowledge','draft','audit'],knowledgeStatus:'fixture',modelRequests:1,missingSources:false,sourceIds:['legal:1:7']},...overrides});
}

test('bridge sends only server-selected template and evidence with private authorization',async()=>{
 const api=bridge(runtime);let sent;
 const result=await api.generateAgentPleading({caseData,fields:{judgmentNumber:'0045/2026'},documentKind:'claim',template,evidence},async(url,init)=>{
  sent=JSON.parse(init.body);assert.equal(url.protocol,'https:');assert.equal(init.headers.Authorization,'Bearer '+'t'.repeat(48));assert.equal(init.headers.Origin,undefined);assert.equal(init.redirect,'error');return reply(sent);
 });
 assert.equal(result.content.fields.judgmentNumber,'0045/2026');assert.equal(sent.language,'ar');assert.equal(sent.template.sourceSha256,template.sourceSha256);assert.equal(sent.sources[0].marker,'م1');assert.equal(sent.sources[0].sourceId,'legal:1:7');assert.equal(sent.template.emblemData,undefined);
});
test('unsafe URLs and missing credentials fail before any remote request',async()=>{
 for(const configuration of [{...runtime,SABEQ_AGENT_URL:'http://agents.example.org/internal/sabeq-agents/memo'},{...runtime,SABEQ_AGENT_URL:'https://secret@agents.example.org/internal/sabeq-agents/memo'},{...runtime,SABEQ_AGENT_BRIDGE_TOKEN:''}]){
  let calls=0;await assert.rejects(bridge(configuration).generateAgentPleading({caseData,fields:{},documentKind:'claim',template,evidence},async()=>{calls++;}));assert.equal(calls,0);
 }
});
test('cross-case responses and fabricated citations never reach the final template',async()=>{
 for(const change of [{requestId:'different-case'},{content:{...content,grounds:'مصدر مزيف 【م99】'}},{audit:{steps:['draft'],modelRequests:1,missingSources:false,sourceIds:['legal:1:7']}}]){
  await assert.rejects(bridge(runtime).generateAgentPleading({caseData,fields:{},documentKind:'claim',template,evidence},async(_url,init)=>reply(JSON.parse(init.body),change)));
 }
});
test('no-source response preserves facts and rejects invented legal grounds',async()=>{
 const api=bridge(runtime);
 for(const grounds of ['', 'المادة 999']) {
  const promise=api.generateAgentPleading({caseData,fields:{},documentKind:'claim',template,evidence:[]},async(_url,init)=>reply(JSON.parse(init.body),{content:{...content,grounds},audit:{steps:['validate','knowledge','draft','audit'],knowledgeStatus:'not_needed',modelRequests:0,missingSources:true,sourceIds:[]}}));
  if(grounds) await assert.rejects(promise);else assert.equal((await promise).content.facts,caseData.facts);
 }
});

function memoRoute(h, {pipeline, sources=evidence, auth=async()=>null, limits=async()=>{}}) {
 const search=load('../lib/legal-search.ts',{'@/db':{}});
 return load('../app/api/legal/memo/route.ts',{
  '@/lib/approved-templates':h.templates,'@/lib/sabeq-agent-bridge':pipeline,
  '@/lib/legal-search':{...search,searchLegalEvidenceAcross:async()=>sources,searchCassationEvidenceAcross:async()=>[],readHandoffEvidence:async()=>[]},
  '@/lib/openai':{deriveLegalResearchPlan:async()=>({searchQueries:[],legalIssues:[]}),openAIErrorResponse:()=>null,generateText:async()=>{throw Error('unexpected fallback');}},
  '@/lib/public-auth':{requireMemoUserOrGuest:auth},'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/service-records':{enforceUserServiceLimit:limits,recordServiceActivity:async()=>{}},'@/lib/request-security':{...h.security,enforceRateLimit:async()=>{}}
 });
}
const request=()=>new Request('https://example.org/api/legal/memo',{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify({...caseData,template:{kind:'appeal'},agentToken:'client-forged'})});

test('memo route invokes agents after auth and retains actual approved document and source links',async t=>{
 const h=templateHarness();t.after(h.cleanup);let authorized=false,limited=false;
 const route=memoRoute(h,{auth:async()=>{authorized=true;return{id:'test-user'};},limits:async()=>{limited=true;},pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async input=>{
  assert.ok(authorized&&limited);assert.equal(input.template.kind,'claim');assert.notEqual(input.template.id,'test');assert.equal(input.caseData.agentToken,undefined);return{content:{...content},audit:{steps:['validate','knowledge','draft','audit']}};
 }}});
 const response=await route.POST(request());assert.equal(response.status,200);const value=await response.json();assert.equal(value.document.kind,'claim');assert.equal(value.analysis.sources[0].sourceUrl,evidence[0].sourceUrl);assert.equal(value.template.sourceFilename,(await h.templates.loadApprovedTemplate('claim')).info.sourceFilename);assert.doesNotMatch(value.memo,/المساعد|ملاحظات المراجعة|نتيجة التحليل/);
});
test('auth failure cannot reach agents; enabled worker failure is not silently bypassed',async t=>{
 const h=templateHarness();t.after(h.cleanup);let calls=0;
 const pipeline={agentPipelineEnabled:()=>true,generateAgentPleading:async()=>{calls++;throw Error('secret provider details');}};
 const denied=memoRoute(h,{pipeline,auth:async()=>{throw new h.security.RequestError('غير مصرح',401);}});
 assert.equal((await denied.POST(request())).status,401);assert.equal(calls,0);
 const failed=await memoRoute(h,{pipeline}).POST(request());assert.equal(failed.status,503);assert.equal(calls,1);assert.doesNotMatch(await failed.text(),/secret/);
});
test('missing-source notice remains outside exported memo on existing path',async t=>{
 const h=templateHarness();t.after(h.cleanup);
 const route=memoRoute(h,{sources:[],pipeline:{agentPipelineEnabled:()=>false}});
 const r=await route.POST(request());assert.equal(r.status,200);const value=await r.json();assert.equal(value.analysis.missingSources,true);assert.match(value.analysis.researchNotice,/لا توجد مصادر/);assert.doesNotMatch(value.memo,/لا توجد مصادر/);
});
test('knowledge export denies unauthorized users without reading any corpus or template',async()=>{
 let reads=0;const auth=load('../lib/admin-service-auth.ts',{'cloudflare:workers':{env:{ADMIN_SERVICE_TOKEN:'a'.repeat(48)}}});
 const route=load('../app/api/admin/agent-knowledge/route.ts',{'@/lib/admin-service-auth':auth,'@/db':{getD1:()=>{reads++;throw Error();}},'@/lib/approved-templates':{loadApprovedTemplate:async()=>{reads++;throw Error();}}});
 const r=await route.GET(new Request('https://example.org/api/admin/agent-knowledge'));assert.equal(r.status,401);assert.equal(reads,0);
});
test('knowledge export queries only verified public MOJ sources and approved blank templates',async()=>{
 let sql;const rows=[{chunkId:7,documentId:1,title:'اختبار عام',text:'مقتطف عام اصطناعي',sourceUrl:'https://moj.gov.kw/test.pdf'},{chunkId:8,documentId:2,title:'مرفق خاص مرفوض',text:'نص خاص',sourceUrl:'https://private.example/test.pdf'}];
 const route=load('../app/api/admin/agent-knowledge/route.ts',{'@/lib/admin-service-auth':{requireAdminService:()=>null,adminJson:Response.json.bind(Response)},'@/db':{getD1:()=>({prepare:query=>{sql=query;return{bind:()=>({all:async()=>({results:rows})})};}})},'@/lib/approved-templates':{loadApprovedTemplate:async kind=>({info:{id:kind,title:'قالب اختبار'},definition:{labels:{title:'عنوان'},clauses:{body:'نموذج فارغ'}}})}});
 const result=await(await route.GET(new Request('https://example.org/api/admin/agent-knowledge'))).json();assert.match(sql,/c\.verified=1/);assert.match(sql,/source_type='official_moj'/);assert.doesNotMatch(sql,/service_records|case_archive/);assert.equal(result.items.length,3);assert.equal(result.skipped,1);assert.equal(result.items[2].sourceId,'legal:1:7');assert.match(result.items[0].sourceSha256,/^[a-f0-9]{64}$/);
});
