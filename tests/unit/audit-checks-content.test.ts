import { describe, expect, it } from "vitest";

import {
  auditChecks,
  auditCheckSlugs,
  getAuditCheck,
} from "../../src/content/audit-checks";
import {
  auditCheckSitemapEntries,
  getAuditCheckMetadata,
} from "../../src/lib/seo/audit-check-metadata";

describe("public audit methodology", () => {
  it("documents every real scoring check once", () => {
    const expectedIds = [
      "status", "indexable", "canonical", "robots-access", "robots-file", "sitemap", "charset",
      "titles", "title-uniqueness", "h1", "heading-hierarchy", "internal-links", "broken-internal-links", "language",
      "performance", "fcp", "lcp", "cls", "tbt", "accessibility", "viewport",
      "https", "mixed-content", "security-headers", "json-ld", "open-graph",
      "descriptions", "content-depth", "image-alt", "image-dimensions",
    ];

    expect(auditChecks).toHaveLength(30);
    expect(auditChecks.map((check) => check.id)).toEqual(expectedIds);
    expect(new Set(auditCheckSlugs).size).toBe(auditCheckSlugs.length);
  });

  it("keeps every locale useful, distinct and backed by a source", () => {
    for (const check of auditChecks) {
      expect(getAuditCheck(check.slug)).toBe(check);
      expect(check.sourceUrl).toMatch(/^https:\/\//u);
      expect(check.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      for (const locale of ["ru", "en"] as const) {
        const copy = check[locale];
        expect(copy.title.length).toBeGreaterThan(5);
        expect(copy.summary.length).toBeGreaterThanOrEqual(70);
        expect(copy.measures.length).toBeGreaterThan(70);
        expect(copy.pass.length).toBeGreaterThan(55);
        expect(copy.action.length).toBeGreaterThan(55);
        expect(copy.caveat.length).toBeGreaterThan(55);
        expect(new Set([copy.summary, copy.measures, copy.pass, copy.action, copy.caveat]).size).toBe(5);
      }
    }
  });

  it("exports index and detail sitemap entries with canonical metadata", () => {
    expect(auditCheckSitemapEntries).toHaveLength(31);
    expect(auditCheckSitemapEntries[0]).toEqual({ path: "checks", updatedAt: "2026-08-24" });

    const ru = getAuditCheckMetadata("ru", "http-status");
    expect(ru?.alternates?.canonical).toBe("/checks/http-status");
    expect(ru?.alternates?.languages).toEqual({
      ru: "/checks/http-status",
      en: "/en/checks/http-status",
      "x-default": "/checks/http-status",
    });
    expect(ru?.description?.length).toBeGreaterThanOrEqual(70);
    expect(ru?.description?.length).toBeLessThanOrEqual(160);
    expect(getAuditCheckMetadata("en", "missing")).toBeNull();
  });

  it("gives every localized detail page a distinct search title", () => {
    const titles = new Set<string>();
    for (const check of auditChecks) {
      for (const locale of ["ru", "en"] as const) {
        const value = getAuditCheckMetadata(locale, check.slug)?.title;
        const title = typeof value === "object" && value && "absolute" in value ? value.absolute : "";
        expect(title.length).toBeGreaterThanOrEqual(30);
        expect(title.length).toBeLessThanOrEqual(60);
        expect(titles.has(title)).toBe(false);
        titles.add(title);
      }
    }
  });
});
