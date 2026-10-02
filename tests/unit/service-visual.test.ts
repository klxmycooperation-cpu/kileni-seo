import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServiceVisual } from "../../src/components/pages/ServiceVisual";
import type { ServiceVisual as ServiceVisualContent } from "../../src/content/services";

const visual = (variant: "website-process" | "scope-definition"): ServiceVisualContent => ({
  kind: "build-system",
  variant,
  label: variant === "website-process" ? "Как создаём сайт" : "Как определяем первый этап",
  summary: "Тестовая подпись",
  signals: [],
});

describe("ServiceVisual build compositions", () => {
  it("presents the SEO audit as an informative crawl journey instead of an empty preview", () => {
    const html = renderToStaticMarkup(createElement(ServiceVisual, {
      visual: {
        kind: "audit-matrix",
        label: "Карта проверки",
        summary: "Группируем найденные проблемы и показываем, что исправлять в первую очередь.",
        signals: [],
      },
      locale: "ru",
      items: ["Список найденных ошибок", "Примеры проблемных страниц", "Задачи по приоритету"],
      outcome: "Список найденных ошибок",
    }));

    expect(html).toContain("svc-audit-journey");
    expect(html).toContain("Пример маршрута проверки");
    expect(html).toContain("Сначала находим страницы, затем проверяем каждую по четырём направлениям.");
    expect(html).toContain("Ответ сервера");
    expect(html).toContain("Доступность поиску");
    expect(html).toContain("Содержание");
    expect(html).toContain("Мобильная версия");
    expect(html).toContain("Для каждой найденной проблемы показываем адрес страницы, объясняем причину и описываем проверку после исправления.");
    expect(html).not.toContain("svc-site-scan__page");
    expect(html).not.toContain("Фрагмент готового отчёта");
    expect(html).not.toContain("Что исправлять в первую очередь");
  });

  it("renders the website process as three meaningful steps without a standalone arrow", () => {
    const html = renderToStaticMarkup(createElement(ServiceVisual, {
      visual: visual("website-process"),
      locale: "ru",
      items: ["Схема страниц", "Макеты основных экранов и состояний", "Рабочий сайт и исходный код"],
      outcome: "Рабочая мобильная версия",
    }));

    expect(html).toContain("svc-build-process");
    expect(html).toContain("Структура страниц");
    expect(html).toContain("Ключевые экраны");
    expect(html).toContain("Мобильная сборка и проверка");
    expect(html).toContain("svc-build-process__preview");
    expect(html).toContain("svc-build-process__steps");
    const htmlWithStandaloneArrow = `${html}<div class="svc-build-composition__topline"><span>↗</span></div>`;
    expect(html).not.toMatch(/svc-build-composition__topline[\s\S]*↗/);
    expect(htmlWithStandaloneArrow).toMatch(/svc-build-composition__topline[\s\S]*↗/);
  });

  it("uses a distinct first-stage scope composition", () => {
    const html = renderToStaticMarkup(createElement(ServiceVisual, {
      visual: visual("scope-definition"),
      locale: "en",
      items: ["Task boundaries", "Recommended approach", "First-stage scope"],
      outcome: "Clear first-stage boundary",
    }));

    expect(html).toContain("svc-scope-definition");
    expect(html).toContain("Current situation");
    expect(html).toContain("First-stage scope");
    expect(html).toContain("Acceptance criterion");
    expect(html).toContain("svc-scope-definition__decision-map");
    expect(html).toContain("svc-scope-definition__list");
    expect(html).not.toContain("svc-build-process");
  });
});
