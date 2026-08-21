import { afterEach, describe, expect, it } from "vitest";

import { priceLabel } from "../../src/config/price-labels";
import {
  formatPrice,
  getEnglishPriceConfig,
  prices,
} from "../../src/config/prices";

const originalCurrency = process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY;
const originalRate = process.env.NEXT_PUBLIC_EN_PRICE_RATE;

afterEach(() => {
  if (originalCurrency === undefined) delete process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY;
  else process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY = originalCurrency;
  if (originalRate === undefined) delete process.env.NEXT_PUBLIC_EN_PRICE_RATE;
  else process.env.NEXT_PUBLIC_EN_PRICE_RATE = originalRate;
});

describe("English price labels", () => {
  it("does not invent an exchange rate when no English currency is configured", () => {
    delete process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY;
    delete process.env.NEXT_PUBLIC_EN_PRICE_RATE;

    expect(getEnglishPriceConfig()).toBeUndefined();
    expect(priceLabel("audit-preliminary", "en").current).toBe("Free");
    expect(priceLabel("seo-base", "en").current).toBe("Individual estimate");
    expect(priceLabel("dev-commerce", "en").current).toBe("Individual estimate");
  });

  it("does not convert English prices from public environment variables", () => {
    process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY = "USD";
    process.env.NEXT_PUBLIC_EN_PRICE_RATE = "0.01";

    expect(getEnglishPriceConfig()).toBeUndefined();
    expect(formatPrice(prices.audits.express, "en")).toBe("Individual estimate");
    expect(priceLabel("seo-base", "en").current).toBe("Individual estimate");
    expect(priceLabel("mp-optimization", "en")).toEqual({
      current: "Individual estimate",
      note: "per SKU",
    });
  });

  it.each(["", "0", "-75", "not-a-number"])(
    "falls back to an individual estimate when NEXT_PUBLIC_EN_PRICE_RATE=%j",
    (configuredRate) => {
      process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY = "USD";
      process.env.NEXT_PUBLIC_EN_PRICE_RATE = configuredRate;

      expect(getEnglishPriceConfig()).toBeUndefined();
      expect(priceLabel("audit-express", "en").current).toBe("Individual estimate");
    },
  );

  it("keeps explicit conversion overrides numeric and in USD", () => {
    expect(formatPrice(29_900, "en", {
      perMonth: true,
      english: { currency: "USD", rate: 0.01 },
    })).toBe("$299/month");
  });
});

describe("Russian price source", () => {
  it("keeps every approved public amount unchanged", () => {
    expect(prices).toMatchObject({
      audits: { preliminary: 0, express: 6_900, full: 19_900, strategy: 29_900, implementation: { from: 49_900 } },
      seo: { base: 29_900, growth: 44_900, full: 69_900 },
      marketplaces: { audit: 2_900, optimization: 4_900, turnkey: 12_900, pack10: 39_900, support: 29_900 },
      development: { landing: 49_900, corporate: 99_900, commerce: { from: 179_900 } },
      ads: { setup: 14_900, support: 14_900 },
      content: { article: 4_900 },
    });
    expect(priceLabel("audit-full", "ru").current).toMatch(/^19\s?900\s₽$/u);
  });
});
