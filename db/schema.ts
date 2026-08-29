import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const legalDocuments = sqliteTable(
  "legal_documents",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourcePage: text("source_page").notNull(),
    officialSource: text("official_source").notNull(),
    documentType: text("document_type").notNull(),
    lawNumber: integer("law_number"),
    lawYear: integer("law_year"),
    category: text("category").notNull(),
    summary: text("summary").notNull().default(""),
    keywordsJson: text("keywords_json").notNull().default("[]"),
    searchText: text("search_text").notNull().default(""),
    pageCount: integer("page_count"),
    articleCount: integer("article_count").notNull().default(0),
    status: text("status").notNull().default("ready"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("legal_documents_category_idx").on(table.category),
    index("legal_documents_type_idx").on(table.documentType),
    index("legal_documents_year_idx").on(table.lawYear),
  ],
);

export const legalChunks = sqliteTable(
  "legal_chunks",
  {
    id: integer("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    reference: text("reference"),
    text: text("text").notNull(),
    searchTerms: text("search_terms").notNull().default(""),
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("legal_chunks_document_idx").on(table.documentId),
    index("legal_chunks_position_idx").on(table.documentId, table.chunkIndex),
  ],
);

export const legalDocumentSources = sqliteTable(
  "legal_document_sources",
  {
    id: integer("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceLabel: text("source_label").notNull(),
    sourceType: text("source_type").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("legal_sources_document_idx").on(table.documentId)],
);

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("clients_name_idx").on(table.name)],
);

export const cases = sqliteTable(
  "cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseNumber: text("case_number").notNull(),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    court: text("court").notNull().default(""),
    type: text("type").notNull().default(""),
    status: text("status").notNull().default("active"),
    opposingParty: text("opposing_party").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("cases_client_idx").on(table.clientId),
    index("cases_status_idx").on(table.status),
  ],
);

