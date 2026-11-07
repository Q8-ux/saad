import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';

const coverage = load('../lib/statutory-authority-coverage.ts');
const bound = load('../lib/bound-draft.ts');
const citations = load('../lib/legal-citation-review.ts');
const pleading = load('../lib/pleading-document.ts');

const articleText = 'نص افتراضي يلزم مقدم الطلب بإيداع المستند محل النزاع دون أن يمثل قانوناً حقيقياً.';
const source = {
  documentId: 1, title:'قانون الاختبار الافتراضي', lawNumber:98765, lawYear:2000,
  text:articleText, documentType:'تشريع', sourceUrl:'', officialSource:'اختبار',
  corpus: {scope:'bound_file_only',sourceId:'user-legislation-source',
    sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',
    articleIdentityUnique:true,articleNumber:'12',completeArticleVerified:false,
    lawIdentity:{number:98765,year:2000}},
};
const input = {caseType:'مدني', court:'المحكمة الكلية',courtCircuit:'الدائرة المدنية الثانية',
  caseNumber:'0012/2026',clientName:'شركة الاختبار الوهمية',partyRole:'مدعى عليها',
  otherParty:'مدعٍ افتراضي',allParties:'',facts:'طلب خصم افتراضي مبلغاً دون تقديم المستند الأصلي.',
  requests:'رفض المطالبة في حدود الوقائع المثبتة فقط.'};
const plan={issues:[{application:'تطبيق المادة على المستند المطلوب',sourceMarkers:['م1'],missing:''}]};
const content={facts:input.facts,requests:input.requests,
  grounds:'أولاً: يتمسك الدفاع بعدم إثبات أصل المستند محل النزاع 【م1】.',
  fields:{},factualNotes:[],legalResearchNotes:''};

test('a reviewed planned statutory article must be quoted in its legal defense, not omitted',()=>{
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(plan,[source],'يتمسك الدفاع بعدم الإثبات.')],['م1']);
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(plan,[source],'تطبيق القاعدة 【م1】')],['م1']);
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(plan,[source],`تطبيق القاعدة 【م1】\n«${articleText}»`)],['م1']);
  const prepared=bound.prepareBoundDraft(content,input,[source]);
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(plan,[source],prepared.grounds)],[]);
  assert.equal(citations.reviewLegalCitations(prepared.grounds,[source],
    {courtDocument:true,requireArticleText:true}).ok,true);
  assert.equal(bound.prepareBoundDraft(prepared,input,[source]).grounds,prepared.grounds);
});

test('court, court circuit, parties, chronology and relief stay intact with the quoted article',()=>{
  const prepared=bound.prepareBoundDraft(content,input,[source]);
  const doc=pleading.buildPleadingDocument(
    {id:'synthetic',version:1,kind:'claim',title:'صحيفة اصطناعية',sourceFilename:'none',
      sourceSha256:'synthetic',approvedAt:'2026-01-01'},
    {kind:'claim',title:'صحيفة اصطناعية',paper:'A4',border:false,emblemData:'',
      labels:{therefore:'لذلك'},clauses:{relief:'يلتمس مقدم المذكرة'}},
    'memorandum',input,prepared
  );
  const text=pleading.pleadingText(doc);
  for(const field of [input.court,input.courtCircuit,input.caseNumber,input.clientName,
    input.partyRole,input.otherParty,input.facts,input.requests,articleText,
    'المادة 12','القانون رقم 98765 لسنة 2000']) {
      assert.ok(text.includes(field),field);
  }
  for(const section of ['الوقائع','الدفوع وأوجه الدفاع','لذلك']){
    assert.ok(text.includes(section),section);
  }
  assert.ok(text.indexOf('الوقائع')<text.indexOf('الدفوع وأوجه الدفاع'));
  assert.ok(text.indexOf('الدفوع وأوجه الدفاع')<text.indexOf('لذلك'));
  assert.doesNotMatch(text,/【م\d+】|صفحة PDF|المراجع|المساعد الذكي/);
  assert.match(pleading.renderPleadingHtml(doc),/dir="rtl"/);
});

test('missing, irrelevant or OCR-corrupted laws never become invented grounds',()=>{
  const noApplication={issues:[{application:'',sourceMarkers:['م1'],missing:''}]};
  const nonmatching={issues:[{application:'متوقف',sourceMarkers:['م1'],missing:'نقص الواقعة'}]};
  const corrupted={...source,text:'املادة مخسة جتاوز سبعامئة مخسني عىل هبا'};
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(noApplication,[source],'')],[]);
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(nonmatching,[source],'')],[]);
  assert.deepEqual([...coverage.missingPlannedStatutoryCitations(plan,[corrupted],'')],[]);
  const draft=bound.prepareBoundDraft(content,input,[corrupted]);
  assert.doesNotMatch(draft.grounds,/املادة|مخسة|سبعامئة/);
  assert.equal(citations.reviewLegalCitations(draft.grounds,[corrupted],
    {courtDocument:true,requireArticleText:true}).ok,false);
});

