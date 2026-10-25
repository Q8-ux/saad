import { requireServiceEnabled } from "@/lib/service-settings";
import { listApprovedTemplates } from "@/lib/approved-templates";
import { corsPreflight, privateJson, errorResponse } from "@/lib/request-security";
export const OPTIONS=corsPreflight;
export async function GET(request: Request) {
  try { await requireServiceEnabled("library",request); return privateJson({templates:await listApprovedTemplates(),revision:"approved-pleadings-1"}); }
  catch (error) { return errorResponse(error); }
}
