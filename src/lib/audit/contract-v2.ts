import {
  AUDIT_CHECK_REGISTRY_V2,
  evaluateAuditChecksV2,
  type AuditCheckResultV2,
  type AuditCheckStatusV2,
} from "./check-registry-v2";
import {
  PUBLIC_AUDIT_SAMPLE_LIMIT,
  type SelectedAuditUrl,
} from "./sample-selector";
import type {
  AuditCategory,
  PageAnalysis,
  PerformanceAuditInput,
  PublicAuditPageResult,
  RobotsInfo,
  SitemapInfo,
} from "./types";
import { normalizeTargetUrl } from "./url";

export const AUDIT_CONTRACT_VERSION = 2 as const;
export const AUDIT_RESULT_VERSION_V3 = 3 as const;
export const AUDIT_ENGINE_VERSION_V2 = "audit-contract-v2.0.0" as const;
export const PUBLIC_UNCHECKED_URL_LIMIT = 25 as const;

export type AuditCoverageStatusV2 = "sample_complete" | "sample_partial";

export interface AuditStatusCountsV2 {
  readonly pass: number;
  readonly warning: number;
  readonly fail: number;
  readonly not_run: number;
  readonly insufficient_data: number;
}

export interface AuditCategorySummaryV2 extends AuditStatusCountsV2 {
  readonly category: AuditCategory;
  readonly total: number;
}

export interface AuditResultSummaryV2 extends AuditStatusCountsV2 {
  readonly headline: string;
  readonly totalChecks: number;
  readonly completedChecks: number;
}

export interface AuditResultContractV2 {
  readonly resultVersion: typeof AUDIT_RESULT_VERSION_V3;
  readonly contractVersion: typeof AUDIT_CONTRACT_VERSION;
  readonly engineVersion: typeof AUDIT_ENGINE_VERSION_V2;
  readonly auditId: string;
  readonly createdAt: string;
  readonly target: string;
  readonly pagesDiscovered: number;
  readonly pagesSelected: number;
  readonly pagesChecked: number;
  readonly pagesNotCheckedTotal: number;
  readonly pagesNotCheckedReturned: number;
  readonly pagesNotCheckedTruncated: boolean;
  readonly pagesNotCheckedUrls: readonly string[];
  readonly coverageStatus: AuditCoverageStatusV2;
  readonly selectedPages: readonly SelectedAuditUrl[];
  /** Bounded public facts for the pages that were actually loaded and analysed. */
  readonly checkedPages: readonly PublicAuditPageResult[];
  readonly checks: readonly AuditCheckResultV2[];
  readonly categorySummary: readonly AuditCategorySummaryV2[];
  readonly resultSummary: AuditResultSummaryV2;
}

export interface BuildAuditContractV2Input {
  readonly auditId: string;
  readonly createdAt: string;
  readonly targetUrl: string | URL;
  readonly discoveredUrls: readonly string[];
  readonly selectedPages: readonly SelectedAuditUrl[];
  readonly pages: readonly PageAnalysis[];
  readonly robots?: RobotsInfo | null;
  readonly sitemap?: SitemapInfo | null;
  readonly performance?: PerformanceAuditInput | null;
}

/**
 * Builds an immutable, score-free result snapshot. It deliberately does not
 * mutate or adapt the persisted legacy result; callers opt into v2 explicitly.
 */
