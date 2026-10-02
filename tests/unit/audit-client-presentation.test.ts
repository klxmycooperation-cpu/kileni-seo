import { describe, expect, it } from "vitest";

import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";
import { buildAuditClientPresentation } from "../../src/lib/audit/client-presentation";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";

describe("client audit presentation", () => {
  it("summarizes site conclusions instead of engine operations", () => {
    const presentation = buildAuditClientPresentation(auditClientReportSnapshot(), "ru");

    expect(presentation.summary).toEqual({
      htmlFound: 100,
      scopeLabel: "Предварительно просмотрено адресов",
      scopeValue: 100,
      checkedLabel: "Подробно проверено страниц",
      findingsLabel: "1 вывод требует проверки",
      eligible: 98,
      excluded: 2,
      selected: 10,
      checked: 10,
      notCompleted: 0,
      outsideSample: 88,
      critical: 0,
      review: 1,
      optional: 0,
      unverifiedGroups: 0,
      unavailableExternalMetrics: 7,
    });
    expect(presentation.summary.htmlFound).toBe(presentation.summary.eligible + presentation.summary.excluded);
    expect(presentation.summary.eligible).toBe(presentation.summary.selected + presentation.summary.outsideSample);
    expect(presentation.summary.selected).toBe(presentation.summary.checked + presentation.summary.notCompleted);
    expect(presentation.exclusions).toEqual([
      { reason: "service_url", label: "Техническая страница", count: 1 },
      { reason: "closed_section", label: "Закрытый раздел", count: 1 },
    ]);
    expect(presentation.issues).toHaveLength(1);
    expect(presentation.issues.map((issue) => [issue.kind, issue.url])).toEqual([
      ["review", "https://example.com/"],
    ]);
    expect(presentation.issues.map((issue) => issue.affectedUrls)).toEqual([
      ["https://example.com/"],
    ]);
    expect(presentation.pages.find((page) => page.url === "https://example.com/")?.issues).toHaveLength(1);
    expect(presentation.pages.find((page) => page.url === "https://example.com/services")?.issues).toHaveLength(0);
    expect(presentation.pages.filter((page) => page.url !== "https://example.com/").every((page) => page.issues.length === 0)).toBe(true);
  });

  it("preserves the honest processed-URL scope after the public payload is sanitized", () => {
    const sanitized = sanitizePublicAuditResult(auditClientReportSnapshot());
    const presentation = buildAuditClientPresentation(sanitized, "ru");

    expect(presentation.summary).toMatchObject({
      scopeLabel: "Предварительно просмотрено адресов",
      scopeValue: 100,
      htmlFound: 100,
      checkedLabel: "Подробно проверено страниц",
    });
  });

  it("uses plain, decision-ready fields and does not treat missing BreadcrumbList as an error", () => {
    const presentation = buildAuditClientPresentation(auditClientReportSnapshot(), "ru");
    const speed = presentation.issues[0]!;

    expect(speed.title).toBe("Скорость главной страницы");
    expect(speed.whatFound).toContain("72 из 100");
    expect(speed.whyImportant).not.toMatch(/Lighthouse|замер|провер/u);
    expect(speed.howChecked).toContain("Один запуск");
    expect(speed.reliability).toContain("предварительный");
    expect(speed.nextStep).toContain("повтор");
    expect(speed.details).toEqual(expect.arrayContaining([
      { label: "Профиль", value: "Мобильный" },
      { label: "LCP — появление главного блока", value: "2.74 с" },
      { label: "CLS — сдвиги элементов", value: "0.04" },
      { label: "TBT — блокировка страницы", value: "180 мс" },
      { label: "Количество запусков", value: "1" },
    ]));

    expect(presentation.issues.some((issue) => issue.checkId === "breadcrumbs")).toBe(false);
    expect(JSON.stringify(presentation.issues)).not.toContain("Подтверждённое замечание");
  });

  it("keeps one laboratory speed run at review level even when the engine marks a low score as critical", () => {
    const source = auditClientReportSnapshot();
    const checks = source.checks.map((check) => check.checkId === "performance"
      ? { ...check, status: "fail" as const, severity: "critical" as const, reason: "Оценка 43 из 100" }
      : check);
    const presentation = buildAuditClientPresentation({
      ...source,
      checks,
      performanceObservation: {
        ...source.performanceObservation,
        performance: 43,
        runCount: 1,
      },
    }, "ru");

    expect(presentation.issues.find((issue) => issue.checkId === "performance")?.kind).toBe("review");
    expect(presentation.summary).toMatchObject({ critical: 0, review: 1, optional: 0 });
  });

  it("aggregates repeated successes, page types and extra resources", () => {
    const presentation = buildAuditClientPresentation(auditClientReportSnapshot(), "ru");

    expect(presentation.strengths).toContain("Заголовок для поисковой выдачи (Title) и главный заголовок страницы (H1) найдены на всех 10 проверенных страницах.");
    expect(presentation.pages.find((page) => page.url.endsWith("/about"))?.typeLabel).toBe("Страница о компании");
    expect(presentation.pages.find((page) => page.url.endsWith("/blog"))?.typeLabel).toBe("Раздел блога");
    expect(presentation.pages.find((page) => page.url.includes("/blog/how-to-grow"))?.typeLabel).toBe("Статья");
    expect(presentation.additionalFiles).toBe(16);
    expect(presentation.additionalDocuments).toBe(16);
    expect(presentation.publicTechnicalResources.map((resource) => resource.type)).toEqual(["robots", "sitemap"]);
    expect(presentation.pages.every((page) => page.selectionReason.length > 0)).toBe(true);
    expect(presentation.limitations).toHaveLength(4);
    expect(presentation.limitations[0]).toContain("долю переходов из поисковой выдачи (CTR)");
    expect(presentation.nextStep).toEqual({
      primary: "Заказать технический SEO-аудит",
      secondary: "Повторить бесплатную проверку",
      note: "Повторная бесплатная проверка снова ограничена выборкой до 10 страниц.",
    });
  });

  it("explains legal exclusions, sitemap coverage and an unmatched English service page", () => {
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
      ? {
          ...page,
          url: "https://example.com/en/yandex-ads",
          finalUrl: "https://example.com/en/yandex-ads",
          pageType: "commercial",
        }
      : page);
    const presentation = buildAuditClientPresentation({
      ...source,
      exclusionSummary: [{ reason: "technical_page", count: 2 }],
      selectedPages,
      checkedPages,
      technicalFileSummary: {
        robots: { read: true, selectedPagesNotBlocked: true },
        sitemap: { parsed: true, discoveredUrls: 216, siteUrlsOnly: true },
      },
    }, "ru");

    expect(presentation.exclusions).toEqual([
      { reason: "technical_page", label: "Юридические и служебные страницы", count: 2 },
    ]);
    expect(presentation.pages.at(-1)).toMatchObject({
      typeLabel: "Англоязычная страница услуги",
      selectionReason: "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
    });
    expect(presentation.publicTechnicalResources.find((resource) => resource.type === "sitemap")?.details).toContain(
      "В sitemap найдено 216 адресов. Предварительно просмотрено 100 адресов; остальные 116 адресов не загружались в рамках бесплатной проверки.",
    );
  });

  it("refreshes release-pass wording for an immutable stored client snapshot without changing its totals", () => {
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
    const current = buildAuditClientPresentation({ ...source, selectedPages, checkedPages }, "ru");
    const stored = {
      ...current,
      additionalFiles: 150,
      additionalFilesBasis: undefined,
      exclusions: [{ reason: "technical_page", label: "Техническая страница", count: 2 }],
      pages: current.pages.map((page, index) => index === current.pages.length - 1
        ? { ...page, typeLabel: "Контроль другой языковой версии", selectionReason: "Основная локаль этого типа страницы не обнаружена." }
        : page),
      publicTechnicalResources: current.publicTechnicalResources.map((resource) => resource.type === "sitemap"
        ? { ...resource, details: ["XML разобран.", "В файле обнаружено адресов: 216.", "Все обнаруженные адреса принадлежат проверяемому сайту."] }
        : resource),
    };
    const presentation = buildAuditClientPresentation({
      ...source,
      exclusionSummary: [{ reason: "technical_page", count: 2 }],
      selectedPages,
      checkedPages,
      clientPresentationByLocale: { ru: stored },
    }, "ru");

    expect(presentation.summary).toEqual(current.summary);
    expect(presentation.issues).toEqual(current.issues);
    expect(presentation.exclusions[0]?.label).toBe("Юридические и служебные страницы");
    expect(presentation.pages.at(-1)).toMatchObject({
      typeLabel: "Англоязычная страница услуги",
      selectionReason: "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
    });
    expect(presentation.publicTechnicalResources.find((resource) => resource.type === "sitemap")?.details.join(" ")).toContain(
      "Предварительно просмотрено 100 адресов",
    );
    expect(presentation.additionalFiles).toBe(16);
    expect(presentation.additionalDocuments).toBe(16);
  });

  it("keeps classified resource totals through the public 100-resource transport limit", () => {
    const source = auditClientReportSnapshot();
    const extraImages = Array.from({ length: 140 }, (_, index) => ({
      ...source.technicalResources[2]!,
      url: `https://example.com/images/image-${index + 1}.webp`,
      finalUrl: `https://example.com/images/image-${index + 1}.webp`,
      resourceType: "image",
      templateFamily: "image",
      classificationReasons: ["image_extension"],
    }));
    const sanitized = sanitizePublicAuditResult({
      ...source,
      inventorySummary: { ...source.inventorySummary, objectsFound: 258 },
      technicalResources: [...source.technicalResources, ...extraImages],
    });

    expect((sanitized?.technicalResources as unknown[]).length).toBe(100);
    const presentation = buildAuditClientPresentation(sanitized, "ru");
    expect(presentation.additionalFiles).toBe(156);
    expect(presentation.additionalDocuments).toBe(16);
  });

  it("updates the old processed-address label in a cached stored presentation", () => {
    const source = auditClientReportSnapshot();
    const current = buildAuditClientPresentation(source, "ru");
    const presentation = buildAuditClientPresentation({
      ...source,
      technicalFileSummary: undefined,
      clientPresentationByLocale: {
        ru: {
          ...current,
          summary: { ...current.summary, scopeLabel: "Обработано для анализа" },
        },
      },
    }, "ru");

    expect(presentation.summary.scopeLabel).toBe("Предварительно просмотрено адресов");
    expect(presentation.summary.scopeValue).toBe(100);
  });

  it("does not repeat a cached sitemap claim when the technical evidence was not saved", () => {
    const source = auditClientReportSnapshot();
    const current = buildAuditClientPresentation(source, "ru");
    const presentation = buildAuditClientPresentation({
      ...source,
      technicalFileSummary: undefined,
      clientPresentationByLocale: {
        ru: {
          ...current,
          publicTechnicalResources: current.publicTechnicalResources.map((resource) => resource.type === "sitemap"
            ? {
                ...resource,
                details: [
                  "XML разобран.",
                  "В sitemap найдено 216 адресов. Для предварительного анализа обработано 100 URL; остальные 116 URL не загружались в рамках бесплатной проверки.",
                  "Все обнаруженные адреса принадлежат проверяемому сайту.",
                ],
              }
            : resource),
        },
      },
    }, "ru");
    expect(presentation.publicTechnicalResources).toEqual([]);
    expect(presentation.technicalFiles.every((file) => file.status === "unavailable")).toBe(true);
  });

  it("uses the saved sampling type when page analysis could not classify the route", () => {
    const source = auditClientReportSnapshot();
    const replacements = [
      { index: 5, path: "/pricing", pageType: "conversion_support", selectionReason: "conversion_support" },
      { index: 6, path: "/contacts", pageType: "conversion_support", selectionReason: "conversion_support" },
      { index: 7, path: "/en", pageType: "homepage", selectionReason: "alternate_locale_control" },
      { index: 8, path: "/brief", pageType: "conversion_support", selectionReason: "conversion_support" },
      { index: 9, path: "/glossary/seo-audit", pageType: "detail", selectionReason: "detail_page" },
    ] as const;
    const selectedPages = source.selectedPages.map((page, index) => {
      const replacement = replacements.find((item) => item.index === index);
      return replacement ? {
        ...page,
        url: `https://example.com${replacement.path}`,
        pageType: replacement.pageType,
        selectionReason: replacement.selectionReason,
      } : page;
    });
    const checkedPages = source.checkedPages.map((page, index) => {
      const replacement = replacements.find((item) => item.index === index);
      return replacement ? {
        ...page,
        url: `https://example.com${replacement.path}`,
        finalUrl: `https://example.com${replacement.path}`,
        pageType: "unknown" as const,
      } : page;
    });
    const presentation = buildAuditClientPresentation({ ...source, selectedPages, checkedPages }, "ru");

    expect(presentation.pages.slice(-5).map((page) => page.typeLabel)).toEqual([
      "Страница с ценами",
      "Контакты",
      "Контроль другой языковой версии",
      "Страница для связи",
      "Термин словаря",
    ]);
    expect(JSON.stringify(presentation.pages)).not.toContain("Тип страницы не определён");
  });

  it("does not expose raw classifier data in the public payload", () => {
    const sanitized = sanitizePublicAuditResult(auditClientReportSnapshot());
    const json = JSON.stringify(sanitized);

    expect(sanitized).not.toBeNull();
    expect(json).not.toMatch(/classificationConfidence|classificationReasons|template:dom|url_pattern|content_pattern/u);
  });

  it("shows the breadcrumb improvement only for a page with a real hierarchy", () => {
    const source = auditClientReportSnapshot();
    const checkedPages = source.checkedPages.map((page) => page.url.endsWith("/services")
      ? { ...page, pageType: "homepage" as const }
      : page);
    const presentation = buildAuditClientPresentation({ ...source, checkedPages }, "ru");

    expect(presentation.issues.map((issue) => issue.checkId)).toEqual(["performance"]);
    expect(presentation.summary.optional).toBe(0);
  });

  it("does not present missing technical files as successfully loaded", () => {
    const source = auditClientReportSnapshot();
    const technicalResources = source.technicalResources.map((resource) => resource.resourceType === "robots"
      ? { ...resource, statusCode: 404 }
      : resource);
    const presentation = buildAuditClientPresentation({ ...source, technicalResources }, "ru");

    expect(presentation.publicTechnicalResources.map((resource) => resource.type)).toEqual(["sitemap"]);
    expect(presentation.strengths).not.toContain("Файл правил для поисковых роботов (robots.txt) и список страниц сайта (sitemap.xml) доступны и прочитаны.");
    expect(presentation.additionalFiles).toBe(16);
  });

  it("groups one repeated cause into one client finding and binds it to every affected page", () => {
    const source = auditClientReportSnapshot();
    const repeatedWarnings = source.checkedPages.slice(0, 5).map((page) => ({
      checkId: "description",
      version: 1,
      title: "Описание страницы",
      category: "structureOnPage",
      scope: "page",
      status: "warning",
      severity: "medium",
      targetUrl: page.url,
      reason: "Описание страницы отсутствует",
      publicExplanation: "Проверили описание в сохранённом HTML.",
      automationLimit: "Не оценивает качество текста.",
      evidence: [],
    }));
    const presentation = buildAuditClientPresentation({ ...source, checks: [...source.checks, ...repeatedWarnings] }, "ru");
    const description = presentation.issues.find((issue) => issue.checkId === "description");

    expect(description?.affectedUrls).toHaveLength(5);
    expect(presentation.issues.filter((issue) => issue.checkId === "description")).toHaveLength(1);
    expect(presentation.pages.filter((page) => page.issues.some((issue) => issue.checkId === "description"))).toHaveLength(5);
  });

  it("keeps the English client model complete and fully translated", () => {
    const presentation = buildAuditClientPresentation(auditClientReportSnapshot(), "en");
    const translatedInterface = JSON.stringify({
      conclusion: presentation.conclusion,
      summary: presentation.summary,
      exclusions: presentation.exclusions,
      issues: presentation.issues,
      strengths: presentation.strengths,
      coverageGroups: presentation.coverageGroups,
      externalMetrics: presentation.externalMetrics,
      limitations: presentation.limitations,
    });

    expect(presentation.issues.map((issue) => issue.title)).toEqual(["Homepage speed"]);
    expect(presentation.strengths).toHaveLength(4);
    expect(presentation.strengths).toContain("robots.txt and sitemap.xml were available and read.");
    expect(translatedInterface).not.toMatch(/[А-Яа-яЁё]/u);
  });
});
