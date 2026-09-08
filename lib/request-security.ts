export class RequestValidationError extends Error {}

const PRIVATE_API_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function firstForwardedValue(value: string | null): string {
  return (value ?? "").split(",")[0]?.trim() ?? "";
}

function normalizedOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * State-changing browser requests must come from this application.
 *
 * On reverse-proxy hosts such as Render, request.url can contain an internal
 * origin while the browser correctly sends the public Origin. Validate against
 * the proxy-preserved public host/protocol first, then fall back to request.url.
 */
export function assertTrustedMutation(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return;

  const origin = normalizedOrigin(originHeader);
  if (!origin) {
    throw new RequestValidationError("تم رفض الطلب لاعتبارات الحماية.");
  }

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstForwardedValue(request.headers.get("host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const requestUrl = new URL(request.url);
  const protocol = forwardedProto === "https" || forwardedProto === "http"
    ? `${forwardedProto}:`
    : requestUrl.protocol;

  const acceptedOrigins = new Set<string>([requestUrl.origin]);
  if (host) {
    const publicOrigin = normalizedOrigin(`${protocol}//${host}`);
    if (publicOrigin) acceptedOrigins.add(publicOrigin);
  }

  if (!acceptedOrigins.has(origin)) {
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
