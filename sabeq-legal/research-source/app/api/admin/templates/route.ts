import { listApprovedTemplates,readApprovedTemplateOriginal } from "@/lib/approved-templates";
import { adminJson,requireAdminService } from "@/lib/admin-service-auth";
export async function GET(request:Request) {
  const denied=await requireAdminService(request); if(denied) return denied;
  try {
    const id=new URL(request.url).searchParams.get("id");
    if(!id) return adminJson({templates:await listApprovedTemplates()});
    const original=await readApprovedTemplateOriginal(id);
    return new Response(original.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${original.filename}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Source-SHA256":original.sha256}});
  } catch { return adminJson({error:"تعذر قراءة القالب المعتمد."},503); }
}
