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
test('six visually transcribed source articles retain exact raw records and image hashes',async()=>{
 assert.equal(privateReviews.articles.length,6);await api.checkBoundArticleReviewIntegrity(privateReviews.articles);
 for(const r of privateReviews.articles){
  const raw=index.read([r.chunkId])[0];assert.ok(raw,r.recordId);assert.equal(raw.corpus.textSha256,r.originalTextSha256);
  const picture=readFileSync(new URL(`server-data/source-reviews/2026-11-07/page-${String(r.page).padStart(4,'0')}.png`,root));assert.equal(createHash('sha256').update(picture).digest('hex'),r.imageSha256);
  const source=api.attachBoundArticleReview(raw,privateReviews.articles);assert.equal(source.text,r.text,r.recordId);assert.equal(statute.draftStatutoryText(source).complete,true);assert.equal(source.corpus.currentLawVerified,false);
 }
});
test('targeted payment research retrieves usable reviewed civil and evidence texts without numerical query hints',()=>{
 const reasoning=load('../lib/case-reasoning.ts'),search=load('../lib/legal-search.ts',{'@/db':{}});
 const queries=reasoning.caseResearchQueries({facts:'يوجد دين وتحويلان وسداد مختلف في صلته بالدين.',requests:'رفض المطالبة بما ثبت سداده.',caseType:'مدني',partyRole:'مدعى عليه'});
 const results=search.mergeLegalEvidenceSets(queries.map(q=>index.search(q,6).map(s=>api.attachBoundArticleReview(s,privateReviews.articles))),12);
 const usable=results.filter(s=>statute.draftStatutoryText(s));
 assert.ok(usable.some(s=>s.lawNumber===67));assert.ok(usable.some(s=>s.lawNumber===39));assert.ok(usable.length>=3);
});
