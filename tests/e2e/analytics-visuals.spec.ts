import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
});

test("renders the native visibility chart before an audit begins", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Поисковая видимость", { exact: true })).toBeVisible();
  await expect(page.getByText("Видимость ↑", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-audit-visual")).toHaveAttribute("aria-label", "Поисковая видимость");
  await expect(page.locator(".analytics-visibility-detail svg")).toBeVisible();
  await expect(page.locator(".hero-tool")).toHaveAttribute("data-audit-state", "demo");
});

test("renders service and case analytic visualisations without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/seo-audit");
  await expect(page.getByText("Техническая оценка сайта", { exact: true })).toBeVisible();
  await expect(page.locator(".analytics-gauge__value")).toBeVisible();

  await page.goto("/seo-promotion");
  await expect(page.getByText("Органический трафик", { exact: true })).toBeVisible();
  await expect(page.getByText("CTR в поиске", { exact: true })).toBeVisible();

  await page.goto("/cases");
  const caseErrors = page.getByRole("article", { name: "Снижение технических ошибок" });
  await expect(caseErrors).toBeVisible();
  await expect(caseErrors.getByText("37 → 80", { exact: true })).toBeVisible();
  await expect(caseErrors.getByText("575/575", { exact: true })).toBeVisible();
  await expect(caseErrors.locator(".analytics-case-errors__control")).toBeVisible();

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps the visualisations legible in Signal and reduced-motion modes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/seo-promotion");
  await page.evaluate(() => document.documentElement.dataset.kileniTheme = "signal");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(page.locator(".analytics-time-card").first()).toBeVisible();
  await expect(page.locator(".analytics-visibility-detail__line").first()).toHaveCSS("stroke-dashoffset", "0px");
});
