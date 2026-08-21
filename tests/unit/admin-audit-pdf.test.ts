import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createAdminAuditPdf, createPublicAuditPdf, PUBLIC_AUDIT_DISCLAIMER } from "../../src/lib/reports/audit-pdf";

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
});
