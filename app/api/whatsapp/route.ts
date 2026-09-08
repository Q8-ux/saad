import { getD1 } from "../../../db";
import { nullableId, textValue } from "../../../lib/office-validation";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../lib/request-security";
import {
  requireTenantContext,
  TenantAccessError,
  writeAuditLog,
} from "../../../lib/tenant-access";
import {
  ensureWhatsAppSchema,
  getWhatsAppAccountByOffice,
  normalizeWhatsAppPhone,
  saveWhatsAppAccount,
  sendWhatsAppText,
  validatePhoneNumberId,
  whatsappRuntimeStatus,
} from "../../../lib/whatsapp-office";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  waId: string;
  contactName: string;
  clientId: number | null;
  clientName: string | null;
  caseId: number | null;
  caseNumber: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
};

type MessageRow = {
  id: string;
  providerMessageId: string;
  direction: string;
  messageType: string;
  body: string;
  status: string;
  errorCode: string;
  errorMessage: string;
  providerTimestamp: string;
  createdAt: string;
};

function failure(error: unknown, fallback: string) {
  if (error instanceof TenantAccessError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof RequestValidationError) {
    return privateJson({ error: error.message }, { status: 400 });
  }
  console.error("WhatsApp office API failed", error instanceof Error ? error.message : error);
  return privateJson({ error: fallback }, { status: 500 });
}

function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const host = forwardedHost || request.headers.get("host")?.trim() || "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return `${protocol}://${host}`;
  return new URL(request.url).origin;
}

async function listConversations(officeId: string): Promise<ConversationRow[]> {
  const rows = await getD1()
    .prepare(`
      SELECT w.id,w.wa_id AS waId,w.contact_name AS contactName,
             w.client_id AS clientId,c.name AS clientName,
             w.case_id AS caseId,k.case_number AS caseNumber,
             w.last_message_at AS lastMessageAt,
             w.last_message_preview AS lastMessagePreview,
             w.unread_count AS unreadCount
      FROM tenant_whatsapp_conversations w
      LEFT JOIN tenant_clients c ON c.id=w.client_id AND c.office_id=w.office_id
      LEFT JOIN tenant_cases k ON k.id=w.case_id AND k.office_id=w.office_id
      WHERE w.office_id=?
      ORDER BY w.last_message_at DESC
      LIMIT 200
    `)
    .bind(officeId)
    .all<ConversationRow>();
  return rows.results ?? [];
}

async function listMessages(officeId: string, conversationId: string): Promise<MessageRow[]> {
  const conversation = await getD1()
    .prepare("SELECT id FROM tenant_whatsapp_conversations WHERE id=? AND office_id=? LIMIT 1")
    .bind(conversationId, officeId)
    .first<{ id: string }>();
  if (!conversation) throw new RequestValidationError("المحادثة المطلوبة غير موجودة.");
  await getD1()
    .prepare("UPDATE tenant_whatsapp_conversations SET unread_count=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?")
    .bind(conversationId, officeId)
    .run();
  const rows = await getD1()
    .prepare(`
      SELECT id,provider_message_id AS providerMessageId,direction,
             message_type AS messageType,body,status,error_code AS errorCode,
             error_message AS errorMessage,provider_timestamp AS providerTimestamp,
             created_at AS createdAt
      FROM tenant_whatsapp_messages
      WHERE office_id=? AND conversation_id=?
      ORDER BY created_at ASC
      LIMIT 500
    `)
    .bind(officeId, conversationId)
    .all<MessageRow>();
  return rows.results ?? [];
}

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    await ensureWhatsAppSchema();
    const url = new URL(request.url);
    const conversationId = (url.searchParams.get("conversation") ?? "").trim().slice(0, 100);
    if (conversationId) {
      return privateJson({ messages: await listMessages(context.officeId, conversationId) });
    }
    const account = await getWhatsAppAccountByOffice(context.officeId);
    const runtime = whatsappRuntimeStatus();
    return privateJson({
      account,
      runtime,
      connected: Boolean(account && runtime.tokenConfigured && runtime.verifyTokenConfigured && runtime.appSecretConfigured),
      webhookUrl: `${publicOrigin(request)}/api/whatsapp/webhook`,
      conversations: await listConversations(context.officeId),
      canConfigure: context.role === "owner" || context.role === "admin",
      canSend: context.role !== "viewer",
    });
  } catch (error) {
    return failure(error, "تعذّر تحميل واتساب المكتب حالياً.");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    const body = await readJsonObject(request);
    const action = textValue(body.action, 40);

    if (action === "configure") {
      if (context.role !== "owner" && context.role !== "admin") {
        return privateJson({ error: "ربط رقم واتساب متاح لمالك أو مدير المكتب فقط." }, { status: 403 });
      }
      const phoneNumberId = validatePhoneNumberId(body.phoneNumberId);
      await saveWhatsAppAccount({
        officeId: context.officeId,
        phoneNumberId,
        businessAccountId: textValue(body.businessAccountId, 80),
        displayPhoneNumber: textValue(body.displayPhoneNumber, 40),
        label: textValue(body.label, 120) || "واتساب المكتب",
      });
      await writeAuditLog({
        officeId: context.officeId,
        actorUserId: context.id,
        action: "configure_whatsapp",
        entityType: "whatsapp_account",
        entityId: phoneNumberId,
      });
      return privateJson({ ok: true, message: "تم حفظ إعدادات رقم واتساب المكتب." });
    }

    if (action === "send") {
      if (context.role === "viewer") {
        return privateJson({ error: "لا تملك صلاحية إرسال رسائل واتساب." }, { status: 403 });
      }
      const to = normalizeWhatsAppPhone(body.to);
      const text = textValue(body.text, 4096);
      if (!text) throw new RequestValidationError("اكتب نص الرسالة أولاً.");
      const result = await sendWhatsAppText({
        officeId: context.officeId,
        senderUserId: context.id,
        to,
        text,
        clientId: nullableId(body.clientId),
        caseId: nullableId(body.caseId),
      });
      await writeAuditLog({
        officeId: context.officeId,
        actorUserId: context.id,
        action: "send_whatsapp_message",
        entityType: "whatsapp_message",
        entityId: result.providerMessageId,
        metadata: { conversationId: result.conversationId },
      });
      return privateJson({ ok: true, ...result });
    }

    throw new RequestValidationError("عملية واتساب غير معروفة.");
  } catch (error) {
    return failure(error, "تعذّر تنفيذ عملية واتساب حالياً.");
  }
}
