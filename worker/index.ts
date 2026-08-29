/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PLATFORM_ADMIN_EMAILS?: string;
  LOCAL_AUTH_BOOTSTRAP?: string;
  LOCAL_AUTH_PEPPER?: string;
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

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Expose the Sites D1 binding to server route handlers for this request.
    (
      globalThis as typeof globalThis & {
        __LEGAL_OFFICE_D1__?: D1Database;
      }
    ).__LEGAL_OFFICE_D1__ = env.DB;
    (
      globalThis as typeof globalThis & {
        __LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__?: string;
      }
    ).__LEGAL_OFFICE_PLATFORM_ADMIN_EMAILS__ = env.PLATFORM_ADMIN_EMAILS ?? "";
    (
      globalThis as typeof globalThis & {
        __LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__?: string;
      }
    ).__LEGAL_OFFICE_LOCAL_AUTH_BOOTSTRAP__ = env.LOCAL_AUTH_BOOTSTRAP ?? "";
    (
      globalThis as typeof globalThis & {
        __LEGAL_OFFICE_LOCAL_AUTH_PEPPER__?: string;
      }
    ).__LEGAL_OFFICE_LOCAL_AUTH_PEPPER__ = env.LOCAL_AUTH_PEPPER ?? "";

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(response);
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
};

export default worker;

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
