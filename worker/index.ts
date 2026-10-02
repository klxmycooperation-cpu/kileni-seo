import { assertIsolatedPreviewEnvironment } from "../scripts/runtime-isolation.mjs";
import type { AuditEvent, PublicAuditRun } from "../src/lib/audit/index";
import { finalizeAuditResultV4, normalizeLighthouseObservation, runPublicAudit } from "../src/lib/audit/index";
import { completeAuditReliably } from "../src/lib/audit/completion-reliability";
import { toAuditProgressTransition } from "../src/lib/audit/progress-event";
import { acquireNextAudit, appendAuditEvent, completeAuditRecord, failAuditRecord, failStaleAudits, heartbeatWorker, parseAuditPriorityUrls, purgeExpiredAudits, type AuditRow, type AuditStatus } from "../src/db/queries";
import { deliverAuditResultEmail, retryPendingAuditEmails } from "../src/lib/notifications/audit-delivery";
import { notifyTelegram } from "../src/lib/notifications/telegram";
import { runMobileLighthouse } from "../src/lib/performance/lighthouse";
import { purgeExpiredRateLimits } from "../src/lib/security/rate-limit";
import { databaseMode } from "../src/db/client";

assertIsolatedPreviewEnvironment();

const pollIntervalMs = positiveNumber(process.env.WORKER_POLL_MS ?? process.env.WORKER_POLL_INTERVAL_MS, 1_500);
const auditTimeoutMs = Math.min(420_000, positiveNumber(process.env.AUDIT_TIMEOUT_MS, 420_000));
const pageLimit = Math.min(10, positiveNumber(process.env.AUDIT_PAGE_LIMIT, 10));
const retentionDays = Math.max(90, Math.min(3_650, positiveNumber(process.env.AUDIT_RESULT_RETENTION_DAYS, 90)));
const shutdown = new AbortController();

process.once("SIGTERM", () => shutdown.abort("SIGTERM"));
process.once("SIGINT", () => shutdown.abort("SIGINT"));

await runWorker();

async function runWorker(): Promise<void> {
  log("worker_started", { pollIntervalMs, pageLimit });
  let lastHeartbeat = 0;
  let lastRetentionCheck = 0;
  let lastStaleCheck = 0;
  let lastEmailCheck = 0;
  while (!shutdown.signal.aborted) {
    try {
      if (Date.now() - lastRetentionCheck >= 24 * 60 * 60 * 1_000) {
        try {
          const purgedAudits = await purgeExpiredAudits(retentionDays);
          const purgedRateLimits = await purgeExpiredRateLimits();
          log("retention_check", { retentionDays, purgedAudits, purgedRateLimits });
          lastRetentionCheck = Date.now();
        } catch (error) {
          // Retention is housekeeping, not a prerequisite for serving new audits.
          // Retry it in five minutes without taking the worker loop down.
          lastRetentionCheck = Date.now() - 24 * 60 * 60 * 1_000 + 5 * 60 * 1_000;
          log("retention_check_failed", { reason: errorName(error), code: errorCode(error) });
        }
      }
      if (Date.now() - lastStaleCheck >= 60_000) {
        try {
          const recovered = await failStaleAudits(Math.max(15 * 60 * 1_000, auditTimeoutMs + 2 * 60 * 1_000));
          if (recovered) log("stale_audits_recovered", { recovered });
        } catch (error) {
          log("stale_audit_check_failed", { reason: errorName(error), code: errorCode(error) });
        }
        lastStaleCheck = Date.now();
      }
      if (Date.now() - lastHeartbeat >= 10_000) {
        await heartbeatWorker({ pid: process.pid, state: "idle" });
        lastHeartbeat = Date.now();
      }
      if (Date.now() - lastEmailCheck >= 30_000) {
        await retryPendingAuditEmails().catch((error: unknown) => {
          log("audit_email_retry_failed", { reason: errorName(error), code: errorCode(error) });
        });
        lastEmailCheck = Date.now();
      }
      const audit = await acquireNextAudit();
      if (!audit) {
        await wait(pollIntervalMs, shutdown.signal);
        continue;
      }
      await heartbeatWorker({ pid: process.pid, state: "working", auditId: audit.id });
      await processAudit(audit);
      lastHeartbeat = 0;
    } catch (error) {
      log("worker_iteration_failed", { reason: errorName(error), code: errorCode(error) });
      await wait(Math.max(pollIntervalMs, 5_000), shutdown.signal);
    }
  }
  await heartbeatWorker({ pid: process.pid, state: "stopped" });
  log("worker_stopped", {});
}

