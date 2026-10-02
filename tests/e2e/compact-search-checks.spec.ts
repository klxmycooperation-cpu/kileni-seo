import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
  });
});

test("reduces the glossary filter by more than half while keeping search, count and reset usable", async ({ page }, testInfo) => {
  for (const viewport of [
    { width: 1672, height: 988, previousArea: 1538 * 72.78, maxHeight: 56 },
    { width: 390, height: 844, previousArea: 370 * 179.74, maxHeight: 84 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/glossary");
    const filter = page.locator(".glossary-search");
    const box = (await filter.boundingBox())!;
    expect(box.width * box.height).toBeLessThan(viewport.previousArea / 2);
    expect(box.height).toBeLessThanOrEqual(viewport.maxHeight);
    const search = page.getByRole("searchbox", { name: "Найти термин" });
    await search.fill("Системная проверка сайта");
    await expect(page.getByRole("status")).toContainText("Найдено: 1");
    await expect(page.locator(".glossary-results .glossary-item")).toHaveCount(1);
    const clear = page.getByRole("button", { name: "Очистить поиск" });
    expect((await clear.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await clear.click();
    await expect(search).toBeFocused();
    await expect(page.getByRole("status")).toContainText("Найдено: 44");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath(`glossary-${viewport.width}-dark.png`), animations: "disabled" });
    await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
    await page.screenshot({ path: testInfo.outputPath(`glossary-${viewport.width}-light.png`), animations: "disabled" });
    await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  }
});

test("shows all four home checks together and keeps their links usable on desktop and mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1672, height: 988 });
  await page.goto("/");
  const checks = page.locator(".signal-hero .scan-keywords");
  await expect(checks).toBeVisible();
  expect((await checks.boundingBox())!.height).toBeLessThanOrEqual(240);
  const slugs = ["indexing", "on-page", "core-web-vitals", "seo-audit"];
  const descriptions = ["Может ли страница попасть в поиск", "Понятны ли заголовки и связи страниц", "Не мешает ли загрузка посетителю", "Что исправить в первую очередь"];
  for (let index = 0; index < slugs.length; index++) {
    await expect(checks.getByText(descriptions[index], { exact: true })).toBeVisible();
    await expect(checks.getByRole("link").nth(index)).toHaveAttribute("href", `/glossary/${slugs[index]}`);
  }
  await checks.getByRole("link").first().focus();
  // Safari's default Tab navigation skips links; Option+Tab includes them.
  await page.keyboard.press(testInfo.project.name === "webkit" ? "Alt+Tab" : "Tab");
  await expect(checks.getByRole("link").nth(1)).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("home-desktop-dark.png"), animations: "disabled" });
  await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  await page.screenshot({ path: testInfo.outputPath("home-desktop-light.png"), animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(checks).toBeHidden();
  const mobile = page.locator("#home-checks");
  await mobile.scrollIntoViewIfNeeded();
  await expect(mobile.getByRole("link")).toHaveCount(4);
  for (let index = 0; index < slugs.length; index++) {
    await expect(mobile.getByRole("link").nth(index)).toBeVisible();
    await expect(mobile.getByRole("link").nth(index)).toHaveAttribute("href", `/glossary/${slugs[index]}`);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("home-mobile-light.png"), animations: "disabled" });
  await page.locator(".theme-toggle:not(.theme-toggle--mobile)").click();
  await page.screenshot({ path: testInfo.outputPath("home-mobile-dark.png"), animations: "disabled" });
  await mobile.getByRole("link").nth(2).click();
  await expect(page).toHaveURL(/\/glossary\/core-web-vitals$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Core Web Vitals");
});
