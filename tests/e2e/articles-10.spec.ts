import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
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
  expect(imageSources.every((source) => source.includes("/editorial/") && source.includes(".svg"))).toBe(true);
  expect(new Set(imageSources).size).toBe(7);

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

test("publishes original illustration attribution and the local image in Article JSON-LD", async ({ page }) => {
  await page.goto("/blog/seo-audit-when-you-need-it");

  await expect(page.locator(".article-hero-image img")).toHaveAttribute("alt", /SEO-аудита/u);
  await expect(page.locator(".article-hero-image figcaption")).toContainText("KILENI");
  await expect(page.locator(".article-hero-image figcaption a")).toHaveCount(0);

  const schema = await page.locator('.article-page > script[type="application/ld+json"]').evaluate((script) => JSON.parse(script.textContent ?? "{}"));
  const article = schema["@graph"].find((item: { "@type"?: string }) => item["@type"] === "Article");
  expect(article.image["@type"]).toBe("ImageObject");
  expect(article.image.url).toContain("/editorial/seo-audit-system.svg");
  expect(article.image.caption).toContain("SEO-аудита");
  expect(article.image.license).toBe("Оригинальная иллюстрация KILENI");
});
