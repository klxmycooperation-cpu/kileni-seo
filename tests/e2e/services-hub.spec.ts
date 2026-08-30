import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("uses a click-controlled four-direction explorer with approved copy", async ({ page }) => {
  await page.goto("/services");

  await expect(page.getByRole("heading", { level: 1, name: "От проблемы — к понятному результату" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Выбрать направление" })).toHaveAttribute("href", "#services-directions");
  await expect(page.getByRole("link", { name: "Проверить сайт бесплатно" })).toHaveAttribute("href", "/free-audit");

  const tabs = page.getByRole("tablist", { name: "Направления услуг" });
  await expect(tabs.getByRole("tab")).toHaveCount(4);
  const seoTab = tabs.getByRole("tab", { name: "SEO", exact: true });
  const developmentTab = tabs.getByRole("tab", { name: "Разработка сайтов", exact: true });
  await expect(seoTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Найти, что мешает сайту, исправить и развивать");
  await expect(page.getByRole("tabpanel")).toContainText("24 900 ₽");

  await developmentTab.hover();
  await expect(seoTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Найти, что мешает сайту, исправить и развивать");

  await developmentTab.click();
  await expect(developmentTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/services\?direction=development$/u);
  await expect(page.getByRole("tabpanel")).toContainText("Собрать сайт под задачу бизнеса, а не просто набор страниц");
  await expect(page.getByRole("tabpanel").getByRole("link", { name: "Выбрать формат сайта" })).toHaveAttribute("href", "/web-development");
  await expect(page.locator(".services-explorer__visual")).toHaveAttribute("data-direction", "development");
});

test("restores the selected direction from the URL and supports tab keyboard navigation", async ({ page }) => {
  await page.goto("/services?direction=marketplaces");

  const tabs = page.getByRole("tablist", { name: "Направления услуг" });
  const marketplaceTab = tabs.getByRole("tab", { name: "Маркетплейсы", exact: true });
  await expect(marketplaceTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Подготовить карточки под правила конкретной площадки");
  await expect(page.getByRole("tabpanel")).toContainText("2 900 ₽ за артикул");

  await marketplaceTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Нестандартная задача" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Стоимость после короткого брифа");
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: "SEO", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Нестандартная задача" })).toHaveAttribute("aria-selected", "true");
});

test("keeps the active panel concise and exposes the full scope on demand", async ({ page }) => {
  await page.goto("/services?direction=seo");

  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("heading", { level: 3, name: "Что делаем" })).toBeVisible();
  await expect(panel.getByRole("heading", { level: 3, name: "Что останется у вас" })).toBeVisible();
  await expect(panel.getByRole("list", { name: "Что делаем" }).getByRole("listitem")).toHaveCount(4);
  await expect(panel.getByRole("list", { name: "Что останется у вас" }).getByRole("listitem")).toHaveCount(4);

  const scope = panel.locator("details").filter({ hasText: "Что входит" });
  await scope.locator("summary").click();
  await expect(panel.locator("details[open] li")).toHaveCount(4);
  await expect(panel.getByRole("link", { name: "Бесплатно проверить до 10 страниц" })).toHaveAttribute("href", "/free-audit");
});

test("fits the complete services hub at every approved mobile width", async ({ page }) => {
  for (const [width, height] of [[320, 720], [360, 800], [390, 844], [430, 932]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/services?direction=marketplaces");

    await expect(page.getByRole("heading", { level: 1, name: "От проблемы — к понятному результату" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Направления услуг" })).toBeVisible();
    await expect(page.getByRole("tabpanel").getByRole("link", { name: "Выбрать площадку" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}px`).toBe(true);
  }
});

test("shows a static final visual when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services?direction=custom");

  await expect(page.locator(".services-hero__journey")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".services-explorer__visual-variant[data-active='true']")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".services-explorer__visual-result")).toContainText("Задачу можно оценить и принять");
});
