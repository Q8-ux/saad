import { managementJson } from "@/lib/management-auth";
import { receiveWhatsApp } from "@/lib/management-integrations";
import { RequestError } from "@/lib/request-security";
export async function POST(request: Request) {
  try { return managementJson(await receiveWhatsApp(request)); }
  catch (error) { return managementJson({ error: error instanceof RequestError ? error.message : "تعذر استقبال الحدث." }, error instanceof RequestError ? error.status : 503); }
}
