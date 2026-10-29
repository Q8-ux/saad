import { boundNormalize, boundTokens } from './bound-legislation-core';
export const ARCHIVE_SCOPE = 'reviewed_archive_image';
export const ARCHIVE_SOURCE_ID = 'kw-tashree3at-20260401-a0fc35daf938';
export const ARCHIVE_SOURCE_SHA = 'a0fc35daf938f0f3a1c5b0daf0d34b466400472e20029892354c2af60c805d60';
export const ARCHIVE_CHUNK_BASE = 4_000_000_000;
export type ReviewedImagePassage = { pdf_page:number; xref:number; verified_text:string; text_sha256:string; source_image_sha256:string; full_transcription_verified:number; unresolved_json:string; section_id:string; title:string; source_sha256:string; edition_claim:string; payload_sha256:string };
const exactTokens=(value:string)=>new Set(boundNormalize(value).split(' '));
export function searchReviewedImagePassages(rows:ReviewedImagePassage[],query:string,limit=2){
 const tokens=boundTokens(query);if(!tokens.length)return [];
 const prepared=rows.filter(r=>r.source_sha256===ARCHIVE_SOURCE_SHA&&r.verified_text).map(r=>({r,words:exactTokens(r.verified_text)}));
 const weights=new Map(tokens.map(t=>[t,Math.log(1+prepared.length/(1+prepared.filter(p=>p.words.has(t)).length))]));
 return prepared.map(p=>({...p,score:tokens.reduce((n,t)=>n+(p.words.has(t)?weights.get(t)!:0),0)})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.r.pdf_page-b.r.pdf_page).slice(0,Math.max(1,Math.min(limit,4))).map(({r})=>({
  chunkId:ARCHIVE_CHUNK_BASE+r.pdf_page,documentId:3_100_001,title:r.title,category:'تفريغ جداول مصورة مراجع — إصدار أبريل',lawNumber:null,lawYear:null,reference:`حقول جدول مصور؛ صفحة PDF ${r.pdf_page}؛ إصدار ${r.edition_claim}`,text:r.verified_text,
  sourceUrl:`https://q8-ux.github.io/saad/sabeq-legal/source.html?edition=2026-04-01&page=${r.pdf_page}`,officialSource:'ملف المستخدم؛ حقول الصورة مطابقة بصرياً؛ السريان الكامل غير مثبت',sourceType:'user_document',documentType:'جدول أرشيفي للشرح فقط',qualityScore:0,
  corpus:{scope:ARCHIVE_SCOPE,sourceId:ARCHIVE_SOURCE_ID,sourceSha256:r.source_sha256,databaseSha256:'',recordId:`image-${r.xref}-page-${r.pdf_page}`,textSha256:r.text_sha256,page:r.pdf_page,printedPage:null,documentId:r.section_id,documentTitle:r.title,articleNumber:null,detectedArticleNumber:null,articleIdentityUnique:false,completeArticleVerified:false,currentLawVerified:false,reviewStatus:'visually_checked_fields_only',editionClaim:r.edition_claim,lawIdentity:null,context:{previousPage:null,nextPage:null},previousText:'',nextText:'',ocr:null,draftingEligible:false,fullImageTranscriptionVerified:Boolean(r.full_transcription_verified),unresolvedFields:JSON.parse(r.unresolved_json),sourceImageSha256:r.source_image_sha256,hashScope:'full_verified_image_text'}
 }));
}
