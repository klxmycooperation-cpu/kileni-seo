import { randomUUID } from "node:crypto";

import type { AuditEvent, FullAuditResult } from "../src/lib/audit/index";
import { gradeForScore, interpretationForGrade, runAudit, scoreAudit, toPublicAuditResult } from "../src/lib/audit/index";
import { sqlite } from "../src/db/client";
import { acquireNextAudit, appendAuditEvent, completeAuditRecord, failAuditRecord, heartbeatWorker, purgeExpiredAudits, type AuditRow, type AuditStatus } from "../src/db/queries";
import { sendEmail } from "../src/lib/notifications/email";
import { notifyTelegram } from "../src/lib/notifications/telegram";
import { runMobileLighthouse } from "../src/lib/performance/lighthouse";

const pollIntervalMs = positiveNumber(process.env.WORKER_POLL_MS ?? process.env.WORKER_POLL_INTERVAL_MS, 1_500);
const auditTimeoutMs = Math.min(420_000, positiveNumber(process.env.AUDIT_TIMEOUT_MS, 420_000));
const pageLimit = Math.min(100, positiveNumber(process.env.AUDIT_PAGE_LIMIT, 100));
const retentionDays = Math.max(90, Math.min(3_650, positiveNumber(process.env.AUDIT_RESULT_RETENTION_DAYS, 90)));
const shutdown = new AbortController();

process.once("SIGTERM", () => shutdown.abort("SIGTERM"));
process.once("SIGINT", () => shutdown.abort("SIGINT"));

await runWorker();

async function runWorker(): Promise<void> {
  log("worker_started", { pollIntervalMs, pageLimit });
  let lastHeartbeat = 0;
  let lastRetentionCheck = 0;
  while (!shutdown.signal.aborted) {
    if (Date.now() - lastRetentionCheck >= 24 * 60 * 60 * 1_000) {
      const purged = purgeExpiredAudits(retentionDays);
      log("retention_check", { retentionDays, purged });
      lastRetentionCheck = Date.now();
    }
    if (Date.now() - lastHeartbeat >= 10_000) {
      heartbeatWorker({ pid: process.pid, state: "idle" });
      lastHeartbeat = Date.now();
    }
    const audit = acquireNextAudit();
    if (!audit) {
      await wait(pollIntervalMs, shutdown.signal);
      continue;
    }
    heartbeatWorker({ pid: process.pid, state: "working", auditId: audit.id });
    await processAudit(audit);
    lastHeartbeat = 0;
  }
  heartbeatWorker({ pid: process.pid, state: "stopped" });
  sqlite.close();
  log("worker_stopped", {});
}

