import type { AuditEvent } from "./types";

export type AuditProgressTransitionStatus =
  | "connecting"
  | "checking_robots"
  | "checking_sitemaps"
  | "discovering_pages"
  | "crawling_pages";

export type AuditProgressTransition = {
  readonly status: AuditProgressTransitionStatus;
  readonly payload: Readonly<Record<string, unknown>>;
};

/**
 * Maps internal crawler events to one safe, user-facing progress contract.
 * Worker and request-scoped runs both use this function so Timeweb and the
 * serverless fallback cannot describe the same audit differently.
 */
export function toAuditProgressTransition(event: AuditEvent): AuditProgressTransition | null {
  switch (event.type) {
    case "audit:start":
      return { status: "connecting", payload: { eventKind: "connecting" } };
    case "discovery:start":
      return { status: "checking_robots", payload: { eventKind: "site_connected" } };
    case "discovery:robots_complete":
      return {
        status: "checking_sitemaps",
        payload: {
          eventKind: "robots_checked",
          robotsStatus: event.status,
          currentUrl: event.url,
          technicalFilesChecked: event.status === "found" || event.status === "missing" ? 1 : 0,
        },
      };
    case "discovery:sitemaps_complete":
      return {
        status: "discovering_pages",
        payload: {
          eventKind: "sitemap_checked",
          sitemapStatus: event.status,
          technicalFilesChecked: event.technicalFilesChecked,
        },
      };
    case "discovery:progress":
      return {
        status: "discovering_pages",
        payload: { eventKind: "pages_discovered", pagesDiscovered: event.pagesDiscovered },
      };
    case "selection:start":
      return {
        status: "crawling_pages",
        payload: {
          eventKind: "selection_started",
          pagesChecked: 0,
          pagesDiscovered: event.pagesDiscovered,
          pagesEligible: event.pagesEligible,
          selectionComplete: false,
          technicalFilesChecked: event.technicalFilesChecked,
        },
      };
    case "selection:complete":
      return {
        status: "crawling_pages",
        payload: {
          eventKind: "selection_complete",
          pagesChecked: 0,
          pagesDiscovered: event.pagesDiscovered,
          pagesEligible: event.pagesEligible,
          pagesSelected: event.pagesSelected,
          selectedPages: event.selectedPages,
          selectionComplete: true,
          technicalFilesChecked: event.technicalFilesChecked,
        },
      };
    case "crawl:page_start":
    case "crawl:page_failed":
      return {
        status: "crawling_pages",
        payload: {
          eventKind: event.type === "crawl:page_start" ? "page_started" : "page_failed",
          pagesChecked: event.pagesChecked,
          pagesDiscovered: event.pagesDiscovered,
          pagesEligible: event.pagesEligible,
          pagesSelected: event.pagesSelected,
          currentUrl: event.currentUrl,
          currentPageType: event.currentPageType,
          technicalFilesChecked: event.technicalFilesChecked,
          checkedUrls: event.checkedUrls,
          failedUrls: event.failedUrls,
        },
      };
    case "crawl:page":
      return {
        status: "crawling_pages",
        payload: compact({
          eventKind: "page_checked",
          pagesChecked: event.pagesChecked,
          pagesDiscovered: event.pagesDiscovered,
          pagesEligible: event.pagesEligible,
          pagesSelected: event.pagesSelected,
          currentUrl: event.currentUrl,
          currentPageType: event.currentPageType,
          technicalFilesChecked: event.technicalFilesChecked,
          checkedUrls: event.checkedUrls,
          failedUrls: event.failedUrls,
        }),
      };
    case "crawl:progress":
      return {
        status: "crawling_pages",
        payload: { pagesChecked: event.pagesChecked, pagesDiscovered: event.pagesDiscovered },
      };
    case "discovery:complete":
    case "warning":
    case "audit:complete":
      return null;
  }
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
