import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";

describe("analyzePage", () => {
  it("extracts the on-page, link, structured-data and header signals", () => {
    const analysis = analyzePage({
      url: "https://example.com/products/coffee",
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "camera=()",
        "x-frame-options": "DENY",
        "x-robots-tag": "noindex, nofollow",
      },
      html: `<!doctype html>
        <html lang="ru">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Свежеобжаренный кофе с доставкой по Москве</title>
            <meta name="description" content="Выберите свежеообжаренный кофе с быстрой доставкой по Москве. Зёрна из Бразилии, Эфиопии и Колумбии.">
            <link rel="canonical" href="/products/coffee">
            <meta property="og:title" content="Кофе">
            <meta property="og:description" content="Свежая обжарка">
            <meta property="og:image" content="https://example.com/coffee.jpg">
            <meta property="og:url" content="https://example.com/products/coffee">
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer"}}</script>
            <script type="application/ld+json">{"broken":</script>
          </head>
          <body>
            <h1>Свежий кофе</h1>
            <a href="/about">О нас</a>
            <a href="https://example.com/contact#form">Контакты</a>
            <a href="#details">Детали</a>
            <a href="https://other.example/blog">External</a>
            <img src="one.jpg" alt="Пачка кофе">
            <img src="two.jpg">
            <img src="decorative.svg" alt="">
          </body>
        </html>`,
    });

    expect(analysis.title).toMatchObject({ present: true, optimal: true });
    expect(analysis.description).toMatchObject({ present: true, optimal: true });
    expect(analysis.h1).toEqual({ count: 1, values: ["Свежий кофе"] });
    expect(analysis.canonical).toEqual({
      url: "https://example.com/products/coffee",
      valid: true,
      selfReferential: true,
    });
    expect(analysis.indexing).toMatchObject({ noindex: true, nofollow: true, actual: "unavailable" });
    expect(analysis.language).toEqual({ present: true, value: "ru" });
    expect(analysis.viewport).toBe(true);
    expect(analysis.charset).toBe("utf-8");
    expect(analysis.links).toMatchObject({
      internalCount: 2,
      externalCount: 1,
      internalUrls: [
        "https://example.com/about",
        "https://example.com/contact",
      ],
    });
    expect(analysis.images).toEqual({
      total: 3,
      withAlt: 2,
      missingAlt: 1,
      emptyAlt: 1,
      missingDimensions: 3,
    });
    expect(analysis.structuredData).toEqual({
      total: 2,
      valid: 1,
      invalid: 1,
      types: ["Offer", "Product"],
    });
    expect(analysis.openGraph.coverage).toBe(1);
    expect(analysis.securityHeaders.missing).toEqual([]);
    expect(analysis.issues.map((issue) => issue.code)).toContain("PAGE_NOINDEX");
  });

  it("reports deterministic issues for missing fundamentals", () => {
    const input = {
      url: "http://example.com/empty",
      status: 200,
      headers: { "content-type": "text/html" },
      html: "<html><head></head><body><img src='x.png'></body></html>",
    } as const;

    const first = analyzePage(input);
    const second = analyzePage(input);

    expect(first).toEqual(second);
    expect(first.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "TITLE_MISSING",
        "DESCRIPTION_MISSING",
        "H1_MISSING",
        "LANG_MISSING",
        "VIEWPORT_MISSING",
        "CHARSET_MISSING",
        "IMAGE_ALT_MISSING",
      ]),
    );
  });
});
