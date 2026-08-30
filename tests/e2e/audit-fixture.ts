import { createAuditRecord, appendAuditEvent, completeAuditRecord, type AuditRow, type AuditStatus } from "../../src/db/queries";
import { runAudit, toPublicAuditResult, type AuditEvent, type AuditFetcher } from "../../src/lib/audit";
import { auditSiteFixtures, completePerformance, createFixtureFetcher } from "../fixtures/audit-sites";

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

export async function completeFixtureAudit(audit: AuditRow, delayMs = 60): Promise<void> {
  const baseFetcher = createFixtureFetcher(auditSiteFixtures.correct);
  const fetcher: AuditFetcher = async (input, options) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return baseFetcher(input, options);
  };
  const transition = async (next: AuditStatus, payload: Record<string, unknown> = {}) => {
    await appendAuditEvent(audit.id, next, payload);
  };
  await transition("validating_target");
  const result = await runAudit(audit.originalUrl, {
    fetcher,
    performance: completePerformance,
    onEvent: (event) => fixtureEvent(event, transition),
  });
  await transition("analyzing_structure", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
  await transition("running_performance", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
  await transition("calculating_score", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
  await completeAuditRecord(audit.id, {
    publicResult: toPublicAuditResult(result, audit.locale) as unknown as Record<string, unknown>,
    fullResult: result as unknown as Record<string, unknown>,
    score: result.score.total,
    grade: result.grade,
    partial: result.partial,
    pagesDiscovered: result.pagesDiscovered,
    pagesChecked: result.pagesChecked,
    pages: result.pages.map((page) => ({ ...page, depth: page.transport?.depth ?? 0 } as unknown as Record<string, unknown>)),
    issues: result.issues.map((issue) => ({ ...issue, evidence: issue.description } as unknown as Record<string, unknown>)),
  });
}

async function fixtureEvent(event: AuditEvent, transition: (status: AuditStatus, payload?: Record<string, unknown>) => Promise<void>): Promise<void> {
  if (event.type === "audit:start") await transition("connecting");
  if (event.type === "discovery:start") await transition("checking_robots");
  if (event.type === "discovery:robots_complete") await transition("checking_sitemaps");
  if (event.type === "discovery:sitemaps_complete") await transition("discovering_pages");
  if (event.type === "crawl:page" || event.type === "crawl:progress") await transition("crawling_pages", { pagesChecked: event.pagesChecked, pagesDiscovered: event.pagesDiscovered });
}
