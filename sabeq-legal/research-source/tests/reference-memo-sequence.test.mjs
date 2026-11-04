import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';

const document = load('../lib/pleading-document.ts');
const bound = load('../lib/bound-draft.ts');
const template = {id:'synthetic-template',version:1,kind:'claim',title:'قالب اصطناعي',sourceFilename:'fixture',
  sourceSha256:'fixture',approvedAt:'2026-01-01'};
const definition = {kind:'claim',title:'قالب اصطناعي',paper:'A4',border:false,emblemData:'',
  labels:{therefore:'لكل ما تقدم'},clauses:{relief:'يلتمس مقدم المذكرة الحكم بما يأتي:'}};
const input = {court:'المحكمة الكلية',courtCircuit:'الدائرة المدنية',caseNumber:'DEMO/2026',
  clientName:'مقدم افتراضي',partyRole:'مدعى عليه',otherParty:'خصم افتراضي',
  facts:'1. أبرم الطرفان اتفاقاً افتراضياً.\n2. حصل الوفاء افتراضياً.',
  requests:'أصلياً: رفض المطالبة فقط.',allParties:''};

test('reference format keeps facts, defenses, rebuttal, relief and actual exhibits in court order', () => {
  const grounds='1. دفع افتراضي مؤسس على واقعة الاختبار.\nالرد على حجج الخصم\n1. جواب افتراضي على الاعتراض.\nحافظة المستندات\nالمستند 1: شهادة اصطناعية مقدمة في الاختبار.';
  const sections=document.splitMemoGrounds(grounds);
  assert.match(sections.defenses,/دفع افتراضي/);
  assert.match(sections.replies,/جواب افتراضي/);
  assert.match(sections.documents,/شهادة اصطناعية/);
  const content={facts:input.facts,grounds,requests:input.requests,fields:{},factualNotes:[],legalResearchNotes:''};
  const doc=document.buildPleadingDocument(template,definition,'memorandum',input,content);
  const text=document.pleadingText(doc);
  const headings=['أولًا: الوقائع','ثانيًا: الدفوع وأوجه الدفاع','ثالثًا: الرد على حجج الخصم',
    'رابعًا: الطلبات','خامسًا: حافظة المستندات'];
  for (const heading of headings) assert.ok(text.includes(heading),heading);
  for (let i=1;i<headings.length;i++) assert.ok(text.indexOf(headings[i-1])<text.indexOf(headings[i]));
  for (const original of [input.facts,input.requests,input.clientName,input.otherParty,input.court,input.caseNumber])
    assert.ok(text.includes(original),original);
  assert.equal((text.match(/حافظة المستندات/g)||[]).length,1);
  assert.match(document.renderPleadingHtml(doc),/first-page framed/);
  assert.doesNotMatch(text,/وزارة العدل|المساعد الذكي|صفحة PDF/);
});

test('no counterargument or exhibit is invented when none was supplied', () => {
  const content={facts:input.facts,grounds:'1. دفع افتراضي فقط.',
    requests:input.requests,fields:{},factualNotes:[],legalResearchNotes:''};
  const text=document.pleadingText(document.buildPleadingDocument(template,definition,'memorandum',input,content));
  assert.match(text,/ثالثًا: الطلبات/);
  assert.doesNotMatch(text,/الرد على حجج الخصم|حافظة المستندات|خبير حسابي/);
});

test('verified available statutory quotation stays inline inside the defense, not in an end bibliography', () => {
  const literal='عبارة تشريعية اصطناعية للتحقق من حفظ النص حرفياً دون أن تشكل قانوناً حقيقياً.';
  const source={documentId:1,title:'قانون اختباري غير حقيقي',lawNumber:98765,lawYear:2000,text:literal,
    corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',
      sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',
      articleIdentityUnique:true,articleNumber:'12',completeArticleVerified:true,
      lawIdentity:{number:98765,year:2000}}};
  const content={facts:input.facts,grounds:'1. الدفع الافتراضي بموجب القاعدة 【م1】.',
    requests:input.requests,fields:{},factualNotes:[],legalResearchNotes:''};
  const prepared=bound.prepareBoundDraft(content,input,[source]);
  const text=document.pleadingText(document.buildPleadingDocument(template,definition,'memorandum',input,prepared));
  assert.match(text,/المادة 12/);
  assert.ok(text.includes(`«${literal}»`));
  assert.ok(text.indexOf(literal)<text.indexOf('ثالثًا: الطلبات'));
  assert.doesNotMatch(text,/مقتطف من نص المادة|【م1】/);
});
