import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import { finalizeAuditResultV3 } from "../../src/lib/audit/finalize-v3";
import { scoreAudit } from "../../src/lib/audit/scoring";
import { selectAuditSample } from "../../src/lib/audit/sample-selector";
import type { FullAuditResult } from "../../src/lib/audit/types";

function legacyInternalResult(): FullAuditResult {
  const discoveredUrls = Array.from({ length: 15 }, (_, index) =>
    index === 0 ? "https://example.com/" : `https://example.com/page-${index}`,
  );
  const selectedPages = selectAuditSample(
    discoveredUrls.map((url, index) => ({ url, depth: index === 0 ? 0 : 1, fromSitemap: true })),
    10,
  );
  const pages = selectedPages.map((selected) => analyzePage({
    url: selected.url,
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html: `<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Проверенная страница</title><meta name="description" content="Понятное описание страницы для результата аудита."><link rel="canonical" href="${selected.url}"></head><body><h1>Проверенная страница</h1></body></html>`,
  }));
  const robots = {
    url: "https://example.com/robots.txt",
    status: "found" as const,
    httpStatus: 200,
    allowedRoot: true,
    sitemapUrls: ["https://example.com/sitemap.xml"],
  };
  const sitemap = {
    status: "found" as const,
    filesVisited: 1,
    urls: discoveredUrls,
    errors: [],
  };
  const score = scoreAudit({
    targetUrl: "https://example.com/",
    pages,
    pagesDiscovered: discoveredUrls.length,
    plannedPages: selectedPages.length,
    robots,
    sitemap,
    performance: null,
  });
  return {
    resultVersion: 2,
    targetUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    pageLimit: 10,
    score,
    grade: "A",
    interpretation: "Legacy internal interpretation",
    pagesChecked: pages.length,
    pagesDiscovered: discoveredUrls.length,
    partial: true,
    coverage: score.coverage,
    issueCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    pages,
    selectedPages,
    discoveredUrls,
    issues: pages.flatMap((page) => page.issues),
    robots,
    sitemap,
    performance: null,
    startedAt: "2026-08-30T10:00:00.000Z",
    finishedAt: "2026-08-30T10:00:01.000Z",
  };
}

describe("finalizeAuditResultV3", () => {
  it("creates a new immutable score-free snapshot without reinterpreting the legacy input", () => {
    const legacy = legacyInternalResult();
    const finalized = finalizeAuditResultV3({
      auditId: "v3-public-token",
      createdAt: "2026-08-30T10:00:00.000Z",
      result: legacy,
    });

    expect(finalized.publicResult).toMatchObject({
      resultVersion: 3,
      contractVersion: 2,
      pagesSelected: 10,
      pagesChecked: 10,
      coverageStatus: "sample_complete",
    });
    expect(finalized.publicResult.checkedPages).toHaveLength(10);
    expect(finalized.publicResult.checkedPages[0]).toMatchObject({
      url: "https://example.com/",
      http: { status: 200, ok: true },
      title: { present: true },
    });
    expect(finalized.fullResult).toMatchObject({
      resultVersion: 3,
      contractVersion: 2,
      coverageStatus: "sample_complete",
      publicResult: finalized.publicResult,
    });
    expect(finalized.partial).toBe(false);
    expect(JSON.stringify(finalized)).not.toMatch(/"score"|"grade"|Legacy internal interpretation/u);
    expect(legacy).toMatchObject({ resultVersion: 2, grade: "A", partial: true });
    expect(legacy.score.total).toBeTypeOf("number");
  });
});
