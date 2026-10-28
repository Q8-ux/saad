import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const legislationReviews = sqliteTable("legislation_reviews", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull().references(() => legislationImports.id),
  sourceSha256: text("source_sha256").notNull(), payloadSha256: text("payload_sha256").notNull(),
  status: text("status").notNull().default("processing"), summaryJson: text("summary_json").notNull(),
  detailsJson: text("details_json").notNull(), assetReceiptsJson: text("asset_receipts_json").notNull().default("{}"),
  reviewedAt: text("reviewed_at").notNull(), completedAt: text("completed_at"),
});
export const legislationImageReviews = sqliteTable("legislation_image_reviews", {
  sourceId: text("source_id").notNull().references(() => legislationImports.id), pdfPage: integer("pdf_page").notNull(),
  reviewId: text("review_id").notNull().references(() => legislationReviews.id), xref: integer("xref").notNull(),
  sourceImageSha256: text("source_image_sha256").notNull(), verifiedText: text("verified_text").notNull(),
  textSha256: text("text_sha256").notNull(), rowsJson: text("rows_json").notNull(), unresolvedJson: text("unresolved_json").notNull(),
  fullTranscriptionVerified: integer("full_transcription_verified", { mode: "boolean" }).notNull().default(false),
  reviewMethod: text("review_method").notNull(), objectKey: text("object_key").notNull(), reviewedAt: text("reviewed_at").notNull(),
}, table => [primaryKey({ columns: [table.sourceId, table.pdfPage] }), index("legislation_image_review_idx").on(table.reviewId)]);
export const legislationCurrencyChecks = sqliteTable("legislation_currency_checks", {
  sourceId: text("source_id").notNull().references(() => legislationImports.id), sectionId: text("section_id").notNull(),
  reviewId: text("review_id").notNull().references(() => legislationReviews.id), identityJson: text("identity_json").notNull(),
  status: text("status").notNull(), officialSourcesJson: text("official_sources_json").notNull(),
  findingsJson: text("findings_json").notNull(), currentLawVerified: integer("current_law_verified", { mode: "boolean" }).notNull().default(false),
  checkedAt: text("checked_at").notNull(),
}, table => [primaryKey({ columns: [table.sourceId, table.sectionId] }), index("legislation_currency_review_idx").on(table.reviewId)]);
export const legislationAuditReports = sqliteTable("legislation_audit_reports", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull().references(() => legislationImports.id),
  reviewId: text("review_id").notNull().references(() => legislationReviews.id), title: text("title").notNull(),
  filename: text("filename").notNull(), objectKey: text("object_key").notNull(), mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(), sha256: text("sha256").notNull(), createdAt: text("created_at").notNull(),
}, table => [index("legislation_reports_source_idx").on(table.sourceId)]);

