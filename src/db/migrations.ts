import type { Client, Transaction } from "@libsql/client";
import type Database from "better-sqlite3";

export const migrationSql = `
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY, public_token TEXT NOT NULL UNIQUE, original_url TEXT NOT NULL,
  normalized_domain TEXT NOT NULL, locale TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL,
  contact_type TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, started_at INTEGER,
  completed_at INTEGER, pages_discovered INTEGER NOT NULL DEFAULT 0, pages_checked INTEGER NOT NULL DEFAULT 0,
  page_limit INTEGER NOT NULL DEFAULT 100, overall_score INTEGER, grade TEXT, partial INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT, ip_hash TEXT NOT NULL, user_agent_hash TEXT NOT NULL, source TEXT NOT NULL,
  utm_json TEXT, public_result_json TEXT, full_result_json TEXT, consent_version TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audits_domain_status_idx ON audits(normalized_domain, status);
CREATE INDEX IF NOT EXISTS audits_created_idx ON audits(created_at DESC);
CREATE TABLE IF NOT EXISTS audit_pages (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, url TEXT NOT NULL, status_code INTEGER, depth INTEGER, data_json TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS audit_issues (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, code TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL, url TEXT, evidence TEXT, recommendation TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, audit_id TEXT NOT NULL, event TEXT NOT NULL, payload_json TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS audit_events_lookup_idx ON audit_events(audit_id, id);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, contact_type TEXT NOT NULL, target TEXT, service TEXT, comment TEXT, status TEXT NOT NULL DEFAULT 'new', locale TEXT NOT NULL, source TEXT NOT NULL, page_url TEXT, utm_json TEXT, consent_version TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS calculator_requests (id TEXT PRIMARY KEY, lead_id TEXT, kind TEXT NOT NULL, answers_json TEXT NOT NULL, min_price INTEGER NOT NULL, max_price INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS brief_submissions (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, locale TEXT NOT NULL, service TEXT NOT NULL, answers_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', consent_version TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, storage_name TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_notes (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_entity_metadata (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('audit','lead','brief')),
  entity_id TEXT NOT NULL,
  qa_label TEXT,
  offer_snapshot_json TEXT,
  archived_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS admin_entity_metadata_archive_idx ON admin_entity_metadata(entity_type, archived_at, qa_label);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notification_events (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS worker_state (name TEXT PRIMARY KEY, heartbeat_at INTEGER NOT NULL, metadata_json TEXT);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS public_metrics (name TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value >= 0), updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS page_view_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK(views >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(day, path)
);
CREATE INDEX IF NOT EXISTS page_view_daily_updated_idx ON page_view_daily(updated_at DESC);
CREATE TABLE IF NOT EXISTS audit_usage (audit_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_domain_locks (
  normalized_domain TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS completed_audit_domains (
  normalized_domain TEXT PRIMARY KEY,
  first_completed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audits_public_usage_idx ON audits(status, completed_at, normalized_domain);
INSERT OR IGNORE INTO completed_audit_domains(normalized_domain, first_completed_at)
SELECT lower(trim(normalized_domain)), MIN(completed_at)
FROM audits
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND pages_checked > 0
  AND trim(normalized_domain) <> ''
  AND lower(trim(normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(normalized_domain)) <> 'test'
  AND lower(source) NOT LIKE 'playwright%'
  AND lower(source) NOT LIKE 'integration-test%'
  AND lower(source) NOT IN ('test', 'fixture')
  AND NOT EXISTS (
    SELECT 1 FROM admin_entity_metadata metadata
    WHERE metadata.entity_type='audit' AND metadata.entity_id=audits.id AND metadata.qa_label IS NOT NULL
  )
GROUP BY lower(trim(normalized_domain));
DROP TRIGGER IF EXISTS audits_record_completed_domain_insert;
CREATE TRIGGER IF NOT EXISTS audits_record_completed_domain_insert
AFTER INSERT ON audits
WHEN NEW.status = 'completed'
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND NOT EXISTS (
    SELECT 1 FROM admin_entity_metadata metadata
    WHERE metadata.entity_type='audit' AND metadata.entity_id=NEW.id AND metadata.qa_label IS NOT NULL
  )
BEGIN
  INSERT OR IGNORE INTO completed_audit_domains(normalized_domain, first_completed_at)
  VALUES (lower(trim(NEW.normalized_domain)), NEW.completed_at);
END;
DROP TRIGGER IF EXISTS audits_record_completed_domain_update;
CREATE TRIGGER IF NOT EXISTS audits_record_completed_domain_update
AFTER UPDATE OF status, completed_at, pages_checked, normalized_domain, source ON audits
WHEN NEW.status = 'completed'
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND NOT EXISTS (
    SELECT 1 FROM admin_entity_metadata metadata
    WHERE metadata.entity_type='audit' AND metadata.entity_id=NEW.id AND metadata.qa_label IS NOT NULL
  )
BEGIN
  INSERT OR IGNORE INTO completed_audit_domains(normalized_domain, first_completed_at)
  VALUES (lower(trim(NEW.normalized_domain)), NEW.completed_at);
END;
INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
DROP TRIGGER IF EXISTS audits_record_completed_page_usage_insert;
CREATE TRIGGER IF NOT EXISTS audits_record_completed_page_usage_insert
AFTER INSERT ON audits
WHEN NEW.status IN ('completed', 'partial')
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND lower(NEW.source) NOT LIKE '%:cached'
  AND NOT EXISTS (
    SELECT 1 FROM admin_entity_metadata metadata
    WHERE metadata.entity_type='audit' AND metadata.entity_id=NEW.id AND metadata.qa_label IS NOT NULL
  )
BEGIN
  INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
  VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
  INSERT OR IGNORE INTO audit_usage(audit_id, created_at)
  VALUES (NEW.id, NEW.completed_at);
  UPDATE public_metrics
  SET value = value + MIN(MAX(NEW.pages_checked, 0), 10), updated_at = unixepoch('now') * 1000
  WHERE name = 'free_audit_pages' AND changes() > 0;
END;
DROP TRIGGER IF EXISTS audits_record_completed_page_usage_update;
CREATE TRIGGER IF NOT EXISTS audits_record_completed_page_usage_update
AFTER UPDATE OF status, completed_at, pages_checked, normalized_domain, source ON audits
WHEN NEW.status IN ('completed', 'partial')
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND lower(NEW.source) NOT LIKE '%:cached'
  AND NOT EXISTS (
    SELECT 1 FROM admin_entity_metadata metadata
    WHERE metadata.entity_type='audit' AND metadata.entity_id=NEW.id AND metadata.qa_label IS NOT NULL
  )
BEGIN
  INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
  VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
  INSERT OR IGNORE INTO audit_usage(audit_id, created_at)
  VALUES (NEW.id, NEW.completed_at);
  UPDATE public_metrics
  SET value = value + MIN(MAX(NEW.pages_checked, 0), 10), updated_at = unixepoch('now') * 1000
  WHERE name = 'free_audit_pages' AND changes() > 0;
END;
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (3, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (4, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (5, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (6, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (7, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (8, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (9, unixepoch('now') * 1000);
`;

