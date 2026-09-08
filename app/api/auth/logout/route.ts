import { NextResponse } from "next/server";
import { LOCAL_AUTH_COOKIE, revokeCurrentLocalSession } from "../../../../lib/local-auth";
import { RENDER_ADMIN_COOKIE } from "../../../../lib/render-admin-session";

export const dynamic = "force-dynamic";

function publicOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = forwardedHost || request.headers.get("host")?.trim() || "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "";
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : "https";

  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  try {
    await revokeCurrentLocalSession();
  } catch (error) {
    console.error("Local logout failed", error instanceof Error ? error.message : error);
  }

  const response = NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  for (const name of [LOCAL_AUTH_COOKIE, RENDER_ADMIN_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
