import { expect, test } from "@playwright/test";

test("keeps optional storage off until the visitor makes a choice", async ({ page }) => {
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Cookies и локальные настройки" });
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
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("kileni-cookie-preferences"))).toBe(
    JSON.stringify({ essential: true, analytics: false, marketing: false }),
  );
});

test("lets the visitor reopen and change cookie settings", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: true, marketing: true }),
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

  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("kileni-cookie-preferences"))).toBe(
    JSON.stringify({ essential: true, analytics: false, marketing: false }),
  );
});
