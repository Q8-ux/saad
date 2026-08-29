import { NextResponse } from "next/server";
import { LOCAL_AUTH_COOKIE, revokeCurrentLocalSession } from "../../../../lib/local-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await revokeCurrentLocalSession();
  } catch (error) {
    console.error("Local logout failed", error instanceof Error ? error.message : error);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.cookies.set({
    name: LOCAL_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
