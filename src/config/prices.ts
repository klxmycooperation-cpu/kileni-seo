import type { Locale } from "./site";

export type EnglishPriceConfig = { currency: string; rate: number };

export function getEnglishPriceConfig(): EnglishPriceConfig | undefined {
  // International prices are quoted deliberately. Never turn a RUB price into a
  // public foreign-currency promise using an environment exchange rate.
  return undefined;
}

export const prices = {
  audits: {
    preliminary: 0,
    express: 9_000,
    full: 29_000,
    strategy: 59_000,
    implementation: { from: 49_000 },
  },
  seo: {
    base: 25_000,
    growth: 35_000,
    full: 60_000,
  },
  marketplaces: {
    audit: 2_000,
    optimization: 2_500,
    turnkey: 5_900,
    pack10: 18_000,
    support: 30_000,
    extras: {
      videoPerItem: 7_000,
      analytics: 2_500,
    },
  },
  development: {
    landing: 30_000,
    corporate: 70_000,
    commerce: { from: 80_000 },
    extras: {
      account: 150_000,
      integrations: 50_000,
    },
  },
  ads: {
    setup: 15_000,
    support: 12_000,
  },
  content: {
    article: 5_000,
  },
} as const;

export function formatPrice(
  value: number,
  locale: Locale,
  options: { from?: boolean; perMonth?: boolean; individual?: boolean; english?: EnglishPriceConfig } = {},
): string {
  if (options.individual) return locale === "ru" ? "Индивидуальный расчёт" : "Individual estimate";
  if (locale === "en") {
    if (value === 0) return "Free";
    const english = options.english;
    if (!english) return "Individual estimate";
    const currency = english.currency;
    const rate = english.rate;
    const converted = Math.round(value * rate);
    const amount = currency === "USD"
      ? `$${new Intl.NumberFormat("en-US").format(converted)}`
      : `${new Intl.NumberFormat("en-US").format(converted)} ${currency}`;
    return `${options.from ? "from " : ""}${amount}${options.perMonth ? "/month" : ""}`;
  }
  return `${options.from ? "от " : ""}${new Intl.NumberFormat("ru-RU").format(value)} ₽${options.perMonth ? " в месяц" : ""}`;
}