export function buildAuditContractV2(
  input: BuildAuditContractV2Input,
): AuditResultContractV2 {
  const selectedPages = deduplicateSelectedPages(input.selectedPages);
  const selectedUrls = new Set(selectedPages.map((page) => comparableUrl(page.url)));
  const checkedPages = input.pages.filter((page) => {
    const candidates = [page.url, page.transport?.requestedUrl, page.transport?.finalUrl]
      .filter((value): value is string => typeof value === "string")
      .map(comparableUrl);
    return candidates.some((url) => selectedUrls.has(url));
  });
  const checkedUrls = new Set(
    checkedPages.flatMap((page) => [page.url, page.transport?.requestedUrl]
      .filter((value): value is string => typeof value === "string")
      .map(comparableUrl)),
  );
  const discoveredUrls = deduplicateUrls(input.discoveredUrls);
  const pagesNotChecked = discoveredUrls
    .filter((url) => !checkedUrls.has(comparableUrl(url)))
    .sort((left, right) => left.localeCompare(right, "en"));
  const returnedUnchecked = pagesNotChecked.slice(0, PUBLIC_UNCHECKED_URL_LIMIT);
  const checks = evaluateAuditChecksV2({
    targetUrl: input.targetUrl,
    pages: checkedPages,
    robots: input.robots,
    sitemap: input.sitemap,
    performance: input.performance,
  });
  const coverageStatus: AuditCoverageStatusV2 = checkedPages.length === selectedPages.length
    ? "sample_complete"
    : "sample_partial";
  const statusCounts = countStatuses(checks);

  return Object.freeze({
    resultVersion: AUDIT_RESULT_VERSION_V3,
    contractVersion: AUDIT_CONTRACT_VERSION,
    engineVersion: AUDIT_ENGINE_VERSION_V2,
    auditId: input.auditId,
    createdAt: input.createdAt,
    target: publicUrl(input.targetUrl),
    pagesDiscovered: discoveredUrls.length,
    pagesSelected: selectedPages.length,
    pagesChecked: checkedPages.length,
    pagesNotCheckedTotal: pagesNotChecked.length,
    pagesNotCheckedReturned: returnedUnchecked.length,
    pagesNotCheckedTruncated: returnedUnchecked.length < pagesNotChecked.length,
    pagesNotCheckedUrls: Object.freeze(returnedUnchecked),
    coverageStatus,
    selectedPages: Object.freeze(selectedPages),
    checkedPages: Object.freeze(buildPublicCheckedPages(checkedPages, input.sitemap)),
    checks: Object.freeze([...checks]),
    categorySummary: Object.freeze(buildCategorySummary(checks)),
    resultSummary: Object.freeze({
      headline: coverageHeadline(selectedPages.length, checkedPages.length, coverageStatus),
      totalChecks: AUDIT_CHECK_REGISTRY_V2.length,
      completedChecks: statusCounts.pass + statusCounts.warning + statusCounts.fail,
      ...statusCounts,
    }),
  });
}

function buildPublicCheckedPages(
  pages: readonly PageAnalysis[],
  sitemap: SitemapInfo | null | undefined,
): PublicAuditPageResult[] {
  const sitemapUrls = new Set(
    (sitemap?.urls ?? []).flatMap((value) => safePublicUrl(value)),
  );
  const incoming = new Map<string, number>();
  for (const source of pages) {
    const targets = new Set(source.links.internalUrls.flatMap((value) => safePublicUrl(value)));
    for (const target of targets) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  }

  return pages.slice(0, PUBLIC_AUDIT_SAMPLE_LIMIT).map((page) => {
    const requestedUrl = publicUrl(page.transport?.requestedUrl ?? page.url);
    const finalUrl = publicUrl(page.transport?.finalUrl ?? page.url);
    const sitemapFact: PublicAuditPageResult["sitemap"] = sitemap?.status === "found"
      ? Object.freeze({
          status: "checked" as const,
          included: sitemapUrls.has(finalUrl) || sitemapUrls.has(requestedUrl),
        })
      : Object.freeze({
          status: "not_checked" as const,
          included: null,
          reason: "Файл со списком страниц (sitemap.xml) не найден или не был прочитан.",
        });
    const result: PublicAuditPageResult = {
      url: requestedUrl,
      finalUrl,
      http: Object.freeze({
        status: page.status,
        ok: page.status >= 200 && page.status < 300,
        redirectCount: page.transport?.redirects.length ?? 0,
      }),
      title: publicTextSignal(page.title),
      description: publicTextSignal(page.description),
      h1: Object.freeze({
        count: page.h1.count,
        values: Object.freeze(page.h1.values.slice(0, 5).map((value) => publicEvidenceText(value, 500))),
      }),
      noindex: page.indexing.noindex,
      canonical: Object.freeze({
        url: page.canonical.valid && page.canonical.url ? publicUrl(page.canonical.url) : null,
        valid: page.canonical.valid,
        selfReferential: page.canonical.selfReferential,
      }),
      sitemap: sitemapFact,
      internalLinks: Object.freeze({
        outgoing: page.links.internalCount,
        incomingFromCheckedPages: incoming.get(finalUrl) ?? incoming.get(requestedUrl) ?? 0,
      }),
    };
    return Object.freeze(result);
  });
}

