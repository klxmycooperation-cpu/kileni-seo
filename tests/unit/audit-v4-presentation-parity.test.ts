import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";

import { buildAuditContractView } from "../../app/admin/_lib/audit-view";
import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";
import {
  AuditResultReport,
  type PublicAuditCtaOfferId,
  type PublicAuditResultView,
} from "../../src/components/pages/AuditResultReport";
import { buildPublicAuditPdfModel } from "../../src/lib/reports/audit-pdf";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

describe("v4 presentation parity", () => {
  it("uses the same two client conclusions in web, PDF and admin", () => {
    const snapshot = sanitizePublicAuditResult(auditClientReportSnapshot());
    expect(snapshot).not.toBeNull();
    expect(Object.isFrozen(snapshot)).toBe(true);

    const web = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 10,
      pagesDiscovered: 100,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: snapshot as unknown as PublicAuditResultView,
    }));
    const pdf = buildPublicAuditPdfModel(snapshot, "ru");
    const admin = buildAuditContractView(snapshot, { publicResult: snapshot });

    expect(pdf.clientPresentation.summary).toEqual(admin?.clientPresentation.summary);
    expect(pdf.clientPresentation.issues).toEqual(admin?.clientPresentation.issues);
    expect(pdf.clientPresentation.pages).toEqual(admin?.clientPresentation.pages);
    expect(pdf.clientPresentation.publicTechnicalResources).toEqual(admin?.clientPresentation.publicTechnicalResources);
    expect(pdf.clientPresentation.exclusions).toEqual(admin?.clientPresentation.exclusions);
    expect(pdf.clientPresentation.strengths).toEqual(admin?.clientPresentation.strengths);
    expect(pdf.clientPresentation.disclaimer).toEqual(admin?.clientPresentation.disclaimer);
    expect(pdf.clientPresentation.additionalFiles).toBe(admin?.clientPresentation.additionalFiles);
    expect(pdf.clientPresentation.additionalDocuments).toBe(admin?.clientPresentation.additionalDocuments);
    expect(pdf.clientPresentation.limitations).toEqual(admin?.clientPresentation.limitations);
    expect(pdf.clientPresentation.nextStep).toEqual(admin?.clientPresentation.nextStep);
    expect(pdf.clientPresentation.issues.map((issue) => [issue.checkId, issue.url])).toEqual([
      ["performance", "https://example.com/"],
      ["breadcrumbs", "https://example.com/services"],
    ]);
    expect(web).toContain("Мобильная производительность главной страницы");
    expect(web).toContain("Подсказка о месте страницы в структуре сайта");
    expect(web).toContain("Критических проблем");
    expect(web).not.toContain("156 пройдено");
    expect(web).not.toContain("39 не относится");
    expect(web).not.toContain("300 не запускалось");
    expect(web).not.toContain("4 результата не получено");
    expect(web).toContain("Подходят для выборки");
    expect(web).toContain("Предварительно просмотрено адресов");
    expect(web).toContain("Подробно проверено страниц");
    expect(pdf.clientPresentation.summary.checkedLabel).toBe("Подробно проверено страниц");
    expect(admin?.clientPresentation.summary.checkedLabel).toBe("Подробно проверено страниц");
    expect(web).toContain("Исключено до выборки");
    expect(web).toContain("Почему выбрана");
    expect(web).toContain("Получить полный аудит сайта");
    expect(web).toContain("Повторить бесплатную проверку");
    expect(web).not.toContain("Проверить остальные страницы");
    expect(web).not.toContain("audit-technical-details");

    const clientPresentation = JSON.stringify({
      publicPayload: snapshot,
      pdf: pdf.clientPresentation,
      adminClientView: admin?.clientPresentation,
    });
    expect(clientPresentation).not.toMatch(/"score"|"grade"/u);
    expect(clientPresentation).not.toMatch(/url_pattern|content_pattern|template:dom|classificationConfidence|classificationReasons/u);
    expect(web).not.toMatch(/\/100|уровень\s+[A-F]/iu);
  });

  it("snapshots the final client-facing exclusion, page title and selection reason", () => {
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
    const snapshot = sanitizePublicAuditResult({
      ...source,
      exclusionSummary: [{ reason: "technical_page", count: 2 }],
      selectedPages,
      checkedPages,
    });
    expect(snapshot).not.toBeNull();

    const webMarkup = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 10,
      pagesDiscovered: 100,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: snapshot as unknown as PublicAuditResultView,
    }));
    const $ = load(webMarkup);
    const englishPage = $(".audit-page-card").filter((_index, element) => $(element).find("summary strong").text() === "https://example.com/en/yandex-ads").first();
    const pdf = buildPublicAuditPdfModel(snapshot, "ru").clientPresentation;
    const admin = buildAuditContractView(snapshot, { publicResult: snapshot });
    const pdfPage = pdf.pages.find((page) => page.url === "https://example.com/en/yandex-ads");
    const adminPage = admin?.selectedPages.find((page) => page.url === "https://example.com/en/yandex-ads");

    expect({
      web: {
        exclusion: $(".audit-exclusion-summary li").first().text(),
        pageTitle: englishPage.find("summary small").text().split(" · ")[0],
        selectionReason: englishPage.find(".audit-page-selection p").text(),
      },
      pdf: {
        exclusion: `${pdf.exclusions[0]?.label}: ${pdf.exclusions[0]?.count}`,
        pageTitle: pdfPage?.typeLabel,
        selectionReason: pdfPage?.selectionReason,
      },
      admin: {
        exclusion: `${admin?.clientPresentation.exclusions[0]?.label}: ${admin?.clientPresentation.exclusions[0]?.count}`,
        pageTitle: adminPage?.pageType,
        selectionReason: adminPage?.selectionReason,
      },
    }).toMatchInlineSnapshot(`
      {
        "admin": {
          "exclusion": "Юридические и служебные страницы: 2",
          "pageTitle": "Англоязычная страница услуги",
          "selectionReason": "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
        },
        "pdf": {
          "exclusion": "Юридические и служебные страницы: 2",
          "pageTitle": "Англоязычная страница услуги",
          "selectionReason": "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
        },
        "web": {
          "exclusion": "Юридические и служебные страницы: 2",
          "pageTitle": "Англоязычная страница услуги",
          "selectionReason": "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
        },
      }
    `);
  });

  it("does not reinterpret a mismatched v4 payload as the legacy v3 contract", () => {
    const mismatched = { ...auditV4Snapshot(), contractVersion: 2 as const };
    const web = renderToStaticMarkup(createElement(AuditResultReport, {
      locale: "ru",
      domain: "example.com",
      pagesChecked: 2,
      pagesDiscovered: 2,
      reportHref: "/api/audits/token/report.pdf",
      copied: false,
      onCopy: () => undefined,
      offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
      result: mismatched as unknown as PublicAuditResultView,
    }));

    expect(sanitizePublicAuditResult(mismatched)).toBeNull();
    expect(buildAuditContractView(mismatched, { publicResult: mismatched })).toBeNull();
    expect(buildPublicAuditPdfModel(mismatched, "ru")).toMatchObject({
      isLegacy: true,
      contractVersion: null,
    });
    expect(web).toContain("сохранённый отчёт прежней версии");
    expect(web).not.toMatch(/\/100|уровень\s+[A-F]/iu);
  });
});
