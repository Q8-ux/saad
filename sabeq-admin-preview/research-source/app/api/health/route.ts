import { callPublicService } from "@/lib/public-service";
export async function GET() {
  const response=await callPublicService("/api/admin/engineering-paths");
  const result=await response.json().catch(()=>null);
  const ok=response.ok && result?.connection?.database===true;
  return Response.json({ok,revision:"sabeq-bridge-20261029",upstreamStatus:response.status},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
}
