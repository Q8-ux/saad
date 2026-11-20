import {env} from "cloudflare:workers";
import {createHash} from "node:crypto";
import {Buffer} from "node:buffer";
import type {RankedLibrarySource} from "./library-assistant";

export const SEARCH_MODEL="studio-search-270m-i2s-q8emb-v1";
const DIMENSIONS=640,MAX_RECORDS=6000,MAX_CACHE_BYTES=7_000_000;
type Cache={model:string;vectors:Record<string,string>};
export type SearchProgress={configured:boolean;indexed:number;total:number;ready:boolean;semantic:boolean;message:string};
export function searchConfig(){
 const values=env as unknown as Record<string,string|undefined>;
 let url="";try{const u=new URL(values.STUDIO_SEARCH_URL||"");if(u.protocol==="https:"&&!u.username&&!u.password&&!u.hash&&!u.search)url=u.href;}catch{}
 return{url,key:values.STUDIO_SEARCH_KEY||""};
}
export function searchConfigured(){const c=searchConfig();return !!(c.url&&c.key&&env.BUCKET);}
export function searchFingerprint(source:RankedLibrarySource){return createHash("sha256").update(JSON.stringify([source.id,source.workId,source.revision,source.updatedAt,source.location,source.text])).digest("hex");}
function cacheKey(owner:string){return"studio-search/"+createHash("sha256").update(owner).digest("hex")+"/"+SEARCH_MODEL+".json";}
function validVector(value:unknown):value is string{return typeof value==="string"&&value.length===856&&Buffer.from(value,"base64").byteLength===DIMENSIONS;}
async function readCache(owner:string){
 const object=await env.BUCKET!.get(cacheKey(owner));
 const empty:Cache={model:SEARCH_MODEL,vectors:{}};
 if(!object||object.size>MAX_CACHE_BYTES)return{cache:empty,etag:object?.etag};
 try{const value=JSON.parse(await object.text()) as Cache;if(value.model!==SEARCH_MODEL||!value.vectors||typeof value.vectors!=="object"||Array.isArray(value.vectors))return{cache:empty,etag:object.etag};
 const vectors:Record<string,string>={};for(const[key,vector]of Object.entries(value.vectors).slice(-MAX_RECORDS))if(/^[a-f0-9]{64}$/.test(key)&&validVector(vector))vectors[key]=vector;
 return{cache:{model:SEARCH_MODEL,vectors},etag:object.etag};}catch{return{cache:empty,etag:object.etag};}
}
function pack(vector:number[]){const max=Math.max(...vector.map(Math.abs));if(!(max>0))throw Error("empty embedding");return Buffer.from(Int8Array.from(vector.map(v=>Math.max(-127,Math.min(127,Math.round(v/max*127))))).buffer).toString("base64");}
export function vectorSimilarity(query:number[],packed:string){const bytes=Buffer.from(packed,"base64"),values=new Int8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);let dot=0,a=0,b=0;for(let i=0;i<DIMENSIONS;i++){dot+=query[i]*values[i];a+=query[i]**2;b+=values[i]**2;}return a&&b?dot/Math.sqrt(a*b):0;}
async function embed(texts:string[],signal?:AbortSignal){
 const c=searchConfig();if(!searchConfigured())throw Error("search not configured");
 const response=await fetch(c.url,{method:"POST",headers:{Authorization:"Bearer "+c.key,"Content-Type":"application/json"},body:JSON.stringify({model:SEARCH_MODEL,input:texts}),redirect:"manual",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(65000)]):AbortSignal.timeout(65000)});
 if(!response.ok){await response.body?.cancel();throw Error("search unavailable");}
 const raw=await response.text();if(raw.length>100000)throw Error("embedding size");const data=JSON.parse(raw) as{model?:string;data?:{index:number;embedding:number[]}[]};
 if(data.model!==SEARCH_MODEL||!Array.isArray(data.data)||data.data.length!==texts.length)throw Error("embedding model");
 return texts.map((_,i)=>{const matches=data.data!.filter(d=>d.index===i);const v=matches[0]?.embedding;if(matches.length!==1||!Array.isArray(v)||v.length!==DIMENSIONS||!v.every(x=>typeof x==="number"&&Number.isFinite(x))||!v.some(x=>x!==0))throw Error("embedding format");return v;});
}
async function mergeCache(owner:string,additions:Record<string,string>){
 for(let attempt=0;attempt<3;attempt++){
  const {cache,etag}=await readCache(owner),vectors=Object.fromEntries(Object.entries({...cache.vectors,...additions}).slice(-MAX_RECORDS));
  const result=await env.BUCKET!.put(cacheKey(owner),JSON.stringify({model:SEARCH_MODEL,vectors}),{httpMetadata:{contentType:"application/json"},onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:"*"}});
  if(result)return{model:SEARCH_MODEL,vectors};
 }
 throw Error("search cache conflict");
}
function progress(candidates:RankedLibrarySource[],cache:Cache,semantic=false):SearchProgress{
 const indexed=candidates.filter(c=>cache.vectors[searchFingerprint(c)]).length,total=candidates.length;
 return{configured:true,indexed,total,ready:indexed===total,semantic,message:indexed===total?"البحث محدّث للنصوص المحفوظة.":"جارٍ تجهيز البحث؛ تظهر النتائج المتاحة أثناء التحديث."};
}
export async function indexSources(owner:string,candidates:RankedLibrarySource[],signal?:AbortSignal){
 if(!searchConfigured())return{configured:false,indexed:0,total:candidates.length,ready:false,semantic:false,message:"البحث بالكلمات متاح؛ البحث بالمعنى غير متصل حاليًا."} satisfies SearchProgress;
 let {cache}=await readCache(owner);const pending=candidates.filter(c=>!cache.vectors[searchFingerprint(c)]).slice(0,2);
 if(pending.length){const vectors=await embed(pending.map(c=>[c.workTitle.slice(0,24),c.location.slice(0,40),c.text].join("\n").slice(0,450)),signal);cache=await mergeCache(owner,Object.fromEntries(pending.map((c,i)=>[searchFingerprint(c),pack(vectors[i])])));}
 return progress(candidates,cache);
}
export async function rankSources(owner:string,candidates:RankedLibrarySource[],query:string,signal?:AbortSignal){
 if(!searchConfigured())return{candidates,search:{configured:false,indexed:0,total:candidates.length,ready:false,semantic:false,message:"البحث بالكلمات متاح."} satisfies SearchProgress};
 const {cache}=await readCache(owner),state=progress(candidates,cache);
 if(!state.indexed||!query.trim())return{candidates,search:state};
 try{
  const [vector]=await embed(["Instruct: استرجع المقاطع المرتبطة بسؤال الكاتب من نصوصه وملفاته\nQuery: "+query.slice(0,350)],signal);
  // Fuse rankings so precise names/numbers remain useful alongside semantic matches.
  const literal=[...candidates].sort((a,b)=>b.score-a.score||a.order-b.order),lexical=new Map(literal.filter(c=>c.score>0).map((c,i)=>[c.id,1/(40+i)]));
  const semantic=candidates.filter(c=>cache.vectors[searchFingerprint(c)]).map(c=>({id:c.id,similarity:vectorSimilarity(vector,cache.vectors[searchFingerprint(c)])})).sort((a,b)=>b.similarity-a.similarity);
  const dense=new Map(semantic.filter(s=>s.similarity>0.15).map((c,i)=>[c.id,1/(40+i)]));
  return{candidates:candidates.map(c=>({...c,score:(lexical.get(c.id)||0)+(dense.get(c.id)||0)})),search:{...state,semantic:true}};
 }catch{if(signal?.aborted)throw Error("cancelled");return{candidates,search:{...state,semantic:false,message:"تعذر البحث بالمعنى الآن؛ المعروض نتائج مطابقة الكلمات."}};}
}
