import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kileni:theme:v1", "dark");
    localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
  });
});

test("shows the floating product and pauses the company story", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1672, height: 988 });
  await page.goto("/about");
  const product = page.locator(".about-product-motion");
  await product.scrollIntoViewIfNeeded();
  await expect(product).toHaveAttribute("data-renderer", "image");
  await expect(product.locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Остановить движение" }).click();
  await expect(page.getByRole("button", { name: "Продолжить движение" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".about-v3-video").evaluateAll((videos) => videos.every((video) => (video as HTMLVideoElement).paused))).toBe(true);
  await expect(product).toHaveAttribute("data-motion", "paused");
  await expect(page.locator(".about-v3-staggered-text").first()).toHaveCSS("background-image", "none");
  expect(await page.locator(".about-v3-staggered-text > span").evaluateAll((words) => words.every((word) => getComputedStyle(word).transform === "none"))).toBe(true);
  await page.getByRole("button", { name: "Продолжить движение" }).click();
  await expect(product).toHaveAttribute("data-motion", "floating");
  await expect(page.getByRole("heading", { name: "Как проходит работа с KILENI" })).toBeVisible();
  await expect(page.locator(".about-work-step")).toHaveCount(4);
  await product.screenshot({ path: testInfo.outputPath("about-product-desktop-dark.png"), animations: "disabled" });
  for (const scene of ["seo", "marketplaces", "web", "final"]) {
    await page.locator(`.about-v3-${scene}`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`about-${scene}-desktop-dark.png`), animations: "disabled" });
  }
  await page.locator(".about-workflow").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("about-workflow-desktop-dark.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await page.locator(".about-v3-marketplaces").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("about-marketplaces-desktop-light.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors.filter((error) => /hydrat|uncaught/i.test(error))).toEqual([]);
});

test("keeps the new story readable on mobile and respects reduced motion", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const product = page.locator(".about-product-motion");
  await product.scrollIntoViewIfNeeded();
  await expect(product).toHaveAttribute("data-renderer", "image");
  await expect(product).toHaveAttribute("data-motion", "static");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".about-v3-video").evaluateAll((videos) => videos.every((video) => (video as HTMLVideoElement).paused))).toBe(true);
  await product.screenshot({ path: testInfo.outputPath("about-product-mobile-dark.png"), animations: "disabled" });
  for (const scene of ["seo", "marketplaces", "web", "final"]) {
    await page.locator(`.about-v3-${scene}`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`about-${scene}-mobile-dark.png`), animations: "disabled" });
  }
  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await product.screenshot({ path: testInfo.outputPath("about-product-mobile-light.png"), animations: "disabled" });
  await page.locator(".about-workflow").scrollIntoViewIfNeeded();
  await expect(page.locator(".about-workflow__agreement p")).toHaveCSS("color", "rgb(175, 195, 229)");
  await page.screenshot({ path: testInfo.outputPath("about-workflow-mobile.png"), animations: "disabled" });
});

test("starts the product motion on a phone and keeps tablet scenes inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  const product = page.locator(".about-product-motion");
  await product.scrollIntoViewIfNeeded();
  await expect(product).toHaveAttribute("data-motion", "floating");
  await page.getByRole("button", { name: "Остановить движение" }).click();
  await expect(product).toHaveAttribute("data-motion", "paused");
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `width ${width}`).toBe(true);
  }
});

test("shows hero copy on early pause and responds to changed motion preferences", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Остановить движение" }).click();
  for (const selector of [".about-v3-brand__seo", ".about-v3-hero__title", ".about-v3-hero__lead", ".about-v3-scroll-link"]) {
    await expect(page.locator(selector)).toHaveCSS("opacity", "1");
    await expect(page.locator(selector)).toHaveCSS("filter", "none");
  }
  await page.getByRole("button", { name: "Продолжить движение" }).click();
  const video = page.locator("#aboutVideoA");
  await expect(video).toHaveJSProperty("autoplay", true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveJSProperty("autoplay", false);
  await expect(video).toHaveJSProperty("paused", true);
  await expect(page.getByRole("button", { name: "Остановить движение" })).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(video).toHaveJSProperty("autoplay", true);
  await expect(page.getByRole("button", { name: "Остановить движение" })).toBeVisible();
});

test("animates the development board without hiding the process", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1672, height: 988 });
  await page.goto("/web-development");
  const board = page.locator(".svc-build-process");
  const preview = board.locator(".svc-build-process__preview");
  await expect(preview).toHaveCSS("animation-name", "kileni-build-float");
  await expect(board.getByRole("listitem")).toHaveCount(3);
  await board.screenshot({ path: testInfo.outputPath("development-motion-desktop.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await board.screenshot({ path: testInfo.outputPath("development-motion-desktop-light.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(preview).toHaveCSS("animation-name", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await board.screenshot({ path: testInfo.outputPath("development-motion-mobile.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  await board.screenshot({ path: testInfo.outputPath("development-motion-mobile-dark.png"), animations: "disabled" });
});
