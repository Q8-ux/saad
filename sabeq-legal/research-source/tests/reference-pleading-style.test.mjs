import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const policy=load('../lib/bound-draft.ts');
const {appealReferenceInstructions,appealReferenceStyle}=load('../lib/appeal-reference-style.ts');
const {selectDraftingReference,memorandumReferenceStyle}=load('../lib/memorandum-reference-style.ts');
const draftingReferenceInstructions=(route,style,input)=>selectDraftingReference(route,style,input).instructions;
const {resolveLegalDraftingRoute}=load('../lib/legal-drafting-routes.ts');

test('reference examples are explicitly style-only and cannot donate personal data or legal authorities',()=>{
 assert.match(policy.pleadingAuthorityInstructions,/النماذج مرجع أسلوبي فقط/);
 assert.match(policy.pleadingAuthorityInstructions,/لا تنقل.*أسماء.*وقائع.*أحداث/u);
 assert.match(policy.pleadingAuthorityInstructions,/أرقام مواد.*طعون/u);
 assert.match(policy.pleadingAuthorityInstructions,/مصادر القضية الجديدة/u);
});
test('the shared style distinguishes criminal attribution from civil relief and preserves the other approved forms',()=>{
 const text=policy.pleadingAuthorityInstructions;
 assert.match(text,/في الجنح والجنايات/u);assert.match(text,/كل متهم/u);
 assert.match(text,/في الدفاع المدني/u);assert.match(text,/ادعاء الخصم.*طلبات صاحب المذكرة/u);
 assert.match(text,/صحيفة الدعوى.*صحيفة الاستئناف/u);
});
test('style coverage reports only observed forms and never claims the supplied examples prove all pleading types',()=>{
 assert.equal(policy.pleadingStyleRevision,'reference-pleading-style-4');
 assert.deepEqual(Array.from(policy.referenceStyleCoverage.observed),['misdemeanor_defense','felony_defense','civil_defense','civil_claim','commercial_claim','administrative_claim','guardianship_claim','expert_appointment_claim','medical_expert_claim','appeal','commercial_defense','family_memorandum','tenancy_memorandum','appeal_memorandum','ancillary_civil_claim','expert_comment']);
 assert.deepEqual(Array.from(policy.referenceStyleCoverage.notObserved),[]);
 assert.equal(policy.referenceStyleCoverage.personalDataStored,false);
 assert.equal(policy.referenceStyleCoverage.legalAuthoritiesImported,false);
});

test('appeal rules follow the resolved appellant route and exclude other families and unapproved text',()=>{
 const base={documentKind:'appeal',court:'محكمة الاستئناف',partyRole:'مستأنف',requests:'تعديل الحكم في حدود الطلب الأصلي.'};
 const labels={civil:'مدني',commercial:'تجاري',family:'أحوال شخصية',administrative:'إداري'};
 for(const [family,caseType] of Object.entries(labels)){
  const route=resolveLegalDraftingRoute({...base,caseType});
  assert.equal(route.status,'ready',family);
  assert.equal(route.family,family);
  const text=appealReferenceInstructions(route,appealReferenceStyle);
  for(const rule of appealReferenceStyle.common)assert.ok(text.includes(rule));
  for(const [key,rules] of Object.entries(appealReferenceStyle.families)){
   for(const rule of rules)assert.equal(text.includes(rule),key===family);
  }
  assert.equal(appealReferenceInstructions(route,{...appealReferenceStyle,common:['تعليمات اختبارية محقونة']}),'');
 }
 const execution=resolveLegalDraftingRoute({...base,caseType:'تنفيذ'});
 assert.equal(execution.status,'template_review');
 assert.ok(appealReferenceStyle.families.enforcement.length);
 assert.equal(appealReferenceInstructions(execution,appealReferenceStyle),'');
 for(const change of [
  {caseType:'جنح'},{caseType:'جنايات'},{partyRole:'مستأنف ضده'},
  {documentKind:'memorandum'},{court:'محكمة التمييز'},{caseType:'أخرى'},
 ]){
  const route=resolveLegalDraftingRoute({...base,caseType:'مدني',...change});
  assert.equal(appealReferenceInstructions(route,appealReferenceStyle),'');
 }
});
test('style instructions contain rules without case identifiers, external links, sample quotations or contact details',()=>{
 const text=policy.referencePleadingStyleInstructions;
 assert.equal(typeof text,'string');
 assert.doesNotMatch(text,/https?:\/\/|@|\+\d|(?:ملف|كود|جلسة|طعن)\s*(?:رقم\s*)?\d/iu);
 assert.doesNotMatch(text,/«[^»]+»|“[^”]+”/u);
});

