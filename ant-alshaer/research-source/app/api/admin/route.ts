import { z } from "zod";
import { appErrorResponse, requireAdminUser } from "@/lib/app-auth";
import { getAdminDashboard, updateManagedUser } from "@/lib/archive-store";
import { getRuntimeBindings } from "@/lib/runtime-bindings";
import { textProviderConfig, textProviderSummary, type TextProviderEnvironment } from "@/lib/text-providers";

export const runtime = "edge";

const UserUpdateSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export async function GET() {
  try {
    const admin = await requireAdminUser();
    const bindings = getRuntimeBindings();
    const providers = textProviderSummary(bindings as unknown as TextProviderEnvironment);
    let fccConfigured = false;
    try { textProviderConfig(bindings as unknown as TextProviderEnvironment, "fcc"); fccConfigured = true; } catch { /* No gateway address or credentials are disclosed. */ }
    return Response.json({
      ...(await getAdminDashboard()),
      viewer: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      },
      system: {
        database: Boolean(bindings.DB),
        storage: Boolean(bindings.BUCKET),
        ai: providers.textProviderConfigured,
        ...providers,
        fcc: { supported: true, configured: fccConfigured, selected: providers.textProvider === "fcc", liveVerified: false },
        guestAccess: bindings.GUEST_ACCESS_ENABLED !== "false",
      },
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = UserUpdateSchema.parse(await request.json());
    const user = await updateManagedUser({ admin, ...body });
    return Response.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "بيانات تعديل المستخدم غير مكتملة." }, { status: 400 });
    }
    return appErrorResponse(error);
  }
}
