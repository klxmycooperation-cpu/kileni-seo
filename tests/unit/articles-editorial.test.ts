import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getArticles } from "../../src/content/articles";

const projectRoot = process.cwd();

describe("article editorial presentation", () => {
  it("maps every Russian article to one clear search intent without invented volume data", () => {
    const articles = getArticles("ru");

    for (const article of articles) {
      expect(article.searchIntent.primaryQuery.length).toBeGreaterThan(8);
      expect(article.searchIntent.relatedQueries.length).toBeGreaterThanOrEqual(4);
      expect(new Set(article.searchIntent.relatedQueries).size).toBe(article.searchIntent.relatedQueries.length);
      expect(article.searchIntent).not.toHaveProperty("volume");
      expect(article.title.toLocaleLowerCase("ru-RU")).toContain(
        article.searchIntent.primaryQuery.toLocaleLowerCase("ru-RU"),
      );
      expect(article.sections[0]?.paragraphs.join(" ").toLocaleLowerCase("ru-RU")).toContain(
        article.searchIntent.primaryQuery.toLocaleLowerCase("ru-RU"),
      );
    }
  });

  it("keeps the copy concise, attributed and free of generic filler", () => {
    const forbidden = [
      "в современном мире",
      "важно отметить",
      "практический разбор",
      "комплексный подход",
      "в данной статье",
      "delve",
      "in today's digital landscape",
      "it is important to note",
    ];

    for (const locale of ["ru", "en"] as const) {
      for (const article of getArticles(locale)) {
        const copy = JSON.stringify(article).toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US");
        const wordCount = article.sections
          .flatMap((section) => section.paragraphs)
          .join(" ")
          .trim()
          .split(/\s+/u).length;

        expect(article.author).toBe(locale === "ru" ? "Редакция KILENI" : "KILENI Editorial");
        expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
        expect(article.sources.length).toBeGreaterThanOrEqual(2);
        expect(new Set(article.sources.map((source) => source.url)).size).toBe(article.sources.length);
        for (const source of article.sources) expect(source.url).toMatch(/^https:\/\//u);
        expect(article.sections.length).toBeGreaterThanOrEqual(4);
        expect(article.sections.length).toBeLessThanOrEqual(5);
        expect(wordCount).toBeGreaterThan(450);
        expect(wordCount).toBeLessThan(1_100);
        for (const phrase of forbidden) expect(copy).not.toContain(phrase);
      }
    }
  });

  it("includes first-hand audit evidence where the topic makes a result claim", () => {
    const audit = getArticles("ru").find((article) => article.slug === "seo-audit-when-you-need-it");
    const indexing = getArticles("ru").find((article) => article.slug === "why-website-is-not-in-search");
    const combinedCopy = JSON.stringify([audit, indexing]);

    expect(combinedCopy).toContain("509/509");
    expect(combinedCopy).toContain("575/575");
    expect(combinedCopy).toContain("36 → 57");
    expect(combinedCopy).toContain("0,519 → 0,0001");
  });

  it("uses a unique, attributed local visual for every article", () => {
    const articles = getArticles("ru");
    const expectedCovers = [
      "/editorial/seo-audit-workflow-v2.webp",
      "/editorial/marketplace-card-production-v2.webp",
      "/editorial/indexing-path-v2.webp",
      "/editorial/seo-vs-yandex-ads-v2.webp",
      "/editorial/website-speed-loading-v2.webp",
      "/editorial/seo-ecommerce-promotion-v2.webp",
      "/editorial/seo-promotion-cost-v2.webp",
    ];

    expect(articles).toHaveLength(7);
    expect(articles.map((article) => article.hero.src)).toEqual(expectedCovers);
    expect(new Set(articles.map((article) => article.hero.src)).size).toBe(7);
    for (const article of articles) {
      expect(article.hero.src).toMatch(/^\/editorial\/(?:photos\/)?[a-z0-9-]+\.(?:jpg|png|svg|webp)$/u);
      expect(existsSync(join(projectRoot, "public", article.hero.src))).toBe(true);
      expect(article.hero.alt.trim().length).toBeGreaterThan(30);
      expect(article.hero.credit).toBe("Иллюстрация: KILENI");
      expect(article.hero.sourceUrl).toBeUndefined();
      expect(article.hero.license).toBe("KILENI editorial");
      expect(article.hero.licenseUrl).toBeUndefined();
    }
  });

  it("keeps Russian and English article covers in sync with localized alt text", () => {
    const russian = getArticles("ru");
    const english = getArticles("en");

    expect(english.map((article) => article.slug)).toEqual(russian.map((article) => article.slug));
    for (const russianArticle of russian) {
      const englishArticle = english.find((article) => article.slug === russianArticle.slug);
      expect(englishArticle?.hero.src).toBe(russianArticle.hero.src);
      expect(englishArticle?.hero.credit.replace(/^(?:Photo|Illustration): /u, "")).toBe(russianArticle.hero.credit.replace(/^(?:Фото|Иллюстрация): /u, ""));
      expect(englishArticle?.hero.sourceUrl).toBe(russianArticle.hero.sourceUrl);
      expect(englishArticle?.hero.licenseUrl).toBe(russianArticle.hero.licenseUrl);
      expect(englishArticle?.hero.alt).not.toBe(russianArticle.hero.alt);
      expect(englishArticle?.hero.alt.trim().length).toBeGreaterThan(20);
    }
  });

  it("defines the approved petroleum-on-white palette for editorial pages", () => {
    const css = readFileSync(join(projectRoot, "app", "editorial.css"), "utf8");

    expect(css).toMatch(/--article-paper:\s*#fdfdfd/iu);
    expect(css).toMatch(/--article-ink:\s*#0b132b/iu);
  });

  it("uses a featured story, topic filter and restrained site typography", () => {
    const css = readFileSync(join(projectRoot, "app", "editorial.css"), "utf8");

    expect(css).toMatch(/\.article-index-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/isu);
    expect(css).toMatch(/\.editorial-index-top \.page-hero h1\s*\{[^}]*font-size:\s*clamp\([^,]+,[^,]+,\s*4\.5rem\)/isu);
    expect(css).toMatch(/--article-display:\s*var\(--font-manrope\)/iu);
    expect(css).toMatch(/--article-text:\s*var\(--font-manrope\)/iu);
    expect(css).not.toMatch(/FOLIES BERGER/iu);
    expect(css).toMatch(/\.article-card-featured\s*\{/u);
    expect(css).toMatch(/\.article-topic-filter\s*\{/u);
  });
});
