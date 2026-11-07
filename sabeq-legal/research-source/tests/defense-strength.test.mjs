import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, templateHarness } from './template-harness.mjs';
const api=load('../lib/case-reasoning.ts');
const pleadings=load('../lib/pleading-document.ts');
// Synthetic facts only. No invented legal authorities are used as real law.
const input={clientName:'طرف اختباري ألف',otherParty:'طرف اختباري باء',partyRole:'مدعى عليه',caseType:'مدني',court:'محكمة اختبارية',facts:'تم سداد المبلغ على دفعتين ويطالب الخصم بالمبلغ ذاته.',requests:'رفض المطالبة بالمبلغ المسدد.'};
const issue={issue:'منازعة تكرار المطالبة',factQuote:'تم سداد المبلغ على دفعتين',document:'وصف تحويلات لم ترفق',sourceMarkers:[],application:'ربط الدفعتين بالمبلغ المطالب به',counterargument:'قد تتعلق التحويلات بتعامل آخر',response:'فحص جهة التحويل والغرض منه قبل حساب الرصيد',proposedRelief:input.requests,missing:''};
const plan={clientRole:input.partyRole,opponentRole:'مدعٍ',characterization:'مطالبة بمبلغ',issues:[issue],missingFacts:[],researchGaps:['لم يسترجع سند قانوني مناسب']};
const generic='يتمسك مقدم المذكرة بكافة أوجه الدفاع والدفوع المقررة قانوناً، وبما يقدم من مستندات ومذكرات شارحة.';
const content={facts:input.facts,grounds:generic,requests:input.requests,fields:{},factualNotes:[],legalResearchNotes:''};
const audit={checks:[{issueIndex:0,status:'addressed',reason:'أعيد فحص السداد',substance:{factQuote:issue.factQuote,applicationQuote:'اقتباس مختلق غير موجود في النص النهائي',opposingQuote:'قد تتعلق التحويلات بتعامل آخر',responseQuote:'اقتباس آخر مختلق لا يظهر في المذكرة',sourceMarkers:[]}}],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]};
const application='تم سداد المبلغ على دفعتين بحسب المدخلات؛ وتقتضي منازعة الرصيد مقابلة كل دفعة بالمبلغ المطالب به قبل وصفه بأنه غير مسدد.';
const opposing='قد يثار أن الدفعتين ترتبطان بتعامل آخر بين الطرفين، وهو احتمال يحتاج إلى فحص الغرض من التحويل.';
const response='والرد أن منازعة الرصيد لا تحسم بوجود التحويل وحده؛ بل تقارن الجهة المستفيدة وبيانات التحويل بالمطالبة حتى يتضح نطاق المبلغ المتنازع عليه.';
const strong={...content,grounds:`أولاً: منازعة تكرار المطالبة\n${application}\n${opposing}\n${response}`};
const strongAudit={...audit,checks:[{...audit.checks[0],substance:{factQuote:issue.factQuote,applicationQuote:application,opposingQuote:opposing,responseQuote:response,sourceMarkers:[]}}]};