export type DatabaseMigration = {
  readonly version: number;
  readonly name: string;
  readonly up: readonly string[];
};

export type MigrationResult = {
  readonly fromVersion: number;
  readonly currentVersion: number;
  readonly appliedVersions: readonly number[];
};

export const MIN_SUPPORTED_SCHEMA_VERSION = 6;

const domainInsertTriggerV6 = `
CREATE TRIGGER IF NOT EXISTS audits_record_completed_domain_insert
AFTER INSERT ON audits
WHEN NEW.status = 'completed'
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
BEGIN
  INSERT OR IGNORE INTO completed_audit_domains(normalized_domain, first_completed_at)
  VALUES (lower(trim(NEW.normalized_domain)), NEW.completed_at);
END;
`;

const domainUpdateTriggerV6 = `
CREATE TRIGGER IF NOT EXISTS audits_record_completed_domain_update
AFTER UPDATE OF status, completed_at, pages_checked, normalized_domain, source ON audits
WHEN NEW.status = 'completed'
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
BEGIN
  INSERT OR IGNORE INTO completed_audit_domains(normalized_domain, first_completed_at)
  VALUES (lower(trim(NEW.normalized_domain)), NEW.completed_at);
END;
`;

const pageUsageInsertTriggerV7 = `
CREATE TRIGGER IF NOT EXISTS audits_record_completed_page_usage_insert
AFTER INSERT ON audits
WHEN NEW.status IN ('completed', 'partial')
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND lower(NEW.source) NOT LIKE '%:cached'
BEGIN
  INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
  VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
  INSERT OR IGNORE INTO audit_usage(audit_id, created_at)
  VALUES (NEW.id, NEW.completed_at);
  UPDATE public_metrics
  SET value = value + MIN(MAX(NEW.pages_checked, 0), 10), updated_at = unixepoch('now') * 1000
  WHERE name = 'free_audit_pages' AND changes() > 0;
END;
`;

