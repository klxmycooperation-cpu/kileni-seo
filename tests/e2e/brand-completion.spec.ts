import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("uses the approved SVG wordmark and exposes the phone in both headers", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".site-header .brand-logo__wordmark")).toHaveText("KILENIseo");
  await expect(page.locator(".site-header .brand-logo svg")).toHaveAttribute("viewBox", "0 0 242 54");
  await expect(page.locator(".site-header .brand-logo__name")).toHaveText("KILENI");
  await expect(page.locator(".site-header .brand-logo__descriptor")).toHaveText("seo");
  await expect(page.locator(".site-header .header-phone--desktop")).toHaveAttribute("href", "tel:+79295900900");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".menu-button").click();
  await expect(page.locator("#mobile-menu .header-phone")).toHaveAttribute("href", /^tel:/u);
});

test("finishes the KILENI intro at its natural pace and offers an explicit skip", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const intro = page.locator(".brand-intro-v9");
  await expect(intro.locator(".brand-intro-v9__kil")).toHaveText("KIL");
  await expect(intro.locator(".brand-intro-v9__ni")).toHaveText("NI");
  await expect(intro.locator(".brand-intro-v9__e")).toHaveText("E");
  await expect(intro.locator(".brand-intro-v9__s")).toHaveText("S");
  await expect(intro.locator(".brand-intro-v9__o")).toHaveText("O");
  await expect(intro.locator(".brand-intro-v9__slogan").first()).toContainText("Разбираем по буквам");
  await expect(page.getByRole("button", { name: "Пропустить заставку" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 8_500 });
  const clientDuration = await page.evaluate(() => {
    const startedAt = Number(document.documentElement.dataset.kileniIntroLastStartedAt);
    return Number.isFinite(startedAt) ? performance.now() - startedAt : Number.NaN;
  });
  expect(clientDuration).toBeGreaterThanOrEqual(4_100);
  expect(clientDuration).toBeLessThanOrEqual(5_000);
  await expect(page.locator(".brand-intro")).toHaveCount(0);
});

test("loads intro audio only after the visitor requests sound", async ({ page }) => {
  await page.goto("/?intro=1", { waitUntil: "domcontentloaded" });

  const audio = page.locator(".brand-intro-v9 audio");
  await expect(audio).not.toHaveAttribute("src");
  await expect(audio).toHaveAttribute("preload", "none");
  await page.getByRole("button", { name: "Включить звук" }).click();
  await expect(audio).toHaveAttribute("src", "/brand/kileni-intro-foley-v9.m4a");
});

test("animates the verified case score when the selected case changes", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  const caseExplorer = page.locator(".home-case-explorer");
  await caseExplorer.scrollIntoViewIfNeeded();
  const firstScore = caseExplorer.locator("[data-score-from='35'][data-score-to='93']");
  await expect(firstScore.locator(".visually-hidden")).toHaveText("35 → 93");
  await expect(firstScore.locator("[aria-hidden='true']")).toContainText("35 → 93");
  await caseExplorer.getByRole("tab", { name: /засорсервис/i }).click();
  const secondScore = caseExplorer.locator("[data-score-from='37'][data-score-to='80']");
  await expect(secondScore.locator(".visually-hidden")).toHaveText("37 → 80");
  await expect(secondScore.locator("[aria-hidden='true']")).toContainText("37 → 80");
});

test("describes the hero chart and makes each data point keyboard-accessible", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v9", "1"));
  await page.goto("/");

  const chart = page.getByRole("group", { name: /Динамика поисковой видимости с марта по август/u });
  await expect(chart).toBeVisible();
  await expect(chart.locator("title")).toHaveText("Динамика поисковой видимости с марта по август");
  await expect(chart.locator("desc")).toContainText("Март: 34%");
  await expect(chart.locator("[tabindex='0']")).toHaveCount(13);
});

test.describe("server-rendered home proof", () => {
  test.use({ javaScriptEnabled: false });

  test("contains the verified final case values before hydration", async ({ page }) => {
    await page.goto("/");

    const caseExplorer = page.locator(".home-case-explorer");
    await expect(caseExplorer.locator("[data-score-from='35'][data-score-to='93'] [aria-hidden='true']")).toHaveText("35 → 93");
    await expect(caseExplorer.locator("[data-counter-from='0'][data-counter-to='509'] [aria-hidden='true']")).toHaveText("509 / 509");
    await expect(caseExplorer.locator("[data-counter-from='0'][data-counter-to='99'] [aria-hidden='true']")).toHaveText("99 / 100");
  });
});
