import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { buildPublicAuditPdfModel, clientPagePdfStatus, createAdminAuditPdf, createPublicAuditPdf, PUBLIC_AUDIT_DISCLAIMER } from "../../src/lib/reports/audit-pdf";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

describe("admin audit PDF", () => {
  it("uses a nested v4 public snapshot and keeps not-applicable separate", async () => {
    const publicResult = auditV4Snapshot();
    const model = buildPublicAuditPdfModel(publicResult, "ru");

    expect(model).toMatchObject({
      contractVersion: 3,
      statusCounts: { pass: 1, fail: 1, not_applicable: 1, not_run: 1 },
      inventorySummary: { objectsFound: 4, eligibleHtml: 2, selected: 2, checked: 2 },
    });
    expect(model.checks.find((check) => check.status === "not_applicable")?.explanation)
      .toBe("Другие языковые версии не обнаружены");
    expect(model.issues[0]).toMatchObject({
      observation: "Главный заголовок H1 не найден",
      recommendation: "Добавьте один видимый главный заголовок.",
    });
    expect(model.technicalResources.map((item) => item.resourceType)).toEqual(["robots", "sitemap"]);

    const bytes = await createAdminAuditPdf({
      audit: {
        id: "00000000-0000-4000-8000-000000000004",
        normalizedDomain: "example.com",
        originalUrl: "https://example.com/",
        name: "Тестовый клиент",
        contact: "test@example.com",
        status: "completed",
        overallScore: 100,
        grade: "A",
        partial: 0,
        pagesChecked: 2,
        pagesDiscovered: 2,
        createdAt: Date.UTC(2026, 8, 1, 10),
        completedAt: Date.UTC(2026, 8, 1, 10, 1),
      },
      fullResult: { resultVersion: 4, contractVersion: 3, publicResult },
      issues: [],
      pages: [],
    });

    const document = await PDFDocument.load(bytes);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(document.getPageCount()).toBeGreaterThan(1);
  });

  it("embeds Cyrillic fonts and produces a multipage private report", async () => {
    const longUrl = `https://example.com/catalog/${"очень-длинный-сегмент-".repeat(18)}`;
    const bytes = await createAdminAuditPdf({
      audit: {
        id: "00000000-0000-4000-8000-000000000001",
        normalizedDomain: "example.com",
        originalUrl: "https://example.com/",
        name: "Тестовый клиент",
        contact: "test@example.com",
        status: "completed",
        overallScore: 73,
        grade: "B",
        partial: 0,
        pagesChecked: 2,
        pagesDiscovered: 2,
        createdAt: Date.UTC(2026, 7, 16),
        completedAt: Date.UTC(2026, 7, 16, 0, 1),
      },
      fullResult: { score: { categories: { technicalIndexing: { score: 24, maxScore: 30, coverage: 1, partial: false, checks: [{ id: "status", label: "HTTP 2xx", value: 0.5, weight: 6 }] } } } },
      issues: Array.from({ length: 18 }, (_, index) => ({ severity: index % 3 === 0 ? "high" : "medium", code: `TEST_${index}`, url: longUrl, evidence: "Подтверждённая техническая проблема на странице.", recommendation: "Исправить причину и повторно проверить URL." })),
      pages: [{ url: "https://example.com/", statusCode: 200, data: { title: { value: "Главная страница" } } }, { url: longUrl, statusCode: 404, data: { title: { value: "Страница не найдена" } } }],
    });
    const document = await PDFDocument.load(bytes);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(document.getTitle()).toBe("KILENI SEO audit — example.com");
    expect(document.getPageCount()).toBeGreaterThan(1);
  });

  it("renders the current admin PDF from the immutable Audit Contract snapshot", async () => {
    const publicResult = {
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: "contract-admin-test",
      createdAt: "2026-08-30T10:00:00.000Z",
      target: "https://example.com/",
      pagesDiscovered: 12,
      pagesSelected: 1,
      pagesChecked: 1,
      pagesNotCheckedTotal: 11,
      pagesNotCheckedReturned: 1,
      pagesNotCheckedTruncated: true,
      pagesNotCheckedUrls: ["https://example.com/blog/example"],
      coverageStatus: "sample_complete",
      selectedPages: [{ url: "https://example.com/", pageType: "Главная", selectionReason: "Главная точка входа" }],
      checks: [{
        checkId: "h1",
        checkVersion: 1,
        category: "structureOnPage",
        title: "Главный заголовок",
        status: "fail",
        value: { passing: 0, checked: 1 },
        expected: "На странице ровно один H1.",
        severity: "high",
        urlEvidence: [{ url: "https://example.com/", observation: "H1 отсутствует" }],
        explanation: "На выбранной странице не найден главный заголовок.",
        automationLimit: "Вывод относится только к выбранной странице.",
      }],
      categorySummary: [],
      resultSummary: { headline: "Найдена ошибка", totalChecks: 1, completedChecks: 1, pass: 0, warning: 0, fail: 1, not_run: 0, insufficient_data: 0 },
    };
    const bytes = await createAdminAuditPdf({
      audit: {
        id: "00000000-0000-4000-8000-000000000002",
        normalizedDomain: "example.com",
        originalUrl: "https://example.com/",
        name: "Тестовый клиент",
        contact: "test@example.com",
        status: "completed",
        overallScore: 99,
        grade: "A",
        partial: 0,
        pagesChecked: 1,
        pagesDiscovered: 12,
        createdAt: Date.UTC(2026, 7, 30, 10),
        completedAt: Date.UTC(2026, 7, 30, 10, 1),
      },
      fullResult: { resultVersion: 3, contractVersion: 2, publicResult },
      issues: [{ severity: "high", code: "LEGACY_ONLY", evidence: "Не должно заменять контракт" }],
      pages: [],
    });

    const document = await PDFDocument.load(bytes);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});

describe("public audit PDF", () => {
  it("snapshots the client-facing labels extracted from the generated PDF", async () => {
    const source = auditClientReportSnapshot();
    const selectedPages = source.selectedPages.map((page, index) => index === source.selectedPages.length - 1
      ? {
          ...page,
          url: "https://example.com/en/yandex-ads",
          pageType: "commercial",
          selectionReason: "primary_locale_type_missing",
          locale: "en",
        }
      : page);
    const checkedPages = source.checkedPages.map((page, index) => index === source.checkedPages.length - 1
      ? { ...page, url: "https://example.com/en/yandex-ads", finalUrl: "https://example.com/en/yandex-ads", pageType: "commercial" }
      : page);
    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: null,
      grade: null,
      partial: false,
      pagesChecked: source.pagesChecked,
      pagesDiscovered: source.pagesDiscovered,
      completedAt: Date.UTC(2026, 8, 4, 12),
      publicResult: {
        ...source,
        exclusionSummary: [{ reason: "technical_page", count: 2 }],
        selectedPages,
        checkedPages,
      } as unknown as Record<string, unknown>,
    });
    const text = (await extractPdfText(bytes)).replace(/\s+/gu, " ").trim();
    const expectedClientStrings = [
      "Предварительно просмотрено адресов: 100",
      "Подробно проверено страниц: 10",
      "1 вывод требует проверки",
      "Юридические и служебные страницы: 2",
      "Англоязычная страница услуги",
      "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
    ];

    expect(expectedClientStrings.map((value) => text.includes(value) ? value : `ОТСУТСТВУЕТ: ${value}`)).toMatchInlineSnapshot(`
      [
        "Предварительно просмотрено адресов: 100",
        "Подробно проверено страниц: 10",
        "1 вывод требует проверки",
        "Юридические и служебные страницы: 2",
        "Англоязычная страница услуги",
        "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
      ]
    `);
    expect(text).not.toContain("Техническая страница: 2");
    expect(text).not.toContain("Контроль другой языковой версии");
  });

  it("does not label a missing BreadcrumbList as an error and keeps the report bounded", async () => {
    const snapshot = auditClientReportSnapshot();
    const model = buildPublicAuditPdfModel(snapshot, "ru");
    const homepage = model.clientPresentation.pages.find((page) => page.url === "https://example.com/");
    const services = model.clientPresentation.pages.find((page) => page.url === "https://example.com/services");
    const clean = model.clientPresentation.pages.find((page) => page.url === "https://example.com/pricing");

    expect(homepage && clientPagePdfStatus(homepage, true)).toEqual({ label: "требует внимания", kind: "review" });
    expect(services && clientPagePdfStatus(services, true)).toEqual({ label: "замечаний нет", kind: "none" });
    expect(clean && clientPagePdfStatus(clean, true)).toEqual({ label: "замечаний нет", kind: "none" });

    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: null,
      grade: null,
      partial: false,
      pagesChecked: snapshot.pagesChecked,
      pagesDiscovered: snapshot.pagesDiscovered,
      completedAt: Date.UTC(2026, 8, 4, 12),
      publicResult: snapshot as unknown as Record<string, unknown>,
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeLessThanOrEqual(8);
  });

  it("uses the mandatory KILENI preliminary-assessment disclaimer", () => {
    expect(PUBLIC_AUDIT_DISCLAIMER.ru).toBe("Это предварительная внутренняя оценка KILENI публичной части сайта, а не официальный показатель Яндекса, Google или PageSpeed.");
    expect(PUBLIC_AUDIT_DISCLAIMER.en).toMatch(/preliminary internal KILENI assessment/iu);
  });

  it("contains only the result already visible from the public audit link", async () => {
    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: 73,
      grade: "B",
      partial: false,
      pagesChecked: 12,
      pagesDiscovered: 15,
      completedAt: Date.UTC(2026, 7, 16, 12, 30),
      publicResult: {
        categories: [{ name: "Индексация", risk: "high", explanation: "Нужно проверить доступность страниц." }],
      },
    });
    const document = await PDFDocument.load(bytes);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(document.getTitle()).toBe("Предварительная SEO-проверка — example.com");
    expect(document.getPageCount()).toBeGreaterThan(0);
  });

  it("keeps current v2 issue evidence and page-level facts in the printable model", async () => {
    const publicResult = {
      resultVersion: 2,
      summary: { headline: "В выборке найдено замечаний: 1", facts: ["Старая техническая строка не должна попасть в PDF."] },
      indexability: { status: "checked", checkedPages: 1, indexablePages: 0, noindexPages: 1, httpErrorPages: 0, ratio: 0 },
      issueGroups: [{
        code: "H1_MISSING",
        category: "structureOnPage",
        severity: "high",
        title: "Нет H1",
        why: "На странице нет главного заголовка.",
        fix: "Добавьте один содержательный H1.",
        acceptance: "Повторная проверка не находит проблему «Нет H1».",
        affectedCount: 1,
        affectedUrls: ["https://example.com/service"],
        evidence: [{ url: "https://example.com/service", observation: "На странице нет главного заголовка." }],
      }],
      checkedPages: [{
        url: "https://example.com/service",
        finalUrl: "https://example.com/service",
        http: { status: 200, ok: true, redirectCount: 0 },
        title: { value: "Услуга", present: true, length: 45, optimal: true },
        description: { value: null, present: false, length: 0, optimal: false },
        h1: { count: 0, values: [] },
        noindex: true,
        canonical: { url: "https://example.com/service", valid: true, selfReferential: true },
        sitemap: { status: "checked", included: false },
        internalLinks: { outgoing: 3, incomingFromCheckedPages: 0 },
      }],
    };

    const model = buildPublicAuditPdfModel(publicResult, "ru");
    expect(model.issues).toHaveLength(1);
    expect(model.issues[0]).toMatchObject({
      title: "Нет главного заголовка страницы (H1)",
      affectedUrls: ["https://example.com/service"],
    });
    expect(model.issues[0]?.whyItMatters).toContain("основную тему страницы");
    expect(model.issues[0]?.recommendation).toContain("один видимый главный заголовок");
    expect(model.pages[0]?.findings).toEqual(expect.arrayContaining([
      "Не заполнено описание страницы для поисковой выдачи.",
      "Нет видимого главного заголовка страницы.",
      "В коде страницы есть команда noindex — запрет показывать её в результатах поиска.",
      "Страница не указана в файле со списком страниц (sitemap.xml).",
      "Среди проверенных страниц не найдена ссылка на этот адрес.",
    ]));
    expect(model.summary.facts.join(" ")).not.toContain("Старая техническая строка");

    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: 61,
      grade: "C",
      partial: false,
      pagesChecked: 1,
      pagesDiscovered: 1,
      completedAt: Date.UTC(2026, 7, 16, 12, 30),
      publicResult,
    });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
  });

  it("marks a resultVersion 2 snapshot as an earlier printable format", () => {
    const model = buildPublicAuditPdfModel({ resultVersion: 2, issueGroups: [], checkedPages: [] }, "ru");
    expect(model.isLegacy).toBe(true);
    expect(model.issues).toEqual([]);
  });

  it("uses Audit Contract v2 as the printable source of truth without recreating a score", async () => {
    const publicResult = {
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: "audit-contract-test",
      createdAt: "2026-08-30T10:00:00.000Z",
      target: "https://example.com/",
      pagesDiscovered: 24,
      pagesSelected: 2,
      pagesChecked: 2,
      pagesNotCheckedTotal: 22,
      pagesNotCheckedReturned: 2,
      pagesNotCheckedTruncated: true,
      pagesNotCheckedUrls: ["https://example.com/blog/a", "https://example.com/blog/b"],
      coverageStatus: "sample_complete",
      selectedPages: [
        { url: "https://example.com/", pageType: "Главная", selectionReason: "Главная точка входа", templateFamily: "home", locale: "ru" },
        { url: "https://example.com/services", pageType: "Услуги", selectionReason: "Коммерческая страница другого шаблона", templateFamily: "services", locale: "ru" },
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
          checkId: "status",
          checkVersion: 1,
          category: "technicalIndexing",
          title: "Ответы страниц",
          status: "pass",
          value: { passing: 2, checked: 2 },
          expected: "Каждая выбранная страница отвечает HTTP 2xx.",
          severity: "critical",
          urlEvidence: [{ url: "https://example.com/", observation: "HTTP 200" }],
          explanation: "Проверка выполнена: 2 из 2 страниц соответствуют условию.",
          automationLimit: "Вывод относится только к выбранным страницам.",
        },
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
          explanation: "На одной из двух страниц не найден главный заголовок.",
          automationLimit: "Вывод относится только к выбранным страницам.",
        },
        {
          checkId: "lighthouse",
          checkVersion: 1,
          category: "performanceMobile",
          title: "Скорость загрузки",
          status: "not_run",
          value: null,
          expected: "Отдельный замер скорости завершён.",
          severity: "medium",
          urlEvidence: [],
          explanation: "Отдельный замер скорости не запускался.",
          automationLimit: "Для этого нужен отдельный запуск Lighthouse.",
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
    };

    const model = buildPublicAuditPdfModel(publicResult, "ru");
    expect(model.contractVersion).toBe(2);
    expect(model.engineVersion).toBe("audit-contract-v2.0.0");
    expect(model.checks.map((check) => check.status)).toEqual(["pass", "fail", "not_run"]);
    expect(model.checks[0]).toMatchObject({
      category: "technicalIndexing",
      expected: "Каждая выбранная страница открывается без ошибки сервера (код ответа от 200 до 299).",
      explanation: "Проверено страниц: 2. На всех 2 страницах условие выполнено.",
      evidence: [{ url: "https://example.com/", observation: "Код ответа 200: страница открылась без ошибки." }],
    });
    expect(model.selectedPages).toHaveLength(2);
    expect(model.pages).toHaveLength(2);
    expect(model.pages[1]).toMatchObject({
      url: "https://example.com/services",
      status: 200,
      title: "Услуги",
      description: "",
      h1: "",
      inSitemap: true,
      outgoingLinks: 2,
      incomingFromCheckedPages: 1,
    });
    expect(model.pages[1]?.findings).toEqual(expect.arrayContaining([
      "Не заполнено описание страницы для поисковой выдачи.",
      "Нет видимого главного заголовка страницы.",
    ]));
    expect(model.unchecked).toMatchObject({ total: 22, returned: 2, truncated: true });
    expect(model.summary.headline).toBe("Проверены все выбранные страницы: 2");

    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: 99,
      grade: "A",
      partial: false,
      pagesChecked: 2,
      pagesDiscovered: 24,
      completedAt: Date.UTC(2026, 7, 30, 13),
      publicResult,
    });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(document.getPageCount()).toBeLessThanOrEqual(3);
  });

  it("keeps the largest free Audit Contract report readable without runaway pagination", async () => {
    const selectedPages = Array.from({ length: 10 }, (_, index) => ({
      url: `https://example.com/${index ? `section-${index}` : ""}`,
      pageType: index ? `Тип страницы ${index + 1}` : "Главная",
      selectionReason: index ? "Отдельный шаблон страницы" : "Главная точка входа",
    }));
    const checkedPages = selectedPages.map((page, index) => ({
      url: page.url,
      finalUrl: page.url,
      http: { status: 200, ok: true, redirectCount: 0 },
      title: { value: `Проверяемая страница ${index + 1}`, present: true, length: 32, optimal: true },
      description: { value: "Понятное описание страницы", present: true, length: 28, optimal: true },
      h1: { count: 1, values: [`Заголовок ${index + 1}`] },
      noindex: false,
      canonical: { url: page.url, valid: true, selfReferential: true },
      sitemap: { status: "checked", included: true },
      internalLinks: { outgoing: 4, incomingFromCheckedPages: 2 },
    }));
    const statuses = ["fail", "warning", "pass", "not_run", "insufficient_data"] as const;
    const checks = Array.from({ length: 30 }, (_, index) => {
      const status = statuses[index % statuses.length]!;
      return {
        checkId: `check-${index + 1}`,
        checkVersion: 1,
        category: `category-${index % 6}`,
        title: `Проверка ${index + 1}: конкретный технический сигнал`,
        status,
        value: status === "not_run" || status === "insufficient_data" ? null : { checked: 10, passing: status === "pass" ? 10 : 8 },
        expected: "Все выбранные страницы должны соответствовать проверяемому условию.",
        severity: status === "fail" ? "high" : "medium",
        urlEvidence: status === "fail" || status === "warning"
          ? [{ url: selectedPages[index % selectedPages.length]!.url, observation: `Наблюдение ${index + 1}` }]
          : [],
        explanation: status === "not_run"
          ? "Проверка не запускалась: для неё нужен отдельный внешний замер."
          : status === "insufficient_data"
            ? "Публичных данных недостаточно для уверенного вывода."
            : `Сохранён воспроизводимый результат проверки ${index + 1}.`,
        automationLimit: "Вывод относится только к десяти выбранным публичным страницам.",
      };
    });
    const publicResult = {
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: "largest-public-pdf",
      createdAt: "2026-08-30T18:00:00.000Z",
      target: "https://example.com/",
      pagesDiscovered: 24,
      pagesSelected: 10,
      pagesChecked: 10,
      pagesNotCheckedTotal: 14,
      pagesNotCheckedReturned: 14,
      pagesNotCheckedTruncated: false,
      pagesNotCheckedUrls: Array.from({ length: 14 }, (_, index) => `https://example.com/not-checked-${index + 1}`),
      coverageStatus: "sample_complete",
      selectedPages,
      checkedPages,
      checks,
      categorySummary: [],
      resultSummary: {
        headline: "Бесплатный лимит достигнут. Проверено 10 выбранных страниц",
        totalChecks: 30,
        completedChecks: 18,
        pass: 6,
        warning: 6,
        fail: 6,
        not_run: 6,
        insufficient_data: 6,
      },
    };

    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: null,
      grade: null,
      partial: false,
      pagesChecked: 10,
      pagesDiscovered: 24,
      completedAt: Date.UTC(2026, 7, 30, 18),
      publicResult,
    });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(4);
    expect(document.getPageCount()).toBeLessThanOrEqual(6);
  });

  it("groups repeated v4 check titles instead of filling pages with the same label", async () => {
    const base = auditV4Snapshot();
    const repeatedChecks = Array.from({ length: 240 }, (_, index) => ({
      ...base.checks[3],
      checkId: `technical-resource-${index + 1}`,
      title: index < 200 ? "Ответ технического файла" : "Тип технического файла",
      status: "not_run" as const,
      reason: "Ресурс не запрашивался, поэтому код ответа не сохранён",
    }));
    const publicResult = {
      ...base,
      checks: repeatedChecks,
      findings: [],
      categorySummary: [{
        category: "technicalIndexing",
        total: repeatedChecks.length,
        pass: 0,
        warning: 0,
        fail: 0,
        not_applicable: 0,
        not_run: repeatedChecks.length,
        insufficient_data: 0,
      }],
      resultSummary: {
        headline: "Подтверждённых ошибок: 0",
        totalChecks: repeatedChecks.length,
        completedChecks: 0,
        pass: 0,
        warning: 0,
        fail: 0,
        not_applicable: 0,
        not_run: repeatedChecks.length,
        insufficient_data: 0,
      },
    };

    const bytes = await createPublicAuditPdf({
      locale: "ru",
      normalizedDomain: "example.com",
      score: null,
      grade: null,
      partial: false,
      pagesChecked: 2,
      pagesDiscovered: 2,
      completedAt: Date.UTC(2026, 8, 1, 12),
      publicResult,
    });

    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeLessThanOrEqual(4);
  });
});

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "kileni-audit-pdf-"));
  const pdfPath = join(directory, "report.pdf");
  const textPath = join(directory, "report.txt");
  try {
    await writeFile(pdfPath, bytes);
    await promisify(execFile)("pdftotext", ["-layout", pdfPath, textPath]);
    return await readFile(textPath, "utf8");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
