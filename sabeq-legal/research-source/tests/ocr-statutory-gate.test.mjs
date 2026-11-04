import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';

const ocr = load('../lib/statutory-text.ts');
const bound = load('../lib/bound-draft.ts');
const cite = load('../lib/legal-citation-review.ts');
const language = load('../lib/legal-language.ts');
const caseReasoning = load('../lib/case-reasoning.ts');

// The observed faulty OCR is test input, not a reviewed statute or a source
// to cite. The case, article number and legacy amounts must not be guessed.
const damaged = 'املادة 270 كل من اخذ مسكوكات مزيفة معتقدا أهنا صحيحة، ثم تعامل هبا بعد أن علم بتزييفها، يعاقب بغرامة ال جتاوز مخسة أمثال املسكوكات املتعامل بها، عىل أال تقل الغرامة بأي حال عن سبعامئة ومخسني فلسا';
const source = {
  documentId: 999, title: 'قانون اختباري افتراضي', category: 'اختبار', lawNumber: 98765, lawYear: 2000,
  reference: null, text: damaged, sourceUrl: '', officialSource: 'مصدر اختبار', sourceType: 'test',
  documentType: 'تشريع', qualityScore: 90,
  corpus: { scope:'bound_file_only', sourceId:'user-legislation-source',
    sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',
    articleIdentityUnique:true, articleNumber:'270',
    completeArticleVerified:false, lawIdentity:{number:98765,year:2000},
    previousText:'مخسة سياق مشوه من الصفحة السابقة',ocr:{raw:'جتاوز نفس النص المشوه'} },
};

test('damaged Arabic OCR is quarantined and not quoted as authoritative law', () => {
  assert.equal(ocr.statutoryOCRReview(damaged).requiresReview, true);
  assert.equal(ocr.draftStatutoryText(source), null);
  const displayed = ocr.statutoryPromptExcerpt(source.text);
  assert.match(displayed,/محجوب عن التوليد/);
  assert.doesNotMatch(displayed,/سبعامئة|مخسة|عىل/);
  const input={facts:'واقعة اختبارية فقط',requests:'طلب اختباري فقط'};
  const draft=bound.prepareBoundDraft(
    {...input,grounds:'المادة 270 من القانون رقم 98765 لسنة 2000 【م1】',
      factualNotes:[],legalResearchNotes:'',fields:{}},
    input,[source],
  );
  assert.doesNotMatch(draft.grounds,/مخسة|هبا|عىل/);
  const checked=cite.reviewLegalCitations(draft.grounds,[source],{courtDocument:true,requireArticleText:true});
  assert.equal(checked.ok,false);
  assert.ok(checked.issues.some(i=>i.code==='missing_article_text'));
});

test('an unsourced corrupt OCR paragraph cannot slip through the final memo review', () => {
  const result=cite.reviewLegalCitations(damaged,[],{courtDocument:true,requireArticleText:true});
  assert.equal(result.ok,false);
  assert.ok(result.issues.some(i=>i.code==='corrupted_statutory_ocr'));
});

test('ordinary legal spelling is corrected outside literal statutory quotes only', () => {
  const quote='«نص المحكمه الاصلي في هذا الاختبار»';
  const result=ocr.preserveLegalQuotes('تقدمت للمحكمه بطلب. '+quote+' ورفعت المذكره.', v=>language.correctLegalProse(v));
  assert.match(result,/تقدمت للمحكمة بطلب/);
  assert.match(result,/ورفعت المذكرة/);
  assert.ok(result.includes(quote));
  assert.equal(ocr.statutoryOCRReview('نص اختبار سليم فيه أرقام وبنود').requiresReview,false);
  assert.equal(ocr.statutoryPromptExcerpt('نص اختبار سليم'), 'نص اختبار سليم');
});

test('civil procedural research is relevant-only, not attached to penal defenses', () => {
  const civil=caseReasoning.caseResearchQueries({
    caseType:'مدني',partyRole:'مدعى عليه',court:'المحكمة الكلية',
    facts:'دعوى مدنية بشأن مطالبة مالية وعقد متنازع عليه',requests:'رفض المطالبة',
  });
  assert.ok(civil.some(q=>q.includes('المرافعات')&&q.includes('38')));
  const penal=caseReasoning.caseResearchQueries({
    caseType:'جزائي',partyRole:'متهم',court:'محكمة الجنح',
    facts:'اتهام جزائي يتعلق بتزييف عملة',requests:'البراءة',
  });
  assert.ok(!penal.some(q=>q.includes('المرافعات المدنية')));
});
