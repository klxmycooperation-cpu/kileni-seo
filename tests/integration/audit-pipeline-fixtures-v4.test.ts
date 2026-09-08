import { describe, expect, it } from "vitest";

import { finalizeAuditResultV4 } from "../../src/lib/audit/finalize-v4";
import { runPublicAudit } from "../../src/lib/audit/public-pipeline";
import type { AuditResultContractV3 } from "../../src/lib/audit/contract-v3";
import { auditPipelineSiteFixtures } from "../fixtures/audit-pipeline-sites";
import { createFixtureFetcher } from "../fixtures/audit-sites";

async function report(name: keyof typeof auditPipelineSiteFixtures): Promise<AuditResultContractV3> {
  return (await finalizedReport(name)).publicResult;
}

async function finalizedReport(name: keyof typeof auditPipelineSiteFixtures) {
  const fixture = auditPipelineSiteFixtures[name];
  const run = await runPublicAudit(fixture.target, {
    fetcher: createFixtureFetcher(fixture),
    maxPages: 10,
    now: () => new Date("2026-09-01T10:00:00.000Z"),
  });
  return finalizeAuditResultV4({
    auditId: `fixture-${name}`,
    createdAt: "2026-09-01T10:00:00.000Z",
    result: run,
  });
}

function check(result: AuditResultContractV3, checkId: string, urlPart?: string) {
  return result.checks.find((item) =>
    item.checkId === checkId && (!urlPart || item.targetUrl?.includes(urlPart))
  );
}

