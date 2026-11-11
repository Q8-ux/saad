import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, templateHarness } from './template-harness.mjs';

const caseData = {caseType:'مدني',court:'المحكمة الكلية',clientName:'شخص اختباري',otherParty:'خصم اختباري',partyRole:'مدعٍ',facts:'واقعة اصطناعية للاختبار فقط بشأن مبلغ لم يتم سداده.',requests:'إلزام الخصم بسداد مبلغ الاختبار.'};
const template = {id:'test',version:1,kind:'claim',title:'نموذج اختبار',sourceSha256:'a'.repeat(64)};
const evidence = [{documentId:1,chunkId:7,title:'مرجع عام اصطناعي',text:'المادة 12 نص اختبار.',reference:'المادة 12',sourceUrl:'https://example.org/public-test',documentType:'قانون',officialSource:'اختبار'}];
const reasoning={factQuote:'مبلغ لم يتم سداده',applicationQuote:'ينصب الخلاف على مبلغ لم يتم سداده بحسب المدخلات، ولذلك يلزم مقابلة قيمة المطالبة بمستند أصل التعامل وتحديد الرصيد محل النزاع.',opposingQuote:'قد ينازع الخصم في بقاء الرصيد أو يدعي سداداً لم ترد مستنداته ضمن بيانات الاختبار.',responseQuote:'والرد أن حسم هذا الاعتراض يتوقف على مطابقة المستندات وبيان أي دفعة متصلة بالمطالبة، دون افتراض ثبوت السداد أو تجاهل ما يقدم بشأنه.'};
const reasoningText=Object.values(reasoning).slice(1).join('\n');
const content = {facts:caseData.facts,requests:caseData.requests,grounds:reasoningText+' 【م1】',fields:{},factualNotes:[],legalResearchNotes:''};
const auditCheck=(options,sources,issueIndex=0,status='addressed',reason='فحص المطالبة والتطبيق والاعتراض والرد')=>{
 const dictionary=JSON.parse(options.input),selected=dictionary.checkOptions.find(o=>o.issueIndex===issueIndex&&o.status===status&&(status!=='addressed'||o.applicationQuote.includes(reasoning.applicationQuote)));
 assert.ok(selected,'synthetic audit must choose a known option from the actual request');
 const key=q=>{const match=dictionary.quoteOptions.find(o=>o.quote.includes(q));assert.ok(match);return match.quoteKey;};
 return {checkKey:selected.checkKey,reason,substance:{opposingQuoteKey:status==='addressed'?key(reasoning.opposingQuote):'none',responseQuoteKey:status==='addressed'?key(reasoning.responseQuote):'none',sourceMarkers:status==='addressed'&&sources.length?['م1']:[]}};
};
const { pleadingAuthorityInstructions } = load('../lib/bound-draft.ts');
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
 assert.ok(sent.caseReasoning.instructions.includes(pleadingAuthorityInstructions));
 assert.equal(sent.caseData.legalRouteId,"civil.monetary_claim.first_instance.claim.claimant");assert.ok(sent.caseReasoning.instructions.includes(sent.caseData.legalRouteId));
});
test('unsafe URLs and missing credentials fail before any remote request',async()=>{
 for(const configuration of [{...runtime,SABEQ_AGENT_URL:'http://agents.example.org/internal/sabeq-agents/memo'},{...runtime,SABEQ_AGENT_URL:'https://secret@agents.example.org/internal/sabeq-agents/memo'},{...runtime,SABEQ_AGENT_BRIDGE_TOKEN:''}]){
  let calls=0;await assert.rejects(bridge(configuration).generateAgentPleading({caseData,fields:{},documentKind:'claim',template,evidence},async()=>{calls++;}));assert.equal(calls,0);
 }
});
test('the agent receives the stored rules for the selected appeal family outside its source evidence',async t=>{
 const h=templateHarness();
 t.after(h.cleanup);
 const appeal=await h.templates.loadApprovedTemplate('appeal');
 await bridge(runtime).generateAgentPleading({
  caseData:{...caseData,caseType:'تجاري',court:'محكمة الاستئناف',partyRole:'مستأنف'},
  fields:{},documentKind:'appeal',template:appeal.info,evidence,referenceStyle:appeal.referenceStyle,
 },async(_url,init)=>{
  const sent=JSON.parse(init.body);
  const instructions=sent.caseReasoning.instructions;
  assert.ok(instructions.includes(appeal.referenceStyle.families.commercial[0]));
  assert.ok(!instructions.includes(appeal.referenceStyle.families.civil[0]));
  assert.equal(sent.template.referenceStyle,undefined);
  assert.equal(sent.sources.length,1);
  assert.equal(sent.sources[0].text,evidence[0].text);
  return reply(sent);
 });
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

function memoRoute(h, {pipeline, sources=evidence, auth=async()=>null, limits=async()=>{},model,record=async()=>{},paid=false,complete=async()=>{},ledger,reserve}) {
 const search=load('../lib/legal-search.ts',{'@/db':{}});
 return load('../app/api/legal/memo/route.ts',{
  '@/lib/approved-templates':h.templates,'@/lib/sabeq-agent-bridge':pipeline,
  '@/lib/sadad-payments':{reserveMemoPayment:reserve|| (async()=>paid?{lease:{id:'synthetic-paid-order'}}:{}),completeMemoPayment:complete,releaseMemoPayment:async()=>{}},
  ...(ledger?{'@/lib/memo-requests':ledger}:{}),
  '@/lib/legal-search':{...search,searchLegalEvidenceAcross:async()=>sources,searchCassationEvidenceAcross:async()=>[],readHandoffEvidence:async()=>[]},
  '@/lib/openai':{deriveLegalResearchPlan:async()=>({searchQueries:[],legalIssues:[]}),openAIErrorResponse:()=>null,generateText:async options=>{
   if(model) return model(options);
   if(options.schema?.properties?.clientRole) return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'مدعى عليه',characterization:'مطالبة',issues:[{issue:'المبلغ',factQuote:'مبلغ لم يتم سداده',document:'',sourceMarkers:sources.length?['م1']:[],application:'فحص أصل المطالبة',counterargument:'منازعة السداد',response:'فحص المستند',proposedRelief:caseData.requests,missing:''}],missingFacts:[],researchGaps:sources.length?[]:['سند غير متاح']});
   if(options.schema?.properties?.checks) return JSON.stringify({checks:[auditCheck(options,sources)],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
   if(options.schema?.properties?.facts) return JSON.stringify({...content,grounds:sources.length?content.grounds:reasoningText});
   throw Error('unexpected fallback');
  }},
  '@/lib/public-auth':{requireMemoUserOrGuest:auth},'@/lib/service-settings':{requireServiceEnabled:async()=>{}},'@/lib/service-records':{enforceUserServiceLimit:limits,recordServiceActivity:record},'@/lib/request-security':{...h.security,enforceRateLimit:async()=>{}}
 });
}
const request=(overrides={})=>new Request('https://example.org/api/legal/memo',{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify({...caseData,...overrides,template:{kind:'appeal'},agentToken:'client-forged'})});

test('conflicting and unresolved routes stop before payment reservation, provider, agents or memo creation',async t=>{
 const h=templateHarness();t.after(h.cleanup);
 for(const enabled of [false,true])for(const input of [{caseType:'جنح',courtCircuit:'الإدارية',partyRole:'متهم'},{caseType:'أخرى',courtCircuit:'',draftMode:'available_evidence'},{caseType:'جنح',courtCircuit:'جنح',partyRole:'شاكي',documentKind:'claim'}]){
  let calls=0;const unexpected=async()=>{calls++;throw Error('route gate was bypassed');};
  const route=memoRoute(h,{pipeline:{agentPipelineEnabled:()=>{calls++;return enabled;},generateAgentPleading:unexpected},model:unexpected,reserve:unexpected,ledger:{startMemoRequest:unexpected,finishMemoRequest:unexpected}});
  const response=await route.POST(request(input));assert.equal(response.status,422);const data=await response.json();assert.equal(data.stage,'legal_route_review');assert.equal(data.missingFacts[0].key,'legal.route');assert.equal(calls,0);
 }
});

test('the selected route reaches all drafting and audit calls and survives both archives unchanged',async t=>{
 const h=templateHarness();t.after(h.cleanup);const expected='civil.monetary_claim.first_instance.claim.claimant',seen=[],archived=[];
 const route=memoRoute(h,{auth:async()=>({id:'synthetic'}),pipeline:{agentPipelineEnabled:()=>false},record:async row=>archived.push(row),ledger:{startMemoRequest:async input=>{assert.equal(input.legalRoute.id,expected);return 'synthetic-routed-memo';},finishMemoRequest:async(...row)=>seen.push(row)},model:async options=>{
  assert.ok(options.instructions.includes(expected));
  if(options.schema?.properties?.clientRole)return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'خصم',characterization:'مطالبة',issues:[{issue:'المطالبة',factQuote:'مبلغ لم يتم سداده',document:'',sourceMarkers:['م1'],application:'فحص المطالبة',counterargument:'منازعة',response:'مراجعة',proposedRelief:caseData.requests,missing:''}],missingFacts:[],researchGaps:[]});
  if(options.schema?.properties?.checks)return JSON.stringify({checks:[auditCheck(options,evidence)],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
  return JSON.stringify(content);
 }});
 const response=await route.POST(request({legalRouteId:'felony.forged'}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.legalRoute.id,expected);assert.equal(archived[0].metadata.legalRoute.id,expected);assert.equal(archived[0].outputText,data.memo);assert.equal(seen.at(-1)[2],data.memo);
});

test('a persistent heading from another route receives one repair and cannot consume payment or archive success',async t=>{
 const h=templateHarness();t.after(h.cleanup);let repairs=0,completed=0,archived=0;const saved=[];
 const wrong={...content,grounds:'مذكرة بدفاع جنح\n'+content.grounds};
 const route=memoRoute(h,{paid:true,complete:async()=>{completed++;},record:async()=>{archived++;},pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:wrong,audit:{}})},ledger:{startMemoRequest:async()=> 'synthetic-route-review',finishMemoRequest:async(...row)=>saved.push(row)},model:async options=>{
  assert.ok(options.instructions.includes('civil.monetary_claim.first_instance.claim.claimant'));
  if(options.schema?.properties?.clientRole)return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'خصم',characterization:'مطالبة',issues:[{issue:'المطالبة',factQuote:'مبلغ لم يتم سداده',document:'',sourceMarkers:['م1'],application:'فحص',counterargument:'منازعة',response:'مراجعة',proposedRelief:caseData.requests,missing:''}],missingFacts:[],researchGaps:[]});
  if(options.schema?.properties?.checks)return JSON.stringify({checks:[auditCheck(options,evidence)],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
  repairs++;assert.equal(JSON.parse(options.input).routeReview.ok,false);return JSON.stringify(wrong);
 }});
 const response=await route.POST(request());assert.equal(response.status,422);const data=await response.json();assert.equal(data.stage,'legal_route_review');assert.ok(data.review.routeIssues.includes('cross_route_heading'));assert.equal(repairs,1);assert.equal(completed,0);assert.equal(archived,0);assert.equal(saved.at(-1)[1],'needs_review');assert.equal(saved.at(-1)[2],'');
});

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
test('missing legal sources keep the request pending instead of exporting an incomplete memo',async t=>{
 const h=templateHarness();t.after(h.cleanup);
 const route=memoRoute(h,{sources:[],pipeline:{agentPipelineEnabled:()=>false}});
 const r=await route.POST(request());assert.equal(r.status,422);const value=await r.json();assert.equal(value.stage,'source_review');assert.ok(value.issues.includes('incomplete_defense_coverage'));assert.equal(value.memo,undefined);
});
test('knowledge export denies unauthorized users without reading any corpus or template',async()=>{
 let reads=0;const auth=load('../lib/admin-service-auth.ts',{'cloudflare:workers':{env:{ADMIN_SERVICE_TOKEN:'a'.repeat(48)}},'@/db':{getD1:()=>{reads++;throw Error();}}});
 const route=load('../app/api/admin/agent-knowledge/route.ts',{'@/lib/admin-service-auth':auth,'@/db':{getD1:()=>{reads++;throw Error();}},'@/lib/approved-templates':{loadApprovedTemplate:async()=>{reads++;throw Error();}}});
 const r=await route.GET(new Request('https://example.org/api/admin/agent-knowledge'));assert.equal(r.status,401);assert.equal(reads,0);
});
test('knowledge export queries only verified public MOJ sources and approved blank templates',async()=>{
 let sql;const rows=[{chunkId:7,documentId:1,title:'اختبار عام',text:'مقتطف عام اصطناعي',sourceUrl:'https://moj.gov.kw/test.pdf'},{chunkId:8,documentId:2,title:'مرفق خاص مرفوض',text:'نص خاص',sourceUrl:'https://private.example/test.pdf'}];
 const route=load('../app/api/admin/agent-knowledge/route.ts',{'@/lib/admin-service-auth':{requireAdminService:()=>null,adminJson:Response.json.bind(Response)},'@/db':{getD1:()=>({prepare:query=>{sql=query;return{bind:()=>({all:async()=>({results:rows})})};}})},'@/lib/approved-templates':{loadApprovedTemplate:async kind=>({info:{id:kind,title:'قالب اختبار'},definition:{labels:{title:'عنوان'},clauses:{body:'نموذج فارغ'}}})}});
 const result=await(await route.GET(new Request('https://example.org/api/admin/agent-knowledge'))).json();assert.match(sql,/c\.verified=1/);assert.match(sql,/source_type='official_moj'/);assert.doesNotMatch(sql,/service_records|case_archive/);assert.equal(result.items.length,3);assert.equal(result.skipped,1);assert.equal(result.items[2].sourceId,'legal:1:7');assert.match(result.items[0].sourceSha256,/^[a-f0-9]{64}$/);
});


