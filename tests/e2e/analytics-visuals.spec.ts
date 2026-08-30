import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
});

test("renders the native visibility chart before an audit begins", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Поисковая видимость", { exact: true })).toBeVisible();
  await expect(page.getByText("Показы в поиске ↑", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  await expect(page.locator(".analytics-visibility-detail svg")).toBeVisible();
  await expect(page.getByText("Пример визуализации динамики — не результат конкретного сайта", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-tool")).toHaveAttribute("data-audit-state", "demo");
});

test("renders compact service outcomes and case metrics without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/seo-audit");
  await expect(page.getByText("Главный результат", { exact: true })).toBeVisible();
  await expect(page.locator(".svc-visual-deliverables li")).toHaveCount(3);

  await page.goto("/seo-promotion");
  await expect(page.getByText("Состав фиксируется до начала работы", { exact: true })).toBeVisible();
  await expect(page.locator(".svc-compact-grid article")).toHaveCount(3);

  await page.goto("/cases");
  const caseErrors = page.getByRole("article", { name: "Снижение технических ошибок" });
  await expect(caseErrors).toBeVisible();
  await expect(caseErrors.getByText("37 → 80", { exact: true })).toBeVisible();
  await expect(caseErrors.getByText("575/575", { exact: true })).toBeVisible();
  await expect(caseErrors.locator(".analytics-case-errors__control")).toBeVisible();

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps the compact service outcome legible in Signal and reduced-motion modes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/seo-promotion");
  await page.evaluate(() => document.documentElement.dataset.kileniTheme = "signal");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(page.locator(".svc-visual-deliverables")).toBeVisible();
  await expect(page.locator(".svc-compact-grid")).toBeVisible();
});

test("reveals result graphics on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/cases");

  const visual = page.locator(".analytics-card").first();
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute("data-ready", "true", { timeout: 2_500 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
