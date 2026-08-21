import type {
  AuditCategory,
  AuditScore,
  CategoryScore,
  PageAnalysis,
  PerformanceAuditInput,
  RobotsInfo,
  ScoreCheckResult,
  SitemapInfo,
} from "./types";
import { normalizeTargetUrl } from "./url";

export interface ScoreAuditInput {
  readonly targetUrl: string | URL;
  readonly pages: readonly PageAnalysis[];
  readonly pagesDiscovered?: number;
  readonly robots?: RobotsInfo | null;
  readonly sitemap?: SitemapInfo | null;
  readonly performance?: PerformanceAuditInput | null;
}

interface ScoreCheck {
  readonly id: string;
  readonly label: string;
  readonly value: number | null;
  readonly weight: number;
  readonly coverage?: number;
}

interface CategoryNormalizationOptions {
  readonly conservativeWhenPartial?: boolean;
}

export const AUDIT_CATEGORY_BUDGETS: Readonly<Record<AuditCategory, number>> = {
  technicalIndexing: 30,
  structureOnPage: 25,
  performanceMobile: 20,
  trustStructuredData: 15,
  contentImages: 10,
};

export function scoreAudit(input: ScoreAuditInput): AuditScore {
  const pages = input.pages;
  const pagesDiscovered = Math.max(input.pagesDiscovered ?? pages.length, pages.length);
  const pageCoverage = pagesDiscovered === 0 ? 0 : clamp(pages.length / pagesDiscovered);
  const technicalIndexing = normalizeCategoryScore(
    "technicalIndexing",
    AUDIT_CATEGORY_BUDGETS.technicalIndexing,
    [
      pageCheck("status", "HTTP 2xx", average(pages, (page) => statusValue(page.status)), 6, pageCoverage),
      pageCheck("indexable", "Indexable pages", average(pages, (page) => bool(!page.indexing.noindex)), 6, pageCoverage),
      pageCheck("canonical", "Canonical consistency", average(pages, canonicalQuality), 5, pageCoverage),
      siteCheck("robots-access", "Robots access", robotsAccessValue(input.robots), 4),
      siteCheck("robots-file", "Robots file", resourceStatusValue(input.robots?.status), 2),
      siteCheck("sitemap", "XML sitemap", sitemapValue(input.sitemap), 4),
      pageCheck("charset", "Charset", average(pages, (page) => bool(page.charset !== null)), 3, pageCoverage),
    ],
    { conservativeWhenPartial: true },
  );
  const structureOnPage = normalizeCategoryScore(
    "structureOnPage",
    AUDIT_CATEGORY_BUDGETS.structureOnPage,
    [
      pageCheck("titles", "Page titles", average(pages, (page) => textQuality(page.title)), 7, pageCoverage),
      pageCheck("title-uniqueness", "Unique page titles", titleUniqueness(pages), 3, pageCoverage),
      pageCheck("h1", "Single H1", average(pages, h1Quality), 5, pageCoverage),
      pageCheck("heading-hierarchy", "Heading hierarchy", average(pages, (page) => bool(page.headingStructure?.hierarchyValid !== false)), 1, pageCoverage),
      pageCheck("internal-links", "Internal links", internalLinkPresence(pages), 3, pageCoverage),
      pageCheck("broken-internal-links", "Working internal links", internalLinkHealth(pages), 3, pageCoverage),
      pageCheck("language", "Document language", average(pages, (page) => bool(page.language.present)), 3, pageCoverage),
    ],
    { conservativeWhenPartial: true },
  );
  const performanceMobile = normalizeCategoryScore(
    "performanceMobile",
    AUDIT_CATEGORY_BUDGETS.performanceMobile,
    [
      siteCheck("performance", "Lighthouse Performance", percentScore(input.performance?.performance), 6),
      siteCheck("fcp", "First Contentful Paint", timingScore(input.performance?.fcpMs, 1_800, 3_000), 2),
      siteCheck("lcp", "Largest Contentful Paint", timingScore(input.performance?.lcpMs, 2_500, 4_000), 3),
      siteCheck("cls", "Cumulative Layout Shift", timingScore(input.performance?.cls, 0.1, 0.25), 2),
      siteCheck("tbt", "Total Blocking Time", timingScore(input.performance?.tbtMs, 200, 600), 2),
      siteCheck("accessibility", "Lighthouse Accessibility", percentScore(input.performance?.accessibility), 3),
      pageCheck("viewport", "Mobile viewport", average(pages, (page) => bool(page.viewport)), 2, pageCoverage),
    ],
    { conservativeWhenPartial: true },
  );
  const trustStructuredData = normalizeCategoryScore(
    "trustStructuredData",
    AUDIT_CATEGORY_BUDGETS.trustStructuredData,
    [
      siteCheck("https", "HTTPS", normalizeTargetUrl(input.targetUrl).protocol === "https:" ? 1 : 0, 2),
      pageCheck("mixed-content", "No mixed content", average(pages, (page) => bool((page.mixedContent?.count ?? 0) === 0)), 1, pageCoverage),
      pageCheck("security-headers", "Security headers", securityHeaderCoverage(pages), 5, pageCoverage),
      pageCheck("json-ld", "Valid structured data", structuredDataQuality(pages), 4, pageCoverage),
      pageCheck("open-graph", "OpenGraph coverage", average(pages, (page) => page.openGraph.coverage), 3, pageCoverage),
    ],
    { conservativeWhenPartial: true },
  );
  const contentImages = normalizeCategoryScore(
    "contentImages",
    AUDIT_CATEGORY_BUDGETS.contentImages,
    [
      pageCheck("descriptions", "Meta descriptions", average(pages, (page) => textQuality(page.description)), 4, pageCoverage),
      pageCheck("content-depth", "Useful content depth", average(pages, (page) => page.content ? bool(!page.content.thin) : 1), 2, pageCoverage),
      pageCheck("image-alt", "Image alt coverage", imageAltCoverage(pages), 3, pageCoverage),
      pageCheck("image-dimensions", "Image dimensions", imageDimensionCoverage(pages), 1, pageCoverage),
    ],
    { conservativeWhenPartial: true },
  );

  const categories: Readonly<Record<AuditCategory, CategoryScore>> = {
    technicalIndexing,
    structureOnPage,
    performanceMobile,
    trustStructuredData,
    contentImages,
  };
  const coverage = roundCoverage(
    Object.values(categories).reduce(
      (sum, category) => sum + category.coverage * category.maxScore,
      0,
    ) / 100,
  );
  return {
    total: Object.values(categories).reduce((sum, category) => sum + category.score, 0),
    maxScore: 100,
    coverage,
    partial: coverage < 1,
    categories,
  };
}

