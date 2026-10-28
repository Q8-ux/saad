import { createMemoPayment, memoPaymentPolicy, memoPaymentStatus, recoverMemoPayment } from "@/lib/sadad-payments";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { requirePaymentTestActor } from "@/lib/payment-mode";

export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const id = new URL(request.url).searchParams.get("id");
    const testToken = request.headers.get("x-sabeq-payment-test") || "";
    if (!id) return privateJson(await memoPaymentPolicy(testToken));
    await enforceRateLimit(request, "sadad-status", 120);
    const proof = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (new URL(request.url).searchParams.get("result") === "1") return privateJson(await recoverMemoPayment(id, proof, testToken));
    return privateJson(await memoPaymentStatus(id, proof, testToken));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const testToken = request.headers.get("x-sabeq-payment-test") || "";
    if (testToken) await requirePaymentTestActor(testToken);
    else await requireMemoUserOrGuest(request);
    await enforceRateLimit(request, "sadad-create", 12);
    return privateJson(await createMemoPayment(await readJsonObject(request, 210_000), testToken));
  } catch (error) { return errorResponse(error); }
}
