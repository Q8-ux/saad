import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';

const security=load('../lib/request-security.ts',{'@/db':{}});
const {validateMemoInput}=load('../lib/memo-input.ts',{'@/lib/request-security':security});
const base={caseType:'مدني',court:'المحكمة الكلية',courtCircuit:'الدائرة المدنية',clientName:'شخص اصطناعي',otherParty:'خصم اصطناعي',partyRole:'مدعٍ',facts:'واقعة اصطناعية للاختبار فقط بشأن مبلغ لم يتم سداده بعد مطالبة الطرف الآخر.',requests:'إلزام الخصم بسداد مبلغ الاختبار.'};

test('a misdemeanor cannot enter the administrative circuit or silently become a civil claim',()=>{
 assert.throws(()=>validateMemoInput({...base,caseType:'جنح',courtCircuit:'الدائرة الإدارية',partyRole:'متهم'}),e=>e.stage==='legal_route_review');
});
test('an unknown subject cannot become a civil claim by default, including available-evidence mode',()=>{
 for(const draftMode of ['', 'available_evidence']) assert.throws(()=>validateMemoInput({...base,caseType:'أخرى',courtCircuit:'',draftMode}),e=>e.stage==='legal_route_review');
});

const api=load('../lib/legal-drafting-routes.ts');
const resolve=(input={})=>api.resolveLegalDraftingRoute({...base,...input});
test('each subject has a distinct server-owned profile without borrowing case data or authorities',()=>{
 const examples=[['جنح','الدائرة الجزائية','متهم','misdemeanor'],['جنايات','الدائرة الجزائية','متهم','felony'],['إداري','الدائرة الإدارية','مدعٍ','administrative'],['مدني','الدائرة المدنية','مدعٍ','civil'],['تجاري','الدائرة التجارية','مدعٍ','commercial'],['عمالي قطاع أهلي','الدائرة العمالية','مدعٍ','private_labor'],['أحوال شخصية','دائرة الأسرة','طالبة','family'],['إيجارات','دائرة الإيجارات','مدعٍ','tenancy'],['عقاري','الدائرة العقارية','مدعٍ','real_estate'],['تنفيذ','دائرة التنفيذ','مستشكل','enforcement']];
 const ids=new Set();
 for(const [caseType,courtCircuit,partyRole,family]of examples){const r=resolve({caseType,courtCircuit,partyRole,documentKind:'memorandum'});assert.equal(r.status,'ready',caseType);assert.equal(r.family,family);assert.ok(r.id.startsWith(family+'.'));ids.add(r.id);assert.ok(api.legalRouteInstructions(r).includes(r.id));}
 assert.equal(ids.size,10);assert.equal(api.legalDraftingProfiles.length,10);
});
test('a generic criminal type needs its actual misdemeanor or felony classification',()=>{
 const vague=resolve({caseType:'جزائي',courtCircuit:'الدائرة الجزائية',partyRole:'متهم'});assert.equal(vague.status,'needs_clarification');assert.ok(vague.issueCodes.includes('criminal_grade_missing'));
 const specific=resolve({caseType:'جزائي',courtCircuit:'جنح',partyRole:'متهم'});assert.equal(specific.family,'misdemeanor');assert.equal(specific.kind,'memorandum');
 assert.equal(resolve({caseType:'مدني',courtCircuit:'الدائرة الجزائية'}).status,'needs_clarification');
});

