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
  await expect(page.getByText("График показывает, как может меняться видимость сайта после исправлений. Это пример, а не результат клиента.", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-tool")).toHaveAttribute("data-audit-state", "demo");
});

test("keeps the hero chart decorative for the keyboard and runs it only once", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");

  const visual = page.locator("[data-testid='hero-search-visibility']");
  const figure = page.locator(".hero-audit-visual");
  await expect(visual).toBeVisible();
  await expect(figure.locator(".analytics-visibility-detail__point-wrap[tabindex='0']")).toHaveCount(0);
  await expect(figure.locator(".analytics-visibility-detail__point-wrap[role='button']")).toHaveCount(0);
  await expect(figure.getByRole("button", { name: /Повторить анимацию/u })).toHaveCount(0);

  const runBefore = await figure.getAttribute("data-visualisation-run");
  await page.clock.fastForward("16:00");
  await expect(figure).toHaveAttribute("data-visualisation-run", runBefore ?? "0");
});

test("renders the hero graph as a complete static picture for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const visual = page.locator("[data-testid='hero-search-visibility']");
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("stroke-dashoffset", "0px");
  await expect(visual.locator(".analytics-visibility-detail__area")).toHaveCSS("opacity", "1");
  await expect(visual.locator(".analytics-visibility-detail__point").first()).toHaveCSS("opacity", "1");
});

test("starts the hero graph only after the intro and pauses it outside the viewport", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const visual = page.locator("[data-testid='hero-search-visibility']");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", /^(pending|play)$/u);
  await expect(visual).toHaveAttribute("data-ready", "false");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 8_500 });
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect(visual).toHaveAttribute("data-in-viewport", "true");

  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute("data-in-viewport", "false");
  await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("animation-play-state", "paused");
});

test("renders compact service outcomes and case metrics without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/seo-audit");
  await expect(page.locator(".svc-compact-grid article").nth(2).getByRole("heading", { name: "Что получите" })).toBeVisible();
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
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "signal"));
  await page.goto("/seo-promotion", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(page.locator(".svc-visual-deliverables")).toBeVisible();
  await expect(page.locator(".svc-compact-grid")).toBeVisible();
});

test("reveals result graphics on a short landscape screen", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/cases", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cases-redesign")).toBeVisible();

  const visual = page.locator(".analytics-card").first();
  await expect(visual).toBeVisible();
  await visual.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(visual).toHaveAttribute("data-ready", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe("server-rendered visibility chart", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps 68 percent, the line and its points visible without JavaScript", async ({ page }) => {
    await page.goto("/");

    const visual = page.locator("[data-testid='hero-search-visibility']");
    await expect(visual.locator(".analytics-hero-chart__metric strong")).toHaveText("68%");
    await expect(visual.locator(".analytics-visibility-detail__line")).toHaveCSS("stroke-dashoffset", "0px");
    await expect(visual.locator(".analytics-visibility-detail__area")).toHaveCSS("opacity", "1");
    await expect(visual.locator(".analytics-visibility-detail__point").first()).toHaveCSS("opacity", "1");
    await expect(visual.locator(".analytics-visibility-detail__end-tag")).toHaveCSS("opacity", "0.9");
  });
});
