import { env } from "cloudflare:workers";
import { getD1 } from "@/db";

type SecurityEnvironment = { ADMIN_AUTH_SECRET?: string };

export class AdminSecurityError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "invalid_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function assertAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestOrigin) || fetchSite === "cross-site") {
    throw new AdminSecurityError("تعذر التحقق من مصدر الطلب.", 403, "origin_rejected");
  }
}

export async function readAdminJson(request: Request, maxBytes = 16_000) {
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new AdminSecurityError("صيغة الطلب غير مدعومة.", 415, "unsupported_content_type");
  }
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > maxBytes) throw new AdminSecurityError("الطلب أكبر من الحد المسموح.", 413, "payload_too_large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new AdminSecurityError("الطلب أكبر من الحد المسموح.", 413, "payload_too_large");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new AdminSecurityError("صيغة الطلب غير صحيحة."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminSecurityError("بيانات الطلب غير صحيحة.");
  return value as Record<string, unknown>;
}

async function keyedDigest(source: string) {
  const secret = String((env as unknown as SecurityEnvironment).ADMIN_AUTH_SECRET || "");
  if (secret.length >= 32) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(source));
    return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientSource(request: Request) {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return `${address}|${agent.slice(0, 160)}`;
}

async function fingerprint(request: Request, identity = "") {
  return keyedDigest(`event|${clientSource(request)}|${identity.trim().toLowerCase().slice(0, 180)}`);
}

async function rateLimitFingerprint(request: Request, identity = "") {
  const normalizedIdentity = identity.trim().toLowerCase().slice(0, 180);
  return keyedDigest(normalizedIdentity ? `identity|${normalizedIdentity}` : `client|${clientSource(request)}`);
}

export async function recordAdminSecurityEvent(request: Request, eventType: string, options: { severity?: "info" | "warning" | "critical"; staffEmail?: string; detailCode?: string; identity?: string } = {}) {
  try {
    await getD1().prepare(
      `INSERT INTO admin_security_events (fingerprint, event_type, severity, route, staff_email, detail_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      await fingerprint(request, options.identity),
      eventType.slice(0, 80),
      options.severity || "warning",
      new URL(request.url).pathname.slice(0, 180),
      (options.staffEmail || "").slice(0, 180),
      (options.detailCode || "").slice(0, 120),
    ).run();
  } catch {
    // Security telemetry is best effort and must not expose internals.
  }
}

export async function enforceAdminRateLimit(request: Request, route: string, limit: number, identity = "") {
  const bucket = new Date().toISOString().slice(0, 13);
  const key = await rateLimitFingerprint(request, identity);
  const result = await getD1().prepare(
    `INSERT INTO admin_rate_limits (key, bucket, count, updated_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(key, bucket) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING count`,
  ).bind(key, `${route}:${bucket}`).first<{ count: number }>();
  if (!result || Number(result.count) > limit) {
    await recordAdminSecurityEvent(request, "rate_limit_exceeded", { severity: "warning", identity, detailCode: route });
    throw new AdminSecurityError("تم تجاوز عدد المحاولات المسموح مؤقتاً.", 429, "rate_limit_exceeded");
  }
  if (crypto.getRandomValues(new Uint8Array(1))[0] < 3) {
    getD1().prepare("DELETE FROM admin_rate_limits WHERE updated_at < datetime('now', '-8 days')").run().catch(() => undefined);
  }
}
