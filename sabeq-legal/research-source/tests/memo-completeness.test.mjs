import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const reasoning=load('../lib/case-reasoning.ts');
const pleading=load('../lib/pleading-document.ts');
// Synthetic case and deliberately fictional source identities; no legal authority.
const facts=['بتاريخ 01/01/2026 ورد طلب اصطناعي بمبلغ 1250 دينار.','بتاريخ 03/01/2026 نازع الطرف الاختباري في مبلغ 250 دينار.'];
const requests='رفض الجزء المتنازع عليه فقط.';
const content={facts:facts.join('\n'),grounds:'الدفع الأول: منازعة مقدار المطالبة\nتطبيق اصطناعي على مبلغ المنازعة دون افتراض سداد أو إقرار جديد.',requests,fields:{},factualNotes:[],legalResearchNotes:''};
const plan={issues:[],missingFacts:[],researchGaps:[]};
const audit={ok:true,complete:true,defenseReview:{ok:true},checks:[]};
const template={id:'synthetic',version:1,kind:'claim',title:'قالب اصطناعي',sourceFilename:'synthetic',sourceSha256:'0'.repeat(64),approvedAt:'2026-01-01'};
const definition={kind:'claim',title:'قالب اصطناعي',paper:'A4',border:true,emblemData:'',labels:{therefore:'لكل ما تقدم'},clauses:{relief:'يلتمس مقدم المذكرة الحكم بما يلي:'}};
const input={clientName:'طرف اصطناعي ألف',otherParty:'طرف اصطناعي باء',partyRole:'مدعى عليه',court:'محكمة اختبارية',caseNumber:'QA-001',caseType:'اختبار',facts:content.facts,requests};

test('a positive defense audit cannot mark an absent facts or relief section complete',()=>{
 for(const field of ['facts','grounds','requests']){
  const summary=reasoning.caseQualitySummary(plan,audit,{...content,[field]:' \n '},1);
  assert.equal(summary.status,'incomplete',field+' must be independently present');
 }
});
test('a section heading or placeholder never counts as the completed section',()=>{
 for(const [field,value] of [['facts','الوقائع:'],['grounds','الدفوع وأوجه الدفاع'],['requests','الطلبات'],['facts','................'],['requests','[يستكمل لاحقاً]']]){
  assert.equal(reasoning.caseQualitySummary(plan,audit,{...content,[field]:value},1).status,'incomplete',field+': '+value);
 }
});
test('complete prose can still only be a draft for human review and cannot bypass sources or audit',()=>{
 assert.equal(reasoning.caseQualitySummary(plan,audit,content,1).status,'review_required');
 assert.equal(reasoning.caseQualitySummary(plan,audit,content,0).status,'incomplete');
 assert.equal(reasoning.caseQualitySummary(plan,{...audit,ok:false},content,1).status,'incomplete');
 assert.equal(reasoning.caseQualitySummary(plan,audit,content,1).humanReviewRequired,true);
});
test('memo facts are separate numbered blocks without changing chronology, identifiers or amounts',()=>{
 const doc=pleading.buildPleadingDocument(template,definition,'memorandum',input,content);
 const blocks=doc.pages.flatMap(page=>page.blocks);
 assert.ok(blocks.some(b=>b.text==='1- '+facts[0]));
 assert.ok(blocks.some(b=>b.text==='2- '+facts[1]));
 const text=pleading.pleadingText(doc);
 assert.ok(text.indexOf(facts[0])<text.indexOf(facts[1]));
 assert.match(text,/1250/);assert.match(text,/250/);assert.match(text,/QA-001/);
 assert.equal(text.split(requests).length-1,1);
});
test('numbered Arabic facts are preserved and are never numbered a second time',()=>{
 const numbered='١- '+facts[0]+'\n٢- '+facts[1];
 const doc=pleading.buildPleadingDocument(template,definition,'memorandum',input,{...content,facts:numbered});
 const text=pleading.pleadingText(doc);
 assert.match(text,/١- بتاريخ/);assert.match(text,/٢- بتاريخ/);
 assert.doesNotMatch(text,/1- ١-|2- ٢-/);
});
test('defenses, replies, relief and actual document list stay in order as separate blocks',()=>{
 const grounds=content.grounds+'\nالرد على حجج الخصم\nرد اصطناعي على منازعة وردت فعلاً في المدخل.\nحافظة المستندات\n1- مستند اختبار قرئ في هذه الحالة الاصطناعية.';
 const doc=pleading.buildPleadingDocument(template,definition,'memorandum',input,{...content,grounds});
 const blocks=doc.pages.flatMap(page=>page.blocks),text=pleading.pleadingText(doc);
 assert.ok(blocks.some(b=>b.text==='الدفع الأول: منازعة مقدار المطالبة'&&b.style==='heading'));
 assert.ok(text.indexOf('الدفوع وأوجه الدفاع')<text.indexOf('الرد على حجج الخصم'));
 assert.ok(text.indexOf('الرد على حجج الخصم')<text.indexOf('الطلبات'));
 assert.ok(text.indexOf('الطلبات')<text.indexOf('حافظة المستندات'));
 assert.doesNotMatch(text,/مراجع المواد|ملاحظات المساعد|نتيجة التحليل/);
});

