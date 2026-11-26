import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from './template-harness.mjs';

// Invented authority identifiers below are software fixtures, never real law.
const input={...JSON.parse(readFileSync(new URL('./fixtures/synthetic-loan.json',import.meta.url),'utf8')),contactEmail:'reply@example.test',contactPhone:'80000000',informationConfirmed:true};
const source={documentId:1,title:'قانون اختباري غير حقيقي',lawNumber:98765,lawYear:2000,text:'نص اصطناعي لا يمثل قاعدة قانونية حقيقية ويستخدم لاختبار الربط فقط.',corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',articleIdentityUnique:true,articleNumber:'12',lawIdentity:{number:98765,year:2000}}};
const pleading=load('../lib/pleading-document.ts');
const strongGrounds=(prefix='')=>`${prefix}\n1- الدفع الاختباري في مقدار الرصيد محل المطالبة
توضح العينة أن أصل القرض لا ينازع فيه المدعى عليه، وأن الخلاف ينحصر في مقدار الرصيد بعد السداد الجزئي، ولذلك يجب فصل أصل الالتزام عن قيمة الزيادة المتنازع عليها ومقابلة كل مبلغ بما يخصه من بيانات الاختبار دون افتراض واقعة لم تقدم.
وقد يعترض الخصم بأن المطالبة بكامل المبلغ تكفي بذاتها أو بأن السداد الجزئي غير مؤثر، إلا أن الرد الاختباري يقتضي فحص تاريخ الحوالة وصلتها بالدين وإقرار الاستلام الوارد في العينة، مع إبقاء النتيجة مشروطة بما يثبت من المستندات الفعلية أمام المراجع.
كما أن صورة الإقرار الموصوفة بأنها غير واضحة لا تعامل في هذا الاختبار كأصل مقروء أو دليل حاسم؛ بل يبين أثر النقص وحدود ما يمكن استخلاصه منه، ويظل طلب تقديم الأصل مرتبطاً بالمنازعة المحددة من دون إضافة طلب جديد أو قلب صفة أي طرف.
ويفصل التحليل كذلك بين الرصيد والزيادة والفوائد أو الغرامات، فلا ينسب إلى العينة اتفاق غير مذكور ولا يحول غياب المستند إلى براءة أو إقرار، ويعرض أقوى اعتراض والرد عليه بصورة مستقلة قبل الوصول إلى الطلبات الختامية.
ويطبق النص الاصطناعي المرتبط بالمصدر على المسألة في حدود الاختبار البرمجي وحده، من غير اعتباره قانوناً حقيقياً أو نقله إلى قضية فعلية، وتبقى أي نتيجة قانونية مرهونة بمصدر رسمي تمت مراجعته فعلاً 【م1】`;
const original={facts:input.facts,grounds:strongGrounds(),requests:input.requests,factualNotes:[],legalResearchNotes:'',fields:Object.fromEntries(Object.keys(pleading.pleadingFields).map(k=>[k,'']))};
function pipeline(review,runtime={}){
 const events=[],saved=[];let completed=0,primaryInput='';
 class MetaError extends Error{constructor(code){super(code);this.code=code;}}
 const security=load('../lib/request-security.ts',{'@/db':{}});
 const reasoning={caseReasoningInstructions:'تعليمات اختبار',caseResearchQueries:()=>[],approvedCaseFacts:()=>input.facts,buildCheckedCasePlan:async()=>({issues:[],missingFacts:[],researchGaps:[]}),applyCheckedJudgmentMatches:e=>e,CasePlanValidationError:class extends Error{},caseAuditRequestForContent:()=>({schema:{}}),parseGroundedCaseAudit:()=>({ok:true,complete:true}),reviewCaseContent:()=>({ok:true}),caseQualitySummary:()=>({status:'review_required'})};
 const api=load('../app/api/legal/memo/route.ts',{
  'cloudflare:workers':{env:runtime},
  '@/lib/text-runtime':{resolveTextEnvironment:async()=>runtime},
  '@/lib/case-reasoning':reasoning,
  '@/lib/approved-templates':{loadApprovedTemplate:async()=>({info:{title:'نموذج اختبار',sourceFilename:'synthetic'},definition:{},referenceStyle:{}})},
  '@/lib/memorandum-reference-style':{selectDraftingReference:()=>({instructions:'',memorandumTitle:'مذكرة وهمية'})},
  '@/lib/legal-search':{searchLegalEvidenceAcross:async()=>[source],searchCassationEvidenceAcross:async()=>[],readHandoffEvidence:async()=>[],formatEvidence:()=>JSON.stringify([source]),isCassationEvidence:()=>false},
  '@/lib/legal-source-coverage':{formatSourceCoverage:()=>'',legalSourceCoverage:()=>({})},
  '@/lib/pleading-document':{...pleading,buildPleadingDocument:(_a,_b,kind,_input,content)=>({kind,title:'مذكرة وهمية',pages:[],content}),pleadingText:doc=>doc.content.grounds},
  '@/lib/public-auth':{requireMemoUserOrGuest:async()=>null},
  '@/lib/service-settings':{requireServiceEnabled:async()=>{}},
  '@/lib/service-records':{},
  '@/lib/request-security':{...security,enforceRateLimit:async()=>{}},
  '@/lib/memo-requests':{startMemoRequest:async()=> 'synthetic-route-request',finishMemoRequest:async(...args)=>saved.push(args)},
  '@/lib/sadad-payments':{reserveMemoPayment:async()=>({}),releaseMemoPayment:async()=>{},completeMemoPayment:async()=>completed++},
  '@/lib/openai':{deriveLegalResearchPlan:async(_i,_s,provider)=>{assert.equal(provider,'openai');return{searchQueries:[],legalIssues:[]};},generateText:async options=>{events.push('openai');assert.equal(options.primaryProvider,'openai');primaryInput ||= options.input;return JSON.stringify(original);},openAIErrorResponse:()=>null},
  '@/lib/meta-memo-review':{MetaMemoReviewError:MetaError,sequentialMemoRevision:'test-sequential',reviewMetaMemo:async data=>{events.push('meta');assert.equal(data.primaryInput,primaryInput);assert.equal(data.openaiDraft.facts,original.facts);return {content:await review(data,MetaError),model:'synthetic-meta'};}},
 });
 return {events,saved,get completed(){return completed;},async run(){const response=await api.POST(new Request('https://sabeq.example/api/legal/memo',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://sabeq.example'},body:JSON.stringify(input)}));return {status:response.status,body:await response.json()};}};
}
test('the real memo route sends OpenAI input and draft to Meta and uses the reviewed content',async()=>{
 const p=pipeline(async data=>({...data.openaiDraft,grounds:strongGrounds('META-CORRECTED — مراجعة اصطناعية للمسودة')}));
 const result=await p.run();assert.equal(result.status,200);assert.match(result.body.memo,/META-CORRECTED/);assert.equal(result.body.modelReview.primary,'openai');assert.equal(result.body.modelReview.secondary.status,'completed');assert.deepEqual(p.events,['openai','meta','openai']);assert.equal(p.completed,1);
});
test('a Meta edit containing an invented article cannot pass source review or consume payment',async()=>{
 const p=pipeline(async data=>({...data.openaiDraft,grounds:'المادة 99 من القانون رقم 98765 لسنة 2000 【م1】'}));
 const result=await p.run();assert.equal(result.status,422);assert.equal(result.body.stage,'source_review');assert.ok(result.body.issues.includes('unverified_article'));assert.equal(result.body.memo,undefined);assert.equal(p.completed,0);assert.ok(p.saved.every(row=>!row[2]));
});
test('a missing Meta key cannot be marked reviewed or consume payment',async()=>{
 const p=pipeline(async(_data,MetaError)=>{throw new MetaError('configuration');});
 const result=await p.run();assert.equal(result.status,503);assert.equal(result.body.stage,'meta_review');assert.equal(result.body.serviceCode,'meta_configuration');assert.equal(result.body.memo,undefined);assert.equal(p.completed,0);assert.equal(p.saved.at(-1)[3],'meta_configuration');
});

test('the public research mirror keeps OpenAI as writer even if an unavailable alternate is named',async()=>{
 const p=pipeline(async data=>{assert.equal(data.primaryProvider,'openai');return data.openaiDraft;},{LEGAL_AI_PROVIDER:'magnitude',MAGNITUDE_ENABLED:'enabled',MAGNITUDE_SCOPE:'memo-and-assistant'});
 const result=await p.run();assert.equal(result.status,200);assert.equal(result.body.modelReview.primary,'openai');assert.equal(result.body.modelReview.secondary.status,'completed');assert.equal(p.completed,1);
});