// Uploaded editions stay separate from the active corpus and from official verification.
export const legislationImports = sqliteTable("legislation_imports", {
  id: text("id").primaryKey(), title: text("title").notNull(),
  sourceSha256: text("source_sha256").notNull(), sourceBytes: integer("source_bytes").notNull(),
  editionClaim: text("edition_claim").notNull(), pageCount: integer("page_count").notNull(),
  sectionCount: integer("section_count").notNull(), articleCount: integer("article_count").notNull(),
  provenance: text("provenance").notNull().default("user_document"),
  currentLawVerified: integer("current_law_verified", { mode: "boolean" }).notNull().default(false),
  activeForGeneration: integer("active_for_generation", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("importing"), metadataJson: text("metadata_json").notNull(),
  importedAt: text("imported_at"),
}, table => [uniqueIndex("legislation_import_sha_uidx").on(table.sourceSha256)]);
export const legislationSections = sqliteTable("legislation_sections", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull().references(() => legislationImports.id),
  title: text("title").notNull(), startPage: integer("start_page").notNull(), endPage: integer("end_page").notNull(),
  kind: text("kind").notNull(), boundaryMethod: text("boundary_method").notNull(),
}, table => [index("legislation_sections_source_idx").on(table.sourceId)]);
export const legislationPages = sqliteTable("legislation_pages", {
  sourceId: text("source_id").notNull().references(() => legislationImports.id), pdfPage: integer("pdf_page").notNull(),
  documentId: text("document_id").references(() => legislationSections.id), printedPage: text("printed_page"),
  role: text("role").notNull(), text: text("text").notNull(), textSha256: text("text_sha256").notNull(),
  searchText: text("search_text").notNull(), qualityFlagsJson: text("quality_flags_json").notNull(),
}, table => [primaryKey({ columns: [table.sourceId, table.pdfPage] }), index("legislation_pages_document_idx").on(table.documentId)]);
export const legislationArticles = sqliteTable("legislation_articles", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull().references(() => legislationImports.id),
  documentId: text("document_id").notNull().references(() => legislationSections.id), componentId: text("component_id").notNull(),
  number: text("number").notNull(), heading: text("heading").notNull(), startPage: integer("start_page").notNull(),
  endPage: integer("end_page").notNull(), text: text("text").notNull(), textSha256: text("text_sha256").notNull(),
  segmentsJson: text("segments_json").notNull(), boundaryReview: text("boundary_review").notNull(),
  transcriptionVerified: integer("transcription_verified", { mode: "boolean" }).notNull().default(false),
  completeArticleVerified: integer("complete_article_verified", { mode: "boolean" }).notNull().default(false),
}, table => [index("legislation_articles_source_idx").on(table.sourceId), index("legislation_articles_identity_idx").on(table.documentId, table.componentId, table.number)]);

