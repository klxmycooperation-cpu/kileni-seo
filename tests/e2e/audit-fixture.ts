import { createAuditRecord, appendAuditEvent, completeAuditRecord, type AuditRow, type AuditStatus } from "../../src/db/queries";
import { finalizeAuditResultV4, runPublicAudit, type AuditEvent, type AuditFetcher } from "../../src/lib/audit";
import { auditSiteFixtures, completePerformance, createFixtureFetcher } from "../fixtures/audit-sites";
import { auditClientReportSnapshot } from "../unit/fixtures/audit-client-report-snapshot";
import { toAuditProgressTransition } from "../../src/lib/audit/progress-event";

export async function createQueuedFixtureAudit(): Promise<AuditRow> {
  return createAuditRecord({
    originalUrl: auditSiteFixtures.correct.target,
    normalizedDomain: "correct.test",
    locale: "ru",
    name: "E2E Fixture",
    contact: "fixture@example.com",
    contactType: "email",
    ipHash: "e2e-ip-hash",
    userAgentHash: "e2e-user-agent-hash",
    source: "playwright-fixture",
    consentVersion: "2026-08-15",
  });
}

export async function completeFixtureAudit(audit: AuditRow, delayMs = 60, visibleStageDelayMs = 0): Promise<void> {
  const baseFetcher = createFixtureFetcher(auditSiteFixtures.correct);
  const fetcher: AuditFetcher = async (input, options) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return baseFetcher(input, options);
  };
  const transition = async (next: AuditStatus, payload: Record<string, unknown> = {}) => {
    await appendAuditEvent(audit.id, next, payload);
  };
  await transition("validating_target");
  const result = await runPublicAudit(audit.originalUrl, {
    fetcher,
    performance: completePerformance,
    onEvent: (event) => fixtureEvent(event, transition, visibleStageDelayMs),
  });
  const completedSample = {
    pagesChecked: result.pagesChecked,
    pagesDiscovered: result.pagesDiscovered,
    pagesSelected: result.selectedPages.length,
    selectedPages: result.selectedPages.map(({ url, pageType, selectionReason }) => ({ url, pageType, selectionReason })),
    selectionComplete: true,
  };
  await transition("analyzing_structure", { ...completedSample, eventKind: "structure_checked" });
  if (visibleStageDelayMs > 0) await delay(visibleStageDelayMs);
  await transition("running_performance", { ...completedSample, eventKind: "performance_started" });
  if (visibleStageDelayMs > 0) await delay(visibleStageDelayMs);
  await transition("finalizing_report", { ...completedSample, eventKind: "report_building" });
  if (visibleStageDelayMs > 0) await delay(visibleStageDelayMs);
  const finalized = finalizeAuditResultV4({
    auditId: audit.publicToken,
    createdAt: new Date(audit.createdAt).toISOString(),
    result,
    performance: completePerformance,
  });
  await completeAuditRecord(audit.id, {
    publicResult: finalized.publicResult as unknown as Record<string, unknown>,
    fullResult: finalized.fullResult as unknown as Record<string, unknown>,
    score: null,
    grade: null,
    partial: finalized.partial,
    pagesDiscovered: finalized.publicResult.pagesDiscovered,
    pagesChecked: finalized.publicResult.pagesChecked,
  });
}

export async function completeClientReportFixtureAudit(audit: AuditRow): Promise<void> {
  const publicResult = auditClientReportSnapshot();
  await completeAuditRecord(audit.id, {
    publicResult: publicResult as unknown as Record<string, unknown>,
    fullResult: { resultVersion: 4, contractVersion: 3, publicResult } as unknown as Record<string, unknown>,
    score: null,
    grade: null,
    partial: false,
    pagesDiscovered: publicResult.pagesDiscovered,
    pagesChecked: publicResult.pagesChecked,
  });
}

async function fixtureEvent(event: AuditEvent, transition: (status: AuditStatus, payload?: Record<string, unknown>) => Promise<void>, visibleStageDelayMs = 0): Promise<void> {
  const mapped = toAuditProgressTransition(event);
  if (mapped) {
    await transition(mapped.status, { ...mapped.payload });
    if (event.type === "selection:start" && visibleStageDelayMs > 0) await delay(visibleStageDelayMs);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
