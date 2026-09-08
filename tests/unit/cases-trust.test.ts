import { describe, expect, it } from "vitest";

import { getCases } from "../../src/content/cases";

describe("case-study trust contract", () => {
  it("publishes only the two evidenced projects", () => {
    for (const locale of ["ru", "en"] as const) {
      const cases = getCases(locale);
      expect(cases).toHaveLength(2);
      expect(cases.map((item) => item.slug)).toEqual(["eco-santeh", "zasorservice"]);
    }
  });

  it("keeps the internal KILENI score secondary and explicitly non-search-engine", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const item of getCases(locale)) {
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
