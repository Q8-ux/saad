import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from './template-harness.mjs';
const data=JSON.parse(readFileSync(new URL('../server-data/reviewed-judgments.json',import.meta.url),'utf8'));
const judicial=load('../lib/judgment-evidence.ts');
const core=load('../lib/reviewed-judgments.ts',{'@/server-data/reviewed-judgments.json':data,'./bound-legislation-core':load('../lib/bound-legislation-core.ts')});
const index=await core.makeReviewedJudgmentIndex(data);
const citation=load('../lib/legal-citation-review.ts');
const reasoning=load('../lib/case-reasoning.ts');
const fees=index.search('التظلم تقدير الرسوم القضائية')[0];
test('only the individually source-page-reviewed sample enters the index',()=>{
 assert.equal(data.sources.length,7);assert.equal(data.sources.reduce((n,s)=>n+s.pages,0),5108);assert.equal(data.records.length,3);
 assert.ok(data.records.every(r=>judicial.hasReviewedJudgment({text:r.judgment.quote,judgment:r.judgment})));
 assert.ok(data.sources.every(s=>!s.wholeCollectionReviewed));
});
test('independent queries retrieve complete reviewed principles without a made-up fallback',()=>{
 assert.equal(fees.judgment.appealNumber,89);assert.equal(fees.judgment.appealYear,1984);
 assert.ok(index.search('استخلاص الوكالة المستندات القرائن').some(s=>s.judgment.appealNumber===113));
 assert.equal(index.search('محكمة التمييز حكم جلسة').length,0);
 assert.equal(index.search('مكافأة نهاية الخدمة النفط').length,0);
 assert.equal(index.read([1,1000000001,2000000004]).length,0);
 assert.equal(index.read([fees.chunkId])[0].text,fees.text);
});
test('source hash, exact quote hash and impossible reference chronology fail closed',async()=>{
 for(const change of [r=>r.judgment.quote+=' نص لم يخضع للمراجعة',r=>r.judgment.sourceSha256='f'.repeat(64),r=>r.judgment.decisionDate='1980-02-30',r=>r.judgment.reviewStatus='needs_review',r=>r.judgment.appealYear=2027]){
  const bad=JSON.parse(JSON.stringify(data));change(bad.records[0]);await assert.rejects(core.makeReviewedJudgmentIndex(bad));
 }
});
test('number, year, date and adjacent source must belong to the same reviewed judgment',()=>{
 const valid='قضاء محكمة التمييز في الطعن رقم 89 لسنة 1984 جلسة 26/12/1984 【م1】';
 assert.equal(citation.reviewLegalCitations(valid,[fees]).ok,true);
 const other=index.search('استخلاص الوكالة المستندات القرائن').find(s=>s.judgment.appealNumber===113);
 assert.equal(citation.reviewLegalCitations('الطعن رقم 89 لسنة 1984 جلسة 20/06/1979 【م1】【م2】',[fees,other]).ok,false);
 for(const text of ['الطعن رقم 98 لسنة 1984 【م1】','الطعن رقم 89 لسنة 1985 【م1】','الطعن رقم 89 لسنة 1984 جلسة 25/12/1984 【م1】','الطعن رقم 89 لسنة 1984 【م2】','استقر قضاء محكمة التمييز على ذلك 【م1】']){
  const sources=text.startsWith('استقر')?[{...fees,judgment:undefined}]:[fees];assert.equal(citation.reviewLegalCitations(text,sources).ok,false,text);
 }
});
const input={clientName:'شخص افتراضي',partyRole:'مدعٍ',otherParty:'خصم افتراضي',caseType:'مدني',facts:'أودع المعترض تظلماً من أمر تقدير الرسوم بتقرير في قلم الكتاب.',requests:'فحص الإجراء القضائي فقط.'};
const issue={issue:'شكل التظلم من تقدير الرسوم',factQuote:input.facts,document:'واقعة مفترضة للاختبار',sourceMarkers:['م1'],application:'فحص الطريق الإجرائي مع مراجعة النص المعمول به',counterargument:'قد تختلف النصوص المنظمة بحسب التاريخ',response:'تبقى مراجعة الانطباق الزمني واجبة',proposedRelief:input.requests,missing:''};
const match={sourceMarker:'م1',issueIndex:0,treatment:'analogous',factQuote:input.facts,reason:'تتحد المسألة الإجرائية والواقعة المفترضة المحددة في هذا الاختبار.',differences:'هذه بيانات اختبار؛ يلزم في القضية الفعلية بحث النص والتاريخ.'};
const plan=()=>({clientRole:input.partyRole,opponentRole:'مدعى عليه',characterization:'إجراء اختبار',issues:[{...issue}],missingFacts:[],researchGaps:[],precedentMatches:[{...match}]});
test('a supporting memo citation needs a checked fact/issue analogy, not retrieval alone',()=>{
 const text='الطعن رقم 89 لسنة 1984 【م1】',options={requireJudgmentAnalogy:true};
 assert.equal(citation.reviewLegalCitations(text,[fees],options).ok,false);
 assert.equal(citation.reviewLegalCitations('ادعاء عام دون رقم طعن 【م1】',[fees],options).ok,false);
 const checked=reasoning.parseCasePlan(JSON.stringify(plan()),input,[fees]);
 const sources=reasoning.applyCheckedJudgmentMatches([fees],checked);
 assert.equal(citation.reviewLegalCitations(text,sources,options).ok,true);
 for(const treatment of ['distinguished','insufficient']){const p=plan();p.precedentMatches[0].treatment=treatment;const checked=reasoning.parseCasePlan(JSON.stringify(p),input,[fees]);assert.equal(citation.reviewLegalCitations(text,reasoning.applyCheckedJudgmentMatches(sources,checked),options).ok,false);}
});
test('a fabricated fact, another issue or source cannot manufacture an analogy',()=>{
 for(const change of [m=>m.factQuote='واقعة لم يذكرها الزائر',m=>m.sourceMarker='م2',m=>m.issueIndex=1,m=>m.reason='كلمات']){const p=plan();change(p.precedentMatches[0]);assert.throws(()=>reasoning.parseCasePlan(JSON.stringify(p),input,[fees]));}
});