function publicTextSignal(signal: PageAnalysis["title"]): PublicAuditPageResult["title"] {
  return Object.freeze({
    value: signal.value === null ? null : publicEvidenceText(signal.value, 1_000),
    present: signal.present,
    length: signal.length,
    optimal: signal.optimal,
  });
}

function publicEvidenceText(value: string, maxLength: number): string {
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, " ");
  const withoutUrlQueries = clean.replace(/https?:\/\/[^\s<>"']+/giu, (match) => {
    const suffix = match.match(/[),.;:!?]+$/u)?.[0] ?? "";
    const rawUrl = suffix ? match.slice(0, -suffix.length) : match;
    const safe = safePublicUrl(rawUrl)[0] ?? "[URL скрыт]";
    return `${safe}${suffix}`;
  });
  return withoutUrlQueries.replace(
    /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu,
    "[e-mail скрыт]",
  ).slice(0, maxLength);
}

function buildCategorySummary(
  checks: readonly AuditCheckResultV2[],
): AuditCategorySummaryV2[] {
  const categories: readonly AuditCategory[] = [
    "technicalIndexing",
    "structureOnPage",
    "performanceMobile",
    "trustStructuredData",
    "contentImages",
  ];
  return categories.map((category) => {
    const categoryChecks = checks.filter((check) => check.category === category);
    return {
      category,
      total: categoryChecks.length,
      ...countStatuses(categoryChecks),
    };
  });
}

function countStatuses(checks: readonly AuditCheckResultV2[]): AuditStatusCountsV2 {
  const counts: Record<AuditCheckStatusV2, number> = {
    pass: 0,
    warning: 0,
    fail: 0,
    not_run: 0,
    insufficient_data: 0,
  };
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

function coverageHeadline(
  pagesSelected: number,
  pagesChecked: number,
  coverageStatus: AuditCoverageStatusV2,
): string {
  if (coverageStatus === "sample_partial") {
    return `Проверено ${pagesChecked} из ${pagesSelected} выбранных страниц`;
  }
  if (pagesSelected === 10) {
    return "Бесплатный лимит достигнут. Проверено 10 выбранных страниц";
  }
  if (pagesSelected === 0) return "Страницы для проверки не выбраны";
  return `Проверены все выбранные страницы: ${pagesChecked}`;
}

function deduplicateSelectedPages(
  pages: readonly SelectedAuditUrl[],
): SelectedAuditUrl[] {
  const seen = new Set<string>();
  const result: SelectedAuditUrl[] = [];
  for (const page of pages) {
    if (result.length >= PUBLIC_AUDIT_SAMPLE_LIMIT) break;
    const key = comparableUrl(page.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...page, url: publicUrl(page.url) });
  }
  return result;
}

function deduplicateUrls(urls: readonly string[]): string[] {
  const values = new Map<string, string>();
  for (const raw of urls) {
    try {
      const safe = publicUrl(raw);
      values.set(comparableUrl(safe), safe);
    } catch {
      // Invalid inventory rows do not become public result URLs.
    }
  }
  return [...values.values()].sort((left, right) => left.localeCompare(right, "en"));
}

function publicUrl(value: string | URL): string {
  const url = normalizeTargetUrl(value);
  url.username = "";
  url.password = "";
  url.hash = "";
  url.search = "";
  return url.href;
}

function safePublicUrl(value: string): string[] {
  try {
    return [publicUrl(value)];
  } catch {
    return [];
  }
}

function comparableUrl(value: string): string {
  try {
    return publicUrl(value);
  } catch {
    return value;
  }
}
