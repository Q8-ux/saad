import { receiveSadadWebhook } from "@/lib/sadad-payments";
import { enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "sadad-webhook", 600);
    return privateJson(await receiveSadadWebhook(await readJsonObject(request, 8000)));
  } catch (error) { return errorResponse(error); }
}
