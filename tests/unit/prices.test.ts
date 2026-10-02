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
  it("publishes the agreed starting prices for site development", () => {
    expect(prices.development.landing).toBe(30_000);
    expect(prices.development.corporate).toBe(70_000);
    expect(prices.development.commerce.from).toBe(80_000);
    expect(priceLabel("dev-commerce", "ru").current).toMatch(/^от 80\s?000\s₽$/u);
  });

  it("keeps package prices explicit and prevents a ten-card bundle from undercutting the work", () => {
    expect(prices).toMatchObject({
      audits: { preliminary: 0, express: 9_000, full: 29_000, strategy: 59_000, implementation: { from: 49_000 } },
      seo: { base: 25_000, growth: 35_000, full: 60_000 },
      marketplaces: { audit: 2_000, optimization: 2_500, turnkey: 5_900, pack10: 18_000, support: 30_000, extras: { videoPerItem: 7_000, analytics: 2_500 } },
      development: { landing: 30_000, corporate: 70_000, commerce: { from: 80_000 }, extras: { account: 150_000, integrations: 50_000 } },
      ads: { setup: 15_000, support: 12_000 },
      content: { article: 5_000 },
    });
    expect(prices.marketplaces.pack10).toBeLessThan(prices.marketplaces.optimization * 10);
    expect(prices.marketplaces.pack10).toBeGreaterThan(prices.marketplaces.optimization * 5);
    expect(priceLabel("audit-full", "ru").current).toMatch(/^29\s?000\s₽$/u);
  });
});
