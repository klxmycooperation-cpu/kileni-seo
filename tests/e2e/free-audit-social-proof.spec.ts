import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("keeps the free-audit form, counter and actions physically inside 320–430 px viewports", async ({ page }) => {
  await page.route("**/api/public-metrics/free-audits", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ count: 1_369 }),
  }));

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/free-audit");

    const usage = page.getByTestId("free-audit-usage-count");
    await expect(usage).toContainText("1 369");
    await expect(usage).toContainText(/бесплатн.*провер/u);
    await expect(page.getByText(/демо-примеры|review layout examples/iu)).toHaveCount(0);
    await expect(page.getByLabel(/Сколько страниц проверить/iu)).toHaveCount(0);
    await expect(page.getByLabel("Ваше имя")).toHaveCount(0);
    await expect(page.getByLabel("Email (необязательно)")).toHaveCount(0);
    await expect(page.locator(".audit-form .form-limit")).toContainText("до 10 страниц");

    const elements = [
      page.locator(".audit-page-grid"),
      page.locator(".audit-page-grid > div").first(),
      page.locator(".audit-page-grid .audit-form"),
      page.getByLabel("Адрес сайта"),
      page.getByRole("button", { name: "Проверить сайт бесплатно" }),
    ];
    for (const element of elements) {
      const box = await element.boundingBox();
      expect(box, `${await element.evaluate((node) => node.className || node.tagName)} must render at ${width}px`).not.toBeNull();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
    }

    const numberLineCount = await usage.locator("strong").evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    expect(numberLineCount, `usage number must not wrap at ${width}px`).toBe(1);
  }

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/free-audit");
  await page.getByLabel("Адрес сайта").fill("example.com");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();

  await expect(page.getByText("Шаг 2 из 2")).toBeVisible();
  await expect(page.getByLabel("Адрес сайта")).toHaveAttribute("type", "url");
  await expect(page.getByLabel("Адрес сайта")).toHaveValue("https://example.com");
  await expect(page.getByLabel("Ваше имя")).toHaveCount(0);
  await expect(page.getByLabel("Email (необязательно)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить проверку" })).toBeVisible();
});

test("explains an invalid website address inline and returns focus to the field", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/free-audit");
  const url = page.getByLabel("Адрес сайта");
  await url.fill("not a website");
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();

  await expect(page.locator("#audit-url-error")).toContainText("Проверьте адрес");
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(url).toBeFocused();
  await expect(page.getByText("Шаг 1 из 2")).toBeVisible();
  for (const element of [url, page.locator("#audit-url-error")]) {
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320.5);
  }
});

test("accepts a bare domain from the keyboard without starting an incomplete audit", async ({ page }) => {
  await page.goto("/free-audit");
  const url = page.getByLabel("Адрес сайта");
  await url.fill("example.ru");
  await url.press("Enter");

  await expect(page.getByText("Шаг 2 из 2")).toBeVisible();
  await expect(url).toHaveValue("https://example.ru");
  await expect(page.getByLabel("Email (необязательно)")).toBeFocused();
});

test("keeps the approved baseline visible while no newly completed audits exist", async ({ page }) => {
  await page.route("**/api/public-metrics/free-audits", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ count: 0 }),
  }));
  await page.goto("/free-audit");
  await expect(page.getByTestId("free-audit-usage-count")).toContainText("1 267");
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
  await page.getByLabel("Email (необязательно)").fill("scan@example.com");
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
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.sessionStorage.setItem(`kileni:audit-lead:${auditToken}`, JSON.stringify({
      token: auditToken,
      name: "Анна",
      contact: "anna@example.com",
      domain: "example.com",
      createdAt: Date.now(),
    }));
  }, { auditToken: token });

  await page.goto(`/brief?offer=seo-audit-200&audit=${token}`);
  await expect(page.getByRole("button", { name: /SEO-аудит/u })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByLabel("Компания или проект").fill("Проект Анны");
  await page.getByLabel("Что сейчас не устраивает?").fill("Нужно понять, что мешает поиску");
  await page.getByLabel("Какой результат нужен?").fill("Порядок исправлений");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByLabel("Ссылка на сайт")).toHaveValue("https://example.com");
  await page.getByLabel("Что беспокоит?").fill("Страницы плохо находятся");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByLabel("Имя")).toHaveValue("Анна");
  await expect(page.getByLabel("Telegram или e-mail")).toHaveValue("anna@example.com");
});
