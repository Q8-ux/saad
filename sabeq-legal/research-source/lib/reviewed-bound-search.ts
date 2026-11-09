import {boundNormalize,boundTokens} from './bound-legislation-core';
import {attachBoundArticleReview,type BoundArticleReview} from './bound-article-reviews';
import type {LegalEvidence} from './legal-search';

/** Search the corrected transcription as well as the original extraction.
 * Re-read the original record before attaching a review; keywords cannot lend
 * another occurrence its identity. Explicit article queries use the core index. */
export function searchReviewedBoundEvidence(query:string,reviews:BoundArticleReview[],read:(ids:number[])=>LegalEvidence[],limit=4){
 if(/(?:المادة|مادة|article)\s*[（(]?[\d٠-٩۰-۹]/iu.test(query))return [];
 const tokens=boundTokens(query);
 const ranked=reviews.map(r=>{
  const body=boundNormalize(r.text),title=boundNormalize(r.title);
  const hits=tokens.filter(t=>body.includes(t));
  return {r,hits:hits.length,score:hits.reduce((sum,t)=>sum+Math.min(t.length,8),0)+tokens.filter(t=>title.includes(t)).length};
 }).filter(x=>x.hits>=2).sort((a,b)=>b.score-a.score||a.r.chunkId-b.r.chunkId);
 return ranked.flatMap(({r})=>read([r.chunkId]).flatMap(item=>{
  const checked=attachBoundArticleReview(item,reviews);
  return checked===item?[]:[checked];
 })).slice(0,Math.max(1,Math.min(limit,4)));
}
