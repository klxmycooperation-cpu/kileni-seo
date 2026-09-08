import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import { classifyAnalyzedPage, classifyAuditObject } from "../../src/lib/audit/classification";
import { AUDIT_RESULT_VERSION_V4 } from "../../src/lib/audit/contract-v3";
import { finalizeAuditResultV4 } from "../../src/lib/audit/finalize-v4";
import { scoreAudit } from "../../src/lib/audit/scoring";
import { selectAuditSample } from "../../src/lib/audit/sample-selector";
import type { FullAuditResult } from "../../src/lib/audit/types";

describe("finalizeAuditResultV4", () => {
  it("stores one deeply frozen score-free snapshot even when the legacy runner still supplied a score", () => {
    const page = analyzePage({
      url: "https://example.com/",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      html: '<html lang="ru"><head><meta name="viewport" content="width=device-width"><title>Главная страница компании</title><link rel="canonical" href="https://example.com/"></head><body><h1>Компания</h1></body></html>',
    });
    const robots = { url: "https://example.com/robots.txt", status: "missing" as const, httpStatus: 404, allowedRoot: true, sitemapUrls: [] };
    const sitemap = { status: "missing" as const, filesVisited: 1, urls: [], errors: [] };
    const score = scoreAudit({ targetUrl: page.url, pages: [page], pagesDiscovered: 1, plannedPages: 10, robots, sitemap, performance: null });
    const inventory = [
      classifyAnalyzedPage(page),
      classifyAuditObject({ url: "https://example.com/?utm_source=test", contentType: "text/html", statusCode: 200 }),
      classifyAuditObject({ url: "https://example.com/?sort=price", contentType: "text/html", statusCode: 200 }),
      classifyAuditObject({ url: robots.url, contentType: "text/plain", statusCode: 404 }),
      classifyAuditObject({ url: "https://example.com/sitemap.xml", contentType: "application/xml", statusCode: 404 }),
    ];
    const selectedPages = selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
    })), 10, { targetUrl: page.url });
    const legacy: FullAuditResult = {
      resultVersion: 2,
      targetUrl: page.url,
      finalUrl: page.url,
      pageLimit: 10,
      score,
      grade: "A",
      interpretation: "Legacy",
      pagesChecked: 1,
      pagesDiscovered: 1,
      partial: true,
      coverage: score.coverage,
      issueCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      pages: [page],
      selectedPages,
      discoveredUrls: [page.url],
      inventory,
      issues: [],
      robots,
      sitemap,
      performance: null,
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:01.000Z",
    };

    const finalized = finalizeAuditResultV4({
      auditId: "audit-v4",
      createdAt: legacy.startedAt,
      result: legacy,
    });

    expect(finalized.publicResult.resultVersion).toBe(AUDIT_RESULT_VERSION_V4);
    expect(JSON.stringify(finalized)).not.toMatch(/"score"|"grade"|Legacy/u);
    expect(finalized.fullResult.publicResult).toBe(finalized.publicResult);
    expect(Object.isFrozen(finalized.fullResult.inventory[0]?.classificationReasons)).toBe(true);
    expect(finalized.fullResult.inventoryDecisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: page.url, included: true, reason: "user_target" }),
      expect.objectContaining({ url: "https://example.com/?utm_source=test", included: false, reason: "excluded_by_sampling_rules:parameterized_url" }),
      expect.objectContaining({ url: "https://example.com/?sort=price", included: false, reason: "excluded_by_sampling_rules:parameterized_url" }),
      expect.objectContaining({ url: robots.url, included: false, reason: "technical_resource" }),
    ]));
    expect(finalized.publicResult.checks.filter((check) => check.targetUrl?.includes("?"))).toEqual([]);
    expect(finalized.publicResult.excludedPages).toEqual([
      expect.objectContaining({ url: "https://example.com/?sort=price", reason: "parameterized_url" }),
      expect.objectContaining({ url: "https://example.com/?utm_source=test", reason: "parameterized_url" }),
    ]);
    expect(finalized.publicResult.findings.flatMap((finding) => finding.examples)
      .some((example) => example.url?.includes("?"))).toBe(false);
  });
});
