import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("keeps the hero and header usable when a desktop window is halved", async ({ page }, testInfo) => {
  for (const width of [960, 1140]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".site-header .header-phone--desktop")).toBeVisible();
    await expect(page.locator(".site-header .language-link")).toBeVisible();
    const menu = page.locator(".site-header .menu-button");
    const desktopNavigation = page.locator(".site-header .desktop-nav");
    expect(await menu.isVisible() || await desktopNavigation.isVisible()).toBe(true);

    const geometry = await page.evaluate(() => {
      const copy = document.querySelector(".signal-hero .hero-copy")!.getBoundingClientRect();
      const dashboard = document.querySelector(".signal-hero .hero-tool")!.getBoundingClientRect();
      const title = document.querySelector(".signal-hero h1")!.getBoundingClientRect();
      return {
        copyRight: copy.right,
        dashboardLeft: dashboard.left,
        dashboardTop: dashboard.top,
        titleTop: title.top,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(geometry.dashboardLeft, `dashboard beside copy at ${width}px`).toBeGreaterThan(geometry.copyRight);
    expect(Math.abs(geometry.dashboardTop - geometry.titleTop), `columns begin together at ${width}px`).toBeLessThan(100);
    expect(geometry.horizontalOverflow, `no overflow at ${width}px`).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`hero-half-window-${width}.png`), fullPage: false });
  }
});

test("fits the desktop hero and keeps compact controls on a phone", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".signal-hero .hero-audit-surface")).toBeVisible();

  const desktop = await page.evaluate(() => {
    const dashboard = document.querySelector(".signal-hero .hero-audit-surface")!.getBoundingClientRect();
    return { dashboardBottom: dashboard.bottom, viewportHeight: window.innerHeight };
  });
  expect(desktop.dashboardBottom, "the complete dashboard should be visible at normal desktop size").toBeLessThanOrEqual(desktop.viewportHeight);
  await page.screenshot({ path: testInfo.outputPath("hero-full-window.png"), fullPage: false });

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator(".site-header .header-phone--desktop")).toBeVisible();
    await expect(page.locator(".site-header .language-link")).toBeVisible();
    await expect(page.locator(".site-header .theme-toggle:not(.theme-toggle--mobile)")).toBeVisible();
    if (width < 768) await expect(page.locator(".site-header .menu-button")).toBeVisible();
    else await expect(page.locator(".site-header .desktop-nav")).toBeVisible();
    const layout = await page.evaluate(() => {
      const header = document.querySelector(".site-header .header-inner")!.getBoundingClientRect();
      const menu = document.querySelector(".site-header .menu-button")!.getBoundingClientRect();
      return {
        headerRight: header.right,
        menuRight: menu.right,
        viewportWidth: document.documentElement.clientWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(layout.horizontalOverflow, `no page overflow at ${width}px`).toBe(false);
    expect(layout.menuRight, `menu fits inside header at ${width}px`).toBeLessThanOrEqual(layout.headerRight);
    expect(layout.headerRight, `header fits screen at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth);
    await expect.poll(() => page.evaluate(() => {
      const header = document.querySelector(".site-header .header-inner")!.getBoundingClientRect();
      const title = document.querySelector(".signal-hero h1")!.getBoundingClientRect();
      return title.top - header.bottom;
    }), { message: `heading clears header at ${width}px` }).toBeGreaterThanOrEqual(8);
    await page.screenshot({ path: testInfo.outputPath(`hero-phone-window-${width}.png`), fullPage: false });

    if (width === 320) {
      await page.locator(".site-header .menu-button").click();
      await expect(page.locator(".mobile-menu .mobile-menu-cta")).toBeVisible();
      await expect(page.locator(".mobile-menu .header-phone--mobile")).toBeVisible();
      await expect(page.locator(".mobile-menu .mobile-language-link")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("hero-phone-menu-320.png"), fullPage: false });
      await page.locator(".site-header .menu-button").click();
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".site-header .theme-toggle:not(.theme-toggle--mobile)").click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(page.locator(".site-header .header-phone--desktop")).toBeVisible();
  await expect(page.locator(".site-header .language-link")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("hero-phone-window-light.png"), fullPage: false });
});

test("keeps the first block inside short desktop and tablet viewports", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [width, height] of [[768, 844], [960, 720], [1140, 720], [1280, 720], [1728, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".signal-hero .hero-audit-surface")).toBeVisible();
    const layout = await page.evaluate(() => ({
      heroBottom: document.querySelector(".signal-hero")!.getBoundingClientRect().bottom,
      dashboardBottom: document.querySelector(".signal-hero .hero-audit-surface")!.getBoundingClientRect().bottom,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    expect(layout.horizontalOverflow, `horizontal overflow at ${width}×${height}`).toBe(false);
    expect(layout.dashboardBottom, `dashboard at ${width}×${height}`).toBeLessThanOrEqual(height + 1);
    expect(layout.heroBottom, `first block at ${width}×${height}`).toBeLessThanOrEqual(height + 1);
  }
});

test("offers the graph on demand while the mobile first block fits", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [width, height] of [[320, 844], [390, 844], [669, 988]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".signal-hero .hero-audit-surface")).toBeVisible();
    const preview = page.locator(".signal-hero .hero-preview-toggle");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveText(/Показать график/u);
    await expect(preview).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".signal-hero .hero-audit-visual-stack")).toBeHidden();
    const layout = await page.evaluate(() => ({
      heroBottom: document.querySelector(".signal-hero")!.getBoundingClientRect().bottom,
      formBottom: document.querySelector(".signal-hero .hero-form-wrap")!.getBoundingClientRect().bottom,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    expect(layout.horizontalOverflow, `horizontal overflow at ${width}×${height}`).toBe(false);
    expect(layout.formBottom, `form at ${width}×${height}`).toBeLessThanOrEqual(height + 1);
    expect(layout.heroBottom, `first block at ${width}×${height}`).toBeLessThanOrEqual(height + 1);
    await preview.click();
    await expect(preview).toHaveAttribute("aria-expanded", "true");
    await expect(preview).toHaveText(/Скрыть график/u);
    await expect(page.locator(".signal-hero .hero-audit-visual-stack")).toBeVisible();
  }
});

test("opens the audit form from the first-screen action on short phones", async ({ page }) => {
  for (const [width, height] of [[320, 568], [390, 667]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".signal-hero .hero-audit-surface")).toBeVisible();
    await expect(page.locator(".signal-hero .hero-form-wrap")).toBeHidden();
    const heroBottom = await page.locator(".signal-hero").evaluate((element) => element.getBoundingClientRect().bottom);
    expect(heroBottom, `first block at ${width}×${height}`).toBeLessThanOrEqual(height + 1);
    await page.locator(".signal-hero .hero-entry-actions a[href='#free-check']").click();
    await expect(page).toHaveURL(/#free-check$/u);
    await expect(page.locator(".signal-hero .hero-form-wrap")).toBeVisible();
    await expect(page.locator("#audit-url")).toBeVisible();
  }
});
