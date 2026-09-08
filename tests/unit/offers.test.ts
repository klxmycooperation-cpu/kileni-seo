import { describe, expect, it } from "vitest";

import {
  getOffer,
  localizedOffer,
  offerCatalog,
  offersForService,
} from "../../src/config/offers";

describe("offer catalog", () => {
  it("uses stable unique identifiers", () => {
    const ids = offerCatalog.map((offer) => offer.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("seo-audit-200");
  });

  it("keeps the approved 200-page audit as one canonical offer", () => {
    const offer = getOffer("seo-audit-200");
    expect(offer).toMatchObject({
      id: "seo-audit-200",
      service: "seo-audit",
      briefType: "audit",
      price: 39_900,
      pageLimit: 200,
      billingUnit: "project",
      recommended: true,
      category: "seo-audit",
      priceType: "fixed",
      discountPrice: null,
      discountEligibility: "not-eligible",
      stackingPolicy: "not-applicable",
    });
    expect(localizedOffer(offer!, "ru")).toMatchObject({
      title: "Аудит до 200 страниц",
      duration: "5–7 рабочих дней",
    });
  });

  it("does not invent a price for an individually scoped task", () => {
    expect(getOffer("custom-task-consultation")).toMatchObject({
      price: null,
      oldPrice: null,
      discountPrice: null,
      priceType: "custom",
      pageLimit: null,
    });
  });

  it("preserves every approved core offer price", () => {
    expect(Object.fromEntries([
      "seo-audit-free",
      "seo-audit-50",
      "seo-audit-200",
      "seo-audit-500",
      "seo-audit-implementation",
      "seo-promotion-start",
      "seo-promotion-growth",
      "seo-promotion-team",
      "development-start",
      "development-business",
      "development-max",
      "yandex-ads-setup",
      "yandex-ads-support",
      "content-article",
      "custom-task-consultation",
      "marketplace-pack-10",
    ].map((id) => [id, getOffer(id)?.price]))).toEqual({
      "seo-audit-free": 0,
      "seo-audit-50": 24_900,
      "seo-audit-200": 39_900,
      "seo-audit-500": 69_900,
      "seo-audit-implementation": 49_900,
      "seo-promotion-start": 34_900,
      "seo-promotion-growth": 44_900,
      "seo-promotion-team": 69_900,
      "development-start": 59_900,
      "development-business": 99_900,
      "development-max": 189_900,
      "yandex-ads-setup": 14_900,
      "yandex-ads-support": 14_900,
      "content-article": 4_900,
      "custom-task-consultation": null,
      "marketplace-pack-10": 39_900,
    });
  });

  it("exposes the complete typed commercial contract for every offer", () => {
    const requiredFields = [
      "id",
      "service",
      "category",
      "title",
      "shortTitle",
      "description",
      "priceType",
      "price",
      "oldPrice",
      "discountPrice",
      "billingUnit",
      "pageLimit",
      "duration",
      "result",
      "features",
      "scope",
      "scopeContract",
      "exclusions",
      "recommended",
      "discountEligibility",
      "stackingPolicy",
      "briefType",
      "localeContent",
    ] as const;

    for (const offer of offerCatalog) {
      for (const field of requiredFields) expect(offer, `${offer.id}:${field}`).toHaveProperty(field);
      expect(offer).not.toHaveProperty("priceMode");
      expect(offer).not.toHaveProperty("discount");
      expect(offer.localeContent.ru.title).toBe(offer.title.ru);
      expect(offer.localeContent.en.scope).toBe(offer.scope.en);
      expect(offer.localeContent.ru.exclusions.length).toBeGreaterThan(0);
      expect(offer.localeContent.en.exclusions.length).toBeGreaterThan(0);
    }
  });

  it("exposes a service-specific scope contract for every public offer", () => {
    const requiredByService = {
      "seo-audit": ["urls", "templates", "dataSources", "searchConsoles", "region", "competitors", "deliverables", "recheck", "jsRendering", "logReview"],
      "seo-promotion": ["regions", "pages", "materials", "editHours", "publishing", "reporting", "indexingControl"],
      "web-development": ["productType", "templates", "pages", "states", "integrations", "revisions", "deployment", "repository", "ownership", "warranty", "supportBoundary"],
      marketplaces: ["platform", "skus", "frames", "sourceFiles", "publishing", "moderation", "revisions"],
      "yandex-ads": ["services", "regions", "campaigns", "groups", "goals", "optimizationFrequency", "adBudget"],
      "content-materials": ["contentType", "volume", "sources", "factCheck", "metadata", "publishing", "revisions"],
      "custom-task": ["inputs", "dependencies", "firstStage", "acceptance"],
    } as const;

    for (const offer of offerCatalog.filter((item) => item.availability === "public")) {
      expect(offer.scopeContract.kind).toBe(offer.service);
      for (const field of requiredByService[offer.service]) {
        expect(offer.scopeContract, `${offer.id}:${field}`).toHaveProperty(field);
      }
    }

    expect(getOffer("seo-promotion-growth")?.scopeContract).toMatchObject({
      kind: "seo-promotion",
      regions: 2,
      pages: 10,
      materials: 2,
      editHours: 6,
    });
    expect(getOffer("marketplace-wildberries-turnkey")?.scopeContract).toMatchObject({
      kind: "marketplaces",
      platform: "wildberries",
      skus: 1,
      frames: 6,
      publishing: "excluded",
    });
  });

  it("keeps calculator additions in the same registry without publishing them as packages", () => {
    expect(getOffer("marketplace-video-addon")).toMatchObject({
      availability: "calculator-addon",
      service: "marketplaces",
      price: 9_000,
      billingUnit: "sku",
    });
    expect(getOffer("development-account-addon")).toMatchObject({
      availability: "calculator-addon",
      service: "web-development",
      price: 140_000,
    });
    expect(offersForService("marketplaces").some((offer) => offer.id.endsWith("-addon"))).toBe(false);
    expect(offersForService("web-development").some((offer) => offer.id.endsWith("-addon"))).toBe(false);
  });

  it("returns no fallback for an unknown identifier", () => {
    expect(getOffer("missing-offer")).toBeUndefined();
  });

  it("returns the three published audit volumes in order", () => {
    expect(offersForService("seo-audit").filter((offer) => /^seo-audit-(?:50|200|500)$/u.test(offer.id)).map((offer) => offer.pageLimit)).toEqual([50, 200, 500]);
  });

  it("gives marketplace offers globally unique platform identifiers", () => {
    expect(getOffer("marketplace-ozon-optimization")).toMatchObject({
      service: "marketplaces",
      briefType: "marketplaces",
      platform: "ozon",
      price: 4_900,
      billingUnit: "sku",
    });
    expect(getOffer("marketplace-wildberries-optimization")?.id).not.toBe("marketplace-ozon-optimization");
    expect(offerCatalog.some((offer) => offer.id.includes("megamarket"))).toBe(false);
  });

  it("keeps the ten-card calculator package in the same canonical catalog", () => {
    expect(getOffer("marketplace-pack-10")).toMatchObject({
      service: "marketplaces",
      briefType: "marketplaces",
      price: 39_900,
      pageLimit: 10,
      billingUnit: "project",
    });
  });
});
