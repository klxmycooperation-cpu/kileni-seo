import { classifyAnalyzedPage, classifyAuditObject, type ClassifiedAuditObject } from "./classification";
import {
  AUDIT_CONTRACT_VERSION_V3,
  AUDIT_ENGINE_VERSION_V3,
  AUDIT_RESULT_VERSION_V4,
  buildAuditContractV3,
  type AuditResultContractV3,
} from "./contract-v3";
import { partitionAuditSampleInventory, selectAuditSample } from "./sample-selector";
import { normalizeLighthouseObservation, type AuditStorageMode } from "./lighthouse-observation";
import type { PublicAuditRun } from "./public-pipeline";
import type { FullAuditResult, PerformanceAuditInput } from "./types";

type FinalizableAuditRun = PublicAuditRun | FullAuditResult;

export interface FullAuditSnapshotV4 {
  readonly resultVersion: typeof AUDIT_RESULT_VERSION_V4;
  readonly contractVersion: typeof AUDIT_CONTRACT_VERSION_V3;
  readonly engineVersion: typeof AUDIT_ENGINE_VERSION_V3;
  readonly auditId: string;
  readonly createdAt: string;
  readonly publicResult: AuditResultContractV3;
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pageLimit: number;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly coverageStatus: AuditResultContractV3["coverageStatus"];
  readonly inventory: readonly ClassifiedAuditObject[];
  readonly inventoryDecisions: readonly {
    readonly url: string;
    readonly finalUrl?: string;
    readonly included: boolean;
    readonly reason: string;
    readonly primaryUrl?: string;
  }[];
  readonly selectedPages: AuditResultContractV3["selectedPages"];
  readonly pages: PublicAuditRun["pages"];
  readonly robots: PublicAuditRun["robots"];
  readonly sitemap: PublicAuditRun["sitemap"];
  readonly performance: PerformanceAuditInput | null;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface FinalizedAuditV4 {
  readonly publicResult: AuditResultContractV3;
  readonly fullResult: FullAuditSnapshotV4;
  readonly partial: boolean;
}

export function finalizeAuditResultV4(input: {
  readonly auditId: string;
  readonly createdAt: string;
  readonly result: FinalizableAuditRun;
  readonly performance?: PerformanceAuditInput | null;
  readonly storageMode?: AuditStorageMode;
}): FinalizedAuditV4 {
  const performance = normalizeLighthouseObservation(input.performance ?? input.result.performance, {
    storageMode: input.storageMode ?? "persistent",
  });
  const inventory = input.result.inventory?.length
    ? input.result.inventory
    : fallbackInventory(input.result);
  const selectedPages = input.result.selectedPages?.length
    ? input.result.selectedPages
    : selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      language: item.language,
      depth: item.depth,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
      canonicalUrl: item.canonicalUrl,
      contentFingerprint: item.contentFingerprint,
    })), input.result.pageLimit, { targetUrl: input.result.targetUrl });
  const publicResult = buildAuditContractV3({
    auditId: input.auditId,
    createdAt: input.createdAt,
    targetUrl: input.result.finalUrl,
    inventory,
    selectedPages,
    pages: input.result.pages,
    robots: input.result.robots,
    sitemap: input.result.sitemap,
    performance,
  });
  const fullResult: FullAuditSnapshotV4 = {
    resultVersion: AUDIT_RESULT_VERSION_V4,
    contractVersion: AUDIT_CONTRACT_VERSION_V3,
    engineVersion: AUDIT_ENGINE_VERSION_V3,
    auditId: input.auditId,
    createdAt: input.createdAt,
    publicResult,
    targetUrl: input.result.targetUrl,
    finalUrl: input.result.finalUrl,
    pageLimit: input.result.pageLimit,
    pagesChecked: publicResult.pagesChecked,
    pagesDiscovered: publicResult.pagesDiscovered,
    coverageStatus: publicResult.coverageStatus,
    inventory: inventory.map(copyClassification),
    inventoryDecisions: buildInventoryDecisions(inventory, publicResult.selectedPages),
    selectedPages: publicResult.selectedPages,
    pages: input.result.pages.map((page) => structuredClone(page)),
    robots: structuredClone(input.result.robots),
    sitemap: structuredClone(input.result.sitemap),
    performance: { ...performance },
    startedAt: input.result.startedAt,
    finishedAt: input.result.finishedAt,
  };
  return deepFreeze({
    publicResult,
    fullResult,
    partial: publicResult.coverageStatus === "sample_partial",
  });
}

