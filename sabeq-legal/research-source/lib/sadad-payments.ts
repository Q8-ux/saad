import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { digest } from "@/lib/management-auth";
import { integrationConfig, operationEvent, saveIntegration } from "@/lib/management-integrations";
import { cleanString, RequestError } from "@/lib/request-security";
import { validateMemoInput } from "@/lib/memo-input";

type Config = { environment: "sandbox" | "live"; clientKey: string; clientSecret: string; testedAt?: string; accountConfirmed?: boolean; callbacksConfirmed?: boolean; publicCheckoutEnabled?: boolean };
type Payment = { id: string; token_hash: string; input_hash: string; environment: Config["environment"]; credential_ref: string; amount_fils: number; currency: string; reference: string; invoice_id: string | null; invoice_key: string | null; transaction_id: string | null; status: string; generation_id: string | null; lease_until: number | null; result_json: string | null; result_expires_at: number | null };
export type PaymentLease = { id: string; generationId: string };
const API = { live: "https://api.sadadpay.net/api", sandbox: "https://apisandbox.sadadpay.net/api" };
const PAY = { live: "https://sadadpay.net/pay/", sandbox: "https://sandbox.sadadpay.net/pay/" };
const RETURN = "https://q8-ux.github.io/saad/sabeq-legal/payment-return.html";
const WEBHOOK = "https://sabeq-legal-public.centrino.chatgpt.site/api/payments/sadad/webhook";
let cachedToken: { fingerprint: string; value: string; expires: number } | null = null;