async function processAudit(audit: AuditRow): Promise<void> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("AUDIT_TIMEOUT"), auditTimeoutMs);
  const stopListener = () => controller.abort("WORKER_SHUTDOWN");
  shutdown.signal.addEventListener("abort", stopListener, { once: true });
  let stage: AuditStatus = "validating_target";
  const transition = async (next: AuditStatus, payload: Record<string, unknown> = {}) => {
    if (stage === next) {
      await appendAuditEvent(audit.id, next, payload);
      return;
    }
    stage = next;
    await appendAuditEvent(audit.id, next, payload);
    await heartbeatWorker({ pid: process.pid, state: "working", auditId: audit.id, stage: next });
    log("audit_stage", { auditId: audit.id, stage: next, ...safeProgress(payload) });
  };

  try {
    log("audit_started", { auditId: audit.id });
    const plannedPages = Math.min(pageLimit, audit.pageLimit);
    const initial = await runPublicAudit(audit.originalUrl, {
      maxPages: plannedPages,
      concurrency: 4,
      signal: controller.signal,
      performance: null,
      priorityUrls: parseAuditPriorityUrls(audit.priorityUrlsJson),
      onEvent: (event) => handleAuditEvent(event, transition),
    });

    const samplePayload = {
      pagesChecked: initial.pagesChecked,
      pagesDiscovered: initial.pagesDiscovered,
      pagesSelected: initial.selectedPages.length,
    };
    await transition("analyzing_structure", { ...samplePayload, eventKind: "structure_checked" });
    await transition("running_performance", { ...samplePayload, eventKind: "performance_started" });
    const lighthouse = controller.signal.aborted
      ? {
          performance: normalizeLighthouseObservation({
            status: "timed_out",
            source: "lighthouse",
            errorCode: "AUDIT_TIMEOUT",
          }),
          pagesAttempted: 1,
          pagesChecked: 0,
        }
      : await runMobileLighthouse(initial.pages.map((page) => page.url).slice(0, 1), { signal: controller.signal });

    log("lighthouse_finished", {
      auditId: audit.id,
      storageMode: databaseMode === "ephemeral" ? "ephemeral" : "persistent",
      lighthouseStatus: lighthouse.performance?.status ?? "legacy_unknown",
      completedAt: lighthouse.performance?.completedAt ?? null,
      durationMs: lighthouse.performance?.durationMs ?? null,
      errorCode: lighthouse.performance?.errorCode ?? null,
    });

    await transition("finalizing_report", { ...samplePayload, eventKind: "report_building" });
    const result = attachPerformance(initial, lighthouse.performance, controller.signal.aborted || lighthouse.pagesChecked < lighthouse.pagesAttempted);
    const finalized = finalizeAuditResultV4({
      auditId: audit.publicToken,
      createdAt: new Date(audit.createdAt).toISOString(),
      result,
      performance: lighthouse.performance,
      storageMode: databaseMode === "ephemeral" ? "ephemeral" : "persistent",
    });
    const completion = await completeAuditReliably({
      persist: () => completeAuditRecord(audit.id, {
        publicResult: finalized.publicResult as unknown as Record<string, unknown>,
        fullResult: finalized.fullResult as unknown as Record<string, unknown>,
        score: null,
        grade: null,
        partial: finalized.partial,
        pagesDiscovered: finalized.publicResult.pagesDiscovered,
        pagesChecked: finalized.publicResult.pagesChecked,
      }),
      notify: () => sendCompletionNotifications(audit, finalized.publicResult.pagesChecked, finalized.partial),
    });
    if (completion.persistenceAttempts > 1) {
      log("audit_persistence_retried", { auditId: audit.id, attempts: completion.persistenceAttempts });
    }
    if (completion.notificationError) {
      log("audit_notification_failed", {
        auditId: audit.id,
        reason: errorName(completion.notificationError),
        code: errorCode(completion.notificationError),
      });
    }
    log("audit_completed", {
      auditId: audit.id,
      durationMs: Date.now() - started,
      pagesChecked: result.pagesChecked,
      pagesDiscovered: result.pagesDiscovered,
      partial: finalized.partial,
      lighthousePages: lighthouse.pagesChecked,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted && controller.signal.reason === "AUDIT_TIMEOUT";
    const summary = timedOut ? "Audit time limit exceeded" : error instanceof Error ? error.message : "Audit failed";
    await failAuditRecord(audit.id, summary);
    log("audit_failed", {
      auditId: audit.id,
      stage,
      durationMs: Date.now() - started,
      reason: timedOut ? "timeout" : errorName(error),
      code: errorCode(error),
    });
  } finally {
    clearTimeout(timeout);
    shutdown.signal.removeEventListener("abort", stopListener);
  }
}

async function handleAuditEvent(event: AuditEvent, transition: (status: AuditStatus, payload?: Record<string, unknown>) => Promise<void>): Promise<void> {
  if (event.type === "warning") {
    log("audit_warning", { code: event.code });
    return;
  }
  const mapped = toAuditProgressTransition(event);
  if (mapped) await transition(mapped.status, { ...mapped.payload });
}

function attachPerformance(
  initial: PublicAuditRun,
  performance: PublicAuditRun["performance"],
  forcedPartial: boolean,
): PublicAuditRun {
  return {
    ...initial,
    partial: initial.partial || forcedPartial,
    performance,
    finishedAt: new Date().toISOString(),
  };
}

async function sendCompletionNotifications(audit: AuditRow, pagesChecked: number, partial: boolean): Promise<void> {
  const publicBase = process.env.APP_BASE_URL;
  const adminBase = process.env.ADMIN_BASE_URL || publicBase;
  const publicPath = `/audit/${encodeURIComponent(audit.publicToken)}`;
  const publicUrl = publicBase ? new URL(publicPath, publicBase).toString() : publicPath;
  const adminUrl = adminBase ? new URL(`/admin/audits/${encodeURIComponent(audit.id)}`, adminBase).toString() : `/admin/audits/${audit.id}`;
  const failures: unknown[] = [];
  await notifyTelegram({
    entityType: "audit",
    entityId: audit.id,
    text: [`KILENI · аудит завершён`, `Домен: ${audit.normalizedDomain}`, `Проверено страниц: ${pagesChecked}`, `Статус: ${partial ? "частично" : "завершён"}`, `Admin: ${adminUrl}`, `Публичный результат: ${publicUrl}`].join("\n"),
  }).catch((error: unknown) => { failures.push(error); });
  await deliverAuditResultEmail(audit.id).catch((error: unknown) => { failures.push(error); });
  if (failures.length > 0) throw failures[0];
}

function safeProgress(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => ["pagesChecked", "pagesDiscovered", "pagesEligible", "pagesSelected", "technicalFilesChecked", "queued", "limit", "eventKind"].includes(key)));
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: "audit-worker", event, ...data }));
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown_error";
}

function errorCode(error: unknown): string | null {
  const visited = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && !visited.has(current); depth += 1) {
    visited.add(current);
    if (typeof current !== "object") return null;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") return candidate.code.slice(0, 80);
    current = candidate.cause;
  }
  return null;
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
