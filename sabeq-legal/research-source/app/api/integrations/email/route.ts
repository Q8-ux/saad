import { managementJson } from "@/lib/management-auth";
import { receiveMail } from "@/lib/management-integrations";
import { RequestError } from "@/lib/request-security";
export async function POST(request: Request) {
  try { return managementJson(await receiveMail(request)); }
  catch (error) { return managementJson({ error: error instanceof RequestError ? error.message : "تعذر استقبال البريد." }, error instanceof RequestError ? error.status : 503); }
}
