import { getD1 } from "../../../db";
import {
  allowedValue,
  amountFils,
  CASE_STATUSES,
  dateValue,
  didWrite,
  HEARING_KINDS,
  HEARING_STATUSES,
  INVOICE_STATUSES,
  isOfficeResource,
  nullableId,
  OFFICE_CURRENCIES,
  OfficeResource,
  requiredId,
  requiredText,
  textValue,
  timeValue,
  validEmail,
} from "../../../lib/office-validation";
import {
  assertTrustedMutation,
  privateJson,
  readJsonObject,
  RequestValidationError,
} from "../../../lib/request-security";
import {
  OfficeCapability,
  requireCapability,
  requireTenantContext,
  TenantAccessError,
  writeAuditLog,
} from "../../../lib/tenant-access";

export const dynamic = "force-dynamic";

type MutableResource = Exclude<OfficeResource, "settings">;
type OfficeSettings = {
  id: number;
  officeName: string;
  currency: string;
  updatedAt?: string;
};

const DEFAULT_OFFICE_NAME = "المكتب القانوني";
const TABLES: Record<MutableResource, string> = {
  clients: "tenant_clients",
  cases: "tenant_cases",
  hearings: "tenant_hearings",
  invoices: "tenant_invoices",
  memos: "tenant_memos",
};

const RESOURCE_CAPABILITY: Record<OfficeResource, OfficeCapability> = {
  clients: "manageClients",
  cases: "manageCases",
  hearings: "manageHearings",
  invoices: "manageInvoices",
  memos: "manageMemos",
  settings: "manageSettings",
};

function mutationData(body: Record<string, unknown>) {
  const value = body.data;
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new RequestValidationError("بيانات السجل غير صحيحة.");
  }
  return value as Record<string, unknown>;
}

async function linkedRecordExists(
  table: "tenant_clients" | "tenant_cases",
  officeId: string,
  id: number | null,
  label: string,
) {
  if (!id) return;
  const row = await getD1()
    .prepare(`SELECT id FROM ${table} WHERE id=? AND office_id=?`)
    .bind(id, officeId)
    .first<{ id: number }>();
  if (!row) throw new RequestValidationError(`${label} المرتبط غير موجود ضمن هذا المكتب.`);
}

async function validateLinks(
  resource: OfficeResource,
  data: Record<string, unknown>,
  officeId: string,
) {
  if (resource === "cases") {
    await linkedRecordExists("tenant_clients", officeId, nullableId(data.clientId), "العميل");
  }
  if (resource === "hearings") {
    await linkedRecordExists("tenant_cases", officeId, nullableId(data.caseId), "القضية");
  }
  if (resource === "invoices") {
    await Promise.all([
      linkedRecordExists("tenant_clients", officeId, nullableId(data.clientId), "العميل"),
      linkedRecordExists("tenant_cases", officeId, nullableId(data.caseId), "القضية"),
    ]);
  }
}

async function loadOfficeData(officeId: string) {
  const db = getD1();
  const [clients, cases, hearings, invoices, memos, settings] = await Promise.all([
    db
      .prepare(
        "SELECT id,name,phone,email,notes,created_at AS createdAt,updated_at AS updatedAt FROM tenant_clients WHERE office_id=? ORDER BY id DESC",
      )
      .bind(officeId)
      .all(),
    db
      .prepare(
        "SELECT c.id,c.case_number AS caseNumber,c.client_id AS clientId,cl.name AS clientName,c.court,c.type,c.status,c.opposing_party AS opposingParty,c.notes,c.created_at AS createdAt,c.updated_at AS updatedAt FROM tenant_cases c LEFT JOIN tenant_clients cl ON cl.id=c.client_id AND cl.office_id=c.office_id WHERE c.office_id=? ORDER BY c.id DESC",
      )
      .bind(officeId)
      .all(),
    db
      .prepare(
        "SELECT h.id,h.case_id AS caseId,c.case_number AS caseNumber,h.title,h.date,h.time,h.location,h.kind,h.status,h.notes,h.created_at AS createdAt,h.updated_at AS updatedAt FROM tenant_hearings h LEFT JOIN tenant_cases c ON c.id=h.case_id AND c.office_id=h.office_id WHERE h.office_id=? ORDER BY h.date ASC,h.time ASC,h.id DESC",
      )
      .bind(officeId)
      .all(),
    db
      .prepare(
        "SELECT i.id,i.client_id AS clientId,cl.name AS clientName,i.case_id AS caseId,c.case_number AS caseNumber,i.amount_fils AS amountFils,i.status,i.issue_date AS issueDate,i.due_date AS dueDate,i.description,i.created_at AS createdAt,i.updated_at AS updatedAt FROM tenant_invoices i LEFT JOIN tenant_clients cl ON cl.id=i.client_id AND cl.office_id=i.office_id LEFT JOIN tenant_cases c ON c.id=i.case_id AND c.office_id=i.office_id WHERE i.office_id=? ORDER BY i.id DESC",
      )
      .bind(officeId)
      .all(),
    db
      .prepare(
        "SELECT id,case_id AS caseId,title,memo_type AS memoType,court,facts,legal_basis AS legalBasis,requests,content,citations_json AS citationsJson,created_at AS createdAt,updated_at AS updatedAt FROM tenant_memos WHERE office_id=? ORDER BY id DESC LIMIT 100",
      )
      .bind(officeId)
      .all(),
    db
      .prepare(
        "SELECT 1 AS id,office_name AS officeName,currency,updated_at AS updatedAt FROM tenant_settings WHERE office_id=?",
      )
      .bind(officeId)
      .first<OfficeSettings>(),
  ]);

  return {
    clients: clients.results ?? [],
    cases: cases.results ?? [],
    hearings: hearings.results ?? [],
    invoices: invoices.results ?? [],
    memos: memos.results ?? [],
    settings: settings ?? {
      id: 1,
      officeName: DEFAULT_OFFICE_NAME,
      currency: "KWD",
    },
    meta: {
      officeDataOrigin: "tenant-isolated",
      containsDemoOfficeRecords: false,
    },
  };
}

