import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/about",
  "/services",
  "/seo",
  "/seo-audit",
  "/seo-promotion",
  "/web-development",
  "/marketplaces",
  "/pricing",
  "/brief",
  "/cases",
  "/blog",
  "/glossary",
  "/free-audit",
  "/contacts",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

for (const viewport of [1280, 1440, 1600, 1920] as const) {
  test(`keeps every large editorial heading within five safe balanced lines at ${viewport}px`, async ({ page }) => {
    test.setTimeout(180_000);
    const offenders: Array<Record<string, string | number>> = [];
    await page.setViewportSize({ width: viewport, height: 1000 });
    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const headings = await measureLargeHeadings(page);
      for (const heading of headings) {
        if (heading.lines > 5 || heading.lineHeightRatio < 0.96) {
          offenders.push({ route, ...heading });
        }
      }
    }

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
}

for (const viewport of [320, 390, 768] as const) {
  test(`keeps headings readable and pages free of horizontal overflow at ${viewport}px`, async ({ page }) => {
    test.setTimeout(180_000);
    const offenders: Array<Record<string, string | number>> = [];
    await page.setViewportSize({ width: viewport, height: 844 });
    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) offenders.push({ route, viewport, defect: "horizontal-overflow", value: overflow });

      const headings = await measureLargeHeadings(page, 30);
      const maximumLines = viewport === 320 ? 9 : viewport === 390 ? 8 : 6;
      for (const heading of headings) {
        if (heading.lines > maximumLines || heading.lineHeightRatio < 0.96) {
          offenders.push({ route, viewport, defect: "heading-wrap", ...heading });
        }
      }
    }

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
}

async function measureLargeHeadings(page: Page, minimumFontSize = 40) {
  return page.locator("main h1, main h2").evaluateAll((nodes, minimumSize) => nodes.flatMap((node) => {
    const element = node as HTMLElement;
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    if (fontSize < minimumSize || element.offsetParent === null) return [];
    const lineHeight = Number.parseFloat(style.lineHeight);
    const box = element.getBoundingClientRect();
    return [{
      text: (element.textContent ?? "").replace(/\s+/gu, " ").trim().slice(0, 110),
      lines: Math.max(1, Math.round(box.height / lineHeight)),
      lineHeightRatio: Number((lineHeight / fontSize).toFixed(2)),
      width: Math.round(box.width),
    }];
  }), minimumFontSize);
}
