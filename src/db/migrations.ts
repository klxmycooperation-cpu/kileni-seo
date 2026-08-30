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
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notification_events (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS worker_state (name TEXT PRIMARY KEY, heartbeat_at INTEGER NOT NULL, metadata_json TEXT);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS public_metrics (name TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value >= 0), updated_at INTEGER NOT NULL);
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
GROUP BY lower(trim(normalized_domain));
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
INSERT OR IGNORE INTO public_metrics(name, value, updated_at)
VALUES ('free_audit_pages', 0, unixepoch('now') * 1000);
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
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (3, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (4, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (5, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (6, unixepoch('now') * 1000);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (7, unixepoch('now') * 1000);
`;
