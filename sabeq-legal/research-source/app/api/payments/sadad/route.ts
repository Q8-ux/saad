import { createMemoPayment, memoPaymentPolicy, memoPaymentStatus, recoverMemoPayment } from "@/lib/sadad-payments";
import { assertSameOrigin, corsPreflight, enforceRateLimit, errorResponse, privateJson, readJsonObject } from "@/lib/request-security";
import { requireMemoUserOrGuest } from "@/lib/public-auth";

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
    await requireMemoUserOrGuest(request);
    await enforceRateLimit(request, "sadad-create", 12);
    return privateJson(await createMemoPayment(await readJsonObject(request, 210_000)));
  } catch (error) { return errorResponse(error); }
}
