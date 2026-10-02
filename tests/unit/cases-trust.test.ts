import { describe, expect, it } from "vitest";

import { getCases } from "../../src/content/cases";

describe("case-study trust contract", () => {
  it("publishes the four approved projects in the carousel order", () => {
    for (const locale of ["ru", "en"] as const) {
      const cases = getCases(locale);
      expect(cases).toHaveLength(4);
      expect(cases.map((item) => item.slug)).toEqual(["mestoest-ff", "kamenmis", "eco-santeh", "zasorservice"]);
    }
  });

  it("labels ranking evidence separately from the internal KILENI score", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const item of getCases(locale)) {
        if (item.slug === "mestoest-ff" || item.slug === "kamenmis") {
          expect(item.previewFacts[0]?.label).toMatch(locale === "ru" ? /по данным проекта/iu : /reported by the project/iu);
          continue;
        }
        const scoreIndex = item.previewFacts.findIndex((fact) => fact.value === `${item.before} → ${item.after}`);
        expect(scoreIndex).toBeGreaterThan(0);
        expect(item.previewFacts[scoreIndex]?.label).toMatch(/KILENI/iu);
        expect(item.previewFacts[scoreIndex]?.label).toMatch(locale === "ru" ? /не показатель поисковика/iu : /not a search-engine metric/iu);
      }
    }
  });

  it("does not expose private paths, mailboxes, IP addresses or backup details", () => {
    const published = JSON.stringify([getCases("ru"), getCases("en")]);
    const forbidden = [
      /\/(?:Users|home|var)\//u,
      /[A-Z]:\\/u,
      /\b(?:backup|dump|\.sql)\b/iu,
      /[\w.+-]+@(?:gmail|mail|yandex)\.[a-z]{2,}/iu,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
    ];

    for (const pattern of forbidden) expect(published).not.toMatch(pattern);
  });
});
