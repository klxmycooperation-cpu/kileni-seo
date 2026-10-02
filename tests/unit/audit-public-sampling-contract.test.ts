import { describe, expect, it } from "vitest";

import { sanitizePublicAuditResult } from "../../app/api/_lib/audit-public";
import { buildAuditContractV3 } from "../../src/lib/audit/contract-v3";
import { classifyAuditObject } from "../../src/lib/audit/classification";
import { selectAuditSample } from "../../src/lib/audit/sample-selector";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

function html(url: string, schemaTypes: string[] = []): ReturnType<typeof classifyAuditObject> {
  return classifyAuditObject({
    url,
    finalUrl: url,
    contentType: "text/html; charset=utf-8",
    statusCode: 200,
    schemaTypes,
    depth: new URL(url).pathname.split("/").filter(Boolean).length,
  });
}

function contractFor(inventory: ReturnType<typeof classifyAuditObject>[]) {
  const selectedPages = selectAuditSample(inventory.map((item) => ({
    url: item.url,
    finalUrl: item.finalUrl,
    resourceType: item.resourceType,
    pageType: item.pageType,
    templateSignature: item.templateFamily,
    classificationConfidence: item.classificationConfidence,
    classificationReasons: item.classificationReasons,
    language: item.language,
    depth: item.depth,
  })), 10, { targetUrl: "https://example.com/" });
  return buildAuditContractV3({
    auditId: "sampling-contract",
    createdAt: "2026-09-15T10:00:00.000Z",
    targetUrl: "https://example.com/",
    inventory,
    selectedPages,
    pages: [],
    robots: null,
    sitemap: null,
    performance: null,
  });
}

describe("free audit representative sampling contract", () => {
  it("keeps a large sitemap inventory readable while bounding public URL decisions", () => {
    const inventory = [
      html("https://example.com/"),
      ...Array.from({ length: 2_000 }, (_, index) => classifyAuditObject({
        url: `https://example.com/unloaded-${index}`,
        resourceHint: "unknown",
        discoverySource: "sitemap",
      })),
    ];
    const contract = contractFor(inventory);
    const sanitized = sanitizePublicAuditResult(contract);

    expect(contract.discoveredUrlDecisions).toHaveLength(2_001);
    expect(contract.checks.length).toBeLessThan(2_000);
    expect(sanitized).not.toBeNull();
    expect(sanitized).toMatchObject({
      discoveredUrlDecisionsTotal: 2_001,
      discoveredUrlDecisionsTruncated: true,
    });
    expect(sanitized?.discoveredUrlDecisions).toHaveLength(2_000);
  });

  it("never selects more than ten URLs from a large discovered inventory", () => {
    const inventory = [
      html("https://example.com/"),
      ...Array.from({ length: 120 }, (_, index) => html(`https://example.com/services/service-${index}`)),
    ];
    const contract = contractFor(inventory);

    expect(contract.pagesSelected).toBeLessThanOrEqual(10);
    expect(contract.selectedPages).toHaveLength(contract.pagesSelected);
    expect(contract.discoveredUrlDecisions).toHaveLength(inventory.length);
    expect(contract.coverageGroups).toHaveLength(9);
  });

  it("counts each URL in its observed group without extrapolating a template", () => {
    const inventory = [
      ...Array.from({ length: 50 }, (_, index) => html(`https://example.com/services/service-${index}`)),
      html("https://example.com/cases/one", ["Article"]),
    ];
    const contract = contractFor(inventory);
    const commercial = contract.coverageGroups.find((group) => group.group === "commercial_service");
    const cases = contract.coverageGroups.find((group) => group.group === "cases");

    expect(commercial).toMatchObject({ found: 50, eligible: 50 });
    expect(cases).toMatchObject({ found: 1, eligible: 1 });
    expect(contract.coverageGroups.reduce((sum, group) => sum + group.found, 0)).toBe(51);
  });

  it("keeps all zero groups and an explainable decision for every discovered URL", () => {
    const contract = contractFor([
      html("https://example.com/"),
      html("https://example.com/privacy"),
      classifyAuditObject({ url: "https://example.com/api/data", contentType: "application/json", statusCode: 200 }),
    ]);
    const groups = contract.coverageGroups.map((group) => group.group);
    const rootDecision = contract.discoveredUrlDecisions.find((item) => item.url === "https://example.com/");
    const excludedDecision = contract.discoveredUrlDecisions.find((item) => item.url === "https://example.com/privacy");

    expect(groups).toEqual([
      "home", "commercial_service", "catalog_sections", "articles", "cases",
      "glossary_methodology", "contacts_conversion", "utility_legal", "other",
    ]);
    expect(rootDecision).toMatchObject({ outcome: "selected", selectedUrl: "https://example.com/", source: "root" });
    expect(rootDecision?.reason).toEqual(expect.any(String));
    expect(excludedDecision).toMatchObject({ outcome: "excluded", reason: expect.any(String) });
    expect(contract.discoveredUrlDecisions.every((item) => typeof item.reason === "string" && item.reason.length > 0)).toBe(true);
  });

  it("continues to read an older v4 snapshot without requiring the new fields", () => {
    const oldSnapshot = auditV4Snapshot();
    expect(oldSnapshot).not.toHaveProperty("coverageGroups");
    expect(oldSnapshot).not.toHaveProperty("discoveredUrlDecisions");
    const sanitized = sanitizePublicAuditResult(oldSnapshot);

    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toHaveProperty("coverageGroups");
    expect(sanitized).not.toHaveProperty("discoveredUrlDecisions");
  });
});
