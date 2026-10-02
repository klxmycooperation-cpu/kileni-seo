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

  it("keeps the full technical audit as one canonical offer", () => {
    const offer = getOffer("seo-audit-200");
    expect(offer).toMatchObject({
      id: "seo-audit-200",
      service: "seo-audit",
      briefType: "audit",
      price: 29_000,
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
      title: "Технический SEO-аудит",
      duration: "5–7 рабочих дней",
    });
    expect(localizedOffer(offer!, "ru").scope).toContain("200 страниц");
  });

  it("names the paid audits by their result while keeping page limits visible", () => {
    expect(offersForService("seo-audit")
      .filter((offer) => ["seo-audit-50", "seo-audit-200", "seo-audit-500"].includes(offer.id))
      .map((offer) => localizedOffer(offer, "ru").title))
      .toEqual(["Проверка ключевых страниц", "Технический SEO-аудит", "SEO-аудит с планом продвижения"]);
    for (const id of ["seo-audit-50", "seo-audit-200", "seo-audit-500"]) {
      const offer = getOffer(id)!;
      expect(localizedOffer(offer, "ru").scope).toContain(String(offer.pageLimit));
    }
  });

  it("distinguishes the catalogue from online payment and delivery", () => {
    const offer = getOffer("development-max")!;
    const localized = localizedOffer(offer, "ru");
    expect(offer.price).toBe(80_000);
    expect(localized.title).toBe("Каталог товаров");
    expect(localized.scope).toMatch(/каталог.*100 товаров.*заявк/iu);
    expect(localized.exclusions.join(" ")).toMatch(/оплат.*доставк/iu);
  });

  it("describes the deliverable of every audit package shown on the service page", () => {
    expect(localizedOffer(getOffer("seo-audit-free")!, "ru").description).toBe(
      "Получите список найденных проблем на открытых страницах и поймёте, нужна ли более подробная проверка.",
    );
    expect(localizedOffer(getOffer("seo-audit-200")!, "ru").description).toBe(
      "Проверим ошибки, которые затрагивают разные страницы сайта, и передадим разработчику задачи с адресами и критериями проверки.",
    );
    expect(localizedOffer(getOffer("seo-audit-implementation")!, "ru").description).toBe(
      "Проверим сайт, внесём согласованные исправления, покажем список изменений и повторно проверим затронутые страницы.",
    );
  });

  it("includes the agreed fixes in the audit with implementation and caps them at 12 hours", () => {
    const offer = getOffer("seo-audit-implementation")!;
    const details = localizedOffer(offer, "ru");
    expect(details.exclusions.join(" ")).toMatch(/сверх 12 часов/iu);
    expect(details.exclusions.join(" ")).not.toMatch(/внедрение исправлений не входит/iu);
    expect(offer.scopeContract).toMatchObject({ kind: "seo-audit", implementationHours: 12 });
  });

  it("records the published company-site limits and source handover in the contract", () => {
    expect(getOffer("development-business")).toMatchObject({
      pageLimit: 10,
      scopeContract: { kind: "web-development", pages: 10, templates: 5, repository: "included" },
    });
    for (const id of ["development-start", "development-business", "development-max"]) {
      expect(getOffer(id)?.scopeContract).toMatchObject({
        kind: "web-development",
        repository: "included",
        ownership: "included",
        warranty: "included",
        supportBoundary: "excluded",
      });
    }
  });

  it("sets an explicit deliverable and unit for every calculator addition", () => {
    expect(getOffer("marketplace-video-addon")).toMatchObject({
      price: 7_000,
      billingUnit: "sku",
      scopeContract: { kind: "marketplaces", skus: 1 },
    });
    expect(localizedOffer(getOffer("marketplace-video-addon")!, "ru").scope).toMatch(/15 секунд.*раунд правок/iu);
    expect(getOffer("marketplace-analytics-addon")).toMatchObject({
      price: 2_500,
      billingUnit: "month",
      scopeContract: { kind: "marketplaces", skus: 10 },
    });
    expect(localizedOffer(getOffer("marketplace-analytics-addon")!, "ru").result).toMatch(/отчёт.*10 артикул/iu);
    expect(localizedOffer(getOffer("development-account-addon")!, "ru").scope).toMatch(/один тип пользователя/iu);
    expect(localizedOffer(getOffer("development-integrations-addon")!, "ru").scope).toMatch(/одна система.*одн.*сущность/iu);
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
      "seo-audit-50": 9_000,
      "seo-audit-200": 29_000,
      "seo-audit-500": 59_000,
      "seo-audit-implementation": 49_000,
      "seo-promotion-start": 25_000,
      "seo-promotion-growth": 35_000,
      "seo-promotion-team": 60_000,
      "development-start": 30_000,
      "development-business": 70_000,
      "development-max": 80_000,
      "yandex-ads-setup": 15_000,
      "yandex-ads-support": 12_000,
      "content-article": 5_000,
      "custom-task-consultation": null,
      "marketplace-pack-10": 18_000,
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
      price: 7_000,
      billingUnit: "sku",
    });
    expect(getOffer("development-account-addon")).toMatchObject({
      availability: "calculator-addon",
      service: "web-development",
      price: 150_000,
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
      price: 2_500,
      billingUnit: "sku",
    });
    expect(getOffer("marketplace-wildberries-optimization")?.id).not.toBe("marketplace-ozon-optimization");
    expect(offerCatalog.some((offer) => offer.id.includes("megamarket"))).toBe(false);
  });

  it("keeps the ten-card calculator package in the same canonical catalog", () => {
    expect(getOffer("marketplace-pack-10")).toMatchObject({
      service: "marketplaces",
      briefType: "marketplaces",
      price: 18_000,
      pageLimit: 10,
      billingUnit: "project",
    });
  });
});
