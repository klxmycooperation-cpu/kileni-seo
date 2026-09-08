import { crawlSite, type CrawlSiteOptions } from "./crawler";
import type { ClassifiedAuditObject } from "./classification";
import type { SelectedAuditUrl } from "./sample-selector";
import type {
  PageAnalysis,
  PerformanceAuditInput,
  RobotsInfo,
  SitemapInfo,
} from "./types";
import { normalizeTargetUrl } from "./url";

export interface RunPublicAuditOptions extends CrawlSiteOptions {
  readonly now?: () => Date;
  readonly performance?: PerformanceAuditInput | null;
}

export interface PublicAuditRun {
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pageLimit: number;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly partial: boolean;
  readonly inventory: readonly ClassifiedAuditObject[];
  readonly selectedPages: readonly SelectedAuditUrl[];
  readonly pages: readonly PageAnalysis[];
  readonly robots: RobotsInfo;
  readonly sitemap: SitemapInfo;
  readonly performance: PerformanceAuditInput | null;
  readonly startedAt: string;
  readonly finishedAt: string;
}

/** Current free-audit runner. It collects observations but never calculates a score. */
export async function runPublicAudit(
  input: string | URL,
  options: RunPublicAuditOptions = {},
): Promise<PublicAuditRun> {
  const target = normalizeTargetUrl(input);
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  await options.onEvent?.({ type: "audit:start" });
  const pageLimit = normalizePageLimit(options.maxPages);
  const crawl = await crawlSite(target, {
    ...options,
    maxPages: pageLimit,
    sampleStrategy: "representative",
  });
  const pagesDiscovered = crawl.inventory.filter((item) => item.resourceType === "html").length;
  if (crawl.selectedPages.length === 0 || crawl.pagesChecked === 0) {
    throw new Error("No eligible public HTML pages could be checked");
  }
  const partial = Boolean(options.signal?.aborted) || crawl.pagesChecked < crawl.selectedPages.length;
  const finishedAt = now().toISOString();
  await options.onEvent?.({
    type: "audit:complete",
    pages: crawl.pagesChecked,
    pagesChecked: crawl.pagesChecked,
    pagesDiscovered,
    partial,
  });
  return Object.freeze({
    targetUrl: crawl.targetUrl,
    finalUrl: crawl.finalUrl,
    pageLimit,
    pagesChecked: crawl.pagesChecked,
    pagesDiscovered,
    partial,
    inventory: crawl.inventory,
    selectedPages: crawl.selectedPages,
    pages: crawl.pages,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    performance: options.performance ?? null,
    startedAt,
    finishedAt,
  });
}

function normalizePageLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 10;
  return Math.max(1, Math.min(10, Math.floor(value)));
}
