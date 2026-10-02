import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kileni:theme:v1", "dark");
    localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
  });
});

test("floats the frameless artwork without scrolling and supports pause and offscreen suspension", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const scene = page.locator(".about-product-motion");
  const artwork = scene.locator("img");
  await scene.scrollIntoViewIfNeeded();
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveJSProperty("naturalWidth", 1254);
  await expect(scene).toHaveCSS("border-top-width", "0px");
  await expect(scene).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(scene.locator("canvas, svg, button, figcaption")).toHaveCount(0);
  await expect(artwork).toHaveCSS("animation-play-state", "running");
  const transform = () => artwork.evaluate((element) => getComputedStyle(element).transform);
  const start = await transform();
  const scroll = await page.evaluate(() => scrollY);
  await expect.poll(transform).not.toBe(start);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.screenshot({ path: testInfo.outputPath("product-floating.png") });
  await page.getByRole("button", { name: "Остановить движение" }).click();
  await expect(artwork).toHaveCSS("animation-play-state", "paused");
  const paused = await transform();
  await page.mouse.wheel(0, 150);
  await page.screenshot();
  expect(await transform()).toBe(paused);
  await page.getByRole("button", { name: "Продолжить движение" }).click();
  await expect.poll(transform).not.toBe(paused);
  await page.locator(".about-v3-hero").scrollIntoViewIfNeeded();
  await expect(artwork).toHaveCSS("animation-play-state", "paused");
  await scene.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveCSS("animation-play-state", "running");
  await page.setViewportSize({ width: 390, height: 844 });
  await scene.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveCSS("animation-play-state", "running");
  const mobile = await transform();
  await expect.poll(transform).not.toBe(mobile);
  await page.screenshot({ path: testInfo.outputPath("product-mobile-floating.png") });
  expect(errors).toEqual([]);
});

test("keeps the original textures on mobile with reduced motion and without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl" || kind === "webgl2") return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const scene = page.locator(".about-product-motion");
  const artwork = scene.locator("img");
  await scene.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveJSProperty("naturalWidth", 1254);
  await expect(artwork).toHaveCSS("animation-name", "none");
  await expect(artwork).toHaveCSS("transform", "none");
  await expect(artwork).toHaveAttribute("src", "/visuals/kileni-product-premium-cutout-v2.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(artwork).toHaveCSS("animation-play-state", "running");
  const transform = await artwork.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => artwork.evaluate((element) => getComputedStyle(element).transform)).not.toBe(transform);
});

test("replays the sample conversation and presents a concrete plan without a fake input", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-product-motion")).toHaveAttribute("data-renderer", "image");
  const chat = page.locator(".about-v3-conversation");
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toHaveAttribute("data-playing", "true");
  const report = chat.locator(".about-chat-report");
  await expect.poll(() => report.evaluate((element) => Number(getComputedStyle(element).opacity)), { timeout: 10000 }).toBeGreaterThan(.95);
  await expect(report).toContainText("План исправлений");
  await expect(report.getByRole("listitem")).toHaveCount(3);
  await expect(chat.getByText("Напишите сообщение…")).toHaveCount(0);
  await chat.getByRole("button", { name: "Повторить диалог" }).focus();
  await chat.getByRole("button", { name: "Повторить диалог" }).press("Enter");
  await expect.poll(() => report.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(.1);
  await page.getByRole("button", { name: "Остановить движение" }).click();
  await expect(report).toHaveCSS("opacity", "1");
  await chat.screenshot({ path: testInfo.outputPath("chat-desktop-dark.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("chat-mobile-dark.png"), animations: "disabled" });
});

test("starts the conversation automatically in a short landscape window", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-product-motion")).toHaveAttribute("data-renderer", "image");
  const chat = page.locator(".about-v3-conversation");
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toHaveAttribute("data-playing", "true");
  await expect.poll(() => chat.locator(".about-chat-report").evaluate((element) => Number(getComputedStyle(element).opacity)), { timeout: 10000 }).toBeGreaterThan(.95);
});

test("starts the conversation after the phone changes orientation before it appears", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-product-motion")).toHaveAttribute("data-renderer", "image");
  const chat = page.locator(".about-v3-conversation");
  await expect(chat).toHaveAttribute("data-playing", "false");
  await page.setViewportSize({ width: 844, height: 390 });
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toHaveAttribute("data-playing", "true");
  await expect.poll(() => chat.locator(".about-chat-report").evaluate((element) => Number(getComputedStyle(element).opacity)), { timeout: 10000 }).toBeGreaterThan(.95);
});

test("visually checks the finished product and conversation in both themes and sizes", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-product-motion")).toHaveAttribute("data-renderer", "image");
    for (const theme of ["dark", "light"]) {
      if (theme === "light") await page.getByRole("button", { name: "Включить светлую тему" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
      for (const [name, selector] of [["product", ".about-product-motion"], ["chat", ".about-v3-conversation"]]) {
        const target = page.locator(selector);
        await target.scrollIntoViewIfNeeded();
        await expect(target).toHaveCSS("opacity", "1");
        await expect.poll(() => target.boundingBox()).not.toBeNull();
        await target.screenshot({ path: testInfo.outputPath(`${name}-${viewport.width}-${theme}.png`), animations: "disabled" });
        await page.screenshot({ path: testInfo.outputPath(`${name}-${viewport.width}-${theme}-context.png`), animations: "disabled" });
      }
    }
  }
});
