import { describe, expect, it } from "vitest";

import { buildAuditResultEmail } from "../../src/lib/notifications/audit-email";

describe("письмо с результатом SEO-проверки", () => {
  it("даёт понятное текстовое и HTML-письмо с видимой безопасной ссылкой", () => {
    const message = buildAuditResultEmail({
      locale: "ru",
      publicUrl: "/audit/result-token",
      domain: "example.ru",
      completedAt: "2026-08-31T08:00:00.000Z",
      pagesChecked: 10,
      partial: false,
    });

    expect(message.subject).toContain("example.ru");
    expect(message.text).toContain("https://kileni-seo.ru/audit/result-token");
    expect(message.text).toContain("конкретные замечания");
    expect(message.text).toContain("+7 925 225-60-20");
    expect(message.html).toContain("Открыть безопасный отчёт");
    expect(message.html).toContain("https://kileni-seo.ru/audit/result-token");
    expect(message.html).toContain("KILENI");
  });

  it("экранирует значения и не превращает опасный протокол в ссылку", () => {
    const message = buildAuditResultEmail({
      locale: "ru",
      publicUrl: "javascript:alert(1)",
      domain: "<script>alert(1)</script>",
      pagesChecked: 3,
      partial: true,
    });

    expect(message.html).not.toContain("<script>alert(1)</script>");
    expect(message.html).not.toContain("javascript:");
    expect(message.html).toContain("https://kileni-seo.ru/");
  });
});
