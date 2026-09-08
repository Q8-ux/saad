import { getD1 } from "../../../../db";
import {
  ensureConversation,
  ensureWhatsAppSchema,
  findOfficeClientByPhone,
  getWhatsAppAccountByPhoneId,
  verifyWhatsAppWebhookSignature,
  whatsappVerifyToken,
} from "../../../../lib/whatsapp-office";

export const dynamic = "force-dynamic";

type MetaContact = {
  wa_id?: string;
  profile?: { name?: string };
};

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type MetaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};

type MetaPayload = {
  entry?: Array<{
    changes?: Array<{ field?: string; value?: MetaValue }>;
  }>;
};

function messageBody(message: MetaMessage): string {
  if (message.type === "text") return String(message.text?.body ?? "").trim();
  if (message.type === "button") return String(message.button?.text ?? "").trim();
  if (message.type === "interactive") {
    return String(message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? "").trim();
  }
  return message.type ? `[${message.type}]` : "[message]";
}

function isoFromUnix(value: string | undefined): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") ?? "";
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const expected = whatsappVerifyToken();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyWhatsAppWebhookSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(rawBody) as MetaPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await ensureWhatsAppSchema();
  const db = getD1();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") continue;
      const value = change.value ?? {};
      const phoneNumberId = String(value.metadata?.phone_number_id ?? "").trim();
      if (!phoneNumberId) continue;
      const account = await getWhatsAppAccountByPhoneId(phoneNumberId);
      if (!account) continue;

      const contactNames = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact.wa_id) contactNames.set(contact.wa_id, String(contact.profile?.name ?? "").trim().slice(0, 180));
      }

      for (const message of value.messages ?? []) {
        const waId = String(message.from ?? "").replace(/[^0-9]/g, "");
        const providerMessageId = String(message.id ?? "").trim();
        if (!waId || !providerMessageId) continue;
        const duplicate = await db
          .prepare("SELECT id FROM tenant_whatsapp_messages WHERE provider_message_id=? LIMIT 1")
          .bind(providerMessageId)
          .first<{ id: string }>();
        if (duplicate) continue;

        const client = await findOfficeClientByPhone(account.officeId, waId);
        const body = messageBody(message);
        const timestamp = isoFromUnix(message.timestamp);
        const conversationId = await ensureConversation({
          officeId: account.officeId,
          waId,
          contactName: contactNames.get(waId) || client?.name || "",
          clientId: client?.id ?? null,
          preview: body,
          inbound: true,
          timestamp,
        });
        await db
          .prepare("INSERT INTO tenant_whatsapp_messages (id,office_id,conversation_id,provider_message_id,direction,message_type,body,status,provider_timestamp,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'received',?,?,CURRENT_TIMESTAMP)")
          .bind(
            crypto.randomUUID(),
            account.officeId,
            conversationId,
            providerMessageId,
            "inbound",
            String(message.type ?? "unknown").slice(0, 40),
            body.slice(0, 12000),
            timestamp,
            timestamp,
          )
          .run();
      }

      for (const status of value.statuses ?? []) {
        const providerMessageId = String(status.id ?? "").trim();
        if (!providerMessageId) continue;
        const firstError = status.errors?.[0];
        await db
          .prepare("UPDATE tenant_whatsapp_messages SET status=?,error_code=?,error_message=?,provider_timestamp=?,updated_at=CURRENT_TIMESTAMP WHERE provider_message_id=? AND office_id=?")
          .bind(
            String(status.status ?? "unknown").slice(0, 40),
            firstError?.code ? String(firstError.code) : "",
            String(firstError?.message ?? firstError?.title ?? "").slice(0, 500),
            isoFromUnix(status.timestamp),
            providerMessageId,
            account.officeId,
          )
          .run();
      }
    }
  }

  return Response.json({ received: true }, { status: 200 });
}
