import { describe, expect, it } from "vitest";

import { glossaryTerms } from "../../src/content/glossary";
import { serviceGlossarySlugs } from "../../src/content/service-glossary";
import { serviceSlugs } from "../../src/content/services";

describe("service glossary disclosures", () => {
  it("keeps every service to two to four known glossary terms", () => {
    const knownSlugs = new Set(glossaryTerms.map((term) => term.slug));

    for (const serviceSlug of serviceSlugs) {
      const terms = serviceGlossarySlugs[serviceSlug];
      expect(terms, serviceSlug).toBeDefined();
      expect(terms.length, serviceSlug).toBeGreaterThanOrEqual(2);
      expect(terms.length, serviceSlug).toBeLessThanOrEqual(4);
      expect(terms.every((term) => knownSlugs.has(term)), serviceSlug).toBe(true);
    }
  });
});
