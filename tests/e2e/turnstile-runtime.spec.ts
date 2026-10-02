import { expect, test, type Page } from "@playwright/test";

async function openVerification(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const skip = page.getByRole("button", { name: "Пропустить заставку", exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 10_000 });
  const cookies = page.getByRole("button", { name: "Только необходимые", exact: true });
  await cookies.click();
  await expect(page.getByRole("dialog", { name: "Cookies и локальные настройки" })).toBeHidden();
  await page.getByLabel("Адрес сайта", { exact: true }).fill("https://example.com");
  await page.locator(".audit-form button[type=button]").first().click();
  await expect(page.getByLabel("Email (необязательно)")).toBeVisible();
}

test("loads verification from runtime configuration on a statically built page", async ({ page }) => {
  await page.route("**/api/public/turnstile-key", (route) => route.fulfill({
    json: { siteKey: "runtime-public-key" },
  }));
  // A local widget substitute tests configuration delivery without contacting
  // Cloudflare or solving a real verification challenge.
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `window.turnstile = {
      render: function(selector, options) {
        const element = document.querySelector(selector);
        element.textContent = options.sitekey;
        options.callback("local-widget-token");
        return "local-widget";
      }, reset: function() {}, remove: function() {}
    };`,
  }));
  await openVerification(page);
  await expect(page.locator(".turnstile-field")).toContainText("runtime-public-key");
});

for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  test(`keeps ${device} submission disabled when runtime verification configuration fails`, async ({ page }) => {
    await page.route("**/api/public/turnstile-key", (route) => route.fulfill({ status: 503, json: { siteKey: null } }));
    await page.setViewportSize(viewport);
    await openVerification(page);
    await expect(page.locator(".turnstile-field__error")).toBeVisible();
    await expect(page.locator(".audit-form button[type=submit]")).toBeDisabled();
    await page.locator(".turnstile-field__error").scrollIntoViewIfNeeded();
    await page.locator(".audit-form").screenshot({ path: `scratch/intro-20261002/turnstile-unavailable-${device}-${test.info().project.name}.png` });
  });
}
