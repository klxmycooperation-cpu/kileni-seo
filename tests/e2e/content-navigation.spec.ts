import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("filters the glossary, highlights the match and restores the full alphabet", async ({ page }) => {
  await page.goto("/glossary");

  const search = page.getByRole("searchbox", { name: "Найти термин" });
  const results = page.locator(".glossary-results");
  const alphabet = page.getByRole("navigation", { name: "Быстрый переход по буквам" });

  await expect(search).toBeVisible();
  await expect(alphabet).toBeVisible();
  const russianLetters = alphabet.locator('[data-script="cyrillic"]');
  const latinLetters = alphabet.locator('[data-script="latin"]');
  await expect(russianLetters.getByText("Русские термины", { exact: true })).toBeVisible();
  await expect(latinLetters.getByText("Термины на латинице", { exact: true })).toBeVisible();
  await expect(russianLetters.getByRole("link").first()).toHaveText(/^\p{Script=Cyrillic}$/u);
  await expect(latinLetters.getByRole("link").first()).toHaveText(/^[A-Z]$/u);
  expect(await results.locator(".glossary-item").count()).toBeGreaterThan(10);

  await search.fill("Системная проверка сайта");
  await expect(page.getByRole("status")).toContainText("Найдено: 1");
  await expect(results.locator(".glossary-item")).toHaveCount(1);
  await expect(results.locator("mark")).toHaveText("Системная проверка сайта");

  await page.getByRole("button", { name: "Очистить поиск" }).click();
  expect(await results.locator(".glossary-item").count()).toBeGreaterThan(10);
  await expect(alphabet.getByRole("link", { name: "И", exact: true })).toHaveAttribute("href", /^#glossary-letter-/u);
});

test("shows a useful empty glossary state", async ({ page }) => {
  await page.goto("/glossary");
  await page.getByRole("searchbox", { name: "Найти термин" }).fill("термин-которого-точно-нет");

  await expect(page.getByRole("status")).toContainText("Ничего не найдено");
  await expect(page.locator(".glossary-empty")).toContainText("Попробуйте другое слово");
});

test("keeps the glossary search filter compact without clipping its content", async ({ page }) => {
  for (const viewport of [
    { width: 1210, height: 818, maxFilterHeight: 56 },
    { width: 390, height: 844, maxFilterHeight: 84 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/glossary");

    const filter = page.locator(".glossary-search");
    const filterBox = await filter.boundingBox();
    expect(filterBox, `${viewport.width}px filter box`).not.toBeNull();
    expect(filterBox!.height, `${viewport.width}px filter height`).toBeLessThanOrEqual(viewport.maxFilterHeight);

    for (const content of [
      filter.getByRole("searchbox", { name: "Найти термин" }),
      filter.getByRole("status"),
    ]) {
      await expect(content).toBeVisible();
      const contentBox = await content.boundingBox();
      expect(contentBox, `${viewport.width}px content box`).not.toBeNull();
      expect(contentBox!.y).toBeGreaterThanOrEqual(filterBox!.y);
      expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(filterBox!.y + filterBox!.height + 1);
    }
  }
});

test("adds the same compact sticky navigation to checks and marketplace guides", async ({ page }) => {
  await page.goto("/checks");

  const checksToc = page.getByRole("navigation", { name: "Разделы методики" });
  await expect(checksToc).toBeVisible();
  await expect(checksToc).toHaveCSS("position", "sticky");
  await expect(checksToc.getByRole("link")).toHaveCount(5);
  await expect(checksToc.getByRole("link").first()).toHaveAttribute("href", /^#checks-/u);

  await page.goto("/marketplaces/ozon");

  const marketplaceToc = page.getByRole("navigation", { name: "Разделы страницы" });
  await expect(marketplaceToc).toBeVisible();
  await expect(marketplaceToc).toHaveCSS("position", "sticky");
  await expect(marketplaceToc.getByRole("link", { name: "Этапы подготовки" })).toHaveAttribute("href", "#marketplace-journey");
  await expect(marketplaceToc.getByRole("link", { name: "Состав карточки" })).toHaveAttribute("href", "#marketplace-scope");
  await expect(marketplaceToc.getByRole("link", { name: "Пример результата" })).toHaveAttribute("href", "#marketplace-result");
  await expect(marketplaceToc.getByRole("link", { name: "Варианты" })).toHaveAttribute("href", "#marketplace-offers");
  await expect(marketplaceToc.getByRole("link", { name: "Правила площадки" })).toHaveAttribute("href", "#marketplace-docs");
});

test("keeps both navigation controls inside a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });

  for (const path of ["/glossary", "/checks", "/marketplaces/ozon"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
  }
});