const pageUsageUpdateTriggerV7 = `
CREATE TRIGGER IF NOT EXISTS audits_record_completed_page_usage_update
AFTER UPDATE OF status, completed_at, pages_checked, normalized_domain, source ON audits
WHEN NEW.status IN ('completed', 'partial')
  AND NEW.completed_at IS NOT NULL
  AND NEW.pages_checked > 0
  AND trim(NEW.normalized_domain) <> ''
  AND lower(trim(NEW.normalized_domain)) NOT LIKE '%.test'
  AND lower(trim(NEW.normalized_domain)) <> 'test'
  AND lower(NEW.source) NOT LIKE 'playwright%'
  AND lower(NEW.source) NOT LIKE 'integration-test%'
  AND lower(NEW.source) NOT IN ('test', 'fixture')
  AND lower(NEW.source) NOT LIKE '%:cached'
BEGIN
  INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
  VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
  INSERT OR IGNORE INTO audit_usage(audit_id, created_at)
  VALUES (NEW.id, NEW.completed_at);
  UPDATE public_metrics
  SET value = value + MIN(MAX(NEW.pages_checked, 0), 10), updated_at = unixepoch('now') * 1000
  WHERE name = 'free_audit_pages' AND changes() > 0;
END;
`;

const domainInsertTriggerV8 = addQaExclusion(domainInsertTriggerV6);
const domainUpdateTriggerV8 = addQaExclusion(domainUpdateTriggerV6);
const pageUsageInsertTriggerV8 = addQaExclusion(pageUsageInsertTriggerV7);
const pageUsageUpdateTriggerV8 = addQaExclusion(pageUsageUpdateTriggerV7);

export const bootstrapV6Sql = `
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY, public_token TEXT NOT NULL UNIQUE, original_url TEXT NOT NULL,
  normalized_domain TEXT NOT NULL, locale TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL,
  contact_type TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, started_at INTEGER,
  completed_at INTEGER, pages_discovered INTEGER NOT NULL DEFAULT 0, pages_checked INTEGER NOT NULL DEFAULT 0,
  page_limit INTEGER NOT NULL DEFAULT 100, overall_score INTEGER, grade TEXT, partial INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT, ip_hash TEXT NOT NULL, user_agent_hash TEXT NOT NULL, source TEXT NOT NULL,
  utm_json TEXT, public_result_json TEXT, full_result_json TEXT, consent_version TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audits_domain_status_idx ON audits(normalized_domain, status);
CREATE INDEX IF NOT EXISTS audits_created_idx ON audits(created_at DESC);
CREATE TABLE IF NOT EXISTS audit_pages (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, url TEXT NOT NULL, status_code INTEGER, depth INTEGER, data_json TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS audit_issues (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, code TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL, url TEXT, evidence TEXT, recommendation TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, audit_id TEXT NOT NULL, event TEXT NOT NULL, payload_json TEXT, created_at INTEGER NOT NULL, FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS audit_events_lookup_idx ON audit_events(audit_id, id);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, contact_type TEXT NOT NULL, target TEXT, service TEXT, comment TEXT, status TEXT NOT NULL DEFAULT 'new', locale TEXT NOT NULL, source TEXT NOT NULL, page_url TEXT, utm_json TEXT, consent_version TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS calculator_requests (id TEXT PRIMARY KEY, lead_id TEXT, kind TEXT NOT NULL, answers_json TEXT NOT NULL, min_price INTEGER NOT NULL, max_price INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS brief_submissions (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL, locale TEXT NOT NULL, service TEXT NOT NULL, answers_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', consent_version TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, storage_name TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_notes (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notification_events (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS worker_state (name TEXT PRIMARY KEY, heartbeat_at INTEGER NOT NULL, metadata_json TEXT);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS public_metrics (name TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value >= 0), updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_usage (audit_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS completed_audit_domains (
  normalized_domain TEXT PRIMARY KEY,
  first_completed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audits_public_usage_idx ON audits(status, completed_at, normalized_domain);
${domainInsertTriggerV6}
${domainUpdateTriggerV6}
`;

