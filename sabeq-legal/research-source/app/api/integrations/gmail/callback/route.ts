import { gmailCallback } from "@/lib/gmail";
import { RequestError } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return await gmailCallback(request); }
  catch (error) {
    return Response.json({ error: error instanceof RequestError ? error.message : "تعذر إكمال تفويض Gmail. أعد البدء من لوحة الإدارة." }, {
      status: error instanceof RequestError ? error.status : 503,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
    });
  }
}
