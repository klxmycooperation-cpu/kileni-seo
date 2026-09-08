import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("preserves an address entered before hydration finishes", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });

  await page.goto("/free-audit", { waitUntil: "commit" });
  const url = page.getByLabel("Адрес сайта");
  await url.fill("example.com");
  await page.waitForLoadState("load");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();

  await expect(page.getByLabel("Email (необязательно)")).toBeVisible();
  await expect(url).toHaveValue("https://example.com");
});

test("shows a useful message when the audit endpoint returns an unexpected HTML error", async ({ page }) => {
  await page.route("**/api/audits", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html><body>Bad gateway</body></html>",
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/free-audit");
  const url = page.getByLabel("Адрес сайта");
  await url.fill("example.com");
  await expect(url).toHaveValue("example.com");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();
  await page.getByLabel("Email (необязательно)").fill("recipient@example.test");
  await page.locator('input[name="consent"]').check();
  await page.locator('input[name="authority"]').check();

  const submit = page.getByRole("button", { name: "Запустить проверку" });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByRole("alert").filter({ hasText: "Сервис проверки временно недоступен" })).toBeVisible();
  await expect(page.getByText("Не удалось связаться с сервером. Попробуйте ещё раз.", { exact: true })).toHaveCount(0);
});