// Drafting forms are not legal authorities and are never indexed as evidence.
export const legalDraftingTemplates = sqliteTable("legal_drafting_templates", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  sourceFilename: text("source_filename").notNull(),
  sourceSha256: text("source_sha256").notNull(),
  sourceObjectKey: text("source_object_key").notNull(),
  pageCount: integer("page_count").notNull(),
  definitionJson: text("definition_json").notNull(),
  status: text("status").notNull().default("approved"),
  approvedBy: text("approved_by").notNull().default("project_owner"),
  approvedAt: text("approved_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("legal_drafting_templates_kind_version_uidx").on(table.kind, table.version)]);

export const legalDocuments = sqliteTable(
  "legal_documents",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourcePage: text("source_page").notNull().default(""),
    officialSource: text("official_source").notNull().default(""),
    documentType: text("document_type").notNull().default("مستند قانوني"),
    lawNumber: integer("law_number"),
    lawYear: integer("law_year"),
    category: text("category").notNull().default("تشريعات عامة"),
    originalCategory: text("original_category").notNull().default(""),
    summary: text("summary").notNull().default(""),
    keywordsJson: text("keywords_json").notNull().default("[]"),
    searchText: text("search_text").notNull().default(""),
    pageCount: integer("page_count"),
    articleCount: integer("article_count").notNull().default(0),
    sourceType: text("source_type").notNull().default("unknown"),
    hasVerifiedText: integer("has_verified_text", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("ready"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("legal_documents_source_url_uidx").on(table.sourceUrl),
    index("legal_documents_category_idx").on(table.category),
    index("legal_documents_year_idx").on(table.lawYear),
    index("legal_documents_verified_idx").on(table.hasVerifiedText),
  ],
);

export const legalChunks = sqliteTable(
  "legal_chunks",
  {
    id: integer("id").primaryKey(),
    documentId: integer("document_id").notNull().references(() => legalDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    reference: text("reference"),
    text: text("text").notNull(),
    searchTerms: text("search_terms").notNull().default(""),
    charStart: integer("char_start").notNull().default(0),
    charEnd: integer("char_end").notNull().default(0),
    arabicRatio: real("arabic_ratio").notNull(),
    qualityScore: integer("quality_score").notNull(),
    verified: integer("verified", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("legal_chunks_document_idx").on(table.documentId),
    index("legal_chunks_verified_idx").on(table.verified),
    uniqueIndex("legal_chunks_document_position_uidx").on(table.documentId, table.chunkIndex),
  ],
);

export const officialSourceChecks = sqliteTable("official_source_checks", {
  sourceUrl:text("source_url").primaryKey(), documentId:integer("document_id").notNull(),
  sourceSha256:text("source_sha256"), status:text("status").notNull(),
  checkedAt:text("checked_at").notNull(), metadataJson:text("metadata_json").notNull(),
});
export const officialArticleRecords = sqliteTable("official_article_records", {
  id:text("id").primaryKey(), documentId:integer("document_id").notNull(),chunkId:integer("chunk_id"),
  lawNumber:integer("law_number"),lawYear:integer("law_year"),articleNumber:text("article_number").notNull(),
  text:text("text").notNull(),sourceUrl:text("source_url").notNull(),page:integer("page").notNull(),
  sourceSha256:text("source_sha256").notNull(),textSha256:text("text_sha256").notNull(),
  status:text("status").notNull(),legalStatus:text("legal_status").notNull(),checkedAt:text("checked_at").notNull(),
},table=>[index("official_articles_identity_idx").on(table.lawNumber,table.lawYear,table.articleNumber),index("official_articles_status_idx").on(table.status)]);

export const legalDocumentSources = sqliteTable(
  "legal_document_sources",
  {
    id: integer("id").primaryKey(),
    documentId: integer("document_id").notNull().references(() => legalDocuments.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceLabel: text("source_label").notNull(),
    sourceType: text("source_type").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("legal_sources_document_idx").on(table.documentId)],
);

export const contactMessages = sqliteTable(
  "contact_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    language: text("language").notNull().default("ar"),
    status: text("status").notNull().default("new"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("contact_messages_status_idx").on(table.status, table.createdAt)],
);

export const consultationRequests = sqliteTable(
  "consultation_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    caseType: text("case_type").notNull(),
    preferredContact: text("preferred_contact").notNull().default("WhatsApp"),
    message: text("message").notNull().default(""),
    language: text("language").notNull().default("ar"),
    status: text("status").notNull().default("new"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("consultation_requests_status_idx").on(table.status, table.createdAt)],
);

export const apiRateLimits = sqliteTable(
  "api_rate_limits",
  {
    key: text("key").notNull(),
    bucket: text("bucket").notNull(),
    count: integer("count").notNull().default(1),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("api_rate_limits_key_bucket_uidx").on(table.key, table.bucket)],
);

export const publicUsers = sqliteTable(
  "public_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull().default("active"),
    memoLimit: integer("memo_limit").notNull().default(3),
    assistantLimit: integer("assistant_limit").notNull().default(20),
    emailVerifiedAt: text("email_verified_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("public_users_email_uidx").on(table.email)],
);

export const userAccessPolicies = sqliteTable("user_access_policies", {
  userId: text("user_id").primaryKey().references(() => publicUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("user"), permissionsJson: text("permissions_json").notNull().default("{}"),
  updatedBy: text("updated_by").notNull(), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const serviceRecords = sqliteTable(
  "service_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => publicUsers.id, { onDelete: "cascade" }),
    serviceType: text("service_type").notNull(),
    title: text("title").notNull().default(""),
    inputText: text("input_text").notNull().default(""),
    outputText: text("output_text").notNull().default(""),
    metadataJson: text("metadata_json").notNull().default("{}"),
    status: text("status").notNull().default("completed"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("service_records_user_idx").on(table.userId, table.createdAt),
    index("service_records_type_idx").on(table.serviceType, table.createdAt),
  ],
);

export const serviceSettings = sqliteTable(
  "service_settings",
  {
    serviceKey: text("service_key").primaryKey(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    paymentRequired: integer("payment_required", { mode: "boolean" }).notNull().default(false),
    priceFils: integer("price_fils").notNull().default(0),
    currency: text("currency").notNull().default("KWD"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
);

export const sadadPayments = sqliteTable("sadad_payments", {
  id: text("id").primaryKey(), tokenHash: text("token_hash").notNull(), inputHash: text("input_hash").notNull(),
  provider: text("provider").notNull().default("sadad"), testActor: text("test_actor"),
  environment: text("environment").notNull(), amountFils: integer("amount_fils").notNull(), currency: text("currency").notNull().default("KWD"),
  reference: text("reference").notNull(), invoiceId: text("invoice_id"), invoiceKey: text("invoice_key"), transactionId: text("transaction_id"),
  status: text("status").notNull().default("creating"), generationId: text("generation_id"), leaseUntil: integer("lease_until"),
  resultJson: text("result_json"), resultExpiresAt: integer("result_expires_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("sadad_invoice_uidx").on(table.environment, table.invoiceId), uniqueIndex("sadad_transaction_uidx").on(table.environment, table.transactionId)]);

export const paymentRuntimeSettings = sqliteTable("payment_runtime_settings", {
  id: text("id").primaryKey(), mode: text("mode").notNull().default("real"), revision: integer("revision").notNull().default(0),
  updatedBy: text("updated_by").notNull().default("migration"), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const paymentModeAudit = sqliteTable("payment_mode_audit", {
  id: text("id").primaryKey(), previousMode: text("previous_mode").notNull(), nextMode: text("next_mode").notNull(), actor: text("actor").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const paymentTestSessions = sqliteTable("payment_test_sessions", {
  tokenHash: text("token_hash").primaryKey(), managementSessionHash: text("management_session_hash").notNull(), actor: text("actor").notNull(), expiresAt: integer("expires_at").notNull(),
});

export const emailVerificationChallenges = sqliteTable(
  "email_verification_challenges",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("email_verification_email_idx").on(table.email, table.createdAt),
    index("email_verification_expiry_idx").on(table.expiresAt),
  ],
);

export const publicUserSessions = sqliteTable(
  "public_user_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull().references(() => publicUsers.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("public_user_sessions_user_idx").on(table.userId),
    index("public_user_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const managementLoginCodes = sqliteTable("management_login_codes", {
  codeHash: text("code_hash").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  challenge: text("challenge").notNull(), expiresAt: integer("expires_at").notNull(),
});
export const managementSessions = sqliteTable("management_sessions", {
  tokenHash: text("token_hash").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  expiresAt: integer("expires_at").notNull(), lastSeenAt: integer("last_seen_at").notNull(),
});
export const managementMemoRequests = sqliteTable("management_memo_requests", {
  id: text("id").primaryKey(), userId: text("user_id"), clientName: text("client_name").notNull(),
  email: text("email").notNull().default(""), caseType: text("case_type").notNull(), caseNumber: text("case_number").notNull().default(""),
  inputJson: text("input_json").notNull(), outputText: text("output_text").notNull().default(""),
  status: text("status").notNull(), errorCode: text("error_code").notNull().default(""), origin: text("origin").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index("management_memos_created_idx").on(t.createdAt)]);
export const managementVault = sqliteTable("management_vault", {
  integration: text("integration").primaryKey(), sealed: text("sealed").notNull(), updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const managementCommands = sqliteTable("management_commands", {
  id: text("id").primaryKey(), title: text("title").notNull(), details: text("details").notNull().default(""),
  status: text("status").notNull().default("pending"), priority: text("priority").notNull().default("normal"),
  createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const managementEvents = sqliteTable("management_events", {
  id: text("id").primaryKey(), source: text("source").notNull(), kind: text("kind").notNull(),
  title: text("title").notNull(), severity: text("severity").notNull().default("info"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const managementReadStates = sqliteTable("management_read_states", {
  id: text("id").primaryKey(), email: text("email").notNull(), eventId: text("event_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [uniqueIndex("management_read_identity_idx").on(t.email, t.eventId)]);
export const managementEmails = sqliteTable("management_emails", {
  id: text("id").primaryKey(), sender: text("sender").notNull(), recipients: text("recipients").notNull(),
  subject: text("subject").notNull(), bodyText: text("body_text").notNull(), status: text("status").notNull().default("new"),
  receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
