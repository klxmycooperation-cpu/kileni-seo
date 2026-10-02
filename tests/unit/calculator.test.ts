import { describe, expect, it } from "vitest";

import { calculateEstimate } from "../../src/config/calculator";

describe("calculateEstimate", () => {
  it("does not charge for regions already included in the selected SEO package", () => {
    for (const [scale, included] of [["base", 1], ["growth", 2], ["full", 3]] as const) {
      const base = calculateEstimate("seo", { scale, regions: 1 });
      expect(calculateEstimate("seo", { scale, regions: included })).toEqual(base);
      expect(calculateEstimate("seo", { scale, regions: included + 1 }).max).toBeGreaterThan(base.max);
    }
  });
  it("switches audit tiers at the published 50 and 200-page boundaries", () => {
    expect(calculateEstimate("audit", { pages: 50 })).toEqual({
      min: 9_000,
      max: 10_000,
      factors: ["сайт до 50 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 51 })).toEqual({
      min: 29_000,
      max: 34_000,
      factors: ["сайт до 200 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 201 })).toEqual({
      min: 59_000,
      max: 68_000,
      factors: ["сайт до 500 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 501 })).toEqual({
      min: 118_000,
      max: 137_000,
      factors: ["сайт более 500 страниц — предварительная оценка"],
    });
  });

  it("never estimates audit implementation below the published entry price", () => {
    expect(calculateEstimate("audit", {
      pages: 30,
      implementation: true,
    })).toEqual({
      min: 49_000,
      max: 57_000,
      factors: ["сайт до 50 страниц", "внедрение исправлений"],
    });
  });

  it("caps the SEO regional multiplier and adds optional work in the documented order", () => {
    expect(calculateEstimate("seo", {
      scale: "full",
      regions: 99,
      technical: true,
      ads: true,
    })).toEqual({
      min: 97_000,
      max: 134_000,
      factors: [
        "полное сопровождение",
        "регионы сверх включённого объёма",
        "технические работы",
        "ведение Яндекс Рекламы без бюджета",
      ],
    });
  });

  it("applies the ten-item marketplace package boundary instead of per-item pricing", () => {
    expect(calculateEstimate("marketplaces", {
      items: 10,
      package: "optimization",
    })).toEqual({
      min: 18_000,
      max: 21_000,
      factors: ["10 артикулов"],
    });
    expect(calculateEstimate("marketplaces", {
      items: 9,
      package: "optimization",
    })).toEqual({
      min: 18_000,
      max: 21_000,
      factors: ["9 артикулов"],
    });
  });

  it("adds an eleventh SKU without charging for a second ten-item package", () => {
    expect(calculateEstimate("marketplaces", {
      items: 11,
      package: "optimization",
    })).toEqual({
      min: 20_500,
      max: 24_000,
      factors: ["11 артикулов"],
    });
  });

  it("normalizes fractional and oversized counts to the published input limits", () => {
    expect(calculateEstimate("marketplaces", {
      items: 10.2,
      package: "optimization",
    })).toMatchObject({ min: 20_500, factors: ["11 артикулов"] });
    expect(calculateEstimate("marketplaces", {
      items: 1e308,
      package: "optimization",
    })).toEqual({
      min: 900_000,
      max: 1_044_000,
      factors: ["500 артикулов"],
    });
    expect(calculateEstimate("audit", { pages: -20 })).toMatchObject({
      min: 9_000,
      factors: ["сайт до 50 страниц"],
    });
  });

  it("uses the published development entry price as the estimate floor", () => {
    expect(calculateEstimate("development", { siteType: "commerce" })).toEqual({
      min: 80_000,
      max: 93_000,
      factors: ["каталог с заказом через заявку"],
    });
  });

  it("combines development additions before language and urgency multipliers", () => {
    expect(calculateEstimate("development", {
      siteType: "commerce",
      account: true,
      integrations: true,
      languages: 2,
      urgent: true,
    })).toEqual({
      min: 333_000,
      max: 460_000,
      factors: [
        "каталог с заказом через заявку",
        "личный кабинет",
        "интеграции",
        "несколько языков",
        "сжатый срок",
      ],
    });
  });

  it("uses calculator additions from the canonical offer registry", () => {
    expect(calculateEstimate("marketplaces", {
      items: 2,
      package: "audit",
      video: true,
      analytics: true,
    })).toEqual({
      min: 20_500,
      max: 24_000,
      factors: ["2 артикула", "видео", "аналитика до 10 артикулов за месяц"],
    });

    expect(calculateEstimate("development", {
      siteType: "landing",
      account: true,
      integrations: true,
    })).toEqual({
      min: 230_000,
      max: 267_000,
      factors: ["лендинг", "личный кабинет", "интеграции"],
    });
  });

  it("prices analytics by the stated ten-SKU monthly scope", () => {
    const ten = calculateEstimate("marketplaces", { items: 10, package: "audit", analytics: true });
    const eleven = calculateEstimate("marketplaces", { items: 11, package: "audit", analytics: true });
    expect(ten.factors).toContain("аналитика до 10 артикулов за месяц");
    expect(eleven.factors).toContain("аналитика до 20 артикулов за месяц");
    expect(eleven.min - calculateEstimate("marketplaces", { items: 11, package: "audit" }).min).toBe(5_000);
  });

  it("returns English explanations for the English calculator", () => {
    expect(calculateEstimate("seo", {
      scale: "base",
      regions: 2,
      technical: true,
    }, "en").factors).toEqual([
      "basic SEO support",
      "regions above the included scope",
      "technical work",
    ]);
  });
});
