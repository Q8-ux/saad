import data from '@/server-data/reviewed-judgments.json';
import {boundNormalize,boundTokens} from './bound-legislation-core';
import {hasReviewedJudgment,type JudgmentReference} from './judgment-evidence';
import type {LegalEvidence} from './legal-search';
type RecordRow={chunkId:number;documentId:number;title:string;issueTags:string[];materialConditions:string[];judgment:JudgmentReference};
type Corpus={records:RecordRow[];sources:Array<{sha256:string;pages:number}>};
export async function makeReviewedJudgmentIndex(corpus:Corpus){
 const records:RecordRow[]=[];const ids=new Set<number>();
 for(const r of corpus.records){const j=r.judgment;
  if(!hasReviewedJudgment({text:j.quote,judgment:j})||!Number.isSafeInteger(r.chunkId)||r.chunkId<3_000_000_000||ids.has(r.chunkId)||!corpus.sources.some(s=>s.sha256===j.sourceSha256&&j.pdfPage<=s.pages))throw Error('invalid_reviewed_judgment');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(j.quote))),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==j.quoteSha256)throw Error('judgment_quote_integrity_failed');ids.add(r.chunkId);records.push(r);
 }
 const evidence=(r:RecordRow):LegalEvidence=>({chunkId:r.chunkId,documentId:r.documentId,title:r.title,category:r.issueTags.join('؛ '),lawNumber:null,lawYear:null,reference:`الطعن رقم ${r.judgment.appealNumber} لسنة ${r.judgment.appealYear}؛ جلسة ${r.judgment.decisionDate}؛ الدائرة ${r.judgment.chamber}؛ صفحة PDF ${r.judgment.pdfPage}`,text:r.judgment.quote,sourceUrl:'',officialSource:'تجميع قضائي مرفوع من المستخدم؛ تمت مطابقة هذا المبدأ بصفحته فقط',sourceType:'user_document',documentType:'مبدأ تمييز من تجميع قضائي',qualityScore:0,libraryUpdatedAt:r.judgment.reviewedAt,judgment:{...r.judgment}});
 return {search(query:string,limit=6){const ts=boundTokens(query).filter(t=>!['محكمه','المحكمه','التمييز','تمييز','احكام','حكم','مبادي','الطعن','قضائي','جلسه'].includes(t));return records.map(r=>{const issue=boundNormalize(r.issueTags.join(' ')),body=boundNormalize(r.judgment.quote),hits=ts.filter(t=>body.includes(t));return {r,hits:hits.length,score:hits.reduce((n,t)=>n+1+Number(issue.includes(t))*2,0)};}).filter(x=>x.hits>=2).sort((a,b)=>b.score-a.score||a.r.chunkId-b.r.chunkId).slice(0,Math.max(1,Math.min(limit,8))).map(x=>evidence(x.r));},read(ids:number[]){return records.filter(r=>ids.includes(r.chunkId)).slice(0,6).map(evidence);}};
}
let ready:ReturnType<typeof makeReviewedJudgmentIndex>|undefined;
const index=()=>ready??=makeReviewedJudgmentIndex(data as Corpus).catch(e=>{ready=undefined;throw e;});
export async function searchReviewedJudgments(query:string,limit=6){return(await index()).search(query,limit);}
export async function readReviewedJudgments(ids:number[]){return(await index()).read(ids);}
