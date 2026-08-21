import { randomBytes, randomUUID } from "node:crypto";
import { sqlite } from "./client";

export type AuditStatus = "queued" | "validating_target" | "connecting" | "checking_robots" | "checking_sitemaps" | "discovering_pages" | "crawling_pages" | "analyzing_structure" | "running_performance" | "calculating_score" | "completed" | "partial" | "failed";

export type AuditRow = {
  id: string; publicToken: string; originalUrl: string; normalizedDomain: string; locale: "ru" | "en";
  name: string; contact: string; contactType: string; status: AuditStatus; createdAt: number; startedAt: number | null;
  completedAt: number | null; pagesDiscovered: number; pagesChecked: number; pageLimit: number; overallScore: number | null;
  grade: string | null; partial: number; errorSummary: string | null; publicResultJson: string | null; fullResultJson: string | null;
};

const auditSelect = `SELECT id, public_token AS publicToken, original_url AS originalUrl, normalized_domain AS normalizedDomain,
 locale, name, contact, contact_type AS contactType, status, created_at AS createdAt, started_at AS startedAt,
 completed_at AS completedAt, pages_discovered AS pagesDiscovered, pages_checked AS pagesChecked, page_limit AS pageLimit,
 overall_score AS overallScore, grade, partial, error_summary AS errorSummary, public_result_json AS publicResultJson,
 full_result_json AS fullResultJson FROM audits`;

