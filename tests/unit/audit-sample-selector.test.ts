import { describe, expect, it } from "vitest";

import {
  auditBusinessPriority,
  auditPrefetchPriority,
  partitionAuditSampleInventory,
  selectAuditSample,
  type AuditUrlInventoryItem,
} from "../../src/lib/audit/sample-selector";

const kileniInventory: readonly AuditUrlInventoryItem[] = [
  { url: "https://example.com/en/blog/seo-audit", depth: 2, fromSitemap: true, templateSignature: "article" },
  { url: "https://example.com/seo-promotion", depth: 1, fromSitemap: true, schemaTypes: ["Service"], templateSignature: "service-monthly" },
  { url: "https://example.com/en", depth: 1, fromSitemap: true, templateSignature: "home" },
  { url: "https://example.com/cases/eco", depth: 2, fromSitemap: true, schemaTypes: ["Article"], templateSignature: "case-detail" },
  { url: "https://example.com/marketplaces/ozon", depth: 2, fromSitemap: true, schemaTypes: ["Service"], templateSignature: "marketplace-detail" },
  { url: "https://example.com/pricing", depth: 1, fromSitemap: true, templateSignature: "pricing" },
  { url: "https://example.com/blog/seo-audit", depth: 2, fromSitemap: true, schemaTypes: ["Article"], templateSignature: "article" },
  { url: "https://example.com/services", depth: 1, fromSitemap: true, templateSignature: "services-hub" },
  { url: "https://example.com/", depth: 0, fromSitemap: true, templateSignature: "home" },
  { url: "https://example.com/en/seo-audit", depth: 2, fromSitemap: true, schemaTypes: ["Service"], templateSignature: "service-audit" },
  { url: "https://example.com/calculator", depth: 1, fromSitemap: false, templateSignature: "calculator" },
  { url: "https://example.com/web-development", depth: 1, fromSitemap: true, schemaTypes: ["Service"], templateSignature: "service-development" },
  { url: "https://example.com/seo-audit", depth: 1, fromSitemap: true, schemaTypes: ["Service"], templateSignature: "service-audit" },
];

