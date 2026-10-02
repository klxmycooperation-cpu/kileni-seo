import { load } from "cheerio";

import { analyzePage, stableTextFingerprint } from "./analyzer";
import {
  classifyAnalyzedPage,
  classifyAuditObject,
  type ClassifiedAuditObject,
} from "./classification";
import {
  createSafeFetcher,
  type AuditFetcher,
  type SafeFetchResponse,
} from "./fetch";
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
import {
  auditPrefetchPriority,
  partitionAuditSampleInventory,
  selectAuditSample,
  type AuditUrlInventoryItem,
  type SelectedAuditUrl,
} from "./sample-selector";
import { normalizeTargetUrl } from "./url";

export interface CrawlFailure {
  readonly url: string;
  readonly error: string;
}

export interface CrawlResult {
  readonly targetUrl: string;
  readonly finalUrl: string;
  readonly pages: readonly PageAnalysis[];
  readonly selectedPages: readonly SelectedAuditUrl[];
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly discoveredUrls: readonly string[];
  readonly inventory: readonly ClassifiedAuditObject[];
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
  /** Public runs use representative sampling; direct crawler users keep BFS. */
  readonly sampleStrategy?: "breadth_first" | "representative";
  /** Already validated same-host URLs that should be sampled first. */
  readonly priorityUrls?: readonly string[];
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
  const representativeSample = options.sampleStrategy === "representative";
  const emit = async (event: AuditEvent) => options.onEvent?.(event);
  const failures: CrawlFailure[] = [];
  const pages: PageAnalysis[] = [];
  const analyzedUrls = new Set<string>();
  const classifiedObjects = new Map<string, ClassifiedAuditObject>();

  const rootResponse = await fetcher(target, { signal: options.signal });
  const finalRoot = normalizeTargetUrl(rootResponse.url);
  const siteHostname = finalRoot.hostname;
  const discoveredUrls = new Set<string>([finalRoot.href]);
  if (isHtmlResponse(rootResponse)) {
    const rootPage = analyzePage({
        url: finalRoot,
        status: rootResponse.status,
        html: rootResponse.text,
        headers: rootResponse.headers,
        requestedUrl: rootResponse.requestedUrl,
        redirects: rootResponse.redirects,
        responseTimeMs: rootResponse.elapsedMs,
        checkedAt: new Date().toISOString(),
        depth: 0,
      });
    pages.push(rootPage);
    rememberClassification(classifyAnalyzedPage(rootPage, { discoverySource: "root" }));
    analyzedUrls.add(finalRoot.href);
  }

  await emit({ type: "discovery:start" });
  const robots = await discoverRobots(finalRoot, fetcher, options.signal);
  await emit({ type: "discovery:robots_complete", status: robots.status, url: robots.url });
  const sitemap = await discoverSitemaps(finalRoot, robots, fetcher, options.signal);
  await emit({
    type: "discovery:sitemaps_complete",
    status: sitemap.status,
    technicalFilesChecked: checkedTechnicalFileCount(robots, sitemap),
  });
  await emit({ type: "discovery:complete" });

  const queue: QueueItem[] = [];
  const seen = new Set<string>([target.href, finalRoot.href]);
  rememberClassification(classifyAuditObject({
    url: robots.url,
    finalUrl: robots.url,
    contentType: robots.contentType ?? "text/plain",
    statusCode: robots.httpStatus,
    resourceHint: "robots",
    discoverySource: "technical",
  }));
  const sitemapFiles = sitemap.files?.length
    ? sitemap.files
    : [{
        url: robots.sitemapUrls[0] ?? new URL("/sitemap.xml", finalRoot).href,
        statusCode: sitemap.status === "found" ? 200 : sitemap.status === "missing" ? 404 : null,
        contentType: sitemap.status === "found" ? "application/xml" : null,
      }];
  for (const file of sitemapFiles) {
    rememberClassification(classifyAuditObject({
      url: file.url,
      finalUrl: file.url,
      contentType: file.contentType,
      statusCode: file.statusCode,
      resourceHint: "sitemap",
      discoverySource: "technical",
    }));
  }

