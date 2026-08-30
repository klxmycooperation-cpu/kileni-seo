import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { buildPublicAuditPdfModel, createAdminAuditPdf, createPublicAuditPdf, PUBLIC_AUDIT_DISCLAIMER } from "../../src/lib/reports/audit-pdf";

describe("admin audit PDF", () => {
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
});

describe("public audit PDF", () => {
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
      "Не задано описание для поисковой выдачи (meta description).",
      "Нет видимого главного заголовка страницы (H1).",
      "Страница закрыта от появления в поиске правилом noindex.",
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

  it("keeps a clean v2 result out of the legacy PDF branch", () => {
    const model = buildPublicAuditPdfModel({ resultVersion: 2, issueGroups: [], checkedPages: [] }, "ru");
    expect(model.isLegacy).toBe(false);
    expect(model.issues).toEqual([]);
  });
});
