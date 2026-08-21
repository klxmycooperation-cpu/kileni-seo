import { prices } from "./prices";
import type { Locale } from "./site";

export type CalculatorKind = "audit" | "seo" | "marketplaces" | "development";

export type CalculatorAnswers = Record<string, string | number | boolean>;

type Estimate = { min: number; max: number; factors: string[] };

const range = (value: number, minimum: number, spread = 0.16): Pick<Estimate, "min" | "max"> => ({
  min: Math.max(minimum, Math.round((value * (1 - spread)) / 1000) * 1000),
  max: Math.round((value * (1 + spread)) / 1000) * 1000,
});

const boundedCount = (value: unknown, fallback: number, maximum: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(1, Math.ceil(parsed)));
};

export function calculateEstimate(kind: CalculatorKind, answers: CalculatorAnswers, locale: Locale = "ru"): Estimate {
  const factors: string[] = [];
  const label = (ru: string, en: string) => locale === "ru" ? ru : en;
  let value = 0;
  let minimum = 0;

  if (kind === "audit") {
    const pages = boundedCount(answers.pages, 50, 100_000);
    value = pages <= 30
      ? prices.audits.express
      : pages <= 200
        ? prices.audits.full
        : pages <= 500
          ? prices.audits.strategy
          : prices.audits.strategy * Math.ceil(pages / 500);
    minimum = value;
    factors.push(
      pages <= 30
        ? label("сайт до 30 страниц", "website up to 30 pages")
        : pages <= 200
          ? label("сайт до 200 страниц", "website up to 200 pages")
          : pages <= 500
            ? label("сайт до 500 страниц", "website up to 500 pages")
            : label("сайт более 500 страниц — предварительная оценка", "website over 500 pages — preliminary estimate"),
    );
    if (answers.implementation) {
      value = Math.max(value * 1.85, prices.audits.implementation.from);
      minimum = Math.max(minimum, prices.audits.implementation.from);
      factors.push(label("внедрение исправлений", "implementation of fixes"));
    }
    if (answers.urgent) { value *= 1.25; factors.push(label("срочная работа", "urgent delivery")); }
    if (answers.complex === "high") { value *= 1.35; factors.push(label("сложная архитектура", "complex architecture")); }
  } else if (kind === "seo") {
    value = answers.scale === "full" ? prices.seo.full : answers.scale === "growth" ? prices.seo.growth : prices.seo.base;
    minimum = value;
    factors.push(answers.scale === "full" ? label("полное сопровождение", "full support") : answers.scale === "growth" ? label("активный рост", "active growth") : label("базовое продвижение", "basic SEO support"));
    const regions = boundedCount(answers.regions, 1, 20);
    if (regions > 1) { value *= Math.min(1.5, 1 + (regions - 1) * 0.08); factors.push(label("несколько регионов", "multiple regions")); }
    if (answers.technical) { value *= 1.15; factors.push(label("технические работы", "technical work")); }
    if (answers.ads) {
      value += prices.ads.support;
      minimum += prices.ads.support;
      factors.push(label("ведение Яндекс Рекламы без бюджета", "Yandex Ads management, media spend excluded"));
    }
  } else if (kind === "marketplaces") {
    const items = boundedCount(answers.items, 1, 500);
    const unit = answers.package === "turnkey" ? prices.marketplaces.turnkey : answers.package === "optimization" ? prices.marketplaces.optimization : prices.marketplaces.audit;
    if (answers.package === "optimization") {
      const completePacks = Math.floor(items / 10);
      const remainder = items % 10;
      const packAndRemainder = completePacks * prices.marketplaces.pack10 + remainder * unit;
      const roundedUpPacks = Math.ceil(items / 10) * prices.marketplaces.pack10;
      value = Math.min(items * unit, packAndRemainder, roundedUpPacks);
    } else {
      value = items * unit;
    }
    minimum = value;
    factors.push(locale === "ru" ? `${items} артикул${items === 1 ? "" : "ов"}` : `${items} SKU${items === 1 ? "" : "s"}`);
    if (answers.video) { value += items * prices.marketplaces.extras.videoPerItem; factors.push(label("видео", "video")); }
    if (answers.analytics) { value += prices.marketplaces.extras.analytics; factors.push(label("регулярная аналитика", "recurring analytics")); }
  } else {
    value = answers.siteType === "commerce" ? prices.development.commerce.from : answers.siteType === "corporate" ? prices.development.corporate : prices.development.landing;
    minimum = value;
    factors.push(answers.siteType === "commerce" ? label("каталог или магазин", "catalogue or shop") : answers.siteType === "corporate" ? label("корпоративный сайт", "company website") : label("лендинг", "landing page"));
    if (answers.account) { value += prices.development.extras.account; factors.push(label("личный кабинет", "user account")); }
    if (answers.integrations) { value += prices.development.extras.integrations; factors.push(label("интеграции", "integrations")); }
    if (boundedCount(answers.languages, 1, 10) > 1) { value *= 1.18; factors.push(label("несколько языков", "multiple languages")); }
    if (answers.urgent) { value *= 1.2; factors.push(label("сжатый срок", "compressed timeline")); }
  }

  return { ...range(value, minimum), factors };
}
