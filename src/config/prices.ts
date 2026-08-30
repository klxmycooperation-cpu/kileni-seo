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
    express: 24_900,
    full: 39_900,
    strategy: 69_900,
    implementation: { from: 49_900 },
  },
  seo: {
    base: 34_900,
    growth: 44_900,
    full: 69_900,
  },
  marketplaces: {
    audit: 2_900,
    optimization: 4_900,
    turnkey: 12_900,
    pack10: 39_900,
    support: 29_900,
    extras: {
      videoPerItem: 9_000,
      analytics: 25_000,
    },
  },
  development: {
    landing: 59_900,
    corporate: 99_900,
    commerce: { from: 189_900 },
    extras: {
      account: 140_000,
      integrations: 80_000,
    },
  },
  ads: {
    setup: 14_900,
    support: 14_900,
  },
  content: {
    article: 4_900,
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
