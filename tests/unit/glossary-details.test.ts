import { describe, expect, it } from "vitest";

import type { Locale } from "../../src/config/site";
import {
  getGlossaryTerm,
  glossaryTerms,
  indexableGlossarySlugs,
} from "../../src/content/glossary";
import {
  getGlossaryDetailMetadata,
  glossaryDetailPath,
  glossarySitemapPaths,
} from "../../src/lib/seo/glossary-metadata";

describe("glossary detail architecture", () => {
  it("keeps every existing term addressable with explicit publication data", () => {
    expect(glossaryTerms).toHaveLength(41);
    expect(new Set(glossaryTerms.map((term) => term.slug)).size).toBe(glossaryTerms.length);

    for (const term of glossaryTerms) {
      expect(getGlossaryTerm(term.slug)).toBe(term);
      expect(typeof term.indexable).toBe("boolean");
      expect(term.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
  });

  it("indexes only the terms with four distinct, term-specific explanations", () => {
    expect(indexableGlossarySlugs).toHaveLength(41);
    expect(indexableGlossarySlugs).toEqual(
      glossaryTerms.filter((term) => term.indexable).map((term) => term.slug),
    );
    expect(glossaryTerms.filter((term) => !term.indexable)).toEqual([]);

    for (const slug of indexableGlossarySlugs) {
      const term = getGlossaryTerm(slug);
      expect(term?.indexable).toBe(true);

      for (const locale of ["ru", "en"] as const) {
        const copy = term?.[locale];
        expect(copy?.definition).toBeTruthy();
        expect(copy?.plain).toBeTruthy();
        expect(copy?.why).toBeTruthy();
        expect(copy?.example).toBeTruthy();
        expect(new Set([copy?.definition, copy?.plain, copy?.why, copy?.example]).size).toBe(4);
        expect(copy?.plain).not.toMatch(/^(?:Проще:|In plain language:)/u);
        expect(copy?.why).not.toBe(
          locale === "ru"
            ? "Термин помогает точно описать проблему, договориться о результате и проверить работу."
            : "The term helps define the issue, agree the outcome and verify delivery.",
        );
      }
    }

    for (const locale of ["ru", "en"] as const) {
      const published = glossaryTerms.filter((term) => term.indexable);
      expect(new Set(published.map((term) => term[locale].plain)).size).toBe(41);
      expect(new Set(published.map((term) => term[locale].why)).size).toBe(41);
    }
  });

  it("builds locale-safe canonical metadata for every reviewed detail page", () => {
    const indexed = getGlossaryDetailMetadata("ru", "search-crawler");
    expect(indexed?.alternates?.canonical).toBe("/glossary/search-crawler");
    expect(indexed?.alternates?.languages).toEqual({
      ru: "/glossary/search-crawler",
      en: "/en/glossary/search-crawler",
      "x-default": "/glossary/search-crawler",
    });
    expect(indexed?.robots).toBeUndefined();
    expect(indexed?.description?.length).toBeGreaterThanOrEqual(70);
    expect(indexed?.description?.length).toBeLessThanOrEqual(160);

    const formerlyDraft = getGlossaryDetailMetadata("en", "seo-audit");
    expect(formerlyDraft?.alternates?.canonical).toBe("/en/glossary/seo-audit");
    expect(formerlyDraft?.robots).toBeUndefined();
    expect(getGlossaryDetailMetadata("ru", "not-a-term")).toBeNull();
  });

  it("exports sitemap paths only for reviewed terms", () => {
    expect(glossarySitemapPaths).toHaveLength(indexableGlossarySlugs.length);
    expect(glossarySitemapPaths).toEqual(indexableGlossarySlugs.map((slug) => `glossary/${slug}`));

    for (const locale of ["ru", "en"] satisfies Locale[]) {
      expect(glossaryDetailPath(locale, "search-crawler")).toBe(
        locale === "ru" ? "/glossary/search-crawler" : "/en/glossary/search-crawler",
      );
    }
  });

  it("gives each indexable locale page a distinct search title", () => {
    const titles = new Set<string>();
    for (const slug of indexableGlossarySlugs) {
      for (const locale of ["ru", "en"] as const) {
        const value = getGlossaryDetailMetadata(locale, slug)?.title;
        const title = typeof value === "object" && value && "absolute" in value ? value.absolute : "";
        expect(title.length).toBeGreaterThanOrEqual(30);
        expect(title.length).toBeLessThanOrEqual(60);
        expect(titles.has(title)).toBe(false);
        titles.add(title);
      }
    }
  });
});
