import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";
import {
  createAuditRestoreEnvelope,
  verifyAuditRestoreEnvelope,
} from "../../app/api/_lib/audit-restore";
import {
  AuditResultReport,
  type PublicAuditCtaOfferId,
  type PublicAuditResultView,
} from "../../src/components/pages/AuditResultReport";
import { buildAuditClientPresentation } from "../../src/lib/audit/client-presentation";
import { buildPublicAuditPdfModel } from "../../src/lib/reports/audit-pdf";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";

const restoreSecret = "public-report-model-test-secret-32-chars";
const restoreToken = "p".repeat(43);

function richSnapshot() {
  const source = auditClientReportSnapshot();
  return {
    ...source,
    checkedPages: source.checkedPages.map((page, index) => ({
      ...page,
      title: index === 0
        ? { ...page.title, value: "<img src=x onerror=alert(1)> Главная" }
        : page.title,
      checkedAt: `2026-09-15T10:${String(index).padStart(2, "0")}:00.000Z`,
      redirectCount: index === 1 ? 1 : 0,
      redirects: index === 1 ? ["https://example.com/services/"] : [],
      metaRobots: "index, follow",
      xRobotsTag: null,
      robotsAllowed: true,
      hreflang: index === 0 ? [{ language: "en", url: "https://example.com/en/" }] : [],
      structuredData: index === 0
        ? { total: 1, valid: 1, invalid: 0, types: ["Organization"] }
        : { total: 0, valid: 0, invalid: 0, types: [] },
      internalLinkCount: 12 + index,
      actualIndexed: "unavailable" as const,
    })),
    coverageGroups: [
      { group: "home", found: 1, eligible: 1, selected: 1, checked: 1, unchecked: 0 },
      { group: "commercial_service", found: 50, eligible: 50, selected: 4, checked: 4, unchecked: 46 },
      { group: "catalog_sections", found: 10, eligible: 10, selected: 1, checked: 1, unchecked: 9 },
      { group: "articles", found: 15, eligible: 15, selected: 1, checked: 1, unchecked: 14 },
      { group: "cases", found: 0, eligible: 0, selected: 0, checked: 0, unchecked: 0 },
      { group: "glossary_methodology", found: 5, eligible: 5, selected: 1, checked: 1, unchecked: 4 },
      { group: "contacts_conversion", found: 4, eligible: 4, selected: 1, checked: 1, unchecked: 3 },
      { group: "utility_legal", found: 2, eligible: 0, selected: 0, checked: 0, unchecked: 0 },
      { group: "other", found: 13, eligible: 13, selected: 1, checked: 1, unchecked: 12 },
    ],
    discoveredUrlDecisions: [{
      url: "https://example.com/",
      finalUrl: "https://example.com/",
      resourceType: "html",
      group: "home",
      outcome: "selected",
      reason: "selected_and_checked",
      source: "root",
      selectedUrl: "https://example.com/",
      selectionReason: "homepage",
    }, {
      url: "https://example.com/other-1",
      finalUrl: "https://example.com/other-1",
      resourceType: "html",
      group: "other",
      outcome: "unchecked",
      reason: "not_selected_within_limit",
      source: "sitemap",
    }, {
      url: "https://example.com/privacy",
      finalUrl: "https://example.com/privacy",
      resourceType: "html",
      group: "utility_legal",
      outcome: "excluded",
      reason: "technical_page",
      source: "link",
    }],
    technicalFileSummary: {
      robots: {
        url: "https://example.com/robots.txt",
        finalUrl: "https://example.com/robots.txt",
        statusCode: 200,
        loadedAt: "2026-09-15T09:58:00.000Z",
        userAgent: "ZingSEOAudit",
        matchingDecision: "allow",
        read: true,
        selectedPagesNotBlocked: true,
      },
      sitemap: {
        url: "https://example.com/sitemap.xml",
        finalUrl: "https://example.com/sitemap.xml",
        statusCode: 200,
        loadedAt: "2026-09-15T09:59:00.000Z",
        parsed: true,
        discoveredUrls: 216,
        loadedUrls: 100,
        notLoadedUrls: 116,
        errorUrls: 0,
        skippedByTechnicalLimit: 116,
        externalHostCount: 0,
        siteUrlsOnly: true,
      },
    },
    performanceObservation: {
      ...source.performanceObservation,
    },
  } as const;
}

function renderReport(result: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(AuditResultReport, {
    locale: "ru",
    domain: "example.com",
    pagesChecked: 10,
    pagesDiscovered: 100,
    reportHref: "/api/audits/token/report.pdf",
    copied: false,
    onCopy: () => undefined,
    offerHref: (offer: PublicAuditCtaOfferId) => `/brief?offer=${offer}`,
    result: result as unknown as PublicAuditResultView,
  }));
}

