import { getD1 } from "@/db";
import { adminJson, requireAdminService } from "@/lib/admin-service-auth";
import { cleanString, readJsonObject, RequestError } from "@/lib/request-security";

const serviceKeys = new Set(["consultation", "assistant", "memo", "library"]);

export async function GET(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  const rows = await getD1().prepare(
    "SELECT service_key, enabled, payment_required, price_fils, currency, updated_at FROM service_settings ORDER BY service_key",
  ).all();
  return adminJson({ services: rows.results });
}

export async function POST(request: Request) {
  const denied = await requireAdminService(request);
  if (denied) return denied;
  try {
    const data = await readJsonObject(request, 4_000);
    const serviceKey = cleanString(data.serviceKey, "الخدمة", { min: 3, max: 40 });
    if (!serviceKeys.has(serviceKey)) throw new RequestError("الخدمة غير صحيحة.");
    const enabled = data.enabled ? 1 : 0;
    const paymentRequired = data.paymentRequired ? 1 : 0;
    const priceFils = Math.max(0, Math.min(100_000_000, Number(data.priceFils)));
    if (!Number.isInteger(priceFils)) throw new RequestError("السعر غير صحيح.");
    await getD1().prepare(
      `INSERT INTO service_settings (service_key, enabled, payment_required, price_fils, currency, updated_at)
       VALUES (?, ?, ?, ?, 'KWD', CURRENT_TIMESTAMP)
       ON CONFLICT(service_key) DO UPDATE SET enabled = excluded.enabled,
         payment_required = excluded.payment_required, price_fils = excluded.price_fils,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(serviceKey, enabled, paymentRequired, priceFils).run();
    return adminJson({ ok: true });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "تعذر تحديث الخدمة." }, error instanceof RequestError ? error.status : 400);
  }
}
