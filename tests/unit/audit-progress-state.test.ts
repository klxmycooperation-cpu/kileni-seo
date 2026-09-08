import { describe, expect, it } from "vitest";

import {
  auditNeedsResult,
  auditStreamDirective,
  decodeAuditSnapshot,
  decodeAuditSnapshotJson,
  mergeAuditSnapshot,
  nextReconnectDelay,
  shouldCloseStream,
  shouldPoll,
  type AuditProgressSnapshot,
} from "../../src/lib/audit/progress-state";
import { mergePublicAuditProgressPayloads, sanitizePublicAuditProgressPayload } from "../../src/lib/audit/public-progress";

const running: AuditProgressSnapshot = {
  status: "crawling_pages",
  pagesChecked: 4,
  pagesDiscovered: 9,
  pageLimit: 10,
  result: null,
};

describe("audit progress state", () => {
  it("does not let an older running snapshot replace a terminal result", () => {
    const completed: AuditProgressSnapshot = {
      status: "completed",
      pagesChecked: 10,
      pagesDiscovered: 14,
      pageLimit: 10,
      result: { score: 91 },
    };
    expect(mergeAuditSnapshot(completed, { ...running, status: "queued" })).toBe(completed);
  });

  it("keeps refreshing a completed snapshot until public result details arrive", () => {
    expect(auditNeedsResult({ ...running, status: "completed", result: null })).toBe(true);
    expect(auditNeedsResult({ ...running, status: "partial", result: undefined })).toBe(true);
    expect(auditNeedsResult({ ...running, status: "completed", result: { score: 91 } })).toBe(false);
    expect(auditNeedsResult({ ...running, status: "failed", result: null })).toBe(false);
  });

  it("never regresses counters or clears an existing result", () => {
    const current: AuditProgressSnapshot = {
      ...running,
      pagesChecked: 7,
      pagesDiscovered: 12,
      result: { facts: ["saved"] },
    };

    expect(mergeAuditSnapshot(current, {
      ...running,
      pagesChecked: 3,
      pagesDiscovered: 8,
      result: null,
    })).toMatchObject({
      pagesChecked: 7,
      pagesDiscovered: 12,
      result: { facts: ["saved"] },
    });
    expect(mergeAuditSnapshot(current, {
      ...running,
      pagesChecked: 8,
      pagesDiscovered: 13,
      result: { facts: ["late replacement"] },
    }).result).toEqual({ facts: ["saved"] });
  });

  it("keeps real selection data and at most three real backend events", () => {
    const selectedPages = [{ url: "https://example.com/pricing", pageType: "pricing", selectionReason: "conversion_support" }];
    const first = decodeAuditSnapshot({
      ...running,
      pagesChecked: 0,
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 1,
      selectedPages,
      selectionComplete: true,
      technicalFilesChecked: 2,
      event: "crawling_pages",
      eventKind: "selection_complete",
      eventCreatedAt: "2026-09-02T10:00:00.000Z",
    });
    expect(first).toMatchObject({ pagesEligible: 98, pagesSelected: 1, selectedPages, selectionComplete: true, technicalFilesChecked: 2 });

    const merged = ["/pricing", "/about", "/blog", "/contacts"].reduce((current, path, index) => mergeAuditSnapshot(current, decodeAuditSnapshot({
      ...running,
      pagesChecked: index + 1,
      pagesDiscovered: 100,
      pagesEligible: 98,
      pagesSelected: 10,
      selectedPages,
      selectionComplete: true,
      currentUrl: `https://example.com${path}`,
      currentPageType: "pricing",
      event: "crawling_pages",
      eventKind: "page_checked",
      eventCreatedAt: `2026-09-02T10:00:0${index + 1}.000Z`,
    })!), first!);

    expect(merged.recentEvents).toHaveLength(3);
    expect(merged.recentEvents?.map((event) => event.path)).toEqual(["/about", "/blog", "/contacts"]);
  });

  it("restores the last three sanitized backend events after a reload", () => {
    const snapshot = decodeAuditSnapshot({
      ...running,
      recentEvents: [
        { kind: "site_connected", createdAt: "2026-09-02T10:00:00.000Z" },
        { kind: "robots_checked", path: "/robots.txt", createdAt: "2026-09-02T10:00:01.000Z" },
        { kind: "selection_complete", createdAt: "2026-09-02T10:00:02.000Z" },
        { kind: "page_checked", path: "/pricing", pageType: "pricing", createdAt: "2026-09-02T10:00:03.000Z" },
      ],
    });

    expect(snapshot?.recentEvents).toEqual([
      { kind: "robots_checked", path: "/robots.txt", createdAt: "2026-09-02T10:00:01.000Z" },
      { kind: "selection_complete", createdAt: "2026-09-02T10:00:02.000Z" },
      { kind: "page_checked", path: "/pricing", pageType: "pricing", createdAt: "2026-09-02T10:00:03.000Z" },
    ]);
  });

  it("does not duplicate the current event when a reload already includes it in recent events", () => {
    const snapshot = decodeAuditSnapshot({
      ...running,
      currentUrl: "https://example.com/blog/how-to-grow",
      currentPageType: "article",
      eventKind: "page_started",
      recentEvents: [{
        kind: "page_started",
        path: "/blog/how-to-grow",
        pageType: "article",
        createdAt: "2026-09-02T10:00:03.000Z",
      }],
    });

    expect(snapshot?.recentEvents).toEqual([{
      kind: "page_started",
      path: "/blog/how-to-grow",
      pageType: "article",
      createdAt: "2026-09-02T10:00:03.000Z",
    }]);
  });

  it("keeps page outcomes by URL across reconnects and gives success precedence", () => {
    const first = decodeAuditSnapshot({
      ...running,
      pagesChecked: 0,
      checkedUrls: [],
      failedUrls: ["https://example.com/first?private=1"],
    })!;
    const second = decodeAuditSnapshot({
      ...running,
      pagesChecked: 1,
      checkedUrls: ["https://example.com/second#done"],
      failedUrls: [],
    })!;
    const retried = decodeAuditSnapshot({
      ...running,
      pagesChecked: 2,
      checkedUrls: ["https://example.com/first"],
      failedUrls: [],
    })!;

    expect(mergeAuditSnapshot(mergeAuditSnapshot(first, second), retried)).toMatchObject({
      checkedUrls: ["https://example.com/second", "https://example.com/first"],
      failedUrls: [],
    });
  });

  it("sanitizes same-host page outcomes and merges them monotonically", () => {
    const first = sanitizePublicAuditProgressPayload({
      checkedUrls: ["https://example.com/ok?tracking=1", "https://evil.example/off-domain"],
      failedUrls: ["https://example.com/fail#fragment"],
    }, "example.com", 10);
    const second = sanitizePublicAuditProgressPayload({
      checkedUrls: ["https://example.com/fail"],
    }, "example.com", 10);

    expect(first).toMatchObject({
      checkedUrls: ["https://example.com/ok"],
      failedUrls: ["https://example.com/fail"],
    });
    expect(mergePublicAuditProgressPayloads([first, second])).toMatchObject({
      checkedUrls: ["https://example.com/ok", "https://example.com/fail"],
      failedUrls: [],
    });
  });

  it("keeps a selected alternate page whose primary-locale type is missing", () => {
    const payload = sanitizePublicAuditProgressPayload({
      pagesSelected: 1,
      selectedPages: [{
        url: "https://example.com/en/product",
        pageType: "product",
        selectionReason: "primary_locale_type_missing",
      }],
    }, "example.com", 10);

    expect(payload).toMatchObject({
      pagesSelected: 1,
      selectedPages: [{
        url: "https://example.com/en/product",
        pageType: "product",
        selectionReason: "primary_locale_type_missing",
      }],
    });
  });

  it("keeps the first terminal state stable against a conflicting terminal event", () => {
    const completed: AuditProgressSnapshot = {
      ...running,
      status: "completed",
      result: { facts: ["complete"] },
    };

    expect(mergeAuditSnapshot(completed, {
      ...running,
      status: "failed",
      result: null,
    })).toBe(completed);
  });

  it("rejects malformed JSON, unknown statuses and invalid counters", () => {
    expect(decodeAuditSnapshotJson("not-json")).toBeNull();
    expect(decodeAuditSnapshot({ ...running, status: "unknown" })).toBeNull();
    expect(decodeAuditSnapshot({ ...running, pagesChecked: -1 })).toBeNull();
    expect(decodeAuditSnapshot({ ...running, pagesDiscovered: Number.NaN })).toBeNull();
    expect(decodeAuditSnapshot({ ...running, pageLimit: 1.5 })).toBeNull();
    expect(decodeAuditSnapshot(running)).toEqual(running);
  });

  it("closes terminal streams and polls only while delivery still needs data", () => {
    expect(shouldCloseStream({ ...running, status: "completed", result: { facts: [] } })).toBe(true);
    expect(shouldCloseStream(running)).toBe(false);
    expect(shouldPoll("polling", running, null)).toBe(true);
    expect(shouldPoll("live", running, null)).toBe(false);
    expect(shouldPoll("polling", { ...running, status: "failed" }, null)).toBe(false);
    expect(shouldPoll("polling", null, "not-found")).toBe(false);
  });

  it("uses a bounded reconnect delay", () => {
    expect([0, 1, 2, 3, 20].map(nextReconnectDelay)).toEqual([3_000, 5_000, 10_000, 10_000, 10_000]);
  });

  it("distinguishes named terminal and reconnect SSE events", () => {
    expect(auditStreamDirective("done")).toEqual({ close: true, refreshSnapshot: true });
    expect(auditStreamDirective("reconnect")).toEqual({ close: true, refreshSnapshot: false });
    expect(auditStreamDirective("error")).toEqual({ close: true, refreshSnapshot: false });
  });
});