const migration7Up = [
  `CREATE TABLE IF NOT EXISTS audit_domain_locks (
    normalized_domain TEXT PRIMARY KEY,
    audit_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );`,
  `INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
    VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);`,
  pageUsageInsertTriggerV7,
  pageUsageUpdateTriggerV7,
] as const;

const migration8Up = [
  `CREATE TABLE IF NOT EXISTS admin_entity_metadata (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('audit','lead','brief')),
    entity_id TEXT NOT NULL,
    qa_label TEXT,
    offer_snapshot_json TEXT,
    archived_at INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(entity_type, entity_id)
  );`,
  "CREATE INDEX IF NOT EXISTS admin_entity_metadata_archive_idx ON admin_entity_metadata(entity_type, archived_at, qa_label);",
  replaceTrigger("audits_record_completed_domain_insert", domainInsertTriggerV8),
  replaceTrigger("audits_record_completed_domain_update", domainUpdateTriggerV8),
  replaceTrigger("audits_record_completed_page_usage_insert", pageUsageInsertTriggerV8),
  replaceTrigger("audits_record_completed_page_usage_update", pageUsageUpdateTriggerV8),
] as const;

const migration9Up = [
  `CREATE TABLE IF NOT EXISTS page_view_daily (
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0 CHECK(views >= 0),
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(day, path)
  );`,
  "CREATE INDEX IF NOT EXISTS page_view_daily_updated_idx ON page_view_daily(updated_at DESC);",
] as const;

const migration10Up = ["ALTER TABLE audits ADD COLUMN priority_urls_json TEXT;"] as const;

export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = Object.freeze([
  { version: 6, name: "known-v6-baseline", up: [bootstrapV6Sql] },
  { version: 7, name: "audit-domain-locks-and-page-usage", up: migration7Up },
  { version: 8, name: "admin-entity-metadata", up: migration8Up },
  { version: 9, name: "daily-page-views", up: migration9Up },
  { version: 10, name: "audit-priority-urls", up: migration10Up },
]);

export const LATEST_SCHEMA_VERSION = DATABASE_MIGRATIONS.at(-1)?.version ?? MIN_SUPPORTED_SCHEMA_VERSION;

export class DatabaseMigrationError extends Error {
  constructor(
    readonly code: "UNVERSIONED_SCHEMA" | "SCHEMA_VERSION_UNSUPPORTED" | "SCHEMA_VERSION_FUTURE" | "SCHEMA_VERSION_GAP" | "SCHEMA_DRIFT",
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "DatabaseMigrationError";
  }
}

export function migrateSqliteDatabase(database: Database.Database): MigrationResult {
  const run = database.transaction(() => {
    const state = readSqliteMigrationState(database);
    const fromVersion = validateMigrationState(state);
    const pending = DATABASE_MIGRATIONS.filter((migration) => migration.version > fromVersion);

    for (const migration of pending) {
      for (const sql of migration.up) database.exec(sql);
      database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)").run(migration.version, Date.now());
    }

    assertSqliteSchemaCurrent(database);
    return {
      fromVersion,
      currentVersion: LATEST_SCHEMA_VERSION,
      appliedVersions: pending.map((migration) => migration.version),
    };
  });
  return run.immediate();
}

export async function migrateLibsqlDatabase(client: Pick<Client, "transaction">): Promise<MigrationResult> {
  const transaction = await client.transaction("write");
  try {
    const state = await readLibsqlMigrationState(transaction);
    const fromVersion = validateMigrationState(state);
    const pending = DATABASE_MIGRATIONS.filter((migration) => migration.version > fromVersion);

    for (const migration of pending) {
      for (const sql of migration.up) await transaction.executeMultiple(sql);
      await transaction.execute({
        sql: "INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)",
        args: [migration.version, Date.now()],
      });
    }

    await assertLibsqlSchemaCurrent(transaction);
    await transaction.commit();
    return {
      fromVersion,
      currentVersion: LATEST_SCHEMA_VERSION,
      appliedVersions: pending.map((migration) => migration.version),
    };
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  } finally {
    transaction.close();
  }
}

type MigrationState = {
  readonly hasJournal: boolean;
  readonly userTables: readonly string[];
  readonly versions: readonly number[];
};

function readSqliteMigrationState(database: Database.Database): MigrationState {
  const userTables = database.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
  const hasJournal = userTables.includes("schema_migrations");
  const versions = hasJournal
    ? database.prepare("SELECT version FROM schema_migrations ORDER BY version").pluck().all().map(Number)
    : [];
  return { hasJournal, userTables, versions };
}