function failure(error: unknown, fallback: string) {
  if (error instanceof TenantAccessError) {
    return privateJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof RequestValidationError) {
    return privateJson({ error: error.message }, { status: 400 });
  }
  console.error("Office API failed", error instanceof Error ? error.message : error);
  return privateJson({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const context = await requireTenantContext(request);
    return privateJson(await loadOfficeData(context.officeId));
  } catch (error) {
    return failure(error, "تعذّر تحميل بيانات المكتب حالياً. حاول مرة أخرى بعد قليل.");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    const body = await readJsonObject(request);
    const resource = body.resource;
    const data = mutationData(body);
    if (!isOfficeResource(resource)) {
      throw new RequestValidationError("نوع السجل غير صحيح.");
    }
    if (resource === "memos") {
      throw new RequestValidationError("تُنشأ المذكرات من خلال مولّد المذكرات.");
    }
    requireCapability(context, RESOURCE_CAPABILITY[resource]);
    await validateLinks(resource, data, context.officeId);

    const db = getD1();
    if (resource === "clients") {
      await db
        .prepare("INSERT INTO tenant_clients (office_id,name,phone,email,notes) VALUES (?,?,?,?,?)")
        .bind(
          context.officeId,
          requiredText(data.name, "اسم العميل", 180),
          textValue(data.phone, 80),
          validEmail(data.email),
          textValue(data.notes),
        )
        .run();
    } else if (resource === "cases") {
      await db
        .prepare(
          "INSERT INTO tenant_cases (office_id,case_number,client_id,court,type,status,opposing_party,notes) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          context.officeId,
          requiredText(data.caseNumber, "رقم القضية", 180),
          nullableId(data.clientId),
          textValue(data.court, 240),
          textValue(data.type, 120),
          allowedValue(data.status, CASE_STATUSES, "active", "حالة القضية"),
          textValue(data.opposingParty, 240),
          textValue(data.notes),
        )
        .run();
    } else if (resource === "hearings") {
      await db
        .prepare(
          "INSERT INTO tenant_hearings (office_id,case_id,title,date,time,location,kind,status,notes) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          context.officeId,
          nullableId(data.caseId),
          requiredText(data.title, "عنوان الموعد", 240),
          dateValue(data.date, "تاريخ الموعد", { required: true }),
          timeValue(data.time),
          textValue(data.location, 240),
          allowedValue(data.kind, HEARING_KINDS, "hearing", "نوع الموعد"),
          allowedValue(data.status, HEARING_STATUSES, "pending", "حالة الموعد"),
          textValue(data.notes),
        )
        .run();
    } else if (resource === "invoices") {
      const issueDate = dateValue(data.issueDate, "تاريخ الإصدار", { required: true });
      const dueDate = dateValue(data.dueDate, "تاريخ الاستحقاق");
      if (dueDate && dueDate < issueDate) {
        throw new RequestValidationError("تاريخ الاستحقاق يجب ألا يسبق تاريخ الإصدار.");
      }
      await db
        .prepare(
          "INSERT INTO tenant_invoices (office_id,client_id,case_id,amount_fils,status,issue_date,due_date,description) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          context.officeId,
          nullableId(data.clientId),
          nullableId(data.caseId),
          amountFils(data.amountFils),
          allowedValue(data.status, INVOICE_STATUSES, "unpaid", "حالة الفاتورة"),
          issueDate,
          dueDate,
          textValue(data.description, 500),
        )
        .run();
    } else {
      await db
        .prepare(
          "INSERT INTO tenant_settings (office_id,office_name,currency,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(office_id) DO UPDATE SET office_name=excluded.office_name,currency=excluded.currency,updated_at=CURRENT_TIMESTAMP",
        )
        .bind(
          context.officeId,
          requiredText(data.officeName, "اسم المكتب", 180),
          allowedValue(data.currency, OFFICE_CURRENCIES, "KWD", "العملة"),
        )
        .run();
    }

    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: `create_${resource}`,
      entityType: resource,
    });
    return privateJson({ ok: true }, { status: 201 });
  } catch (error) {
    return failure(error, "تعذّر حفظ السجل حالياً. حاول مرة أخرى بعد قليل.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    const body = await readJsonObject(request);
    const resource = body.resource;
    const data = mutationData(body);
    if (!isOfficeResource(resource) || resource === "settings") {
      throw new RequestValidationError("بيانات التعديل غير صحيحة.");
    }
    const id = requiredId(body.id, "معرّف السجل");
    requireCapability(context, RESOURCE_CAPABILITY[resource]);
    await validateLinks(resource, data, context.officeId);

    const db = getD1();
    let result: unknown;
    if (resource === "clients") {
      result = await db
        .prepare(
          "UPDATE tenant_clients SET name=?,phone=?,email=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?",
        )
        .bind(
          requiredText(data.name, "اسم العميل", 180),
          textValue(data.phone, 80),
          validEmail(data.email),
          textValue(data.notes),
          id,
          context.officeId,
        )
        .run();
    } else if (resource === "cases") {
      result = await db
        .prepare(
          "UPDATE tenant_cases SET case_number=?,client_id=?,court=?,type=?,status=?,opposing_party=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?",
        )
        .bind(
          requiredText(data.caseNumber, "رقم القضية", 180),
          nullableId(data.clientId),
          textValue(data.court, 240),
          textValue(data.type, 120),
          allowedValue(data.status, CASE_STATUSES, "active", "حالة القضية"),
          textValue(data.opposingParty, 240),
          textValue(data.notes),
          id,
          context.officeId,
        )
        .run();
    } else if (resource === "hearings") {
      result = await db
        .prepare(
          "UPDATE tenant_hearings SET case_id=?,title=?,date=?,time=?,location=?,kind=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?",
        )
        .bind(
          nullableId(data.caseId),
          requiredText(data.title, "عنوان الموعد", 240),
          dateValue(data.date, "تاريخ الموعد", { required: true }),
          timeValue(data.time),
          textValue(data.location, 240),
          allowedValue(data.kind, HEARING_KINDS, "hearing", "نوع الموعد"),
          allowedValue(data.status, HEARING_STATUSES, "pending", "حالة الموعد"),
          textValue(data.notes),
          id,
          context.officeId,
        )
        .run();
    } else if (resource === "invoices") {
      const issueDate = dateValue(data.issueDate, "تاريخ الإصدار", { required: true });
      const dueDate = dateValue(data.dueDate, "تاريخ الاستحقاق");
      if (dueDate && dueDate < issueDate) {
        throw new RequestValidationError("تاريخ الاستحقاق يجب ألا يسبق تاريخ الإصدار.");
      }
      result = await db
        .prepare(
          "UPDATE tenant_invoices SET client_id=?,case_id=?,amount_fils=?,status=?,issue_date=?,due_date=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?",
        )
        .bind(
          nullableId(data.clientId),
          nullableId(data.caseId),
          amountFils(data.amountFils),
          allowedValue(data.status, INVOICE_STATUSES, "unpaid", "حالة الفاتورة"),
          issueDate,
          dueDate,
          textValue(data.description, 500),
          id,
          context.officeId,
        )
        .run();
    } else {
      result = await db
        .prepare(
          "UPDATE tenant_memos SET title=?,content=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND office_id=?",
        )
        .bind(
          requiredText(data.title, "عنوان المذكرة", 300),
          requiredText(data.content, "نص المذكرة", 60000),
          id,
          context.officeId,
        )
        .run();
    }

    if (!didWrite(result)) {
      return privateJson({ error: "لم يُعثر على السجل المطلوب." }, { status: 404 });
    }
    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: `update_${resource}`,
      entityType: resource,
      entityId: id,
    });
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error, "تعذّر تعديل السجل حالياً. حاول مرة أخرى بعد قليل.");
  }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedMutation(request);
    const context = await requireTenantContext(request);
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    if (!isOfficeResource(resource) || resource === "settings") {
      throw new RequestValidationError("طلب الحذف غير صحيح.");
    }
    const id = requiredId(url.searchParams.get("id"), "معرّف السجل");
    requireCapability(context, RESOURCE_CAPABILITY[resource]);
    const result = await getD1()
      .prepare(`DELETE FROM ${TABLES[resource]} WHERE id=? AND office_id=?`)
      .bind(id, context.officeId)
      .run();
    if (!didWrite(result)) {
      return privateJson({ error: "لم يُعثر على السجل المطلوب." }, { status: 404 });
    }
    await writeAuditLog({
      officeId: context.officeId,
      actorUserId: context.id,
      action: `delete_${resource}`,
      entityType: resource,
      entityId: id,
    });
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error, "تعذّر حذف السجل حالياً. حاول مرة أخرى بعد قليل.");
  }
}
