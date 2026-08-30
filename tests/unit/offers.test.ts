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
      priceMode: "individual",
      pageLimit: null,
    });
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
