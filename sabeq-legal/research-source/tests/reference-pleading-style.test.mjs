import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const policy=load('../lib/bound-draft.ts');

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
 assert.equal(policy.pleadingStyleRevision,'reference-pleading-style-2');
 assert.deepEqual(Array.from(policy.referenceStyleCoverage.observed),['misdemeanor_defense','felony_defense','civil_defense','civil_claim','commercial_claim','administrative_claim','guardianship_claim','expert_appointment_claim','medical_expert_claim']);
 assert.deepEqual(Array.from(policy.referenceStyleCoverage.notObserved),['appeal']);
 assert.equal(policy.referenceStyleCoverage.personalDataStored,false);
 assert.equal(policy.referenceStyleCoverage.legalAuthoritiesImported,false);
});
test('style instructions contain rules without case identifiers, external links, sample quotations or contact details',()=>{
 const text=policy.referencePleadingStyleInstructions;
 assert.equal(typeof text,'string');
 assert.doesNotMatch(text,/https?:\/\/|@|\+\d|(?:ملف|كود|جلسة|طعن)\s*(?:رقم\s*)?\d/iu);
 assert.doesNotMatch(text,/«[^»]+»|“[^”]+”/u);
});