  const rootPage = pages[0];
  if (representativeSample) return crawlRepresentativeSample();

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
      if (result.classification) {
        rememberClassification(result.classification);
      }
      if (!result.page || pages.length >= maxPages) continue;
      discoveredUrls.add(result.page.url);
      if (analyzedUrls.has(result.page.url)) continue;
      analyzedUrls.add(result.page.url);
      pages.push(result.page);
      const classification = classifyAnalyzedPage(result.page, {
        robotsAllowed: isAllowedByRobots(result.page.url, robots),
        fromSitemap: sitemap.urls.includes(result.page.url),
        discoverySource: sitemap.urls.includes(result.page.url) ? "sitemap" : "link",
      });
      rememberClassification(classification);
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

  const actualSelectedPages = selectAuditSample(
    pages.map((page) => inventoryItemForPage(page)),
    maxPages,
  );

  return {
    targetUrl: target.href,
    finalUrl: finalRoot.href,
    pages,
    selectedPages: actualSelectedPages,
    pagesChecked: pages.length,
    pagesDiscovered: discoveredUrls.size,
    discoveredUrls: [...discoveredUrls],
    inventory: [...classifiedObjects.values()].sort((left, right) => left.finalUrl.localeCompare(right.finalUrl, "en")),
    failures,
    robots,
    sitemap,
  };

