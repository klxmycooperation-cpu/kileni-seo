import { randomBytes, randomUUID } from "node:crypto";

import type { Transaction } from "@libsql/client";

import { database } from "./client";

export type AuditStatus = "queued" | "validating_target" | "connecting" | "checking_robots" | "checking_sitemaps" | "discovering_pages" | "crawling_pages" | "analyzing_structure" | "running_performance" | "calculating_score" | "completed" | "partial" | "failed";

export type AuditRow = {
  id: string; publicToken: string; originalUrl: string; normalizedDomain: string; locale: "ru" | "en";
  name: string; contact: string; contactType: string; status: AuditStatus; createdAt: number; startedAt: number | null;
  completedAt: number | null; pagesDiscovered: number; pagesChecked: number; pageLimit: number; overallScore: number | null;
  grade: string | null; partial: number; errorSummary: string | null; consentVersion: string; publicResultJson: string | null; fullResultJson: string | null;
};

type SqlValue = string | number | null;
type QueryConnection = Pick<Transaction, "execute"> | Pick<typeof database, "execute">;

export type CachedAudit = {
  publicResultJson: string;
  fullResultJson: string;
  overallScore: number;
  grade: string;
  pagesDiscovered: number;
  pagesChecked: number;
  partial: boolean;
};

export type CreateAuditInput = {
  originalUrl: string; normalizedDomain: string; locale: "ru" | "en"; name: string; contact: string; contactType: string;
  ipHash: string; userAgentHash: string; source: string; pageLimit?: number; utm?: Record<string, string>; consentVersion: string;
  cached?: CachedAudit;
};

const auditSelect = `SELECT id, public_token AS publicToken, original_url AS originalUrl, normalized_domain AS normalizedDomain,
 locale, name, contact, contact_type AS contactType, status, created_at AS createdAt, started_at AS startedAt,
 completed_at AS completedAt, pages_discovered AS pagesDiscovered, pages_checked AS pagesChecked, page_limit AS pageLimit,
 overall_score AS overallScore, grade, partial, error_summary AS errorSummary, consent_version AS consentVersion, public_result_json AS publicResultJson,
 full_result_json AS fullResultJson FROM audits`;

async function query(connection: QueryConnection, sql: string, args: SqlValue[] = []) {
  return connection.execute({ sql, args });
}

async function one<T>(connection: QueryConnection, sql: string, args: SqlValue[] = []): Promise<T | null> {
  const result = await query(connection, sql, args);
  return (result.rows[0] as unknown as T | undefined) ?? null;
}

async function many<T>(connection: QueryConnection, sql: string, args: SqlValue[] = []): Promise<T[]> {
  const result = await query(connection, sql, args);
  return result.rows as unknown as T[];
}

