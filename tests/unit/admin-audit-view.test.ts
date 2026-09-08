import { describe, expect, it } from "vitest";

import {
  auditStatusLabel,
  buildAuditIssueViews,
  buildAuditContractView,
  buildIndexingView,
  buildPerformanceView,
  buildAuditPageViews,
  emailDeliveryView,
  formatAuditDuration,
  maskAuditContact,
  readableEntries,
  safeHttpUrl,
} from "@/app/admin/_lib/audit-view";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

describe("представление аудита в админке", () => {
  it("строит карточку v4 без потери неприменимых проверок и фактов инвентаря", () => {
    const snapshot = auditV4Snapshot();
    const view = buildAuditContractView(snapshot, { publicResult: snapshot });

    expect(view).toMatchObject({
      contractVersion: 3,
      pagesDiscovered: 2,
      pagesEligible: 2,
      pagesSelected: 2,
      pagesChecked: 2,
      inventorySummary: {
        objectsFound: 4,
        htmlFound: 2,
        eligibleHtml: 2,
        representedPageTypes: 2,
      },
      statusCounts: { pass: 1, fail: 1, notApplicable: 1, notRun: 1 },
    });
    expect(view?.checks.find((check) => check.status === "not_applicable")?.statusLabel)
      .toBe("Не относится к объекту");
    expect(view?.selectedPages[1]).toMatchObject({
      templateFamily: "product:/product/:detail",
      classificationConfidence: 0.91,
      classificationReasons: ["Найдена разметка Product"],
    });
    expect(view?.findings[0]).toMatchObject({
      whatFound: "Главный заголовок H1 не найден",
      nextStep: "Добавьте один видимый главный заголовок.",
    });
    expect(view?.technicalResources.map((item) => item.resourceType))
      .toEqual(["robots", "sitemap"]);
    expect(JSON.stringify(view)).not.toMatch(/"score"|"grade"/u);
  });

  it("извлекает полный инвентарь и причины решений из служебного снимка", () => {
    const snapshot = auditV4Snapshot();
    const view = buildAuditContractView(snapshot, {
      publicResult: snapshot,
      inventory: [{
        url: "https://example.com/",
        finalUrl: "https://example.com/",
        resourceType: "html",
        pageType: "homepage",
        templateFamily: "homepage:root",
        statusCode: 200,
        classificationConfidence: 0.98,
        classificationReasons: ["Корневой путь сайта"],
      }, {
        url: "https://example.com/services/seo",
        finalUrl: "https://example.com/services/seo",
        resourceType: "html",
        pageType: "service",
        templateFamily: "service:/services/:detail",
        statusCode: null,
        classificationConfidence: 0.82,
        classificationReasons: ["Путь похож на страницу услуги"],
      }, {
        url: "https://example.com/catalog.pdf",
        finalUrl: "https://example.com/catalog.pdf",
        resourceType: "document",
        pageType: null,
        templateFamily: "document",
        statusCode: 200,
        contentType: "application/pdf",
        classificationConfidence: 0.99,
        classificationReasons: ["Расширение PDF"],
      }, {
        url: "https://example.com/services/seo-copy",
        finalUrl: "https://example.com/services/seo-copy",
        resourceType: "html",
        pageType: "service",
        templateFamily: "service:/services/:detail",
        statusCode: 200,
        classificationConfidence: 0.9,
        classificationReasons: ["Страница услуги"],
      }],
      inventoryDecisions: [{
        url: "https://example.com/",
        included: true,
        reason: "homepage",
      }, {
        url: "https://example.com/services/seo",
        included: false,
        reason: "not_selected_within_limit",
      }, {
        url: "https://example.com/catalog.pdf",
        included: false,
        reason: "technical_resource",
      }, {
        url: "https://example.com/services/seo-copy",
        finalUrl: "https://example.com/services/seo-copy",
        included: false,
        reason: "excluded_by_sampling_rules:confirmed_duplicate",
        primaryUrl: "https://example.com/services/seo",
      }],
    });

    expect(view?.inventory).toEqual([
      expect.objectContaining({
        url: "https://example.com/",
        resourceTypeLabel: "Страница сайта (HTML)",
        pageTypeLabel: "Главная",
        included: true,
        decisionLabel: "Главная страница",
      }),
      expect.objectContaining({
        url: "https://example.com/services/seo",
        pageTypeLabel: "Услуга",
        included: false,
        decisionLabel: "Подходит для проверки, но не вошла в лимит 10 страниц",
      }),
      expect.objectContaining({
        url: "https://example.com/catalog.pdf",
        resourceTypeLabel: "Документ",
        included: false,
        decisionLabel: "Технический файл проверяется отдельно",
      }),
      expect.objectContaining({
        url: "https://example.com/services/seo-copy",
        decisionLabel: "Исключена до выборки: подтверждённый дубликат",
        decisionPrimaryUrl: "https://example.com/services/seo",
      }),
    ]);
  });

  it("показывает русский статус и маскирует email в общем списке", () => {
    expect(auditStatusLabel("crawling_pages")).toBe("Обход страниц");
    expect(maskAuditContact("anna.kalinovskaya@example.ru", "email")).toBe("a***a@example.ru");
  });

  it("показывает длительность завершённой проверки без технических миллисекунд", () => {
    expect(formatAuditDuration({ startedAt: 1_000, completedAt: 66_000 })).toBe("1 мин 5 с");
  });

  it("явно сообщает, когда отправка результата по email не подключена", () => {
    expect(emailDeliveryView({
      contactType: "email",
      auditStatus: "completed",
      notificationStatus: "skipped",
      notificationError: "not_configured",
      providerConfigured: false,
    })).toMatchObject({ key: "not_connected", label: "Не подключён" });
  });

  it("безопасно показывает старую страницу без сохранённого анализа", () => {
    expect(buildAuditPageViews([
      { id: "old-page", url: "https://example.ru/old", statusCode: 301, depth: 2, data: null },
    ], null)[0]).toMatchObject({
      id: "old-page",
      statusCode: 301,
      title: "Нет данных",
      indexability: "Не определено",
      issueCount: 0,
    });
  });

  it("дополняет сохранённую проблему понятным названием из полного результата", () => {
    const issues = buildAuditIssueViews([
      { id: "db-issue", code: "missing_title", severity: "high", url: "https://example.ru/page", recommendation: "Добавить title" },
    ], {
      issues: [{ code: "missing_title", severity: "high", url: "https://example.ru/page", title: "Не задан title", description: "Поиску нечего показать" }],
    });
    expect(issues[0]).toMatchObject({ id: "db-issue", title: "Не задан title", severityLabel: "Высокая" });
  });

  it("превращает старый вложенный payload в читаемые пары вместо сырого JSON", () => {
    expect(readableEntries({ progress: { pagesChecked: 10 }, cached: true })).toEqual([
      { label: "progress.pagesChecked", value: "10" },
      { label: "cached", value: "Да" },
    ]);
  });

  it("сводит технические сигналы индексации в понятные счётчики", () => {
    const pages = buildAuditPageViews([], {
      pages: [
        { url: "https://example.ru/", status: 200, indexing: { noindex: false, nofollow: false }, canonical: { url: "https://example.ru/", valid: true } },
        { url: "https://example.ru/private", status: 200, indexing: { noindex: true, nofollow: true }, canonical: { url: null, valid: false } },
      ],
    });
    expect(buildIndexingView({ robots: { status: "found", allowedRoot: true }, sitemap: { status: "found", urls: ["https://example.ru/"] } }, pages)).toMatchObject({
      robotsLabel: "Доступ разрешён",
      sitemapLabel: "Найдена",
      indexablePages: 1,
      noindexPages: 1,
      canonicalProblems: 1,
    });
  });

  it("нормализует показатели Lighthouse и время ответа страниц", () => {
    const performance = buildPerformanceView(
      { performance: { performance: 0.93, accessibility: 1, lcpMs: 1_850, cls: 0.04, tbtMs: 80 } },
      [{ responseTimeMs: 120 }, { responseTimeMs: 280 }],
    );
    expect(performance).toMatchObject({ score: 93, accessibility: 100, averageResponseMs: 200, measuredPages: 2 });
  });

  it("не превращает старое опасное значение URL в кликабельную ссылку", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://example.ru/page")).toBe("https://example.ru/page");
  });

  it("строит карточку Audit Contract v2 из того же сохранённого snapshot", () => {
    const contract = buildAuditContractView({
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      coverageStatus: "sample_complete",
      pagesDiscovered: 24,
      pagesSelected: 2,
      pagesChecked: 2,
      pagesNotCheckedTotal: 22,
      resultSummary: { pass: 1, warning: 0, fail: 1, not_run: 1, insufficient_data: 0, totalChecks: 3, completedChecks: 2 },
      selectedPages: [{ url: "https://example.ru/services", pageType: "service", selectionReason: "Другой коммерческий шаблон" }],
      checks: [{
        checkId: "h1",
        checkVersion: 1,
        title: "Главный заголовок",
        category: "structureOnPage",
        severity: "high",
        status: "fail",
        explanation: "H1 отсутствует на одной странице.",
        expected: "На каждой странице ровно один H1.",
        automationLimit: "Только выбранные страницы.",
        urlEvidence: [{ url: "https://example.ru/services", observation: "H1 отсутствует" }],
      }],
    }, null);

    expect(contract).toMatchObject({
      engineVersion: "audit-contract-v2.0.0",
      coverageLabel: "Все выбранные страницы проверены",
      pagesNotCheckedTotal: 22,
      statusCounts: { pass: 1, fail: 1, notRun: 1 },
    });
    expect(contract?.selectedPages[0]).toMatchObject({ pageType: "service", selectionReason: "Другой коммерческий шаблон" });
    expect(contract?.checks[0]).toMatchObject({
      id: "h1",
      status: "fail",
      statusLabel: "Ошибка",
      evidenceCount: 1,
      title: "Есть ли один главный заголовок",
      explanation: expect.stringContaining("H1 отсутствует"),
      nextAction: expect.stringContaining("H1"),
    });
  });

  it("uses persisted admin QA and offer metadata when the audit snapshot does not contain them", () => {
    const contract = buildAuditContractView({
      contractVersion: 2,
      checks: [],
      selectedPages: [],
      resultSummary: {},
    }, null, {
      qaLabel: "Playwright · карточка аудита",
      offerSnapshot: { id: "seo-audit-200", title: "Полный SEO-аудит", price: "39 900 ₽" },
      archivedAt: null,
      updatedAt: 1,
    });

    expect(contract).toMatchObject({
      qaLabel: "Playwright · карточка аудита",
      offerSnapshot: "Полный SEO-аудит · 39 900 ₽",
    });
  });
});
