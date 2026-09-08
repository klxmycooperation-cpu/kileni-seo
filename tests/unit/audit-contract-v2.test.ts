import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import {
  AUDIT_CHECK_REGISTRY_V2,
  evaluateAuditChecksV2,
} from "../../src/lib/audit/check-registry-v2";
import {
  AUDIT_CONTRACT_VERSION,
  AUDIT_ENGINE_VERSION_V2,
  AUDIT_RESULT_VERSION_V3,
  buildAuditContractV2,
} from "../../src/lib/audit/contract-v2";
import type { RobotsInfo, SitemapInfo } from "../../src/lib/audit/types";

const robots: RobotsInfo = {
  url: "https://example.com/robots.txt",
  status: "found",
  httpStatus: 200,
  allowedRoot: true,
  sitemapUrls: ["https://example.com/sitemap.xml"],
};

const sitemap: SitemapInfo = {
  status: "found",
  filesVisited: 1,
  urls: ["https://example.com/", "https://example.com/services"],
  errors: [],
};

function observedPage(url = "https://example.com/") {
  return analyzePage({
    url,
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin",
      "permissions-policy": "camera=()",
      "x-frame-options": "DENY",
    },
    html: `<html lang="ru"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>Проверенная страница с понятным уникальным заголовком</title>
      <meta name="description" content="Подробное и понятное описание страницы для поисковой выдачи, которое сообщает пользователю точное содержание и пользу материала.">
      <link rel="canonical" href="${url}">
      <meta property="og:title" content="Страница"><meta property="og:description" content="Описание">
      <meta property="og:image" content="https://example.com/og.jpg"><meta property="og:url" content="${url}">
      <script type="application/ld+json">{"@type":"WebPage"}</script>
      </head><body><h1>Проверенная страница</h1><h2>Подробности</h2>
      <p>${"Полезное содержание страницы с проверяемыми фактами и понятными пояснениями для посетителя. ".repeat(20)}</p>
      <a href="/services">Услуги</a><img src="image.jpg" alt="Пример" width="640" height="360">
      </body></html>`,
  });
}

describe("Audit Contract v2 registry", () => {
  it("contains exactly the 30 stable checks that the current audit can actually evaluate", () => {
    const ids = AUDIT_CHECK_REGISTRY_V2.map((check) => check.checkId);

    expect(ids).toEqual([
      "status",
      "indexable",
      "canonical",
      "robots-access",
      "robots-file",
      "sitemap",
      "charset",
      "titles",
      "title-uniqueness",
      "h1",
      "heading-hierarchy",
      "internal-links",
      "broken-internal-links",
      "language",
      "performance",
      "fcp",
      "lcp",
      "cls",
      "tbt",
      "accessibility",
      "viewport",
      "https",
      "mixed-content",
      "security-headers",
      "json-ld",
      "open-graph",
      "descriptions",
      "content-depth",
      "image-alt",
      "image-dimensions",
    ]);
    expect(new Set(ids).size).toBe(30);
    expect(AUDIT_CHECK_REGISTRY_V2.every((check) => check.checkVersion === 1)).toBe(true);
  });

  it("marks every absent Lighthouse observation as not_run rather than pass", () => {
    const checks = evaluateAuditChecksV2({
      targetUrl: "https://example.com/",
      pages: [observedPage()],
      robots,
      sitemap,
      performance: null,
    });
    const lighthouseIds = ["performance", "fcp", "lcp", "cls", "tbt", "accessibility"];

    expect(
      checks
        .filter((check) => lighthouseIds.includes(check.checkId))
        .map((check) => check.status),
    ).toEqual(Array.from({ length: 6 }, () => "not_run"));
  });

  it("never turns missing page or discovery observations into an implicit pass", () => {
    const checks = evaluateAuditChecksV2({
      targetUrl: "https://example.com/",
      pages: [],
      robots: null,
      sitemap: null,
      performance: null,
    });

    expect(checks).toHaveLength(AUDIT_CHECK_REGISTRY_V2.length);
    expect(checks.find((check) => check.checkId === "titles")?.status).toBe("insufficient_data");
    expect(checks.find((check) => check.checkId === "robots-file")?.status).toBe("insufficient_data");
    expect(checks.find((check) => check.checkId === "performance")?.status).toBe("not_run");
    expect(checks.filter((check) => check.status === "pass").map((check) => check.checkId)).toEqual([
      "https",
    ]);
  });

  it("derives pass, warning and fail from real analyzer observations with URL evidence", () => {
    const broken = analyzePage({
      url: "https://example.com/broken",
      status: 503,
      html: "<html><head></head><body><p>Коротко</p></body></html>",
    });
    const checks = evaluateAuditChecksV2({
      targetUrl: "https://example.com/",
      pages: [observedPage(), broken],
      robots,
      sitemap,
      performance: { performance: 0.72, lcpMs: 4_500 },
    });

    expect(checks.find((check) => check.checkId === "status")).toMatchObject({
      status: "fail",
      value: { passing: 1, checked: 2 },
    });
    expect(checks.find((check) => check.checkId === "performance")?.status).toBe("warning");
    expect(checks.find((check) => check.checkId === "lcp")?.status).toBe("fail");
    expect(checks.find((check) => check.checkId === "fcp")?.status).toBe("not_run");
    expect(checks.find((check) => check.checkId === "status")?.urlEvidence).toContainEqual({
      url: "https://example.com/broken",
      observation: "HTTP 503",
    });
  });
});

