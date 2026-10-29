import reviewed from "@/data/legal-sources/reviewed.json";
import type { LegalEvidence } from "./legal-search";

export type SourceVerification={status:"source_verified";articleNumber:string;checkedAt:string;page:number;sourceSha256:string;textSha256:string;validity:"publication_verified";scope:string;sourceLawNumber:number;sourceLawYear:number};
export const reviewedChunkIds=reviewed.articles.map(a=>a.chunkId);
export function attachOfficialVerification(item:LegalEvidence):LegalEvidence {
  const record=reviewed.articles.find(a=>a.chunkId===item.chunkId&&a.documentId===item.documentId&&a.sourceUrl===item.sourceUrl);
  if(!record || item.lawNumber!==record.sourceLawNumber || item.lawYear!==record.sourceLawYear || item.text.trim()!==record.text.trim()) return item;
  return {...item,title:record.title,lawNumber:record.lawNumber,lawYear:record.lawYear,verification:{status:"source_verified",articleNumber:record.articleNumber,checkedAt:record.checkedAt,page:record.page,sourceSha256:record.sourceSha256,textSha256:record.textSha256,validity:"publication_verified",scope:record.scope,sourceLawNumber:record.sourceLawNumber,sourceLawYear:record.sourceLawYear}};
}
export function officialVerificationSummary() {
 return {revision:"bound-legislation-20261015",scope:"bound_file_only",checkedAt:null,reviewedArticleCount:0,completeLegislationCoverage:false,currentConsolidationVerified:false,sources:[],notice:"البحث من ملف المستخدم فقط؛ الاستخراج ليس اعتماداً رسمياً ولا يثبت سريان القانون. مقاطع المواد تحتاج مراجعة الأصل والاستمرار والهوامش."};
}
