import { describe, expect, it } from "vitest";

import { getDictionary } from "../../src/content/dictionary";
import { getCase } from "../../src/content/cases";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public copy", () => {
  it("uses the approved plain-language Russian hero copy", () => {
    const dictionary = getDictionary("ru");

    expect(dictionary.hero.title).toBe(
      "Сайт есть. Пора сделать так, чтобы его находили.",
    );
    expect(dictionary.hero.eyebrow).toBe("Бесплатная SEO-проверка до 10 страниц");
    expect(dictionary.hero.text).toBe(
      "Бесплатно проверим до 10 страниц, оценим техническое состояние сайта и покажем основные зоны риска. Без доступа к админке.",
    );
    expect(dictionary.process.map((step) => step.title)).toEqual([
      "Проверяем",
      "Объясняем",
      "Исправляем",
      "Перепроверяем",
    ]);
  });

  it("leads cases with externally checkable evidence and keeps the project score secondary", () => {
    const eco = getCase("ru", "eco-santeh");
    const zasorservice = getCase("ru", "zasorservice");

    expect(eco?.previewFacts.slice(0, 3)).toEqual([
      { value: "509/509", label: "страниц открылись без ошибки" },
      { value: "36 → 57", label: "автоматический тест скорости на телефоне (Lighthouse)" },
      { value: "99/100", label: "автоматический тест скорости на компьютере (Lighthouse)" },
    ]);
    expect(eco?.previewFacts.at(-1)).toEqual({ value: "35 → 93", label: "внутренняя оценка KILENI — не показатель поисковика" });
    expect(eco?.evidence.find((row) => row.metric.includes("чек-листу"))).toMatchObject({
      before: "35/100",
      after: "93/100",
    });

    expect(zasorservice?.previewFacts.slice(0, 2)).toEqual([
      { value: "575/575", label: "страниц открылись без ошибки" },
      { value: "0,519 → 0,0001", label: "сдвиг главного экрана (CLS) в двух тестах" },
    ]);
    expect(zasorservice?.previewFacts.at(-1)).toEqual({ value: "37 → 80", label: "внутренняя оценка KILENI — не показатель поисковика" });

    expect(eco?.fixes.join(" ")).not.toContain("Устранили точные дубли");
    expect(zasorservice?.evidence.find((row) => row.metric.includes("JSON-LD"))).toMatchObject({
      before: "0 из 606",
      after: "575 из 575",
    });
  });

  it("does not use decorative technical or agency jargon in Russian home copy", () => {
    const dictionary = getDictionary("ru");
    const copy = JSON.stringify(dictionary);

    for (const phrase of [
      "Digital-агентство",
      "подтверждённый технический результат",
      "управляемая динамика",
      "digital-система",
    ]) {
      expect(copy).not.toContain(phrase);
    }
  });

  it("describes the free audit through verifiable facts instead of an aggregate score", () => {
    const homeSource = readFileSync(resolve(process.cwd(), "src/components/home/HomePage.tsx"), "utf8");

    expect(homeSource).toContain("статусы выполненных проверок");
    expect(homeSource).toContain("concrete findings tied to the selected URLs");
    expect(homeSource).not.toMatch(/общ(ую|ая) оценк/iu);
    expect(homeSource).not.toMatch(/overall (SEO )?score/iu);
  });

  it("keeps the revised home flow concrete and removes example captions", () => {
    const homeSource = readFileSync(resolve(process.cwd(), "src/components/home/HomePage.tsx"), "utf8");
    const heroSource = readFileSync(resolve(process.cwd(), "src/components/home/HeroScan.tsx"), "utf8");
    const analyticsSource = readFileSync(resolve(process.cwd(), "src/components/analytics/AnalyticsVisuals.tsx"), "utf8");

    for (const label of ["НАШЛИ", "ОБЪЯСНИЛИ", "ИСПРАВИЛИ", "ПРОВЕРИЛИ"]) {
      expect(homeSource).toContain(label);
    }
    expect(heroSource).not.toContain("Сначала факты");
    expect(homeSource).not.toContain("технического шума");
    expect(analyticsSource).not.toContain("Это пример, а не результат клиента");
  });

  it("keeps reviewed interface copy concrete and free of artificial shorthand", () => {
    const reviewedSources = [
      "src/components/analytics/AnalyticsVisuals.tsx",
      "src/components/forms/BriefWizard.tsx",
      "src/components/home/HomeDecisionRoute.tsx",
      "src/components/home/HomeProcessSteps.tsx",
      "src/components/pages/AuditChecksPage.tsx",
      "src/components/pages/AuditProgressPage.tsx",
      "src/components/pages/AuditResultReport.tsx",
      "src/components/pages/MarketplaceOfferSelector.tsx",
      "src/components/pages/SeoHubPage.tsx",
      "src/components/pages/ServicesIndexPage.tsx",
      "src/config/offers.ts",
      "src/content/audit-checks.ts",
      "src/content/articles-expansion.ts",
      "src/content/marketplaces.ts",
      "src/content/service-additions.ts",
      "src/content/service-directions.ts",
      "src/content/service-result-examples.ts",
      "src/content/services.ts",
      "src/lib/audit/client-presentation.ts",
      "src/lib/audit/engine.ts",
      "src/lib/audit/report-content.ts",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

    for (const phrase of [
      "Не один график, а связку сигналов",
      "Технический ориентир",
      "Балл — диагностический сигнал",
      "какие сигналы удаётся подтвердить",
      "Список сигналов без контекста",
      "Контур кампании",
      "проектного контура",
      "Главный результат",
      "Точный вариант и предел",
      "Один понятный маршрут",
      "Четыре опорные точки",
      "Понятное объяснение",
      "Первый ориентир",
      "Маршрут работы",
      "Контекст задачи",
      "Ориентир по выбранной услуге",
      "Собираем контекст",
      "Цикл роста",
      "Система карточки",
      "Система сайта",
      "Редактура можно",
      "публичные технические сигналы",
      "реальные сигналы движка",
      "Проверить эти сигналы",
      "Проверить этот и остальные сигналы",
      "предварительный сигнал",
      "A first signal",
      "Context\", \"Boundaries\", \"First stage\", \"Acceptance",
      "Elements\", \"Links\", \"Solution map\", \"First stage",
      "Business · Recommended",
      "ориентир —",
      "Один материал · один раунд правок",
      "До 10 артикулов · изображения не входят",
      "1 карточка · без публикации",
      "1 артикул · 1 раунд правок",
      "1 артикул · дизайн без фотосъёмки",
    ]) {
      expect(reviewedSources).not.toContain(phrase);
    }

    expect(reviewedSources).not.toMatch(/summary:\s*["'][^"']*→[^"']*["']/u);
    for (const label of ["Content system", "Task boundaries", "Audit map", "Growth loop", "Listing system", "Website system", "Campaign path"]) {
      expect(reviewedSources).not.toContain(`label: "${label}"`);
    }
  });
});
