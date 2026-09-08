const PUBLIC_EVENT_KINDS = new Set([
  "connecting",
  "site_connected",
  "robots_checked",
  "sitemap_checked",
  "pages_discovered",
  "selection_started",
  "selection_complete",
  "page_started",
  "page_checked",
  "page_failed",
  "structure_checked",
  "performance_started",
  "report_building",
]);

const PUBLIC_PAGE_TYPES = new Set([
  "homepage", "about", "service", "commercial", "conversion_support", "pricing", "contact", "category", "hub",
  "product", "detail", "case", "article", "unique", "alternate_locale", "utility", "unknown",
]);

const PUBLIC_SELECTION_REASONS = new Set([
  "homepage", "primary_commercial", "commercial_different_template", "conversion_support",
  "category_hub", "detail_page", "case_page", "article_page", "unique_template",
  "additional_important", "alternate_locale_control", "primary_locale_type_missing", "user_target", "priority_url",
]);

export function sanitizePublicAuditProgressPayload(
  value: unknown,
  normalizedDomain: string,
  pageLimit: number,
): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const result: Record<string, unknown> = {};
  for (const key of ["pagesChecked", "pagesDiscovered", "pagesEligible", "pagesSelected"] as const) {
    const maximum = key === "pagesSelected" ? pageLimit : 1_000_000;
    if (safeCount(value[key], maximum)) result[key] = value[key];
  }
  if (safeCount(value.technicalFilesChecked, 21)) result.technicalFilesChecked = value.technicalFilesChecked;
  if (typeof value.selectionComplete === "boolean") result.selectionComplete = value.selectionComplete;
  if (typeof value.eventKind === "string" && PUBLIC_EVENT_KINDS.has(value.eventKind)) result.eventKind = value.eventKind;
  if (typeof value.robotsStatus === "string" && isFileStatus(value.robotsStatus)) result.robotsStatus = value.robotsStatus;
  if (typeof value.sitemapStatus === "string" && isFileStatus(value.sitemapStatus)) result.sitemapStatus = value.sitemapStatus;
  if (typeof value.currentPageType === "string" && PUBLIC_PAGE_TYPES.has(value.currentPageType)) result.currentPageType = value.currentPageType;
  const currentUrl = safeProgressUrl(value.currentUrl, normalizedDomain);
  if (currentUrl) result.currentUrl = currentUrl;
  const checkedUrls = safeProgressUrls(value.checkedUrls, normalizedDomain, pageLimit);
  const failedUrls = safeProgressUrls(value.failedUrls, normalizedDomain, pageLimit)
    .filter((url) => !checkedUrls.includes(url));
  if (checkedUrls.length) result.checkedUrls = checkedUrls;
  if (failedUrls.length) result.failedUrls = failedUrls.slice(0, Math.max(0, pageLimit - checkedUrls.length));
  if (Array.isArray(value.selectedPages)) {
    result.selectedPages = value.selectedPages.slice(0, pageLimit).flatMap((item) => {
      if (!isRecord(item)) return [];
      const url = safeProgressUrl(item.url, normalizedDomain);
      if (!url || typeof item.pageType !== "string" || !PUBLIC_PAGE_TYPES.has(item.pageType) ||
          typeof item.selectionReason !== "string" || !PUBLIC_SELECTION_REASONS.has(item.selectionReason)) return [];
      return [{ url, pageType: item.pageType, selectionReason: item.selectionReason }];
    });
  }
  return result;
}

export function mergePublicAuditProgressPayloads(
  payloads: readonly Record<string, unknown>[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  let checkedUrls: string[] = [];
  let failedUrls: string[] = [];
  let hasCheckedUrls = false;
  let hasFailedUrls = false;
  for (const payload of payloads) {
    for (const key of ["pagesChecked", "pagesDiscovered", "pagesEligible", "pagesSelected", "technicalFilesChecked"] as const) {
      const next = payload[key];
      if (typeof next === "number") merged[key] = Math.max(typeof merged[key] === "number" ? merged[key] as number : 0, next);
    }
    for (const key of ["selectedPages", "selectionComplete", "currentUrl", "currentPageType", "eventKind", "robotsStatus", "sitemapStatus"] as const) {
      if (payload[key] !== undefined) merged[key] = payload[key];
    }
    if (payload.checkedUrls !== undefined) hasCheckedUrls = true;
    if (payload.failedUrls !== undefined) hasFailedUrls = true;
    checkedUrls = mergeUrls(checkedUrls, payload.checkedUrls);
    failedUrls = mergeUrls(failedUrls, payload.failedUrls).filter((url) => !checkedUrls.includes(url));
  }
  if (hasCheckedUrls) merged.checkedUrls = checkedUrls;
  if (hasFailedUrls) merged.failedUrls = failedUrls;
  return merged;
}

function safeProgressUrls(value: unknown, normalizedDomain: string, maximum: number): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const item of value.slice(0, maximum)) {
    const url = safeProgressUrl(item, normalizedDomain);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function mergeUrls(current: readonly string[], value: unknown): string[] {
  if (!Array.isArray(value)) return [...current];
  return [...new Set([...current, ...value.filter((item): item is string => typeof item === "string")])];
}

function safeCount(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function isFileStatus(value: string): value is "found" | "missing" | "error" {
  return value === "found" || value === "missing" || value === "error";
}

function safeProgressUrl(value: unknown, normalizedDomain: string): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    const expectedHost = normalizedDomain.toLowerCase().replace(/^www\./u, "");
    const actualHost = url.hostname.toLowerCase().replace(/^www\./u, "");
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || actualHost !== expectedHost) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
