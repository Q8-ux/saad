import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {load} from './template-harness.mjs';
const api=load('../lib/case-reasoning.ts');
const fact='سدد الطرف الاختباري المبلغ على دفعتين';
const application=fact+' بحسب الوقائع المتفق عليها، ولذلك تقارن قيمة كل دفعة برصيد المطالبة قبل وصف الدين بأنه لم يسدد.';
const opposing='قد يقال إن الدفعة الثانية تتعلق بتعامل آخر بين الطرفين، وهو اعتراض افتراضي لم يثبت في الاختبار.';
const response='والرد أن الوقائع المتفق عليها تخصص الدفعتين للدين نفسه، فيبقى الاحتساب مرتبطاً بهذا الإقرار دون افتراض دين آخر.';
const plan={clientRole:'مدعى عليه',opponentRole:'مدعٍ',characterization:'مطالبة',issues:[{issue:'السداد',factQuote:fact+' في الوقائع الأصلية المفصلة.',document:'',sourceMarkers:[],application:'فحص الرصيد',counterargument:'تعامل آخر',response:'ربط الدفعات',proposedRelief:'رفض المطالبة',missing:''}],missingFacts:[],researchGaps:['لا سند قانوني في هذا الاختبار']};
const content={facts:fact,grounds:[application,opposing,response,'نص المادة: «هذه عبارة تشريعية اصطناعية وليست تطبيقاً على واقعة أو قانوناً حقيقياً.»'].join('\n'),requests:'رفض المطالبة',fields:{},factualNotes:[],legalResearchNotes:''};
const addressed=(s,index=0)=>s.properties.checks.items.anyOf.find(b=>b.properties.issueIndex.enum[0]===index&&b.properties.status.enum.includes('addressed'));
const fields=s=>{
 const a=addressed(s); const choices=a?.properties.substance.anyOf||[];
 return {factQuote:{enum:['',...new Set(choices.flatMap(c=>c.properties.factQuote.enum))]},applicationQuote:{enum:['',...s.$defs.auditReasoning.enum.filter(q=>q!=='__no_reasoning__')]},sourceMarkers:choices[0]?.properties.sourceMarkers||{items:{enum:['__no_source__']}}};
};
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
test('planning source markers are constrained to the server dictionary and cannot invent a precedent',async()=>{
 const input={facts:fact,partyRole:'مدعى عليه',requests:'رفض المطالبة'};let calls=0;
 const p=await api.buildCheckedCasePlan(input,[{documentId:1,text:'مرجع اصطناعي بلا حكم'}],'مصدر اختبار',async options=>{
  calls++;const schema=options.schema;
  assert.deepEqual(Array.from(schema.properties.issues.items.properties.sourceMarkers.items.enum),['م1']);
  assert.equal(schema.properties.precedentMatches.maxItems,0);assert.equal(schema.properties.precedentMatches.items.properties.reason.minLength,undefined);assert.equal(schema.properties.precedentMatches.items.properties.issueIndex.minimum,0);
  return JSON.stringify({...plan,issues:[{...plan.issues[0],factQuote:fact,sourceMarkers:['م1']}],precedentMatches:[]});
 });
 assert.equal(calls,1);assert.equal(p.issues[0].sourceMarkers[0],'م1');
});
test('no retrieved source forces empty marker arrays while audit markers use only planned sources',async()=>{
 await api.buildCheckedCasePlan({facts:fact,partyRole:'مدعى عليه',requests:'رفض المطالبة'},[],'',async options=>{
  assert.equal(options.schema.properties.issues.items.properties.sourceMarkers.maxItems,0);assert.equal(options.schema.properties.precedentMatches.maxItems,0);
  return JSON.stringify({...plan,issues:[{...plan.issues[0],factQuote:fact,sourceMarkers:[]}],precedentMatches:[]});
 });
 const p={...plan,issues:[{...plan.issues[0],sourceMarkers:['م2']}]};
 assert.deepEqual(Array.from(fields(api.caseAuditSchemaForContent(p,content)).sourceMarkers.items.enum),['م2']);
});
test('precedent marker enum excludes unreviewed judicial metadata',async()=>{
 const quote='مبدأ اصطناعي طويل لتجربة ربط مصدر قضائي وهمي فقط ولا يمثل حكماً حقيقياً.';
 const reviewed={text:quote,documentId:2,judgment:{scope:'uploaded_judgments_only',sourceKind:'judicial_digest',reviewStatus:'source_page_matched',court:'محكمة التمييز',currentAuthorityVerified:false,appealNumber:98765,appealYear:2000,pdfPage:1,chamber:'اختبار',recordId:'synthetic',sourceBook:'كتاب اختبار',sourceSha256:'a'.repeat(64),quoteSha256:'b'.repeat(64),decisionDate:'2000-01-01',reviewedAt:'2026-11-07',quote}};
 await api.buildCheckedCasePlan({facts:fact,partyRole:'مدعى عليه',requests:'رفض المطالبة'},[{documentId:1,text:'مرجع اصطناعي'},reviewed,{...reviewed,judgment:{...reviewed.judgment,reviewStatus:'unreviewed'}}],'',async options=>{
  assert.deepEqual(Array.from(options.schema.properties.precedentMatches.items.properties.sourceMarker.enum),['م2']);
  return JSON.stringify({...plan,issues:[{...plan.issues[0],factQuote:fact,sourceMarkers:['م1']}],precedentMatches:[]});
 });
});
test('provider schema rejects empty addressed excerpts and cross-issue facts before the independent audit',()=>{
 const otherFact='ورد إقرار بتخصيص الدفعتين إلى الدين نفسه';
 const otherApplication=otherFact+' في الوقائع المتفق عليها، ولذلك لا يفترض دين آخر لإعادة توزيع قيمة الوفاء.';
 const p={...plan,issues:[plan.issues[0],{...plan.issues[0],issue:'تخصيص الوفاء',factQuote:otherFact}]};
 const c={...content,grounds:[application,otherApplication,opposing,response].join('\n')};
 const s=api.caseAuditSchemaForContent(p,c);
 const validate=new Ajv({allErrors:true}).compile(JSON.parse(JSON.stringify(s)));
 const checks=p.issues.map((_,i)=>{
  const properties=addressed(s,i).properties.substance.anyOf[0].properties;
  return {issueIndex:i,status:'addressed',reason:'تطبيق على الواقعة المعتمدة',substance:{factQuote:properties.factQuote.enum[0],applicationQuote:properties.applicationQuote.enum[0],opposingQuote:opposing,responseQuote:response,sourceMarkers:[]}};
 });
 const audit={checks,roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]};
 assert.equal(validate(audit),true,JSON.stringify(validate.errors));
 assert.equal(api.parseCaseAudit(JSON.stringify(audit),p,c,[]).ok,true);
 for(const changes of [{factQuote:''},{factQuote:checks[1].substance.factQuote},{applicationQuote:otherApplication},{factQuote:checks[1].substance.factQuote,applicationQuote:otherApplication}]){
  const invalid=structuredClone(audit);Object.assign(invalid.checks[0].substance,changes);assert.equal(validate(invalid),false);
 }
 const omitted=structuredClone(audit);omitted.checks[0]={issueIndex:0,status:'omitted',reason:'المعالجة غير كافية',substance:{factQuote:'',applicationQuote:'',opposingQuote:'',responseQuote:'',sourceMarkers:[]}};
 assert.equal(validate(omitted),true);assert.equal(api.parseCaseAudit(JSON.stringify(omitted),p,c,[]).ok,false);
 const repeated=structuredClone(audit);repeated.checks[0].substance.responseQuote=checks[0].substance.applicationQuote;
 assert.equal(api.parseCaseAudit(JSON.stringify(repeated),p,c,[]).ok,false,'schema does not replace independent distinct-reasoning validation');
});
test('audit schema remains within provider enum budgets with twelve issues and bounded shared definitions',()=>{
 const p={...plan,issues:Array.from({length:12},()=>({...plan.issues[0]}))};
 const c={...content,grounds:Array.from({length:80},(_,i)=>`مقطع ${i}: `+application.repeat(4)+'\n'+opposing+'\n'+response).join('\n')};
 const s=api.caseAuditSchemaForContent(p,c);let count=0,characters=0;
 function visit(v){if(!v||typeof v!=='object')return;if(Array.isArray(v.enum)){count+=v.enum.length;characters+=v.enum.reduce((n,x)=>n+(typeof x==='string'?x.length:0),0);}for(const value of Object.values(v))visit(value);}
 visit(s);assert.ok(count<1000);assert.ok(characters<115000);assert.equal(s.properties.checks.items.anyOf.length,24);
 new Ajv().compile(JSON.parse(JSON.stringify(s)));
});
