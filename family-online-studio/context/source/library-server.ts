import {canUseLegacyWorks,database,initialManuscriptFor} from "./server-store";
import {parseStoredWork} from "./stored-work";
import {isProject,workOwner} from "./work-catalog";
import {listProjects} from "./studio-projects";
import {env} from "cloudflare:workers";
import {retrieveLibrary,selectLibrary,libraryCandidates,libraryScore,pickLibrarySources,type RankedLibrarySource,type LibraryScope,type LibrarySnapshot} from "./library-assistant";
import {indexSources,rankSources} from "./semantic-search";
export async function readLibrary(owner:string){
 const works=(await listProjects(owner,canUseLegacyWorks(owner))).filter(work=>!work.archivedAt);
 const results=await Promise.allSettled(works.map(async w=>{
  const scopedOwner=workOwner(owner,w.id);
  const row=await database().prepare("SELECT content, revision, updated_at, archived_at, deleted_at FROM manuscripts WHERE owner_id = ?").bind(scopedOwner).first<{content:string;revision:number;updated_at:string;archived_at:string|null;deleted_at:string|null}>();
  if(row?.archived_at||row?.deleted_at||(!row&&isProject(w.id)))throw Error("Work unavailable");
  // Analysis is strictly read-only: do not initialize, migrate or resave a manuscript.
  return{id:w.id,doc:row?parseStoredWork(JSON.parse(row.content)):initialManuscriptFor(scopedOwner),revision:row?.revision||0,updatedAt:row?.updated_at||""};
 }));
 const snapshots:LibrarySnapshot[]=[],unavailable:string[]=[];
 results.forEach((r,i)=>{if(r.status==="fulfilled")snapshots.push(r.value);else unavailable.push(works[i].title);});
 if(!snapshots.length&&works.length)throw Error("تعذر فتح مجموعة أعمالي. أعد المحاولة.");
 return{snapshots,unavailable};
}
type AttachmentRow={id:string;name:string;work_ids:string;text_key:string;text_chars:number;updated_at:string;provenance:string};
async function corpus(owner:string,query:string,scope:LibraryScope){
 const{snapshots,unavailable}=await readLibrary(owner),selected=selectLibrary(snapshots,query,scope),context=retrieveLibrary(snapshots,query,scope);
 const candidates=libraryCandidates(selected,query,400),ids=new Set(selected.map(s=>s.id));
 const all=scope==="auto"&&selected.length===snapshots.length;
 let files=0,filesPartial=false;
 if(env.BUCKET){
  try{
   const rows=await database().prepare("SELECT id,name,work_ids,text_key,text_chars,updated_at,provenance FROM studio_attachments WHERE owner_id = ? AND state = 'ready' AND text_state = 'ready' AND text_key IS NOT NULL ORDER BY updated_at DESC, id DESC LIMIT 101").bind(owner).all<AttachmentRow>();
   filesPartial=rows.results.length>100;let chars=0;
   for(const row of rows.results.slice(0,100)){
    const links=Object.keys(JSON.parse(row.work_ids)),allowed=links.filter(id=>ids.has(id as LibrarySnapshot['id']));
    if(links.length?!allowed.length:!all)continue;
    if(chars+row.text_chars>2_000_000){filesPartial=true;continue;}
    const object=await env.BUCKET.get(row.text_key);if(!object||object.size>1_600_000){filesPartial=true;continue;}
    const text=await object.text();chars+=text.length;files++;
    const workId=allowed[0] as LibrarySnapshot['id']|undefined,work=selected.find(s=>s.id===workId),provenance=JSON.parse(row.provenance||'{}');
    const revision=typeof provenance.revision==='number'?provenance.revision:0;
    for(let start=0,index=0;start<text.length;start+=340,index++){
     let excerpt=text.slice(start,start+400);if(/[\uD800-\uDBFF]$/.test(excerpt))excerpt=excerpt.slice(0,-1);
     const location=row.name+" · مقتطف "+(index+1);
     candidates.push({id:"attachment:"+row.id+":"+index,workId:workId||null,workTitle:work?.doc.title||"ملفاتي المرفوعة",location,text:excerpt,revision,updatedAt:row.updated_at,kind:"attachment",attachmentId:row.id,score:libraryScore(query,location,excerpt),order:candidates.length});
    }
   }
  }catch{filesPartial=true;}
 }
 const truncated=candidates.length>6000;
 return{context,candidates:candidates.slice(0,6000),unavailable,files,filesPartial,truncated};
}
export async function indexLibrary(owner:string,query:string,scope:LibraryScope,signal?:AbortSignal){const c=await corpus(owner,query,scope);return{search:await indexSources(owner,c.candidates,signal),files:c.files,filesPartial:c.filesPartial,truncated:c.truncated};}
export async function lookupLibrary(owner:string,query:string,scope:LibraryScope,signal?:AbortSignal){
 const c=await corpus(owner,query,scope),ranked=await rankSources(owner,c.candidates,query,signal);
 return{...c.context,sources:pickLibrarySources(ranked.candidates),matched:ranked.candidates.some(s=>s.score>0),unavailable:c.unavailable,files:c.files,filesPartial:c.filesPartial,truncated:c.truncated,search:ranked.search,basis:"مقتطفات من أحدث النصوص المحفوظة والمرفقات المستخرجة ضمن النطاق المختار؛ لا تشمل تعديلات لم تُحفظ."};
}