  async function crawlRepresentativeSample(): Promise<CrawlResult> {
    const inventory = new Map<string, AuditUrlInventoryItem>();
    const responseCache = new Map<string, SafeFetchResponse>();
    const discoveryQueue: QueueItem[] = [];
    const queuedForDiscovery = new Set<string>();
    const fetchedForDiscovery = new Set<string>();
    const explicitPriorityUrls = new Set((options.priorityUrls ?? []).flatMap((value) => {
      try {
        return [normalizeTargetUrl(value).href];
      } catch {
        return [];
      }
    }));
    const rootLinkOrder = new Map((rootPage?.links.internalUrls ?? []).map((url, index) => [comparableUrl(url), index] as const));
    const prefetchedFamilies = new Map<string, number>();
    const discoveryFetchLimit = Math.max(30, Math.min(100, maxPages * 10));

    recordCandidate(finalRoot.href, 0, sitemap.urls.includes(finalRoot.href), rootResponse);
    for (const url of [...(options.priorityUrls ?? []).slice(0, 3)].sort()) {
      recordCandidate(url, pathDepth(url), sitemap.urls.includes(url));
    }
    for (const url of [...sitemap.urls].sort()) {
      recordCandidate(url, pathDepth(url), true);
    }
    for (const url of [...(rootPage?.links.internalUrls ?? [])].sort()) {
      recordCandidate(url, 1, sitemap.urls.includes(url));
    }
    // Keep one deterministic, lightweight exclusion probe inside the
    // prefetch budget. Without it, a commercial-first frontier can no longer
    // verify any likely legal/search/account URL and the accepted coverage
    // arithmetic changes merely because discovery became better prioritised.
    const exclusionProbeUrl = discoveryQueue
      .filter((item) => {
        const priority = auditPrefetchPriority(item.url, target.href, item.depth);
        return priority.localeRank === 0 && [
          "legal",
          "auth",
          "account",
          "cart",
          "internal_search",
          "filter",
        ].includes(priority.inferredPageType);
      })
      .sort((left, right) => left.url.localeCompare(right.url, "en"))[0]?.url;

    let discoveryFetches = 1;
    while (
      discoveryQueue.length > 0
      && discoveryFetches < discoveryFetchLimit
      && !options.signal?.aborted
    ) {
      const batch: QueueItem[] = [];
      const batchSize = Math.min(concurrency, discoveryFetchLimit - discoveryFetches);
      while (batch.length < batchSize && discoveryQueue.length > 0) {
        discoveryQueue.sort((left, right) => comparePrefetchCandidates(left, right));
        const item = discoveryQueue.shift();
        if (!item) break;
        batch.push(item);
        const family = auditPrefetchPriority(item.url, target.href, item.depth).templateFamily;
        prefetchedFamilies.set(family, (prefetchedFamilies.get(family) ?? 0) + 1);
      }
      if (batch.length === 0) break;
      if (requestDelayMs > 0) await delay(requestDelayMs, options.signal);
      discoveryFetches += batch.length;

      const results = await Promise.all(batch.map(fetchForDiscovery));
      for (let index = 0; index < results.length; index += 1) {
        const item = batch[index];
        const result = results[index];
        if (!item || !result) continue;
        if (result.failure) {
          markDiscoveryOutcome(item.url, "discovery_fetch_failed");
          failures.push(result.failure);
          await emit({ type: "warning", code: "CRAWL_FETCH_FAILED" });
          continue;
        }
        if (!result.response || !result.classification) continue;

        rememberClassification(result.classification);
        rememberInventory(result.classification, sitemap.urls.includes(item.url));
        for (const link of [...result.links].sort()) {
          recordCandidate(link, item.depth + 1, sitemap.urls.includes(link));
        }
      }

      await emit({
        type: "discovery:progress",
        pagesDiscovered: confirmedHtmlCount(inventory),
      });
    }

    if (!options.signal?.aborted && discoveryFetches >= discoveryFetchLimit) {
      for (const item of discoveryQueue) markDiscoveryOutcome(item.url, "discovery_skipped_technical_limit");
    }

    const inventoryItems = [...inventory.values()];
    const pagesDiscovered = confirmedHtmlCount(inventory);
    const pagesEligible = partitionAuditSampleInventory(
      inventoryItems.filter((item) => item.resourceType === "html"),
    ).eligible.length;
    const technicalFilesChecked = checkedTechnicalFileCount(robots, sitemap);
    await emit({
      type: "selection:start",
      pagesDiscovered,
      pagesEligible,
      technicalFilesChecked,
    });
    const selectedPages = selectAuditSample(inventoryItems, maxPages, {
      targetUrl: target.href,
      priorityUrls: options.priorityUrls,
    });
    await emit({
      type: "selection:complete",
      pagesDiscovered,
      pagesEligible,
      pagesSelected: selectedPages.length,
      selectedPages: selectedPages.map(({ url, pageType, selectionReason }) => ({ url, pageType, selectionReason })),
      technicalFilesChecked,
    });
    const checkedPages: PageAnalysis[] = [];
    const checkedUrls: string[] = [];
    const failedUrls: string[] = [];
    const emitSelectedState = (type: "crawl:page_start" | "crawl:page_failed", selected: SelectedAuditUrl) => emit({
      type,
      pagesChecked: checkedPages.length,
      pagesDiscovered,
      pagesEligible,
      pagesSelected: selectedPages.length,
      currentUrl: selected.url,
      currentPageType: selected.pageType,
      technicalFilesChecked,
      checkedUrls: [...checkedUrls],
      failedUrls: [...failedUrls],
    });
    const emitSelectedFailure = async (selected: SelectedAuditUrl) => {
      if (!failedUrls.includes(selected.url)) failedUrls.push(selected.url);
      await emitSelectedState("crawl:page_failed", selected);
    };

    for (const selected of selectedPages) {
      const isRootSelection = Boolean(rootPage)
        && [rootPage?.url, rootPage?.transport?.requestedUrl, rootPage?.transport?.finalUrl]
          .filter((value): value is string => Boolean(value))
          .some((value) => comparableUrl(value) === comparableUrl(selected.url));
      if (!isRootSelection && options.signal?.aborted) break;
      await emitSelectedState("crawl:page_start", selected);
      let response = cachedResponse(selected.url);
      if (!response) {
        if (requestDelayMs > 0) await delay(requestDelayMs, options.signal);
        try {
          response = await fetcher(selected.url, { signal: options.signal });
          cacheResponse(response);
        } catch (error) {
          failures.push({
            url: selected.url,
            error: error instanceof Error ? error.message : String(error),
          });
          await emit({ type: "warning", code: "CRAWL_FETCH_FAILED" });
          await emitSelectedFailure(selected);
          continue;
        }
      }
      if (!isHtmlResponse(response)) {
        await emitSelectedFailure(selected);
        continue;
      }

      const selectedUrl = normalizeTargetUrl(response.url);
      if (selectedUrl.hostname !== siteHostname) {
        await emitSelectedFailure(selected);
        continue;
      }
      const page = isRootSelection && rootPage
        ? rootPage
        : analyzePage({
            url: selectedUrl,
            status: response.status,
            html: response.text,
            headers: response.headers,
            requestedUrl: response.requestedUrl,
            redirects: response.redirects,
            responseTimeMs: response.elapsedMs,
            checkedAt: new Date().toISOString(),
            depth: inventory.get(selected.url)?.depth ?? pathDepth(selected.url),
          });
      const classification = classifyAnalyzedPage(page, {
        robotsAllowed: isAllowedByRobots(page.url, robots),
        fromSitemap: sitemap.urls.includes(page.url),
        discoverySource: sitemap.urls.includes(page.url)
          ? "sitemap"
          : inventory.get(selected.url)?.discoverySource ?? "link",
      });
      rememberClassification(classification);
      rememberInventory(classification, sitemap.urls.includes(page.url));
      checkedPages.push(page);
      checkedUrls.push(selected.url);
      await emit({
        type: "crawl:page",
        pagesChecked: checkedPages.length,
        pagesDiscovered,
        pagesEligible,
        pagesSelected: selectedPages.length,
        currentUrl: selected.url,
        currentPageType: selected.pageType,
        technicalFilesChecked,
        checkedUrls: [...checkedUrls],
        failedUrls: [...failedUrls],
      });
    }

    return {
      targetUrl: target.href,
      finalUrl: finalRoot.href,
      pages: checkedPages,
      selectedPages,
      pagesChecked: checkedPages.length,
      pagesDiscovered,
      discoveredUrls: [...discoveredUrls].sort(),
      inventory: [...classifiedObjects.values()].sort((left, right) => left.finalUrl.localeCompare(right.finalUrl, "en")),
      failures,
      robots,
      sitemap,
    };

    function recordCandidate(
      rawUrl: string,
      depth: number,
      fromSitemap: boolean,
      response?: SafeFetchResponse,
    ): void {
      try {
        const url = normalizeTargetUrl(rawUrl);
        if (url.hostname !== siteHostname) return;
        discoveredUrls.add(url.href);
        const robotsAllowed = isAllowedByRobots(url, robots);
        const discoverySource = url.href === finalRoot.href
          ? "root" as const
          : fromSitemap
            ? "sitemap" as const
            : explicitPriorityUrls.has(url.href)
              ? "priority" as const
              : "link" as const;
        const observed = response
          ? inspectDiscoveryResponse(response, depth, robotsAllowed, fromSitemap, discoverySource)
          : { classification: classifyAuditObject({
              url: url.href,
              depth,
              fromSitemap,
              robotsAllowed,
              discoverySource,
            }), links: [] as string[] };
        rememberClassification(observed.classification);
        rememberInventory(observed.classification, fromSitemap);
        if (response) {
          fetchedForDiscovery.add(url.href);
          if (comparableUrl(url.href) === comparableUrl(finalRoot.href)) cacheResponse(response);
          for (const link of observed.links) {
            recordCandidate(link, depth + 1, sitemap.urls.includes(link));
          }
          return;
        }
        if (
          !robotsAllowed
          || hasSamplingExcludedQuery(url)
          || !looksLikeHtmlUrl(url)
          || queuedForDiscovery.has(url.href)
          || fetchedForDiscovery.has(url.href)
        ) return;
        queuedForDiscovery.add(url.href);
        discoveryQueue.push({ url: url.href, depth });
      } catch {
        // Invalid and foreign links stay outside the public crawl frontier.
      }
    }

    async function fetchForDiscovery(item: QueueItem): Promise<{
      readonly response?: SafeFetchResponse;
      readonly classification?: ClassifiedAuditObject;
      readonly links: readonly string[];
      readonly failure?: CrawlFailure;
    }> {
      try {
        const response = await fetcher(item.url, { signal: options.signal });
        const finalUrl = normalizeTargetUrl(response.url);
        if (finalUrl.hostname !== siteHostname) return { links: [] };
        fetchedForDiscovery.add(item.url);
        const observed = inspectDiscoveryResponse(
          response,
          item.depth,
          isAllowedByRobots(finalUrl, robots),
          sitemap.urls.includes(item.url) || sitemap.urls.includes(finalUrl.href),
          sitemap.urls.includes(item.url) || sitemap.urls.includes(finalUrl.href)
            ? "sitemap"
            : explicitPriorityUrls.has(item.url)
              ? "priority"
              : "link",
        );
        return { response, ...observed };
      } catch (error) {
        return {
          links: [],
          failure: {
            url: item.url,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }

    function cacheResponse(response: SafeFetchResponse): void {
      responseCache.set(normalizeTargetUrl(response.requestedUrl).href, response);
      responseCache.set(normalizeTargetUrl(response.url).href, response);
    }

    function cachedResponse(rawUrl: string): SafeFetchResponse | undefined {
      try {
        return responseCache.get(normalizeTargetUrl(rawUrl).href);
      } catch {
        return undefined;
      }
    }

    function rememberInventory(
      classification: ClassifiedAuditObject,
      fromSitemap: boolean,
    ): void {
      const next = inventoryItemForClassification(classification, fromSitemap);
      const previous = inventory.get(classification.finalUrl);
      const nextPriority = inventoryObservationPriority(next);
      const previousPriority = previous ? inventoryObservationPriority(previous) : -1;
      if (!previous || nextPriority > previousPriority || (nextPriority === previousPriority && next.resourceType === "html")) {
        inventory.set(classification.finalUrl, next);
      } else if (fromSitemap && !previous.fromSitemap) {
        inventory.set(classification.finalUrl, { ...previous, fromSitemap: true });
      }
    }

    function markDiscoveryOutcome(rawUrl: string, reason: "discovery_fetch_failed" | "discovery_skipped_technical_limit"): void {
      const comparable = comparableUrl(rawUrl);
      for (const [key, item] of inventory) {
        if (comparableUrl(item.finalUrl ?? item.url) !== comparable && comparableUrl(item.url) !== comparable) continue;
        inventory.set(key, {
          ...item,
          classificationReasons: [...new Set([...(item.classificationReasons ?? []), reason])],
        });
      }
      for (const [key, item] of classifiedObjects) {
        if (comparableUrl(item.finalUrl) !== comparable && comparableUrl(item.url) !== comparable) continue;
        classifiedObjects.set(key, {
          ...item,
          classificationReasons: [...new Set([...item.classificationReasons, reason])],
        });
      }
    }

    function comparePrefetchCandidates(left: QueueItem, right: QueueItem): number {
      const leftPriority = auditPrefetchPriority(left.url, target.href, left.depth);
      const rightPriority = auditPrefetchPriority(right.url, target.href, right.depth);
      const leftRootLink = rootLinkOrder.get(comparableUrl(left.url));
      const rightRootLink = rootLinkOrder.get(comparableUrl(right.url));
      const leftFamilyCount = prefetchedFamilies.get(leftPriority.templateFamily) ?? 0;
      const rightFamilyCount = prefetchedFamilies.get(rightPriority.templateFamily) ?? 0;
      return (
        Number(!explicitPriorityUrls.has(left.url)) - Number(!explicitPriorityUrls.has(right.url))
        || Number(left.url !== exclusionProbeUrl) - Number(right.url !== exclusionProbeUrl)
        || leftPriority.localeRank - rightPriority.localeRank
        || leftPriority.businessPriority.rank - rightPriority.businessPriority.rank
        || Number(leftRootLink === undefined) - Number(rightRootLink === undefined)
        || leftFamilyCount - rightFamilyCount
        || leftPriority.depth - rightPriority.depth
        || (leftRootLink ?? Number.MAX_SAFE_INTEGER) - (rightRootLink ?? Number.MAX_SAFE_INTEGER)
        || leftPriority.pathname.localeCompare(rightPriority.pathname, "en")
        || left.url.localeCompare(right.url, "en")
      );
    }
  }

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
    readonly classification?: ClassifiedAuditObject;
    readonly followLinks: boolean;
    readonly failure?: CrawlFailure;
  }> {
    try {
      const response = await fetcher(item.url, { signal: options.signal });
      const finalUrl = normalizeTargetUrl(response.url);
      if (finalUrl.hostname !== siteHostname) {
        return { followLinks: false };
      }
      if (!isHtmlResponse(response)) {
        return {
          followLinks: false,
          classification: classifyAuditObject({
            url: response.requestedUrl,
            finalUrl: response.url,
            contentType: headerValue(response.headers, "content-type"),
            statusCode: response.status,
            depth: item.depth,
            redirects: response.redirects,
          }),
        };
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
          checkedAt: new Date().toISOString(),
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

  function rememberClassification(classification: ClassifiedAuditObject): void {
    const previous = classifiedObjects.get(classification.finalUrl);
    const nextPriority = classifiedObservationPriority(classification);
    const previousPriority = previous ? classifiedObservationPriority(previous) : -1;
    if (
      !previous
      || nextPriority > previousPriority
      || (nextPriority === previousPriority && classification.statusCode !== null)
    ) {
      classifiedObjects.set(classification.finalUrl, classification);
    }
  }
}

function inventoryObservationPriority(item: AuditUrlInventoryItem): number {
  const resource = item.resourceType === "html" ? 200 : item.resourceType && item.resourceType !== "unknown" ? 100 : 0;
  const page = item.pageType && item.pageType !== "unknown" ? 20 : 0;
  return resource + page + (item.classificationConfidence ?? 0);
}

function classifiedObservationPriority(item: ClassifiedAuditObject): number {
  const loaded = item.statusCode !== null ? 1_000 : 0;
  return loaded + inventoryObservationPriority(inventoryItemForClassification(item));
}

function inventoryItemForPage(
  page: PageAnalysis,
  fromSitemap = false,
): AuditUrlInventoryItem {
  const classification = classifyAnalyzedPage(page, {
    discoverySource: fromSitemap ? "sitemap" : "link",
  });
  return {
    url: page.transport?.requestedUrl ?? page.url,
    finalUrl: classification.finalUrl,
    resourceType: classification.resourceType,
    pageType: classification.pageType,
    classificationConfidence: classification.classificationConfidence,
    classificationReasons: classification.classificationReasons,
    language: classification.language,
    depth: page.transport?.depth ?? 0,
    fromSitemap,
    schemaTypes: page.structuredData.types,
    templateSignature: classification.templateFamily,
    canonicalUrl: classification.canonicalUrl,
    contentFingerprint: classification.contentFingerprint,
    discoverySource: classification.discoverySource,
  };
}

function inventoryItemForClassification(
  classification: ClassifiedAuditObject,
  fromSitemap = false,
): AuditUrlInventoryItem {
  return {
    url: classification.url,
    finalUrl: classification.finalUrl,
    resourceType: classification.resourceType,
    pageType: classification.pageType,
    classificationConfidence: classification.classificationConfidence,
    classificationReasons: classification.classificationReasons,
    language: classification.language,
    depth: classification.depth,
    fromSitemap,
    templateSignature: classification.templateFamily,
    canonicalUrl: classification.canonicalUrl,
    contentFingerprint: classification.contentFingerprint,
    discoverySource: classification.discoverySource,
  };
}

function pathDepth(rawUrl: string): number {
  try {
    return Math.max(1, new URL(rawUrl).pathname.split("/").filter(Boolean).length);
  } catch {
    return 1;
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

function headerValue(
  headers: Readonly<Record<string, string>>,
  name: string,
): string | null {
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? null;
}

function inspectDiscoveryResponse(
  response: SafeFetchResponse,
  depth: number,
  robotsAllowed: boolean,
  fromSitemap: boolean,
  discoverySource: "root" | "link" | "sitemap" | "priority" = fromSitemap ? "sitemap" : "link",
): { readonly classification: ClassifiedAuditObject; readonly links: readonly string[] } {
  if (!isHtmlResponse(response)) {
    return {
      classification: classifyAuditObject({
        url: response.requestedUrl,
        finalUrl: response.url,
        contentType: headerValue(response.headers, "content-type"),
        statusCode: response.status,
        depth,
        robotsAllowed,
        fromSitemap,
        discoverySource,
        redirects: response.redirects,
      }),
      links: [],
    };
  }

  const finalUrl = normalizeTargetUrl(response.url);
  const $ = load(response.text);
  const canonicalHref = $('link[rel~="canonical" i][href]').first().attr("href")?.trim();
  let canonicalUrl: string | null = null;
  if (canonicalHref) {
    try {
      const resolvedCanonical = new URL(canonicalHref, finalUrl);
      if (resolvedCanonical.protocol === "http:" || resolvedCanonical.protocol === "https:") {
        canonicalUrl = resolvedCanonical.href;
      }
    } catch {
      // A malformed canonical is preserved only by the full page analysis;
      // it cannot be used as proof for excluding a discovery candidate.
    }
  }
  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json" i]').each((_index, element) => {
    const source = $(element).text();
    for (const match of source.matchAll(/"@type"\s*:\s*"([^"]+)"/gu)) {
      if (match[1]) schemaTypes.add(match[1]);
    }
  });
  const links = new Set<string>();
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href || href.startsWith("#")) return;
    try {
      const resolved = normalizeTargetUrl(new URL(href, finalUrl));
      if (resolved.hostname === finalUrl.hostname) links.add(resolved.href);
    } catch {
      // Mail, phone and malformed links do not belong to the URL inventory.
    }
  });
  const children = $("body").children().toArray().slice(0, 12)
    .map((element) => element.tagName.toLowerCase())
    .join(".");
  const markers = ["nav", "main", "article", "aside", "form", "table"]
    .map((tag) => `${tag}${$(tag).length}`)
    .join("-");
  const contentRoot = $("body").clone();
  contentRoot.find("script,style,noscript,svg,template").remove();
  const contentFingerprint = stableTextFingerprint(contentRoot.text().replace(/\s+/gu, " ").trim());

  return {
    classification: classifyAuditObject({
      url: response.requestedUrl,
      finalUrl: response.url,
      contentType: headerValue(response.headers, "content-type") || "text/html",
      statusCode: response.status,
      title: $("head > title").first().text().trim(),
      h1: $("h1").toArray().map((element) => $(element).text().trim()).filter(Boolean),
      schemaTypes: [...schemaTypes],
      language: $("html").attr("lang") ?? null,
      templateSignature: `dom-${children || "empty"}-${markers}`,
      depth,
      robotsAllowed,
      fromSitemap,
      redirects: response.redirects,
      canonicalUrl,
      contentFingerprint,
      discoverySource,
      passwordInputCount: $('input[type="password" i]').length,
      loginForm: $('form input[type="password" i]').length > 0,
    }),
    links: [...links],
  };
}

function comparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.href;
  } catch {
    return value;
  }
}

function hasSamplingExcludedQuery(url: URL): boolean {
  return url.searchParams.size > 0;
}

function looksLikeHtmlUrl(url: URL): boolean {
  return !/\.(?:avif|bmp|css|csv|docx?|eot|gif|ico|jpe?g|js|json|m4a|mov|mp3|mp4|mpeg|pdf|png|pptx?|rar|rss|svg|tar|tiff?|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i.test(
    url.pathname,
  );
}

function confirmedHtmlCount(inventory: ReadonlyMap<string, AuditUrlInventoryItem>): number {
  return [...inventory.values()].filter((item) => item.resourceType === "html").length;
}

function checkedTechnicalFileCount(robots: RobotsInfo, sitemap: SitemapInfo): number {
  const robotsChecked = robots.httpStatus !== null ? 1 : 0;
  const sitemapChecked = sitemap.files?.filter((file) => file.statusCode !== null).length
    ?? (sitemap.status === "found" || sitemap.status === "missing" ? 1 : 0);
  return robotsChecked + sitemapChecked;
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