test('independent audit rejects a reversed agent defense after one correction without archiving',async t=>{
 const h=templateHarness();t.after(h.cleanup);let audited=0,revised=0,archived=0;
 const route=memoRoute(h,{auth:async()=>({id:'test-user'}),record:async()=>{archived++;},pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content},audit:{}})},model:async options=>{
  if(options.schema?.properties?.clientRole)return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'خصم',characterization:'مطالبة',issues:[{issue:'المطالبة',factQuote:'مبلغ لم يتم سداده',document:'',sourceMarkers:['م1'],application:'فحص',counterargument:'منازعة',response:'مراجعة',proposedRelief:'الطلب المدخل',missing:''}],missingFacts:[],researchGaps:[]});
  if(options.schema?.properties?.checks){audited++;return JSON.stringify({checks:[auditCheck(options,[],0,'omitted','مخالفة مركز الموكل')],roleConsistent:false,factsPreserved:true,reliefConsistent:false,unsupportedAssertions:[]});}
  revised++;return JSON.stringify(content);
 }});
 const response=await route.POST(request());assert.equal(response.status,422);assert.equal(audited,2);assert.equal(revised,1);assert.equal(archived,0);assert.doesNotMatch(await response.text(),/secret/);
});

// Synthetic legal identities used only to exercise the actual memo route.
const controlSource={...evidence[0],documentId:98765,title:'قانون اختباري غير حقيقي',lawNumber:98765,lawYear:2000,text:'نص اصطناعي لتجربة بوابة المذكرة.',corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',articleIdentityUnique:true,articleNumber:'12',lawIdentity:{number:98765,year:2000}}};
function controlledMemoModel(correction,onCorrection=()=>{}) {
 return async options=>{
  if(options.schema?.properties?.clientRole)return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'مدعى عليه',characterization:'مطالبة',issues:[{issue:'المبلغ',factQuote:'مبلغ لم يتم سداده',document:'',sourceMarkers:['م1'],application:'فحص أصل المطالبة',counterargument:'منازعة السداد',response:'فحص المستند',proposedRelief:caseData.requests,missing:''}],missingFacts:[],researchGaps:[]});
  if(options.schema?.properties?.checks)return JSON.stringify({checks:[auditCheck(options,[controlSource])],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
  if(options.schema?.properties?.grounds&&!options.schema?.properties?.facts){onCorrection();return JSON.stringify({grounds:reasoningText+'\n'+correction});}
  throw Error('unexpected control test call');
 };
}
test('direct drafting and its existing correction receive the same concise rules without extra model calls',async t=>{
 const h=templateHarness();t.after(h.cleanup);let calls=0,audits=0;const drafting=[];
 const baseline=controlledMemoModel('');
 const route=memoRoute(h,{sources:[controlSource],pipeline:{agentPipelineEnabled:()=>false},model:async options=>{
  calls++;
  if(options.schema?.properties?.facts){
   drafting.push(options.instructions);
   return JSON.stringify(content);
  }
  if(options.schema?.properties?.checks){
   audits++;
   return JSON.stringify({checks:[auditCheck(options,[controlSource])],roleConsistent:audits>1,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
  }
  return baseline(options);
 }});
 const response=await route.POST(request());const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));
 assert.equal(drafting.length,2);assert.equal(audits,2);assert.equal(calls,5);
 for(const instructions of drafting)assert.ok(instructions.includes(pleadingAuthorityInstructions));
 assert.ok(value.memo.includes(caseData.facts));assert.ok(value.memo.includes(caseData.requests));
 assert.ok(value.memo.includes(controlSource.text));
 assert.equal(value.caseQuality.humanReviewRequired,true);
 assert.doesNotMatch(value.memo,/ست قواعد لتحرير|factualNotes|legalResearchNotes|ملاحظات تقنية/);
});

test('actual agent finalization retains statutory wording through language cleanup and success archiving',async t=>{
 const h=templateHarness();t.after(h.cleanup);const archived=[];
 // These words trigger prose cleanup outside quotes, but are protected in a
 // fictional statutory passage. No real law or private case is used.
 const source={...controlSource,text:'نص اصطناعي عن المساعد الاختباري: مطلوب إرفاق نص القانون في تجربة البرمجيات فقط.'};
 const route=memoRoute(h,{sources:[source],auth:async()=>({id:'synthetic-article-test'}),record:async row=>archived.push(row),pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content},audit:{}})},model:controlledMemoModel('')});
 const response=await route.POST(request());const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));
 assert.ok(value.memo.includes(source.text));assert.ok(JSON.stringify(value.document.pages).includes(source.text));
 assert.equal(archived.length,1);assert.ok(archived[0].outputText.includes(source.text));
 assert.doesNotMatch(value.memo,/يتولى المساعد البحث/);
});
test('a paid memo rejects a wrong repeated article after one correction without a success archive',async t=>{
 const h=templateHarness();t.after(h.cleanup);let corrections=0,archived=0;
 const wrong='المادة (12) مكرر من القانون رقم 98765 لسنة 2000 【م1】';
 const route=memoRoute(h,{paid:true,sources:[controlSource],auth:async()=>({id:'control-test-user'}),record:async()=>{archived++;},pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content,grounds:wrong},audit:{}})},model:controlledMemoModel(wrong,()=>{corrections++;})});
 const response=await route.POST(request());assert.equal(response.status,422);const value=await response.json();
 assert.equal(value.stage,'source_review');assert.ok(value.issues.includes('unverified_article'));assert.equal(corrections,1);assert.equal(archived,0);assert.match(value.error,/احتُفظ ببياناتك/);
});
test('memo control accepts a source-corrected draft and preserves facts and requested relief',async t=>{
 const h=templateHarness();t.after(h.cleanup);let corrections=0;const archived=[];
 const wrong='المادة (12) مكرر من القانون رقم 98765 لسنة 2000 【م1】';
 const correct='تنص المادة 12 من القانون رقم 98765 لسنة 2000 على «نص اصطناعي لتجربة بوابة المذكرة.» 【م1】';
 const route=memoRoute(h,{sources:[controlSource],auth:async()=>({id:'control-test-user'}),record:async value=>{archived.push(value);},pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content,grounds:wrong},audit:{}})},model:controlledMemoModel(correct,()=>{corrections++;})});
 const response=await route.POST(request());assert.equal(response.status,200);const value=await response.json();
 assert.equal(corrections,1);assert.equal(archived.length,1);assert.ok(value.memo.includes(caseData.facts));assert.ok(value.memo.includes(caseData.requests));assert.doesNotMatch(value.memo,/مكرر|【م\d+】/);assert.equal(value.caseQuality.humanReviewRequired,true);assert.equal(value.memoControlRevision,'memo-generation-control-1');
});

