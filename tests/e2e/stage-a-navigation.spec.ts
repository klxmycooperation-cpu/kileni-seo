import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("skip link moves focus to main content and keeps the next tab stop inside it", async ({ page }) => {
  await page.goto("/services");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Перейти к содержимому" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");

  const main = page.locator("main#main-content");
  await expect(main).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await main.evaluate((element) => element.contains(document.activeElement))).toBe(true);
});

test("mobile drawer moves focus inside, traps it and makes page content inert", async ({ page }) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/services");

    await page.getByRole("button", { name: "Открыть меню" }).click();
    const menu = page.locator("#mobile-menu");
    const focusable = menu.locator("a:visible, button:visible");

    await expect(menu).toBeVisible();
    await expect(focusable.first()).toBeFocused();
    await expect(page.locator("main#main-content")).toHaveAttribute("inert", "");
    await expect(page.locator(".site-footer")).toHaveAttribute("inert", "");

    await page.keyboard.press("Shift+Tab");
    await expect(focusable.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(focusable.first()).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
    await expect(page.locator("main#main-content")).not.toHaveAttribute("inert", "");
  }
});

test("mobile drawer locks page scroll and restores the exact position after backdrop close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/services");
  await page.evaluate(() => window.scrollTo(0, 640));
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(640);
  const initialScrollY = await page.evaluate(() => window.scrollY);

  await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  const lockedScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(8, 8);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScrollY);

  await page.locator("[data-mobile-menu-backdrop]").click({ position: { x: 8, y: 8 } });
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(initialScrollY));
});

test("mobile drawer closes after route navigation and returns focus to its trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/services");
  await page.getByRole("button", { name: "Открыть меню" }).click();

  await page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "Цены" }).click();

  await expect(page).toHaveURL(/\/pricing$/u);
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
});
