import { describe, expect, it } from "vitest";

import { auditIssueCopy, auditPageFindings, auditTermDefinitions } from "../../src/lib/audit/report-content";

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
    expect(findings).toContain("Не задано описание для поисковой выдачи (meta description).");
    expect(findings).toContain("Нет видимого главного заголовка страницы (H1).");
    expect(findings).toContain("Страница закрыта от появления в поиске правилом noindex.");
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
    expect(terms).toEqual(expect.arrayContaining(["URL", "HTTP-код", "Title", "Meta description", "H1", "Canonical", "Sitemap.xml", "Noindex"]));
  });
});