test('health reports the same control revision used by the memo validator', async () => {
  const api = load('../app/api/health/route.ts', {
    'cloudflare:workers': { env: {} },
    '@/db': { getD1: () => ({ prepare: () => ({ first: async () => ({ count: 0 }) }) }) },
    '@/lib/request-security': { privateJson: Response.json.bind(Response) },
  });
  const value = await (await api.GET()).json();
  assert.equal(value.memoControlRevision, 'memo-generation-control-1');
  assert.equal(value.defenseRevision, 'grounded-defenses-5');
  assert.equal(value.legalDraftingRouteRevision, 'legal-drafting-routes-2');
});

test('an unpaid source failure remains pending and never archives a facts-only substitute',async t=>{
 const h=templateHarness();t.after(h.cleanup);const archived=[];
 const wrong='المادة (12) مكرر من القانون رقم 98765 لسنة 2000 【م1】';
 const route=memoRoute(h,{sources:[controlSource],auth:async()=>({id:'synthetic-unpaid-case'}),record:async row=>archived.push(row),pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content,grounds:wrong},audit:{}})},model:controlledMemoModel(wrong)});
 const response=await route.POST(request());const value=await response.json();
 assert.equal(response.status,422);assert.equal(value.stage,'source_review');assert.equal(value.memo,undefined);assert.equal(value.document,undefined);assert.ok(value.issues.includes('unverified_article'));assert.equal(archived.length,0);
});
test('an audit provider outage remains a service failure, not a claim that the legal facts failed review',async t=>{
 const h=templateHarness();t.after(h.cleanup);const baseline=controlledMemoModel('');
 const route=memoRoute(h,{sources:[controlSource],pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content},audit:{}})},model:async options=>{
  if(options.schema?.properties?.checks)throw Error('synthetic provider outage');
  return baseline(options);
 }});
 const response=await route.POST(request());assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/لم تكتمل مراجعة اتساق|synthetic provider/);
});

