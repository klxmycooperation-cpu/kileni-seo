import type { AuditRestoreSnapshot } from "./audit-restore";
import { sanitizePublicAuditResult } from "./audit-public";
import { safeJsonParse } from "./http";
import { siteConfig } from "@/src/config/site";
import type { AuditRow, AuditStatus } from "@/src/db/queries";
import { derivePublicAuditCoverage, type PublicAuditCoverageStatus } from "@/src/lib/audit/public-coverage";
import type { AuditProgressSnapshot, AuditProgressStatus } from "@/src/lib/audit/progress-state";

export type PublicAuditSnapshot = AuditProgressSnapshot & {
  readonly token: string;
  readonly terminal: boolean;
  readonly cached: boolean;
  readonly progress: {
    readonly pagesDiscovered: number;
    readonly pagesChecked: number;
    readonly pageLimit: number;
  };
};

export function buildStoredPublicAuditSnapshot(audit: AuditRow): PublicAuditSnapshot {
  const terminal = isTerminal(audit.status);
  const result = sanitizePublicAuditResult(safeJsonParse(audit.publicResultJson));
  warnAboutLegacyLighthouseGap(audit, result);
  const pageLimit = Math.min(siteConfig.audit.pageLimit, audit.pageLimit);
  const coverage = terminal && audit.status !== "failed" && result
    ? derivePublicAuditCoverage({
      result,
      pagesChecked: audit.pagesChecked,
      pagesDiscovered: audit.pagesDiscovered,
      pageLimit,
    })
    : null;

  return {
    token: audit.publicToken,
    normalizedDomain: audit.normalizedDomain,
    status: coverage ? publicTerminalStatus(audit.status, coverage.coverageStatus) : audit.status,
    terminal,
    cached: audit.startedAt === audit.createdAt && audit.completedAt === audit.createdAt,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    consentRecorded: true,
    pagesDiscovered: coverage?.pagesDiscovered ?? audit.pagesDiscovered,
    pagesChecked: coverage?.pagesChecked ?? audit.pagesChecked,
    ...(coverage ? { pagesSelected: coverage.pagesSelected, coverageStatus: coverage.coverageStatus } : {}),
    pageLimit,
    progress: {
      pagesDiscovered: audit.pagesDiscovered,
      pagesChecked: audit.pagesChecked,
      pageLimit,
    },
    result,
    ...(audit.status === "failed" ? { errorSummary: audit.errorSummary } : {}),
  };
}

function warnAboutLegacyLighthouseGap(audit: AuditRow, result: Record<string, unknown> | null): void {
  if (!result || result.performanceObservation !== undefined) return;
  const checks = Array.isArray(result.checks) ? result.checks : [];
  const summaryMentionsLighthouse = checks.some((value) => {
    if (!value || typeof value !== "object") return false;
    const check = value as Record<string, unknown>;
    return check.checkId === "performance" && typeof check.reason === "string" && /\d{1,3}\s*(?:из|of|\/)\s*100/iu.test(check.reason);
  });
  if (!summaryMentionsLighthouse) return;
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "audit-report",
    event: "lighthouse_summary_without_observation",
    auditId: audit.id,
    storageMode: "persistent",
    lighthouseStatus: "legacy_summary_only",
  }));
}

export function buildRestoredPublicAuditSnapshot(restored: AuditRestoreSnapshot): PublicAuditSnapshot {
  const coverage = derivePublicAuditCoverage({ result: restored.result, pageLimit: siteConfig.audit.pageLimit });
  return {
    token: restored.token,
    normalizedDomain: restored.normalizedDomain,
    status: publicTerminalStatus(restored.status, coverage.coverageStatus),
    terminal: true,
    cached: false,
    createdAt: restored.createdAt,
    completedAt: restored.completedAt,
    consentRecorded: true,
    pagesDiscovered: coverage.pagesDiscovered,
    pagesChecked: coverage.pagesChecked,
    pagesSelected: coverage.pagesSelected,
    pageLimit: siteConfig.audit.pageLimit,
    coverageStatus: coverage.coverageStatus,
    progress: {
      pagesDiscovered: coverage.pagesDiscovered,
      pagesChecked: coverage.pagesChecked,
      pageLimit: siteConfig.audit.pageLimit,
    },
    result: restored.result,
  };
}

export function publicTerminalStatus(
  status: AuditStatus | AuditProgressStatus,
  coverageStatus: PublicAuditCoverageStatus,
): AuditProgressStatus {
  if (status !== "completed" && status !== "partial") return status;
  return coverageStatus === "sample_complete" ? "completed" : "partial";
}

function isTerminal(status: AuditStatus): boolean {
  return status === "completed" || status === "partial" || status === "failed";
}
