import { describe, expect, it } from "vitest";

import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

describe("sanitizePublicAuditResult", () => {
  it("exposes bounded technical and Lighthouse evidence without raw transport data", () => {
    const source = auditClientReportSnapshot();
    const sanitized = sanitizePublicAuditResult({
      ...source,
      technicalFileSummary: {
        robots: {
          url: "https://example.com/robots.txt",
          finalUrl: "https://example.com/robots.txt",
          statusCode: null,
          loadedAt: "2026-09-15T10:00:00.000Z",
          userAgent: "ZingSEOAudit",
          matchingDecision: "unavailable: request failed",
          reason: "network timeout",
          body: "private response body",
        },
        sitemap: {
          url: "https://example.com/sitemap.xml",
          statusCode: 200,
          parsed: false,
          urlCount: 12,
          prefetchedCount: 5,
          skippedByTechnicalLimit: 7,
          externalHostCount: 1,
          fetchErrors: ["response was not a sitemap XML document"],
        },
      },
      performanceObservation: {
        status: "insufficient_data",
        reason: "one laboratory recheck only",
        finalUrl: "https://example.com/",
        capturedAt: "2026-09-15T10:00:00.000Z",
        strategy: "mobile",
        deviceProfile: "mobile",
        lighthouseVersion: "12.8.2",
        runCount: 1,
        fcpMs: 900,
        lcpMs: 2100,
        cls: 0.04,
        tbtMs: 180,
        speedIndexMs: 1600,
      },
    });

    expect(sanitized).toMatchObject({
      technicalFileSummary: {
        robots: { statusCode: null, matchingDecision: "unavailable: request failed" },
        sitemap: { urlCount: 12, prefetchedCount: 5, externalHostCount: 1 },
      },
      performanceObservation: { status: "insufficient_data", runCount: 1, speedIndexMs: 1600 },
    });
    expect(JSON.stringify(sanitized)).not.toContain("private response body");
  });
  it("keeps the complete bounded outside-sample URL list for grouping in web and inspection in API", () => {
    const source = auditClientReportSnapshot();
    const pagesNotCheckedUrls = Array.from({ length: 88 }, (_, index) => `https://example.com/services/page-${index + 1}`);
    const sanitized = sanitizePublicAuditResult({
      ...source,
      pagesNotCheckedReturned: pagesNotCheckedUrls.length,
      pagesNotCheckedTruncated: false,
      pagesNotCheckedUrls,
    });

    expect(sanitized?.pagesNotCheckedUrls).toHaveLength(88);
    expect(sanitized).toMatchObject({
      pagesNotCheckedTotal: 88,
      pagesNotCheckedReturned: 88,
      pagesNotCheckedTruncated: false,
    });
  });

  it("keeps the bounded v4 snapshot including not-applicable checks and strips private fields", () => {
    const sanitized = sanitizePublicAuditResult(auditV4Snapshot());

    expect(sanitized).toMatchObject({
      resultVersion: 4,
      contractVersion: 3,
      target: "https://example.com/",
      inventorySummary: {
        objectsFound: 4,
        htmlFound: 2,
        eligibleHtml: 2,
        excludedHtml: 0,
        selected: 2,
        checked: 2,
        notCompleted: 0,
        outsideSample: 0,
        representedPageTypes: 2,
      },
      clientPresentationByLocale: {
        ru: { summary: { htmlFound: 2, eligible: 2, selected: 2, checked: 2 } },
      },
    });
    expect(sanitized).not.toHaveProperty("checks");
    expect(sanitized).not.toHaveProperty("findings");
    expect(sanitized).not.toHaveProperty("resultSummary");
    expect(JSON.stringify(sanitized)).not.toMatch(/not_applicable|insufficient_data/u);
    expect(sanitized).toMatchObject({
      clientPresentationByLocale: { ru: { performance: { status: "legacy_unknown" } } },
    });
    expect(sanitized?.technicalResources).toHaveLength(2);
    expect((sanitized?.clientPresentationByLocale as { ru?: { limitations?: unknown[] } })?.ru?.limitations).toHaveLength(4);
    expect(Object.isFrozen(sanitized)).toBe(true);
    expect(Object.isFrozen(sanitized?.clientPresentationByLocale)).toBe(true);
    expect(sanitized).not.toHaveProperty("score");
    expect(sanitized).not.toHaveProperty("grade");
    expect(sanitized).not.toHaveProperty("contact");
    expect(JSON.stringify(sanitized)).not.toMatch(/private=|token=secret|private@example\.com/iu);
    expect(sanitizePublicAuditResult(sanitized)).toEqual(sanitized);
  });

  it("keeps only the bounded score-free v3 contract and never reinterprets injected legacy fields", () => {
    const checks = Array.from({ length: 35 }, (_, index) => ({
      checkId: index < 30 ? `check-${index}` : `overflow-${index}`,
      checkVersion: 1,
      category: "technicalIndexing",
      title: `Проверка ${index}`,
      status: index === 0 ? "pass" : "insufficient_data",
      value: index === 0 ? { checked: 10, passing: 10 } : null,
      expected: "Ожидаемый результат",
      severity: "medium",
      urlEvidence: Array.from({ length: 15 }, (_, evidenceIndex) => ({
        url: `https://example.com/page-${evidenceIndex}?private=1#fragment`,
        observation: `Наблюдение ${evidenceIndex}`,
      })),
      explanation: "Пояснение результата",
      automationLimit: "Ограничение автоматической проверки",
    }));
    const selectedPages = Array.from({ length: 14 }, (_, index) => ({
      url: `https://example.com/page-${index}?private=1#fragment`,
      pageType: index === 0 ? "homepage" : "unique",
      selectionReason: index === 0 ? "homepage" : "additional_important",
      templateFamily: `template-${index}`,
      locale: null,
    }));

    const sanitized = sanitizePublicAuditResult({
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: "a".repeat(43),
      createdAt: "2026-08-30T10:00:00.000Z",
      target: "https://example.com/?email=private%40example.com#fragment",
      pagesDiscovered: 204,
      pagesSelected: 10,
      pagesChecked: 10,
      pagesNotCheckedTotal: 194,
      pagesNotCheckedReturned: 25,
      pagesNotCheckedTruncated: true,
      pagesNotCheckedUrls: Array.from({ length: 40 }, (_, index) => `https://example.com/unchecked-${index}?private=1`),
      coverageStatus: "sample_complete",
      selectedPages,
      checks,
      categorySummary: [{
        category: "technicalIndexing",
        total: 7,
        pass: 1,
        warning: 0,
        fail: 0,
        not_run: 0,
        insufficient_data: 6,
      }],
      resultSummary: {
        headline: "Проверено 10 выбранных страниц",
        totalChecks: 30,
        completedChecks: 1,
        pass: 1,
        warning: 0,
        fail: 0,
        not_run: 0,
        insufficient_data: 29,
      },
      score: 100,
      grade: "A",
      partial: false,
      contact: "private@example.com",
    });

    expect(sanitized).toMatchObject({
      resultVersion: 3,
      contractVersion: 2,
      target: "https://example.com/",
      pagesSelected: 10,
      pagesChecked: 10,
      coverageStatus: "sample_complete",
    });
    expect(sanitized?.selectedPages).toHaveLength(10);
    expect(sanitized?.checks).toHaveLength(30);
    expect((sanitized?.checks as Array<{ urlEvidence: unknown[] }>)[0]?.urlEvidence).toHaveLength(10);
    expect(sanitized?.pagesNotCheckedUrls).toHaveLength(25);
    expect(sanitized).not.toHaveProperty("score");
    expect(sanitized).not.toHaveProperty("grade");
    expect(sanitized).not.toHaveProperty("partial");
    expect(JSON.stringify(sanitized)).not.toMatch(/private%40|contact/u);

  });

  it("keeps bounded checked-page facts in v3 while stripping queries and private/internal fields", () => {
    const sanitized = sanitizePublicAuditResult({
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: "checked-page-facts",
      createdAt: "2026-08-30T10:00:00.000Z",
      target: "https://example.com/",
      pagesDiscovered: 1,
      pagesSelected: 1,
      pagesChecked: 1,
      pagesNotCheckedTotal: 0,
      pagesNotCheckedReturned: 0,
      pagesNotCheckedTruncated: false,
      pagesNotCheckedUrls: [],
      coverageStatus: "sample_complete",
      selectedPages: [{
        url: "https://example.com/service?email=private%40example.com",
        pageType: "commercial",
        selectionReason: "primary_commercial",
        templateFamily: "service",
        locale: "ru",
      }],
      checkedPages: [{
        url: "https://example.com/service?email=private%40example.com#lead",
        finalUrl: "https://example.com/service?phone=79990000000",
        http: { status: 200, ok: true, redirectCount: 1, responseHeaders: { authorization: "secret" } },
        title: { value: "Контакт private@example.com", present: true, length: 27, optimal: false },
        description: { value: null, present: false, length: 0, optimal: false },
        h1: { count: 1, values: ["Услуга private@example.com"] },
        noindex: false,
        canonical: { url: "https://example.com/service?token=secret", valid: true, selfReferential: true },
        sitemap: { status: "checked", included: true },
        internalLinks: { outgoing: 3, incomingFromCheckedPages: 1 },
        rawHtml: "<input value=secret>",
        issues: [{ private: true }],
      }],
      checks: [],
      categorySummary: [],
      resultSummary: {
        headline: "Проверена одна страница",
        totalChecks: 0,
        completedChecks: 0,
        pass: 0,
        warning: 0,
        fail: 0,
        not_run: 0,
        insufficient_data: 0,
      },
    });

    expect(sanitized?.checkedPages).toEqual([{
      url: "https://example.com/service",
      finalUrl: "https://example.com/service",
      http: { status: 200, ok: true, redirectCount: 1 },
      title: { value: "Контакт [e-mail скрыт]", present: true, length: 27, optimal: false },
      description: { value: null, present: false, length: 0, optimal: false },
      h1: { count: 1, values: ["Услуга [e-mail скрыт]"] },
      noindex: false,
      canonical: { url: "https://example.com/service", valid: true, selfReferential: true },
      sitemap: { status: "checked", included: true },
      internalLinks: { outgoing: 3, incomingFromCheckedPages: 1 },
    }]);
    expect(JSON.stringify(sanitized)).not.toMatch(/private%40|private@example\.com|79990000000|authorization|rawHtml|issues|secret/iu);
  });

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
      legacyFormat: true,
      finalUrl: "https://example.com/final",
      pagesSelected: 4,
      coverageStatus: "sample_partial",
      coverage: { pageLimit: 10, plannedPages: 4, checkedPages: 1, ratio: 0.25 },
      categories: [{ risk: "high", status: "checked" }],
      checkedPages: [{
        url: "https://example.com/start",
        finalUrl: "https://example.com/final",
        canonical: { url: "https://example.com/final" },
      }],
      uncheckedUrls: ["https://example.com/catalog"],
    });
    expect(sanitized).not.toHaveProperty("score");
    expect(sanitized).not.toHaveProperty("grade");
    expect(sanitized).not.toHaveProperty("partial");
    expect(JSON.stringify(sanitized)).not.toMatch(/private%40|79990000000|contact|arbitrary|javascript/u);
  });

  it("keeps a legacy 10-of-43 snapshot score-free and marks the selected 10-page sample complete", () => {
    const sanitized = sanitizePublicAuditResult({
      resultVersion: 2,
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
      resultVersion: 2,
      legacyFormat: true,
      pagesChecked: 10,
      pagesDiscovered: 43,
      pagesSelected: 10,
      coverageStatus: "sample_complete",
      categories: [{
        name: "Структура и on-page",
        risk: "not_checked",
        status: "not_checked",
        reason: "Публичных данных недостаточно для уверенного вывода.",
      }],
    });
    expect(sanitized).not.toHaveProperty("score");
    expect(sanitized).not.toHaveProperty("grade");
    expect(sanitized).not.toHaveProperty("partial");
  });
});