function buildInventoryDecisions(
  inventory: readonly ClassifiedAuditObject[],
  selectedPages: AuditResultContractV3["selectedPages"],
): FullAuditSnapshotV4["inventoryDecisions"] {
  const partition = partitionAuditSampleInventory(
    inventory.filter((item) => item.resourceType === "html"),
  );
  const excluded = new Map(
    partition.excluded.map(({ item, reason, primaryUrl }) => [inventoryDecisionKey(item), { reason, primaryUrl }]),
  );
  const eligible = new Set(partition.eligible.map((item) => inventoryDecisionKey(item)));
  const selected = new Map(selectedPages.map((item) => [inventoryUrlKey(item.url), item.selectionReason]));
  const selectedTemplates = new Set(selectedPages.map((item) => item.templateFamily));
  return inventory.map((item) => {
    const decisionKey = inventoryDecisionKey(item);
    const inventoryKey = inventoryUrlKey(item.finalUrl);
    const exclusion = excluded.get(decisionKey);
    if (exclusion) return {
      url: item.url,
      finalUrl: item.finalUrl,
      included: false,
      reason: `excluded_by_sampling_rules:${exclusion.reason}`,
      ...(exclusion.primaryUrl ? { primaryUrl: exclusion.primaryUrl } : {}),
    };
    const reason = selected.get(inventoryKey);
    if (reason) return { url: item.url, finalUrl: item.finalUrl, included: true, reason };
    if (item.resourceType !== "html") return {
      url: item.url,
      finalUrl: item.finalUrl,
      included: false,
      reason: item.resourceType === "unknown" ? "excluded_by_sampling_rules" : "technical_resource",
    };
    return {
      url: item.url,
      finalUrl: item.finalUrl,
      included: false,
      reason: eligible.has(decisionKey)
        ? selectedTemplates.has(item.templateFamily)
          ? "not_selected_similar_template"
          : "not_selected_within_limit"
        : "excluded_by_sampling_rules",
    };
  });
}

function inventoryDecisionKey(item: Pick<ClassifiedAuditObject, "url" | "finalUrl">): string {
  return `${inventoryUrlKey(item.url)}\u0000${inventoryUrlKey(item.finalUrl)}`;
}

function inventoryUrlKey(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function fallbackInventory(result: FinalizableAuditRun): ClassifiedAuditObject[] {
  const objects = result.pages.map((page) => classifyAnalyzedPage(page));
  objects.push(classifyAuditObject({
    url: result.robots.url,
    contentType: "text/plain",
    statusCode: result.robots.httpStatus,
    resourceHint: "robots",
  }));
  const sitemapUrl = result.robots.sitemapUrls[0] ?? new URL("/sitemap.xml", result.finalUrl).href;
  objects.push(classifyAuditObject({
    url: sitemapUrl,
    contentType: result.sitemap.status === "found" ? "application/xml" : null,
    statusCode: result.sitemap.status === "found" ? 200 : result.sitemap.status === "missing" ? 404 : null,
    resourceHint: "sitemap",
  }));
  return objects;
}

function copyClassification(item: ClassifiedAuditObject): ClassifiedAuditObject {
  return {
    ...item,
    indexabilitySignals: [...item.indexabilitySignals],
    authSignals: [...item.authSignals],
    classificationReasons: [...item.classificationReasons],
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}
