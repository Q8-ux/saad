/** SERVER ONLY: compressed private source must never be imported by a client component. */
import payload from '../server-data/legislation-corpus.json';
import {makeBoundIndex,type BoundCorpus} from './bound-legislation-core';
import articleReviews from '../server-data/reviewed-bound-articles.json';
import {attachBoundArticleReview,checkBoundArticleReviewIntegrity,type BoundArticleReview} from './bound-article-reviews';
let ready:Promise<ReturnType<typeof makeBoundIndex>>|undefined;
export function boundLegislation(){return ready??=load().catch(e=>{ready=undefined;throw e;});}
async function load(){
 const bytes=Uint8Array.from(atob(payload.gzip),c=>c.charCodeAt(0));
 const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==payload.sha256)throw new Error('legislation_integrity_failed');
 await checkBoundArticleReviewIntegrity(articleReviews.articles as BoundArticleReview[]);
 return makeBoundIndex(JSON.parse(new TextDecoder().decode(raw)) as BoundCorpus);
}
const reviewed=(item:ReturnType<ReturnType<typeof makeBoundIndex>['search']>[number])=>attachBoundArticleReview(item!,articleReviews.articles as BoundArticleReview[]);
export async function searchBoundEvidence(query:string,limit=8,kind?:'legislation'|'judgment'){return kind==='judgment'?[]:(await boundLegislation()).search(query,limit).map(reviewed);}
export async function readBoundEvidence(ids:number[]){return(await boundLegislation()).read(ids).map(reviewed);}
export function corpusContext(item:{corpus?:unknown}){return item.corpus?`\nبيانات مسار التشريعات (ليست اعتماداً رسمياً): ${JSON.stringify(item.corpus)}\nرقم المادة يحدد موضعاً في القسم فقط؛ لا تعيّن رقم القانون وسنته من الذاكرة؛ استخدم lawIdentity فقط إن توفر. استمرار النص والهوامش يخضعان للمراجعة.\n`:'';}
