import { integrationConfig, saveIntegration, operationEvent } from "@/lib/management-integrations";
import { cleanString, cleanEmail, RequestError } from "@/lib/request-security";

const DOMAIN = "sabeq.legal";
const REGIONS = { com: { auth: "https://accounts.zoho.com", mail: "https://mail.zoho.com" }, eu: { auth: "https://accounts.zoho.eu", mail: "https://mail.zoho.eu" } } as const;
type Config = { region: keyof typeof REGIONS; orgId: string; clientId: string; clientSecret: string; refreshToken: string; accessToken?: string; expiresAt?: number; testedAt?: string };
type Account = { accountId?: string; zuid?: string | number; primaryEmailAddress?: string; displayName?: string; role?: string; enabled?: boolean; status?: boolean; mailboxStatus?: string; mxStatus?: boolean };
function publicConfig(config: Config | null) { return { provider: "zoho", domain: DOMAIN, region: config?.region || "com", orgId: config?.orgId || "", hasCredentials: !!(config?.clientSecret && config.refreshToken), testedAt: config?.testedAt || null }; }
function numeric(value: unknown, field: string) { const text = cleanString(value, field, { max: 24 }); if (!/^\d{4,24}$/.test(text)) throw new RequestError(`قيمة ${field} غير صحيحة.`); return text; }
function ownAddress(value: unknown) { const email = cleanEmail(value).toLowerCase(); if (email.split("@")[1] !== DOMAIN) throw new RequestError(`إدارة البريد متاحة لعناوين ${DOMAIN} فقط.`); return email; }
async function jsonRequest(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(8_000) });
    const raw = await response.text();
    if (raw.length > 500_000) throw new RequestError("استجابة مزود البريد أكبر من الحد المسموح.", 502);
    const body = JSON.parse(raw);
    if (!response.ok || body.error || (body.status?.code && (Number(body.status.code) < 200 || Number(body.status.code) >= 300))) throw new RequestError(response.status === 401 || response.status === 403 ? "رفض مزود البريد التفويض أو صلاحيات الإدارة." : "لم يؤكد مزود البريد العملية. تحقق من الترخيص وتوثيق النطاق والعنوان وسياسة كلمة المرور.", 502);
    return body;
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError("تعذر الاتصال بمزود البريد. لم يتم تأكيد العملية.", 502); }
}
async function accessToken(config: Config, actor: string) {
  if (config.accessToken && (config.expiresAt || 0) > Date.now() + 60_000) return config.accessToken;
  const body = new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken });
  const result = await jsonRequest(`${REGIONS[config.region].auth}/oauth/v2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  if (typeof result.access_token !== "string" || !/^[A-Za-z0-9._-]{10,4096}$/.test(result.access_token)) throw new RequestError("لم يصدر مزود البريد تفويضاً صالحاً.", 502);
  config.accessToken = result.access_token; config.expiresAt = Date.now() + Math.max(60, Math.min(Number(result.expires_in) || 3600, 3600)) * 1000;
  await saveIntegration("zoho-mail-admin", config, actor);
  return config.accessToken;
}
async function providerRequest(config: Config, actor: string, suffix: string, method = "GET", body?: unknown) {
  const token = await accessToken(config, actor);
  return jsonRequest(`${REGIONS[config.region].mail}/api/organization/${config.orgId}/accounts${suffix}`, { method, headers: { Authorization: `Zoho-oauthtoken ${token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function accounts(data: unknown): Account[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "accountId" in data) return [data as Account];
  throw new RequestError("استجابة قائمة صناديق البريد غير متوقعة.", 502);
}
function publicAccount(row: Account) { return { id: String(row.accountId || ""), zuid: String(row.zuid || ""), email: String(row.primaryEmailAddress || ""), name: String(row.displayName || ""), role: String(row.role || ""), enabled: typeof row.enabled === "boolean" ? row.enabled : typeof row.status === "boolean" ? row.status : null, deliveryReady: row.mxStatus === true, status: row.mailboxStatus || "unknown" }; }
export async function mailboxAction(data: Record<string, unknown> | null, actor: string, offset = 0) {
  let config = await integrationConfig<Config>("zoho-mail-admin");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000) throw new RequestError("رقم الصفحة غير صحيح.");
  if (data?.action === "save") {
    const region = cleanString(data.region, "مركز البيانات", { max: 8 });
    if (region !== "com" && region !== "eu") throw new RequestError("اختر مركز بيانات Zoho مدعوماً.");
    const orgId = numeric(data.orgId, "معرف المؤسسة"), clientId = cleanString(data.clientId, "Client ID", { max: 300, required: false });
    const clientSecret = cleanString(data.clientSecret, "Client Secret", { max: 2000, required: false }), refreshToken = cleanString(data.refreshToken, "Refresh Token", { max: 2000, required: false });
    if (config && (config.orgId !== orgId || config.region !== region || (clientId && clientId !== config.clientId)) && (!clientId || !clientSecret || !refreshToken)) throw new RequestError("عند تغيير المؤسسة أو مركز البيانات أدخل بيانات الربط الثلاثة مجدداً.");
    config = { region, orgId, clientId: clientId || config?.clientId || "", clientSecret: clientSecret || config?.clientSecret || "", refreshToken: refreshToken || config?.refreshToken || "" };
    if (!config.clientId || !config.clientSecret || !config.refreshToken) throw new RequestError("أدخل بيانات تفويض إدارة Zoho Mail أولاً.");
    await saveIntegration("zoho-mail-admin", config, actor);
    return { ...publicConfig(config), accounts: [], hasMore: false, loaded: false };
  }
  if (!config) {
    if (data) throw new RequestError("اربط مؤسسة Zoho Mail أولاً. لم يُنشأ أي صندوق بريد.", 409);
    return { ...publicConfig(null), accounts: [], hasMore: false, loaded: false };
  }
  if (!data || data.action === "test") {
    try {
      const result = await providerRequest(config, actor, `?start=${offset + 1}&limit=50`), raw = accounts(result.data);
      if (data?.action === "test") { config.testedAt = new Date().toISOString(); await saveIntegration("zoho-mail-admin", config, actor); }
      return { ...publicConfig(config), accounts: raw.filter(row => String(row.primaryEmailAddress || "").toLowerCase().split("@")[1] === DOMAIN).map(publicAccount), hasMore: raw.length === 50, loaded: true };
    } catch (error) {
      if (data) throw error;
      return { ...publicConfig(config), accounts: [], hasMore: false, loaded: false, error: error instanceof RequestError ? error.message : "تعذر جلب صناديق البريد." };
    }
  }
  if (data.action === "create") {
    const email = ownAddress(data.email), name = cleanString(data.name, "اسم صاحب الحساب", { min: 2, max: 120 }), password = typeof data.password === "string" ? data.password : "";
    if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) throw new RequestError("كلمة المرور الأولية: 12 حرفاً على الأقل، مع حروف كبيرة وصغيرة وأرقام.");
    const result = await providerRequest(config, actor, "", "POST", { primaryEmailAddress: email, displayName: name, firstName: name, password, role: "member", oneTimePassword: true });
    const row = accounts(result.data)[0];
    if (!row.accountId || String(row.primaryEmailAddress || "").toLowerCase() !== email) throw new RequestError("لم يؤكد المزود إنشاء العنوان المطلوب. افحص قائمة الحسابات قبل إعادة الطلب.", 502);
    await operationEvent("email", "mailbox-created", "تم إنشاء صندوق بريد للمكتب لدى المزود");
    return { ok: true, account: publicAccount(row) };
  }
  if (data.action === "status") {
    if (data.confirm !== true || typeof data.enabled !== "boolean") throw new RequestError("أكد تغيير حالة صندوق البريد أولاً.");
    const id = numeric(data.id, "معرف الحساب"), zuid = numeric(data.zuid, "معرف المستخدم");
    const fetched = await providerRequest(config, actor, `/${zuid}`), row = accounts(fetched.data)[0];
    const email = ownAddress(row.primaryEmailAddress);
    if (String(row.accountId) !== id || String(row.zuid) !== zuid) throw new RequestError("الحساب لا يطابق السجل المطلوب.", 403);
    if (row.role !== "member" || email === actor.toLowerCase()) throw new RequestError("لا يمكن تعطيل حساب إداري أو حسابك الحالي من هذه اللوحة.", 403);
    await providerRequest(config, actor, `/${id}`, "PUT", data.enabled ? { mode: "enableUser", zuid, unblockIncoming: true } : { mode: "disableUser", zuid, blockIncoming: true, removeMailforward: false, removeGroupMembership: false, removeAlias: false });
    await operationEvent("email", "mailbox-status", "تم تحديث حالة صندوق بريد للمكتب");
    return { ok: true };
  }
  throw new RequestError("عملية إدارة البريد غير مدعومة.");
}
