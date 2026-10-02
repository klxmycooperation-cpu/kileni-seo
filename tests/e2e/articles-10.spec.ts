import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    version: "2026-08-23.2",
  })));
});

test("presents one featured guide and filters the local editorial library", async ({ page }) => {
  await page.goto("/blog");

  await expect(page.locator(".article-card-featured")).toHaveCount(1);
  await expect(page.locator(".article-index-grid .article-card")).toHaveCount(7);
  const imageSources = await page.locator(".article-index-grid .article-card-image img").evaluateAll((images) =>
    images.map((image) => decodeURIComponent(image.getAttribute("src") ?? "")),
  );
  expect(imageSources).toHaveLength(7);
  expect(imageSources.every((source) => /\/editorial\/[a-z0-9-]+-v2\.webp/u.test(source))).toBe(true);
  expect(new Set(imageSources).size).toBe(7);
  for (const image of await page.locator(".article-index-grid .article-card-image img").all()) {
    // WebKit correctly defers off-screen `loading=lazy` images. Bring each card
    // into view before asserting that its real editorial asset decoded.
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }

  await page.getByRole("button", { name: "Разработка", exact: true }).click();
  await expect(page.locator(".article-index-grid .article-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Скорость загрузки сайта/u })).toBeVisible();

  await page.getByRole("button", { name: "Все материалы", exact: true }).click();
  await expect(page.locator(".article-index-grid .article-card")).toHaveCount(7);
});

test("fills the desktop editorial overview without a hollow grid cell", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/blog");

  const geometry = await page.locator(".article-index-grid").evaluate((grid) => {
    const gridRect = grid.getBoundingClientRect();
    const featured = grid.querySelector<HTMLElement>(".article-card-featured");
    const cards = [...grid.querySelectorAll<HTMLElement>(".article-card:not(.article-card-featured)")];
    if (!featured || cards.length < 2) throw new Error("Editorial grid is incomplete");
    const featuredRect = featured.getBoundingClientRect();
    const bottom = Math.max(...cards.map((card) => card.getBoundingClientRect().bottom));
    const lastRow = cards
      .map((card) => card.getBoundingClientRect())
      .filter((rect) => Math.abs(rect.bottom - bottom) <= 1)
      .sort((left, right) => left.left - right.left);

    return {
      gridLeft: gridRect.left,
      gridRight: gridRect.right,
      featuredLeft: featuredRect.left,
      featuredRight: featuredRect.right,
      lastRowLeft: lastRow[0]?.left,
      lastRowRight: lastRow.at(-1)?.right,
      lastRowCount: lastRow.length,
    };
  });

  expect(geometry.featuredLeft).toBeCloseTo(geometry.gridLeft, 0);
  expect(geometry.featuredRight).toBeCloseTo(geometry.gridRight, 0);
  expect(geometry.lastRowCount).toBe(2);
  expect(geometry.lastRowLeft).toBeCloseTo(geometry.gridLeft, 0);
  expect(geometry.lastRowRight).toBeCloseTo(geometry.gridRight, 0);

  await page.locator(".article-index-browser").screenshot({ path: testInfo.outputPath("blog-index-grid-without-gap.png") });
});

test("keeps non-featured blog previews lazy and compact", async ({ page }) => {
  await page.goto("/blog");

  const previews = page.locator(".article-index-grid .article-card-image img");
  await expect(previews).toHaveCount(7);
  await expect(previews.nth(0)).toHaveAttribute("src", /[?&]q=60(?:&|$)/u);

  for (let index = 1; index < 7; index += 1) {
    await expect(previews.nth(index)).toHaveAttribute("loading", "lazy");
    await expect(previews.nth(index)).toHaveAttribute("src", /[?&]q=60(?:&|$)/u);
  }
});

test("keeps the article library finite and readable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/en/blog");

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(layout.height).toBeLessThan(45_000);
  await expect(page.locator(".article-card-featured")).toBeVisible();
});

test("publishes the KILENI article illustration and its licence in Article JSON-LD", async ({ page }) => {
  await page.goto("/blog/seo-audit-when-you-need-it");

  await expect(page.locator(".article-hero-image img")).toHaveAttribute("alt", /карта SEO-аудита/iu);
  await expect(page.locator(".article-hero-image img")).toHaveAttribute("src", /[?&]q=60(?:&|$)/u);
  await expect(page.locator(".article-hero-image img")).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator(".article-hero-image img")).toHaveAttribute("loading", "eager");
  await expect(page.locator(".article-related-grid .article-card-image img").first()).toHaveAttribute("src", /[?&]q=60(?:&|$)/u);
  await expect(page.locator(".article-related-grid .article-card-image img").first()).toHaveAttribute("loading", "lazy");
  await expect(page.locator(".article-hero-image figcaption")).toContainText("Иллюстрация: KILENI");
  await expect(page.locator(".article-hero-image figcaption a")).toHaveCount(0);

  const schema = await page.locator('.article-page > script[type="application/ld+json"]').evaluate((script) => JSON.parse(script.textContent ?? "{}"));
  const article = schema["@graph"].find((item: { "@type"?: string }) => item["@type"] === "Article");
  expect(article.image["@type"]).toBe("ImageObject");
  expect(article.image.url).toContain("/editorial/seo-audit-workflow-v2.webp");
  expect(article.image.caption).toContain("Карта SEO-аудита");
  expect(article.image.license).toBe("KILENI editorial");
});
