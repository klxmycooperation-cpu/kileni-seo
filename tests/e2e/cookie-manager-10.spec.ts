import { expect, test } from "@playwright/test";

test("keeps optional storage off until the visitor makes a choice", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
  await expect(dialog).toHaveCount(0);
  await page.waitForTimeout(3_600);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 12_000 });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Принять все" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Только необходимые" })).toBeVisible();

  await dialog.getByRole("button", { name: "Настроить" }).click();
  const checkboxes = dialog.getByRole("checkbox");
  await expect(checkboxes).toHaveCount(3);
  await expect(checkboxes.nth(0)).toBeChecked();
  await expect(checkboxes.nth(0)).toBeDisabled();
  await expect(checkboxes.nth(1)).not.toBeChecked();
  await expect(checkboxes.nth(2)).not.toBeChecked();

  await dialog.getByRole("button", { name: "Сохранить выбор" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem("kileni-cookie-preferences:v2") ?? "null"))).toMatchObject(
    { essential: true, analytics: false, marketing: false, version: "2026-08-23.2" },
  );
});

test("does not block a deep link with the home intro and may show cookies there immediately", async ({ page }) => {
  await page.goto("/services", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".brand-intro-v10")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-kileni-intro", /^(pending|play|reduced|finishing)$/u);
  await expect(page.getByRole("dialog", { name: "Cookies и локальные настройки" })).toBeVisible({ timeout: 1_500 });
});

test("keeps the first-choice cookie notice compact on a 390 pixel phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/services", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
  await expect(dialog).toBeVisible();
  const layout = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      height: rect.height,
      top: rect.top,
      viewportHeight: window.innerHeight,
      scrollHeight: element.scrollHeight,
    };
  });

  expect(layout.height).toBeLessThanOrEqual(390);
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height + 1);
});

test("shows a static reduced-motion intro before opening cookie settings", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 2_500 });
  await expect(dialog).toBeVisible();
});

test("lets the visitor reopen and change cookie settings", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: true, marketing: true, version: "2026-08-23.2" }),
    );
  });
  await page.goto("/");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Настройки cookies" }).click();
  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Аналитика").uncheck();
  await dialog.getByLabel("Маркетинг").uncheck();
  await dialog.getByRole("button", { name: "Сохранить выбор" }).click();

  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem("kileni-cookie-preferences:v2") ?? "null"))).toMatchObject(
    { essential: true, analytics: false, marketing: false, version: "2026-08-23.2" },
  );
});

test("keeps keyboard focus inside settings and restores it when dismissed", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: true, marketing: true, version: "2026-08-23.2" }),
    );
  });
  await page.goto("/");

  const settingsButton = page.getByRole("button", { name: "Настройки cookies" });
  await settingsButton.click();

  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
  const title = dialog.getByRole("heading", { name: "Cookies и локальные настройки" });
  await expect(dialog).toBeVisible();
  await expect(title).toBeFocused();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  await expect(page.locator("#main-content")).toHaveAttribute("aria-hidden", "true");

  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Сохранить выбор" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("summary").first()).toBeFocused();

  await dialog.getByLabel("Аналитика").uncheck();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settingsButton).toBeFocused();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#main-content")).not.toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem("kileni-cookie-preferences:v2") ?? "null"))).toMatchObject(
    { essential: true, analytics: true, marketing: true, version: "2026-08-23.2" },
  );

  await settingsButton.click();
  await expect(dialog.getByLabel("Аналитика")).toBeChecked();
});
