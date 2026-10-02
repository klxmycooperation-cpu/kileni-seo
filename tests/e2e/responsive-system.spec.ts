import { expect, test, type Page } from "@playwright/test";

const desktopWidths = [1280, 1440, 1600, 1920, 2560] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("keeps the desktop composition stable at normal 100% browser widths", async ({ page }) => {
  test.setTimeout(240_000);
  const homeShellWidths: number[] = [];
  const homeHeadingSizes: number[] = [];
  const seoHeadingSizes: number[] = [];

  for (const width of desktopWidths) {
    await page.setViewportSize({ width, height: 900 });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const homeHeading = page.locator(".signal-hero h1");
    await expect(homeHeading).toBeVisible();
    homeShellWidths.push(await measureShellWidth(page));
    homeHeadingSizes.push(await homeHeading.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)));
    expect(await hasHorizontalOverflow(page), `home at ${width}px`).toBe(false);

    if (width === 2560) {
      const beam = await measureBeamPlacement(page);
      expect(beam.trackRight, "the decorative trace must stay in the outside gutter at 2560px").toBeLessThanOrEqual(beam.shellLeft);
      expect(beam.contentZIndex, "content must remain above the decorative trace").toBeGreaterThan(beam.trackZIndex);
    }

    await page.goto("/seo", { waitUntil: "domcontentloaded" });
    const heading = page.locator(".seo-hub__hero h1");
    await expect(heading).toBeVisible();
    seoHeadingSizes.push(await heading.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)));
    expect(await hasHorizontalOverflow(page), `SEO hub at ${width}px`).toBe(false);
  }

  expect(homeShellWidths.at(-1), "the 2560px desktop must keep the approved maximum canvas").toBeLessThanOrEqual(1_600);
  expect(Math.abs(homeShellWidths.at(-1)! - homeShellWidths.at(-2)!), "the desktop canvas must stay stable above 1920px").toBeLessThanOrEqual(1);
  expect(homeHeadingSizes.at(-1), "the home heading must retain the approved desktop scale").toBeGreaterThanOrEqual(60);
  expect(Math.abs(homeHeadingSizes.at(-1)! - homeHeadingSizes.at(-2)!), "the home heading must not jump above 1920px").toBeLessThanOrEqual(1);
  expect(seoHeadingSizes.at(-1), "the SEO heading must retain an editorial scale on a 2560px desktop").toBeGreaterThanOrEqual(90);
  expect(Math.max(...seoHeadingSizes) / Math.min(...seoHeadingSizes), "the SEO heading should grow predictably between desktop widths").toBeLessThanOrEqual(1.3);
});

async function measureShellWidth(page: Page) {
  return page.locator(".signal-hero .shell").evaluate((node) => {
    return node.getBoundingClientRect().width;
  });
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

async function measureBeamPlacement(page: Page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".signal-hero .shell");
    const track = document.querySelector(".site-tracing-beam__track");
    const content = document.querySelector(".site-tracing-beam__content");
    if (!(shell instanceof HTMLElement) || !(track instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      throw new Error("Expected the home shell and tracing beam to be present");
    }

    const shellRect = shell.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    return {
      shellLeft: shellRect.left,
      trackRight: trackRect.right,
      trackZIndex: Number.parseInt(getComputedStyle(track).zIndex, 10),
      contentZIndex: Number.parseInt(getComputedStyle(content).zIndex, 10),
    };
  });
}