test('unquotable corpus passages are excluded before planning and cannot become a complete memo',async t=>{
 const h=templateHarness();t.after(h.cleanup);let plans=0;
 const corrupted={...controlSource,text:'املادة مخسة جتاوز سبعامئة مخسني عىل هبا'};
 const route=memoRoute(h,{sources:[corrupted],pipeline:{agentPipelineEnabled:()=>false},model:async options=>{
  if(options.schema?.properties?.clientRole){
   plans++;assert.doesNotMatch(options.input,/املادة|مخسة|98765/);
   return JSON.stringify({clientRole:caseData.partyRole,opponentRole:'مدعى عليه',characterization:'مطالبة',issues:[{issue:'المبلغ',factQuote:reasoning.factQuote,document:'المدخلات',sourceMarkers:[],application:'فحص أصل المطالبة',counterargument:'منازعة السداد',response:'فحص المستند',proposedRelief:caseData.requests,missing:''}],missingFacts:[],researchGaps:['السند القانوني يحتاج مراجعة']});
  }
  if(options.schema?.properties?.facts)return JSON.stringify({...content,grounds:reasoningText});
  if(options.schema?.properties?.checks)return JSON.stringify({checks:[auditCheck(options,[])],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
  throw Error('unexpected source-filter test call');
 }});
 const response=await route.POST(request());const value=await response.json();
 assert.equal(response.status,422,JSON.stringify(value));assert.equal(plans,1);assert.equal(value.stage,'source_review');assert.equal(value.memo,undefined);assert.ok(value.issues.includes('incomplete_defense_coverage'));
});
test('one blocked issue prevents partial delivery for both paid and unpaid memoranda',async t=>{
 for(const paid of [false,true]){
  const h=templateHarness();t.after(h.cleanup);let audits=0,revisions=0;
  const baseline=controlledMemoModel('');
  const route=memoRoute(h,{paid,sources:[controlSource],pipeline:{agentPipelineEnabled:()=>false},model:async options=>{
   if(options.schema?.properties?.clientRole){const p=JSON.parse(await baseline(options));p.issues.push({...p.issues[0],issue:'مسألة المستند غير المرفق',sourceMarkers:[],missing:'المستند غير مرفق'});p.missingFacts=['المستند غير مرفق'];return JSON.stringify(p);}
   if(options.schema?.properties?.checks){audits++;return JSON.stringify({checks:[auditCheck(options,[controlSource]),auditCheck(options,[],1,'blocked','المستند غير مرفق')],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});}
   if(options.schema?.properties?.facts){revisions++;return JSON.stringify(content);}
   throw Error('unexpected partial test call');
  }});
  const response=await route.POST(request());const value=await response.json();assert.equal(audits,2);assert.equal(revisions,2);
  assert.equal(response.status,422,JSON.stringify(value));assert.equal(value.memo,undefined);
  assert.equal(value.stage,'defense_review');assert.equal(value.review.blockedIssueIndexes[0],1);assert.equal(value.review.unsupportedAssertionCount,0);assert.doesNotMatch(JSON.stringify(value.review),/مبلغ لم يتم سداده|المستند غير مرفق/);
 }
});

test('prose cleanup runs before statutory decoration so a removed internal source line receives the existing correction',async t=>{
 const h=templateHarness();t.after(h.cleanup);let corrections=0;const archived=[];
 const dirty=reasoningText+'\nملاحظات المراجعة الداخلية 【م1】';
 const route=memoRoute(h,{sources:[controlSource],auth:async()=>({id:'synthetic-cleanup-order'}),record:async row=>archived.push(row),pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:{...content,grounds:dirty},audit:{}})},model:controlledMemoModel('【م1】',()=>{corrections++;})});
 const response=await route.POST(request());const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));assert.equal(corrections,1);
 assert.ok(value.memo.includes(controlSource.text));assert.doesNotMatch(value.memo,/ملاحظات المراجعة|يتولى المساعد/);assert.equal(value.caseQuality.audit.ok,true);assert.equal(archived.length,1);
});