/**
 * Normalizes weighted 0..1 signals without turning absent observations into
 * invented metric values. Coverage is reported separately. Performance may
 * opt into a deterministic uncertainty cap when only part of Lighthouse data
 * is present.
 */
export function normalizeCategoryScore(
  category: AuditCategory,
  maxScore: number,
  checks: readonly ScoreCheck[],
  options: CategoryNormalizationOptions = {},
): CategoryScore {
  const results: ScoreCheckResult[] = checks.map((item) => ({
    ...item,
    value: item.value === null ? null : clamp(item.value),
    applicable: item.value !== null,
    coverage: item.value === null ? 0 : clamp(item.coverage ?? 1),
  }));
  const applicable = results.filter((item) => item.applicable);
  const availableWeight = applicable.reduce((sum, item) => sum + item.weight, 0);
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0);
  const earned = applicable.reduce(
    (sum, item) => sum + (item.value ?? 0) * item.weight,
    0,
  );
  const coverage = totalWeight === 0
    ? 0
    : roundCoverage(
        results.reduce((sum, item) => sum + item.coverage * item.weight, 0) /
          totalWeight,
      );
  const normalized = availableWeight === 0 ? 0 : earned / availableWeight;
  const confidenceFactor = options.conservativeWhenPartial && coverage < 1
    ? 0.5 + coverage / 2
    : 1;
  const score = Math.round(maxScore * normalized * confidenceFactor);
  return {
    category,
    score,
    maxScore,
    coverage,
    partial: coverage < 1,
    checks: results,
  };
}

function pageCheck(
  id: string,
  label: string,
  value: number | null,
  weight: number,
  pageCoverage: number,
): ScoreCheck {
  return { id, label, value, weight, coverage: value === null ? 0 : pageCoverage };
}

