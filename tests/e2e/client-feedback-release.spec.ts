import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.localStorage.setItem("kileni:theme:v1", "dark");
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("keeps the complete mobile hero above the next section", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 912 });
  await page.goto("/");

  const hero = await page.locator(".signal-hero").boundingBox();
  const nextSection = await page.locator(".home-mobile-section-nav").boundingBox();
  expect(hero).not.toBeNull();
  expect(nextSection).not.toBeNull();
  expect(hero!.y + hero!.height).toBeGreaterThanOrEqual(911);
  expect(nextSection!.y).toBeGreaterThanOrEqual(912);
  await expect(page.locator(".hero-title-lock")).toHaveText("Сайт есть.");
  await expectNoHorizontalOverflow(page);
});

test("keeps the mobile hero stable on a short landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("aligns marketplace offer titles, prices, facts and actions", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 1_000 });

  for (const platform of ["wildberries", "ozon"] as const) {
    await page.goto(`/marketplaces/${platform}#marketplace-offers`);
    for (const selector of [".marketplace-offer h3", ".marketplace-offer-price", ".marketplace-offer dl", ".marketplace-offer-actions"]) {
      const tops = await page.locator(selector).evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${platform}: ${selector}`).toBe(1);
    }
    await expectNoHorizontalOverflow(page);
  }
});

test("uses readable supporting text on the dark development page", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/web-development");

  for (const selector of [".svc-detail-copy > p", ".svc-visual-deliverables li", ".svc-visual-note"]) {
    const sizes = await page.locator(selector).evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(sizes.every((size) => size >= 14), selector).toBe(true);
  }
  await expectNoHorizontalOverflow(page);
});

test("shows the custom 404 page with working recovery links", async ({ page }) => {
  const response = await page.goto("/qa-unknown-page-404");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Посмотреть услуги" })).toHaveAttribute("href", "/services");
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
