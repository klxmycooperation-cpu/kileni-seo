import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";

import { AuditResultReport, clientAuditVerdict, type PublicAuditCtaOfferId, type PublicAuditResultView } from "../../src/components/pages/AuditResultReport";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";

describe("public audit result report", () => {
  it("states the main client conclusion without turning review items into confirmed errors", () => {
    expect(clientAuditVerdict({ checked: 3, critical: 2, review: 1, optional: 4 }, "ru")).toMatchObject({
      tone: "critical",
      status: "Исправления нужны",
      title: "Есть ошибки, которые нужно исправить в первую очередь",
    });

    expect(clientAuditVerdict({ checked: 3, critical: 0, review: 3, optional: 6 }, "ru")).toEqual({
      tone: "review",
      status: "Сначала проверить",
      title: "Критических ошибок не обнаружено",
      detail: "Срочных исправлений не требуется. Три вывода стоит проверить: после подтверждения они могут потребовать исправлений.",
      scope: "Вывод относится к 3 проверенным страницам.",
    });

    expect(clientAuditVerdict({ checked: 1, critical: 0, review: 0, optional: 2 }, "ru")).toMatchObject({
      tone: "clear",
      status: "Срочных действий нет",
      title: "Ошибок, требующих исправления, не обнаружено",
    });

    expect(clientAuditVerdict({ checked: 0, critical: 0, review: 0, optional: 0 }, "ru")).toEqual({
      tone: "review",
      status: "Нужно повторить проверку",
      title: "Недостаточно данных для вывода",
      detail: "Ни одна страница не была подробно проверена, поэтому подтвердить наличие или отсутствие ошибок нельзя.",
      scope: "Подробно проверенных страниц: 0.",
    });
  });

  it("renders a compact v4 client report without engine counters or raw classifier data", () => {
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 10,
      pagesDiscovered: 210,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: auditClientReportSnapshot() as unknown as PublicAuditResultView,
    }));

    expect(html).toContain("Проверка завершена");
    expect(html).toContain("Краткий итог");
    expect(html).toContain("100");
    expect(html).toContain("98");
    expect(html).toContain("88");
    expect(html).toContain("Исключено до выборки");
    expect(html).toContain("Предварительно просмотрено адресов");
    expect(html).toContain("Подробно проверено страниц");
    expect(html).toContain("1 вывод требует проверки · 1 возможное улучшение");
    expect(html).toContain("Мобильная производительность главной страницы");
    expect(html).toContain("Подсказка о месте страницы в структуре сайта");
    expect(html).toContain("Что нашли");
    expect(html).toContain("Почему это важно");
    expect(html).toContain("Как проверили");
    expect(html).toContain("Насколько надёжен вывод");
    expect(html).toContain("Что делать дальше");
    expect(html.replace(/<[^>]+>/gu, "")).toContain("Заголовок для поисковой выдачи (Title) и главный заголовок страницы (H1) найдены на всех 10 проверенных страницах");
    expect(html).not.toContain("Проверить остальные страницы");
    expect(html).toContain("Получить полный аудит сайта");
    expect(html).toContain("Дополнительные изображения, скрипты и документы: 16");
    expect(html).toContain("Они не входят в бесплатную проверку и не загружались; среди них документов: 16.");
    expect(html).toContain("Явный технический запрет на индексирование не обнаружен");
    expect(html).toContain("Фактическое наличие в поиске без Яндекс Вебмастера или Search Console не проверялось");
    expect(html).not.toContain("Исправить найденное");
    expect(html).not.toContain("Подтверждённые находки");
    expect(html).not.toContain("Найдено объектов");
    expect(html).not.toMatch(/url_pattern|content_pattern|template:dom|classificationConfidence|classificationReasons/u);
    expect(html).not.toContain("сохранённый отчёт прежней версии");
    expect(html).not.toContain("/100");
    expect(html).not.toContain("уровень A");

    const $ = load(html);
    const overviewChildren = $(".audit-client-overview").children();
    expect(overviewChildren.first().hasClass("audit-client-overview__status")).toBe(true);
    expect($(".audit-client-overview__status").index()).toBeLessThan($(".audit-client-verdict").index());
    expect($(".audit-client-verdict").text()).toContain("Главное по результату");
    expect($(".audit-client-verdict").text()).toContain("Критических ошибок не обнаружено");
    expect($(".audit-client-verdict__signal").length).toBe(1);
    expect($(".audit-client-verdict__meta-label").text()).toBe("Статус");
    expect($(".audit-client-verdict__score").length).toBe(0);
    expect($(".audit-client-verdict").index()).toBeLessThan($(".audit-client-overview__topline").index());
    expect($(".audit-client-issues").text()).toContain("Мобильная производительность главной страницы");
    expect($(".audit-client-issues").text()).not.toContain("Подсказка о месте страницы в структуре сайта");
    expect($(".audit-client-improvements").text()).toContain("Можно улучшить");
    expect($(".audit-client-improvements").text()).toContain("Подсказка о месте страницы в структуре сайта");
  });

  it("groups the full outside-sample URL list instead of rendering one wall of links", () => {
    const source = auditClientReportSnapshot();
    const pagesNotCheckedUrls = [
      ...Array.from({ length: 12 }, (_, index) => `https://example.com/services/service-${index + 1}`),
      ...Array.from({ length: 7 }, (_, index) => `https://example.com/blog/article-${index + 1}`),
      "https://example.com/cases/result",
      "https://example.com/checks/title",
      "https://example.com/glossary/title",
      "https://example.com/about",
    ];
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 10,
      pagesDiscovered: 100,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: {
        ...source,
        pagesNotCheckedTotal: pagesNotCheckedUrls.length,
        pagesNotCheckedReturned: pagesNotCheckedUrls.length,
        pagesNotCheckedTruncated: false,
        pagesNotCheckedUrls,
      } as unknown as PublicAuditResultView,
    }));
    const $ = load(html);
    const disclosure = $(".audit-unchecked-groups");

    expect(disclosure.attr("open")).toBeUndefined();
    expect(disclosure.find("summary").first().text()).toContain("Показать страницы, не вошедшие в выборку");
    expect(disclosure.find('[data-group="services"] h3').text()).toContain("Услуги");
    expect(disclosure.find('[data-group="services"] h3').text()).toContain("12");
    expect(disclosure.find('[data-group="articles"] h3').text()).toContain("Статьи");
    expect(disclosure.find('[data-group="cases"] h3').text()).toContain("Кейсы");
    expect(disclosure.find('[data-group="methodology"] h3').text()).toContain("Методика");
    expect(disclosure.find('[data-group="glossary"] h3').text()).toContain("Словарь");
    expect(disclosure.find('[data-group="other"] h3').text()).toContain("Остальные");
    expect(disclosure.find('[data-group="services"] .audit-url-group-more > summary').text()).toContain("Показать ещё 4");
  });

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
    expect(html).toContain("Нет видимого главного заголовка страницы.");
    expect(html).toContain("Пояснения к словам в отчёте");
    expect(html).not.toContain("<table");
  });

  it("labels a saved resultVersion 2 report as an earlier format without showing an aggregate score", () => {
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

    expect(html).toContain("Это сохранённый отчёт прежней версии");
    expect(html).toContain("не используем старый общий балл");
    expect(html).not.toContain("/100");
  });

  it("renders contract v2 facts and keeps not-run checks distinct from passed checks", () => {
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 2,
      pagesDiscovered: 12,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: {
        resultVersion: 3,
        contractVersion: 2,
        engineVersion: "audit-contract-v2.0.0",
        auditId: "audit-1",
        createdAt: "2026-08-30T10:00:00.000Z",
        target: "https://example.com/",
        pagesDiscovered: 12,
        pagesSelected: 2,
        pagesChecked: 2,
        pagesNotCheckedTotal: 10,
        pagesNotCheckedReturned: 2,
        pagesNotCheckedTruncated: true,
        pagesNotCheckedUrls: ["https://example.com/a", "https://example.com/b"],
        coverageStatus: "sample_complete",
        selectedPages: [
          { url: "https://example.com/", pageType: "Главная", selectionReason: "Главная страница", templateFamily: "home", locale: "ru" },
          { url: "https://example.com/services", pageType: "Раздел услуг", selectionReason: "Другой тип страницы", templateFamily: "services", locale: "ru" },
        ],
        checkedPages: [{
          url: "https://example.com/",
          finalUrl: "https://example.com/",
          http: { status: 200, ok: true, redirectCount: 0 },
          title: { value: "Главная", present: true, length: 7, optimal: false },
          description: { value: "Описание главной", present: true, length: 16, optimal: false },
          h1: { count: 1, values: ["Главная"] },
          noindex: false,
          canonical: { url: "https://example.com/", valid: true, selfReferential: true },
          sitemap: { status: "checked", included: true },
          internalLinks: { outgoing: 4, incomingFromCheckedPages: 1 },
        }, {
          url: "https://example.com/services",
          finalUrl: "https://example.com/services",
          http: { status: 200, ok: true, redirectCount: 0 },
          title: { value: "Услуги", present: true, length: 6, optimal: false },
          description: { value: null, present: false, length: 0, optimal: false },
          h1: { count: 0, values: [] },
          noindex: false,
          canonical: { url: "https://example.com/services", valid: true, selfReferential: true },
          sitemap: { status: "checked", included: true },
          internalLinks: { outgoing: 2, incomingFromCheckedPages: 1 },
        }],
        checks: [
          {
            checkId: "h1",
            checkVersion: 1,
            category: "structureOnPage",
            title: "Главный заголовок",
            status: "fail",
            value: { passing: 1, checked: 2 },
            expected: "На каждой странице ровно один H1.",
            severity: "high",
            urlEvidence: [{ url: "https://example.com/services", observation: "H1 отсутствует" }],
            explanation: "На одной странице не найден главный заголовок.",
            automationLimit: "Вывод относится только к выбранным страницам.",
          },
          {
            checkId: "lcp",
            checkVersion: 1,
            category: "performanceMobile",
            title: "Появление основного содержимого",
            status: "not_run",
            value: null,
            expected: "Основное содержимое появляется не дольше 2,5 секунды.",
            severity: "high",
            urlEvidence: [],
            explanation: "Отдельный замер скорости не запускался.",
            automationLimit: "Нужен отдельный запуск измерения скорости.",
          },
          {
            checkId: "titles",
            checkVersion: 1,
            category: "structureOnPage",
            title: "Заголовки для выдачи",
            status: "pass",
            value: { passing: 2, checked: 2 },
            expected: "У каждой страницы есть понятный title.",
            severity: "high",
            urlEvidence: [{ url: "https://example.com/", observation: "Title: 48 символов" }],
            explanation: "У проверенных страниц заголовки заданы.",
            automationLimit: "Вывод относится только к выбранным страницам.",
          },
        ],
        categorySummary: [],
        resultSummary: {
          headline: "Проверены все выбранные страницы: 2",
          totalChecks: 3,
          completedChecks: 2,
          pass: 1,
          warning: 0,
          fail: 1,
          not_run: 1,
          insufficient_data: 0,
        },
      },
    }));

    expect(html).toContain("Проверены все выбранные страницы: 2");
    expect(html).toContain("Версия проверки");
    expect(html).toContain("Сначала — то, что требует действий");
    expect(html).toContain("Успешные проверки");
    expect(html).toContain("Замеры без результата");
    expect(html).toContain("1 ошибка");
    expect(html).toContain("1 замер не запускался");
    expect(html).toContain("Где и что найдено");
    expect(html).toContain("https://example.com/services");
    expect(html).toContain("Этот замер не выполнялся");
    expect(html).toContain("На всех 2 страницах условие выполнено");
    expect(html).toContain("Факты по каждой проверенной странице");
    expect(html).toContain("Описание для выдачи (meta description)");
    expect(html).toContain("на страницу: 1; со страницы: 2");
    expect(html).toContain("Не заполнено описание страницы для поисковой выдачи.");
    expect(html).not.toContain("Есть отклонение, которое стоит проверить");
    expect(html).not.toContain('class="audit-page-card" open');
    expect(html).not.toContain("В проверенной выборке замечаний не найдено");
    expect(html).not.toContain("h1 · v1");
    expect(html).not.toContain("/100");
    expect(html).not.toContain(">Балл<");
  });

  it("offers checking the remaining pages instead of discussing fixes when the contract has no findings", () => {
    const html = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 1,
      pagesDiscovered: 3,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: {
        resultVersion: 3,
        contractVersion: 2,
        engineVersion: "audit-contract-v2.0.0",
        auditId: "audit-clean",
        createdAt: "2026-08-30T10:00:00.000Z",
        target: "https://example.com/",
        pagesDiscovered: 3,
        pagesSelected: 1,
        pagesChecked: 1,
        pagesNotCheckedTotal: 2,
        pagesNotCheckedReturned: 2,
        pagesNotCheckedTruncated: false,
        pagesNotCheckedUrls: ["https://example.com/a", "https://example.com/b"],
        coverageStatus: "sample_complete",
        selectedPages: [{ url: "https://example.com/", pageType: "Главная", selectionReason: "Главная страница", templateFamily: "home", locale: "ru" }],
        checks: [{
          checkId: "status",
          checkVersion: 1,
          category: "technicalIndexing",
          title: "Ответы страниц",
          status: "pass",
          value: { passing: 1, checked: 1 },
          expected: "Страница отвечает без ошибки.",
          severity: "critical",
          urlEvidence: [{ url: "https://example.com/", observation: "HTTP 200" }],
          explanation: "Страница открылась без ошибки.",
          automationLimit: "Проверена выбранная страница.",
        }],
        categorySummary: [],
        resultSummary: {
          headline: "Проверены все выбранные страницы: 1",
          totalChecks: 1,
          completedChecks: 1,
          pass: 1,
          warning: 0,
          fail: 0,
          not_run: 0,
          insufficient_data: 0,
        },
      },
    }));

    expect(html).toContain("Проверить остальные страницы");
    expect(html).toContain("Получить полный аудит");
    expect(html).not.toContain("Обсудить исправления");
    expect(html).not.toContain("Исправить найденное");
  });
});
