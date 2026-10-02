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
  await page.getByRole("button", { name: "Проверить бесплатно до 10 репрезентативных страниц сайта" }).click();

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
  await page.getByRole("button", { name: "Проверить бесплатно до 10 репрезентативных страниц сайта" }).click();
  await page.getByLabel("Email (необязательно)").fill("recipient@example.test");
  await page.locator('input[name="consent"]').check();
  await page.locator('input[name="authority"]').check();

  const submit = page.getByRole("button", { name: "Запустить проверку" });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByRole("alert").filter({ hasText: "Сервис проверки временно недоступен" })).toBeVisible();
  await expect(page.getByText("Не удалось связаться с сервером. Попробуйте ещё раз.", { exact: true })).toHaveCount(0);
});

test("renews an out-of-date protection token and retries the audit once", async ({ page }) => {
  const auditToken = "c".repeat(43);
  let submissions = 0;
  await page.route("**/api/audits", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submissions += 1;
    if (submissions === 1) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "CSRF_REJECTED", message: "Защитный токен недействителен" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: auditToken, status: "queued" }),
    });
  });

  await page.goto("/free-audit");
  await page.getByLabel("Адрес сайта").fill("example.com");
  await page.getByRole("button", { name: "Проверить бесплатно до 10 репрезентативных страниц сайта" }).click();
  await page.locator('input[name="authority"]').check();
  await expect(page.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
  await page.getByRole("button", { name: "Запустить проверку" }).click();

  await expect(page).toHaveURL(`/audit/${auditToken}`);
  expect(submissions).toBe(2);
});
