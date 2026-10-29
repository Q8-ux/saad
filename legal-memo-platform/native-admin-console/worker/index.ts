/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_AUTH_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function securityHeaders(response: Response, pathname: string) {
  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "0");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=(), browsing-topics=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'none'; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'",
  );
  if (pathname.startsWith("/api/") || pathname === "/") headers.set("Cache-Control", "private, no-store, max-age=0");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function requestFingerprint(request: Request, secret = "") {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  const source = new TextEncoder().encode(`${address}|${agent.slice(0, 160)}`);
  const digest = secret.length >= 32
    ? await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
        source,
      )
    : await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rejectRequest(request: Request, env: Env, ctx: ExecutionContext, code: string, status = 403) {
  ctx.waitUntil((async () => {
    try {
      await env.DB.prepare(
        "INSERT INTO admin_security_events (fingerprint, event_type, severity, route, detail_code) VALUES (?, 'request_rejected', 'warning', ?, ?)",
      ).bind(await requestFingerprint(request, env.ADMIN_AUTH_SECRET || ""), new URL(request.url).pathname.slice(0, 180), code).run();
    } catch { /* security logging is best effort */ }
  })());
  return securityHeaders(Response.json({ error: "تعذر قبول الطلب." }, { status }), new URL(request.url).pathname);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "TRACE" || request.method === "CONNECT") return rejectRequest(request, env, ctx, "method_not_allowed", 405);
    const announcedLength = Number(request.headers.get("content-length") || 0);
    if (announcedLength > 2 * 1024 * 1024) return rejectRequest(request, env, ctx, "payload_too_large", 413);
    const origin = request.headers.get("origin");
    if (url.pathname.startsWith("/api/") && origin && origin !== url.origin) return rejectRequest(request, env, ctx, "origin_rejected");

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return securityHeaders(response, url.pathname);
    }

    return securityHeaders(await handler.fetch(request, env, ctx), url.pathname);
  },
};

export default worker;
