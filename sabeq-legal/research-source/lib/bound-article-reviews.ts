import status from '@/data/legal-sources/bound-text-review-status.json';
import type {LegalEvidence} from './legal-search';
export type BoundArticleReview={sourceSha256:string;sourceId:string;recordId:string;documentId:string;chunkId:number;page:number;articleNumber:string;lawNumber:number;lawYear:number;title:string;originalTextSha256:string;textSha256:string;imageSha256:string;text:string;completeArticleVerified:boolean};
export const boundArticleTextReviewSummary=()=>({...status});
export async function checkBoundArticleReviewIntegrity(reviews:BoundArticleReview[]){
 for(const r of reviews){
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.text))),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==r.textSha256)throw new Error('reviewed_article_integrity_failed');
 }
}

/** Reviewed transcription is a separate source layer, never an OCR repair
 * heuristic or a statement that the law remains in force. */
export function attachBoundArticleReview(item:LegalEvidence,reviews:BoundArticleReview[]):LegalEvidence{
 const c=item.corpus;
 if(!c||c.scope!=='bound_file_only'||c.sourceSha256!==status.sourceSha256)return item;
 const r=reviews.find(r=>r.sourceSha256===c.sourceSha256&&r.sourceId===c.sourceId&&r.recordId===c.recordId&&r.documentId===c.documentId&&r.chunkId===item.chunkId&&r.page===c.page&&r.articleNumber===c.detectedArticleNumber&&r.originalTextSha256===c.textSha256&&r.lawNumber===item.lawNumber&&r.lawYear===item.lawYear);
 if(!r||!r.completeArticleVerified||!r.text.trim()||![r.textSha256,r.imageSha256].every(s=>/^[a-f0-9]{64}$/.test(s)))return item;
 return {...item,title:r.title,text:r.text,corpus:{...c,articleNumber:r.articleNumber,articleIdentityUnique:true,completeArticleVerified:true,continuationPage:null,textSha256:r.textSha256,reviewStatus:'visually_reviewed_full_article',hashScope:'full_reviewed_transcription',originalTextSha256:r.originalTextSha256,sourceImageSha256:r.imageSha256,currentLawVerified:false}};
}