test('the memorandum catalog follows the selected subject and stays out of other forms',()=>{
 const subjects={civil:'مدني',commercial:'تجاري',family:'أحوال شخصية',tenancy:'إيجارات',misdemeanor:'جنح',felony:'جنايات'};
 for(const [family,caseType] of Object.entries(subjects)){
  const criminal=family==='misdemeanor'||family==='felony';
  const input={caseType,court:'المحكمة الكلية',partyRole:criminal?'متهم':'مدعى عليه',documentKind:'memorandum',requests:'الفصل في الطلبات المطروحة.'};
  const route=resolveLegalDraftingRoute(input);
  assert.equal(route.status,'ready',family);
  assert.equal(route.family,family);
  const text=draftingReferenceInstructions(route,memorandumReferenceStyle,input);
  for(const rule of memorandumReferenceStyle.common)assert.ok(text.includes(rule));
  for(const [key,rules] of Object.entries(memorandumReferenceStyle.families)){
   for(const rule of rules)assert.equal(text.includes(rule),key===family);
  }
 }
 const claim={caseType:'مدني',court:'المحكمة الكلية',partyRole:'مدعٍ',documentKind:'claim'};
 assert.equal(draftingReferenceInstructions(resolveLegalDraftingRoute(claim),memorandumReferenceStyle,claim),'');
 const appeal={...claim,court:'محكمة الاستئناف',partyRole:'مستأنف',documentKind:'appeal'};
 const route=resolveLegalDraftingRoute(appeal);
 assert.equal(draftingReferenceInstructions(route,memorandumReferenceStyle,appeal),'');
 assert.ok(draftingReferenceInstructions(route,appealReferenceStyle,appeal).includes(appealReferenceStyle.common[0]));
});

test('explicit procedure selects expert comment or an ancillary civil claim without borrowing a different posture',()=>{
 const procedure=memorandumReferenceStyle.procedures;
 const commercial={caseType:'تجاري',court:'محكمة الاستئناف',partyRole:'مستأنف ضده',documentKind:'memorandum',requests:'الفصل في الطلبات المطروحة.'};
 const render=(input,style=memorandumReferenceStyle)=>draftingReferenceInstructions(resolveLegalDraftingRoute(input),style,input);
 const ordinary=render({...commercial,facts:'سبق نظر النزاع أمام إدارة الخبراء.'});
 assert.ok(ordinary.includes(procedure.appeal_memorandum[0]));
 assert.ok(!ordinary.includes(procedure.expert_comment[0]));
 const expert=render({...commercial,caseStage:'مذكرة تعقيب على تقرير الخبير'});
 assert.ok(expert.includes(procedure.expert_comment[0]));
 assert.ok(!expert.includes(procedure.appeal_memorandum[0]));
 assert.ok(!render({...commercial,requests:'ندب خبير للفحص.'}).includes(procedure.expert_comment[0]));
 const civilClaim={caseType:'جنح',court:'محكمة الجنح',partyRole:'مدعٍ بالحق المدني',documentKind:'memorandum',requests:'الفصل في الطلب المدني المقدم.'};
 const ancillary=render(civilClaim);
 assert.equal(selectDraftingReference(resolveLegalDraftingRoute(civilClaim),memorandumReferenceStyle,civilClaim).memorandumTitle,'مذكرة ادعاء مدني');
 assert.ok(ancillary.includes(procedure.ancillary_civil_claim[0]));
 assert.ok(!ancillary.includes(memorandumReferenceStyle.families.misdemeanor[0]));
 assert.equal(render({...civilClaim,partyRole:'شاكٍ'}),'');
 assert.ok(!render({...civilClaim,partyRole:'متهم',caseStage:'مذكرة ادعاء مدني'}).includes(procedure.ancillary_civil_claim[0]));
 assert.equal(render(commercial,{...memorandumReferenceStyle,common:['تعليمات اختبارية دخيلة']}),'');
});

