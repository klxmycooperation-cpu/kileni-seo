import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    version: "2026-08-23.2",
  })));
});

test("presents the approved home-page story in a deliberate order", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  await expect(page.getByText("Бесплатная SEO-проверка до 10 страниц", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expect(page.getByText("Проверим сайт и простыми словами покажем, что мешает ему появляться в поиске и что исправить в первую очередь.", { exact: true })).toBeVisible();
  await expect(page.getByText("Проверка покажет, с каких исправлений стоит начать.", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy").getByText("1 267", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy").getByText("страниц прошли бесплатную проверку KILENI", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Посмотреть реальные результаты/u })).toBeVisible();
  await expect(page.getByTestId("hero-search-visibility")).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  for (const detail of ["целевой диапазон", "структура", "контент", "Целевые переходы", "Переходы из поиска", "Доступны поиску", "Ошибки сайта"]) {
    await expect(page.getByText(detail, { exact: true })).toBeVisible();
  }
  for (const status of ["Показы в поиске ↑", "Переходы ↑", "Ошибки ↓"]) {
    await expect(page.getByText(status, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Повторить анимацию" })).toHaveCount(0);

  const order = await page.locator("#main-content section[id]").evaluateAll((sections) => sections.map((section) => section.id));
  expect(order).toEqual(expect.arrayContaining([
    "home-tasks",
    "home-process",
    "home-levels",
    "home-cases",
    "home-deliverables",
    "home-directions",
    "home-articles",
  ]));
  expect(order.indexOf("home-tasks")).toBeLessThan(order.indexOf("home-process"));
  expect(order.indexOf("home-process")).toBeLessThan(order.indexOf("home-levels"));
  expect(order.indexOf("home-levels")).toBeLessThan(order.indexOf("home-cases"));
  expect(order.indexOf("home-cases")).toBeLessThan(order.indexOf("home-articles"));
  expect(order.indexOf("home-articles")).toBeLessThan(order.indexOf("home-deliverables"));
  expect(order.indexOf("home-deliverables")).toBeLessThan(order.indexOf("home-directions"));

  await expect(page.locator(".home-process-chapters li")).toHaveCount(4);
  await expect(page.getByRole("heading", { level: 2, name: "От бесплатной проверки до контрольного результата" })).toBeVisible();
  await expect(page.locator(".home-process-story__result")).toContainText("Видим, что мешает сайту появляться в поиске");
  await expect(page.locator(".home-process-chapters h3")).toContainText(["Проверяем", "Объясняем", "Исправляем", "Перепроверяем"]);
  await expect(page.locator(".home-decision__tab")).toHaveCount(3);
  await expect(page.locator(".home-service-list")).toHaveCount(0);
});

test("keeps the new hero readable and finite at mobile widths", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
  expect(layout.height).toBeLessThan(40_000);
  await expect(page.locator(".hero-audit-visual")).toBeVisible();
  await expect(page.getByLabel("Адрес сайта")).toBeVisible();
  await expect(page.getByLabel("Ваше имя")).toHaveCount(0);
});

test("lets visitors browse all seven home-page guides and keeps signal mode distinct", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni:theme:v1", "dark");
  });
  await page.goto("/");

  const viewport = page.locator(".home-article-carousel__viewport");
  await expect(viewport.locator("[data-article-card]")).toHaveCount(7);
  await expect(viewport.locator('a[href$="/blog/seo-promotion-cost"]')).toHaveCount(1);
  const nextGuide = page.getByRole("button", { name: "Следующий разбор" });
  await expect(nextGuide).toBeEnabled();
  const initialScroll = await viewport.evaluate((element) => element.scrollLeft);
  await nextGuide.click();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialScroll);

  await page.getByLabel("Включить сигнальную тему").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(page.locator(".kileni-site")).toHaveCSS("--brand", "#b7f44a");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the home-page promise and primary CTA available", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".brand-intro")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Узнать, что мешает сайту", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "От бесплатной проверки до контрольного результата" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Как замечание превращается в проверенное исправление" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Когда одной проверки недостаточно" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Новые разборы — прямо на главной" })).toBeVisible();
  });
});
