import { privateJson } from "../../../../lib/request-security";
import { getSaaSSession, TenantAccessError } from "../../../../lib/tenant-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return privateJson(await getSaaSSession());
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    console.error("Session lookup failed", error instanceof Error ? error.message : error);
    return privateJson({ error: "تعذّر تحميل بيانات الحساب حالياً." }, { status: 500 });
  }
}
