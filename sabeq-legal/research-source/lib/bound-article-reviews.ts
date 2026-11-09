import status from '@/data/legal-sources/bound-text-review-status.json';
import type {LegalEvidence} from './legal-search';
export type SourceCorrection={sourceUrl:string;sourceSha256:string;hashScope:'downloaded_pdf'|'retrieved_text_excerpt';publishedText:string;textSha256:string;pages:number[];checkedAt:string;edition:string;method:'visual_primary_publication_comparison'|'primary_publication_text_comparison';changes:Array<{before:string;after:string}>;images?:Array<{page:number;sha256:string;file:string}>};
export type BoundArticleReview={sourceSha256:string;sourceId:string;recordId:string;documentId:string;chunkId:number;page:number;articleNumber:string;lawNumber:number|null;lawYear:number|null;title:string;originalTextSha256:string;textSha256:string;imageSha256:string;text:string;completeArticleVerified:boolean;excerptVerified?:boolean;lawIdentityVerified?:boolean;reviewedEndPage?:number;sourcePages?:Array<{page:number;imageSha256:string;pageTextSha256:string}>;sourceCorrection?:SourceCorrection};
export const boundArticleTextReviewSummary=()=>({...status});
export async function checkBoundArticleReviewIntegrity(reviews:BoundArticleReview[]){
 for(const r of reviews){
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.text))),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==r.textSha256||!validCorrection(r))throw new Error('reviewed_article_integrity_failed');
 }
}
function validCorrection(r:BoundArticleReview){
 const p=r.sourceCorrection;if(!p)return true;
 try{const u=new URL(p.sourceUrl);if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.e.gov.kw','e.gov.kw','www.moj.gov.kw','moj.gov.kw'].includes(u.hostname))return false;}catch{return false;}
 return p.publishedText===r.text&&p.textSha256===r.textSha256&&/^[a-f0-9]{64}$/.test(p.sourceSha256)&&['downloaded_pdf','retrieved_text_excerpt'].includes(p.hashScope)&&Array.isArray(p.pages)&&p.pages.length>0&&p.pages.every(n=>Number.isInteger(n)&&n>0)&&Array.isArray(p.changes)&&p.changes.length>0&&p.changes.every(c=>typeof c.before==='string'&&typeof c.after==='string'&&c.before!==c.after&&c.before.trim()&&c.after.trim()&&r.text.includes(c.after))&&['visual_primary_publication_comparison','primary_publication_text_comparison'].includes(p.method);
}

/** Reviewed transcription is a separate source layer, never an OCR repair
 * heuristic or a statement that the law remains in force. */
export function attachBoundArticleReview(item:LegalEvidence,reviews:BoundArticleReview[]):LegalEvidence{
 const c=item.corpus;
 if(!c||c.scope!=='bound_file_only'||c.sourceSha256!==status.sourceSha256)return item;
 const r=reviews.find(r=>r.sourceSha256===c.sourceSha256&&r.sourceId===c.sourceId&&r.recordId===c.recordId&&r.documentId===c.documentId&&r.chunkId===item.chunkId&&r.page===c.page&&r.articleNumber===c.detectedArticleNumber&&r.originalTextSha256===c.textSha256&&((r.lawNumber===item.lawNumber&&r.lawYear===item.lawYear)||(r.lawIdentityVerified===true&&item.lawNumber===null&&item.lawYear===null)));
 if(!r||(!r.completeArticleVerified&&!r.excerptVerified)||!r.text.trim()||!validCorrection(r)||![r.textSha256,r.imageSha256].every(s=>/^[a-f0-9]{64}$/.test(s)))return item;
 if(r.sourcePages&&(!r.sourcePages.some(p=>p.page===r.page&&p.imageSha256===r.imageSha256)||r.sourcePages.some(p=>!Number.isInteger(p.page)||![p.imageSha256,p.pageTextSha256].every(s=>/^[a-f0-9]{64}$/.test(s)))||((r.reviewedEndPage||r.page)>r.page&&!Array.from({length:r.reviewedEndPage!-r.page+1},(_,i)=>r.page+i).every(n=>r.sourcePages!.some(p=>p.page===n)))))return item;
 const lawIdentity=r.lawIdentityVerified&&r.lawNumber&&r.lawYear?{number:r.lawNumber,year:r.lawYear,header:r.title,reviewStatus:'visually_reviewed_section_identity'}:c.lawIdentity;
 return {...item,title:r.title,lawNumber:r.lawNumber,lawYear:r.lawYear,text:r.text,...(r.sourceCorrection?{sourceUrl:r.sourceCorrection.sourceUrl,officialSource:'تصحيح موضعي بمقارنة منشور حكومي؛ اكتمال التعديلات والسريان غير متحققين'}:{}),corpus:{...c,scope:r.sourceCorrection?'bound_file_with_reviewed_errata':c.scope,...(r.sourceCorrection?{sourceCorrection:r.sourceCorrection}:{}),lawIdentity,articleNumber:r.articleNumber,articleIdentityUnique:true,completeArticleVerified:r.completeArticleVerified,continuationPage:null,textSha256:r.textSha256,reviewStatus:r.sourceCorrection?'primary_publication_reconciled':r.completeArticleVerified?'visually_reviewed_full_article':'visually_reviewed_excerpt',hashScope:r.completeArticleVerified?'full_reviewed_transcription':'reviewed_excerpt',originalTextSha256:r.originalTextSha256,sourceImageSha256:r.imageSha256,...(r.sourcePages?{sourcePages:r.sourcePages}:{}),currentLawVerified:false}};
}