describe("Audit Contract v2 summary", () => {
  it("reports a complete ten-page sample without a public score even when more URLs were discovered", () => {
    const selectedPages = Array.from({ length: 10 }, (_, index) => ({
      url: index === 0 ? "https://example.com/" : `https://example.com/page-${index}`,
      pageType: index === 0 ? "homepage" as const : "unique" as const,
      selectionReason: index === 0 ? "homepage" as const : "additional_important" as const,
      templateFamily: index === 0 ? "homepage" : `page-${index}`,
      locale: null,
    }));
    const pages = selectedPages.map((selected) => observedPage(selected.url));
    const discoveredUrls = [
      ...selectedPages.map((page) => page.url),
      ...Array.from({ length: 194 }, (_, index) => `https://example.com/extra-${index}`),
    ];

    const contract = buildAuditContractV2({
      auditId: "public-token",
      createdAt: "2026-08-30T10:00:00.000Z",
      targetUrl: "https://example.com/",
      discoveredUrls,
      selectedPages,
      pages,
      robots,
      sitemap,
      performance: null,
    });

    expect(contract).toMatchObject({
      resultVersion: AUDIT_RESULT_VERSION_V3,
      contractVersion: AUDIT_CONTRACT_VERSION,
      engineVersion: AUDIT_ENGINE_VERSION_V2,
      auditId: "public-token",
      pagesDiscovered: 204,
      pagesSelected: 10,
      pagesChecked: 10,
      pagesNotCheckedTotal: 194,
      pagesNotCheckedReturned: 25,
      pagesNotCheckedTruncated: true,
      coverageStatus: "sample_complete",
      resultSummary: {
        headline: "Бесплатный лимит достигнут. Проверено 10 выбранных страниц",
      },
    });
    expect(contract).not.toHaveProperty("score");
    expect(contract).not.toHaveProperty("grade");
    expect(contract.checks).toHaveLength(30);
  });

  it("marks only an unfinished selected sample as partial", () => {
    const selectedPages = Array.from({ length: 10 }, (_, index) => ({
      url: `https://example.com/page-${index}`,
      pageType: "unique" as const,
      selectionReason: "additional_important" as const,
      templateFamily: `page-${index}`,
      locale: null,
    }));
    const pages = selectedPages.slice(0, 8).map((selected) => observedPage(selected.url));

    const contract = buildAuditContractV2({
      auditId: "partial-token",
      createdAt: "2026-08-30T10:00:00.000Z",
      targetUrl: "https://example.com/",
      discoveredUrls: selectedPages.map((page) => page.url),
      selectedPages,
      pages,
      robots,
      sitemap,
      performance: null,
    });

    expect(contract.coverageStatus).toBe("sample_partial");
    expect(contract.pagesChecked).toBe(8);
    expect(contract.pagesSelected).toBe(10);
    expect(contract.resultSummary.headline).toBe("Проверено 8 из 10 выбранных страниц");
  });

  it("bounds caller-supplied selections to the public ten-page limit", () => {
    const selectedPages = Array.from({ length: 14 }, (_, index) => ({
      url: index === 0 ? "https://example.com/" : `https://example.com/page-${index}`,
      pageType: index === 0 ? "homepage" as const : "unique" as const,
      selectionReason: index === 0 ? "homepage" as const : "additional_important" as const,
      templateFamily: `page-${index}`,
      locale: null,
    }));
    const contract = buildAuditContractV2({
      auditId: "bounded-token",
      createdAt: "2026-08-30T10:00:00.000Z",
      targetUrl: "https://example.com/",
      discoveredUrls: selectedPages.map((page) => page.url),
      selectedPages,
      pages: selectedPages.map((page) => observedPage(page.url)),
      robots,
      sitemap,
      performance: null,
    });

    expect(contract.pagesSelected).toBe(10);
    expect(contract.pagesChecked).toBe(10);
    expect(contract.selectedPages).toHaveLength(10);
    expect(contract.coverageStatus).toBe("sample_complete");
  });

  it("persists bounded public facts for every checked page without query data or internal crawl fields", () => {
    const requestedUrl = "https://example.com/service?email=private%40example.com#lead";
    const finalUrl = "https://example.com/service?utm_source=private";
    const analyzed = observedPage(requestedUrl);
    const page = {
      ...analyzed,
      title: {
        ...analyzed.title,
        value: "Связаться: private@example.com",
      },
      transport: {
        requestedUrl,
        finalUrl,
        redirects: [requestedUrl, finalUrl],
        responseTimeMs: 321,
        depth: 2,
      },
    };
    const contract = buildAuditContractV2({
      auditId: "page-facts-token",
      createdAt: "2026-08-30T10:00:00.000Z",
      targetUrl: "https://example.com/",
      discoveredUrls: [requestedUrl],
      selectedPages: [{
        url: requestedUrl,
        pageType: "commercial",
        selectionReason: "primary_commercial",
        templateFamily: "service",
        locale: "ru",
      }],
      pages: [page],
      robots,
      sitemap: { ...sitemap, urls: [finalUrl] },
      performance: null,
    });

    expect(contract.checkedPages).toHaveLength(1);
    expect(contract.checkedPages[0]).toMatchObject({
      url: "https://example.com/service",
      finalUrl: "https://example.com/service",
      http: { status: 200, ok: true, redirectCount: 2 },
      title: { value: "Связаться: [e-mail скрыт]" },
      sitemap: { status: "checked", included: true },
      internalLinks: { outgoing: 1, incomingFromCheckedPages: 0 },
    });
    expect(JSON.stringify(contract.checkedPages)).not.toMatch(
      /private%40|private@example\.com|responseTimeMs|securityHeaders|issues/iu,
    );
  });

});
