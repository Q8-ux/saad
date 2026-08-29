export class RequestValidationError extends Error {}

const PRIVATE_API_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

/**
 * State-changing browser requests must come from this application. Requests
 * without an Origin header are allowed for trusted server-side callers and
 * local tooling; browsers send Origin for JSON POST/PATCH/DELETE requests.
 */
export function assertTrustedMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const expectedOrigin = new URL(request.url).origin;
  if (origin !== expectedOrigin) {
    throw new RequestValidationError("تم رفض الطلب لاعتبارات الحماية.");
  }
}

export function privateJson(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(PRIVATE_API_HEADERS)) {
    headers.set(name, value);
  }

  return Response.json(body, { ...init, headers });
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new RequestValidationError("بيانات الطلب غير صحيحة.");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError("تعذّرت قراءة بيانات الطلب.");
  }
}
