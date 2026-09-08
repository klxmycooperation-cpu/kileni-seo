import { describe, expect, it } from "vitest";

import {
  auditCheckCopy,
  auditIssueCopy,
  auditObservationCopy,
  auditPageFindings,
  auditTermDefinitions,
} from "../../src/lib/audit/report-content";

describe("audit report content", () => {
  it("turns a technical issue into a concrete plain-language instruction", () => {
    const result = auditIssueCopy("ru", {
      code: "H1_MISSING",
      title: "Нет H1",
      why: "На странице нет главного заголовка.",
      fix: "Добавьте один содержательный H1.",
      acceptance: "Повторная проверка не находит проблему «Нет H1».",
      evidence: [{ url: "https://example.com/service", observation: "На странице нет главного заголовка." }],
    });

    expect(result.title).toBe("Нет главного заголовка страницы (H1)");
    expect(result.observation).toBe("На странице нет главного заголовка.");
    expect(result.why).toContain("основную тему страницы");
    expect(result.action).toContain("один видимый главный заголовок");
    expect(result.acceptance).toContain("Нет главного заголовка страницы (H1)");
    expect(result.acceptance).not.toContain("«Нет H1»");
  });

  it("lists only findings supported by the saved signals for one URL", () => {
    const findings = auditPageFindings("ru", {
      http: { status: 404, redirectCount: 1 },
      title: { value: null, present: false, length: 0, optimal: false },
      description: { value: null, present: false, length: 0, optimal: false },
      h1: { count: 0, values: [] },
      noindex: true,
      canonical: { url: null, valid: false },
      sitemap: { status: "checked", included: false },
      internalLinks: { incomingFromCheckedPages: 0 },
    });

    expect(findings).toContain("Страница отвечает кодом 404, а не обычным успешным кодом 200.");
    expect(findings).toContain("До конечной страницы происходит перенаправлений: 1.");
    expect(findings).toContain("Не задан заголовок для поисковой выдачи (title).");
    expect(findings).toContain("Не заполнено описание страницы для поисковой выдачи.");
    expect(findings).toContain("Нет видимого главного заголовка страницы.");
    expect(findings).toContain("В коде страницы есть команда noindex — запрет показывать её в результатах поиска.");
    expect(findings).toContain("Не указан основной адрес страницы (canonical).");
    expect(findings).toContain("Страница не указана в файле со списком страниц (sitemap.xml).");
    expect(findings).toContain("Среди проверенных страниц не найдена ссылка на этот адрес.");
  });

  it("does not invent an internal-link issue when that signal was not saved", () => {
    const findings = auditPageFindings("ru", {
      http: { status: 200 },
      title: { value: "Услуга", present: true, length: 45, optimal: true },
      description: { value: "Понятное описание услуги", present: true, length: 110, optimal: true },
      h1: { count: 1, values: ["Услуга"] },
      canonical: { url: "https://example.com/service", valid: true },
      sitemap: { status: "checked", included: true },
    });

    expect(findings).toEqual([]);
  });

  it("defines every specialist term shown in the report", () => {
    const terms = auditTermDefinitions("ru").map((item) => item.term);
    expect(terms).toEqual(expect.arrayContaining(["URL", "HTTP-код", "robots.txt", "Google Lighthouse", "Title", "Meta description", "H1", "Canonical", "Sitemap.xml", "Noindex", "Уверенность классификации"]));
  });

  it("replaces a generic warning with a concrete page count and plain wording", () => {
    const result = auditCheckCopy("ru", {
      checkId: "status",
      status: "warning",
      value: { passing: 8, checked: 10 },
      title: "Ответы страниц",
      expected: "Каждая выбранная страница отвечает HTTP 2xx.",
      explanation: "Есть отклонение, которое стоит проверить, но оно не подтверждает критическую ошибку.",
      urlEvidence: [{ url: "https://example.com/broken", observation: "HTTP 302" }],
    });

    expect(result.title).toBe("Открываются ли страницы");
    expect(result.expected).toContain("код ответа от 200 до 299");
    expect(result.explanation).toContain("На 2 страницах найдено отличие от нормы");
    expect(result.explanation).not.toContain("стоит проверить");
    expect(auditObservationCopy("ru", "HTTP 200")).toBe("Код ответа 200: страница открылась без ошибки.");
  });

  it("does not repeat an uncertain saved explanation when a measurement has no result", () => {
    const result = auditCheckCopy("ru", {
      checkId: "performance",
      status: "insufficient_data",
      value: null,
      title: "Оценка скорости Lighthouse",
      expected: "Нужна оценка скорости.",
      explanation: "Публичных данных недостаточно для уверенного вывода.",
      urlEvidence: [],
    });

    expect(result.title).toBe("Общая скорость страницы на телефоне");
    expect(result.explanation).toContain("Сайт не отдал данные");
    expect(result.explanation).not.toContain("для уверенного вывода");
  });
});
