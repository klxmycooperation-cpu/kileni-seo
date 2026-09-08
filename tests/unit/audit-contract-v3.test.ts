import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import { classifyAnalyzedPage, classifyAuditObject } from "../../src/lib/audit/classification";
import {
  AUDIT_CONTRACT_VERSION_V3,
  AUDIT_ENGINE_VERSION_V3,
  AUDIT_RESULT_VERSION_V4,
  buildAuditContractV3,
} from "../../src/lib/audit/contract-v3";
import { selectAuditSample } from "../../src/lib/audit/sample-selector";
import type { PageAnalysis, RobotsInfo, SitemapInfo } from "../../src/lib/audit/types";
import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";

const robots: RobotsInfo = {
  url: "https://example.com/robots.txt",
  status: "found",
  httpStatus: 200,
  allowedRoot: true,
  sitemapUrls: ["https://example.com/sitemap.xml"],
  body: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
};

const sitemap: SitemapInfo = {
  status: "found",
  filesVisited: 1,
  urls: ["https://example.com/", "https://example.com/services/seo"],
  errors: [],
};

function observedPage(url: string, input: {
  schema?: string;
  title?: string;
  h1?: string;
  noindex?: boolean;
} = {}): PageAnalysis {
  return analyzePage({
    url,
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html: `<!doctype html><html lang="ru"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>${input.title ?? "Понятный заголовок страницы для поисковой выдачи"}</title>
      <meta name="description" content="Подробное описание страницы, которое точно объясняет содержание и пользу посетителю сайта.">
      <link rel="canonical" href="${url}">
      ${input.noindex ? '<meta name="robots" content="noindex,follow">' : ""}
      ${input.schema ? `<script type="application/ld+json">{"@type":"${input.schema}"}</script>` : ""}
      </head><body><h1>${input.h1 ?? "Главный заголовок страницы"}</h1><a href="/">Главная</a></body></html>`,
  });
}

function fixture() {
  const pages = [
    observedPage("https://example.com/", { title: "Главная страница компании и её услуги", h1: "Компания" }),
    observedPage("https://example.com/services/seo", { schema: "Service", title: "SEO-продвижение сайта для бизнеса", h1: "SEO-продвижение" }),
    observedPage("https://example.com/blog/audit", { schema: "Article", title: "Как проверить сайт перед продвижением", h1: "Проверка сайта" }),
  ];
  const inventory = [
    classifyAuditObject({ url: robots.url, contentType: "text/plain", statusCode: 200 }),
    classifyAuditObject({ url: "https://example.com/sitemap.xml", contentType: "application/xml", statusCode: 200 }),
    ...pages.map((page) => classifyAnalyzedPage(page)),
    classifyAuditObject({ url: "https://example.com/api/catalog", contentType: "application/json", statusCode: 200 }),
  ];
  const selectedPages = selectAuditSample(
    inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      language: item.language,
      depth: item.depth,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
    })),
    10,
    { targetUrl: "https://example.com/" },
  );
  return { pages, inventory, selectedPages };
}

