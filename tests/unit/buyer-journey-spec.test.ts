import { afterEach, describe, expect, it } from "vitest";

import { getEnglishPriceConfig, formatPrice, prices } from "../../src/config/prices";
import { offersForService, type OfferService } from "../../src/config/offers";
import { briefEstimatedMinutes, briefServices, serviceQuestions } from "../../src/content/brief";
import { glossaryTerms } from "../../src/content/glossary";
import { marketplacePlatforms } from "../../src/content/marketplaces";
import { getService, serviceSlugs } from "../../src/content/services";

const originalCurrency = process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY;
const originalRate = process.env.NEXT_PUBLIC_EN_PRICE_RATE;

afterEach(() => {
  if (originalCurrency === undefined) delete process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY;
  else process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY = originalCurrency;
  if (originalRate === undefined) delete process.env.NEXT_PUBLIC_EN_PRICE_RATE;
  else process.env.NEXT_PUBLIC_EN_PRICE_RATE = originalRate;
});

describe("approved buyer journey specification", () => {
  const requiredGlossaryTerms = {
    ru: [
      "Индексация",
      "Поисковый робот",
      "sitemap",
      "robots.txt",
      "Canonical",
      "Метатеги",
      "Title",
      "Description",
      "H1",
      "Семантическое ядро",
      "Кластеризация",
      "Поисковый интент",
      "Каннибализация страниц",
      "CTR",
      "Конверсия",
      "Core Web Vitals",
      "LCP",
      "CLS",
      "TBT",
      "Перелинковка",
      "Структурированные данные",
      "JSON-LD",
      "SKU",
      "Карточка товара",
      "Rich Content",
      "A/B-тестирование",
    ],
    en: [
      "Indexing",
      "Search crawler",
      "Sitemap",
      "robots.txt",
      "Canonical",
      "Meta tags",
      "Title",
      "Description",
      "H1",
      "Keyword set",
      "Query clustering",
      "Search intent",
      "Page cannibalisation",
      "CTR",
      "Conversion",
      "Core Web Vitals",
      "LCP",
      "CLS",
      "TBT",
      "Internal linking",
      "Structured data",
      "JSON-LD",
      "SKU",
      "Product card",
      "Rich Content",
      "A/B testing",
    ],
  } as const;

  const requiredBuyerQuestions = {
    ru: [
      "Что у меня сейчас не так?",
      "Как KILENI это проверит?",
      "Что конкретно будет сделано?",
      "Что я получу?",
      "Как я приму результат?",
      "Какой срок?",
      "Какая цена?",
      "Что не входит?",
      "Почему выбрать этот вариант?",
      "Почему KILENI?",
      "Что делать дальше?",
    ],
    en: [
      "What is wrong right now?",
      "How will KILENI check it?",
      "What exactly will be done?",
      "What will I receive?",
      "How do I accept the result?",
      "How long will it take?",
      "What does it cost?",
      "What is not included?",
      "Why choose this option?",
      "Why KILENI?",
      "What happens next?",
    ],
  } as const;

  it("supports the six service destinations and eleven buyer questions in both languages", () => {
    expect(serviceSlugs).toEqual([
      "seo-audit",
      "seo-promotion",
      "web-development",
      "yandex-ads",
      "content-materials",
      "custom-task",
    ]);

    for (const locale of ["ru", "en"] as const) {
      for (const slug of serviceSlugs) {
        const service = getService(locale, slug);
        expect(service, `${locale}/${slug}`).toBeDefined();
        expect(service?.buyerQuestions, `${locale}/${slug}`).toHaveLength(11);
        expect(service?.buyerQuestions.map((item) => item.question), `${locale}/${slug}`).toEqual(requiredBuyerQuestions[locale]);
        expect(service?.buyerQuestions.every((item) => item.answer.length > 20), `${locale}/${slug}`).toBe(true);
        expect(service?.packages.length, `${locale}/${slug}`).toBe(offersForService(slug as OfferService).length);
      }
    }
  });

  it("states the approved 100-public-page limit for the free automated audit", () => {
    expect(getService("ru", "seo-audit")?.packages[0]?.limit).toBe("До 10 открытых страниц");
    expect(getService("en", "seo-audit")?.packages[0]?.limit).toBe("Up to 10 public pages");
  });

  it("never auto-converts English prices from environment variables", () => {
    process.env.NEXT_PUBLIC_EN_PRICE_CURRENCY = "USD";
    process.env.NEXT_PUBLIC_EN_PRICE_RATE = "0.01";

    expect(getEnglishPriceConfig()).toBeUndefined();
    expect(formatPrice(prices.audits.full, "en")).toBe("Individual estimate");
  });

  it("keeps marketplace guidance distinct and complete for the three supported platforms", () => {
    expect(marketplacePlatforms.map((platform) => platform.id)).toEqual([
      "wildberries",
      "ozon",
      "yandex-market",
    ]);
    for (const platform of marketplacePlatforms) {
      expect(platform.docs.length).toBeGreaterThan(0);
      for (const locale of ["ru", "en"] as const) {
        const copy = platform[locale];
        expect(copy.access.length).toBeGreaterThan(20);
        expect(copy.price.length).toBeGreaterThan(10);
        expect(copy.acceptance.length).toBeGreaterThanOrEqual(2);
        expect(copy.content.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("publishes a useful bilingual glossary with related routes", () => {
    expect(glossaryTerms.length).toBeGreaterThanOrEqual(27);
    for (const term of glossaryTerms) {
      expect(term.slug).toMatch(/^[a-z0-9-]+$/u);
      for (const locale of ["ru", "en"] as const) {
        const copy = term[locale];
        expect(copy.definition.length).toBeGreaterThan(10);
        expect(copy.plain.length).toBeGreaterThan(10);
        expect(copy.why.length).toBeGreaterThan(10);
        expect(copy.example.length).toBeGreaterThan(5);
        expect(copy.relatedHref).toMatch(/^\//u);
      }
    }

    for (const locale of ["ru", "en"] as const) {
      const terms = glossaryTerms.map((term) => term[locale].term);
      expect(terms).toEqual(expect.arrayContaining([...requiredGlossaryTerms[locale]]));
    }
  });

  it("keeps the brief short, honest and safe for an unsure buyer", () => {
    expect(briefEstimatedMinutes).toBe("5–7");
    expect(briefServices).toHaveLength(6);
    for (const service of briefServices) {
      const questions = serviceQuestions[service.id];
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((question) => question.options?.some((option) => option.value === "unknown"))).toBe(true);
    }
  });
});
