import { describe, expect, it } from "vitest";

import { generateAuditClientMessage } from "@/src/lib/audit/client-message";
import type { AuditClientPresentation } from "@/src/lib/audit/client-presentation";

function presentation(overrides: Partial<AuditClientPresentation> = {}): AuditClientPresentation {
  return {
    summary: {
      htmlFound: 12,
      scopeLabel: "Найдено HTML-страниц",
      scopeValue: 12,
      checkedLabel: "Подробно проверено страниц",
      findingsLabel: "2 замечания",
      eligible: 10,
      excluded: 2,
      selected: 4,
      checked: 4,
      notCompleted: 0,
      outsideSample: 6,
      critical: 1,
      review: 1,
      optional: 0,
    },
    exclusions: [],
    issues: [
      {
        checkId: "robots-noindex",
        kind: "critical",
        title: "Страница закрыта от поиска",
        url: "https://example.ru/catalog",
        affectedUrls: ["https://example.ru/catalog"],
        whatFound: "На странице найден запрет noindex.",
        whyImportant: "Поисковые системы не смогут добавить страницу в результаты поиска.",
        howChecked: "Проверен meta robots в HTML страницы.",
        reliability: "Подтверждено автоматически",
        nextStep: "Уберите noindex, если страница должна участвовать в поиске.",
      },
      {
        checkId: "title",
        kind: "review",
        title: "Не заполнено название страницы",
        url: "https://example.ru/services",
        affectedUrls: ["https://example.ru/services"],
        whatFound: "В HTML нет title.",
        whyImportant: "Название помогает поиску и посетителю понять содержание страницы.",
        howChecked: "Проверен элемент title.",
        reliability: "Подтверждено автоматически",
        nextStep: "Добавьте краткое название страницы.",
      },
    ],
    strengths: ["Все четыре выбранные страницы открываются без ошибки сервера."],
    pages: [],
    publicTechnicalResources: [],
    additionalFiles: 0,
    additionalDocuments: 0,
    additionalFilesBasis: "classified_resources",
    nextStep: {
      primary: "Получить полный аудит сайта",
      secondary: "Повторить бесплатную проверку",
      note: "Повторная проверка ограничена выборкой.",
    },
    limitations: ["Проверена выборка страниц."],
    disclaimer: "Автоматическая проверка публичной части сайта.",
    ...overrides,
  };
}

describe("текст для заказчика по завершённому аудиту", () => {
  it("использует только факты текущего аудита и ставит критичную проблему первой", () => {
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation(),
      variant: 0,
    });

    expect(message).toContain("example.ru");
    expect(message).toContain("проверено 4");
    expect(message).toContain("Страница закрыта от поиска");
    expect(message).toContain("Уберите noindex");
    expect(message).toContain("Не заполнено название страницы");
    expect(message.indexOf("Страница закрыта от поиска"))
      .toBeLessThan(message.indexOf("Не заполнено название страницы"));
    expect(message).not.toMatch(/позици|трафик вырос|гарантир/iu);
  });

  it("не придумывает проблему, когда в сохранённом результате её нет", () => {
    const message = generateAuditClientMessage({
      domain: "clean.example",
      presentation: presentation({
        issues: [],
        summary: { ...presentation().summary, critical: 0, review: 0, optional: 0 },
      }),
      variant: 1,
    });

    expect(message).toContain("критических проблем не обнаружено");
    expect(message).not.toContain("noindex");
    expect(message).not.toContain("title");
  });

  it("меняет подачу при повторной генерации, сохраняя те же факты", () => {
    const first = generateAuditClientMessage({ domain: "example.ru", presentation: presentation(), variant: 0 });
    const second = generateAuditClientMessage({ domain: "example.ru", presentation: presentation(), variant: 1 });

    expect(second).not.toBe(first);
    for (const fact of ["example.ru", "Страница закрыта от поиска", "Уберите noindex"]) {
      expect(first).toContain(fact);
      expect(second).toContain(fact);
    }
  });
});