test('missing facts or relief are corrected once on either drafting path before identical final text reaches both archives',async t=>{
 for(const agents of [false,true])for(const field of ['facts','requests']){
  const h=templateHarness();t.after(h.cleanup);const records=[],ledger=[],baseline=controlledMemoModel('【م1】');let drafts=0,completed=0;
  const broken={...content,[field]:''};
  const route=memoRoute(h,{paid:true,sources:[controlSource],auth:async()=>({id:'synthetic-complete-case'}),record:async row=>records.push(row),complete:async()=>{completed++;},
   ledger:{startMemoRequest:async()=> 'synthetic-complete-request',finishMemoRequest:async(...args)=>ledger.push(args)},
   pipeline:{agentPipelineEnabled:()=>agents,generateAgentPleading:async()=>({content:broken,audit:{}})},
   model:async options=>{
    if(options.schema?.properties?.facts){drafts++;return JSON.stringify(agents||drafts>1?content:broken);}
    return baseline(options);
   }});
  const response=await route.POST(request()),result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));assert.equal(drafts,agents?1:2);
  assert.equal(result.caseQuality.contentReview.ok,true);assert.equal(result.engineRevision,'complete-memorandum-delivery-1');
  assert.ok(result.memo.includes(caseData.facts));assert.ok(result.memo.includes(caseData.requests));assert.ok(result.memo.includes(controlSource.text));
  assert.equal(records.length,1);assert.equal(records[0].outputText,result.memo);
  assert.equal(ledger.filter(row=>row[3]==='draft_generated').length,1);assert.equal(ledger.find(row=>row[3]==='draft_generated')[2],result.memo);assert.equal(completed,1);
 }
});
test('persistent missing relief cannot be silently filled from the input, archived or consume a paid entitlement',async t=>{
 const h=templateHarness();t.after(h.cleanup);const baseline=controlledMemoModel('【م1】'),broken={...content,requests:''},ledger=[];let repairs=0,archived=0,completed=0;
 const route=memoRoute(h,{paid:true,sources:[controlSource],auth:async()=>({id:'synthetic-incomplete-case'}),record:async()=>{archived++;},complete:async()=>{completed++;},
  ledger:{startMemoRequest:async()=> 'synthetic-incomplete-request',finishMemoRequest:async(...args)=>ledger.push(args)},
  pipeline:{agentPipelineEnabled:()=>true,generateAgentPleading:async()=>({content:broken,audit:{}})},
  model:async options=>{if(options.schema?.properties?.facts){repairs++;return JSON.stringify(broken);}return baseline(options);}});
 const response=await route.POST(request()),result=await response.json();
 assert.equal(response.status,422);assert.equal(result.stage,'document_review');assert.equal(result.memo,undefined);
 assert.equal(repairs,1);assert.equal(archived,0);assert.equal(completed,0);
 assert.ok(result.review.sectionIssues.some(issue=>issue.section==='requests'));
 assert.ok(ledger.every(row=>!row[2]&&row[3]!=='draft_generated'));
});
