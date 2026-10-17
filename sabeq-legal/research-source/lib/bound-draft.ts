import {selectMatterSources} from "./matter-facts";
import type {PleadingContent,PleadingInput} from './pleading-document';
import type {LegalEvidence} from './legal-search';
import {hasReviewedJudgment} from './judgment-evidence';
const normal=(s:string)=>s.normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065f]/g,'');
/** Only an explicit factual sector excludes a distinct sector's enactment. */
export function scopeEvidenceToFacts(evidence:LegalEvidence[],caseText:string){
 return selectMatterSources(evidence,caseText);
}
export function prepareBoundDraft(content:PleadingContent,input:PleadingInput,evidence:LegalEvidence[]):PleadingContent{
 const boundary=normal(input.requests+' '+input.facts);
 // Preserve an explicit closed relief boundary. Optional new claims need a
 // separate user approval, even when a model/auditor suggests them.
 const locked=/دون\s+(?:اي\s+)?(?:اضافه\s+)?طلبات\s+اخر[ىي]|دون\s+اضافه\s+(?:اي\s+)?طلبات|لا\s+(?:تضف|اريد)\s+طلبات\s+(?:اضافيه|اخر[ىي])/.test(boundary);
 const text=content.grounds;
 const grounds=text.replace(/[【\[]\s*م(\d+)\s*[】\]]/g,(marker,n,offset)=>{
  const s=evidence[Number(n)-1],c=s?.corpus;
  if(s&&hasReviewedJudgment(s)&&s.judgment?.analogy){
   const j=s.judgment,date=j.decisionDate.split('-').reverse().join('/');
   const citation=` (تمييز ${j.chamber}؛ الطعن رقم ${j.appealNumber} لسنة ${j.appealYear}؛ جلسة ${date}؛ صفحة PDF ${j.pdfPage})`;
   return text.slice(Math.max(0,offset-citation.length),offset)===citation?marker:citation+marker;
  }
  if(!c||!c.articleIdentityUnique||!c.articleNumber)return marker;
  const identity=c.lawIdentity?`، القانون رقم ${c.lawIdentity.number} لسنة ${c.lawIdentity.year}`:'';
  const citation=` (المادة ${c.articleNumber} من ${s.title}${identity}؛ صفحة PDF ${c.page}${c.continuationPage?"–"+c.continuationPage:""})`;
  return text.slice(Math.max(0,offset-citation.length),offset)===citation?marker:citation+marker;
 });
 return {...content,grounds,requests:locked?input.requests:content.requests};
}
