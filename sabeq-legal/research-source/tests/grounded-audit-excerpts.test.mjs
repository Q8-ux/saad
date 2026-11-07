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
const request=(p=plan,c=content)=>api.caseAuditRequestForContent(p,c);
const option=(r,i=0)=>r.checkOptions.find(o=>o.issueIndex===i&&o.status==='addressed');
const wire=(r,indices=[0])=>({checks:indices.map(i=>({checkKey:option(r,i).checkKey,reason:'معالجة وقائعية مرتبطة',substance:{opposingQuote:opposing,responseQuote:response,sourceMarkers:[]}})),roleConsistent:true,factsPreserved:true,reliefConsistent:true,unsupportedAssertions:[]});
const compile=r=>new Ajv({allErrors:true}).compile(JSON.parse(JSON.stringify(r.schema)));
test('flat audit choices bind the actual final application to its own approved fact without statutory quote substitution',()=>{
 const r=request(),o=option(r),validate=compile(r),a=wire(r);
 assert.ok(o.factQuote.length>=12&&application.includes(o.factQuote)&&plan.issues[0].factQuote.includes(o.factQuote));
 assert.equal(o.applicationQuote,application);assert.ok(!r.checkOptions.some(o=>o.applicationQuote.includes('عبارة تشريعية اصطناعية')));
 assert.equal(validate(a),true);const parsed=api.parseGroundedCaseAudit(JSON.stringify(a),r,plan,content,[]);
 assert.equal(parsed.ok,true);assert.equal(parsed.complete,false,'source-less factual argument never becomes legally complete');
 assert.equal(parsed.checks[0].substance.applicationQuote,application);
});
test('generic defense exposes only explicit unaddressed choices and cannot manufacture a fact anchor',()=>{
 const c={...content,grounds:'يتمسك مقدم المذكرة بكافة الدفوع وبما يقدم من مستندات.'},r=request(plan,c);
 assert.ok(r.checkOptions.every(o=>o.status!=='addressed'&&o.factQuote===''&&o.applicationQuote===''));
 const a={...wire(request()),checks:[{checkKey:'issue_0_omitted',reason:'نص عام بلا تطبيق',substance:{opposingQuote:'',responseQuote:'',sourceMarkers:[]}}]};
 assert.equal(compile(r)(a),true);assert.equal(api.parseGroundedCaseAudit(JSON.stringify(a),r,plan,c,[]).ok,false);
});
test('a literal quotation of case facts remains eligible while a labelled statutory text block does not',()=>{
 const quoted=`بحسب المدخلات «${fact}»؛ ولذلك يجب مقابلة الدفعتين بالمطالبة قبل وصف الرصيد بأنه باقٍ دون وفاء.`;
 const r=request(plan,{...content,grounds:quoted+'\n'+opposing+'\n'+response});assert.equal(option(r).applicationQuote,quoted);
 assert.ok(quoted.includes(option(r).factQuote));
});
test('flat provider schema and quotation choices remain bounded for twelve issues without anyOf or length keywords',()=>{
 const p={...plan,issues:Array.from({length:12},()=>({...plan.issues[0]}))};
 const c={...content,grounds:Array.from({length:80},(_,i)=>`مقطع ${i}: `+application.repeat(4)+'\n'+opposing+'\n'+response).join('\n')};
 const r=request(p,c);let count=0,characters=0;
 function visit(v){if(!v||typeof v!=='object')return;for(const k of ['anyOf','minLength','maxLength'])assert.equal(k in v,false);if(Array.isArray(v.enum)){count+=v.enum.length;characters+=v.enum.reduce((n,x)=>n+(typeof x==='string'?x.length:0),0);}for(const value of Object.values(v))visit(value);}
 visit(r.schema);assert.ok(count<1000);assert.ok(characters<115000);assert.ok(r.checkOptions.length<=60);
 assert.ok(r.checkOptions.every(o=>o.applicationQuote.length<=600));compile(r);
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
 assert.deepEqual(Array.from(request(p,content).schema.properties.checks.items.properties.substance.properties.sourceMarkers.items.enum),['م2']);
});
test('precedent marker enum excludes unreviewed judicial metadata',async()=>{
 const quote='مبدأ اصطناعي طويل لتجربة ربط مصدر قضائي وهمي فقط ولا يمثل حكماً حقيقياً.';
 const reviewed={text:quote,documentId:2,judgment:{scope:'uploaded_judgments_only',sourceKind:'judicial_digest',reviewStatus:'source_page_matched',court:'محكمة التمييز',currentAuthorityVerified:false,appealNumber:98765,appealYear:2000,pdfPage:1,chamber:'اختبار',recordId:'synthetic',sourceBook:'كتاب اختبار',sourceSha256:'a'.repeat(64),quoteSha256:'b'.repeat(64),decisionDate:'2000-01-01',reviewedAt:'2026-11-07',quote}};
 await api.buildCheckedCasePlan({facts:fact,partyRole:'مدعى عليه',requests:'رفض المطالبة'},[{documentId:1,text:'مرجع اصطناعي'},reviewed,{...reviewed,judgment:{...reviewed.judgment,reviewStatus:'unreviewed'}}],'',async options=>{
  assert.deepEqual(Array.from(options.schema.properties.precedentMatches.items.properties.sourceMarker.enum),['م2']);
  return JSON.stringify({...plan,issues:[{...plan.issues[0],factQuote:fact,sourceMarkers:['م1']}],precedentMatches:[]});
 });
});
test('decoder derives issue and its nonempty fact/application pair from an exact known key, never model fields',()=>{
 const otherFact='ورد إقرار بتخصيص الدفعتين إلى الدين نفسه';
 const otherApplication=otherFact+' في الوقائع المتفق عليها، ولذلك لا يفترض دين آخر لإعادة توزيع قيمة الوفاء.';
 const p={...plan,issues:[plan.issues[0],{...plan.issues[0],issue:'التخصيص',factQuote:otherFact}]};
 const c={...content,grounds:[application,otherApplication,opposing,response].join('\n')},r=request(p,c),a=wire(r,[0,1]);
 assert.equal(compile(r)(a),true);let parsed=api.parseGroundedCaseAudit(JSON.stringify(a),r,p,c,[]);assert.equal(parsed.ok,true);
 assert.ok(parsed.checks[0].substance.applicationQuote.includes(parsed.checks[0].substance.factQuote));
 assert.ok(p.issues[0].factQuote.includes(parsed.checks[0].substance.factQuote));
 const forged=structuredClone(a);Object.assign(forged.checks[0],{issueIndex:1,status:'omitted'});Object.assign(forged.checks[0].substance,{factQuote:'معلومة مخترعة',applicationQuote:otherApplication});
 assert.equal(compile(r)(forged),false);parsed=api.parseGroundedCaseAudit(JSON.stringify(forged),r,p,c,[]);
 assert.equal(parsed.checks[0].issueIndex,0);assert.equal(parsed.checks[0].status,'addressed');assert.equal(parsed.checks[0].substance.applicationQuote,application);
 for(const key of ['','issue_99_addressed_0','issue_0_addressed_99']){const invalid=structuredClone(a);invalid.checks[0].checkKey=key;assert.equal(compile(r)(invalid),false);assert.throws(()=>api.parseGroundedCaseAudit(JSON.stringify(invalid),r,p,c,[]));}
 const duplicate=structuredClone(a);duplicate.checks[1].checkKey=duplicate.checks[0].checkKey;assert.throws(()=>api.parseGroundedCaseAudit(JSON.stringify(duplicate),r,p,c,[]));
});
test('selected keys cannot bypass empty, invented or repeated rebuttals, unsupported claims, role or relief checks',()=>{
 const r=request(),a=wire(r);
 for(const changes of [{responseQuote:''},{responseQuote:application},{opposingQuote:'اقتباس مخترع'}, {responseQuote:'رد قصير'}]){const invalid=structuredClone(a);Object.assign(invalid.checks[0].substance,changes);assert.equal(api.parseGroundedCaseAudit(JSON.stringify(invalid),r,plan,content,[]).ok,false);}
 for(const changes of [{roleConsistent:false},{factsPreserved:false},{reliefConsistent:false},{unsupportedAssertions:['ادعاء غير مسند']}])assert.equal(api.parseGroundedCaseAudit(JSON.stringify({...a,...changes}),r,plan,content,[]).ok,false);
});
test('selected grounded audit still requires the issue own cited source and keeps omitted issues incomplete',()=>{
 const p={...plan,researchGaps:[],issues:[{...plan.issues[0],sourceMarkers:['م1']}]};
 const c={...content,grounds:content.grounds+'\n【م1】 【م2】'},r=request(p,c),a=wire(r),e=[{documentId:1,text:'مصدر اختبار اصطناعي'},{documentId:2,text:'مصدر آخر اصطناعي'}];
 assert.equal(api.parseGroundedCaseAudit(JSON.stringify(a),r,p,c,e).ok,false);
 a.checks[0].substance.sourceMarkers=['م2'];assert.equal(api.parseGroundedCaseAudit(JSON.stringify(a),r,p,c,e).ok,false);
 a.checks[0].substance.sourceMarkers=['م1'];const parsed=api.parseGroundedCaseAudit(JSON.stringify(a),r,p,c,e);assert.equal(parsed.ok,true);assert.equal(parsed.complete,true);
 a.checks[0].checkKey='issue_0_omitted';const omitted=api.parseGroundedCaseAudit(JSON.stringify(a),r,p,c,e);assert.equal(omitted.ok,false);assert.equal(omitted.complete,false);
});
