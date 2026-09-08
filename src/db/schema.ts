import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  publicToken: text("public_token").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  normalizedDomain: text("normalized_domain").notNull(),
  locale: text("locale", { enum: ["ru", "en"] }).notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  contactType: text("contact_type").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  pagesDiscovered: integer("pages_discovered").notNull().default(0),
  pagesChecked: integer("pages_checked").notNull().default(0),
  pageLimit: integer("page_limit").notNull().default(100),
  overallScore: integer("overall_score"),
  grade: text("grade"),
  partial: integer("partial", { mode: "boolean" }).notNull().default(false),
  errorSummary: text("error_summary"),
  ipHash: text("ip_hash").notNull(),
  userAgentHash: text("user_agent_hash").notNull(),
  source: text("source").notNull(),
  priorityUrlsJson: text("priority_urls_json"),
  utmJson: text("utm_json"),
  publicResultJson: text("public_result_json"),
  fullResultJson: text("full_result_json"),
  consentVersion: text("consent_version").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("audits_public_token_idx").on(table.publicToken),
]);

export const auditPages = sqliteTable("audit_pages", {
  id: text("id").primaryKey(), auditId: text("audit_id").notNull(), url: text("url").notNull(),
  statusCode: integer("status_code"), depth: integer("depth"), dataJson: text("data_json"), createdAt: integer("created_at").notNull(),
});

export const auditIssues = sqliteTable("audit_issues", {
  id: text("id").primaryKey(), auditId: text("audit_id").notNull(), code: text("code").notNull(),
  category: text("category").notNull(), severity: text("severity").notNull(), url: text("url"),
  evidence: text("evidence"), recommendation: text("recommendation"), createdAt: integer("created_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), auditId: text("audit_id").notNull(),
  event: text("event").notNull(), payloadJson: text("payload_json"), createdAt: integer("created_at").notNull(),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(), name: text("name").notNull(), contact: text("contact").notNull(),
  contactType: text("contact_type").notNull(), target: text("target"), service: text("service"), comment: text("comment"),
  status: text("status").notNull().default("new"), locale: text("locale").notNull(), source: text("source").notNull(),
  pageUrl: text("page_url"), utmJson: text("utm_json"), consentVersion: text("consent_version").notNull(),
  ipHash: text("ip_hash").notNull(), createdAt: integer("created_at").notNull(),
});

export const calculatorRequests = sqliteTable("calculator_requests", {
  id: text("id").primaryKey(), leadId: text("lead_id"), kind: text("kind").notNull(), answersJson: text("answers_json").notNull(),
  minPrice: integer("min_price").notNull(), maxPrice: integer("max_price").notNull(), createdAt: integer("created_at").notNull(),
});

export const briefSubmissions = sqliteTable("brief_submissions", {
  id: text("id").primaryKey(), name: text("name").notNull(), contact: text("contact").notNull(), locale: text("locale").notNull(),
  service: text("service").notNull(), answersJson: text("answers_json").notNull(), status: text("status").notNull().default("new"),
  consentVersion: text("consent_version").notNull(), ipHash: text("ip_hash").notNull(), createdAt: integer("created_at").notNull(),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(), briefId: text("brief_id").notNull(), storageName: text("storage_name").notNull(),
  originalName: text("original_name").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const adminNotes = sqliteTable("admin_notes", {
  id: text("id").primaryKey(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  note: text("note").notNull(), createdAt: integer("created_at").notNull(),
});

export const adminEntityMetadata = sqliteTable("admin_entity_metadata", {
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  qaLabel: text("qa_label"),
  offerSnapshotJson: text("offer_snapshot_json"),
  archivedAt: integer("archived_at"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.entityType, table.entityId] })]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), windowStart: integer("window_start").notNull(), count: integer("count").notNull(), updatedAt: integer("updated_at").notNull(),
});

export const notificationEvents = sqliteTable("notification_events", {
  id: text("id").primaryKey(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), channel: text("channel").notNull(),
  status: text("status").notNull(), error: text("error"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});

export const workerState = sqliteTable("worker_state", {
  name: text("name").primaryKey(), heartbeatAt: integer("heartbeat_at").notNull(), metadataJson: text("metadata_json"),
});

export const publicMetrics = sqliteTable("public_metrics", {
  name: text("name").primaryKey(),
  value: integer("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Anonymous, aggregated traffic only: no cookie/session id, IP, user agent,
// referrer or query string is stored. The primary key bounds one counter per
// public path and Moscow calendar day.
export const pageViewDaily = sqliteTable("page_view_daily", {
  day: text("day").notNull(),
  path: text("path").notNull(),
  views: integer("views").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.day, table.path] })]);

// Deliberately has no foreign key: a public usage total must survive audit retention cleanup.
export const auditUsage = sqliteTable("audit_usage", {
  auditId: text("audit_id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

// One row per real domain that has ever received a completed free audit.
// This table deliberately has no audit foreign key, so retention cleanup cannot reduce the public total.
export const completedAuditDomains = sqliteTable("completed_audit_domains", {
  normalizedDomain: text("normalized_domain").primaryKey(),
  firstCompletedAt: integer("first_completed_at").notNull(),
});
