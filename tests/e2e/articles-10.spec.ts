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
  expect(imageSources.every((source) => /\/editorial\/[a-z0-9-]+-v2\.png/u.test(source))).toBe(true);
  expect(new Set(imageSources).size).toBe(7);
  await expect.poll(() => page.locator(".article-index-grid .article-card-image img").evaluateAll((images) =>
    images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
  )).toBe(true);

  await page.getByRole("button", { name: "Разработка", exact: true }).click();
  await expect(page.locator(".article-index-grid .article-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Скорость загрузки сайта/u })).toBeVisible();

  await page.getByRole("button", { name: "Все материалы", exact: true }).click();
  await expect(page.locator(".article-index-grid .article-card")).toHaveCount(7);
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
  await expect(page.locator(".article-hero-image figcaption")).toContainText("Иллюстрация: KILENI");
  await expect(page.locator(".article-hero-image figcaption a")).toHaveCount(0);

  const schema = await page.locator('.article-page > script[type="application/ld+json"]').evaluate((script) => JSON.parse(script.textContent ?? "{}"));
  const article = schema["@graph"].find((item: { "@type"?: string }) => item["@type"] === "Article");
  expect(article.image["@type"]).toBe("ImageObject");
  expect(article.image.url).toContain("/editorial/seo-audit-workflow-v2.png");
  expect(article.image.caption).toContain("Карта SEO-аудита");
  expect(article.image.license).toBe("KILENI editorial");
});
