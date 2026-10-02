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

test("uses the pin perspective once as a standalone route to pricing", async ({ page }, testInfo) => {
  await page.goto("/");

  const pin = page.locator(".home-pin-cta");
  await expect(pin).toHaveCount(1);
  await expect(pin.getByRole("link", { name: "Посмотреть цены и ограничения" })).toHaveAttribute("href", "/pricing");
  await expect(pin.locator(".pin-container__surface")).toBeVisible();
  await expect(pin.locator(".pin-container__rings")).toHaveCSS("opacity", "0");
  await expect(pin.locator(".pin-container__perspective")).toHaveCSS("opacity", "0");
  const seamFade = await pin.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      maskImage: style.maskImage,
      webkitMaskImage: style.getPropertyValue("-webkit-mask-image"),
    };
  });
  expect(seamFade.maskImage || seamFade.webkitMaskImage).toContain("linear-gradient");

  const pinLink = pin.getByRole("link", { name: "Посмотреть цены и ограничения" });
  await pinLink.scrollIntoViewIfNeeded();
  await pinLink.hover();
  await expect(pin.locator(".pin-container__rings")).toHaveCSS("opacity", "1");
  await expect(pin.locator(".pin-container__perspective")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("pin-container-hover.png"), fullPage: false });
});

test("keeps the case route readable on a narrow touch viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const pin = page.locator(".home-pin-cta");
  const pinLink = pin.getByRole("link", { name: "Посмотреть цены и ограничения" });
  await expect(pinLink).toHaveAttribute("href", "/pricing");
  await page.evaluate(() => document.querySelector(".home-pin-cta")?.scrollIntoView({ block: "center" }));
  await expect(pinLink).toBeVisible();
  await expect(pin.locator(".pin-container__perspective")).toBeHidden();
  await pin.screenshot({ path: testInfo.outputPath("pin-container-mobile.png") });
});
