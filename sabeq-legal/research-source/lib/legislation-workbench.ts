import { getD1 } from '@/db';
import { EDITION_ID, editionImportStatus } from './legislation-edition-import';
import { auditDigest, getAuditSummary, readStoredArchiveObject } from './legislation-audit';
import { boundNormalize } from './bound-legislation-core';
import type { BoundCorpus } from './bound-legislation-core';
import { RequestError } from './request-security';
import { ARCHIVE_SOURCE_SHA, type ReviewedImagePassage, searchReviewedImagePassages } from './reviewed-archive-core';
import type { LegalEvidence } from './legal-search';
const parsed=(value:unknown)=>JSON.parse(String(value));
function pageNumber(raw:string|null){if(!raw||!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>1549)throw new RequestError('رقم صفحة PDF غير صحيح.');return Number(raw);}
async function completeSource(){
 const source=(await editionImportStatus()).source as Record<string,unknown>|null;
 if(!source||source.status!=='complete'||source.source_sha256!==ARCHIVE_SOURCE_SHA)throw new RequestError('الأرشيف المطابق غير متاح.',503);
 const audit=await getAuditSummary(EDITION_ID);
 if(audit.review?.status!=='complete')throw new RequestError('مراجعة الأرشيف لم تكتمل.',409);
 return {source,audit};
}
export async function legislationWorkbench(){
 const {source,audit}=await completeSource(),db=getD1();
 const [sectionResult,imageResult,current]=await Promise.all([
  db.prepare('SELECT s.id,s.title,s.start_page,s.end_page,s.kind,c.identity_json,c.status,c.official_sources_json,c.findings_json FROM legislation_sections s LEFT JOIN legislation_currency_checks c ON c.source_id=s.source_id AND c.section_id=s.id WHERE s.source_id=? ORDER BY s.start_page').bind(EDITION_ID).all<Record<string,unknown>>(),
  db.prepare('SELECT pdf_page,xref,source_image_sha256,full_transcription_verified,unresolved_json,rows_json FROM legislation_image_reviews WHERE source_id=? ORDER BY pdf_page').bind(EDITION_ID).all<Record<string,unknown>>(),
  import('./bound-legislation').then(async m=>{const index=await m.boundLegislation();return {metadata:index.metadata,documents:index.documents};})
 ]);
 const sections=(sectionResult.results as Record<string,unknown>[]).map(r=>({...r,id:String(r.id),title:String(r.title),start_page:Number(r.start_page),end_page:Number(r.end_page),identity:parsed(r.identity_json),officialSources:parsed(r.official_sources_json),findings:parsed(r.findings_json),identity_json:undefined,official_sources_json:undefined,findings_json:undefined}));
 const images=(imageResult.results as Record<string,unknown>[]).map(r=>({pdf_page:r.pdf_page,xref:r.xref,sourceImageSha256:r.source_image_sha256,fullTranscriptionVerified:Boolean(r.full_transcription_verified),unresolvedFields:parsed(r.unresolved_json),rowOccurrences:parsed(r.rows_json).length}));
 const identities=new Map<string,BoundCorpus['documents']>();
 for(const d of current.documents as BoundCorpus['documents'])if(d.reportedNumber&&d.reportedYear){const key=boundNormalize(`${d.reportedNumber}/${d.reportedYear}`);identities.set(key,[...(identities.get(key)||[]),d]);}
 const compared=sections.map(s=>{const identity=s.identity as {number:string|null;year:string|null};const matches=identity.number&&identity.year?identities.get(boundNormalize(`${identity.number}/${identity.year}`))||[]:[];return {sectionId:s.id,activeSectionId:matches.length===1?matches[0].id:null,candidateSectionIds:matches.map(d=>d.id),requiresIdentitySelection:matches.length>1,identityMetadataMatches:matches.length>0,textCompared:false};});
 return {source:{id:source.id,title:source.title,editionClaim:source.edition_claim,pageCount:source.page_count,sectionCount:source.section_count,articleUnits:source.article_count,sourceSha256:source.source_sha256,currentLawVerified:false,activeForGeneration:false},review:audit.review,reports:audit.reports,sections,images,comparison:{active:current.metadata,sections:compared,notice:'المقارنة لهوية الفهرسة فقط؛ تشابه الرقم والسنة لا يثبت تطابق النص أو سريانه. يبقى مصدر التوليد الحالي مستقلاً.'},usage:{assistant:'visually_verified_image_fields_only',draftingEligible:false}};
}
export async function archiveArticles(url:URL){
 await completeSource();const db=getD1(),id=url.searchParams.get('id');
 if(id){
  if(!/^[a-zA-Z0-9-]{1,160}$/.test(id))throw new RequestError('معرف المادة غير صحيح.');
  const row=await db.prepare('SELECT * FROM legislation_articles WHERE source_id=? AND id=?').bind(EDITION_ID,id).first<Record<string,unknown>>();
  if(!row)throw new RequestError('غير موجود في الملف المتاح.',404);
  if(await auditDigest(String(row.text))!==row.text_sha256)throw new RequestError('بصمة الوحدة غير مطابقة.',503);
  return {article:{...row,segments:parsed(row.segments_json),completeArticleVerified:false,currentLawVerified:false,draftingEligible:false},requiresArticleSelection:false};
 }
 const section=url.searchParams.get('section');if(!section||!/^[a-zA-Z0-9-]{1,100}$/.test(section))throw new RequestError('اختر قسم التشريع أولاً.');
 const found=await db.prepare('SELECT id FROM legislation_sections WHERE source_id=? AND id=?').bind(EDITION_ID,section).first();if(!found)throw new RequestError('القسم غير موجود.',404);
 const rawOffset=url.searchParams.get('offset')||'0';if(!/^\d+$/.test(rawOffset)||Number(rawOffset)>2000)throw new RequestError('إزاحة الصفحة غير صحيحة.');
 const number=boundNormalize(url.searchParams.get('number')||'').replace(/مكررا/g,'مكرر').slice(0,60),offset=Number(rawOffset);
 const rows=(await db.prepare('SELECT id,document_id,component_id,number,heading,start_page,end_page,boundary_review FROM legislation_articles WHERE source_id=? AND document_id=? ORDER BY start_page,id LIMIT 2001').bind(EDITION_ID,section).all<Record<string,unknown>>()).results as Record<string,unknown>[];
 if(rows.length>2000)throw new RequestError('هذا القسم يتطلب تضييق نطاق القراءة.',413);
 const matched=number?rows.filter(r=>boundNormalize(String(r.number)).replace(/مكررا/g,'مكرر')===number):rows;
 return {articles:matched.slice(offset,offset+30),total:matched.length,hasMore:matched.length>offset+30,offset,requiresArticleSelection:Boolean(number&&matched.length>1),requiresComponentSelection:Boolean(number&&new Set(matched.map(r=>r.component_id)).size>1),draftingEligible:false};
}
export async function archiveSourcePage(n:number){
 if(!Number.isInteger(n)||n<1||n>1549)throw new RequestError('رقم صفحة PDF غير صحيح.');
 await completeSource();
 const r=await getD1().prepare('SELECT p.pdf_page,p.printed_page,p.text,p.text_sha256,p.document_id,s.title,i.verified_text,i.text_sha256 AS image_text_sha256,i.unresolved_json,i.full_transcription_verified,c.status AS currency_status FROM legislation_pages p LEFT JOIN legislation_sections s ON s.source_id=p.source_id AND s.id=p.document_id LEFT JOIN legislation_image_reviews i ON i.source_id=p.source_id AND i.pdf_page=p.pdf_page LEFT JOIN legislation_currency_checks c ON c.source_id=p.source_id AND c.section_id=p.document_id WHERE p.source_id=? AND p.pdf_page=?').bind(EDITION_ID,n).first<Record<string,unknown>>();
 if(!r)throw new RequestError('غير موجود في الملف المتاح.',404);
 if(await auditDigest(String(r.text))!==r.text_sha256||r.verified_text&&await auditDigest(String(r.verified_text))!==r.image_text_sha256)throw new RequestError('بصمة الصفحة غير مطابقة.',503);
 return {page:n,printed:r.printed_page,title:r.title||'غلاف المجموعة',text:r.text,reviewedImageText:r.verified_text||'',unresolvedFields:r.unresolved_json?parsed(r.unresolved_json):[],fullImageTranscriptionVerified:r.full_transcription_verified===1,sourceSha256:ARCHIVE_SOURCE_SHA,editionClaim:'2026-04-01',currentLawVerified:false,draftingEligible:false,previousPage:n>1?n-1:null,nextPage:n<1549?n+1:null};
}
export async function archiveAsset(url:URL,origin:string){
 const {source}=await completeSource(),kind=url.searchParams.get('kind');let key:string,hash:string,mime:string,name:string;
 if(kind==='source'){key=`legislation/${source.source_sha256}/source.pdf`;hash=String(source.source_sha256);mime='application/pdf';name='Sabeq_Legislation_20260401.pdf';}
 else if(kind==='image'){
  const p=pageNumber(url.searchParams.get('page')),row=await getD1().prepare('SELECT object_key,source_image_sha256 FROM legislation_image_reviews WHERE source_id=? AND pdf_page=?').bind(EDITION_ID,p).first<{object_key:string;source_image_sha256:string}>();
  if(!row)throw new RequestError('لا توجد صورة مسجلة لهذه الصفحة.',404);key=row.object_key;hash=row.source_image_sha256;mime=key.endsWith('.png')?'image/png':'image/jpeg';name=`source-page-${p}.`+(mime==='image/png'?'png':'jpeg');
 }else throw new RequestError('نوع الملف غير صحيح.');
 const object=await readStoredArchiveObject(key);
 if(!object||object.customMetadata?.sha256!==hash)throw new RequestError('ملف المصدر المحفوظ غير مطابق.',503);
 return new Response(object.body,{headers:{'Content-Type':mime,'Content-Disposition':`inline; filename="${name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
}
let imageCache:Promise<ReviewedImagePassage[]>|undefined;
export async function reviewedArchiveImages(){
 return imageCache??=(async()=>{
  const rows=(await getD1().prepare("SELECT i.pdf_page,i.xref,i.verified_text,i.text_sha256,i.source_image_sha256,i.full_transcription_verified,i.unresolved_json,s.id AS section_id,s.title,m.source_sha256,m.edition_claim,r.payload_sha256 FROM legislation_image_reviews i JOIN legislation_reviews r ON r.id=i.review_id JOIN legislation_imports m ON m.id=i.source_id JOIN legislation_sections s ON s.source_id=i.source_id AND s.start_page<=i.pdf_page AND s.end_page>=i.pdf_page WHERE i.source_id=? AND r.status='complete' AND m.status='complete' AND i.review_method='direct_source_image_inspection' AND i.pdf_page>=1508 ORDER BY i.pdf_page").bind(EDITION_ID).all<ReviewedImagePassage>()).results;
  for(const row of rows)if(row.source_sha256!==ARCHIVE_SOURCE_SHA||await auditDigest(row.verified_text)!==row.text_sha256)throw new RequestError('بصمة التفريغ المراجع غير مطابقة.',503);
  return rows;
 })().catch(e=>{imageCache=undefined;throw e;});
}
export async function searchArchiveForAssistant(query:string,limit=2):Promise<LegalEvidence[]>{return searchReviewedImagePassages(await reviewedArchiveImages(),query,limit);}