test('English and Urdu category labels retain the same subject without translating facts or identities',()=>{
 for(const [caseType,courtCircuit,partyRole,family]of [['Civil','Civil circuit','Plaintiff','civil'],['دیوانی','دیوانی شعبہ','مدعی','civil'],['عائلی','خاندانی عدالت','مدعی','family'],['جنحہ','جنح','متهم','misdemeanor']]){const r=resolve({caseType,courtCircuit,partyRole});assert.equal(r.family,family);assert.equal(r.status,'ready');}
 assert.equal(resolve({caseType:'Civil',courtCircuit:'Civil circuit',partyRole:'Defendant',requests:'Please prepare a defence memorandum.'}).kind,'memorandum');
});
test('government parties, medical providers and a historical criminal judgment do not determine the current subject',()=>{
 const r=resolve({caseType:'مدني - مسؤولية طبية',facts:'واقعة اصطناعية تتضمن إشارة إلى حكم جنايات سابق، والطرف الآخر جهة عامة.',otherParty:'جهة عامة اصطناعية',requests:'ندب خبير طبي لفحص المسألة الفنية الاصطناعية.'});
 assert.equal(r.family,'civil');assert.equal(r.purpose,'medical_expert');assert.equal(r.kind,'claim');assert.equal(r.status,'ready');
});
test('administrative jurisdiction and appellate degree are separate, and respondent answers never become a new appeal',()=>{
 for(const [court,partyRole,kind,degree]of [['المحكمة الكلية','مدعٍ','claim','first_instance'],['محكمة الاستئناف','مستأنف','appeal','appeal'],['محكمة الاستئناف','مستأنف ضده','memorandum','appeal']]){const r=resolve({caseType:'إداري',courtCircuit:'الدائرة الإدارية',court,partyRole});assert.equal(r.family,'administrative');assert.equal(r.kind,kind);assert.equal(r.degree,degree);assert.equal(r.status,'ready');}
 assert.equal(resolve({caseType:'إداري',courtCircuit:'الدائرة الإدارية',court:'محكمة الاستئناف',partyRole:'مستأنف ضده',documentKind:'appeal'}).status,'needs_clarification');
});
test('the current court cannot remain first instance while the selected actor or document is an appeal',()=>{
 for(const input of [{partyRole:'مستأنف'},{partyRole:'مستأنف ضده'},{partyRole:'طاعن'},{documentKind:'appeal'}]){
  const r=resolve(input);assert.equal(r.status,'needs_clarification');assert.ok(r.issueCodes.includes('court_stage_conflict'));
 }
});
test('a defendant cannot silently receive an original plaintiff claim on the same dispute',()=>{
 const r=resolve({partyRole:'مدعى عليه',documentKind:'claim'});assert.equal(r.status,'needs_clarification');assert.ok(r.issueCodes.includes('adverse_party_form'));
 assert.equal(resolve({partyRole:'مدعى عليه',documentKind:'memorandum'}).kind,'memorandum');
});
test('special criminal, cassation and execution filings never reuse a civil claim or appeal form',()=>{
 const inputs=[{caseType:'جنح',courtCircuit:'جنح',partyRole:'شاكي',documentKind:'claim'},{caseType:'جنايات',courtCircuit:'جنايات',partyRole:'متهم',court:'محكمة الاستئناف',documentKind:'appeal'},{court:'محكمة التمييز',partyRole:'طاعن',documentKind:'appeal'},{caseType:'تنفيذ',courtCircuit:'التنفيذ',partyRole:'طالب التنفيذ',requests:'طلب تنفيذ السند الاصطناعي وفتح ملف تنفيذ.'}];
 for(const input of inputs){const r=resolve(input);assert.equal(r.status,'template_review');assert.equal(r.id,'');}
});
test('expert appointment is a requested purpose, never inferred from an old report or added against instructions',()=>{
 const expert=resolve({requests:'ندب خبير لفحص الحسابات والمستندات الاصطناعية.'});assert.equal(expert.purpose,'expert_appointment');
 assert.equal(resolve({facts:'تقرير خبير ورد في قضية اصطناعية سابقة فقط.'}).purpose,'monetary_claim');
 assert.equal(resolve({requests:'لا أريد ندب خبير. أطلب إلزام الخصم بسداد مبلغ الاختبار.'}).purpose,'monetary_claim');
 assert.notEqual(resolve({requests:'طلب الخصم ندب خبير ونطلب رفض طلبه.'}).purpose,'expert_appointment');
 assert.equal(resolve({caseType:'جنح',courtCircuit:'جنح',partyRole:'متهم',requests:'ندب خبير طبي لفحص الإصابة محل الاتهام الاصطناعي.'}).purpose,'expert_appointment');
 const medical=resolve({caseType:'مدني - مسؤولية طبية',requests:'ندب خبير طبي لبحث المسألة الاصطناعية.'});assert.equal(medical.purpose,'medical_expert');assert.notEqual(medical.id,expert.id);
});
test('guardianship and administrative care assignment have independent purposes and instructions',()=>{
 const family=resolve({caseType:'وصاية',court:'محكمة الأسرة',courtCircuit:'الأسرة',partyRole:'طالبة',requests:'تعيين طالبة الطلب وصية في الطلب الاصطناعي.'});
 const care=resolve({caseType:'إداري',courtCircuit:'الإدارية',requests:'تعيين مقدم الطلب مكلفاً بالرعاية في الطلب الاصطناعي.'});
 assert.equal(family.status,'ready');assert.equal(family.purpose,'guardianship');assert.equal(care.status,'ready');assert.equal(care.purpose,'care_assignment');assert.notEqual(family.id,care.id);
 assert.equal(resolve({requests:'تعيين مقدم الطلب وصياً في الطلب الاصطناعي.'}).status,'needs_clarification');
});
test('words inside a benefit description cannot turn a monetary claim into a defence memorandum',()=>{
 const r=resolve({requests:'المطالبة بمبلغ بدل اصطناعي يسمى بدل الدفاع.'});assert.equal(r.kind,'claim');assert.equal(r.purpose,'monetary_claim');
});
test('labor routing requires the actual employment regime and never assumes every employee is private-sector',()=>{
 assert.equal(resolve({caseType:'عمالي',courtCircuit:'عمالي'}).status,'needs_clarification');
 assert.equal(resolve({caseType:'عمالي - وظيفة عامة',courtCircuit:'عمالي'}).status,'needs_clarification');
 assert.equal(resolve({caseType:'عمالي قطاع أهلي',courtCircuit:'عمالي'}).status,'ready');
});
test('untrusted route identifiers never override classification or appear in server-owned instructions',()=>{
 const r=resolve({legalRouteId:'felony.fake.route',facts:'وقائع اصطناعية تخص المطالبة فقط.'});assert.equal(r.family,'civil');assert.ok(!api.legalRouteInstructions(r).includes('fake.route'));
 assert.ok(!api.legalRouteInstructions(r).includes(base.clientName));assert.ok(!api.legalRouteInstructions(r).includes('http'));
});
test('isolated wrong-route document headings fail review without rejecting a historical reference within prose',()=>{
 const r=resolve({caseType:'جنايات',courtCircuit:'جنايات',partyRole:'متهم'});
 assert.equal(api.reviewLegalRouteContent(r,{facts:'واقعة اصطناعية',grounds:'مذكرة بدفاع جنح',requests:'الطلب المأذون'}).ok,false);
 assert.equal(api.reviewLegalRouteContent(r,{facts:'واقعة اصطناعية',grounds:'مذكرة بدفاع مدني',requests:'الطلب المأذون'}).ok,false);
 assert.equal(api.reviewLegalRouteContent(r,{facts:'واقعة اصطناعية',grounds:'أشار الخصم إلى دعوى مدنية سابقة، ويجري بحث أثرها بحسب مصدرها.',requests:'الطلب المأذون'}).ok,true);
});
test('a special constitutional or military forum cannot silently reuse the civil form',()=>{
 for(const court of ['المحكمة الدستورية','المحكمة العسكرية'])assert.equal(resolve({court}).status,'template_review');
});
