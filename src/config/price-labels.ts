import type { Locale } from "./site";
import { formatPrice, prices } from "./prices";

export function priceLabel(
  key: string,
  locale: Locale,
): { current: string; note?: string } {
  switch (key) {
    case "audit-preliminary": return { current: formatPrice(prices.audits.preliminary, locale) };
    case "audit-express": return { current: formatPrice(prices.audits.express, locale) };
    case "audit-full": return { current: formatPrice(prices.audits.full, locale) };
    case "audit-strategy": return { current: formatPrice(prices.audits.strategy, locale) };
    case "audit-implementation": return { current: formatPrice(prices.audits.implementation.from, locale, { from: true }) };
    case "seo-base": return { current: formatPrice(prices.seo.base, locale, { from: true, perMonth: true }) };
    case "seo-growth": return { current: formatPrice(prices.seo.growth, locale, { perMonth: true }) };
    case "seo-full": return { current: formatPrice(prices.seo.full, locale, { from: true, perMonth: true }) };
    case "mp-audit": return { current: formatPrice(prices.marketplaces.audit, locale) };
    case "mp-optimization": return { current: formatPrice(prices.marketplaces.optimization, locale), note: locale === "ru" ? "за артикул" : "per SKU" };
    case "mp-turnkey": return { current: formatPrice(prices.marketplaces.turnkey, locale), note: locale === "ru" ? "за артикул" : "per SKU" };
    case "mp-pack": return { current: formatPrice(prices.marketplaces.pack10, locale) };
    case "mp-support": return { current: formatPrice(prices.marketplaces.support, locale, { perMonth: true }) };
    case "dev-landing": return { current: formatPrice(prices.development.landing, locale, { from: true }) };
    case "dev-corporate": return { current: formatPrice(prices.development.corporate, locale) };
    case "dev-commerce": return { current: formatPrice(prices.development.commerce.from, locale, { from: true }) };
    case "ads-setup": return { current: formatPrice(prices.ads.setup, locale) };
    case "ads-support": return { current: formatPrice(prices.ads.support, locale, { perMonth: true }) };
    case "content-article": return { current: formatPrice(prices.content.article, locale) };
    default: return { current: locale === "ru" ? "Индивидуальный расчёт" : "Individual estimate" };
  }
}