describe("20 current audit pipeline fixtures", () => {
  it("keeps the fixture catalogue complete", () => {
    expect(Object.keys(auditPipelineSiteFixtures)).toHaveLength(20);
  });

  it("handles a corporate site without inventing authorization", async () => {
    const result = await report("corporate");

    expect(check(result, "auth", "/services/seo")).toMatchObject({
      status: "not_applicable",
      reason: "Признаки авторизации на странице не обнаружены",
    });
  });

  it("covers store page types before cart and login", async () => {
    const result = await report("store");
    const paths = result.selectedPages.map((item) => new URL(item.url).pathname);

    expect(paths).toEqual(expect.arrayContaining(["/", "/catalog", "/catalog/phone"]));
    expect(paths).not.toEqual(expect.arrayContaining(["/cart", "/login"]));
  });

  it("does not let RU/EN copies displace different templates", async () => {
    const result = await report("multilingual");
    const selected = result.selectedPages;
    const firstEnglish = selected.findIndex((item) => item.locale === "en");
    const lastPrimaryType = Math.max(
      selected.findIndex((item) => item.pageType === "service"),
      selected.findIndex((item) => item.pageType === "article"),
    );

    expect(firstEnglish).toBeGreaterThan(lastPrimaryType);
  });

  it("uses the real number of pages on a one-page landing", async () => {
    const result = await report("landing");

    expect(result.inventorySummary).toMatchObject({ eligibleHtml: 1, selected: 1, checked: 1 });
  });

  it.each(["noRobots", "robots404"] as const)("does not turn %s into a critical failure", async (name) => {
    const result = await report(name);
    const robots = check(result, "robots-file");

    expect(robots).toMatchObject({ status: "warning" });
    expect(robots?.severity).not.toBe("critical");
  });

  it("keeps malformed robots as a syntax warning", async () => {
    const result = await report("malformedRobots");

    expect(check(result, "robots-syntax")).toMatchObject({ status: "warning" });
  });

  it("reports an absent sitemap without claiming anything about indexing", async () => {
    const result = await report("noSitemap");

    expect(check(result, "sitemap-file")).toMatchObject({ status: "warning" });
    expect(JSON.stringify(result)).not.toMatch(/проиндексированн(?:ая|ые|ых)\s+страниц/iu);
  });

  it("reads a sitemap index and stores every sitemap file as a technical resource", async () => {
    const result = await report("sitemapIndex");
    const resources = result.technicalResources.filter((item) => item.resourceType === "sitemap");

    expect(resources.map((item) => new URL(item.url).pathname)).toEqual(expect.arrayContaining([
      "/sitemap-index.xml",
      "/pages.xml",
    ]));
    expect(result.selectedPages.every((item) => !item.url.endsWith(".xml"))).toBe(true);
  });

  it("keeps documents and images out of the HTML sample and reports a foreign sitemap host", async () => {
    const result = await report("mixedSitemap");

    expect(result.technicalResources.map((item) => item.resourceType)).toEqual(expect.arrayContaining(["document", "image"]));
    expect(check(result, "sitemap-hosts")).toMatchObject({ status: "warning" });
    expect(result.selectedPages.every((item) => !/\.(?:pdf|jpg)$/iu.test(item.url))).toBe(true);
  });

  it("keeps a confirmed login form out of the public sample", async () => {
    const finalized = await finalizedReport("loginForm");
    const result = finalized.publicResult;
    const decision = finalized.fullResult.inventoryDecisions.find((item) => item.finalUrl?.endsWith("/login"));

    expect(result.selectedPages.some((item) => item.url.endsWith("/login"))).toBe(false);
    expect(check(result, "auth", "/login")).toBeUndefined();
    expect(decision).toMatchObject({ included: false, reason: "excluded_by_sampling_rules:closed_section" });
  });

  it("does not read the word account inside an ordinary service URL as authorization", async () => {
    const result = await report("accountWord");

    expect(check(result, "auth", "/accounting-services")).toMatchObject({ status: "not_applicable" });
    expect(result.checkedPages[0]).toMatchObject({ pageType: "service" });
  });

  it("does not publish a completed report when the target is entirely restricted", async () => {
    await expect(finalizedReport("restricted")).rejects.toThrow(/no eligible public html pages/i);
  });

  it("keeps query, filter and UTM variants out of selected pages", async () => {
    const finalized = await finalizedReport("trackingAndFilters");
    const result = finalized.publicResult;
    const queryDecisions = finalized.fullResult.inventoryDecisions.filter((item) => new URL(item.url).search);
    const queryContentTypeChecks = result.checks.filter((item) =>
      item.checkId === "resource-content-type" && item.targetUrl && new URL(item.targetUrl).search
    );

    expect(result.selectedPages.every((item) => !/[?&](?:sort|utm_)/iu.test(item.url))).toBe(true);
    expect(queryDecisions.length).toBeGreaterThan(0);
    expect(queryDecisions.every((item) => item.included === false)).toBe(true);
    expect(queryContentTypeChecks.length).toBeGreaterThan(0);
    expect(queryContentTypeChecks.every((item) => item.status === "not_run")).toBe(true);
    expect(result.findings.flatMap((finding) => finding.examples)
      .some((example) => example.url ? new URL(example.url).search.length > 0 : false)).toBe(false);
  });

  it("orders a different page type before a duplicate service template", async () => {
    const result = await report("duplicateTemplates");
    const paths = result.selectedPages.map((item) => new URL(item.url).pathname);

    expect(paths.indexOf("/blog/a")).toBeLessThan(paths.indexOf("/services/b"));
  });

  it("treats noindex on a service as a confirmed problem", async () => {
    const result = await report("noindexService");

    expect(check(result, "indexability", "/services/seo")).toMatchObject({ status: "fail" });
  });

  it("does not hide noindex on a selected conversion utility", async () => {
    const result = await report("noindexService");

    expect(result.selectedPages.find((item) => item.url.endsWith("/free-audit")))
      .toMatchObject({ pageType: "utility" });
    expect(check(result, "indexability", "/free-audit")).toMatchObject({
      status: "fail",
      reason: "На странице найдено правило noindex",
    });
  });

  it("does not publish a completed report for an intentional noindex login-only target", async () => {
    await expect(finalizedReport("noindexLogin")).rejects.toThrow(/no eligible public html pages/i);
  });

  it("acceptance A: keeps a small no-sitemap landing factual and scopes form checks", async () => {
    const result = await report("acceptanceLanding");
    const formChecks = result.checks.filter((item) => item.checkId === "forms");
    const authChecks = result.checks.filter((item) => item.checkId === "auth");

    expect(result.inventorySummary).toMatchObject({
      htmlFound: 3,
      eligibleHtml: 3,
      selected: 3,
      checked: 3,
      outsideSample: 0,
    });
    expect(result.selectedPages.map((item) => new URL(item.url).pathname)).toEqual([
      "/",
      "/services/launch",
      "/contact",
    ]);
    expect(check(result, "sitemap-file")).toMatchObject({ status: "warning", severity: "medium" });
    expect(result.checks.filter((item) => item.checkId === "title" && item.status === "fail"))
      .toEqual([expect.objectContaining({ targetUrl: "https://fixture-acceptance-landing.test/services/launch" })]);
    expect(formChecks).toHaveLength(3);
    expect(formChecks.find((item) => item.targetUrl?.endsWith("/contact"))).toMatchObject({ status: "pass" });
    expect(formChecks.filter((item) => !item.targetUrl?.endsWith("/contact")))
      .toEqual(expect.arrayContaining([expect.objectContaining({ status: "not_applicable" })]));
    expect(authChecks).toHaveLength(3);
    expect(authChecks.every((item) => item.status === "not_applicable")).toBe(true);
  });

  it("acceptance B: prioritizes commercial store pages and distinguishes intentional from erroneous noindex", async () => {
    const finalized = await finalizedReport("acceptanceStore");
    const result = finalized.publicResult;
    const selectedPaths = result.selectedPages.map((item) => new URL(item.url).pathname);
    const excludedByPath = new Map(finalized.fullResult.inventoryDecisions
      .filter((item) => !item.included)
      .map((item) => [new URL(item.url).pathname + new URL(item.url).search, item.reason]));
    const productChecks = result.checks.filter((item) => item.checkId === "product-schema");
    const authSignalPaths = finalized.fullResult.inventory
      .filter((item) => item.resourceType === "html" && item.authSignals.length > 0)
      .map((item) => new URL(item.finalUrl).pathname)
      .sort();
    const nonAuthObjects = finalized.fullResult.inventory.filter((item) =>
      item.resourceType === "html" && !["/account", "/login"].includes(new URL(item.finalUrl).pathname)
    );

    expect(selectedPaths).toEqual([
      "/",
      "/catalog",
      "/product/blocked-phone",
      "/product/phone-a",
      "/product/phone-b",
    ]);
    expect(selectedPaths).not.toEqual(expect.arrayContaining(["/cart", "/search", "/login", "/account"]));
    expect(excludedByPath.get("/cart")).toBe("excluded_by_sampling_rules:technical_page");
    expect(excludedByPath.get("/search")).toBe("excluded_by_sampling_rules:search_page");
    expect(excludedByPath.get("/login")).toBe("excluded_by_sampling_rules:closed_section");
    expect(excludedByPath.get("/account")).toBe("excluded_by_sampling_rules:closed_section");
    expect(excludedByPath.get("/catalog?brand=one")).toBe("excluded_by_sampling_rules");
    // Login/account are recognized during passive discovery, but intentionally do
    // not enter the public SEO sample and are never submitted or authenticated.
    expect(authSignalPaths).toEqual(["/account", "/login"]);
    expect(nonAuthObjects.every((item) => item.authSignals.length === 0)).toBe(true);
    expect(productChecks.filter((item) => item.status !== "not_applicable").map((item) => new URL(item.targetUrl!).pathname).sort())
      .toEqual(["/product/blocked-phone", "/product/phone-a", "/product/phone-b"]);
    expect(check(result, "indexability", "/product/blocked-phone")).toMatchObject({ status: "fail" });
    expect(result.findings.flatMap((finding) => finding.examples).some((example) => example.url?.endsWith("/search"))).toBe(false);
    const productDecisions = finalized.fullResult.inventoryDecisions.filter((item) => item.url.includes("/product/"));
    expect(productDecisions.every((item) => item.reason !== "excluded_by_sampling_rules:confirmed_duplicate")).toBe(true);
    expect(result.selectedPages.every((item) => !/robots\.txt|sitemap\.xml/u.test(item.url))).toBe(true);
  });

  it("acceptance C: selects primary-locale types first and reports the exact canonical defect", async () => {
    const result = await report("acceptanceMultilingual");
    const selected = result.selectedPages;
    const firstAlternate = selected.findIndex((item) => item.locale === "en");
    const alternateCount = selected.filter((item) => item.locale === "en").length;
    const canonicalWarnings = result.checks.filter((item) => item.checkId === "canonical" && item.status !== "pass");

    expect(firstAlternate).toBe(selected.length - 1);
    expect(alternateCount).toBe(1);
    expect(selected.slice(0, firstAlternate).every((item) => item.locale !== "en")).toBe(true);
    expect(selected.slice(0, firstAlternate).map((item) => item.pageType))
      .toEqual(expect.arrayContaining(["homepage", "service", "pricing", "case", "article"]));
    expect(check(result, "hreflang", "/services/seo")).toMatchObject({ status: "pass" });
    expect(check(result, "hreflang", "/pricing")).toMatchObject({
      status: "not_applicable",
      reason: "Для этой страницы другая языковая версия не обнаружена",
    });
    expect(result.checks.filter((item) => item.checkId === "hreflang" && item.status === "warning"))
      .toEqual([]);
    expect(canonicalWarnings).toEqual([
      expect.objectContaining({
        targetUrl: "https://fixture-acceptance-multilingual.test/cases/localization",
        status: "warning",
        reason: "Основной адрес ведёт на другую страницу",
      }),
    ]);
  });
});
