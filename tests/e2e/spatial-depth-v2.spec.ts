import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("shows a layered dark hero without moving the interactive surface", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(1800);
  const desktopSurface = page.locator(".signal-hero .hero-audit-surface");
  await expect(desktopSurface).toBeVisible();
  await expect(page.locator(".signal-hero .hero-audit-visual")).toBeVisible();
  const desktopDepth = await desktopSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      shadow: style.boxShadow,
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      animationIterationCount: style.animationIterationCount,
    };
  });
  expect(desktopDepth.transform).toBe("none");
  expect(desktopDepth.shadow).toContain("rgb");
  expect(desktopDepth.animationName).toBe("none");
  await page.screenshot({ path: "test-results/spatial-depth-v2/home-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(1800);
  const mobileDepth = await page.locator(".signal-hero .hero-audit-surface").evaluate((element) => getComputedStyle(element).transform);
  expect(mobileDepth).toBe("none");
  await page.screenshot({ path: "test-results/spatial-depth-v2/home-mobile.png" });
});

test("keeps the hero static and readable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const surface = page.locator(".signal-hero .hero-audit-surface");
  await expect(surface).toBeVisible();
  await expect(surface).toHaveCSS("transform", "none");
  await expect(page.locator(".signal-hero .hero-audit-visual")).toBeVisible();
});

test("keeps route surfaces flat and within the viewport for touch input", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
  const touchPage = await context.newPage();

  expect(await touchPage.evaluate(() => ({
    coarse: window.matchMedia("(pointer: coarse)").matches,
    noHover: window.matchMedia("(hover: none)").matches,
  }))).toEqual({ coarse: true, noHover: true });

  const routes = [
    { path: "/services?direction=seo", selectors: [".services-hub__trajectory", ".services-explorer__visual"] },
    { path: "/web-development", selectors: [".svc-build-composition"] },
    { path: "/marketplaces/wildberries", selectors: [".marketplace-docs", ".marketplace-cta", ".marketplace-result-example", ".marketplace-offer"] },
  ];

  for (const route of routes) {
    await touchPage.goto(route.path);
    for (const selector of route.selectors) {
      const surface = touchPage.locator(selector).first();
      await expect(surface).toBeVisible();
      await expect(surface).toHaveCSS("transform", "none");
      await expect(surface).toHaveCSS("backdrop-filter", "none");
    }
    const overflow = await touchPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }

  await touchPage.goto("/marketplaces", { waitUntil: "commit" });
  const marketplaceCard = touchPage.locator(".marketplace-card").first();
  await expect(marketplaceCard).toBeVisible();
  await marketplaceCard.tap();
  await expect(marketplaceCard).toHaveCSS("transform", "none");
  await expect(marketplaceCard).toHaveCSS("transition-duration", "0s");

  await context.close();
});

test("keeps services and marketplace surfaces flat with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });

  const routes = [
    { path: "/services?direction=seo", selectors: [".services-hub__trajectory", ".services-explorer__visual"] },
    { path: "/web-development", selectors: [".svc-build-composition"] },
    { path: "/marketplaces/wildberries", selectors: [".marketplace-docs", ".marketplace-cta", ".marketplace-result-example", ".marketplace-offer"] },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    for (const selector of route.selectors) {
      const surface = page.locator(selector).first();
      await expect(surface).toBeVisible();
      await expect(surface).toHaveCSS("transform", "none");
      await expect(surface).toHaveCSS("backdrop-filter", "none");
    }
  }
});

test("exposes the same depth hierarchy in the signal theme", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "signal");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marketplaces/wildberries");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  const docs = page.locator(".marketplace-docs");
  await expect(docs).toBeVisible();
  const surface = await docs.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundImage: style.backgroundImage, borderColor: style.borderColor };
  });
  expect(surface.backgroundImage).toContain("linear-gradient");
  expect(surface.borderColor).not.toBe("rgba(0, 0, 0, 0)");
});

test("keeps the hero audit surface stationary and interactive on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  const heroSurface = page.locator(".signal-hero .hero-audit-surface");
  const documentPosition = () => heroSurface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
  });
  const heroBefore = await documentPosition();
  const heroBox = await heroSurface.boundingBox();
  if (!heroBox) throw new Error("Hero surface is not measurable");
  await page.mouse.move(heroBox.x + heroBox.width / 2, heroBox.y + heroBox.height / 2);
  await page.waitForTimeout(650);
  const heroAfter = await documentPosition();
  expect(await heroSurface.evaluate((element) => element.matches(":hover"))).toBe(true);
  expect(heroAfter).toEqual(heroBefore);
  await expect(heroSurface).toHaveCSS("transform", "none");
  await expect(heroSurface.getByRole("button", { name: "Узнать, что мешает сайту" })).toBeVisible();

  await page.goto("/marketplaces");
  const card = page.locator(".marketplace-card").first();
  const cardBefore = await card.evaluate((element) => getComputedStyle(element).boxShadow);
  await card.hover();
  const cardAfter = await card.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(cardAfter).not.toBe(cardBefore);
});

test("keeps the opening animation controllable without delaying the hero controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?intro=1&preview=hold", { waitUntil: "domcontentloaded" });

  const surface = page.locator(".signal-hero .hero-audit-surface");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "preview");
  await expect(page.locator("[data-kileni-intro-start]")).toBeVisible();
  await page.screenshot({ path: "test-results/spatial-depth-v2/home-intro-first.png" });

  await page.locator("[data-kileni-intro-start]").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "play");
  await page.locator("[data-kileni-intro-skip]").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done");
  await expect(surface).toBeVisible();
  await expect(surface).toHaveCSS("transform", "none");
});
