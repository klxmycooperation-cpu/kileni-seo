import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { completeClientReportFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";

const evidenceRoot = resolve(process.cwd(), "scratch/ui-qa/ux-polish-20260917");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("checks the corrected public routes across the requested viewport set", async ({ page }) => {
  // This intentionally revisits every route at every requested width. A cold
  // Next dev server can compile these states for several minutes, so the test
  // must fail on layout assertions rather than an unrelated global timeout.
  test.setTimeout(600_000);
  const widths = [320, 390, 768, 1280, 1440, 1600, 1920] as const;
  const routes = ["/about", "/brief#downloads", "/marketplaces", "/glossary/ctr", "/cases", "/free-audit"] as const;

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoHorizontalOverflow(page);
      await expect(page.locator("#main-content")).toBeVisible();
    }
  }
});

test("keeps the corrected surfaces legible in dark and light themes", async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate((value) => window.localStorage.setItem("kileni:theme:v1", value), theme);
    for (const route of ["/about", "/brief#downloads", "/marketplaces", "/glossary/ctr", "/cases"] as const) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
      await expectNoHorizontalOverflow(page);
      const headerText = await page.locator(".site-header .desktop-nav").evaluate((node) => getComputedStyle(node).color);
      expect(headerText).not.toBe("rgba(0, 0, 0, 0)");
      if (route === "/marketplaces" || route === "/glossary/ctr" || route === "/cases") {
        const card = page.locator(route === "/cases" ? ".cp-narrative-case" : route === "/marketplaces" ? ".marketplace-card" : ".glossary-item").first();
        const contrast = await card.evaluate((node) => {
          const text = node.querySelector<HTMLElement>("h2, h3") ?? node as HTMLElement;
          const parse = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
          const luminance = (rgb: number[]) => {
            const channels = rgb.map((value) => {
              const normalized = value / 255;
              return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
          };
          const foreground = luminance(parse(getComputedStyle(text).color));
          const background = luminance(parse(getComputedStyle(node).backgroundColor));
          return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test("captures the corrected public states for visual review", async ({ page }) => {
  test.setTimeout(420_000);
  await mkdir(evidenceRoot, { recursive: true });

  await page.setViewportSize({ width: 1920, height: 1119 });
  await page.goto("/");
  await screenshot(page, "00-home-hero-1920-dark.png");
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await screenshot(page, "00-home-footer-1920-dark.png");

  await page.goto("/about");
  await screenshot(page, "00-about-hero-1920-dark.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  await screenshot(page, "00-about-hero-1440-dark.png");

  await page.goto("/pricing");
  await expect(page.locator(".cp-tier-card").first()).toBeVisible();
  await page.locator(".cp-tier-card").first().evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await screenshot(page, "00-pricing-cards-1440-dark.png");

  await page.goto("/pricing?category=seo-promotion");
  await expect(page.locator(".cp-tier-card").first()).toBeVisible();
  await page.locator(".cp-tier-card").first().evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(page.locator(".cp-tier-card-price strong")).toHaveText([
    "от 25 500 ₽",
    "34 000 ₽",
    "от 59 500 ₽",
  ]);
  await screenshot(page, "00-pricing-promotion-1440-dark.png");

  await page.goto("/");
  await page.locator(".home-decision").scrollIntoViewIfNeeded();
  const decisionTabs = page.locator(".home-decision__tab");
  for (let index = 0; index < 3; index += 1) {
    await decisionTabs.nth(index).click();
    await screenshot(page, `00-home-format-${index + 1}-1440-dark.png`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/free-audit");
  await expect(page.getByLabel("Адрес сайта")).toBeInViewport();
  await expect(page.getByRole("button", { name: "Проверить бесплатно до 10 репрезентативных страниц сайта" })).toBeInViewport();
  await screenshot(page, "01-free-audit-mobile-390-dark.png");

  await page.goto("/about");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.locator(".site-tracing-beam")).toHaveAttribute("inert", "");
  await screenshot(page, "02-mobile-menu-390-dark.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  await page.locator(".about-actions").scrollIntoViewIfNeeded();
  await screenshot(page, "03-about-steps-1440-dark.png");

  await page.goto("/brief#downloads");
  await page.locator(".brief-downloads").scrollIntoViewIfNeeded();
  await screenshot(page, "04-brief-downloads-1440-dark.png");

  await page.goto("/glossary/ctr");
  await page.locator("section[aria-labelledby='related-glossary-title']").scrollIntoViewIfNeeded();
  await screenshot(page, "05-glossary-related-1440-dark.png");

  await page.goto("/cases");
  await page.locator(".analytics-errors-card").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);
  await screenshot(page, "06-case-growth-1440-dark.png");

  for (const [index, theme] of (["dark", "light"] as const).entries()) {
    await page.evaluate((value) => window.localStorage.setItem("kileni:theme:v1", value), theme);
    await page.goto("/marketplaces");
    await page.locator(".marketplace-grid").scrollIntoViewIfNeeded();
    await screenshot(page, `0${index + 7}-marketplaces-1440-${theme}.png`);
  }
});

test("checks and captures the completed audit summary and coverage state", async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(evidenceRoot, { recursive: true });
  const completedAudit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(completedAudit);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/audit/${completedAudit.publicToken}`);
  await expect(page.locator(".audit-complete--client")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await screenshot(page, "10-audit-summary-1440-dark.png");

  const coverage = page.locator(".audit-client-coverage-groups");
  await coverage.scrollIntoViewIfNeeded();
  await expect(coverage.getByRole("heading", { name: "Распределение страниц по группам" })).toBeVisible();
  await expect(coverage.locator(".audit-plain-note")).toBeVisible();
  await expect(coverage.locator(".audit-plain-note")).toContainText("Данные о покрытии не сохранены");
  await screenshot(page, "11-audit-coverage-1440-dark.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/audit/${completedAudit.publicToken}`);
  await expectNoHorizontalOverflow(page);
  await screenshot(page, "12-audit-summary-390-dark.png");
});

test("keeps the corrected pages stable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const route of ["/", "/cases", "/about"] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("#main-content")).toBeVisible();
  }
});

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: resolve(evidenceRoot, name), animations: "disabled", caret: "initial" });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}
