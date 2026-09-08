import "server-only";

import { getD1 } from "../db";
import { RequestValidationError } from "./request-security";

const PHONE_PATTERN = /^\d{8,15}$/;
const PHONE_ID_PATTERN = /^\d{5,40}$/;

type WhatsAppAccountRow = {
  officeId: string;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber: string;
  label: string;
  status: string;
};

type MetaMessageResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number; error_subcode?: number };
};

export type WhatsAppRuntimeStatus = {
  tokenConfigured: boolean;
  verifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  graphVersion: string;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function whatsappRuntimeStatus(): WhatsAppRuntimeStatus {
  return {
    tokenConfigured: Boolean(env("WHATSAPP_CLOUD_API_TOKEN")),
    verifyTokenConfigured: Boolean(env("WHATSAPP_VERIFY_TOKEN")),
    appSecretConfigured: Boolean(env("WHATSAPP_APP_SECRET")),
    graphVersion: env("WHATSAPP_GRAPH_VERSION") || "v23.0",
  };
}

export function normalizeWhatsAppPhone(value: unknown): string {
  const phone = String(value ?? "").replace(/[^0-9]/g, "");
  if (!PHONE_PATTERN.test(phone)) {
    throw new RequestValidationError("رقم واتساب غير صحيح. استخدم الرقم الدولي بدون علامة +.");
  }
  return phone;
}

export function validatePhoneNumberId(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!PHONE_ID_PATTERN.test(id)) {
    throw new RequestValidationError("Phone Number ID الخاص بواتساب غير صحيح.");
  }
  return id;
}

export async function ensureWhatsAppSchema(): Promise<void> {
  await getD1().exec(`
    CREATE TABLE IF NOT EXISTS tenant_whatsapp_accounts (
      office_id TEXT PRIMARY KEY NOT NULL,
      phone_number_id TEXT NOT NULL,
      business_account_id TEXT NOT NULL DEFAULT '',
      display_phone_number TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT 'واتساب المكتب',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_accounts_phone_unique ON tenant_whatsapp_accounts(phone_number_id);
    CREATE TABLE IF NOT EXISTS tenant_whatsapp_conversations (
      id TEXT PRIMARY KEY NOT NULL,
      office_id TEXT NOT NULL,
      wa_id TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      client_id INTEGER,
      case_id INTEGER,
      last_message_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_message_preview TEXT NOT NULL DEFAULT '',
      unread_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES tenant_clients(id) ON DELETE SET NULL,
      FOREIGN KEY (case_id) REFERENCES tenant_cases(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_conversation_unique ON tenant_whatsapp_conversations(office_id, wa_id);
    CREATE INDEX IF NOT EXISTS tenant_whatsapp_conversation_recent_idx ON tenant_whatsapp_conversations(office_id, last_message_at);
    CREATE TABLE IF NOT EXISTS tenant_whatsapp_messages (
      id TEXT PRIMARY KEY NOT NULL,
      office_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      provider_message_id TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'received',
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      sent_by_user_id TEXT,
      provider_timestamp TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES tenant_whatsapp_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sent_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tenant_whatsapp_provider_message_unique ON tenant_whatsapp_messages(provider_message_id) WHERE provider_message_id<>'';
    CREATE INDEX IF NOT EXISTS tenant_whatsapp_messages_conversation_idx ON tenant_whatsapp_messages(conversation_id, created_at);
  `);
}

export async function getWhatsAppAccountByOffice(officeId: string): Promise<WhatsAppAccountRow | null> {
  await ensureWhatsAppSchema();
  return getD1()
    .prepare("SELECT office_id AS officeId,phone_number_id AS phoneNumberId,business_account_id AS businessAccountId,display_phone_number AS displayPhoneNumber,label,status FROM tenant_whatsapp_accounts WHERE office_id=? LIMIT 1")
    .bind(officeId)
    .first<WhatsAppAccountRow>();
}

export async function getWhatsAppAccountByPhoneId(phoneNumberId: string): Promise<WhatsAppAccountRow | null> {
  await ensureWhatsAppSchema();
  return getD1()
    .prepare("SELECT office_id AS officeId,phone_number_id AS phoneNumberId,business_account_id AS businessAccountId,display_phone_number AS displayPhoneNumber,label,status FROM tenant_whatsapp_accounts WHERE phone_number_id=? AND status='active' LIMIT 1")
    .bind(phoneNumberId)
    .first<WhatsAppAccountRow>();
}

export async function saveWhatsAppAccount(input: {
  officeId: string;
  phoneNumberId: string;
  businessAccountId?: string;
  displayPhoneNumber?: string;
  label?: string;
}): Promise<void> {
  await ensureWhatsAppSchema();
  const configuredPhoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  if (configuredPhoneId && configuredPhoneId !== input.phoneNumberId) {
    throw new RequestValidationError("Phone Number ID لا يطابق الرقم المرتبط بمفتاح WhatsApp في الخادم.");
  }
  await getD1()
    .prepare("INSERT INTO tenant_whatsapp_accounts (office_id,phone_number_id,business_account_id,display_phone_number,label,status,updated_at) VALUES (?,?,?,?,?,'active',CURRENT_TIMESTAMP) ON CONFLICT(office_id) DO UPDATE SET phone_number_id=excluded.phone_number_id,business_account_id=excluded.business_account_id,display_phone_number=excluded.display_phone_number,label=excluded.label,status='active',updated_at=CURRENT_TIMESTAMP")
    .bind(
      input.officeId,
      input.phoneNumberId,
      String(input.businessAccountId ?? "").trim().slice(0, 80),
      String(input.displayPhoneNumber ?? "").trim().slice(0, 40),
      String(input.label ?? "واتساب المكتب").trim().slice(0, 120) || "واتساب المكتب",
    )
    .run();
}

