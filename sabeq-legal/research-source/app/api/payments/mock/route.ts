import { simulateMemoPayment } from "@/lib/sadad-payments";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";

export const OPTIONS = corsPreflight;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "mock-payment-result", 60);
    const proof = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    return privateJson(await simulateMemoPayment(await readJsonObject(request, 2048), proof, request.headers.get("x-sabeq-payment-test") || ""));
  } catch (error) { return errorResponse(error); }
}
