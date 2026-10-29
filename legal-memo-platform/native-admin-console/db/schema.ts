import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const adminStaff = sqliteTable(
  "admin_staff",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("support"),
    status: text("status").notNull().default("active"),
    permissionsJson: text("permissions_json").notNull().default("[]"),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("admin_staff_email_uidx").on(table.email),
    index("admin_staff_status_idx").on(table.status),
  ],
);

export const adminAudit = sqliteTable(
  "admin_audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    staffEmail: text("staff_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull().default(""),
    detailsJson: text("details_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("admin_audit_created_idx").on(table.createdAt)],
);

export const adminRateLimits = sqliteTable(
  "admin_rate_limits",
  {
    key: text("key").notNull(),
    bucket: text("bucket").notNull(),
    count: integer("count").notNull().default(1),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("admin_rate_limits_key_bucket_uidx").on(table.key, table.bucket)],
);

export const adminSecurityEvents = sqliteTable(
  "admin_security_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fingerprint: text("fingerprint").notNull().default(""),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull().default("warning"),
    route: text("route").notNull().default(""),
    staffEmail: text("staff_email").notNull().default(""),
    detailCode: text("detail_code").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("admin_security_events_created_idx").on(table.createdAt),
    index("admin_security_events_type_idx").on(table.eventType, table.createdAt),
  ],
);

export const adminAiArchive = sqliteTable(
  "admin_ai_archive",
  {
    id: text("id").primaryKey(),
    staffEmail: text("staff_email").notNull(),
    toolType: text("tool_type").notNull(),
    title: text("title").notNull().default(""),
    inputJson: text("input_json").notNull().default("{}"),
    outputText: text("output_text").notNull().default(""),
    sourcesJson: text("sources_json").notNull().default("[]"),
    status: text("status").notNull().default("completed"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("admin_ai_archive_staff_idx").on(table.staffEmail, table.createdAt),
    index("admin_ai_archive_tool_idx").on(table.toolType, table.createdAt),
  ],
);

export const adminLoginChallenges = sqliteTable(
  "admin_login_challenges",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("admin_login_challenge_email_idx").on(table.email, table.createdAt)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    staffEmail: text("staff_email").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("admin_sessions_staff_idx").on(table.staffEmail), index("admin_sessions_expiry_idx").on(table.expiresAt)],
);
