import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from './template-harness.mjs';
const api=load('../lib/case-reasoning.ts');
// Entirely synthetic fixtures, not real cases or real legal citations.
const input={clientName:'طرف اختباري',partyRole:'مدعى عليه',otherParty:'شركة تأمين اختبارية',caseType:'مدني',facts:'شركة تأمين تطالب بمبلغ إصلاح بعد صلح جزئي وسداد سابق. المركبة قديمة ويوجد مدعى عليهما.',requests:'رفض غير المثبت واحتياطياً تخفيض المبلغ.'};
const issue=(changes={})=>({issue:'أثر الصلح',factQuote:'صلح جزئي وسداد سابق',document:'المحضر مذكور؛ لم يرفق',sourceMarkers:['م1'],application:'تحديد نطاق السداد وتوقيته',counterargument:'الصلح إجرائي فقط',response:'فحص المحضر قبل الخصم',proposedRelief:'تخفيض ما يثبت سداده عن الضرر نفسه',missing:'',...changes});
const plan=(changes={})=>({clientRole:'مدعى عليه',opponentRole:'مدعية',characterization:'رجوع تأمين',issues:[issue()],missingFacts:[],researchGaps:[],...changes});
const evidence=[{text:'نص اصطناعي لا يمثل قاعدة قانونية.',documentId:1}];
const audit=(changes={})=>({checks:[{issueIndex:0,status:'addressed',reason:'فحص الصلح'}],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[],...changes});
test('case plan rejects reversed roles, invented facts, assistant-only quotes and nonexistent sources',()=>{
 for(const p of [plan({clientRole:'مدعٍ'}),plan({issues:[issue({factQuote:'مخالصة نهائية شاملة'})]}),plan({issues:[issue({sourceMarkers:['م99']})]}),plan({issues:[issue({application:'تطبيق المادة 999'})]})]) assert.throws(()=>api.parseCasePlan(JSON.stringify(p),input,evidence));
 assert.throws(()=>api.parseCasePlan(JSON.stringify(plan({issues:[issue({factQuote:'معلومة من المساعد'})]})),{...input,assistantResearch:'معلومة من المساعد'},evidence));
 assert.equal(api.parseCasePlan(JSON.stringify(plan()),input,evidence).clientRole,'مدعى عليه');
});
test('insurance settlement and valuation broaden research without inventing a depreciation rate',()=>{
 const q=api.caseResearchQueries(input).join(' ');assert.match(q,/حلول المؤمن/);assert.match(q,/الصلح/);assert.match(q,/تكلفة الإصلاح/);assert.match(q,/التضامن/);assert.doesNotMatch(q,/%|المادة/);
 assert.match(api.caseReasoningInstructions,/لا يحدد نسبة استهلاك/);assert.match(api.caseReasoningInstructions,/ضرره المحتمل/);
});
test('criminal case asks about elements, delivery, intent and evidence instead of copying insurance defense',()=>{
 const q=api.caseResearchQueries({...input,otherParty:'خصم اختباري',facts:'اتهام بخيانة الأمانة بسبب مال سلم لغرض محدد.',caseType:'جزائي'}).join(' ');
 assert.match(q,/عناصر الجريمة.*القصد الجنائي/);assert.doesNotMatch(q,/حلول المؤمن|استهلاك/);
});
test('omitted settlement, reversed roles, harmful relief or unsupported assertions fail independent audit',()=>{
 for(const a of [audit({checks:[{issueIndex:0,status:'omitted',reason:'تجاهل السداد'}]}),audit({roleConsistent:false}),audit({reliefConsistent:false}),audit({factsPreserved:false}),audit({unsupportedAssertions:['نسبة خصم مختلقة']})]) assert.equal(api.parseCaseAudit(JSON.stringify(a),plan()).ok,false);
 assert.throws(()=>api.parseCaseAudit(JSON.stringify(audit({checks:[]})),plan()));
 assert.throws(()=>api.parseCaseAudit(JSON.stringify(audit({checks:[{issueIndex:0,status:'blocked',reason:'غير مبرر'}]})),plan()));
});
test('missing sources stay incomplete even if model claims every issue addressed',()=>{
 const p=api.parseCasePlan(JSON.stringify(plan({issues:[issue({sourceMarkers:[]})],researchGaps:['لا سند مسترجع']})),input,[]);
 const a=api.parseCaseAudit(JSON.stringify(audit()),p);
 const summary=api.caseQualitySummary(p,a,{grounds:'',factualNotes:[]},0);
 assert.equal(summary.status,'incomplete');assert.equal(summary.humanReviewRequired,true);assert.match(summary.notices.join(' '),/ليس مذكرة دفاع مكتملة/);
});
test('every output path is audited before archive and source correction preserves generated requests',()=>{
 const route=readFileSync(new URL('../app/api/legal/memo/route.ts',import.meta.url),'utf8');
 assert.ok(route.indexOf('parseCaseAudit(await generateText')<route.indexOf('if(user) await recordServiceActivity'));
 assert.match(route,/return finish\(parsePleadingContent\(revised\),true\)/);
 assert.doesNotMatch(route,/content.requests=memoInput.requests/);
 assert.match(route,/casePlan:checkedPlan/);assert.match(route,/caseQuality,sourceCoverage/);
});
