import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 720 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

const themes = ["dark", "signal", "light"] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

for (const viewport of viewports) {
  for (const theme of themes) {
    test(`keeps the home readable at ${viewport.width}x${viewport.height} in ${theme}`, async ({ page }) => {
      await page.addInitScript((palette) => {
        window.localStorage.setItem("kileni:theme:v1", palette);
      }, theme);
      await page.setViewportSize(viewport);
      // The assertions only need parsed HTML and applied critical styles. Waiting for
      // every lazy image/font makes this 48-navigation WebKit matrix depend on the
      // slowest unrelated resource and occasionally exhausts the per-test timeout.
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
      await expect(page.locator("#hero-title")).toBeVisible();
      await expect(page.locator(".site-header")).toBeVisible();

      const geometry = await page.evaluate(() => {
        const title = document.querySelector<HTMLElement>("#hero-title");
        const header = document.querySelector<HTMLElement>(".site-header");
        if (!title || !header) throw new Error("Stage A landmarks are missing");
        const titleRect = title.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const titleStyles = getComputedStyle(title);
        const lineHeight = Number.parseFloat(titleStyles.lineHeight);
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          titleFits: title.scrollWidth <= title.clientWidth + 1,
          titleLines: Number.isFinite(lineHeight) && lineHeight > 0 ? Math.round(titleRect.height / lineHeight) : 0,
          titleStartsAfterHeader: titleRect.top >= headerRect.bottom - 1,
          headerFits: headerRect.left >= -1 && headerRect.right <= window.innerWidth + 1,
        };
      });

      expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.titleFits).toBe(true);
      expect(geometry.titleLines).toBeLessThanOrEqual(viewport.width < 768 ? 5 : 3);
      expect(geometry.titleStartsAfterHeader).toBe(true);
      expect(geometry.headerFits).toBe(true);

      await page.goto("/services", { waitUntil: "domcontentloaded" });
      await expect(page.locator("main h1")).toBeVisible();
      const internalGeometry = await page.evaluate(() => {
        const title = document.querySelector<HTMLElement>("main h1");
        const header = document.querySelector<HTMLElement>(".site-header");
        if (!title || !header) throw new Error("Responsive landmarks are missing");
        const titleRect = title.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          titleFits: title.scrollWidth <= title.clientWidth + 1,
          titleStartsAfterHeader: titleRect.top >= headerRect.bottom - 1,
          headerFits: headerRect.left >= -1 && headerRect.right <= window.innerWidth + 1,
        };
      });
      expect(internalGeometry.pageWidth).toBeLessThanOrEqual(internalGeometry.viewportWidth);
      expect(internalGeometry.titleFits).toBe(true);
      expect(internalGeometry.titleStartsAfterHeader).toBe(true);
      expect(internalGeometry.headerFits).toBe(true);
    });
  }
}