export const hearings = sqliteTable(
  "hearings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull().default(""),
    location: text("location").notNull().default(""),
    kind: text("kind").notNull().default("hearing"),
    status: text("status").notNull().default("pending"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("hearings_case_idx").on(table.caseId),
    index("hearings_date_idx").on(table.date),
  ],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    caseId: integer("case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    amountFils: integer("amount_fils").notNull(),
    status: text("status").notNull().default("unpaid"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull().default(""),
    description: text("description").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("invoices_client_idx").on(table.clientId),
    index("invoices_status_idx").on(table.status),
  ],
);

export const memos = sqliteTable(
  "memos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    memoType: text("memo_type").notNull().default("دفاع"),
    court: text("court").notNull().default(""),
    facts: text("facts").notNull().default(""),
    legalBasis: text("legal_basis").notNull().default(""),
    requests: text("requests").notNull().default(""),
    content: text("content").notNull(),
    citationsJson: text("citations_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("memos_case_idx").on(table.caseId)],
);

export const officeSettings = sqliteTable("office_settings", {
  id: integer("id").primaryKey(),
  officeName: text("office_name").notNull().default("المكتب القانوني"),
  currency: text("currency").notNull().default("KWD"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// SaaS tenancy. The original office_* tables above are retained as a legacy
// snapshot; all new subscription-office data is stored in the tenant_* tables
// below and is always scoped to an office_id.
export const appUsers = sqliteTable(
  "app_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("app_users_email_unique").on(table.email),
    index("app_users_status_idx").on(table.status),
  ],
);

// Local credentials are intentionally separate from app_users so the user
// profile never stores a password or a password-derived value.
export const localLoginCredentials = sqliteTable(
  "local_login_credentials",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull(),
    isPlatformAdmin: integer("is_platform_admin").notNull().default(0),
    initialOfficeName: text("initial_office_name").notNull().default(""),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: text("locked_until").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("local_login_credentials_username_unique").on(table.username),
    index("local_login_credentials_lock_idx").on(table.lockedUntil),
  ],
);

export const localLoginSessions = sqliteTable(
  "local_login_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("local_login_sessions_token_unique").on(table.tokenHash),
    index("local_login_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export const offices = sqliteTable(
  "offices",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("trial"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("offices_slug_unique").on(table.slug),
    index("offices_status_idx").on(table.status),
  ],
);

export const officeSubscriptions = sqliteTable(
  "office_subscriptions",
  {
    id: text("id").primaryKey(),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("starter"),
    status: text("status").notNull().default("trial"),
    billingMode: text("billing_mode").notNull().default("manual"),
    seatLimit: integer("seat_limit").notNull().default(3),
    startsAt: text("starts_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    endsAt: text("ends_at").notNull().default(""),
    graceUntil: text("grace_until").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("office_subscriptions_office_unique").on(table.officeId),
    index("office_subscriptions_status_idx").on(table.status),
  ],
);

export const officeMembers = sqliteTable(
  "office_members",
  {
    id: text("id").primaryKey(),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("lawyer"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("office_members_office_user_unique").on(table.officeId, table.userId),
    index("office_members_user_idx").on(table.userId),
    index("office_members_office_status_idx").on(table.officeId, table.status),
  ],
);

export const tenantSettings = sqliteTable("tenant_settings", {
  officeId: text("office_id")
    .primaryKey()
    .references(() => offices.id, { onDelete: "cascade" }),
  officeName: text("office_name").notNull().default("المكتب القانوني"),
  currency: text("currency").notNull().default("KWD"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tenantClients = sqliteTable(
  "tenant_clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("tenant_clients_office_name_idx").on(table.officeId, table.name),
  ],
);

export const tenantCases = sqliteTable(
  "tenant_cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    caseNumber: text("case_number").notNull(),
    clientId: integer("client_id").references(() => tenantClients.id, {
      onDelete: "set null",
    }),
    court: text("court").notNull().default(""),
    type: text("type").notNull().default(""),
    status: text("status").notNull().default("active"),
    opposingParty: text("opposing_party").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("tenant_cases_office_number_unique").on(table.officeId, table.caseNumber),
    index("tenant_cases_office_client_idx").on(table.officeId, table.clientId),
    index("tenant_cases_office_status_idx").on(table.officeId, table.status),
  ],
);

export const tenantHearings = sqliteTable(
  "tenant_hearings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    caseId: integer("case_id").references(() => tenantCases.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull().default(""),
    location: text("location").notNull().default(""),
    kind: text("kind").notNull().default("hearing"),
    status: text("status").notNull().default("pending"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("tenant_hearings_office_date_idx").on(table.officeId, table.date),
    index("tenant_hearings_office_case_idx").on(table.officeId, table.caseId),
  ],
);

export const tenantInvoices = sqliteTable(
  "tenant_invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    clientId: integer("client_id").references(() => tenantClients.id, {
      onDelete: "set null",
    }),
    caseId: integer("case_id").references(() => tenantCases.id, {
      onDelete: "set null",
    }),
    amountFils: integer("amount_fils").notNull(),
    status: text("status").notNull().default("unpaid"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull().default(""),
    description: text("description").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("tenant_invoices_office_status_idx").on(table.officeId, table.status),
    index("tenant_invoices_office_client_idx").on(table.officeId, table.clientId),
  ],
);

export const tenantMemos = sqliteTable(
  "tenant_memos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    caseId: integer("case_id").references(() => tenantCases.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    memoType: text("memo_type").notNull().default("دفاع"),
    court: text("court").notNull().default(""),
    facts: text("facts").notNull().default(""),
    legalBasis: text("legal_basis").notNull().default(""),
    requests: text("requests").notNull().default(""),
    content: text("content").notNull(),
    citationsJson: text("citations_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("tenant_memos_office_created_idx").on(table.officeId, table.createdAt),
    index("tenant_memos_office_case_idx").on(table.officeId, table.caseId),
  ],
);

export const officeAuditLogs = sqliteTable(
  "office_audit_logs",
  {
    id: text("id").primaryKey(),
    officeId: text("office_id").references(() => offices.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull().default(""),
    entityId: text("entity_id").notNull().default(""),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("office_audit_logs_office_created_idx").on(table.officeId, table.createdAt),
    index("office_audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
  ],
);