describe("deterministic audit sample selector", () => {
  it("keeps different URLs eligible when they only share a template family", () => {
    const partition = partitionAuditSampleInventory([
      {
        url: "https://example.com/services/seo",
        finalUrl: "https://example.com/services/seo",
        resourceType: "html",
        pageType: "service",
        templateSignature: "service-detail",
      },
      {
        url: "https://example.com/services/development",
        finalUrl: "https://example.com/services/development",
        resourceType: "html",
        pageType: "service",
        templateSignature: "service-detail",
      },
    ]);

    expect(partition.eligible.map((item) => item.url)).toEqual([
      "https://example.com/services/development",
      "https://example.com/services/seo",
    ]);
    expect(partition.excluded).toEqual([]);
  });

  it("excludes a redirect alias when the final URL is also present and records the destination", () => {
    const partition = partitionAuditSampleInventory([
      {
        url: "https://example.com/services/seo",
        finalUrl: "https://example.com/services/seo",
        resourceType: "html",
        pageType: "service",
      },
      {
        url: "https://example.com/seo-old",
        finalUrl: "https://example.com/services/seo",
        resourceType: "html",
        pageType: "service",
      },
    ]);

    expect(partition.eligible).toHaveLength(1);
    expect(partition.excluded).toEqual([
      expect.objectContaining({
        reason: "redirect",
        primaryUrl: "https://example.com/services/seo",
      }),
    ]);
  });

  it("keeps a resolved destination eligible when it is represented only by the original redirect", () => {
    const inventory = [{
      url: "https://example.com/",
      finalUrl: "https://www.example.com/",
      resourceType: "html" as const,
      pageType: "homepage" as const,
    }];

    const partition = partitionAuditSampleInventory(inventory);
    const selected = selectAuditSample(inventory, 10, { targetUrl: "https://example.com/" });

    expect(partition).toMatchObject({ eligible: inventory, excluded: [] });
    expect(selected[0]?.url).toBe("https://www.example.com/");
  });

  it("excludes a page whose saved canonical explicitly points to another page", () => {
    const inventory = [
      {
        url: "https://example.com/services/seo",
        finalUrl: "https://example.com/services/seo",
        canonicalUrl: "https://example.com/services/seo",
        resourceType: "html" as const,
        pageType: "service" as const,
        templateSignature: "service-primary",
        contentFingerprint: "same-normalized-content",
      },
      {
        url: "https://example.com/services/seo-copy",
        finalUrl: "https://example.com/services/seo-copy",
        canonicalUrl: "https://example.com/services/seo",
        resourceType: "html" as const,
        pageType: "service" as const,
        templateSignature: "service-copy",
        contentFingerprint: "same-normalized-content",
      },
    ];
    const partition = partitionAuditSampleInventory(inventory);
    const selected = selectAuditSample(inventory);

    expect(partition.eligible.map((item) => item.url)).toEqual([
      "https://example.com/services/seo",
    ]);
    expect(partition.excluded).toEqual([
      expect.objectContaining({
        reason: "confirmed_duplicate",
        primaryUrl: "https://example.com/services/seo",
      }),
    ]);
    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/services/seo",
    ]);
  });

  it("keeps a unique page eligible when its non-self canonical is wrong", () => {
    const inventory = [
      {
        url: "https://example.com/services/seo",
        finalUrl: "https://example.com/services/seo",
        canonicalUrl: "https://example.com/services/seo",
        resourceType: "html" as const,
        pageType: "service" as const,
        templateSignature: "commercial-template",
        contentFingerprint: "seo-service-content",
      },
      {
        url: "https://example.com/cases/example",
        finalUrl: "https://example.com/cases/example",
        canonicalUrl: "https://example.com/services/seo",
        resourceType: "html" as const,
        pageType: "case" as const,
        templateSignature: "commercial-template",
        contentFingerprint: "case-content",
      },
    ];

    const partition = partitionAuditSampleInventory(inventory);
    const selected = selectAuditSample(inventory);

    expect(partition.excluded).toEqual([]);
    expect(partition.eligible.map((item) => item.url)).toEqual([
      "https://example.com/cases/example",
      "https://example.com/services/seo",
    ]);
    expect(selected.map((item) => item.url)).toEqual(expect.arrayContaining([
      "https://example.com/cases/example",
      "https://example.com/services/seo",
    ]));
  });

  it("uses a specific reason for parameterized URLs", () => {
    const partition = partitionAuditSampleInventory([
      {
        url: "https://example.com/brief?service=seo-audit",
        resourceType: "html",
        pageType: "utility",
      },
    ]);

    expect(partition.eligible).toEqual([]);
    expect(partition.excluded).toEqual([
      expect.objectContaining({ reason: "parameterized_url" }),
    ]);
  });

  it("replaces a stale page-type prefix instead of nesting it in templateFamily", () => {
    const selected = selectAuditSample([{
      url: "https://example.com/services/seo",
      resourceType: "html",
      pageType: "service",
      classificationConfidence: 1,
      templateSignature: "unknown:dom-main1-article1",
    }]);

    expect(selected[0]?.templateFamily).toBe("service:dom-main1-article1");
  });

  it("never spends an HTML slot on robots, sitemap, feeds, API or assets", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/robots.txt", resourceType: "robots", pageType: null },
      { url: "https://example.com/sitemap.xml", resourceType: "sitemap", pageType: null },
      { url: "https://example.com/feed.xml", resourceType: "xml_feed", pageType: null },
      { url: "https://example.com/api/items", resourceType: "api", pageType: null },
      { url: "https://example.com/logo.svg", resourceType: "image", pageType: null },
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", classificationConfidence: 1 },
      { url: "https://example.com/services/seo", resourceType: "html", pageType: "service", classificationConfidence: 0.9 },
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/services/seo",
    ]);
  });

  it("does not infer HTML eligibility for a low-confidence unknown resource", () => {
    const selected = selectAuditSample([
      {
        url: "https://example.com/download",
        resourceType: "unknown",
        pageType: null,
        classificationConfidence: 0.35,
        classificationReasons: ["content_type_missing"],
      },
    ]);

    expect(selected).toEqual([]);
  });

  it("puts the user target and safe priority URLs first", () => {
    const inventory: readonly AuditUrlInventoryItem[] = [
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", templateSignature: "home" },
      { url: "https://example.com/services", resourceType: "html", pageType: "category", templateSignature: "service-list" },
      { url: "https://example.com/services/seo", resourceType: "html", pageType: "service", templateSignature: "service-detail" },
      { url: "https://example.com/pricing", resourceType: "html", pageType: "pricing", templateSignature: "pricing" },
    ];

    const selected = selectAuditSample(inventory, 10, {
      targetUrl: "https://example.com/services/seo",
      priorityUrls: ["https://example.com/pricing"],
    });

    expect(selected.slice(0, 2)).toMatchObject([
      { url: "https://example.com/services/seo", selectionReason: "user_target" },
      { url: "https://example.com/pricing", selectionReason: "priority_url" },
    ]);
  });

  it("does not let an excluded target bypass the eligible sampling population", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", classificationConfidence: 1 },
      { url: "https://example.com/login", resourceType: "html", pageType: "auth", classificationConfidence: 0.95 },
    ], 10, { targetUrl: "https://example.com/login" });

    expect(selected.map((item) => item.url)).toEqual(["https://example.com/"]);
  });

  it("uses route hints only for planning unknown inventory and keeps cart/login out of the probe queue", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35 },
      { url: "https://example.com/catalog", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35 },
      { url: "https://example.com/catalog/phone", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35 },
      { url: "https://example.com/cart", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35 },
      { url: "https://example.com/login", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35 },
    ]);

    expect(selected.map((item) => item.url)).toEqual([
      "https://example.com/",
      "https://example.com/catalog",
      "https://example.com/catalog/phone",
    ]);
  });

  it("keeps tracking, filter, auth, account and cart URLs in inventory but out of the sample while better pages exist", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/?utm_source=test", resourceType: "html", pageType: "homepage" },
      { url: "https://example.com/catalog?sort=price", resourceType: "html", pageType: "filter" },
      { url: "https://example.com/login", resourceType: "html", pageType: "auth" },
      { url: "https://example.com/account", resourceType: "html", pageType: "account" },
      { url: "https://example.com/cart", resourceType: "html", pageType: "cart" },
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", templateSignature: "home" },
      { url: "https://example.com/services/seo", resourceType: "html", pageType: "service", templateSignature: "service" },
      { url: "https://example.com/pricing", resourceType: "html", pageType: "pricing", templateSignature: "pricing" },
      { url: "https://example.com/blog/audit", resourceType: "html", pageType: "article", templateSignature: "article" },
    ], 4);

    expect(selected.map((item) => new URL(item.url).pathname)).toEqual([
      "/",
      "/services/seo",
      "/pricing",
      "/blog/audit",
    ]);
  });

  it("returns the same ordered sample for every permutation of an unchanged inventory", () => {
    const forward = selectAuditSample(kileniInventory);
    const reverse = selectAuditSample([...kileniInventory].reverse());
    const rotated = selectAuditSample([...kileniInventory.slice(5), ...kileniInventory.slice(0, 5)]);

    expect(reverse).toEqual(forward);
    expect(rotated).toEqual(forward);
  });

  it("covers different page and template types before spending a slot on a locale duplicate", () => {
    const selected = selectAuditSample(kileniInventory);

    expect(selected.map((page) => new URL(page.url).pathname)).toEqual([
      "/",
      "/services",
      "/seo-audit",
      "/pricing",
      "/cases/eco",
      "/blog/seo-audit",
      "/marketplaces/ozon",
      "/calculator",
      "/seo-promotion",
      "/en",
    ]);
    expect(selected.at(-1)).toMatchObject({
      pageType: "alternate_locale",
      selectionReason: "alternate_locale_control",
      locale: "en",
    });
    expect(selected.slice(0, -1).every((page) => page.pageType !== "alternate_locale")).toBe(true);
  });

  it("prioritizes commercial and conversion pages before a second informational template", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", language: "ru", templateSignature: "home" },
      { url: "https://example.com/services", resourceType: "html", pageType: "category", language: "ru", templateSignature: "services-hub" },
      { url: "https://example.com/seo", resourceType: "html", pageType: "service", language: "ru", templateSignature: "service-primary" },
      { url: "https://example.com/pricing", resourceType: "html", pageType: "pricing", language: "ru", templateSignature: "pricing" },
      { url: "https://example.com/free-audit", resourceType: "html", pageType: "service", language: "ru", templateSignature: "audit-form" },
      { url: "https://example.com/brief", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "lead-form" },
      { url: "https://example.com/custom-task", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "custom-task" },
      { url: "https://example.com/contacts", resourceType: "html", pageType: "contact", language: "ru", templateSignature: "contact" },
      { url: "https://example.com/cases/result", resourceType: "html", pageType: "case", language: "ru", templateSignature: "case" },
      { url: "https://example.com/blog/guide", resourceType: "html", pageType: "article", language: "ru", templateSignature: "article" },
      { url: "https://example.com/glossary/term", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "glossary" },
      { url: "https://example.com/about", resourceType: "html", pageType: "about", language: "ru", templateSignature: "about" },
      { url: "https://example.com/en", resourceType: "html", pageType: "homepage", language: "en", templateSignature: "home" },
    ], 10, { targetUrl: "https://example.com/" });

    expect(selected.map((page) => new URL(page.url).pathname)).toEqual([
      "/",
      "/services",
      "/seo",
      "/pricing",
      "/free-audit",
      "/brief",
      "/contacts",
      "/cases/result",
      "/blog/guide",
      "/en",
    ]);
    expect(selected.map((page) => page.url)).not.toContain("https://example.com/glossary/term");
  });

  it("keeps the accepted ten-page mix when prefetch also discovers marketplace service pages", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", language: "ru", templateSignature: "home" },
      { url: "https://example.com/services", resourceType: "html", pageType: "category", language: "ru", templateSignature: "services-hub" },
      { url: "https://example.com/seo", resourceType: "html", pageType: "service", language: "ru", templateSignature: "service-primary" },
      { url: "https://example.com/pricing", resourceType: "html", pageType: "pricing", language: "ru", templateSignature: "pricing" },
      { url: "https://example.com/free-audit", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "audit-form" },
      { url: "https://example.com/brief", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "brief" },
      { url: "https://example.com/contacts", resourceType: "html", pageType: "contact", language: "ru", templateSignature: "contact" },
      { url: "https://example.com/cases/result", resourceType: "html", pageType: "case", language: "ru", templateSignature: "case" },
      { url: "https://example.com/blog/guide", resourceType: "html", pageType: "article", language: "ru", templateSignature: "article" },
      { url: "https://example.com/about", resourceType: "html", pageType: "about", language: "ru", templateSignature: "about" },
      { url: "https://example.com/marketplaces", resourceType: "html", pageType: "category", language: "ru", templateSignature: "marketplace-hub" },
      { url: "https://example.com/marketplaces/ozon", resourceType: "html", pageType: "unknown", classificationConfidence: 0.35, language: "ru", templateSignature: "marketplace-detail" },
    ], 10, { targetUrl: "https://example.com/" });

    expect(selected.map((page) => new URL(page.url).pathname)).toEqual([
      "/",
      "/services",
      "/seo",
      "/pricing",
      "/free-audit",
      "/brief",
      "/contacts",
      "/cases/result",
      "/blog/guide",
      "/about",
    ]);
  });

  it("does not mistake a glossary entry containing an audit term for a commercial page", () => {
    expect(auditBusinessPriority("https://example.com/glossary/seo-audit", "unknown")).toMatchObject({
      key: "content_hub",
    });
    expect(auditBusinessPriority("https://example.com/free-audit", "unknown")).toMatchObject({
      key: "free_audit",
    });
  });

  it("keeps knowledge routes informational during lightweight prefetch ranking", () => {
    expect(auditPrefetchPriority(
      "https://example.com/glossary/seo-audit",
      "https://example.com/",
    ).businessPriority.key).toBe("content_hub");
    expect(auditPrefetchPriority(
      "https://example.com/blog/seo-vs-ads",
      "https://example.com/",
    ).businessPriority.key).toBe("article");
    expect(auditPrefetchPriority(
      "https://example.com/marketplaces/ozon",
      "https://example.com/",
    ).businessPriority.key).toBe("primary_service");
    expect(auditPrefetchPriority(
      "https://example.com/free-audit",
      "https://example.com/",
    ).businessPriority.key).toBe("free_audit");
  });

  it("does not spend a slot on an alternate locale while a unique primary-locale type remains", () => {
    const inventory: readonly AuditUrlInventoryItem[] = [
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", language: "ru", templateSignature: "home" },
      { url: "https://example.com/services/seo", resourceType: "html", pageType: "service", language: "ru", templateSignature: "service" },
      { url: "https://example.com/pricing", resourceType: "html", pageType: "pricing", language: "ru", templateSignature: "pricing" },
      { url: "https://example.com/about", resourceType: "html", pageType: "about", language: "ru", templateSignature: "about" },
      { url: "https://example.com/blog/guide", resourceType: "html", pageType: "article", language: "ru", templateSignature: "article" },
      { url: "https://example.com/en", resourceType: "html", pageType: "homepage", language: "en", templateSignature: "home" },
      { url: "https://example.com/en/yandex-ads", resourceType: "html", pageType: "service", language: "en", templateSignature: "ads" },
    ];

    const selected = selectAuditSample(inventory, 5, { targetUrl: "https://example.com/" });

    expect(selected.map((page) => page.url)).not.toContain("https://example.com/en/yandex-ads");
    expect(new Set(selected.map((page) => page.pageType))).toEqual(new Set([
      "homepage",
      "service",
      "pricing",
      "about",
      "article",
    ]));
  });

  it("selects at most one alternate-locale page and explains when its type is missing in the primary locale", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", resourceType: "html", pageType: "homepage", language: "ru", templateSignature: "home" },
      { url: "https://example.com/services/seo", resourceType: "html", pageType: "service", language: "ru", templateSignature: "service" },
      { url: "https://example.com/en", resourceType: "html", pageType: "homepage", language: "en", templateSignature: "home" },
      { url: "https://example.com/en/catalog/item", resourceType: "html", pageType: "product", language: "en", templateSignature: "product" },
      { url: "https://example.com/en/contact", resourceType: "html", pageType: "contact", language: "en", templateSignature: "contact" },
    ], 3, { targetUrl: "https://example.com/" });

    const alternate = selected.filter((page) => page.locale === "en");
    expect(alternate).toHaveLength(1);
    expect(alternate[0]).toMatchObject({
      selectionReason: "primary_locale_type_missing",
    });
    expect(["contact", "product"]).toContain(alternate[0]?.pageType);
  });

  it("never returns more than ten URLs and annotates every selected URL", () => {
    const inventory = Array.from({ length: 30 }, (_, index) => ({
      url: `https://example.com/catalog/product-${index}`,
      depth: 2,
      fromSitemap: true,
      schemaTypes: ["Product"],
      templateSignature: `product-${index % 12}`,
    }));

    const selected = selectAuditSample(inventory);

    expect(selected).toHaveLength(10);
    expect(
      selected.every((page) => page.pageType && page.selectionReason && page.templateFamily),
    ).toBe(true);
  });

  it("does not invent incompleteness for sites with fewer than ten valid URLs", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", depth: 0 },
      { url: "https://example.com/pricing", depth: 1 },
      { url: "https://example.com/blog/article", depth: 2 },
      { url: "https://example.com/catalog/product", depth: 2, schemaTypes: ["Product"] },
    ]);

    expect(selected).toHaveLength(4);
    expect(selected.map((page) => page.pageType)).toEqual([
      "homepage",
      "conversion_support",
      "article",
      "detail",
    ]);
  });

  it("deduplicates fragments and classifies schema-backed unknown routes as detail pages", () => {
    const selected = selectAuditSample([
      { url: "https://example.com/", depth: 0 },
      { url: "https://example.com/items/42#details", depth: 2, schemaTypes: ["Product"] },
      { url: "https://example.com/items/42", depth: 3, schemaTypes: ["Product"] },
    ]);

    expect(selected).toHaveLength(2);
    expect(selected[1]).toMatchObject({
      url: "https://example.com/items/42",
      pageType: "detail",
      selectionReason: "detail_page",
    });
  });
});
