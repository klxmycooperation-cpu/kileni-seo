import { describe, expect, it } from "vitest";

import {
  getServiceResultExample,
  serviceResultExampleSlugs,
  serviceResultExamples,
} from "../../src/content/service-result-examples";
import { serviceSlugs } from "../../src/content/services";

describe("service result examples", () => {
  it("covers the current six service destinations in both languages", () => {
    expect(serviceResultExampleSlugs).toEqual(serviceSlugs);

    for (const locale of ["ru", "en"] as const) {
      expect(Object.keys(serviceResultExamples[locale])).toEqual(serviceSlugs);

      for (const slug of serviceSlugs) {
        const example = getServiceResultExample(locale, slug);
        expect(example, `${locale}/${slug}`).toBeDefined();
        expect(example?.fragment.rows.length).toBeGreaterThanOrEqual(5);
        expect(example?.beforeAfter.before.items.length).toBeGreaterThanOrEqual(3);
        expect(example?.beforeAfter.after.items.length).toBeGreaterThanOrEqual(3);
        expect(example?.whyThisOption.length).toBeGreaterThanOrEqual(3);
        expect(example?.whyKileni.length).toBeGreaterThanOrEqual(3);
        expect(example?.disclaimer.length).toBeGreaterThan(20);
      }
    }
  });

  it("returns undefined for an unknown service instead of silently reusing another example", () => {
    expect(getServiceResultExample("ru", "not-a-service")).toBeUndefined();
    expect(getServiceResultExample("en", "marketplaces")).toBeUndefined();
  });

  it("keeps the audit fragment concrete enough to evaluate the deliverable", () => {
    const ruAudit = getServiceResultExample("ru", "seo-audit");
    const enAudit = getServiceResultExample("en", "seo-audit");

    expect(ruAudit?.fragment.rows.map((row) => row.key)).toEqual([
      "problem",
      "priority",
      "url",
      "evidence",
      "explanation",
      "recommendation",
      "repeat-check",
    ]);
    expect(enAudit?.fragment.rows.map((row) => row.key)).toEqual(
      ruAudit?.fragment.rows.map((row) => row.key),
    );
  });

  it("does not publish invented performance metrics or ranking promises", () => {
    const forbiddenClaims = [
      /\bтоп[-\s]?\d+/iu,
      /гарант(?:ия|ируем|ирован)/iu,
      /рост\s+(?:трафика|продаж|конверсии)\s+на\s+\d/iu,
      /guaranteed?\s+(?:rankings?|traffic|sales|leads?)/iu,
      /\d+(?:[.,]\d+)?\s*%/u,
    ];

    for (const locale of ["ru", "en"] as const) {
      for (const example of Object.values(serviceResultExamples[locale])) {
        const copy = JSON.stringify(example);
        for (const pattern of forbiddenClaims) {
          expect(copy, `${locale}/${example.slug}: ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });
});
