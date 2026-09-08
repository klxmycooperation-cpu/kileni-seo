import { describe, expect, it } from "vitest";

import { calculateEstimate } from "../../src/config/calculator";

describe("calculateEstimate", () => {
  it("switches audit tiers at the published 50 and 200-page boundaries", () => {
    expect(calculateEstimate("audit", { pages: 50 })).toEqual({
      min: 24_900,
      max: 29_000,
      factors: ["сайт до 50 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 51 })).toEqual({
      min: 39_900,
      max: 46_000,
      factors: ["сайт до 200 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 201 })).toEqual({
      min: 69_900,
      max: 81_000,
      factors: ["сайт до 500 страниц"],
    });
    expect(calculateEstimate("audit", { pages: 501 })).toEqual({
      min: 139_800,
      max: 162_000,
      factors: ["сайт более 500 страниц — предварительная оценка"],
    });
  });

  it("never estimates audit implementation below the published entry price", () => {
    expect(calculateEstimate("audit", {
      pages: 30,
      implementation: true,
    })).toEqual({
      min: 49_900,
      max: 58_000,
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
      min: 114_000,
      max: 157_000,
      factors: [
        "полное сопровождение",
        "несколько регионов",
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
      min: 39_900,
      max: 46_000,
      factors: ["10 артикулов"],
    });
    expect(calculateEstimate("marketplaces", {
      items: 9,
      package: "optimization",
    })).toEqual({
      min: 39_900,
      max: 46_000,
      factors: ["9 артикулов"],
    });
  });

  it("adds an eleventh SKU without charging for a second ten-item package", () => {
    expect(calculateEstimate("marketplaces", {
      items: 11,
      package: "optimization",
    })).toEqual({
      min: 44_800,
      max: 52_000,
      factors: ["11 артикулов"],
    });
  });

  it("normalizes fractional and oversized counts to the published input limits", () => {
    expect(calculateEstimate("marketplaces", {
      items: 10.2,
      package: "optimization",
    })).toMatchObject({ min: 44_800, factors: ["11 артикулов"] });
    expect(calculateEstimate("marketplaces", {
      items: 1e308,
      package: "optimization",
    })).toEqual({
      min: 1_995_000,
      max: 2_314_000,
      factors: ["500 артикулов"],
    });
    expect(calculateEstimate("audit", { pages: -20 })).toMatchObject({
      min: 24_900,
      factors: ["сайт до 50 страниц"],
    });
  });

  it("uses the published development entry price as the estimate floor", () => {
    expect(calculateEstimate("development", { siteType: "commerce" })).toEqual({
      min: 189_900,
      max: 220_000,
      factors: ["каталог или магазин"],
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
      min: 488_000,
      max: 673_000,
      factors: [
        "каталог или магазин",
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
      min: 41_000,
      max: 57_000,
      factors: ["2 артикулов", "видео", "регулярная аналитика"],
    });

    expect(calculateEstimate("development", {
      siteType: "landing",
      account: true,
      integrations: true,
    })).toEqual({
      min: 235_000,
      max: 325_000,
      factors: ["лендинг", "личный кабинет", "интеграции"],
    });
  });

  it("returns English explanations for the English calculator", () => {
    expect(calculateEstimate("seo", {
      scale: "base",
      regions: 2,
      technical: true,
    }, "en").factors).toEqual([
      "basic SEO support",
      "multiple regions",
      "technical work",
    ]);
  });
});
