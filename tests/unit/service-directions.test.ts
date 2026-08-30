import { describe, expect, it } from "vitest";

import { formatOfferPrice, getOffer, localizedOffer } from "../../src/config/offers";
import { getServiceDirections, serviceDirectionIds } from "../../src/content/service-directions";

describe("services hub directions", () => {
  it("publishes the four approved buyer directions in a stable order", () => {
    expect(serviceDirectionIds).toEqual(["seo", "development", "marketplaces", "custom"]);
    expect(getServiceDirections("ru").map((direction) => direction.id)).toEqual(serviceDirectionIds);
  });

  it("uses the approved Russian copy and routes", () => {
    const directions = Object.fromEntries(getServiceDirections("ru").map((direction) => [direction.id, direction]));

    expect(directions.seo).toMatchObject({
      label: "SEO",
      title: "Найти, что мешает сайту, исправить и развивать",
      problem: "Сайт плохо находят, подрядчик присылает непонятные отчёты или вы не знаете, с чего начать.",
      primaryCta: { label: "Перейти к SEO", href: "/seo" },
      secondaryCta: { label: "Бесплатно проверить до 10 страниц", href: "/free-audit" },
      offerId: "seo-audit-50",
    });
    expect(directions.development).toMatchObject({
      label: "Разработка сайтов",
      title: "Собрать сайт под задачу бизнеса, а не просто набор страниц",
      primaryCta: { label: "Выбрать формат сайта", href: "/web-development" },
      offerId: "development-start",
    });
    expect(directions.marketplaces).toMatchObject({
      label: "Маркетплейсы",
      title: "Подготовить карточки под правила конкретной площадки",
      primaryCta: { label: "Выбрать площадку", href: "/marketplaces" },
      offerId: "marketplace-wildberries-audit",
    });
    expect(directions.custom).toMatchObject({
      label: "Нестандартная задача",
      title: "Разобрать задачу, для которой не подходит готовый тариф",
      problem: "Опишите результат, который хотите получить. Мы предложим состав, проверяемый первый этап, срок и стоимость.",
      primaryCta: { label: "Разобрать задачу", href: "/custom-task" },
      offerId: "custom-task-consultation",
    });
  });

  it("derives every shown price and duration from the canonical offer catalog", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const direction of getServiceDirections(locale)) {
        const offer = getOffer(direction.offerId);
        expect(offer, direction.id).toBeDefined();
        expect(direction.price).toBe(formatOfferPrice(offer!, locale));
        expect(direction.duration).toBe(localizedOffer(offer!, locale).duration);
      }
    }
  });

  it("keeps every panel concise and never invents a custom-task price", () => {
    for (const direction of getServiceDirections("ru")) {
      expect(direction.actions).toHaveLength(4);
      expect(direction.outcomes.length).toBeGreaterThanOrEqual(3);
      expect(direction.outcomes.length).toBeLessThanOrEqual(4);
      expect(direction.included.length).toBeGreaterThanOrEqual(3);
      expect(direction.included.length).toBeLessThanOrEqual(4);
    }

    const custom = getServiceDirections("ru").find((direction) => direction.id === "custom")!;
    expect(custom.price).toBe("Стоимость после короткого брифа");
    expect(getOffer(custom.offerId)?.price).toBeNull();
  });
});
