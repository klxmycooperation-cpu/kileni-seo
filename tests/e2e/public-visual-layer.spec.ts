import { expect, test } from "@playwright/test";

const representativeRoutes = [
  "/",
  "/services",
  "/marketplaces",
  "/free-audit",
  "/cases",
  "/blog",
  "/glossary",
  "/about",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("uses one inert visual backdrop across representative public routes", async ({ page }) => {
  test.slow();

  for (const path of representativeRoutes) {
    await page.goto(path);
    await expect(page.locator("main h1").first(), path).toBeVisible();
    const backdrop = page.locator(".kileni-site > .kileni-visual-backdrop");
    await expect(backdrop, path).toHaveCount(1);
    await expect(backdrop, path).toHaveAttribute("aria-hidden", "true");
    await expect(backdrop, path).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".site-header"), `${path} header`).toHaveCSS("position", "fixed");
  }
});

test("keeps representative public routes inside 320 and 390 pixel viewports", async ({ page }) => {
  test.slow();

  for (const path of representativeRoutes) {
    await page.setViewportSize({ width: 320, height: 820 });
    await page.goto(path);
    for (const width of [320, 390] as const) {
      await page.setViewportSize({ width, height: 820 });
      await expect(page.locator("main h1").first(), `${path} at ${width}px`).toBeVisible();
      const geometry = await page.evaluate(() => ({
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.pageWidth, `${path} at ${width}px`).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    }
  }
});

test("collapses shared motion to the final static state when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/marketplaces");

  await expect(page.locator(".marketplace-card").first()).toBeVisible();
  const motion = await page.locator(".kileni-site").evaluate((site) => ({
    fast: getComputedStyle(site).getPropertyValue("--kileni-motion-fast").trim(),
    cardTransition: getComputedStyle(document.querySelector<HTMLElement>(".marketplace-card")!).transitionDuration,
  }));

  expect(motion.fast).toBe("1ms");
  expect(motion.cardTransition.split(",").every((value) => Number.parseFloat(value) <= .001)).toBe(true);
});

test("keeps home navigation and document scrolling available while the forced intro plays", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
  });
  await page.goto("/?intro=1", { waitUntil: "commit" });
  await page.locator(".brand-intro-v10").waitFor({ state: "visible" });
  await page.waitForTimeout(100);

  const state = await page.evaluate(() => {
    const html = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header--home");
    const firstLink = header?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();
    return {
      intro: html.dataset.kileniIntro,
      overflow: getComputedStyle(html).overflow,
      headerVisibility: header ? getComputedStyle(header).visibility : "missing",
      headerOpacity: header ? getComputedStyle(header).opacity : "missing",
      focusedHeaderLink: document.activeElement === firstLink,
    };
  });

  expect(["pending", "play"]).toContain(state.intro);
  expect(state.overflow).not.toBe("hidden");
  expect(state.headerVisibility).toBe("visible");
  expect(Number(state.headerOpacity)).toBeGreaterThan(0);
  expect(state.focusedHeaderLink).toBe(true);
});

test("localizes the accessible intro label on the Russian and English home routes", async ({ page }) => {
  for (const [path, label] of [["/?intro=1", "Заставка KILENI"], ["/en/?intro=1", "KILENI intro"]] as const) {
    await page.goto(path, { waitUntil: "commit" });
    await page.locator(".brand-intro-v10").waitFor({ state: "visible" });
    await expect(page.locator(".brand-intro-v10")).toHaveAttribute("aria-label", label);
  }
});

test("shows the semantic SEO story before the site reveal", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
    window.sessionStorage.removeItem("kileni:intro:v9");
  });
  await page.goto("/?intro=1", { waitUntil: "commit" });
  const intro = page.locator(".brand-intro-v10");
  await intro.waitFor({ state: "visible" });
  await expect(intro.locator(".brand-intro-v10__surface")).toHaveAttribute("data-kileni-intro-story", "seo-visibility");
  await expect(intro.locator('[data-intro-phase="competitor-failing"]')).toHaveCount(1);
  await expect(intro.locator('[data-intro-phase="seo-recheck"]')).toHaveCount(1);
  await expect(intro.locator('[data-intro-phase="kileni-rising"]')).toHaveCount(1);
  await expect(intro.locator("[aria-hidden='true']")).toHaveCount(1);
  await page.mouse.wheel(0, 500);
  await expect(intro).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/logo-intro-story/01-competitor-failing.png", fullPage: false });
  await page.waitForTimeout(850);
  await expect(page.locator(".brand-intro-v10")).toBeVisible();
  await expect(page.locator(".site-header--home")).toBeVisible();
  await page.screenshot({ path: "test-results/logo-intro-story/02-kileni-site-reveal.png", fullPage: false });
  await expect(page.locator(".brand-intro-v10")).toHaveCount(0, { timeout: 5_000 });
});

test("localizes the visible intro caption and follows the selected theme", async ({ page }) => {
  for (const [localePath, caption, theme, surface, ink] of [
    ["/en/?intro=1", "The site is rising", "light", "#fff", "#0b132b"],
    ["/?intro=1", "Сайт поднимается", "dark", "#101d2f", "#f7f8fc"],
    ["/?intro=1", "Сайт поднимается", "signal", "#10261c", "#f7f8fc"],
  ] as const) {
    await page.addInitScript((selectedTheme) => {
      window.sessionStorage.removeItem("kileni:intro:v9");
      window.localStorage.setItem("kileni:theme:v1", selectedTheme);
    }, theme);
    await page.goto(localePath, { waitUntil: "commit" });
    await page.locator(".brand-intro-v10").waitFor({ state: "visible" });
    await expect(page.locator(".brand-intro-v10__caption")).toHaveText(caption);
    await expect(page.locator(".brand-intro-v10")).toHaveCSS("--intro-surface-center", surface);
    await expect(page.locator(".brand-intro-v10")).toHaveCSS("--intro-ink", ink);
  }
});

test("keeps the final KILENI frame when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?intro=1", { waitUntil: "commit" });
  const intro = page.locator(".brand-intro-v10");
  await intro.waitFor({ state: "visible" });
  await expect(intro.locator('[data-intro-phase="kileni-rising"]')).toBeVisible();
  await expect(intro.locator(".brand-intro-v10__wordmark")).toHaveText(/KILENI/);
});

test("localizes the intro action labels on the English preview", async ({ page }) => {
  await page.goto("/en/?intro=1&preview=hold", { waitUntil: "commit" });
  const skip = page.locator(".brand-intro-v10__skip");
  await expect(skip).toHaveText("Start animation");
  await skip.click();
  await expect(skip).toHaveText("Open site");
});
