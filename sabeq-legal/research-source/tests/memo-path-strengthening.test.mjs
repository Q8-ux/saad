import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const routes=load('../lib/legal-drafting-routes.ts');
const reasoning=load('../lib/case-reasoning.ts');
// All parties, amounts, case identifiers and events below are synthetic.
const base={caseType:'مدني',court:'المحكمة الكلية',courtCircuit:'الدائرة المدنية',clientName:'طرف اصطناعي ألف',otherParty:'طرف اصطناعي باء',partyRole:'مدعى عليه',facts:'مطالبة اصطناعية نازع فيها الطرف في المبلغ وأصل استحقاقه.',requests:'رفض المطالبة الاصطناعية.',documentKind:'memorandum'};
const resolve=changes=>routes.resolveLegalDraftingRoute({...base,...changes});
const conflict=changes=>{const r=resolve(changes);assert.equal(r.status,'needs_clarification');assert.ok(r.issueCodes.includes('self_adverse_relief'));};

test('opponent payment prayers cannot silently become the defendant own relief',()=>{
 for(const target of ['المدعى عليه','المدعى عليها','الشركة المدعى عليها','طرف اصطناعي ألف'])conflict({requests:`إلزام ${target} بدفع مبلغ الاختبار مع المصروفات.`});
});
test('an earlier rejection cannot authorize a later separate adverse payment prayer',()=>{
 conflict({requests:'رفض الدعوى الاصطناعية.\nإلزام المدعى عليه بسداد مبلغ الاختبار.'});
});
test('rejection, reversal, explicit settlements and prayers against another party stay available',()=>{
 for(const requests of ['رفض طلب إلزام المدعى عليه بدفع المبلغ.','إلغاء الحكم القاضي بإلزام المدعى عليه بسداد مبلغ الاختبار.','عدم إلزام المدعى عليه بأداء المبلغ.','إلزام المدعي برد المبلغ.','إلزام المدعى عليه الآخر بدفع مبلغ الاختبار.','أوافق على الصلح وأطلب إلزام المدعى عليه بسداد الدفعة المتفق عليها.','أقر بالدين وأطلب تقسيط المبلغ على المدعى عليه.'])assert.equal(resolve({requests}).status,'ready',requests);
});
test('negated or quoted consent and unrelated factual negation never authorize self-payment',()=>{
 for(const requests of ['لا أوافق على الصلح وأطلب إلزام المدعى عليه بسداد مبلغ الاختبار.','أرفض إثبات الصلح وأطلب إلزام المدعى عليه بدفع مبلغ الاختبار.','قول منقول: «أوافق على الصلح». إلزام المدعى عليه بدفع مبلغ الاختبار.','لعدم ثبوت السداد نطلب إلزام المدعى عليه بدفع مبلغ الاختبار.','أقر أنني لا أدين بالمبلغ. إلزام المدعى عليه بدفع مبلغ الاختبار.','أوافق على ترتيب الأوراق. إلزام المدعى عليه بدفع مبلغ الاختبار.'])conflict({requests});
 const clean=resolve({});assert.equal(routes.reviewLegalRouteContent(clean,{facts:base.facts,grounds:'دفاع اصطناعي',requests:'أوافق على الصلح وأطلب إلزام المدعى عليه بدفع المبلغ.'},base).ok,false);
});
test('an opponent prayer reported in facts does not override the actual defensive request',()=>{
 assert.equal(resolve({facts:base.facts+' طلب المدعي إلزام المدعى عليه بدفع مبلغ الاختبار.'}).status,'ready');
});
test('an enforcement notice for another judgment needs its current procedure identified',()=>{
 const r=resolve({caseType:'تجاري',courtCircuit:'التجارية',caseNumber:'QA-OLD',judgmentNumber:'QA-JUDGMENT',notificationDate:'2026-06-01',facts:'ورد إنذار تنفيذ الحكم القديم بعد انتهاء الدعوى الاصطناعية.',caseStage:''});
 assert.equal(r.status,'needs_clarification');assert.ok(r.issueCodes.includes('current_procedure_unclear'));
 assert.equal(resolve({caseType:'تنفيذ',courtCircuit:'التنفيذ',caseNumber:'QA-EXEC',judgmentNumber:'QA-JUDGMENT',notificationDate:'2026-06-01',facts:'ورد إنذار تنفيذ حكم اصطناعي.',caseStage:'منازعة تنفيذ قائمة'}).status,'ready');
 assert.equal(resolve({documentKind:'claim',partyRole:'مدعٍ',caseNumber:'QA-NEW',judgmentNumber:'QA-JUDGMENT',notificationDate:'2026-06-01',facts:'ورد إنذار تنفيذ حكم سابق وموضوع الدعوى الجديدة تعويض مستقل.'}).status,'ready');
});
test('case-number digit formatting and longer opponent names do not create false conflicts',()=>{
 assert.equal(resolve({caseNumber:'١٢٣ لسنة ٢٠٢٦',judgmentNumber:'123/2026',notificationDate:'2026-06-01',facts:'ورد إنذار تنفيذ حكم اصطناعي.',caseStage:''}).status,'ready');
 assert.equal(resolve({clientName:'شركة اختبار',otherParty:'شركة اختبار أخرى',requests:'إلزام شركة اختبار أخرى بدفع مبلغ الاختبار.'}).status,'ready');
});
test('final output cannot reintroduce an adverse payment request after a clean input',()=>{
 const route=resolve({});
 assert.equal(routes.reviewLegalRouteContent(route,{facts:base.facts,grounds:'دفاع اصطناعي في المبلغ.',requests:'إلزام المدعى عليه بسداد مبلغ الاختبار.'},base).ok,false);
 assert.equal(routes.reviewLegalRouteContent(route,{facts:base.facts,grounds:'دفاع اصطناعي في المبلغ.',requests:'رفض طلب إلزام المدعى عليه بسداد مبلغ الاختبار.'},base).ok,true);
 const agreed={...base,requests:'أوافق على الصلح وأطلب إلزام المدعى عليه بدفع الدفعة المتفق عليها.'};
 assert.equal(routes.reviewLegalRouteContent(resolve(agreed),{facts:base.facts,grounds:'عرض التسوية المأذونة.',requests:agreed.requests},agreed).ok,true);
});
test('each routed family exposes substantive review points to the generation contract',()=>{
 for(const p of routes.legalDraftingProfiles){
  const route=resolve({caseType:p.label,court:'جهة اصطناعية',courtCircuit:'',partyRole:p.id==='misdemeanor'||p.id==='felony'?'متهم':'مدعى عليه',facts:base.facts+' علاقة عمل في القطاع الأهلي.',caseStage:'قضية منظورة'});
  assert.equal(route.status,'ready',p.id);
  const summary=routes.legalRouteSummary(route);assert.ok(summary.reviewChecklist?.length>=3,p.id);
  assert.ok(routes.legalRouteInstructions(route).includes('محاور مراجعة هذا المسار'),p.id);
 }
});
const issue=changes=>({issue:'مقدار المطالبة',factQuote:'نازع فيها الطرف في المبلغ',document:'مستند مذكور ولم يقدم نصه',sourceMarkers:[],application:'بحث مقدار المطالبة في حدود الواقعة الاصطناعية.',counterargument:'قد يتمسك الخصم بكشف الحساب.',response:'يفحص مصدر المبلغ وما يثبت سداده دون افتراض دليل.',proposedRelief:'رفض الجزء غير المثبت من المطالبة.',missing:'',...changes});
const plan=changes=>({clientRole:base.partyRole,opponentRole:'مدعٍ',characterization:'منازعة اصطناعية',issues:[issue(changes)],missingFacts:[],researchGaps:[],precedentMatches:[]});
test('an empty or placeholder reasoning field is not a complete analysis plan',()=>{
 for(const key of ['application','counterargument','response','proposedRelief'])for(const value of ['','   ','TODO','يستكمل لاحقاً'])assert.throws(()=>reasoning.parseCasePlan(JSON.stringify(plan({[key]:value})),base,[]),undefined,`${key}: ${value}`);
 assert.doesNotThrow(()=>reasoning.parseCasePlan(JSON.stringify(plan()),base,[]));
});
test('a proposed adverse prayer is rejected independently of model approval and retried twice only',async()=>{
 const bad=JSON.stringify(plan({proposedRelief:'إلزام المدعى عليه بدفع مبلغ الاختبار.'}));
 assert.throws(()=>reasoning.parseCasePlan(bad,base,[]));
 let attempts=0;
 await assert.rejects(()=>reasoning.buildCheckedCasePlan(base,[],'',async()=>{attempts++;return bad;}),e=>e instanceof reasoning.CasePlanValidationError&&e.code==='relief');
 assert.equal(attempts,2);
});