export async function findOfficeClientByPhone(officeId: string, waId: string): Promise<{ id: number; name: string } | null> {
  const rows = await getD1()
    .prepare("SELECT id,name,phone FROM tenant_clients WHERE office_id=? AND phone<>''")
    .bind(officeId)
    .all<{ id: number; name: string; phone: string }>();
  const target = waId.replace(/[^0-9]/g, "");
  return (rows.results ?? []).find((row) => {
    const phone = String(row.phone ?? "").replace(/[^0-9]/g, "");
    return phone === target || (phone.length >= 8 && target.endsWith(phone)) || (target.length >= 8 && phone.endsWith(target));
  }) ?? null;
}

export async function ensureConversation(input: {
  officeId: string;
  waId: string;
  contactName?: string;
  clientId?: number | null;
  caseId?: number | null;
  preview?: string;
  inbound?: boolean;
  timestamp?: string;
}): Promise<string> {
  await ensureWhatsAppSchema();
  const existing = await getD1()
    .prepare("SELECT id,client_id AS clientId,case_id AS caseId FROM tenant_whatsapp_conversations WHERE office_id=? AND wa_id=? LIMIT 1")
    .bind(input.officeId, input.waId)
    .first<{ id: string; clientId: number | null; caseId: number | null }>();
  const id = existing?.id ?? crypto.randomUUID();
  const clientId = input.clientId ?? existing?.clientId ?? null;
  const caseId = input.caseId ?? existing?.caseId ?? null;
  const timestamp = input.timestamp || new Date().toISOString();
  if (existing) {
    await getD1()
      .prepare("UPDATE tenant_whatsapp_conversations SET contact_name=CASE WHEN ?<>'' THEN ? ELSE contact_name END,client_id=?,case_id=?,last_message_at=?,last_message_preview=?,unread_count=unread_count+?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?")
      .bind(
        String(input.contactName ?? "").slice(0, 180),
        String(input.contactName ?? "").slice(0, 180),
        clientId,
        caseId,
        timestamp,
        String(input.preview ?? "").slice(0, 300),
        input.inbound ? 1 : 0,
        id,
        input.officeId,
      )
      .run();
  } else {
    await getD1()
      .prepare("INSERT INTO tenant_whatsapp_conversations (id,office_id,wa_id,contact_name,client_id,case_id,last_message_at,last_message_preview,unread_count) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(
        id,
        input.officeId,
        input.waId,
        String(input.contactName ?? "").slice(0, 180),
        clientId,
        caseId,
        timestamp,
        String(input.preview ?? "").slice(0, 300),
        input.inbound ? 1 : 0,
      )
      .run();
  }
  return id;
}

export async function sendWhatsAppText(input: {
  officeId: string;
  senderUserId: string;
  to: string;
  text: string;
  clientId?: number | null;
  caseId?: number | null;
}): Promise<{ providerMessageId: string; conversationId: string }> {
  const account = await getWhatsAppAccountByOffice(input.officeId);
  if (!account || account.status !== "active") {
    throw new RequestValidationError("اربط رقم واتساب المكتب أولاً من صفحة واتساب المكتب.");
  }
  const token = env("WHATSAPP_CLOUD_API_TOKEN");
  if (!token) throw new Error("WHATSAPP_CLOUD_API_TOKEN is not configured.");
  const configuredPhoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  if (configuredPhoneId && configuredPhoneId !== account.phoneNumberId) {
    throw new Error("WhatsApp phone-number configuration mismatch.");
  }
  const to = normalizeWhatsAppPhone(input.to);
  const text = String(input.text ?? "").trim();
  if (!text || text.length > 4096) {
    throw new RequestValidationError("نص الرسالة مطلوب ويجب ألا يتجاوز 4096 حرفاً.");
  }
  const graphVersion = whatsappRuntimeStatus().graphVersion;
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${account.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  const payload = await response.json().catch(() => ({})) as MetaMessageResponse;
  if (!response.ok) {
    const message = payload.error?.message || `WhatsApp Cloud API HTTP ${response.status}`;
    throw new Error(message);
  }
  const providerMessageId = String(payload.messages?.[0]?.id ?? "");
  const conversationId = await ensureConversation({
    officeId: input.officeId,
    waId: to,
    clientId: input.clientId ?? null,
    caseId: input.caseId ?? null,
    preview: text,
    inbound: false,
  });
  await getD1()
    .prepare("INSERT INTO tenant_whatsapp_messages (id,office_id,conversation_id,provider_message_id,direction,message_type,body,status,sent_by_user_id,provider_timestamp) VALUES (?,?,?,?,?,'text',?,'accepted',?,?)")
    .bind(
      crypto.randomUUID(),
      input.officeId,
      conversationId,
      providerMessageId,
      "outbound",
      text,
      input.senderUserId,
      new Date().toISOString(),
    )
    .run();
  return { providerMessageId, conversationId };
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

export async function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret) return false;
  const supplied = String(signatureHeader ?? "").trim().toLowerCase();
  if (!supplied.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${hex(new Uint8Array(signature))}`;
  return constantTimeEqual(expected, supplied);
}

export function whatsappVerifyToken(): string {
  return env("WHATSAPP_VERIFY_TOKEN");
}
