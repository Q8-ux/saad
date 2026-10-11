import { getD1 } from "@/db";
import { loadApprovedTemplate } from "@/lib/approved-templates";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";

async function checksum(text:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,"0")).join("");
}

// Explicit administrative export. Private archives and service_records are never queried.
export async function GET(request:Request) {
  const denied=requireAdminService(request); if(denied) return denied;
  const rawAfter=new URL(request.url).searchParams.get("after") || "0";
  if(!/^\d{1,12}$/.test(rawAfter)) return adminJson({error:"مؤشر غير صحيح."},400);
  try {
    const after=Number(rawAfter), items:unknown[]=[];
    if(after===0) for(const kind of ["claim","appeal"] as const) {
      const template=await loadApprovedTemplate(kind);
      const text=JSON.stringify({kind,title:template.info.title,labels:template.definition.labels,clauses:template.definition.clauses});
      items.push({sourceId:`template:${template.info.id}`,visibility:"approved_blank_template",title:template.info.title,text,sourceUrl:"",sourceSha256:await checksum(text)});
    }
    const result=await getD1().prepare(`SELECT c.id AS chunkId,c.document_id AS documentId,c.text,d.title,d.source_url AS sourceUrl
      FROM legal_chunks c JOIN legal_documents d ON d.id=c.document_id
      WHERE c.id>? AND c.verified=1 AND d.has_verified_text=1 AND d.status='ready' AND d.source_type='official_moj'
      ORDER BY c.id LIMIT 100`).bind(after).all<{chunkId:number;documentId:number;text:string;title:string;sourceUrl:string}>();
    const rows=result.results||[];
    for(const row of rows) {
      let original:URL;
      try {original=new URL(row.sourceUrl);} catch {continue;}
      if(original.protocol!=="https:" || !["moj.gov.kw","www.moj.gov.kw"].includes(original.hostname) || original.username || original.password || !row.text || row.text.length>60000) continue;
      items.push({sourceId:`legal:${row.documentId}:${row.chunkId}`,visibility:"public_legal",title:row.title,text:row.text,sourceUrl:row.sourceUrl,sourceSha256:await checksum(row.text)});
    }
    return adminJson({items,nextAfter:rows.length===100?rows[rows.length-1].chunkId:null,skipped:rows.length-(items.length-(after===0?2:0))});
  } catch {return adminJson({error:"تعذر تصدير المعرفة المعتمدة."},503);}
}
