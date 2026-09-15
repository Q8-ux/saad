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
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new RequestValidationError("تم رفض الطلب لاعتبارات الحماية.");
  }
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
    const maxBytes = 1024 * 1024;
    if (Number(request.headers.get("content-length")) > maxBytes) throw new RequestValidationError("حجم الطلب يتجاوز الحد المسموح.");
    const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
    if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maxBytes){await reader.cancel();throw new RequestValidationError("حجم الطلب يتجاوز الحد المسموح.");}chunks.push(part.value);}}
    const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
    const value: unknown = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new RequestValidationError("بيانات الطلب غير صحيحة.");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError("تعذّرت قراءة بيانات الطلب.");
  }
}