async function processAudit(audit: AuditRow): Promise<void> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("AUDIT_TIMEOUT"), auditTimeoutMs);
  const stopListener = () => controller.abort("WORKER_SHUTDOWN");
  shutdown.signal.addEventListener("abort", stopListener, { once: true });
  let stage: AuditStatus = "validating_target";
  const transition = (next: AuditStatus, payload: Record<string, unknown> = {}) => {
    if (stage === next) {
      appendAuditEvent(audit.id, next, payload);
      return;
    }
    stage = next;
    appendAuditEvent(audit.id, next, payload);
    heartbeatWorker({ pid: process.pid, state: "working", auditId: audit.id, stage: next });
    log("audit_stage", { auditId: audit.id, stage: next, ...safeProgress(payload) });
  };

  try {
    log("audit_started", { auditId: audit.id });
    const initial = await runAudit(audit.originalUrl, {
      maxPages: Math.min(pageLimit, audit.pageLimit),
      concurrency: 4,
      signal: controller.signal,
      performance: null,
      onEvent: (event) => handleAuditEvent(event, transition),
    });

    transition("analyzing_structure", { pagesChecked: initial.pagesChecked, pagesDiscovered: initial.pagesDiscovered });
    transition("running_performance", { pagesChecked: initial.pagesChecked, pagesDiscovered: initial.pagesDiscovered });
    const lighthouse = controller.signal.aborted
      ? { performance: null, pagesAttempted: 0, pagesChecked: 0 }
      : await runMobileLighthouse(initial.pages.map((page) => page.url).slice(0, 3), { signal: controller.signal });

    transition("calculating_score", { pagesChecked: initial.pagesChecked, pagesDiscovered: initial.pagesDiscovered });
    const result = rescore(initial, lighthouse.performance, controller.signal.aborted || lighthouse.pagesChecked < lighthouse.pagesAttempted);
    const publicResult = toPublicAuditResult(result, audit.locale);
    completeAuditRecord(audit.id, {
      publicResult: publicResult as unknown as Record<string, unknown>,
      fullResult: result as unknown as Record<string, unknown>,
      score: result.score.total,
      grade: result.grade,
      partial: result.partial,
      pagesDiscovered: result.pagesDiscovered,
      pagesChecked: result.pagesChecked,
      pages: result.pages.map((page) => ({ ...page, depth: page.transport?.depth ?? 0 } as unknown as Record<string, unknown>)),
      issues: result.issues.map((issue) => ({ ...issue, evidence: issue.description } as unknown as Record<string, unknown>)),
    });
    await sendCompletionNotifications(audit, result);
    log("audit_completed", {
      auditId: audit.id,
      durationMs: Date.now() - started,
      pagesChecked: result.pagesChecked,
      pagesDiscovered: result.pagesDiscovered,
      score: result.score.total,
      partial: result.partial,
      lighthousePages: lighthouse.pagesChecked,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted && controller.signal.reason === "AUDIT_TIMEOUT";
    const summary = timedOut ? "Audit time limit exceeded" : error instanceof Error ? error.message : "Audit failed";
    failAuditRecord(audit.id, summary);
    log("audit_failed", { auditId: audit.id, stage, durationMs: Date.now() - started, reason: timedOut ? "timeout" : errorName(error) });
  } finally {
    clearTimeout(timeout);
    shutdown.signal.removeEventListener("abort", stopListener);
  }
}

function handleAuditEvent(event: AuditEvent, transition: (status: AuditStatus, payload?: Record<string, unknown>) => void): void {
  switch (event.type) {
    case "audit:start": transition("connecting"); break;
    case "discovery:start": transition("checking_robots"); break;
    case "discovery:robots_complete": transition("checking_sitemaps"); break;
    case "discovery:sitemaps_complete": transition("discovering_pages"); break;
    case "discovery:complete": break;
    case "crawl:page": transition("crawling_pages", { pagesChecked: event.pagesChecked, pagesDiscovered: event.pagesDiscovered }); break;
    case "crawl:progress": transition("crawling_pages", { pagesChecked: event.pagesChecked, pagesDiscovered: event.pagesDiscovered, queued: event.queued, limit: event.limit }); break;
    case "warning": log("audit_warning", { code: event.code }); break;
    case "audit:complete": break;
  }
}

function rescore(initial: FullAuditResult, performance: FullAuditResult["performance"], forcedPartial: boolean): FullAuditResult {
  const score = scoreAudit({
    targetUrl: initial.finalUrl,
    pages: initial.pages,
    pagesDiscovered: initial.pagesDiscovered,
    robots: initial.robots,
    sitemap: initial.sitemap,
    performance,
  });
  const grade = gradeForScore(score.total);
  return {
    ...initial,
    score,
    grade,
    interpretation: interpretationForGrade(grade),
    partial: score.partial || forcedPartial,
    coverage: score.coverage,
    performance,
    finishedAt: new Date().toISOString(),
  };
}

async function sendCompletionNotifications(audit: AuditRow, result: FullAuditResult): Promise<void> {
  const publicBase = process.env.APP_BASE_URL;
  const adminBase = process.env.ADMIN_BASE_URL || publicBase;
  const publicPath = `${audit.locale === "en" ? "/en" : ""}/audit/${encodeURIComponent(audit.publicToken)}`;
  const publicUrl = publicBase ? new URL(publicPath, publicBase).toString() : publicPath;
  const adminUrl = adminBase ? new URL(`/admin/audits/${encodeURIComponent(audit.id)}`, adminBase).toString() : `/admin/audits/${audit.id}`;
  await notifyTelegram({
    entityType: "audit",
    entityId: audit.id,
    text: [`KILENI · аудит завершён`, `Домен: ${audit.normalizedDomain}`, `Оценка: ${result.score.total}/100`, `Проверено страниц: ${result.pagesChecked}`, `Статус: ${result.partial ? "частично" : "завершён"}`, `Admin: ${adminUrl}`, `Публичный результат: ${publicUrl}`].join("\n"),
  });
  if (audit.contactType === "email" && isEmail(audit.contact)) {
    const emailResult = await sendEmail({
      to: audit.contact,
      subject: audit.locale === "ru" ? "Предварительная SEO-проверка KILENI завершена" : "Your KILENI preliminary SEO check is ready",
      text: audit.locale === "ru" ? `Проверка завершена. Результат: ${publicUrl}` : `Your check is complete. Result: ${publicUrl}`,
    });
    recordEmailNotification(audit.id, emailResult.sent ? "sent" : emailResult.reason === "not_configured" ? "skipped" : "failed", emailResult.reason);
  }
}

function recordEmailNotification(entityId: string, status: string, error?: string): void {
  const now = Date.now();
  sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(randomUUID(), "audit", entityId, "email", status, error?.slice(0, 240) ?? null, now, now);
}

function safeProgress(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => ["pagesChecked", "pagesDiscovered", "queued", "limit"].includes(key)));
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: "audit-worker", event, ...data }));
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown_error";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
  });
}