async function readLibsqlMigrationState(connection: Pick<Transaction, "execute">): Promise<MigrationState> {
  const tableResult = await connection.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const userTables = tableResult.rows.map((row) => String(row.name));
  const hasJournal = userTables.includes("schema_migrations");
  const versions = hasJournal
    ? (await connection.execute("SELECT version FROM schema_migrations ORDER BY version")).rows.map((row) => Number(row.version))
    : [];
  return { hasJournal, userTables, versions };
}

function validateMigrationState(state: MigrationState): number {
  if (!state.hasJournal) {
    if (state.userTables.length > 0) {
      throw new DatabaseMigrationError("UNVERSIONED_SCHEMA", `found tables without schema_migrations: ${state.userTables.join(", ")}`);
    }
    return 0;
  }
  if (state.versions.length === 0) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_UNSUPPORTED", "schema_migrations is empty");
  }
  if (state.versions.some((version) => !Number.isSafeInteger(version) || version < 1)) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_GAP", "journal contains an invalid version");
  }

  const current = state.versions.at(-1) ?? 0;
  if (current > LATEST_SCHEMA_VERSION) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_FUTURE", `database is v${current}, runtime supports v${LATEST_SCHEMA_VERSION}`);
  }
  if (current < MIN_SUPPORTED_SCHEMA_VERSION) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_UNSUPPORTED", `database is v${current}, oldest supported version is v${MIN_SUPPORTED_SCHEMA_VERSION}`);
  }

  const historical = state.versions.filter((version) => version < MIN_SUPPORTED_SCHEMA_VERSION);
  const acceptedHistorical = Array.from({ length: MIN_SUPPORTED_SCHEMA_VERSION - 1 }, (_, index) => index + 1);
  if (historical.length > 0 && !sameNumbers(historical, acceptedHistorical)) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_GAP", `legacy journal prefix is ${historical.join(",")}`);
  }
  const supported = state.versions.filter((version) => version >= MIN_SUPPORTED_SCHEMA_VERSION);
  const expected = Array.from({ length: current - MIN_SUPPORTED_SCHEMA_VERSION + 1 }, (_, index) => MIN_SUPPORTED_SCHEMA_VERSION + index);
  if (!sameNumbers(supported, expected)) {
    throw new DatabaseMigrationError("SCHEMA_VERSION_GAP", `expected ${expected.join(",")}, found ${supported.join(",")}`);
  }
  return current;
}

const requiredTableColumns: Readonly<Record<string, readonly string[]>> = {
  audits: ["id", "public_token", "original_url", "normalized_domain", "locale", "name", "contact", "contact_type", "status", "created_at", "started_at", "completed_at", "pages_discovered", "pages_checked", "page_limit", "overall_score", "grade", "partial", "error_summary", "ip_hash", "user_agent_hash", "source", "utm_json", "public_result_json", "full_result_json", "consent_version", "updated_at", "priority_urls_json"],
  audit_pages: ["id", "audit_id", "url", "status_code", "depth", "data_json", "created_at"],
  audit_issues: ["id", "audit_id", "code", "category", "severity", "url", "evidence", "recommendation", "created_at"],
  audit_events: ["id", "audit_id", "event", "payload_json", "created_at"],
  leads: ["id", "name", "contact", "contact_type", "target", "service", "comment", "status", "locale", "source", "page_url", "utm_json", "consent_version", "ip_hash", "created_at"],
  calculator_requests: ["id", "lead_id", "kind", "answers_json", "min_price", "max_price", "created_at"],
  brief_submissions: ["id", "name", "contact", "locale", "service", "answers_json", "status", "consent_version", "ip_hash", "created_at"],
  attachments: ["id", "brief_id", "storage_name", "original_name", "mime", "size", "created_at"],
  admin_notes: ["id", "entity_type", "entity_id", "note", "created_at"],
  admin_entity_metadata: ["entity_type", "entity_id", "qa_label", "offer_snapshot_json", "archived_at", "updated_at"],
  rate_limits: ["key", "window_start", "count", "updated_at"],
  notification_events: ["id", "entity_type", "entity_id", "channel", "status", "error", "created_at", "updated_at"],
  worker_state: ["name", "heartbeat_at", "metadata_json"],
  schema_migrations: ["version", "applied_at"],
  public_metrics: ["name", "value", "updated_at"],
  page_view_daily: ["day", "path", "views", "updated_at"],
  audit_usage: ["audit_id", "created_at"],
  audit_domain_locks: ["normalized_domain", "audit_id", "created_at"],
  completed_audit_domains: ["normalized_domain", "first_completed_at"],
};

