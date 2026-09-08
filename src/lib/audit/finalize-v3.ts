import {
  AUDIT_CONTRACT_VERSION,
  AUDIT_ENGINE_VERSION_V2,
  AUDIT_RESULT_VERSION_V3,
  buildAuditContractV2,
  type AuditResultContractV2,
} from "./contract-v2";
import { selectAuditSample } from "./sample-selector";
import type { FullAuditResult, PerformanceAuditInput } from "./types";

export interface FullAuditSnapshotV3 {
  readonly resultVersion: typeof AUDIT_RESULT_VERSION_V3;
  readonly contractVersion: typeof AUDIT_CONTRACT_VERSION;
  readonly engineVersion: typeof AUDIT_ENGINE_VERSION_V2;
  readonly auditId: string;
  readonly createdAt: string;
  readonly publicResult: AuditResultContractV2;
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pageLimit: number;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly coverageStatus: AuditResultContractV2["coverageStatus"];
  readonly selectedPages: AuditResultContractV2["selectedPages"];
  readonly pages: FullAuditResult["pages"];
  readonly discoveredUrls: FullAuditResult["discoveredUrls"];
  readonly issues: FullAuditResult["issues"];
  readonly robots: FullAuditResult["robots"];
  readonly sitemap: FullAuditResult["sitemap"];
  readonly performance: PerformanceAuditInput | null;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface FinalizedAuditV3 {
  readonly publicResult: AuditResultContractV2;
  readonly fullResult: FullAuditSnapshotV3;
  readonly partial: boolean;
}

export function finalizeAuditResultV3(input: {
  readonly auditId: string;
  readonly createdAt: string;
  readonly result: FullAuditResult;
  readonly performance?: PerformanceAuditInput | null;
}): FinalizedAuditV3 {
  const performance = input.performance ?? input.result.performance ?? null;
  const selectedPages = input.result.selectedPages?.length
    ? input.result.selectedPages
    : selectAuditSample([
      ...input.result.discoveredUrls.map((url) => ({ url })),
      ...input.result.pages.map((page) => ({
        url: page.transport?.requestedUrl ?? page.url,
        depth: page.transport?.depth,
        schemaTypes: page.structuredData.types,
      })),
    ], input.result.pageLimit);
  const publicResult = buildAuditContractV2({
    auditId: input.auditId,
    createdAt: input.createdAt,
    targetUrl: input.result.finalUrl,
    discoveredUrls: input.result.discoveredUrls,
    selectedPages,
    pages: input.result.pages,
    robots: input.result.robots,
    sitemap: input.result.sitemap,
    performance,
  });
  const fullResult: FullAuditSnapshotV3 = Object.freeze({
    resultVersion: AUDIT_RESULT_VERSION_V3,
    contractVersion: AUDIT_CONTRACT_VERSION,
    engineVersion: AUDIT_ENGINE_VERSION_V2,
    auditId: input.auditId,
    createdAt: input.createdAt,
    publicResult,
    targetUrl: input.result.targetUrl,
    finalUrl: input.result.finalUrl,
    pageLimit: input.result.pageLimit,
    pagesChecked: publicResult.pagesChecked,
    pagesDiscovered: publicResult.pagesDiscovered,
    coverageStatus: publicResult.coverageStatus,
    selectedPages: publicResult.selectedPages,
    pages: input.result.pages,
    discoveredUrls: input.result.discoveredUrls,
    issues: input.result.issues,
    robots: input.result.robots,
    sitemap: input.result.sitemap,
    performance,
    startedAt: input.result.startedAt,
    finishedAt: input.result.finishedAt,
  });
  return Object.freeze({
    publicResult,
    fullResult,
    partial: publicResult.coverageStatus === "sample_partial",
  });
}
