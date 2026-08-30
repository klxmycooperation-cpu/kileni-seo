import { describe, expect, it } from "vitest";

import {
  auditStatusLabel,
  buildAuditIssueViews,
  buildIndexingView,
  buildPerformanceView,
  buildAuditPageViews,
  emailDeliveryView,
  formatAuditDuration,
  maskAuditContact,
  readableEntries,
  safeHttpUrl,
} from "@/app/admin/_lib/audit-view";

describe("представление аудита в админке", () => {
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
});