test('the real input validator blocks contradictory relief even in available-evidence mode',()=>{
 const security=load('../lib/request-security.ts',{'@/db':{}});
 const {validateMemoInput}=load('../lib/memo-input.ts',{'@/lib/request-security':security});
 for(const draftMode of ['', 'available_evidence'])assert.throws(()=>validateMemoInput({...base,draftMode,requests:'إلزام المدعى عليه بدفع مبلغ الاختبار.'}),e=>e.stage==='legal_route_review'&&e.status===422);
});
test('the endpoint refuses a conflicting prayer before payment reservation or any generation',async()=>{
 const security=load('../lib/request-security.ts',{'@/db':{}});
 const {validateMemoInput}=load('../lib/memo-input.ts',{'@/lib/request-security':security});
 let reservations=0,generations=0;
 const {POST}=load('../app/api/legal/memo/route.ts',{
  '@/lib/memo-input':{validateMemoInput},
  '@/lib/approved-templates':{loadApprovedTemplate:async()=>{throw Error('must not load template');}},
  '@/lib/legal-search':{},
  '@/lib/sabeq-agent-bridge':{},
  '@/lib/service-records':{},
  '@/lib/public-auth':{requireMemoUserOrGuest:async()=>null},
  '@/lib/service-settings':{requireServiceEnabled:async()=>{}},
  '@/lib/sadad-payments':{reserveMemoPayment:async()=>{reservations++;return {result:null};},releaseMemoPayment:async()=>{},completeMemoPayment:async()=>{}},
  '@/lib/openai':{generateText:async()=>{generations++;throw Error('must not generate');},openAIErrorResponse:()=>null},
  '@/lib/request-security':security
 });
 const request=new Request('https://sabeq.example/api/legal/memo',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://sabeq.example'},body:JSON.stringify({...base,requests:'إلزام المدعى عليه بدفع مبلغ الاختبار.',draftMode:'available_evidence'})});
 const response=await POST(request);assert.equal(response.status,422);assert.equal(reservations,0);assert.equal(generations,0);
 const result=await response.json();assert.equal(result.stage,'legal_route_review');
});

test('a refused new expert request cannot be added by the plan or final writer',()=>{
 const input={...base,requests:'رفض المطالبة ومناقشة تقرير الخبير. لا نطلب إعادة المأمورية للخبير.'};
 const route=resolve(input);
 assert.equal(route.status,'ready');
 assert.equal(routes.reviewLegalRouteContent(route,{facts:base.facts,grounds:'اعتراضات على تقرير قائم.',requests:'إعادة المأمورية إلى الخبير.'},input).ok,false);
 assert.throws(()=>reasoning.parseCasePlan(JSON.stringify(plan({proposedRelief:'ندب خبير جديد لبحث المبلغ.'})),input,[]));
 assert.equal(routes.reviewLegalRouteContent(route,{facts:base.facts,grounds:'اعتراضات على تقرير قائم.',requests:input.requests},input).ok,true);
 const approved={...base,requests:'ندب خبير لفحص الحساب الاصطناعي.'};
 assert.equal(routes.reviewLegalRouteContent(resolve(approved),{facts:base.facts,grounds:'المسألة الفنية الاصطناعية.',requests:approved.requests},approved).ok,true);
});
test('new clarification questions retain their meaning in all interface languages',()=>{
 const adverse=resolve({requests:'إلزام المدعى عليه بدفع مبلغ الاختبار.'});
 assert.match(routes.legalRouteQuestion(adverse,'en'),/pay|payment/iu);
 assert.match(routes.legalRouteQuestion(adverse,'ur'),/ادائیگی/u);
 assert.equal(routes.legalRouteQuestion(adverse,'ar'),adverse.question);
});