describe("Audit Contract v3", () => {
  it("builds one score-free snapshot with consistent inventory and sample counts", () => {
    const input = fixture();
    const contract = buildAuditContractV3({
      auditId: "audit-v4",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: "https://example.com/",
      ...input,
      robots,
      sitemap,
      performance: null,
    });

    expect(contract).toMatchObject({
      resultVersion: AUDIT_RESULT_VERSION_V4,
      contractVersion: AUDIT_CONTRACT_VERSION_V3,
      engineVersion: AUDIT_ENGINE_VERSION_V3,
      target: "https://example.com/",
      inventorySummary: {
        objectsFound: 6,
        htmlFound: 3,
        eligibleHtml: 3,
        excludedHtml: 0,
        selected: 3,
        checked: 3,
        notCompleted: 0,
        outsideSample: 0,
        representedPageTypes: 3,
      },
    });
    expect(contract).not.toHaveProperty("score");
    expect(contract).not.toHaveProperty("grade");
    expect(contract.selectedPages.map((item) => item.url)).not.toContain(robots.url);
    expect(contract.selectedPages.map((item) => item.url)).not.toContain("https://example.com/sitemap.xml");
    expect(contract.technicalResources.map((item) => item.resourceType))
      .toEqual(expect.arrayContaining(["robots", "sitemap", "api"]));
    expect(contract.resultSummary).toHaveProperty("not_applicable");
    expect(contract.resultSummary).toHaveProperty("insufficient_data");
    expect(contract.pagesDiscovered).toBe(contract.pagesEligible + contract.pagesExcluded);
    expect(contract.pagesEligible).toBe(contract.pagesSelected + contract.pagesNotCheckedTotal);
    expect(contract.pagesSelected).toBe(contract.pagesChecked + contract.pagesNotCompleted);
  });

  it("keeps technical facts precise and never calls sitemap membership indexing", () => {
    const contract = buildAuditContractV3({
      auditId: "audit-v4-copy",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: "https://example.com/",
      ...fixture(),
      robots,
      sitemap,
      performance: null,
    });
    const serialized = JSON.stringify(contract);

    expect(serialized).toContain("В sitemap обнаружено URL");
    expect(serialized).not.toMatch(/проиндексированн(?:ая|ые|ых)\s+страниц/iu);
    expect(contract.limitations).toEqual(expect.arrayContaining([
      expect.stringMatching(/фактическ.*индекс/iu),
      expect.stringMatching(/позици/iu),
      expect.stringMatching(/CTR|переход/iu),
      expect.stringMatching(/трафик|посещаем/iu),
    ]));
    expect(contract.technicalFileSummary).toEqual({
      robots: {
        url: "https://example.com/robots.txt",
        statusCode: 200,
        read: true,
        selectedPagesNotBlocked: null,
      },
      sitemap: {
        url: "https://example.com/sitemap.xml",
        statusCode: 200,
        parsed: true,
        discoveredUrls: 2,
        loadedUrls: 2,
        notLoadedUrls: 0,
        htmlUrls: 2,
        redirectUrls: 0,
        documentUrls: 0,
        technicalResourceUrls: 0,
        errorUrls: 0,
        skippedByTechnicalLimit: 0,
        siteUrlsOnly: true,
      },
    });
  });

  it("does not claim that technical files were read or parsed from HTTP 200 alone", () => {
    const input = fixture();
    const contract = buildAuditContractV3({
      auditId: "audit-v4-http-only",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: "https://example.com/",
      ...input,
      robots: { ...robots, body: undefined },
      sitemap: { status: "found", filesVisited: 0, urls: [], errors: [] },
      performance: null,
    });

    expect(contract.technicalFileSummary).toEqual({});
  });

  it("counts parameterized variants with a specific reason and keeps client coverage arithmetic valid", () => {
    const page = observedPage("https://example.com/catalog", {
      title: "Каталог услуг компании",
      h1: "Каталог услуг",
    });
    const inventory = [
      classifyAnalyzedPage(page),
      classifyAuditObject({
        url: "https://example.com/catalog?offer=seo-audit",
        contentType: "text/html; charset=utf-8",
        statusCode: 200,
      }),
      classifyAuditObject({
        url: "https://example.com/catalog?service=promotion",
        contentType: "text/html; charset=utf-8",
        statusCode: 200,
      }),
    ];
    const selectedPages = selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
    })), 10, { targetUrl: page.url });

    const contract = buildAuditContractV3({
      auditId: "audit-v4-query-inventory",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: page.url,
      inventory,
      selectedPages,
      pages: [page],
      robots: null,
      sitemap: null,
      performance: null,
    });

    expect(contract.inventorySummary).toMatchObject({
      objectsFound: 3,
      htmlFound: 3,
      eligibleHtml: 1,
      excludedHtml: 2,
      selected: 1,
      checked: 1,
      notCompleted: 0,
      outsideSample: 0,
    });
    expect(contract.exclusionSummary).toEqual([
      { reason: "parameterized_url", count: 2 },
    ]);
    expect(contract.excludedPages).toEqual([
      { url: "https://example.com/catalog?offer=seo-audit", reason: "parameterized_url" },
      { url: "https://example.com/catalog?service=promotion", reason: "parameterized_url" },
    ]);
    expect(contract.pagesDiscovered).toBe(contract.pagesEligible + contract.pagesExcluded);
    expect(contract.pagesEligible).toBe(contract.pagesSelected + contract.pagesNotCheckedTotal);
    expect(sanitizePublicAuditResult(contract)).not.toBeNull();
    expect(contract.selectedPages.map((item) => item.url)).toEqual(["https://example.com/catalog"]);
    expect(contract.checkedPages[0]?.pageType).toBe("category");
    expect(contract.technicalResources).toHaveLength(0);
  });

  it("separates excluded pages, pages outside the sample and unfinished selected pages", () => {
    const pages = [
      observedPage("https://example.com/"),
      observedPage("https://example.com/services"),
      observedPage("https://example.com/privacy"),
      observedPage("https://example.com/login"),
    ];
    const inventory = pages.map((page) => classifyAnalyzedPage(page));
    const selectedPages = selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
    })), 10, { targetUrl: pages[0]!.url });
    const contract = buildAuditContractV3({
      auditId: "audit-v4-coverage-arithmetic",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: pages[0]!.url,
      inventory,
      selectedPages,
      pages: pages.slice(0, 1),
      robots: null,
      sitemap: null,
      performance: null,
    });

    expect(contract).toMatchObject({
      pagesDiscovered: 4,
      pagesEligible: 2,
      pagesExcluded: 2,
      pagesSelected: 2,
      pagesChecked: 1,
      pagesNotCompleted: 1,
      pagesNotCheckedTotal: 0,
      exclusionSummary: expect.arrayContaining([
        expect.objectContaining({ reason: "technical_page", count: 1 }),
        expect.objectContaining({ reason: "closed_section", count: 1 }),
      ]),
    });
  });

  it("groups one repeated root cause instead of creating the same finding per page", () => {
    const repeated = Array.from({ length: 6 }, (_, index) => observedPage(
      `https://example.com/services/service-${index}`,
      {
        schema: "Service",
        title: "Одинаковый заголовок страницы для выдачи",
        h1: `Услуга ${index}`,
        noindex: true,
      },
    ));
    const inventory = repeated.map((page) => classifyAnalyzedPage(page));
    const selectedPages = selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      templateSignature: `${item.pageType}:${new URL(item.url).pathname}`,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
    })));
    const contract = buildAuditContractV3({
      auditId: "audit-v4-dedup",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: repeated[0]!.url,
      inventory,
      selectedPages,
      pages: repeated,
      robots: null,
      sitemap: null,
      performance: null,
    });
    const noindex = contract.findings.filter((finding) => finding.checkId === "indexability");

    expect(noindex).toHaveLength(1);
    expect(noindex[0]).toMatchObject({ affectedCount: 6 });
    expect(noindex[0]?.examples).toHaveLength(3);
    expect(contract.findings.length).toBeLessThanOrEqual(5);
  });

  it("groups the same title-length root cause even when the measured lengths differ", () => {
    const repeated = ["Коротко", "Очень длинный заголовок страницы, который заметно выходит за рекомендуемый предел и требует сокращения"]
      .map((title, index) => observedPage(`https://example.com/services/title-${index}`, {
        schema: "Service",
        title,
        h1: `Услуга ${index}`,
      }));
    const inventory = repeated.map((page) => classifyAnalyzedPage(page));
    const selectedPages = selectAuditSample(inventory.map((item) => ({
      url: item.url,
      finalUrl: item.finalUrl,
      resourceType: item.resourceType,
      pageType: item.pageType,
      templateSignature: item.templateFamily,
      classificationConfidence: item.classificationConfidence,
      classificationReasons: item.classificationReasons,
    })));
    const contract = buildAuditContractV3({
      auditId: "audit-v4-title-dedup",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: repeated[0]!.url,
      inventory,
      selectedPages,
      pages: repeated,
      robots: null,
      sitemap: null,
      performance: null,
    });

    const titleFindings = contract.findings.filter((finding) => finding.checkId === "title");
    expect(titleFindings).toHaveLength(1);
    expect(titleFindings[0]).toMatchObject({ affectedCount: 2 });
    expect(titleFindings[0]?.examples.map((example) => example.observation)).toEqual([
      expect.stringMatching(/длина:/iu),
      expect.stringMatching(/длина:/iu),
    ]);
  });

  it("deep-freezes the snapshot instead of leaving nested arrays mutable", () => {
    const contract = buildAuditContractV3({
      auditId: "audit-v4-frozen",
      createdAt: "2026-09-01T10:00:00.000Z",
      targetUrl: "https://example.com/",
      ...fixture(),
      robots,
      sitemap,
      performance: null,
    });

    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.checks)).toBe(true);
    expect(Object.isFrozen(contract.checks[0]?.evidence)).toBe(true);
    expect(() => (contract.selectedPages as unknown as unknown[]).push({})).toThrow();
  });
});
