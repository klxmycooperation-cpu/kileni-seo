import { describe, expect, it } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import type { PageAnalysis } from "../../src/lib/audit/types";

describe("bounded page evidence", () => {
  it("keeps complete transport, robots, hreflang and structured-data evidence", () => {
    const page = analyzePage({
      url: "https://example.com/final",
      requestedUrl: "https://example.com/start",
      redirects: ["https://example.com/middle", "https://example.com/final"],
      checkedAt: "2026-09-15T10:20:30.000Z",
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow",
      },
      html: `<!doctype html><html lang="ru"><head>
        <title>Полный заголовок страницы без обрезания</title>
        <meta name="robots" content="index,follow">
        <link rel="canonical" href="https://example.com/other">
        <link rel="alternate" hreflang="en" href="/en/final">
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Главная","item":"https://example.com/"}]}</script>
        <script type="application/ld+json">{"broken":</script>
      </head><body><h1>Первый H1</h1><h1>Второй H1</h1><a href="/next">Далее</a></body></html>`,
    });

    expect(page.transport).toMatchObject({
      requestedUrl: "https://example.com/start",
      finalUrl: "https://example.com/final",
      redirects: ["https://example.com/middle", "https://example.com/final"],
      redirectCount: 2,
      checkedAt: "2026-09-15T10:20:30.000Z",
    });
    expect(page.title.value).toBe("Полный заголовок страницы без обрезания");
    expect(page.indexing).toMatchObject({ noindex: true, nofollow: true });
    expect(page.indexing).toHaveProperty("metaRobots", "index,follow");
    expect(page.indexing).toHaveProperty("xRobotsTag", "noindex, nofollow");
    expect(page.hreflang).toEqual([{ language: "en", url: "https://example.com/en/final" }]);
    expect(page.structuredData).toMatchObject({ valid: 1, invalid: 1 });
    expect(page.structuredData.types).toEqual(expect.arrayContaining(["BreadcrumbList"]));
    expect(page.structuredData).toHaveProperty("breadcrumbList", { valid: 1, invalid: 0 });
  });

  it("does not claim actual search indexing from crawl evidence", () => {
    const page: PageAnalysis = analyzePage({
      url: "https://example.com/",
      status: 200,
      html: "<html><head><title>Example title for page</title></head><body><h1>Home</h1></body></html>",
    });
    expect(page).not.toHaveProperty("actualIndexed");
    expect(page).toHaveProperty("indexing.actual", "unavailable");
  });
});
