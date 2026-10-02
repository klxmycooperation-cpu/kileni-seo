import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 2_560, height: 1_354, theme: "dark" },
  { name: "laptop", width: 1_440, height: 900, theme: "light" },
  { name: "tablet", width: 834, height: 1_112, theme: "signal" },
  { name: "mobile", width: 390, height: 844, theme: "dark" },
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

for (const viewport of VIEWPORTS) {
  test(`keeps every public URL geometrically consistent on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(1_800_000);
    const sitemapResponse = await page.request.get("/sitemap.xml");
    expect(sitemapResponse.ok()).toBe(true);
    const sitemapXml = await sitemapResponse.text();
    const publicPaths = [...new Set(
      [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => new URL(match[1]).pathname),
    )];
    expect(publicPaths.length).toBeGreaterThan(100);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate((theme) => window.localStorage.setItem("kileni:theme:v1", theme), viewport.theme);

    const failures: string[] = [];
    for (const path of publicPaths) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      if (!response || response.status() >= 400) {
        failures.push(`${path}: HTTP ${response?.status() ?? "no response"}`);
        continue;
      }

      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        window.scrollTo({ top: 0, behavior: "instant" });
      });

      const report = await inspectPageGeometry(page);
      if (report.length) failures.push(`${path}: ${report.join("; ")}`);
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
}

test("keeps semantic dark and action sections readable in the light theme", async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.setViewportSize({ width: 1_440, height: 900 });

  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });
  for (const selector of [".svc-assurance", ".svc-request-section"] as const) {
    const background = await page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(background, `${selector} must retain the surface that its light copy was designed for`).not.toBe("rgba(0, 0, 0, 0)");
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const homeCtaBackground = await page.locator(".warm-final-cta").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(homeCtaBackground, "the home final CTA must not leave white copy on the light route canvas").not.toBe("rgba(0, 0, 0, 0)");

  await page.goto("/blog/seo-audit-when-you-need-it", { waitUntil: "domcontentloaded" });
  const articleCtaBackground = await page.locator(".article-cta").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(articleCtaBackground, "the article CTA must retain its contrasting surface").not.toBe("rgba(0, 0, 0, 0)");

  for (const [path, selectors] of [
    ["/", [".home-process-section"]],
    ["/pricing", [".cp-hero"]],
    ["/cases/eco-santeh", [".cp-case-detail-hero", ".cp-result-section"]],
    ["/glossary", [".glossary-cta"]],
    ["/checks", [".glossary-cta"]],
    ["/about", [".about-hero", ".about-deliverables"]],
    ["/free-audit", [".page-dark-top"]],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    for (const selector of selectors) {
      const background = await page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(background, `${path} ${selector} must retain its intended contrasting surface`).not.toBe("rgba(0, 0, 0, 0)");
    }
  }

  for (const [path, surface] of [
    ["/pricing", ".cp-hero"],
    ["/cases/eco-santeh", ".cp-case-detail-hero"],
    ["/about", ".about-hero"],
    ["/contacts", ".page-dark-top"],
    ["/free-audit", ".page-dark-top"],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const contrast = await page.locator(`${surface} .canvas-text`).evaluate((element, surfaceSelector) => {
      const parse = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const normalized = value / 255;
          return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const surfaceElement = element.closest(surfaceSelector);
      if (!(surfaceElement instanceof HTMLElement)) return 0;
      const foreground = luminance(parse(getComputedStyle(element).color));
      const background = luminance(parse(getComputedStyle(surfaceElement).backgroundColor));
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    }, surface);
    expect(contrast, `${path} animated title must remain legible on its restored dark surface`).toBeGreaterThanOrEqual(3);
  }

  for (const path of ["/blog", "/blog/seo-audit-when-you-need-it"] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const contrast = await page.locator(".page-dark-top .canvas-text").evaluate((element) => {
      const parse = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const normalized = value / 255;
          return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
        });
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const surface = element.closest(".page-dark-top");
      if (!(surface instanceof HTMLElement)) return 0;
      const gradientStop = getComputedStyle(element).backgroundImage.match(/rgb\([^)]*\)/u)?.[0] ?? "";
      const foreground = luminance(parse(gradientStop));
      const background = luminance(parse(getComputedStyle(surface).backgroundColor));
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(contrast, `${path} animated title must remain legible on its light editorial surface`).toBeGreaterThanOrEqual(3);
  }
});

test("uses the shared title scale and stacked hub compositions at tablet widths", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1_112 });

  for (const [path, selector] of [
    ["/services", ".services-hub__hero-layout"],
    ["/seo", ".seo-hub__hero-grid"],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const columns = await page.locator(selector).evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns, `${path} must stack its hero instead of squeezing the title into a tablet column`).not.toContain(" ");
  }

  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });
  const serviceTitleSize = await page.locator(".svc-detail-copy h1").evaluate((element) => getComputedStyle(element).fontSize);
  await page.goto("/web-development", { waitUntil: "domcontentloaded" });
  const developmentTitleSize = await page.locator(".svc-detail-copy h1").evaluate((element) => getComputedStyle(element).fontSize);
  expect(developmentTitleSize, "service detail titles must use one shared role size").toBe(serviceTitleSize);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  const pageTitleSize = await page.locator("h1").evaluate((element) => getComputedStyle(element).fontSize);
  await page.goto("/free-audit", { waitUntil: "domcontentloaded" });
  const auditTitleSize = await page.locator(".audit-top .page-hero h1").evaluate((element) => getComputedStyle(element).fontSize);
  expect(auditTitleSize, "the free audit page must use the shared page-title scale").toBe(pageTitleSize);
});

async function inspectPageGeometry(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const horizontalOverflow = document.documentElement.scrollWidth - viewportWidth;
    if (horizontalOverflow > 1) issues.push(`document overflow ${horizontalOverflow}px`);

    const main = document.querySelector("#main-content");
    if (!(main instanceof HTMLElement) || main.getBoundingClientRect().height < 1) {
      issues.push("main content is missing or collapsed");
      return issues;
    }

    const selectors = [
      "#main-content h1",
      "#main-content h2",
      "#main-content h3",
      "#main-content button",
      "#main-content input",
      "#main-content select",
      "#main-content textarea",
      ".site-header .header-inner",
      ".site-footer .shell",
    ].join(",");

    const offenders = [...document.querySelectorAll<HTMLElement>(selectors)]
      .filter((element) => {
        if (element.matches("input[type='hidden'], .visually-hidden, [aria-hidden='true']")
          || element.closest(".honeypot, [aria-hidden='true']")) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (rect.left >= -1 && rect.right <= viewportWidth + 1) return false;
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (overflowX === "auto" || overflowX === "scroll") return false;
          parent = parent.parentElement;
        }
        return true;
      })
      .slice(0, 5)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = element.textContent?.trim().replace(/\s+/gu, " ").slice(0, 42) || element.tagName.toLowerCase();
        return `${label} [${Math.round(rect.left)}, ${Math.round(rect.right)}]`;
      });
    if (offenders.length) issues.push(`offscreen content: ${offenders.join(", ")}`);

    const clipped = [...document.querySelectorAll<HTMLElement>("#main-content h1, #main-content h2, #main-content h3")]
      .filter((element) => {
        if (element.matches(".visually-hidden, [aria-hidden='true']")) return false;
        const style = getComputedStyle(element);
        const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
        const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
        return (clipsX && element.scrollWidth > element.clientWidth + 1)
          || (clipsY && element.scrollHeight > element.clientHeight + 1);
      })
      .slice(0, 5)
      .map((element) => element.textContent?.trim().replace(/\s+/gu, " ").slice(0, 42) || element.tagName.toLowerCase());
    if (clipped.length) issues.push(`clipped headings: ${clipped.join(", ")}`);

    const duplicateIds = [...document.querySelectorAll<HTMLElement>("[id]")]
      .map((element) => element.id)
      .filter((id, index, ids) => id && ids.indexOf(id) !== index);
    if (duplicateIds.length) issues.push(`duplicate ids: ${[...new Set(duplicateIds)].slice(0, 5).join(", ")}`);

    return issues;
  });
}
