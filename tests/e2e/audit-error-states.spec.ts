import { expect, test } from "@playwright/test";

test("unknown audit link is a readable, noindex 404 without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto(`/audit/${"M".repeat(43)}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Проверка не найдена" })).toBeVisible();
  await expect(page.getByText("Ссылка неверна или срок хранения результата закончился.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");

  await context.close();
});

test("unknown English audit link keeps the locale and returns 404", async ({ page }) => {
  const response = await page.goto(`/en/audit/${"N".repeat(43)}`);

  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Audit not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/en");
});
