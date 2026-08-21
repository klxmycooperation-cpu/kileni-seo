import { describe, expect, it } from "vitest";

import { runAudit } from "../../src/lib/audit/engine";
import {
  auditSiteFixtures,
  completePerformance,
  createFixtureFetcher,
} from "../fixtures/audit-sites";

function issueCodes(result: Awaited<ReturnType<typeof runAudit>>): string[] {
  return result.issues.map((issue) => issue.code);
}

describe("deterministic website fixtures through the injectable AuditFetcher", () => {
  it("audits a correctly configured two-page website without external network access", async () => {
    const calls: string[] = [];
    const result = await runAudit(auditSiteFixtures.correct.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.correct, calls),
      performance: completePerformance,
    });

    expect(result.pagesChecked).toBe(2);
    expect(result.pagesDiscovered).toBe(2);
    expect(result.score.total).toBe(100);
    expect(result.partial).toBe(false);
    expect(result.robots.status).toBe("found");
    expect(result.sitemap.status).toBe("found");
    expect(calls).toEqual(expect.arrayContaining([
      "https://correct.test/",
      "https://correct.test/robots.txt",
      "https://correct.test/sitemap.xml",
      "https://correct.test/about",
    ]));
  });

  it("reports a missing title from the crawled HTML", async () => {
    const result = await runAudit(auditSiteFixtures.noTitle.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.noTitle),
    });

    expect(result.pages[0]?.title.present).toBe(false);
    expect(issueCodes(result)).toContain("TITLE_MISSING");
  });

  it("reports multiple H1 headings", async () => {
    const result = await runAudit(auditSiteFixtures.multipleH1.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.multipleH1),
    });

    expect(result.pages[0]?.h1.count).toBe(2);
    expect(issueCodes(result)).toContain("H1_MULTIPLE");
  });

  it("rejects a non-HTTP canonical URL as invalid", async () => {
    const result = await runAudit(auditSiteFixtures.badCanonical.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.badCanonical),
    });

    expect(result.pages[0]?.canonical.valid).toBe(false);
    expect(issueCodes(result)).toContain("CANONICAL_INVALID");
  });

  it("keeps a failed sitemap as unavailable instead of inventing URLs", async () => {
    const result = await runAudit(auditSiteFixtures.brokenSitemap.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.brokenSitemap),
    });

    expect(result.sitemap).toMatchObject({
      status: "error",
      filesVisited: 1,
      urls: [],
    });
    expect(issueCodes(result)).toContain("SITEMAP_UNAVAILABLE");
  });

  it("adopts the final same-site hostname returned after a redirect", async () => {
    const calls: string[] = [];
    const result = await runAudit(auditSiteFixtures.redirect.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.redirect, calls),
    });

    expect(result.targetUrl).toBe("https://redirect.test/");
    expect(result.finalUrl).toBe("https://www.redirect.test/");
    expect(result.pages[0]?.url).toBe("https://www.redirect.test/");
    expect(calls).toContain("https://www.redirect.test/robots.txt");
  });

  it("reports a meta robots noindex directive", async () => {
    const result = await runAudit(auditSiteFixtures.noindex.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.noindex),
    });

    expect(result.pages[0]?.indexing.noindex).toBe(true);
    expect(issueCodes(result)).toContain("PAGE_NOINDEX");
  });

  it("preserves identical title evidence across two distinct URLs", async () => {
    const result = await runAudit(auditSiteFixtures.duplicateTitles.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.duplicateTitles),
    });

    expect(result.pages).toHaveLength(2);
    expect(new Set(result.pages.map((page) => page.url)).size).toBe(2);
    expect(new Set(result.pages.map((page) => page.title.value))).toHaveLength(1);
    expect(issueCodes(result)).toContain("TITLE_DUPLICATE");
  });

  it("records an internal HTML 404 as a checked page with its real status", async () => {
    const result = await runAudit(auditSiteFixtures.internal404.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.internal404),
    });

    expect(result.pagesDiscovered).toBe(2);
    expect(result.pagesChecked).toBe(2);
    expect(result.pages.find((page) => page.url.endsWith("/missing"))?.status).toBe(404);
    expect(issueCodes(result)).toContain("INTERNAL_404");
    expect(result.score.categories.technicalIndexing.score).toBeLessThan(
      result.score.categories.technicalIndexing.maxScore,
    );
  });

  it("normalizes a Cyrillic IDN to punycode at the fetch boundary", async () => {
    const calls: string[] = [];
    const result = await runAudit(auditSiteFixtures.idn.target, {
      fetcher: createFixtureFetcher(auditSiteFixtures.idn, calls),
    });

    expect(result.targetUrl).toBe("https://xn--e1afmkfd.xn--p1ai/");
    expect(result.finalUrl).toBe("https://xn--e1afmkfd.xn--p1ai/");
    expect(calls.every((url) => !url.includes("пример"))).toBe(true);
  });
});
