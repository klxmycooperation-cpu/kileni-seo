import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuditResultReport, type PublicAuditCtaOfferId } from "../../src/components/pages/AuditResultReport";

describe("public audit result report", () => {
  it("renders concrete page evidence and actions without a wide technical table", () => {
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 1,
      pagesDiscovered: 2,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: {
        resultVersion: 2,
        issueCounts: { high: 1 },
        summary: { headline: "В выборке найдено замечаний: 1" },
        indexability: { status: "checked", checkedPages: 1, indexablePages: 1, noindexPages: 0, httpErrorPages: 0, ratio: 1 },
        issueGroups: [{
          code: "H1_MISSING",
          severity: "high",
          title: "Нет H1",
          why: "На странице нет главного заголовка.",
          fix: "Добавьте один содержательный H1.",
          affectedCount: 1,
          affectedUrls: ["https://example.com/service"],
          evidence: [{ url: "https://example.com/service", observation: "На странице нет главного заголовка." }],
        }],
        checkedPages: [{
          url: "https://example.com/service",
          finalUrl: "https://example.com/service",
          http: { status: 200, ok: true, redirectCount: 0 },
          title: { value: "Услуга", present: true, length: 45, optimal: true },
          description: { value: "Описание услуги", present: true, length: 100, optimal: true },
          h1: { count: 0, values: [] },
          noindex: false,
          canonical: { url: "https://example.com/service", valid: true, selfReferential: true },
          sitemap: { status: "checked", included: true },
          internalLinks: { outgoing: 3, incomingFromCheckedPages: 1 },
        }],
        uncheckedUrls: ["https://example.com/other"],
      },
    }));

    expect(html).toContain("Что именно исправлять");
    expect(html).toContain("Нет главного заголовка страницы (H1)");
    expect(html).toContain("Почему это важно");
    expect(html).toContain("Что сделать");
    expect(html).toContain("Как проверить исправление");
    expect(html).toContain("https://example.com/service");
    expect(html).toContain("Нет видимого главного заголовка страницы (H1).");
    expect(html).toContain("Пояснения к словам в отчёте");
    expect(html).not.toContain("<table");
  });

  it("does not label a clean current report as an old report", () => {
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 1,
      pagesDiscovered: 1,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: {
        resultVersion: 2,
        issueGroups: [],
        checkedPages: [{ url: "https://example.com/", http: { status: 200, ok: true } }],
      },
    }));

    expect(html).toContain("В проверенной выборке замечаний не найдено");
    expect(html).not.toContain("Сводка старой версии");
    expect(html).not.toContain("предыдущей версией проверки");
  });
});