export function kwdToFils(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,7}(?:\.\d{1,3})?$/.test(text)) throw new RequestError("أدخل مبلغاً بالدينار الكويتي حتى ثلاث منازل عشرية.");
  const [whole, decimal = ""] = text.split(".");
  const fils = Number(whole) * 1000 + Number(decimal.padEnd(3, "0"));
  if (!Number.isSafeInteger(fils)) throw new RequestError("المبلغ غير صحيح.");
  return fils;
}
export async function paymentInputHash(input: Record<string, unknown>) {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
    return value;
  }
  const { paymentId: _id, paymentToken: _token, ...data } = input;
  return digest(JSON.stringify(canonical(data)));
}
async function configuration(): Promise<Config> {
  const saved = await integrationConfig<Config>("sadad");
  if (saved) return saved;
  const runtime = env as unknown as { SADAD_CLIENT_KEY?: string; SADAD_CLIENT_SECRET?: string; SADAD_ENVIRONMENT?: string };
  return { environment: runtime.SADAD_ENVIRONMENT === "live" ? "live" : "sandbox", clientKey: runtime.SADAD_CLIENT_KEY || "", clientSecret: runtime.SADAD_CLIENT_SECRET || "" };
}
async function credentialReference(config: Config) {
  return digest(`${config.environment}:${config.clientKey}:${config.clientSecret}`);
}
async function paymentConfiguration(row: Payment, current?: Config) {
  current ||= await configuration();
  if (!row.credential_ref || row.credential_ref === await credentialReference(current)) return current;
  const archived = await integrationConfig<Config>(`sadad-credentials-${row.credential_ref}`);
  if (!archived || archived.environment !== row.environment || await credentialReference(archived) !== row.credential_ref) throw new RequestError("تعذر التحقق من فاتورة مرتبطة بإعداد سداد سابق. راجع إدارة المكتب.", 409);
  return archived;
}
async function policy() {
  await purgeExpiredPaymentResults();
  const row = await getD1().prepare("SELECT enabled, payment_required, price_fils, currency FROM service_settings WHERE service_key = 'memo'").first<{ enabled: number; payment_required: number; price_fils: number; currency: string }>();
  return { enabled: !row || !!row.enabled, required: !!row?.payment_required, priceFils: row?.price_fils || 0, currency: row?.currency || "KWD" };
}
const isReady = (config: Config) => !!(config.clientKey && config.clientSecret && config.testedAt && config.accountConfirmed && config.callbacksConfirmed);
async function purgeExpiredPaymentResults() {
  await getD1().prepare("UPDATE sadad_payments SET result_json = NULL WHERE result_expires_at < ? AND result_json IS NOT NULL").bind(Date.now()).run();
}
export async function memoPaymentPolicy() {
  const settings = await policy(), config = await configuration();
  return { ...settings, publicCheckoutEnabled: config.publicCheckoutEnabled === true, provider: "sadad", ready: config.publicCheckoutEnabled === true && isReady(config) && settings.priceFils > 0 && settings.currency === "KWD", environment: config.environment };
}
async function provider(config: Config, path: string, authorization: string, body?: unknown): Promise<Record<string, any>> {
  try {
    // SADAD returns HTTP 411 for bodiless POSTs (no Content-Length); token endpoints get an explicit empty JSON body.
    const payload = body !== undefined ? body : path.startsWith("/User/") ? {} : undefined;
    const response = await fetch(`${API[config.environment]}${path}`, { method: payload !== undefined ? "POST" : "GET", headers: { Authorization: authorization, Accept: "application/json", ...(payload === undefined ? {} : { "Content-Type": "application/json" }) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), redirect: "manual", signal: AbortSignal.timeout(20_000) });
    const text = await response.text();
    if (text.length > 500_000 || !response.ok) throw Error("provider_failed");
    const data = JSON.parse(text);
    if (data.isValid !== true || !data.response || typeof data.response !== "object") throw Error("invalid_provider_response");
    return data.response;
  } catch { throw new RequestError("تعذر التحقق من سداد. احتفظ بالطلب وأعد المحاولة؛ لم تُعتبر العملية مدفوعة.", 502); }
}
async function accessToken(config: Config, force = false) {
  if (!config.clientKey || !config.clientSecret) throw new RequestError("مفاتيح سداد غير مهيأة في الخادم.", 503);
  const fingerprint = await digest(`${config.environment}:${config.clientKey}:${config.clientSecret}`);
  if (!force && cachedToken?.fingerprint === fingerprint && cachedToken.expires > Date.now()) return cachedToken.value;
  const refresh = await provider(config, "/User/GenerateRefreshToken", `Basic ${btoa(`${config.clientKey}:${config.clientSecret}`)}`);
  if (typeof refresh.refreshToken !== "string" || !refresh.refreshToken) throw new RequestError("لم تؤكد سداد صلاحية مفاتيح الربط.", 502);
  const token = await provider(config, "/User/GenerateAccessToken", `Bearer ${refresh.refreshToken}`);
  if (typeof token.accessToken !== "string" || !token.accessToken) throw new RequestError("لم يصدر رمز وصول صالح من سداد.", 502);
  const lifetime = Number(token.expiredAfterSeconds);
  cachedToken = { fingerprint, value: token.accessToken, expires: Date.now() + (Number.isFinite(lifetime) && lifetime > 60 ? Math.min(lifetime - 30, 3600) : 30) * 1000 };
  return token.accessToken;
}
function invoiceId(value: unknown) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RequestError("معرف الفاتورة غير صالح.", 502);
  const id = String(value ?? "");
  if (!/^[1-9]\d{0,18}$/.test(id)) throw new RequestError("لم تُرجع سداد معرف فاتورة صالحاً.", 502);
  return id;
}
function attemptId(value: unknown) {
  const id = String(value || "");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new RequestError("معرف طلب الدفع غير صحيح.");
  return id;
}
function capability(value: unknown) {
  const token = String(value || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new RequestError("رمز طلب الدفع غير صحيح.", 403);
  return token;
}
async function ownedPayment(id: unknown, token: unknown) {
  const row = await getD1().prepare("SELECT * FROM sadad_payments WHERE id = ? AND token_hash = ?").bind(attemptId(id), await digest(capability(token))).first<Payment>();
  if (!row) throw new RequestError("طلب الدفع غير موجود أو لا يخص هذه الجلسة.", 404);
  return row;
}
function publicPayment(row: Payment) {
  return { id: row.id, status: row.status, priceFils: row.amount_fils, currency: "KWD", environment: row.environment, checkoutUrl: row.invoice_key ? PAY[row.environment] + encodeURIComponent(row.invoice_key) : null };
}
async function refreshPayment(row: Payment, config?: Config) {
  if (!row.invoice_id || row.status === "consumed" || row.status === "sandbox_closed" || (row.status === "generating" && Number(row.lease_until) >= Date.now())) return row;
  config = await paymentConfiguration(row, config);
  if (config.environment !== row.environment) throw new RequestError("طلب الدفع تابع لبيئة مختلفة. راجع إدارة المكتب.", 409);
  const remote = await provider(config, `/Invoice/getbyid?id=${encodeURIComponent(row.invoice_id)}`, `Bearer ${await accessToken(config)}`);
  const key = typeof remote.key === "string" && /^[A-Za-z0-9_-]{5,240}$/.test(remote.key) ? remote.key : "";
  if (invoiceId(remote.id) !== row.invoice_id || !key || (row.invoice_key && key !== row.invoice_key) || remote.ref_Number !== row.reference || remote.currency_Code !== "KWD" || kwdToFils(remote.amount) !== row.amount_fils) throw new RequestError("بيانات فاتورة سداد لا تطابق الطلب. راجع المكتب قبل إعادة الدفع.", 409);
  if (Number(remote.refunded_Amount || 0) !== 0) throw new RequestError("هذه الفاتورة لها استرداد وتحتاج مراجعة المكتب.", 409);
  const paid = remote.status === "Paid";
  let transaction = paid ? String(remote.transactionID || "").trim() : "";
  if (paid && !transaction && Array.isArray(remote.transactions)) {
    const candidate = remote.transactions.find((item: Record<string, unknown>) => String(item.invoice_Id) === row.invoice_id && item.transactionId && kwdToFils(item.amount) === row.amount_fils);
    if (candidate) transaction = String(candidate.transactionId);
  }
  if (paid && (!transaction || transaction.length > 200)) throw new RequestError("لم يكتمل التحقق من مرجع معاملة سداد. لا تدفع مجدداً؛ أعد التحقق لاحقاً.", 502);
  if (!paid && row.status === "paid") throw new RequestError("تغيرت حالة الفاتورة لدى سداد. تواصل مع المكتب.", 409);
  await getD1().prepare("UPDATE sadad_payments SET invoice_id = ?, invoice_key = ?, status = ?, transaction_id = ?, generation_id = NULL, lease_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (status IN ('creating','pending','uncertain','paid') OR (status = 'generating' AND lease_until < ?))")
    .bind(row.invoice_id, key, paid ? "paid" : "pending", transaction || null, row.id, Date.now()).run();
  if (paid && row.status !== "paid") await operationEvent("payment", "paid", "تم التحقق من سداد رسوم مذكرة", "info", `sadad-paid:${row.id}`);
  return (await getD1().prepare("SELECT * FROM sadad_payments WHERE id = ?").bind(row.id).first<Payment>())!;
}
export async function createMemoPayment(data: Record<string, unknown>) {
  const settings = await policy();
  if (!settings.enabled) throw new RequestError("خدمة المذكرات متوقفة مؤقتاً.", 503);
  const id = attemptId(data.attemptId), token = capability(data.paymentToken);
  if (!data.input || typeof data.input !== "object" || Array.isArray(data.input)) throw new RequestError("بيانات طلب المذكرة غير صحيحة.");
  const input = data.input as Record<string, unknown>;
  validateMemoInput(input);
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 190_000) throw new RequestError("بيانات المذكرة أكبر من الحد المسموح للدفع.", 413);
  const tokenHash = await digest(token), inputHash = await paymentInputHash(input), config = await configuration(), credentialRef = await credentialReference(config);
  let existing = await getD1().prepare("SELECT * FROM sadad_payments WHERE id = ? AND token_hash = ?").bind(id, tokenHash).first<Payment>();
  if (!existing) {
    if (!settings.required) return { required: false };
    if (config.publicCheckoutEnabled !== true) throw new RequestError("خطوة الدفع مخفية عن الموقع؛ راجع إدارة المكتب قبل إنشاء فاتورة.", 409);
    if (!isReady(config) || settings.priceFils <= 0 || settings.currency !== "KWD") throw new RequestError("إعداد التحصيل يحتاج استكمالاً من إدارة المكتب.", 503);
    const created = await getD1().prepare("INSERT INTO sadad_payments (id, token_hash, input_hash, environment, credential_ref, amount_fils, currency, reference, status) VALUES (?, ?, ?, ?, ?, ?, 'KWD', ?, 'creating') ON CONFLICT(id) DO NOTHING RETURNING id")
      .bind(id, tokenHash, inputHash, config.environment, credentialRef, settings.priceFils, `sabeq-${id}`).first();
    if (!created) existing = await ownedPayment(id, token);
  }
  if (existing) {
    if (existing.environment !== config.environment || existing.status === "sandbox_closed") throw new RequestError("هذه المحاولة من بيئة سداد سابقة. راجع المكتب قبل أي دفع جديد.", 409);
    if (existing.invoice_id && existing.status === "uncertain") existing = await refreshPayment(existing, config);
    if (existing.input_hash !== inputHash) {
      const amended = await getD1().prepare("UPDATE sadad_payments SET input_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('pending','paid','retryable') RETURNING id").bind(inputHash, id).first();
      if (!amended) throw new RequestError("لا يمكن تغيير بيانات طلب قيد التوليد أو طلب مكتمل. احتفظ بإيصالك وراجع المكتب.", 409);
    }
    if (existing.invoice_id) return publicPayment(await refreshPayment(existing, config));
    if (config.publicCheckoutEnabled !== true) throw new RequestError("خطوة الدفع مخفية عن الموقع؛ راجع إدارة المكتب قبل إنشاء فاتورة.", 409);
    const retry = await getD1().prepare("UPDATE sadad_payments SET status = 'creating', credential_ref = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'retryable' RETURNING id").bind(credentialRef, id).first();
    if (!retry) throw new RequestError("إنشاء الفاتورة قيد التحقق. لا تنشئ دفعة أخرى؛ راجع المكتب بمعرف الطلب.", 409);
  }
  const order = await ownedPayment(id, token);
  let insertionStarted = false;
  try {
    const access = await accessToken(config);
    insertionStarted = true;
    const result = await provider(config, "/Invoice/insert", `Bearer ${access}`, { invoices: [{ ref_Number: order.reference, amount: order.amount_fils / 1000, currency_Code: "KWD", customer_Name: "عميل مجموعة سابق القانونية", lang: input.interfaceLanguage === "en" ? "en" : "ar", success_ReturnURL: `${RETURN}?result=success`, fail_ReturnURL: `${RETURN}?result=failed`, items: [{ name: "إعداد مذكرة قانونية", quantity: 1, amount: order.amount_fils / 1000 }] }] });
    const remoteId = invoiceId(result.invoiceId);
    await getD1().prepare("UPDATE sadad_payments SET invoice_id = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'creating'").bind(remoteId, id).run();
    return publicPayment(await refreshPayment(await ownedPayment(id, token), config));
  } catch (error) {
    await getD1().prepare("UPDATE sadad_payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('creating','pending')").bind(insertionStarted ? "uncertain" : "retryable", id).run();
    throw error;
  }
}
export async function memoPaymentStatus(id: unknown, token: unknown) { return publicPayment(await refreshPayment(await ownedPayment(id, token))); }
export async function memoPaymentHasInvoice(id: unknown, token: unknown) { return !!(await ownedPayment(id, token)).invoice_id; }
export async function receiveSadadWebhook(data: Record<string, unknown>) {
  const id = invoiceId(data.InvoiceId);
  const config = await configuration();
  const row = await getD1().prepare("SELECT * FROM sadad_payments WHERE invoice_id = ? AND environment = ?").bind(id, config.environment).first<Payment>();
  if (!row) return { ok: true, ignored: true };
  if (row.invoice_key && data.InvoiceKey !== row.invoice_key) throw new RequestError("الفاتورة غير مطابقة.", 409);
  await refreshPayment(row, config);
  return { ok: true };
}
export async function recoverMemoPayment(id: unknown, token: unknown) {
  await purgeExpiredPaymentResults();
  const row = await ownedPayment(id, token);
  if (row.status !== "consumed" || !row.result_json || Number(row.result_expires_at) <= Date.now()) throw new RequestError("لا توجد نتيجة مكتملة قابلة للاسترجاع لهذا الطلب حالياً.", 409);
  return JSON.parse(row.result_json) as Record<string, unknown>;
}
export async function reserveMemoPayment(input: Record<string, unknown>): Promise<{ lease?: PaymentLease; result?: Record<string, unknown> }> {
  const settings = await policy();
  if (!settings.required && !input.paymentId) return {};
  if (!input.paymentId || !input.paymentToken) throw new RequestError("يلزم سداد رسوم المذكرة والتحقق منها قبل التوليد.", 402);
  let row = await ownedPayment(input.paymentId, input.paymentToken);
  if (row.input_hash !== await paymentInputHash(input)) throw new RequestError("بيانات المذكرة مختلفة عن الطلب المدفوع. لا تدفع مجدداً؛ راجع البيانات أو المكتب.", 409);
  if (row.status === "consumed") {
    if (row.result_json && Number(row.result_expires_at) > Date.now()) return { result: JSON.parse(row.result_json) };
    throw new RequestError("استُخدمت هذه الدفعة. انتهت مدة استرجاع الناتج المؤقت؛ راجع المكتب لاستعادته.", 409);
  }
  if (row.environment !== (await configuration()).environment) throw new RequestError("دفعة بيئة الاختبار لا تتيح خدمة في بيئة الإنتاج. راجع المكتب.", 409);
  row = await refreshPayment(row);
  const generationId = crypto.randomUUID(), now = Date.now();
  const claimed = await getD1().prepare("UPDATE sadad_payments SET status = 'generating', generation_id = ?, lease_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND input_hash = ? AND (status = 'paid' OR (status = 'generating' AND lease_until < ?)) RETURNING id")
    .bind(generationId, now + 360_000, row.id, await paymentInputHash(input), now).first();
  if (!claimed) throw new RequestError(row.status === "generating" ? "المذكرة المدفوعة قيد التوليد. انتظر ثم أعد المحاولة بنفس الطلب." : "لم تؤكد سداد الدفع بعد. لا تدفع مجدداً؛ أكمل الدفع أو أعد التحقق.", row.status === "generating" ? 409 : 402);
  return { lease: { id: row.id, generationId } };
}
export async function completeMemoPayment(lease: PaymentLease | undefined, result: Record<string, unknown>) {
  if (!lease) return;
  const resultJson = JSON.stringify(result);
  if (new TextEncoder().encode(resultJson).byteLength > 800_000) throw new RequestError("تعذر حفظ نتيجة الطلب المدفوع. لم تُستهلك الدفعة؛ تواصل مع المكتب.", 503);
  const changed = await getD1().prepare("UPDATE sadad_payments SET status = 'consumed', result_json = ?, result_expires_at = ?, lease_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'generating' AND generation_id = ? RETURNING id")
    .bind(resultJson, Date.now() + 7 * 86400_000, lease.id, lease.generationId).first();
  if (!changed) throw new RequestError("تعذر إكمال حجز الطلب. أعد المحاولة بنفس الطلب المدفوع.", 409);
  await getD1().prepare("UPDATE sadad_payments SET result_json = NULL WHERE result_expires_at < ? AND result_json IS NOT NULL").bind(Date.now()).run();
}
export async function releaseMemoPayment(lease: PaymentLease | undefined) {
  if (lease) await getD1().prepare("UPDATE sadad_payments SET status = 'paid', generation_id = NULL, lease_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'generating' AND generation_id = ?").bind(lease.id, lease.generationId).run();
}
export async function sadadManagement(data: Record<string, unknown> | null, actor: string) {
  let config = await configuration();
  if (data?.action === "save") {
    if (!["live", "sandbox"].includes(String(data.environment))) throw new RequestError("بيئة سداد غير صحيحة.");
    const environment = data.environment as Config["environment"];
    const key = cleanString(data.clientKey, "Client Key", { max: 500, required: false }), secret = cleanString(data.clientSecret, "Client Secret", { max: 500, required: false });
    const environmentChanged = environment !== config.environment;
    const credentialsChanged = (!!key && key !== config.clientKey) || (!!secret && secret !== config.clientSecret);
    const changed = environmentChanged || credentialsChanged;
    if (credentialsChanged && !environmentChanged) {
      const previousReference = await credentialReference(config);
      await saveIntegration(`sadad-credentials-${previousReference}`, config, actor);
      await getD1().prepare("UPDATE sadad_payments SET credential_ref = ? WHERE environment = ? AND credential_ref = '' AND status IN ('creating','pending','uncertain','paid','generating')").bind(previousReference, config.environment).run();
    }
    if (environmentChanged) {
      const pending = await getD1().prepare("SELECT COUNT(*) n FROM sadad_payments WHERE status IN ('creating','pending','uncertain','paid','generating')").first<{ n: number }>();
      if (pending?.n && config.environment === "live") throw new RequestError("توجد طلبات دفع حقيقية لم تنتهِ؛ أكمل تسويتها قبل تبديل البيئة.", 409);
      if (!key || !secret) throw new RequestError("أدخل مفاتيح البيئة الجديدة؛ لا يعاد استخدام مفاتيح بيئة أخرى.");
    }
    const next: Config = { environment, clientKey: key || config.clientKey, clientSecret: secret || config.clientSecret, ...(changed ? {} : { testedAt: config.testedAt }), accountConfirmed: data.accountConfirmed === true, callbacksConfirmed: data.callbacksConfirmed === true, publicCheckoutEnabled: data.publicCheckoutEnabled === undefined ? config.publicCheckoutEnabled === true : data.publicCheckoutEnabled === true };
    const priceFils = kwdToFils(data.priceKwd), required = data.required === true;
    if (required && !next.publicCheckoutEnabled) throw new RequestError("سداد في وضع إدارة فقط. ألغ اشتراط الدفع لإبقاء الخطوة مخفية، أو فعّل ظهور خطوة الدفع أولاً.", 409);
    if (required && (!isReady(next) || priceFils <= 0)) throw new RequestError("احفظ المفاتيح واختبر الاتصال، ثم أكد إعدادات التاجر والروابط وحدد سعراً موجباً قبل اشتراط الدفع.", 409);
    await saveIntegration("sadad", next, actor);
    if (config.environment === "sandbox" && environment === "live") await getD1().prepare("UPDATE sadad_payments SET status = 'sandbox_closed', generation_id = NULL, lease_until = NULL WHERE environment = 'sandbox' AND status != 'consumed'").run();
    await getD1().prepare("INSERT INTO service_settings (service_key, enabled, payment_required, price_fils, currency) VALUES ('memo', 1, ?, ?, 'KWD') ON CONFLICT(service_key) DO UPDATE SET payment_required = excluded.payment_required, price_fils = excluded.price_fils, currency = 'KWD', updated_at = CURRENT_TIMESTAMP").bind(required ? 1 : 0, priceFils).run();
    config = next;
    await operationEvent("payment", "configuration", "تم تحديث إعدادات دفع سداد");
  } else if (data?.action === "reconcile") {
    const row = await getD1().prepare("SELECT * FROM sadad_payments WHERE id = ?").bind(attemptId(data.paymentId)).first<Payment>();
    if (!row || !["creating", "uncertain", "pending"].includes(row.status)) throw new RequestError("هذا الطلب لا يحتاج تسوية فاتورة.", 409);
    const remoteId = invoiceId(data.invoiceId);
    if (row.invoice_id && row.invoice_id !== remoteId) throw new RequestError("الطلب مرتبط بفاتورة أخرى.", 409);
    await refreshPayment({ ...row, invoice_id: remoteId }, config);
    await operationEvent("payment", "reconciled", "تمت مطابقة طلب دفع مع فاتورة سداد", "info", `sadad-reconcile:${row.id}`);
  } else if (data?.action === "test") {
    await accessToken(config, true);
    config.testedAt = new Date().toISOString();
    await saveIntegration("sadad", config, actor);
  } else if (data) throw new RequestError("عملية سداد غير مدعومة.");
  const settings = await policy();
  const payments = await getD1().prepare("SELECT id, reference, environment, amount_fils, currency, invoice_id, transaction_id, status, created_at, updated_at FROM sadad_payments ORDER BY created_at DESC LIMIT 100").all();
  return { ...settings, publicCheckoutEnabled: config.publicCheckoutEnabled === true, environment: config.environment, ready: isReady(config), hasCredentials: !!(config.clientKey && config.clientSecret), testedAt: config.testedAt || null, accountConfirmed: !!config.accountConfirmed, callbacksConfirmed: !!config.callbacksConfirmed, successUrl: `${RETURN}?result=success`, failedUrl: `${RETURN}?result=failed`, webhookUrl: WEBHOOK, payments: payments.results };
}
