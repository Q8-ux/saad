import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {load} from './template-harness.mjs';
const root=new URL('../',import.meta.url),privateReviews=JSON.parse(readFileSync(new URL('server-data/reviewed-bound-articles.json',root)));
const payload=JSON.parse(readFileSync(new URL('server-data/legislation-corpus.json',root))),data=JSON.parse(gunzipSync(Buffer.from(payload.gzip,'base64')));
const core=await import('data:text/javascript,'+encodeURIComponent(stripTypeScriptTypes(readFileSync(new URL('lib/bound-legislation-core.ts',root),'utf8'))));
const index=core.makeBoundIndex(data),api=load('../lib/bound-article-reviews.ts'),statute=load('../lib/statutory-text.ts');
test('reviewed source articles and excerpts retain exact raw records and image hashes',async()=>{
 assert.equal(privateReviews.articles.length,24);await api.checkBoundArticleReviewIntegrity(privateReviews.articles);
 for(const r of privateReviews.articles){
  const raw=index.read([r.chunkId])[0];assert.ok(raw,r.recordId);assert.equal(raw.corpus.textSha256,r.originalTextSha256);
  const picture=readFileSync(new URL(`server-data/source-reviews/${r.imageDirectory||"2026-11-07"}/page-${String(r.page).padStart(4,'0')}.png`,root));assert.equal(createHash('sha256').update(picture).digest('hex'),r.imageSha256);
  const source=api.attachBoundArticleReview(raw,privateReviews.articles);assert.equal(source.text,r.text,r.recordId);assert.equal(source.corpus.scope,r.sourceCorrection?'bound_file_with_reviewed_errata':'bound_file_only');assert.equal(statute.draftStatutoryText(source).complete,r.completeArticleVerified);assert.equal(source.corpus.currentLawVerified,false);
 }
});
test('targeted payment research retrieves usable reviewed civil and evidence texts without numerical query hints',()=>{
 const reasoning=load('../lib/case-reasoning.ts'),search=load('../lib/legal-search.ts',{'@/db':{}});
 const queries=reasoning.caseResearchQueries({facts:'يوجد دين وتحويلان وسداد مختلف في صلته بالدين.',requests:'رفض المطالبة بما ثبت سداده.',caseType:'مدني',partyRole:'مدعى عليه'});
 const results=search.mergeLegalEvidenceSets(queries.map(q=>index.search(q,6).map(s=>api.attachBoundArticleReview(s,privateReviews.articles))),12);
 const usable=results.filter(s=>statute.draftStatutoryText(s));
 assert.ok(usable.some(s=>s.lawNumber===67));assert.ok(usable.some(s=>s.lawNumber===39));assert.ok(usable.length>=3);
});

const correctedSearch=load('../lib/reviewed-bound-search.ts',{'./bound-legislation-core':core});
test('reviewed wording is searchable and its complete page/image chain matches the bound corpus',()=>{
 for(const r of privateReviews.articles){
  for(const proof of r.sourcePages||[]){
   const bytes=readFileSync(new URL(`server-data/source-reviews/${r.imageDirectory}/page-${String(proof.page).padStart(4,'0')}.png`,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.imageSha256);assert.equal(data.pages.find(p=>p.page===proof.page).sha,proof.pageTextSha256);
  }
  const section=data.documents.find(d=>d.id===r.documentId);assert.equal(r.lawNumber,section.reportedNumber?Number(section.reportedNumber):null);assert.equal(r.lawYear,section.reportedYear?Number(section.reportedYear):null);
 }
 for(const [query,number,law] of [['العقد شريعة المتعاقدين تعديل أحكامه','196',67],['الأدلة التحقيق معلوماته الشخصية','151',17],['التنفيذ سند تنفيذي حق محقق الوجود','190',38],['الورقة العرفية خط إمضاء بصمة','13',39]]){
  const result=correctedSearch.searchReviewedBoundEvidence(query,privateReviews.articles,ids=>index.read(ids));assert.ok(result.some(s=>s.corpus.articleNumber===number&&s.lawNumber===law),query);
 }
 assert.equal(correctedSearch.searchReviewedBoundEvidence('المادة 13 قانون الإثبات',privateReviews.articles,ids=>index.read(ids)).length,0);
 assert.equal(correctedSearch.searchReviewedBoundEvidence('الابتعاث للدكتوراه',privateReviews.articles,ids=>index.read(ids)).length,0);
});
