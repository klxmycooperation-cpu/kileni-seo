import { describe, expect, it } from "vitest";

import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";

describe("sanitizePublicAuditResult", () => {
  it("keeps the v2 evidence contract while stripping query data and unknown fields", () => {
    const sanitized = sanitizePublicAuditResult({
      resultVersion: 2,
      finalUrl: "https://example.com/final?email=private%40example.com#fragment",
      score: 82,
      grade: "B",
      interpretation: "Нужны точечные улучшения",
      pagesChecked: 1,
      pagesDiscovered: 4,
      partial: true,
      coverage: { pageLimit: 10, plannedPages: 4, checkedPages: 1, ratio: 0.25 },
      issueCounts: { critical: 0, high: 1, medium: 0, low: 0, info: 0, total: 1 },
      summary: { headline: "Найдена приоритетная проблема", facts: ["Проверена 1 страница."] },
      categories: [{
        name: "Индексация",
        risk: "high",
        status: "checked",
        explanation: "Найдена проблема.",
      }],
      issueGroups: [{
        code: "PAGE_NOINDEX",
        category: "technicalIndexing",
        severity: "high",
        title: "Страница закрыта от индексации",
        why: "Обнаружен noindex на https://example.com/final?email=private%40example.com; контакт private@example.com.",
        fix: "Уберите noindex.",
        acceptance: "Повторная проверка не находит noindex.",
        affectedCount: 1,
        affectedUrls: ["https://example.com/final?email=private%40example.com"],
        evidence: [{
          url: "https://example.com/final?email=private%40example.com",
          observation: "Robots meta содержит noindex; URL https://example.com/final?phone=79990000000.",
        }],
      }],
      checkedPages: [{
        url: "https://example.com/start?phone=79990000000",
        finalUrl: "https://example.com/final?email=private%40example.com",
        http: { status: 200, ok: true, redirectCount: 1 },
        title: { value: "Главная", present: true, length: 7, optimal: false },
        description: { value: null, present: false, length: 0, optimal: false },
        h1: { count: 1, values: ["Главная"] },
        noindex: true,
        canonical: { url: "https://example.com/final?tracking=1", valid: true, selfReferential: true },
        sitemap: { status: "checked", included: true },
        internalLinks: { outgoing: 3, incomingFromCheckedPages: 0 },
      }],
      indexability: {
        status: "checked",
        checkedPages: 1,
        indexablePages: 0,
        noindexPages: 1,
        httpErrorPages: 0,
        ratio: 0,
      },
      uncheckedUrls: [
        "https://example.com/catalog?email=private%40example.com#part",
        "javascript:alert(1)",
      ],
      contact: "private@example.com",
      arbitrary: { secret: true },
    });

    expect(sanitized).toMatchObject({
      resultVersion: 2,
      finalUrl: "https://example.com/final",
      coverage: { pageLimit: 10, plannedPages: 4, checkedPages: 1, ratio: 0.25 },
      categories: [{ risk: "high", status: "checked" }],
      checkedPages: [{
        url: "https://example.com/start",
        finalUrl: "https://example.com/final",
        canonical: { url: "https://example.com/final" },
      }],
      uncheckedUrls: ["https://example.com/catalog"],
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/private%40|79990000000|contact|arbitrary|javascript/u);
  });

  it("accepts legacy results and converts UNKNOWN into explicit not_checked with a reason", () => {
    const sanitized = sanitizePublicAuditResult({
      score: 62,
      grade: "C",
      interpretation: "Сайт требует системной доработки",
      pagesChecked: 10,
      pagesDiscovered: 43,
      partial: true,
      categories: [{
        name: "Структура и on-page",
        risk: "unknown",
        explanation: "Публичных данных недостаточно для уверенного вывода.",
      }],
    });

    expect(sanitized).toMatchObject({
      score: 62,
      grade: "C",
      pagesChecked: 10,
      pagesDiscovered: 43,
      categories: [{
        name: "Структура и on-page",
        risk: "not_checked",
        status: "not_checked",
        reason: "Публичных данных недостаточно для уверенного вывода.",
      }],
    });
  });
});
