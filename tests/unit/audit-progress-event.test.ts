import { describe, expect, it } from "vitest";

import { toAuditProgressTransition } from "../../src/lib/audit/progress-event";

describe("public audit progress transition", () => {
  it("keeps page discovery separate from selection and crawling", () => {
    expect(toAuditProgressTransition({ type: "discovery:progress", pagesDiscovered: 98 })).toEqual({
      status: "discovering_pages",
      payload: { eventKind: "pages_discovered", pagesDiscovered: 98 },
    });

    expect(toAuditProgressTransition({
      type: "selection:start",
      pagesDiscovered: 100,
      pagesEligible: 98,
      technicalFilesChecked: 2,
    })).toEqual({
      status: "crawling_pages",
      payload: {
        eventKind: "selection_started",
        pagesChecked: 0,
        pagesDiscovered: 100,
        pagesEligible: 98,
        selectionComplete: false,
        technicalFilesChecked: 2,
      },
    });

    expect(toAuditProgressTransition({
      type: "selection:complete",
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 10,
      selectedPages: [{ url: "https://example.com/pricing", pageType: "pricing", selectionReason: "conversion_support" }],
      technicalFilesChecked: 2,
    })).toEqual({
      status: "crawling_pages",
      payload: expect.objectContaining({
        eventKind: "selection_complete",
        pagesDiscovered: 100,
        pagesEligible: 98,
        pagesSelected: 10,
        pagesChecked: 0,
        selectionComplete: true,
      }),
    });
  });

  it("maps a checked page without exposing crawler queue telemetry", () => {
    expect(toAuditProgressTransition({
      type: "crawl:page_start",
      pagesChecked: 3,
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 10,
      currentUrl: "https://example.com/pricing",
      currentPageType: "pricing",
      technicalFilesChecked: 2,
      checkedUrls: ["https://example.com/"],
      failedUrls: ["https://example.com/about"],
    })).toMatchObject({
      status: "crawling_pages",
      payload: { eventKind: "page_started", pagesChecked: 3, currentUrl: "https://example.com/pricing" },
    });

    expect(toAuditProgressTransition({
      type: "crawl:page",
      pagesChecked: 4,
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 10,
      currentUrl: "https://example.com/pricing",
      currentPageType: "pricing",
      technicalFilesChecked: 2,
      checkedUrls: ["https://example.com/", "https://example.com/pricing"],
      failedUrls: ["https://example.com/about"],
    })).toEqual({
      status: "crawling_pages",
      payload: {
        eventKind: "page_checked",
        pagesChecked: 4,
        pagesDiscovered: 100,
        pagesEligible: 98,
        pagesSelected: 10,
        currentUrl: "https://example.com/pricing",
        currentPageType: "pricing",
        technicalFilesChecked: 2,
        checkedUrls: ["https://example.com/", "https://example.com/pricing"],
        failedUrls: ["https://example.com/about"],
      },
    });

    expect(toAuditProgressTransition({
      type: "crawl:progress",
      crawled: 4,
      queued: 200,
      pagesChecked: 4,
      pagesDiscovered: 100,
      limit: 10,
    })).toEqual({
      status: "crawling_pages",
      payload: { pagesChecked: 4, pagesDiscovered: 100 },
    });
  });
});
