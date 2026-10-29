import { env } from "cloudflare:workers";
import { adminResponse } from "@/lib/admin-auth";

type ServiceEnvironment = {
  PUBLIC_SERVICE_ORIGIN?: string;
  ADMIN_SERVICE_TOKEN?: string;
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function callPublicService(path: string, init: RequestInit = {}) {
  const runtime = env as unknown as ServiceEnvironment;
  const origin = runtime.PUBLIC_SERVICE_ORIGIN?.trim();
  const token = runtime.ADMIN_SERVICE_TOKEN?.trim();
  if (!origin || !token || token.length < 32) return adminResponse({ error: "ربط خدمة الموقع العام غير مهيأ." }, 503);

  let target: URL;
  try {
    const base = new URL(origin);
    target = new URL(path, `${base.origin}/`);
    if (base.protocol !== "https:" || base.username || base.password || target.origin !== base.origin || !target.pathname.startsWith("/api/admin/")) throw new Error("invalid target");
  } catch {
    return adminResponse({ error: "إعداد ربط الموقع العام غير صحيح." }, 503);
  }

  try {
    const body = typeof init.body === "string" ? init.body : "";
    if (init.body && typeof init.body !== "string") {
      return adminResponse({ error: "صيغة طلب الربط الخادمي غير مدعومة." }, 500);
    }
    const timestamp = String(Date.now());
    const nonce = crypto.randomUUID();
    const payload = `${timestamp}\n${nonce}\n${(init.method || "GET").toUpperCase()}\n${target.pathname}${target.search}\n${await sha256(body)}`;
    return await fetch(target, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        "X-Sabeq-Timestamp": timestamp,
        "X-Sabeq-Nonce": nonce,
        "X-Sabeq-Signature": await hmac(token, payload),
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return adminResponse({ error: "تعذر الاتصال بخدمة الموقع العام حاليًا." }, 502);
  }
}

export async function forwardPublicResponse(response: Response) {
  const body = await response.text();
  try { JSON.parse(body); } catch { return adminResponse({error:"لم يُرجع خادم سابق استجابة صالحة. احتفظ بالطلب وأعد المحاولة.",code:"upstream_response_invalid"},502); }
  return new Response(body || JSON.stringify({ error: "استجابة فارغة." }), {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
