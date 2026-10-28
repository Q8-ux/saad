import { getD1 } from "@/db";

type JsonObject = Record<string, unknown>;

const GITHUB_PAGES_ORIGIN = "https://q8-ux.github.io";

export class RequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": GITHUB_PAGES_ORIGIN,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "Vary": "Origin",
    },
  });
}

export function assertSameOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const isGitHubFrontend = origin === GITHUB_PAGES_ORIGIN;
  if ((origin && origin !== requestOrigin && !isGitHubFrontend) || (fetchSite === "cross-site" && !isGitHubFrontend)) {
    throw new RequestError("تعذر التحقق من مصدر الطلب.", 403);
  }
}

export function corsPreflight(request: Request) {
  try {
    assertSameOrigin(request);
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": GITHUB_PAGES_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Sabeq-Payment-Test",
        "Access-Control-Max-Age": "86400",
        "Cache-Control": "public, max-age=86400",
        "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function readJsonObject(request: Request, maxBytes = 48_000): Promise<JsonObject> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestError("صيغة الطلب غير مدعومة.", 415);
  }
  const announcedLength = Number(request.headers.get("content-length") || 0);
  if (announcedLength > maxBytes) throw new RequestError("الطلب أكبر من الحد المسموح.", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new RequestError("الطلب أكبر من الحد المسموح.", 413);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RequestError("تعذر قراءة الطلب.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError("بيانات الطلب غير صحيحة.");
  return value as JsonObject;
}

export function cleanString(value: unknown, field: string, options: { min?: number; max: number; required?: boolean }) {
  const text = String(value ?? "").replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
  const minimum = options.min ?? (options.required === false ? 0 : 1);
  if (text.length < minimum || text.length > options.max) {
    throw new RequestError(`قيمة ${field} غير صحيحة.`);
  }
  return text;
}

export function cleanMultiline(value: unknown, field: string, options: { min?: number; max: number; required?: boolean }) {
  const text = String(value ?? "").replace(/\u0000/g, " ").replace(/\r\n?/g, "\n").trim();
  const minimum = options.min ?? (options.required === false ? 0 : 1);
  if (text.length < minimum || text.length > options.max) {
    throw new RequestError(`قيمة ${field} غير صحيحة.`);
  }
  return text;
}

export function cleanEmail(value: unknown, required = true) {
  const email = cleanString(value, "البريد الإلكتروني", { min: required ? 5 : 0, max: 180, required });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RequestError("البريد الإلكتروني غير صحيح.");
  return email;
}

export function cleanPhone(value: unknown, required = true) {
  const phone = cleanString(value, "رقم الهاتف", { min: required ? 6 : 0, max: 32, required });
  if (phone && !/^[+\d\s().-]+$/.test(phone)) throw new RequestError("رقم الهاتف غير صحيح.");
  return phone;
}

export function cleanLanguage(value: unknown) {
  return value === "en" || value === "ur" ? value : "ar";
}

async function fingerprint(request: Request) {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  const bytes = new TextEncoder().encode(`${address}|${agent.slice(0, 160)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function enforceRateLimit(request: Request, route: string, limit: number, window: "hour" | "day" = "hour") {
  const now = new Date();
  const bucketTime = window === "day" ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 13);
  const key = await fingerprint(request);
  const result = await getD1()
    .prepare(
      `INSERT INTO api_rate_limits (key, bucket, count, updated_at)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(key, bucket) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING count`,
    )
    .bind(key, `${route}:${bucketTime}`)
    .first<{ count: number }>();
  if (!result || Number(result.count) > limit) throw new RequestError("تم تجاوز عدد الطلبات المسموح مؤقتاً. حاول لاحقاً.", 429);
}

export function errorResponse(error: unknown) {
  if (error instanceof RequestError) return privateJson({ error: error.message }, error.status);
  return privateJson({ error: "تعذر إتمام الطلب حالياً. يرجى المحاولة لاحقاً." }, 500);
}