describe("single public audit report model", () => {
  it("contains the bounded conclusion, counters, all coverage groups and URL decisions", () => {
    const sanitized = sanitizePublicAuditResult(richSnapshot());
    expect(sanitized).not.toBeNull();
    const report = buildAuditClientPresentation(sanitized, "ru");

    expect(report).toMatchObject({
      modelVersion: 2,
      conclusion: "На проверенных URL критических проблем по доступным автоматическим проверкам не обнаружено.",
      summary: {
        checked: 10,
        outsideSample: 88,
        review: 1,
        optional: 0,
        unverifiedGroups: 6,
        unavailableExternalMetrics: 7,
      },
    });
    expect(report.coverageGroups).toHaveLength(9);
    expect(report.coverageGroups.find((group) => group.group === "cases")).toMatchObject({
      label: "Кейсы",
      found: 0,
      eligible: 0,
      selected: 0,
      checked: 0,
      unchecked: 0,
    });
    expect(report.urlDecisions.map((decision) => [decision.outcome, decision.source, decision.reason])).toEqual([
      ["selected", "root", "Адрес выбран и подробно проверен."],
      ["unchecked", "sitemap", "Адрес не выбран из-за лимита бесплатной проверки."],
      ["excluded", "link", "Служебная или правовая страница исключена из выборки."],
    ]);
    expect(report.issues.some((issue) => issue.checkId === "breadcrumbs")).toBe(false);
    expect((sanitized?.clientPresentationByLocale as { ru?: unknown })?.ru).toEqual(report);
  });

  it("uses the same evidence, priorities, limitations and timestamps in web and PDF", () => {
    const sanitized = sanitizePublicAuditResult(richSnapshot());
    expect(sanitized).not.toBeNull();
    const report = buildAuditClientPresentation(sanitized, "ru");
    const pdf = buildPublicAuditPdfModel(sanitized, "ru");
    const web = renderReport(sanitized!);

    expect(pdf.clientPresentation).toEqual(report);
    expect(report.pages[0]?.evidence).toMatchObject({
      checkedAt: { status: "available", value: "2026-09-15T10:00:00.000Z" },
      httpStatus: { status: "available", value: 200 },
      redirects: { status: "available", value: { count: 0, chain: [] } },
      title: { status: "available", value: { present: true, text: "<img src=x onerror=alert(1)> Главная" } },
      h1: { status: "available", value: { count: 1 } },
      canonical: { status: "available", value: { url: "https://example.com/", valid: true } },
      robots: { status: "available", value: { allowed: true, meta: "index, follow", header: null } },
      hreflang: { status: "available", value: [{ language: "en", url: "https://example.com/en/" }] },
      schema: { status: "available", value: { total: 1, valid: 1, invalid: 0, types: ["Organization"] } },
      internalLinks: { status: "available", value: 12 },
      actualIndexing: { status: "unavailable", value: null },
    });
    expect(report.performance).toMatchObject({
      status: "completed",
      targetUrl: "https://example.com/",
      capturedAt: "2026-09-02T10:05:00.000Z",
      runCount: 1,
    });
    expect(report.externalMetrics.every((metric) => metric.status === "unavailable")).toBe(true);
    expect(report.technicalFiles.map((file) => [file.type, file.status, file.loadedAt])).toEqual([
      ["robots", "available", "2026-09-15T09:58:00.000Z"],
      ["sitemap", "available", "2026-09-15T09:59:00.000Z"],
    ]);
    expect(web).toContain(report.conclusion);
    expect(web).toContain("Все группы покрытия");
    expect(web).toContain("Адрес не выбран из-за лимита бесплатной проверки.");
    expect(web).toContain("2026-09-15T10:00:00.000Z");
    expect(web).toContain("Фактическое индексирование");
    expect(web).toContain("Лабораторная проверка Lighthouse");
    expect(web).toContain("&lt;img src=x onerror=alert(1)&gt; Главная");
    expect(web).not.toContain("<img src=x onerror=alert(1)>");
  });

  it("preserves the canonical report through a signed shared restore value", () => {
    const sanitized = sanitizePublicAuditResult(richSnapshot());
    expect(sanitized).not.toBeNull();
    const before = buildAuditClientPresentation(sanitized, "ru");
    const envelope = createAuditRestoreEnvelope({
      token: restoreToken,
      locale: "ru",
      normalizedDomain: "example.com",
      status: "completed",
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      result: sanitized,
    }, { secret: restoreSecret, now: 1_700_000_001_000, ttlMs: 60_000 });

    expect(envelope).toBeTypeOf("string");
    const restored = verifyAuditRestoreEnvelope(envelope, restoreToken, {
      secret: restoreSecret,
      now: 1_700_000_002_000,
    });
    const after = buildAuditClientPresentation(restored?.result, "ru");

    expect(after.summary).toEqual(before.summary);
    expect(after.urlDecisions).toEqual(before.urlDecisions);
    expect(after.coverageGroups).toEqual(before.coverageGroups);
    expect(after.issues.map(({ checkId, kind }) => ({ checkId, kind }))).toEqual(
      before.issues.map(({ checkId, kind }) => ({ checkId, kind })),
    );
    expect(after.limitations).toEqual(before.limitations);
    expect(after.pages.map((page) => [page.url, page.selectionReason, page.evidence.checkedAt])).toEqual(
      before.pages.map((page) => [page.url, page.selectionReason, page.evidence.checkedAt]),
    );
  });

  it("keeps old v4 snapshots readable with explicit unavailable evidence", () => {
    const sanitized = sanitizePublicAuditResult(auditClientReportSnapshot());
    const report = buildAuditClientPresentation(sanitized, "ru");

    expect(report.coverageGroups).toHaveLength(9);
    expect(report.coverageGroups.every((group) => group.coverageStatus === "unavailable")).toBe(true);
    expect(report.pages[0]?.evidence.checkedAt).toMatchObject({ status: "unavailable", value: null });
    expect(report.pages[0]?.evidence.schema).toMatchObject({ status: "unavailable", value: null });
  });
});