const requiredIndexes: Readonly<Record<string, readonly string[]>> = {
  audits_domain_status_idx: ["normalized_domain", "status"],
  audits_created_idx: ["created_at"],
  audit_events_lookup_idx: ["audit_id", "id"],
  admin_entity_metadata_archive_idx: ["entity_type", "archived_at", "qa_label"],
  page_view_daily_updated_idx: ["updated_at"],
  audits_public_usage_idx: ["status", "completed_at", "normalized_domain"],
};

const requiredTriggers: Readonly<Record<string, string>> = {
  audits_record_completed_domain_insert: domainInsertTriggerV8,
  audits_record_completed_domain_update: domainUpdateTriggerV8,
  audits_record_completed_page_usage_insert: pageUsageInsertTriggerV8,
  audits_record_completed_page_usage_update: pageUsageUpdateTriggerV8,
};

export function assertSqliteSchemaCurrent(database: Database.Database): void {
  const issues: string[] = [];
  for (const [table, expected] of Object.entries(requiredTableColumns)) {
    const actual = database.prepare(`PRAGMA table_info(${table})`).all().map((row) => String((row as { name: unknown }).name));
    if (!sameStrings(actual, expected)) issues.push(`table ${table} columns`);
  }
  for (const [index, expected] of Object.entries(requiredIndexes)) {
    const exists = database.prepare("SELECT 1 FROM sqlite_schema WHERE type='index' AND name=?").get(index);
    const actual = exists
      ? database.prepare(`PRAGMA index_info(${index})`).all().map((row) => String((row as { name: unknown }).name))
      : [];
    if (!sameStrings(actual, expected)) issues.push(`index ${index}`);
  }
  for (const [trigger, expected] of Object.entries(requiredTriggers)) {
    const row = database.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=?").get(trigger) as { sql?: unknown } | undefined;
    if (!row?.sql || normalizeSql(String(row.sql)) !== normalizeSql(expected)) issues.push(`trigger ${trigger}`);
  }
  if (issues.length > 0) throw new DatabaseMigrationError("SCHEMA_DRIFT", issues.join("; "));
}

async function assertLibsqlSchemaCurrent(connection: Pick<Transaction, "execute">): Promise<void> {
  const issues: string[] = [];
  for (const [table, expected] of Object.entries(requiredTableColumns)) {
    const result = await connection.execute(`PRAGMA table_info(${table})`);
    const actual = result.rows.map((row) => String(row.name));
    if (!sameStrings(actual, expected)) issues.push(`table ${table} columns`);
  }
  for (const [index, expected] of Object.entries(requiredIndexes)) {
    const exists = await connection.execute({ sql: "SELECT 1 AS found FROM sqlite_schema WHERE type='index' AND name=?", args: [index] });
    const actual = exists.rows.length > 0
      ? (await connection.execute(`PRAGMA index_info(${index})`)).rows.map((row) => String(row.name))
      : [];
    if (!sameStrings(actual, expected)) issues.push(`index ${index}`);
  }
  for (const [trigger, expected] of Object.entries(requiredTriggers)) {
    const result = await connection.execute({ sql: "SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=?", args: [trigger] });
    const sql = result.rows[0]?.sql;
    if (typeof sql !== "string" || normalizeSql(sql) !== normalizeSql(expected)) issues.push(`trigger ${trigger}`);
  }
  if (issues.length > 0) throw new DatabaseMigrationError("SCHEMA_DRIFT", issues.join("; "));
}

function replaceTrigger(name: string, sql: string): string {
  return `DROP TRIGGER IF EXISTS ${name};\n${sql}`;
}

function addQaExclusion(sql: string): string {
  const marker = "BEGIN\n";
  return sql.replace(marker, `  AND NOT EXISTS (\n    SELECT 1 FROM admin_entity_metadata metadata\n    WHERE metadata.entity_type='audit' AND metadata.entity_id=NEW.id AND metadata.qa_label IS NOT NULL\n  )\n${marker}`);
}

function normalizeSql(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bif\s+not\s+exists\b/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/\s*;\s*$/u, "")
    .trim();
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