function siteCheck(
  id: string,
  label: string,
  value: number | null,
  weight: number,
): ScoreCheck {
  return { id, label, value, weight, coverage: value === null ? 0 : 1 };
}

function average(
  pages: readonly PageAnalysis[],
  selector: (page: PageAnalysis) => number,
): number | null {
  if (pages.length === 0) return null;
  return pages.reduce((sum, page) => sum + selector(page), 0) / pages.length;
}

function textQuality(signal: PageAnalysis["title"]): number {
  if (!signal.present) return 0;
  return signal.optimal ? 1 : 0.6;
}

function h1Quality(page: PageAnalysis): number {
  if (page.h1.count === 1) return 1;
  return page.h1.count > 1 ? 0.5 : 0;
}

function titleUniqueness(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  const titles = pages
    .map((page) => page.title.value?.trim().toLocaleLowerCase("ru") ?? "")
    .filter(Boolean);
  if (titles.length === 0) return 0;
  return new Set(titles).size / titles.length;
}

function internalLinkPresence(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  if (pages.length === 1) return 1;
  return average(pages, (page) => bool(page.links.internalCount > 0));
}

function internalLinkHealth(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  const targets = new Map<string, PageAnalysis>();
  for (const page of pages) {
    targets.set(page.url, page);
    if (page.transport?.requestedUrl) targets.set(page.transport.requestedUrl, page);
  }
  const observed = pages.flatMap((page) => page.links.internalUrls)
    .map((url) => targets.get(url))
    .filter((page): page is PageAnalysis => page !== undefined);
  if (observed.length === 0) return 1;
  return observed.reduce((sum, page) => {
    if (page.status < 200 || page.status >= 400) return sum;
    return sum + (page.transport?.redirects.length ? 0.7 : 1);
  }, 0) / observed.length;
}

function canonicalQuality(page: PageAnalysis): number {
  if (!page.canonical.valid) return 0;
  return page.canonical.selfReferential ? 1 : 0.5;
}

function imageAltCoverage(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  const total = pages.reduce((sum, page) => sum + page.images.total, 0);
  if (total === 0) return 1;
  const missing = pages.reduce((sum, page) => sum + page.images.missingAlt, 0);
  return 1 - missing / total;
}

function imageDimensionCoverage(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  const total = pages.reduce((sum, page) => sum + page.images.total, 0);
  if (total === 0) return 1;
  const missing = pages.reduce((sum, page) => sum + (page.images.missingDimensions ?? 0), 0);
  return 1 - missing / total;
}

function structuredDataQuality(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  return pages.reduce((sum, page) => sum + (page.structuredData.total === 0 ? 0 : page.structuredData.valid / page.structuredData.total), 0) / pages.length;
}

function securityHeaderCoverage(pages: readonly PageAnalysis[]): number | null {
  if (pages.length === 0) return null;
  return (
    pages.reduce((sum, page) => {
      const total = page.securityHeaders.present.length + page.securityHeaders.missing.length;
      return sum + (total === 0 ? 0 : page.securityHeaders.present.length / total);
    }, 0) / pages.length
  );
}

function sitemapValue(sitemap: SitemapInfo | null | undefined): number | null {
  if (!sitemap || sitemap.status === "error") return null;
  return sitemap.status === "found" ? 1 : 0;
}

function robotsAccessValue(robots: RobotsInfo | null | undefined): number | null {
  if (!robots || robots.allowedRoot === null) return null;
  return bool(robots.allowedRoot);
}

function resourceStatusValue(
  status: RobotsInfo["status"] | undefined,
): number | null {
  if (!status || status === "error") return null;
  return status === "found" ? 1 : 0;
}

function percentScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return clamp(value <= 1 ? value : value / 100);
}

function timingScore(
  value: number | null | undefined,
  good: number,
  poor: number,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }
  if (value <= good) return 1;
  if (value >= poor) return 0;
  return 1 - (value - good) / (poor - good);
}

function statusValue(status: number): number {
  if (status >= 200 && status < 300) return 1;
  if (status >= 300 && status < 400) return 0.5;
  return 0;
}

function bool(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function roundCoverage(value: number): number {
  return Math.round(clamp(value) * 10_000) / 10_000;
}
