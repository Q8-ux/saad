import { NextResponse } from "next/server";
import {
  authenticateLocalUser,
  LOCAL_AUTH_COOKIE,
  localAuthConfigured,
} from "../../../../lib/local-auth";
import {
  createRenderAdminToken,
  RENDER_ADMIN_COOKIE,
} from "../../../../lib/render-admin-session";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../../lib/request-security";

export const dynamic = "force-dynamic";

const LOGIN_ERROR = "بيانات الدخول غير صحيحة أو تم إيقاف المحاولة مؤقتًا. حاول لاحقًا.";

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    if (!localAuthConfigured()) {
      return privateJson({ error: "خدمة الدخول غير مهيأة حالياً." }, { status: 503 });
    }

    const body = await readJsonObject(request);
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await authenticateLocalUser(username, password);
    if (!result.ok) {
      return privateJson({ error: LOGIN_ERROR }, { status: 401 });
    }

    const response = NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    response.cookies.set({
      name: LOCAL_AUTH_COOKIE,
      value: result.token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(result.expiresAt),
    });

    // Render instances are replaced during deploys, so the SQLite-backed
    // session table can disappear even while the browser remains open. Give
    // the platform administrator a signed, HttpOnly recovery cookie that can
    // re-establish the same admin identity without weakening member access.
    const adminToken = await createRenderAdminToken(result.identity, result.expiresAt);
    if (adminToken) {
      response.cookies.set({
        name: RENDER_ADMIN_COOKIE,
        value: adminToken,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires: new Date(result.expiresAt),
      });
    }

    return response;
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return privateJson({ error: error.message }, { status: 400 });
    }
    console.error("Local login failed", error instanceof Error ? error.message : error);
    return privateJson({ error: "تعذّر إتمام تسجيل الدخول حالياً." }, { status: 500 });
  }
}
