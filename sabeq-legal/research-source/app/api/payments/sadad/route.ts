import { createMemoPayment, memoPaymentHasInvoice, memoPaymentPolicy, memoPaymentStatus, recoverMemoPayment } from "@/lib/sadad-payments";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";
import { requireMemoUserOrGuest } from "@/lib/public-auth";
import { enforceUserServiceLimit } from "@/lib/service-records";

export const dynamic = "force-dynamic";
export const OPTIONS = corsPreflight;
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return privateJson(await memoPaymentPolicy());
    await enforceRateLimit(request, "sadad-status", 120);
    const proof = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (new URL(request.url).searchParams.get("result") === "1") return privateJson(await recoverMemoPayment(id, proof));
    return privateJson(await memoPaymentStatus(id, proof));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireMemoUserOrGuest(request);
    await enforceRateLimit(request, "sadad-create", 12);
    const input = await readJsonObject(request, 210_000);
    let continuesExistingInvoice = false;
    try { continuesExistingInvoice = await memoPaymentHasInvoice(input.attemptId, input.paymentToken); }
    catch { /* Invalid or new attempts still pass through the normal validation below. */ }
    if (user && !continuesExistingInvoice) await enforceUserServiceLimit(user, "memo");
    return privateJson(await createMemoPayment(input));
  } catch (error) { return errorResponse(error); }
}
