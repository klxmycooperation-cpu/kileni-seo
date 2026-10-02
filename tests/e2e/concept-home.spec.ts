import { expect, test } from "@playwright/test";

test("opens the isolated KILENI concept home without changing the current home route", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/concept");

  await expect(page.getByRole("heading", { name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expect(page.locator("[data-concept-orb]")).toBeVisible();
  await expect(page.locator("[data-concept-orbit]")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Начать бесплатную проверку" })).toHaveAttribute("href", "/free-audit");
  await expect(page.locator("[data-concept-diagram]")).toHaveCount(3);

  await page.goto("/");
  await expect(page.locator(".home-content")).toBeVisible();
});

test("keeps the concept composition within a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/concept");

  await expect(page.locator("[data-concept-orb]")).toBeVisible();
  const headingRight = await page.getByRole("heading", { name: "Сайт есть. Пора сделать так, чтобы его находили." }).evaluate((element) => element.getBoundingClientRect().right);
  expect(headingRight).toBeLessThanOrEqual(391);
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
});
