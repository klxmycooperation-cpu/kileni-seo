import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, marketing: false }),
    );
  });
});

test("uses the approved wordmark and exposes the phone in both headers", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".site-header .brand-logo__wordmark")).toHaveText("KILENIseo");
  await expect(page.locator(".site-header .brand-logo svg")).toHaveCount(0);
  await expect(page.locator(".site-header .header-phone--desktop")).toHaveAttribute("href", "tel:+79252256020");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".menu-button").click();
  await expect(page.locator("#mobile-menu .header-phone")).toHaveAttribute("href", /^tel:/u);
});

test("plays the KIL E NI to SEO intro within the approved timeline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator(".brand-intro__initial")).toHaveText("KILENI");
  await expect(page.locator(".brand-intro__split-e")).toHaveText("E");
  await expect(page.locator(".brand-intro__seo-letter--s")).toHaveText("S");
  await expect(page.locator(".brand-intro__seo-letter--o")).toHaveText("O");
  await expect(page.locator(".brand-intro__slogan")).toContainText("Разбираем по буквам");
  await page.waitForTimeout(3_400);
  await expect(page.locator("html")).not.toHaveAttribute("data-kileni-intro", "done");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 4_700 });
});

test("animates the verified case score when the selected case changes", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.goto("/");

  const caseExplorer = page.locator(".home-case-explorer");
  await expect(caseExplorer.locator("[data-score-from='35'][data-score-to='93']")).toContainText("35 → 93");
  await caseExplorer.getByRole("tab", { name: /засорсервис/i }).click();
  await expect(caseExplorer.locator("[data-score-from='37'][data-score-to='80']")).toContainText("37 → 80");
});
