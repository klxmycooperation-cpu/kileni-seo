import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, marketing: false }),
    );
  });
});

test("shows a real non-zero free-audit counter without inventing reviews or a page-limit control", async ({ page }) => {
  await page.route("**/api/public-metrics/free-audits", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ count: 2 }),
  }));
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/free-audit");

  await expect(page.getByTestId("free-audit-usage-count")).toContainText("2");
  await expect(page.getByTestId("free-audit-usage-count")).toContainText(/бесплатн.*провер/u);
  await expect(page.getByText(/демо-примеры|review layout examples/iu)).toHaveCount(0);
  await expect(page.getByLabel(/Сколько страниц проверить/iu)).toHaveCount(0);
  await expect(page.getByLabel("Ваше имя")).toHaveCount(0);
  await expect(page.getByLabel("Телефон, Telegram или e-mail")).toHaveCount(0);
  await expect(page.locator(".audit-form .form-limit")).toContainText("до 10 страниц");

  await page.getByLabel("Адрес сайта").fill("https://example.com");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();

  await expect(page.getByText("Шаг 2 из 2")).toBeVisible();
  await expect(page.getByLabel("Ваше имя")).toBeVisible();
  await expect(page.getByLabel("Телефон, Telegram или e-mail")).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить проверку" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("hides the free-audit counter while no completed domains exist", async ({ page }) => {
  await page.route("**/api/public-metrics/free-audits", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ count: 0 }),
  }));
  await page.goto("/free-audit");
  await expect(page.getByTestId("free-audit-usage-count")).toHaveCount(0);
});

test("shows the real audit stages in a fixed, minimizable panel while the request is running", async ({ page }) => {
  const publicToken = "s".repeat(43);
  const restore = "payload.signature";
  let markRequest: (() => void) | undefined;
  let completeRequest: (() => void) | undefined;
  const requestStarted = new Promise<void>((resolve) => { markRequest = resolve; });
  const releaseResponse = new Promise<void>((resolve) => { completeRequest = resolve; });

  await page.route("**/api/audits", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    markRequest?.();
    await releaseResponse;
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({ token: publicToken, status: "partial", restore }),
    });
  });

  await page.goto("/free-audit");
  await page.getByLabel("Адрес сайта").fill("https://example.com");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();
  await page.getByLabel("Ваше имя").fill("Проверка анимации");
  await page.getByLabel("Телефон, Telegram или e-mail").fill("scan@example.com");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();

  const submit = page.getByRole("button", { name: "Запустить проверку" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await requestStarted;

  const scan = page.locator(".audit-live-overlay");
  await expect(scan).toBeVisible();
  await expect(scan).toContainText("Проводим SEO-проверку сайта");
  await expect(scan).toContainText("Проверяем адрес сайта");
  await expect(scan).toHaveCSS("position", "fixed");
  const scanBounds = await scan.boundingBox();
  expect(scanBounds?.width).toBeGreaterThanOrEqual(300);
  await expect(scan.getByRole("button", { name: "Свернуть" })).toBeVisible();
  await scan.getByRole("button", { name: "Свернуть" }).click();
  await expect(page.locator(".audit-live-float")).toBeVisible();
  await page.locator(".audit-live-float").click();
  await expect(scan).toBeVisible();
  completeRequest?.();
  await expect(page).toHaveURL(`/audit/${publicToken}?restore=${encodeURIComponent(restore)}`);
});

test("prefills the paid brief only from a matching same-browser audit handoff", async ({ page }) => {
  const token = "a".repeat(43);
  await page.goto("/");
  await page.evaluate(({ auditToken }) => {
    window.sessionStorage.setItem("kileni:intro:v3", "1");
    window.sessionStorage.setItem(`kileni:audit-lead:${auditToken}`, JSON.stringify({
      token: auditToken,
      name: "Анна",
      contact: "anna@example.com",
      domain: "example.com",
      createdAt: Date.now(),
    }));
  }, { auditToken: token });

  await page.goto(`/brief?offer=audit&discount=25&audit=${token}`);
  await expect(page.getByRole("button", { name: /SEO-аудит/u })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByLabel("Ссылка на сайт")).toHaveValue("https://example.com");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByLabel("Имя")).toHaveValue("Анна");
  await expect(page.getByLabel("E-mail для ответа")).toHaveValue("anna@example.com");
});
