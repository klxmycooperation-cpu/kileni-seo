import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
});

test("uses the cursor-highlight surface once around the home audit tool", async ({ page }, testInfo) => {
  await page.goto("/");

  const highlight = page.locator(".hero-audit-highlight");
  await expect(highlight).toHaveCount(1);
  await expect(highlight).toHaveAttribute("data-highlight-theme", "kileni");
  await expect(highlight.locator(".hero-highlight__content .hero-audit-surface")).toBeVisible();
  const highlightClip = await highlight.evaluate((element) => {
    const style = getComputedStyle(element);
    return { overflow: style.overflow, radius: Number.parseFloat(style.borderTopLeftRadius) };
  });
  expect(["hidden", "clip"]).toContain(highlightClip.overflow);
  expect(highlightClip.radius).toBeGreaterThanOrEqual(20);

  await highlight.hover({ position: { x: 140, y: 180 } });
  const activeDots = highlight.locator(".hero-highlight__dots--active");
  const content = highlight.locator(".hero-highlight__content");
  await expect(activeDots).toHaveCSS("opacity", "0.82");

  const [dotsLayer, contentLayer] = await Promise.all([
    activeDots.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10)),
    content.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10)),
  ]);
  expect(dotsLayer).toBeGreaterThan(contentLayer);

  await page.screenshot({ path: testInfo.outputPath("hero-highlight-hover.png"), fullPage: false });
});