test('a generic defense cannot pass merely because the auditor says addressed',()=>{
 const result=api.parseCaseAudit(JSON.stringify(audit),plan,content,[]);
 assert.equal(result.ok,false);
});
test('empty defense content is never replaced by a stock reservation in the actual memorandum',async t=>{
 const h=templateHarness();t.after(h.cleanup);
 const template=await h.templates.loadApprovedTemplate('claim');
 const doc=pleadings.buildPleadingDocument(template.info,template.definition,'memorandum',input,{...content,grounds:''});
 assert.doesNotMatch(pleadings.pleadingText(doc),/يتمسك مقدم المذكرة بكافة أوجه الدفاع/);
 assert.doesNotMatch(pleadings.pleadingText(doc),/الدفوع وأوجه الدفاع|يتمسك مقدم المذكرة بما ثبت/);
});
test('reasoned factual arguments can pass the audit without becoming legally complete or inventing authorities',()=>{
 const result=api.parseCaseAudit(JSON.stringify(strongAudit),plan,strong,[]);
 assert.equal(result.ok,true);assert.equal(result.defenseReview.addressed,1);
 assert.equal(api.caseQualitySummary(plan,result,strong,0).status,'incomplete');
 assert.equal(api.caseQualitySummary(plan,result,strong,0).defenseRevision,'grounded-defenses-2');
});
test('invented quotes, altered fact anchors, empty rebuttals and repeated prose fail even with a positive semantic vote',()=>{
 for(const changes of [{factQuote:'إقرار كامل من الخصم'}, {applicationQuote:'تم السداد'}, {responseQuote:application}, {opposingQuote:'اقتباس مختلق لم يرد في المذكرة الحالية'}]){
  const changed={...strongAudit,checks:[{...strongAudit.checks[0],substance:{...strongAudit.checks[0].substance,...changes}}]};
  assert.equal(api.parseCaseAudit(JSON.stringify(changed),plan,strong,[]).ok,false);
 }
 const doubled={...plan,issues:[issue,{...issue,issue:'مسألة ثانية مستقلة'}]};
 const repeated={...strongAudit,checks:[strongAudit.checks[0],{...strongAudit.checks[0],issueIndex:1}]};
 assert.equal(api.parseCaseAudit(JSON.stringify(repeated),doubled,strong,[]).ok,false);
});
test('a defense must cite its own planned source, not a different source elsewhere in the memo',()=>{
 const sources=[{documentId:1,text:'مصدر اصطناعي ألف'},{documentId:2,text:'مصدر اصطناعي باء'}];
 const sourced={...plan,researchGaps:[],issues:[{...issue,sourceMarkers:['م1']}]};
 const reviewed={...strongAudit,checks:[{...strongAudit.checks[0],substance:{...strongAudit.checks[0].substance,sourceMarkers:['م1']}}]};
 assert.equal(api.parseCaseAudit(JSON.stringify(reviewed),sourced,{...strong,grounds:strong.grounds+' 【م1】'},sources).ok,true);
 for(const markers of [[],['م2'],['م99'],['م1','م1']]){
  const wrong={...reviewed,checks:[{...reviewed.checks[0],substance:{...reviewed.checks[0].substance,sourceMarkers:markers}}]};
  assert.equal(api.parseCaseAudit(JSON.stringify(wrong),sourced,{...strong,grounds:strong.grounds+' 【م1】 【م2】'},sources).ok,false);
 }
 assert.equal(api.parseCaseAudit(JSON.stringify(reviewed),sourced,strong,sources).ok,false);
});
test('blocked research remains incomplete and does not require fabricated reasoning excerpts',()=>{
 const blocked={...strongAudit,checks:[{issueIndex:0,status:'blocked',reason:'لا يتوافر سند للمسألة',substance:{factQuote:'',applicationQuote:'',opposingQuote:'',responseQuote:'',sourceMarkers:[]}}]};
 const result=api.parseCaseAudit(JSON.stringify(blocked),plan,{...content,grounds:''},[]);
 assert.equal(result.ok,false);assert.equal(result.defenseReview.blocked,1);assert.equal(result.complete,false);
 assert.equal(api.parseCaseAudit(JSON.stringify(blocked),plan,content,[]).ok,false);
});
test('retrieval preserves candidates for later issues instead of filling the budget from the first query',()=>{
 const search=load('../lib/legal-search.ts',{'@/db':{}});
 const s=(id)=>({documentId:id,reference:'سجل '+id,text:'مصدر بحث اصطناعي'});
 const result=search.mergeLegalEvidenceSets([[s(1),s(2),s(3)],[s(4),s(1)],[s(5),s(6)]],4);
 assert.deepEqual(Array.from(result,s=>s.documentId),[1,4,5,2]);
 assert.equal(search.mergeLegalEvidenceSets([],12).length,0);
});
test('payment and expert objections get targeted searches without invented article or appeal numbers',()=>{
 const queries=api.caseResearchQueries({...input,facts:input.facts+' لم تقدم أصول العقود وورد اختلاف مبالغ في تقرير الخبير.'}).join('\n');
 assert.match(queries,/قانون الإثبات أصول المحررات/);assert.match(queries,/قانون تنظيم الخبرة/);assert.match(queries,/القانون المدني الوفاء/);
 assert.doesNotMatch(queries,/المادة|الطعن رقم|\d/);
});
test('language cleanup preserves an actual argument after statutory identity is attached',()=>{
 const policy=load('../lib/legal-language.ts');
 const paragraph=response+' (المادة 12 من قانون اصطناعي للاختبار فقط)';
 assert.equal(policy.removeDelegatedResearch(paragraph),paragraph);
 for(const verb of ['يقدم','يراجع','يتحقق']){
  const text=`ينازع الطرف في مبلغ المطالبة ويبين ما ${verb} بشأن المستند محل النزاع (المادة 12 من قانون اصطناعي).`;
  assert.equal(policy.removeDelegatedResearch(text),text);
 }
 assert.match(policy.removeDelegatedResearch('يرجى إرفاق النص القانوني.'),/يتولى المساعد البحث/);
});
test('optional secondary review stays off without explicit data approval and credentials',async()=>{
 let calls=0;
 const reviewer=load('../lib/meta-secondary-review.ts',{'cloudflare:workers':{env:{}},'./llama-openrouter':{openRouterAsResponses:async()=>{calls++;throw Error('must not run');},DEFAULT_FREE_LLAMA_MODEL:'synthetic:free'}});
 for(const runtime of [{},{OPENROUTER_API_KEY:'synthetic'},{SABEQ_META_SECOND_REVIEW:'enabled',OPENROUTER_API_KEY:'synthetic'},{SABEQ_META_CASE_DATA_APPROVED:'approved',OPENROUTER_API_KEY:'synthetic'}])assert.equal(reviewer.secondaryReviewConfigured(runtime),false);
 assert.equal(await reviewer.reviewMissingLegalIssues([{issue:'مسألة اختبارية'}],strong.grounds),null);assert.equal(calls,0);
});
