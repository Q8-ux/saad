import { appBuildId } from "@/lib/app-release";

export function GET() {
  return Response.json({ build_id: appBuildId, repository: "https://github.com/Q8-ux/saad/tree/main/ant-alshaer" }, { headers: { "Cache-Control": "no-store" } });
}