export function createAuditRecord(input: {
  originalUrl: string; normalizedDomain: string; locale: "ru" | "en"; name: string; contact: string; contactType: string;
  ipHash: string; userAgentHash: string; source: string; pageLimit?: number; utm?: Record<string, string>; consentVersion: string;
  cached?: { publicResultJson: string; fullResultJson: string; overallScore: number; grade: string; pagesDiscovered: number; pagesChecked: number; partial: boolean };
}): AuditRow {
  const id = randomUUID();
  const publicToken = randomBytes(32).toString("base64url");
  const now = Date.now();
  const cached = input.cached;
  const status = cached ? (cached.partial ? "partial" : "completed") : "queued";
  sqlite.prepare(`INSERT INTO audits(id, public_token, original_url, normalized_domain, locale, name, contact, contact_type, status,
    created_at, started_at, completed_at, pages_discovered, pages_checked, page_limit, overall_score, grade, partial, ip_hash,
    user_agent_hash, source, utm_json, public_result_json, full_result_json, consent_version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, publicToken, input.originalUrl, input.normalizedDomain, input.locale, input.name, input.contact, input.contactType, status,
      now, cached ? now : null, cached ? now : null, cached?.pagesDiscovered ?? 0, cached?.pagesChecked ?? 0,
      auditPageLimit(input.pageLimit), cached?.overallScore ?? null, cached?.grade ?? null, cached?.partial ? 1 : 0,
      input.ipHash, input.userAgentHash, input.source, JSON.stringify(input.utm ?? {}), cached?.publicResultJson ?? null,
      cached?.fullResultJson ?? null, input.consentVersion, now);
  appendAuditEvent(id, status, cached ? { cached: true, pagesChecked: cached.pagesChecked } : { queued: true });
  return getAuditByToken(publicToken)!;
}

function auditPageLimit(value: number | undefined): number {
  return Math.max(1, Math.min(100, Math.floor(value ?? 100)));
}

export function findRecentCompletedAudit(domain: string, maxAgeMs: number): AuditRow | null {
  return (sqlite.prepare(`${auditSelect} WHERE normalized_domain=? AND status IN ('completed','partial') AND completed_at>=? AND full_result_json IS NOT NULL ORDER BY completed_at DESC LIMIT 1`)
    .get(domain, Date.now() - maxAgeMs) as AuditRow | undefined) ?? null;
}

export function hasActiveDomainAudit(domain: string): boolean {
  const found = sqlite.prepare("SELECT 1 FROM audits WHERE normalized_domain=? AND status NOT IN ('completed','partial','failed') LIMIT 1").get(domain);
  return Boolean(found);
}

export function getAuditByToken(token: string): AuditRow | null {
  return (sqlite.prepare(`${auditSelect} WHERE public_token=? LIMIT 1`).get(token) as AuditRow | undefined) ?? null;
}

export function getAuditById(id: string): AuditRow | null {
  return (sqlite.prepare(`${auditSelect} WHERE id=? LIMIT 1`).get(id) as AuditRow | undefined) ?? null;
}

export function listAudits(input: { search?: string; status?: string; from?: number; to?: number; limit?: number } = {}): AuditRow[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (input.search) { clauses.push("(normalized_domain LIKE ? OR contact LIKE ?)"); params.push(`%${input.search}%`, `%${input.search}%`); }
  if (input.status) { clauses.push("status=?"); params.push(input.status); }
  if (input.from !== undefined) { clauses.push("created_at>=?"); params.push(input.from); }
  if (input.to !== undefined) { clauses.push("created_at<=?"); params.push(input.to); }
  params.push(Math.min(200, input.limit ?? 100));
  return sqlite.prepare(`${auditSelect}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT ?`).all(...params) as AuditRow[];
}

export function acquireNextAudit(): AuditRow | null {
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const row = sqlite.prepare(`${auditSelect} WHERE status='queued' ORDER BY created_at ASC LIMIT 1`).get() as AuditRow | undefined;
    if (!row) { sqlite.exec("COMMIT"); return null; }
    const now = Date.now();
    const changed = sqlite.prepare("UPDATE audits SET status='validating_target', started_at=?, updated_at=? WHERE id=? AND status='queued'").run(now, now, row.id);
    sqlite.exec("COMMIT");
    if (!changed.changes) return null;
    appendAuditEvent(row.id, "validating_target", {});
    return getAuditById(row.id);
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

export function appendAuditEvent(auditId: string, event: string, payload: Record<string, unknown>): void {
  sqlite.prepare("INSERT INTO audit_events(audit_id, event, payload_json, created_at) VALUES (?, ?, ?, ?)").run(auditId, event, JSON.stringify(payload), Date.now());
  sqlite.prepare("UPDATE audits SET status=?, pages_checked=COALESCE(?,pages_checked), pages_discovered=COALESCE(?,pages_discovered), updated_at=? WHERE id=?")
    .run(event, typeof payload.pagesChecked === "number" ? payload.pagesChecked : null, typeof payload.pagesDiscovered === "number" ? payload.pagesDiscovered : null, Date.now(), auditId);
}

export function getAuditEvents(auditId: string, after = 0) {
  return sqlite.prepare("SELECT id, event, payload_json AS payloadJson, created_at AS createdAt FROM audit_events WHERE audit_id=? AND id>? ORDER BY id ASC LIMIT 500").all(auditId, after) as { id: number; event: string; payloadJson: string; createdAt: number }[];
}

export function completeAuditRecord(auditId: string, result: {
  publicResult: Record<string, unknown>; fullResult: Record<string, unknown>; score: number; grade: string;
  partial: boolean; pagesDiscovered: number; pagesChecked: number; pages?: Array<Record<string, unknown>>; issues?: Array<Record<string, unknown>>;
}): void {
  const status = result.partial ? "partial" : "completed";
  const now = Date.now();
  const transaction = sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM audit_pages WHERE audit_id=?").run(auditId);
    sqlite.prepare("DELETE FROM audit_issues WHERE audit_id=?").run(auditId);
    const insertPage = sqlite.prepare("INSERT INTO audit_pages(id,audit_id,url,status_code,depth,data_json,created_at) VALUES (?,?,?,?,?,?,?)");
    for (const page of result.pages ?? []) insertPage.run(randomUUID(), auditId, String(page.url ?? ""), Number(page.status ?? 0) || null, Number(page.depth ?? 0), JSON.stringify(page), now);
    const insertIssue = sqlite.prepare("INSERT INTO audit_issues(id,audit_id,code,category,severity,url,evidence,recommendation,created_at) VALUES (?,?,?,?,?,?,?,?,?)");
    for (const issue of result.issues ?? []) insertIssue.run(randomUUID(), auditId, String(issue.code ?? "unknown"), String(issue.category ?? "other"), String(issue.severity ?? "medium"), issue.url ? String(issue.url) : null, issue.evidence ? String(issue.evidence).slice(0, 2000) : null, issue.recommendation ? String(issue.recommendation).slice(0, 2000) : null, now);
    sqlite.prepare(`UPDATE audits SET status=?, completed_at=?, pages_discovered=?, pages_checked=?, overall_score=?, grade=?, partial=?,
      public_result_json=?, full_result_json=?, updated_at=? WHERE id=?`)
      .run(status, now, result.pagesDiscovered, result.pagesChecked, result.score, result.grade, result.partial ? 1 : 0,
        JSON.stringify(result.publicResult), JSON.stringify(result.fullResult), now, auditId);
    sqlite.prepare("INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?,?,?,?)")
      .run(auditId, status, JSON.stringify({ pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered, score: result.score }), now);
  });
  transaction();
}

export function failAuditRecord(auditId: string, summary: string, partialResult?: Parameters<typeof completeAuditRecord>[1]): void {
  if (partialResult?.pagesChecked) { completeAuditRecord(auditId, { ...partialResult, partial: true }); return; }
  const now = Date.now();
  sqlite.prepare("UPDATE audits SET status='failed', error_summary=?, completed_at=?, updated_at=? WHERE id=?").run(summary.slice(0, 500), now, now, auditId);
  sqlite.prepare("INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?,?,?,?)").run(auditId, "failed", JSON.stringify({ code: "audit_failed" }), now);
}

export function deleteAudit(id: string): void {
  sqlite.prepare("DELETE FROM audit_events WHERE audit_id=?").run(id);
  sqlite.prepare("DELETE FROM audit_pages WHERE audit_id=?").run(id);
  sqlite.prepare("DELETE FROM audit_issues WHERE audit_id=?").run(id);
  sqlite.prepare("DELETE FROM audits WHERE id=?").run(id);
}

export function purgeExpiredAudits(retentionDays: number): number {
  const days = Number.isFinite(retentionDays) ? Math.max(90, Math.min(3_650, Math.floor(retentionDays))) : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1_000;
  const rows = sqlite.prepare(`SELECT id FROM audits
    WHERE status IN ('completed','partial','failed') AND completed_at IS NOT NULL AND completed_at<?
    ORDER BY completed_at ASC LIMIT 500`).all(cutoff) as { id: string }[];
  if (!rows.length) return 0;
  return sqlite.transaction(() => {
    for (const { id } of rows) {
      sqlite.prepare("DELETE FROM admin_notes WHERE entity_type='audit' AND entity_id=?").run(id);
      sqlite.prepare("DELETE FROM notification_events WHERE entity_type='audit' AND entity_id=?").run(id);
      deleteAudit(id);
    }
    return rows.length;
  })();
}

export function heartbeatWorker(metadata: Record<string, unknown> = {}): void {
  sqlite.prepare("INSERT INTO worker_state(name,heartbeat_at,metadata_json) VALUES ('audit-worker',?,?) ON CONFLICT(name) DO UPDATE SET heartbeat_at=excluded.heartbeat_at,metadata_json=excluded.metadata_json")
    .run(Date.now(), JSON.stringify(metadata));
}

export function queueStats() {
  const counts = sqlite.prepare("SELECT status, COUNT(*) AS count FROM audits GROUP BY status").all() as { status: string; count: number }[];
  const heartbeat = sqlite.prepare("SELECT heartbeat_at AS heartbeatAt, metadata_json AS metadataJson FROM worker_state WHERE name='audit-worker'").get() as { heartbeatAt: number; metadataJson: string } | undefined;
  return { counts, heartbeat: heartbeat ?? null };
}
