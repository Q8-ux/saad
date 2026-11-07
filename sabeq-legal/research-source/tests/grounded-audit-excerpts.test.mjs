import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const api=load('../lib/case-reasoning.ts');
const fact='سدد الطرف الاختباري المبلغ على دفعتين';
const application=fact+' بحسب الوقائع المتفق عليها، ولذلك تقارن قيمة كل دفعة برصيد المطالبة قبل وصف الدين بأنه لم يسدد.';
const opposing='قد يقال إن الدفعة الثانية تتعلق بتعامل آخر بين الطرفين، وهو اعتراض افتراضي لم يثبت في الاختبار.';
const response='والرد أن الوقائع المتفق عليها تخصص الدفعتين للدين نفسه، فيبقى الاحتساب مرتبطاً بهذا الإقرار دون افتراض دين آخر.';
const plan={clientRole:'مدعى عليه',opponentRole:'مدعٍ',characterization:'مطالبة',issues:[{issue:'السداد',factQuote:fact+' في الوقائع الأصلية المفصلة.',document:'',sourceMarkers:[],application:'فحص الرصيد',counterargument:'تعامل آخر',response:'ربط الدفعات',proposedRelief:'رفض المطالبة',missing:''}],missingFacts:[],researchGaps:['لا سند قانوني في هذا الاختبار']};
const content={facts:fact,grounds:[application,opposing,response,'نص المادة: «هذه عبارة تشريعية اصطناعية وليست تطبيقاً على واقعة أو قانوناً حقيقياً.»'].join('\n'),requests:'رفض المطالبة',fields:{},factualNotes:[],legalResearchNotes:''};
const fields=s=>s.properties.checks.items.properties.substance.properties;
test('audit schema selects real final application, objection, response and shared fact excerpts',()=>{
 const s=fields(api.caseAuditSchemaForContent(plan,content));
 for(const q of [application,opposing,response])assert.ok(s.applicationQuote.enum.includes(q));
 assert.ok(s.factQuote.enum.some(q=>q.length>=12&&application.includes(q)&&plan.issues[0].factQuote.includes(q)));
 assert.ok(!s.factQuote.enum.includes(plan.issues[0].factQuote));assert.ok(!s.applicationQuote.enum.includes('اقتباس مخترع'));
 assert.ok(!s.applicationQuote.enum.some(q=>q.includes('عبارة تشريعية اصطناعية')));
 const anchor=s.factQuote.enum.find(q=>q.length>=12&&application.includes(q));
 const audit={checks:[{issueIndex:0,status:'addressed',reason:'معالجة وقائعية',substance:{factQuote:anchor,applicationQuote:application,opposingQuote:opposing,responseQuote:response,sourceMarkers:[]}}],roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]};
 assert.equal(api.parseCaseAudit(JSON.stringify(audit),plan,content,[]).ok,true);
 assert.equal(api.parseCaseAudit(JSON.stringify({...audit,checks:[{...audit.checks[0],substance:{...audit.checks[0].substance,responseQuote:'رد مختلق'}}]}),plan,content,[]).ok,false);
});
test('generic defense has no manufactured fact anchor and blocked fields remain available',()=>{
 const s=fields(api.caseAuditSchemaForContent(plan,{...content,grounds:'يتمسك مقدم المذكرة بكافة الدفوع وبما يقدم من مستندات.'}));
 assert.deepEqual(Array.from(s.factQuote.enum),['']);assert.ok(s.applicationQuote.enum.includes(''));
 assert.ok(api.caseAuditSchema.properties.checks.items.properties.status.enum.includes('blocked'));
});
test('a literal quotation of the case facts remains part of its application, unlike a statutory text block',()=>{
 const quoted=`بحسب المدخلات «${fact}»؛ ولذلك يجب مقابلة الدفعتين بالمطالبة قبل وصف الرصيد بأنه باقٍ دون وفاء.`;
 const s=fields(api.caseAuditSchemaForContent(plan,{...content,grounds:quoted+'\n'+opposing+'\n'+response}));
 assert.ok(s.applicationQuote.enum.includes(quoted));assert.ok(s.factQuote.enum.some(q=>q.length>=12&&quoted.includes(q)));
});
test('quotation pools and excerpt sizes are bounded without mutating the shared audit schema',()=>{
 const long={...content,grounds:Array.from({length:140},(_,i)=>`فقرة اختبار ${i} `+application.repeat(8)).join('\n')};
 const s=fields(api.caseAuditSchemaForContent(plan,long));
 assert.ok(s.applicationQuote.enum.length<=49);assert.ok(s.applicationQuote.enum.every(q=>q.length<=600));assert.ok(s.factQuote.enum.length<=4);
 assert.equal(api.caseAuditSchema.properties.checks.items.properties.substance.properties.factQuote.enum,undefined);
});