async function createAuditRecordOn(connection: QueryConnection, input: CreateAuditInput, id = randomUUID()): Promise<AuditRow> {
  const publicToken = randomBytes(32).toString("base64url");
  const now = Date.now();
  const cached = input.cached;
  const source = cached ? `${input.source}:cached` : input.source;
  const status = cached ? (cached.partial ? "partial" : "completed") : "queued";

  await query(connection, `INSERT INTO audits(id, public_token, original_url, normalized_domain, locale, name, contact, contact_type, status,
      created_at, started_at, completed_at, pages_discovered, pages_checked, page_limit, overall_score, grade, partial, ip_hash,
      user_agent_hash, source, utm_json, public_result_json, full_result_json, consent_version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, publicToken, input.originalUrl, input.normalizedDomain, input.locale, input.name, input.contact, input.contactType, status,
      now, cached ? now : null, cached ? now : null, cached?.pagesDiscovered ?? 0, cached?.pagesChecked ?? 0,
      auditPageLimit(input.pageLimit), cached?.overallScore ?? null, cached?.grade ?? null, cached?.partial ? 1 : 0,
      input.ipHash, input.userAgentHash, source, JSON.stringify(input.utm ?? {}), cached?.publicResultJson ?? null,
      cached?.fullResultJson ?? null, input.consentVersion, now,
    ]);
  await appendAuditEventOn(connection, id, status, cached ? { cached: true, pagesChecked: cached.pagesChecked } : { queued: true });

  const created = await one<AuditRow>(connection, `${auditSelect} WHERE public_token=? LIMIT 1`, [publicToken]);
  if (!created) throw new Error("Созданный аудит не найден");
  return created;
}

export async function createAuditRecord(input: CreateAuditInput): Promise<AuditRow> {
  return database.transaction((transaction) => createAuditRecordOn(transaction, input));
}

function auditPageLimit(value: number | undefined): number {
  return Math.max(1, Math.min(100, Math.floor(value ?? 100)));
}

async function findRecentCompletedAuditOn(connection: QueryConnection, domain: string, maxAgeMs: number): Promise<AuditRow | null> {
  return one<AuditRow>(connection, `${auditSelect} WHERE normalized_domain=? AND status IN ('completed','partial') AND completed_at>=? AND full_result_json IS NOT NULL ORDER BY completed_at DESC LIMIT 1`, [domain, Date.now() - maxAgeMs]);
}

export async function findRecentCompletedAudit(domain: string, maxAgeMs: number): Promise<AuditRow | null> {
  return findRecentCompletedAuditOn(database, domain, maxAgeMs);
}

async function hasActiveDomainAuditOn(connection: QueryConnection, domain: string): Promise<boolean> {
  return Boolean(await one(connection, "SELECT 1 FROM audits WHERE normalized_domain=? AND status NOT IN ('completed','partial','failed') LIMIT 1", [domain]));
}

export async function hasActiveDomainAudit(domain: string): Promise<boolean> {
  return hasActiveDomainAuditOn(database, domain);
}

export type DomainAuditCreation = { audit: AuditRow; cached: boolean } | { conflict: true };

export async function createDomainAudit(input: CreateAuditInput, cacheMaxAgeMs: number, getCachedAudit: (audit: AuditRow) => CachedAudit | null): Promise<DomainAuditCreation> {
  return database.transaction(async (transaction) => {
    if (await hasActiveDomainAuditOn(transaction, input.normalizedDomain)) return { conflict: true };

    const recent = await findRecentCompletedAuditOn(transaction, input.normalizedDomain, cacheMaxAgeMs);
    const cached = recent ? getCachedAudit(recent) : null;
    if (cached) return { audit: await createAuditRecordOn(transaction, { ...input, cached }), cached: true };

    const id = randomUUID();
    const locked = await query(transaction, "INSERT OR IGNORE INTO audit_domain_locks(normalized_domain,audit_id,created_at) VALUES (?,?,?)", [input.normalizedDomain, id, Date.now()]);
    if (!locked.rowsAffected) return { conflict: true };

    return {
      audit: await createAuditRecordOn(transaction, input, id),
      cached: false,
    };
  });
}

export async function getAuditByToken(token: string): Promise<AuditRow | null> {
  return one<AuditRow>(database, `${auditSelect} WHERE public_token=? LIMIT 1`, [token]);
}

export async function getAuditById(id: string): Promise<AuditRow | null> {
  return one<AuditRow>(database, `${auditSelect} WHERE id=? LIMIT 1`, [id]);
}

export async function listAudits(input: { search?: string; status?: string; from?: number; to?: number; limit?: number } = {}): Promise<AuditRow[]> {
  const clauses: string[] = [];
  const params: SqlValue[] = [];
  if (input.search) { clauses.push("(normalized_domain LIKE ? OR contact LIKE ?)"); params.push(`%${input.search}%`, `%${input.search}%`); }
  if (input.status) { clauses.push("status=?"); params.push(input.status); }
  if (input.from !== undefined) { clauses.push("created_at>=?"); params.push(input.from); }
  if (input.to !== undefined) { clauses.push("created_at<=?"); params.push(input.to); }
  params.push(Math.min(200, input.limit ?? 100));
  return many<AuditRow>(database, `${auditSelect}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT ?`, params);
}

export async function acquireNextAudit(): Promise<AuditRow | null> {
  return database.transaction(async (transaction) => {
    const row = await one<AuditRow>(transaction, `${auditSelect} WHERE status='queued' ORDER BY created_at ASC LIMIT 1`);
    if (!row) return null;
    const now = Date.now();
    const changed = await query(transaction, "UPDATE audits SET status='validating_target', started_at=?, updated_at=? WHERE id=? AND status='queued'", [now, now, row.id]);
    if (!changed.rowsAffected) return null;
    await appendAuditEventOn(transaction, row.id, "validating_target", {});
    return { ...row, status: "validating_target", startedAt: now };
  });
}

async function appendAuditEventOn(connection: QueryConnection, auditId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  const now = Date.now();
  await query(connection, "INSERT INTO audit_events(audit_id, event, payload_json, created_at) VALUES (?, ?, ?, ?)", [auditId, event, JSON.stringify(payload), now]);
  await query(connection, "UPDATE audits SET status=?, pages_checked=COALESCE(?,pages_checked), pages_discovered=COALESCE(?,pages_discovered), updated_at=? WHERE id=?", [
    event,
    typeof payload.pagesChecked === "number" ? payload.pagesChecked : null,
    typeof payload.pagesDiscovered === "number" ? payload.pagesDiscovered : null,
    now,
    auditId,
  ]);
}

export async function appendAuditEvent(auditId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  await database.transaction((transaction) => appendAuditEventOn(transaction, auditId, event, payload));
}

export async function getAuditEvents(auditId: string, after = 0): Promise<Array<{ id: number; event: string; payloadJson: string; createdAt: number }>> {
  return many(database, "SELECT id, event, payload_json AS payloadJson, created_at AS createdAt FROM audit_events WHERE audit_id=? AND id>? ORDER BY id ASC LIMIT 500", [auditId, after]);
}

export async function completeAuditRecord(auditId: string, result: {
  publicResult: Record<string, unknown>; fullResult: Record<string, unknown>; score: number; grade: string;
  partial: boolean; pagesDiscovered: number; pagesChecked: number; pages?: Array<Record<string, unknown>>; issues?: Array<Record<string, unknown>>;
}): Promise<void> {
  const status = result.partial ? "partial" : "completed";
  const now = Date.now();
  await database.transaction(async (transaction) => {
    await query(transaction, "DELETE FROM audit_pages WHERE audit_id=?", [auditId]);
    await query(transaction, "DELETE FROM audit_issues WHERE audit_id=?", [auditId]);
    for (const page of result.pages ?? []) {
      await query(transaction, "INSERT INTO audit_pages(id,audit_id,url,status_code,depth,data_json,created_at) VALUES (?,?,?,?,?,?,?)", [
        randomUUID(), auditId, String(page.url ?? ""), Number(page.status ?? 0) || null, Number(page.depth ?? 0), JSON.stringify(page), now,
      ]);
    }
    for (const issue of result.issues ?? []) {
      await query(transaction, "INSERT INTO audit_issues(id,audit_id,code,category,severity,url,evidence,recommendation,created_at) VALUES (?,?,?,?,?,?,?,?,?)", [
        randomUUID(), auditId, String(issue.code ?? "unknown"), String(issue.category ?? "other"), String(issue.severity ?? "medium"), issue.url ? String(issue.url) : null,
        issue.evidence ? String(issue.evidence).slice(0, 2000) : null, issue.recommendation ? String(issue.recommendation).slice(0, 2000) : null, now,
      ]);
    }
    await query(transaction, `UPDATE audits SET status=?, completed_at=?, pages_discovered=?, pages_checked=?, overall_score=?, grade=?, partial=?,
      public_result_json=?, full_result_json=?, updated_at=? WHERE id=?`, [
      status, now, result.pagesDiscovered, result.pagesChecked, result.score, result.grade, result.partial ? 1 : 0,
      JSON.stringify(result.publicResult), JSON.stringify(result.fullResult), now, auditId,
    ]);
    await query(transaction, "INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?,?,?,?)", [
      auditId, status, JSON.stringify({ pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered, score: result.score }), now,
    ]);
    await query(transaction, "DELETE FROM audit_domain_locks WHERE audit_id=?", [auditId]);
  });
}

export async function failAuditRecord(auditId: string, summary: string, partialResult?: Parameters<typeof completeAuditRecord>[1]): Promise<void> {
  if (partialResult?.pagesChecked) {
    await completeAuditRecord(auditId, { ...partialResult, partial: true });
    return;
  }
  const now = Date.now();
  await database.transaction(async (transaction) => {
    await query(transaction, "UPDATE audits SET status='failed', error_summary=?, completed_at=?, updated_at=? WHERE id=?", [summary.slice(0, 500), now, now, auditId]);
    await query(transaction, "INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?,?,?,?)", [auditId, "failed", JSON.stringify({ code: "audit_failed" }), now]);
    await query(transaction, "DELETE FROM audit_domain_locks WHERE audit_id=?", [auditId]);
  });
}

async function deleteAuditOn(connection: QueryConnection, id: string): Promise<void> {
  await query(connection, "DELETE FROM audit_domain_locks WHERE audit_id=?", [id]);
  await query(connection, "DELETE FROM audit_events WHERE audit_id=?", [id]);
  await query(connection, "DELETE FROM audit_pages WHERE audit_id=?", [id]);
  await query(connection, "DELETE FROM audit_issues WHERE audit_id=?", [id]);
  await query(connection, "DELETE FROM audits WHERE id=?", [id]);
}

export async function deleteAudit(id: string): Promise<void> {
  await database.transaction((transaction) => deleteAuditOn(transaction, id));
}

export async function purgeExpiredAudits(retentionDays: number): Promise<number> {
  const days = Number.isFinite(retentionDays) ? Math.max(90, Math.min(3_650, Math.floor(retentionDays))) : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1_000;
  const rows = await many<{ id: string }>(database, `SELECT id FROM audits
    WHERE status IN ('completed','partial','failed') AND completed_at IS NOT NULL AND completed_at<?
    ORDER BY completed_at ASC LIMIT 500`, [cutoff]);
  if (!rows.length) return 0;
  await database.transaction(async (transaction) => {
    for (const { id } of rows) {
      await query(transaction, "DELETE FROM admin_notes WHERE entity_type='audit' AND entity_id=?", [id]);
      await query(transaction, "DELETE FROM notification_events WHERE entity_type='audit' AND entity_id=?", [id]);
      await deleteAuditOn(transaction, id);
    }
  });
  return rows.length;
}

export async function failStaleAudits(staleAfterMs: number, now = Date.now()): Promise<number> {
  const age = Number.isFinite(staleAfterMs) ? Math.max(5 * 60 * 1_000, Math.floor(staleAfterMs)) : 15 * 60 * 1_000;
  const cutoff = now - age;
  const rows = await many<{ id: string }>(database, `SELECT id FROM audits
    WHERE status NOT IN ('completed','partial','failed') AND updated_at<?
    ORDER BY updated_at ASC LIMIT 100`, [cutoff]);
  if (!rows.length) return 0;
  await database.transaction(async (transaction) => {
    for (const { id } of rows) {
      const changed = await query(transaction, `UPDATE audits
        SET status='failed', error_summary='Audit stopped before completion', completed_at=?, updated_at=?
        WHERE id=? AND status NOT IN ('completed','partial','failed') AND updated_at<?`, [now, now, id, cutoff]);
      if (!changed.rowsAffected) continue;
      await query(transaction, "INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?,?,?,?)", [
        id,
        "failed",
        JSON.stringify({ code: "stale_audit_recovered" }),
        now,
      ]);
      await query(transaction, "DELETE FROM audit_domain_locks WHERE audit_id=?", [id]);
    }
  });
  return rows.length;
}

export async function heartbeatWorker(metadata: Record<string, unknown> = {}): Promise<void> {
  await query(database, "INSERT INTO worker_state(name,heartbeat_at,metadata_json) VALUES ('audit-worker',?,?) ON CONFLICT(name) DO UPDATE SET heartbeat_at=excluded.heartbeat_at,metadata_json=excluded.metadata_json", [Date.now(), JSON.stringify(metadata)]);
}

export async function queueStats(): Promise<{ counts: Array<{ status: string; count: number }>; heartbeat: { heartbeatAt: number; metadataJson: string } | null }> {
  const [counts, heartbeat] = await Promise.all([
    many<{ status: string; count: number }>(database, "SELECT status, COUNT(*) AS count FROM audits GROUP BY status"),
    one<{ heartbeatAt: number; metadataJson: string }>(database, "SELECT heartbeat_at AS heartbeatAt, metadata_json AS metadataJson FROM worker_state WHERE name='audit-worker'"),
  ]);
  return { counts, heartbeat };
}
