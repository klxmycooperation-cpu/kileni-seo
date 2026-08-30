import { analyzePage } from "./analyzer";
import { createSafeFetcher, type AuditFetcher } from "./fetch";
import {
  discoverRobots,
  discoverSitemaps,
  isAllowedByRobots,
} from "./discovery";
import type {
  AuditEvent,
  PageAnalysis,
  RobotsInfo,
  SitemapInfo,
} from "./types";
import { normalizeTargetUrl } from "./url";

export interface CrawlFailure {
  readonly url: string;
  readonly error: string;
}

export interface CrawlResult {
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pages: readonly PageAnalysis[];
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly discoveredUrls: readonly string[];
  readonly failures: readonly CrawlFailure[];
  readonly robots: RobotsInfo;
  readonly sitemap: SitemapInfo;
}

export interface CrawlSiteOptions {
  readonly fetcher?: AuditFetcher;
  readonly maxPages?: number;
  readonly concurrency?: number;
  readonly onEvent?: (event: AuditEvent) => void | Promise<void>;
  readonly signal?: AbortSignal;
  readonly requestDelayMs?: number;
}

interface QueueItem {
  readonly url: string;
  readonly depth: number;
}

export async function crawlSite(
  input: string | URL,
  options: CrawlSiteOptions = {},
): Promise<CrawlResult> {
  const target = normalizeTargetUrl(input);
  const fetcher = options.fetcher ?? createSafeFetcher();
  const maxPages = clampInteger(options.maxPages ?? 100, 1, 100);
  const concurrency = clampInteger(options.concurrency ?? 4, 3, 4);
  const requestDelayMs = options.fetcher ? 0 : clampInteger(options.requestDelayMs ?? 75, 0, 500);
  const emit = async (event: AuditEvent) => options.onEvent?.(event);
  const failures: CrawlFailure[] = [];
  const pages: PageAnalysis[] = [];
  const analyzedUrls = new Set<string>();

  const rootResponse = await fetcher(target, { signal: options.signal });
  const finalRoot = normalizeTargetUrl(rootResponse.url);
  const siteHostname = finalRoot.hostname;
  const discoveredUrls = new Set<string>([finalRoot.href]);
  if (isHtmlResponse(rootResponse)) {
    pages.push(
      analyzePage({
        url: finalRoot,
        status: rootResponse.status,
        html: rootResponse.text,
        headers: rootResponse.headers,
        requestedUrl: rootResponse.requestedUrl,
        redirects: rootResponse.redirects,
        responseTimeMs: rootResponse.elapsedMs,
        depth: 0,
      }),
    );
    analyzedUrls.add(finalRoot.href);
  }

  await emit({ type: "discovery:start" });
  const robots = await discoverRobots(finalRoot, fetcher, options.signal);
  await emit({ type: "discovery:robots_complete" });
  const sitemap = await discoverSitemaps(finalRoot, robots, fetcher, options.signal);
  await emit({ type: "discovery:sitemaps_complete" });
  await emit({ type: "discovery:complete" });

  const queue: QueueItem[] = [];
  const seen = new Set<string>([target.href, finalRoot.href]);
  const rootPage = pages[0];
  for (const url of sitemap.urls) enqueue(url, 1);
  if (rootResponse.ok) {
    for (const url of rootPage?.links.internalUrls ?? []) enqueue(url, 1);
  }
  let attempts = 1;
  const maxAttempts = Math.max(maxPages * 3, maxPages);

  while (queue.length > 0 && pages.length < maxPages && attempts < maxAttempts) {
    if (options.signal?.aborted) break;
    const firstDepth = queue[0]?.depth;
    if (firstDepth === undefined) break;
    const batch: QueueItem[] = [];
    while (
      batch.length < concurrency &&
      queue[0]?.depth === firstDepth &&
      attempts + batch.length < maxAttempts &&
      pages.length + batch.length < maxPages
    ) {
      const item = queue.shift();
      if (item) batch.push(item);
    }
    if (batch.length === 0) break;
    attempts += batch.length;

    if (requestDelayMs > 0) await delay(requestDelayMs, options.signal);

    const results = await Promise.all(batch.map(fetchPage));
    for (let index = 0; index < results.length; index += 1) {
      const item = batch[index];
      const result = results[index];
      if (!item || !result) continue;
      if (result.failure) {
        failures.push(result.failure);
        await emit({ type: "warning", code: "CRAWL_FETCH_FAILED" });
        continue;
      }
      if (!result.page || pages.length >= maxPages) continue;
      discoveredUrls.add(result.page.url);
      if (analyzedUrls.has(result.page.url)) continue;
      analyzedUrls.add(result.page.url);
      pages.push(result.page);
      if (result.followLinks) {
        for (const link of result.page.links.internalUrls) enqueue(link, item.depth + 1);
      }
      await emit({
        type: "crawl:page",
        pagesChecked: pages.length,
        pagesDiscovered: discoveredUrls.size,
      });
    }
    await emit({
      type: "crawl:progress",
      crawled: pages.length,
      queued: queue.length,
      pagesChecked: pages.length,
      pagesDiscovered: discoveredUrls.size,
      limit: maxPages,
    });
  }

  return {
    targetUrl: target.href,
    finalUrl: finalRoot.href,
    pages,
    pagesChecked: pages.length,
    pagesDiscovered: discoveredUrls.size,
    discoveredUrls: [...discoveredUrls],
    failures,
    robots,
    sitemap,
  };

  function enqueue(rawUrl: string, depth: number): void {
    try {
      const url = normalizeTargetUrl(rawUrl);
      if (
        url.hostname !== siteHostname ||
        !looksLikeHtmlUrl(url)
      ) {
        return;
      }
      discoveredUrls.add(url.href);
      if (seen.has(url.href) || !isAllowedByRobots(url, robots)) return;
      seen.add(url.href);
      queue.push({ url: url.href, depth });
    } catch {
      // Invalid and non-web links never enter the crawl frontier.
    }
  }

  async function fetchPage(item: QueueItem): Promise<{
    readonly page?: PageAnalysis;
    readonly followLinks: boolean;
    readonly failure?: CrawlFailure;
  }> {
    try {
      const response = await fetcher(item.url, { signal: options.signal });
      const finalUrl = normalizeTargetUrl(response.url);
      if (finalUrl.hostname !== siteHostname || !isHtmlResponse(response)) {
        return { followLinks: false };
      }
      return {
        page: analyzePage({
          url: finalUrl,
          status: response.status,
          html: response.text,
          headers: response.headers,
          requestedUrl: response.requestedUrl,
          redirects: response.redirects,
          responseTimeMs: response.elapsedMs,
          depth: item.depth,
        }),
        followLinks: response.status >= 200 && response.status < 300,
      };
    } catch (error) {
      return {
        followLinks: false,
        failure: {
          url: item.url,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

function isHtmlResponse(response: {
  readonly headers: Readonly<Record<string, string>>;
  readonly text: string;
}): boolean {
  const contentType = Object.entries(response.headers).find(
    ([key]) => key.toLowerCase() === "content-type",
  )?.[1];
  if (contentType) {
    return /(?:text\/html|application\/xhtml\+xml)/i.test(contentType);
  }
  return /^\s*(?:<!doctype\s+html|<html\b)/i.test(response.text);
}

function looksLikeHtmlUrl(url: URL): boolean {
  return !/\.(?:avif|bmp|css|csv|docx?|eot|gif|ico|jpe?g|js|json|m4a|mov|mp3|mp4|mpeg|pdf|png|pptx?|rar|rss|svg|tar|tiff?|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i.test(
    url.pathname,
  );
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return maximum;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, milliseconds);
    signal?.addEventListener("abort", done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
  });
}
