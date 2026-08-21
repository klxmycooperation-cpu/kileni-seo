import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
  })));
});

test("presents the approved home-page story in a deliberate order", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.goto("/");

  await expect(page.getByText("Бесплатная SEO-проверка до 10 страниц", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
  await expect(page.getByText("Бесплатно проверим до 10 страниц, оценим техническое состояние сайта и покажем основные зоны риска. Без доступа к админке.", { exact: true })).toBeVisible();
  await expect(page.getByText("Сначала факты. Потом разговор о продвижении.", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy").getByText("1 267", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy").getByText("страниц уже прошли проверку KILENI", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Посмотреть реальные результаты/u })).toBeVisible();
  await expect(page.getByTestId("hero-search-visibility")).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  for (const detail of ["ориентир", "структура", "контент", "Целевые переходы", "Индексируемые", "Тех. ошибки"]) {
    await expect(page.getByText(detail, { exact: true })).toBeVisible();
  }
  for (const status of ["Видимость ↑", "CTR ↑", "Ошибки ↓"]) {
    await expect(page.getByText(status, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Повторить анимацию" })).toBeVisible();

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
  expect(order.indexOf("home-cases")).toBeLessThan(order.indexOf("home-deliverables"));
  expect(order.indexOf("home-deliverables")).toBeLessThan(order.indexOf("home-directions"));
  expect(order.indexOf("home-directions")).toBeLessThan(order.indexOf("home-articles"));

  await expect(page.locator(".home-process-chapters li")).toHaveCount(4);
  await expect(page.getByRole("heading", { level: 2, name: "От бесплатной проверки до контрольного результата" })).toBeVisible();
  await expect(page.locator(".home-process-story__result")).toContainText("Понимаем: есть ли системные ограничения роста");
  await expect(page.locator(".home-process-chapters h3")).toContainText(["Проверяем", "Объясняем", "Исправляем", "Перепроверяем"]);
  await expect(page.locator(".home-decision__tab")).toHaveCount(3);
  await expect(page.locator(".home-service-list")).toHaveCount(0);
});

test("keeps the new hero readable and finite at mobile widths", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
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

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the home-page promise and primary CTA available", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".brand-intro")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Сайт есть. Пора сделать так, чтобы его находили." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Проверить сайт бесплатно", exact: true })).toBeVisible();
  });
});
