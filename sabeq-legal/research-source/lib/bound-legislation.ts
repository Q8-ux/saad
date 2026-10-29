/** SERVER ONLY: compressed private source must never be imported by a client component. */
import payload from '../server-data/legislation-corpus.json';
import {makeBoundIndex,type BoundCorpus} from './bound-legislation-core';
let ready:Promise<ReturnType<typeof makeBoundIndex>>|undefined;
export function boundLegislation(){return ready??=load().catch(e=>{ready=undefined;throw e;});}
async function load(){
 const bytes=Uint8Array.from(atob(payload.gzip),c=>c.charCodeAt(0));
 const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==payload.sha256)throw new Error('legislation_integrity_failed');
 return makeBoundIndex(JSON.parse(new TextDecoder().decode(raw)) as BoundCorpus);
}
export async function searchBoundEvidence(query:string,limit=8,kind?:'legislation'|'judgment'){return kind==='judgment'?[]:(await boundLegislation()).search(query,limit);}
export async function readBoundEvidence(ids:number[]){return(await boundLegislation()).read(ids);}
export function corpusContext(item:{corpus?:unknown}){return item.corpus?`\nبيانات مسار التشريعات (ليست اعتماداً رسمياً): ${JSON.stringify(item.corpus)}\nرقم المادة يحدد موضعاً في القسم فقط؛ لا تعيّن رقم القانون وسنته من الذاكرة؛ استخدم lawIdentity فقط إن توفر. استمرار النص والهوامش يخضعان للمراجعة.\n`:'';}
