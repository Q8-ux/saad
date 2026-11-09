import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from './template-harness.mjs';
const root=new URL('../',import.meta.url),hash=t=>createHash('sha256').update(t).digest('hex');
const records=JSON.parse(readFileSync(process.env.REVIEWS_FIXTURE_PATH||new URL('server-data/reviewed-bound-articles.json',root))).articles;
const api=load('../lib/bound-article-reviews.ts'),statute=load('../lib/statutory-text.ts'),citations=load('../lib/legal-citation-review.ts');
test('three located wording errors use identified primary publications instead of language-model repairs',async()=>{
 const corrected=records.filter(r=>r.sourceCorrection);assert.equal(corrected.length,3);await api.checkBoundArticleReviewIntegrity(records);
 for(const [id,after,before] of [[1000004085,'وأعيد المتعاقدان','وأعيد المتعاقدون'],[1000001076,'حسبما يوحي إليه ضميرها','حسبما يوحيه إليه ضميرها'],[1000003246,'من الحكومة أو إحدى المؤسسات العامة','من المحكمة أو إحدى المؤسسات العامة']]){
  const r=records.find(r=>r.chunkId===id);assert.ok(r);assert.ok(r.text.includes(after));assert.ok(!r.text.includes(before));assert.equal(r.sourceCorrection.publishedText,r.text);
  for(const image of r.sourceCorrection.images){assert.equal(hash(readFileSync(new URL(image.file,root))),image.sha256);}
 }
 const a=records.find(r=>r.chunkId===1000003246);assert.equal(a.completeArticleVerified,false);assert.equal(a.sourceCorrection.method,'primary_publication_text_comparison');assert.equal(a.sourceCorrection.hashScope,'retrieved_text_excerpt');
});
test('a correction retains its bound occurrence and original hash but identifies the compared source separately',()=>{
 const r=records.find(r=>r.sourceCorrection);assert.ok(r);
 const raw={chunkId:r.chunkId,lawNumber:r.lawNumber,lawYear:r.lawYear,title:r.title,text:'مصدر خام للاختبار البرمجي',sourceUrl:'https://example.invalid/original',corpus:{scope:'bound_file_only',sourceId:r.sourceId,sourceSha256:r.sourceSha256,recordId:r.recordId,documentId:r.documentId,page:r.page,detectedArticleNumber:r.articleNumber,textSha256:r.originalTextSha256}};
 const out=api.attachBoundArticleReview(raw,[r]);assert.notEqual(out,raw);assert.equal(out.corpus.scope,'bound_file_with_reviewed_errata');assert.equal(out.corpus.originalTextSha256,r.originalTextSha256);assert.equal(out.sourceUrl,r.sourceCorrection.sourceUrl);assert.equal(raw.text,'مصدر خام للاختبار البرمجي');assert.equal(out.corpus.currentLawVerified,false);assert.ok(statute.draftStatutoryText(out));
 assert.equal(citations.reviewLegalCitations(`المادة ${r.articleNumber} من القانون رقم ${r.lawNumber} لسنة ${r.lawYear} 【م1】`,[out]).ok,true);
 for(const corrupt of [{sourceUrl:'https://example.invalid/law.pdf'},{sourceSha256:''},{publishedText:'تغيير غير متحقق'},{textSha256:'f'.repeat(64)}])assert.equal(api.attachBoundArticleReview(raw,[{...r,sourceCorrection:{...r.sourceCorrection,...corrupt}}]),raw);
});
