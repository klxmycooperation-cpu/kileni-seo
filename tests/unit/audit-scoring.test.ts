import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import {
  normalizeCategoryScore,
  scoreAudit,
} from "../../src/lib/audit/scoring";
import type { RobotsInfo, SitemapInfo } from "../../src/lib/audit/types";

const robots: RobotsInfo = {
  url: "https://example.com/robots.txt",
  status: "found",
  httpStatus: 200,
  allowedRoot: true,
  sitemapUrls: ["https://example.com/sitemap.xml"],
};

const sitemap: SitemapInfo = {
  status: "found",
  filesVisited: 1,
  urls: ["https://example.com/", "https://example.com/about"],
  errors: [],
};

function perfectPage() {
  return analyzePage({
    url: "https://example.com/",
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin",
      "permissions-policy": "camera=()",
      "x-frame-options": "DENY",
    },
    html: `<html lang="ru"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>Каталог свежего кофе с доставкой по Москве</title>
      <meta name="description" content="Свежеообжаренный кофе из Бразилии и Эфиопии с доставкой по Москве в день заказа. Выберите свой вкус.">
      <link rel="icon" href="/favicon.svg">
      <link rel="canonical" href="https://example.com/">
      <meta property="og:title" content="Кофе"><meta property="og:description" content="Каталог">
      <meta property="og:image" content="https://example.com/og.jpg"><meta property="og:url" content="https://example.com/">
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      </head><body><h1>Каталог кофе</h1><p>${"Подробное описание сортов кофе, обжарки, происхождения, вкуса, доставки, приготовления и выбора подходящего зерна для дома или офиса. ".repeat(10)}</p><a href="/about">О нас</a><img src="coffee.jpg" alt="Кофе" width="640" height="360"></body></html>`,
  });
}

describe("deterministic scoring", () => {
  it("uses the exact 30/25/20/15/10 category budget", () => {
    const score = scoreAudit({
      targetUrl: "https://example.com/",
      pages: [perfectPage()],
      robots,
      sitemap,
      pagesDiscovered: 1,
      performance: {
        performance: 1,
        fcpMs: 1_000,
        lcpMs: 2_000,
        cls: 0.05,
        tbtMs: 100,
        accessibility: 1,
      },
    });

    expect(score.total).toBe(100);
    expect(Object.keys(score.categories)).toEqual([
      "technicalIndexing",
      "structureOnPage",
      "performanceMobile",
      "trustStructuredData",
      "contentImages",
    ]);
    expect(Object.values(score.categories).map((category) => category.maxScore)).toEqual([
      30,
      25,
      20,
      15,
      10,
    ]);
  });

  it("normalizes over applicable checks instead of penalizing unavailable data", () => {
    const category = normalizeCategoryScore("technicalIndexing", 30, [
      { id: "known", label: "Known", value: 1, weight: 2 },
      { id: "unknown", label: "Unknown", value: null, weight: 8 },
    ]);

    expect(category.score).toBe(30);
    expect(category.checks[1]?.applicable).toBe(false);
  });

  it("clamps partial values and produces identical output for identical input", () => {
    const input = {
      targetUrl: "https://example.com/",
      pages: [perfectPage()],
      robots,
      sitemap,
      pagesDiscovered: 1,
    } as const;
    expect(scoreAudit(input)).toEqual(scoreAudit(input));
    expect(
      normalizeCategoryScore("structureOnPage", 25, [
        { id: "over", label: "Over", value: 2, weight: 1 },
        { id: "under", label: "Under", value: -1, weight: 1 },
      ]).score,
    ).toBe(13);
  });

  it("keeps unavailable Lighthouse metrics null and conservatively marks coverage", () => {
    const score = scoreAudit({
      targetUrl: "https://example.com/",
      pages: [perfectPage()],
      pagesDiscovered: 1,
      robots,
      sitemap,
    });
    const performance = score.categories.performanceMobile;

    expect(performance.score).toBe(11);
    expect(performance.coverage).toBe(0.1);
    expect(performance.partial).toBe(true);
    expect(
      performance.checks
        .filter((check) => check.id !== "viewport")
        .every((check) => check.value === null && check.applicable === false),
    ).toBe(true);
    expect(score).toMatchObject({ total: 91, coverage: 0.82, partial: true });
  });

  it("reflects the checked/discovered page share in coverage without duplicate checks", () => {
    const score = scoreAudit({
      targetUrl: "https://example.com/",
      pages: [perfectPage()],
      pagesDiscovered: 10,
      robots,
      sitemap,
    });
    const checkIds = Object.values(score.categories).flatMap((category) =>
      category.checks.map((check) => check.id),
    );

    expect(score.coverage).toBe(0.19);
    expect(new Set(checkIds).size).toBe(checkIds.length);
    expect(score.partial).toBe(true);
  });

  it("does not reduce the quality score for pages outside the planned public sample", () => {
    const pages = Array.from({ length: 10 }, () => perfectPage());
    const common = {
      targetUrl: "https://example.com/",
      pages,
      plannedPages: 10,
      robots,
      sitemap,
      performance: {
        performance: 1,
        fcpMs: 1_000,
        lcpMs: 2_000,
        cls: 0.05,
        tbtMs: 100,
        accessibility: 1,
      },
    } as const;

    const exactSample = scoreAudit({ ...common, pagesDiscovered: 10 });
    const largerSite = scoreAudit({ ...common, pagesDiscovered: 43 });

    expect(largerSite.total).toBe(exactSample.total);
    expect(largerSite.coverage).toBeLessThan(exactSample.coverage);
    expect(largerSite.partial).toBe(true);
  });
});
