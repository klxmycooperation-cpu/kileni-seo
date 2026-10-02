import { expect, test, type Page } from "@playwright/test";

const coreRoutes = [
  "/",
  "/services",
  "/seo",
  "/seo-audit",
  "/seo-promotion",
  "/web-development",
  "/marketplaces",
  "/marketplaces/wildberries",
  "/pricing",
  "/cases",
  "/cases/kamenmis",
  "/blog",
  "/blog/seo-audit-when-you-need-it",
  "/glossary",
  "/glossary/ctr",
  "/checks",
  "/checks/page-title",
  "/brief",
  "/calculator",
  "/about",
  "/contacts",
  "/free-audit",
  "/privacy",
  "/consent",
] as const;

const viewports = [
  { width: 320, height: 568, label: "320px phone" },
  { width: 390, height: 844, label: "390px phone" },
  { width: 768, height: 1_024, label: "tablet portrait" },
  { width: 1_024, height: 768, label: "tablet landscape" },
  { width: 1_440, height: 900, label: "desktop" },
  { width: 2_560, height: 1_440, label: "wide desktop" },
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

for (const viewport of viewports) {
  test(`keeps the representative public page templates within the ${viewport.label} viewport`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);

    for (const path of coreRoutes) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#main-content"), `${path} at ${viewport.label}`).toBeVisible();

      const layout = await getViewportLayout(page);
      expect(layout.pageOverflow, `${path} should not create horizontal page overflow at ${viewport.label}`).toBeLessThanOrEqual(1);
      expect(layout.headerLeft, `${path} header should start inside the viewport at ${viewport.label}`).toBeGreaterThanOrEqual(-1);
      expect(layout.headerRight, `${path} header should end inside the viewport at ${viewport.label}`).toBeLessThanOrEqual(viewport.width + 1);
      expect(layout.offscreenElements, `${path} should keep controls and headings inside ${viewport.label}`).toEqual([]);
    }
  });
}

test("switches the shared header to a usable mobile menu before labels collide", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 390, 768, 1_024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    const menuButton = page.getByRole("button", { name: "Открыть меню" });
    if (width < 768) {
      await expect(menuButton, `menu at ${width}px`).toBeVisible();
      await expect(page.locator(".desktop-nav"), `desktop navigation at ${width}px`).toBeHidden();
      await menuButton.click();
      await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
    } else {
      await expect(menuButton, `menu at ${width}px`).toBeHidden();
      await expect(page.locator(".desktop-nav"), `desktop navigation at ${width}px`).toBeVisible();
      const overlap = await page.evaluate(() => document.querySelector(".desktop-nav")!.getBoundingClientRect().right
        - document.querySelector(".header-actions")!.getBoundingClientRect().left);
      expect(overlap, `navigation and actions at ${width}px`).toBeLessThanOrEqual(0);
    }
    expect((await getViewportLayout(page)).pageOverflow, `header at ${width}px`).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".desktop-nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeHidden();
});

test("keeps the approved Russian home headline line breaks independent of viewport width", async ({ page }) => {
  await page.setViewportSize({ width: 1_969, height: 1_021 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const headline = page.locator("#hero-title .hero-title-canvas");
  await expect(headline).toBeVisible();
  await expect(headline.locator("br")).toHaveCount(2);
  await expect(headline).toHaveText("Сайт естьПора сделать так,что бы его находили");
  await expect(headline.locator(".hero-title-canvas__line")).toHaveCount(3);

  const authoredLines = await headline.locator(".hero-title-canvas__line").evaluateAll((lines) =>
    lines.map((line) => line.textContent),
  );
  expect(authoredLines).toEqual([
    "Сайт\u00a0есть",
    "Пора\u00a0сделать\u00a0так,",
    "что\u00a0бы\u00a0его\u00a0находили",
  ]);

  const visualLineFragments = await headline.locator(".hero-title-canvas__line").evaluateAll((lines) => lines.map((line) => {
    const range = document.createRange();
    range.selectNodeContents(line);
    return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top * 100) / 100)).size;
  }));
  expect(visualLineFragments).toEqual([1, 1, 1]);

  const lineWrapping = await headline.locator(".hero-title-canvas__line").evaluateAll((lines) =>
    lines.map((line) => getComputedStyle(line).whiteSpace),
  );
  expect(lineWrapping).toEqual(["nowrap", "nowrap", "nowrap"]);
});

test("keeps the free-check details link fully readable at every supported width", async ({ page }) => {
  test.setTimeout(120_000);

  for (const width of [320, 390, 768, 1_024, 1_210, 1_440, 2_560]) {
    await page.setViewportSize({ width, height: 818 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const link = page.locator("#free-check .form-actions--first-step .text-link");
    await expect(link, `details link at ${width}px`).toBeVisible();
    const layout = await link.evaluate((element) => {
      const linkRect = element.getBoundingClientRect();
      const formRect = element.closest("form")?.getBoundingClientRect();
      return {
        clippedHorizontally: element.scrollWidth > element.clientWidth + 1,
        clippedVertically: element.scrollHeight > element.clientHeight + 1,
        linkLeft: linkRect.left,
        linkRight: linkRect.right,
        formLeft: formRect?.left ?? Number.POSITIVE_INFINITY,
        formRight: formRect?.right ?? Number.NEGATIVE_INFINITY,
      };
    });

    expect(layout.clippedHorizontally, `horizontal clipping at ${width}px`).toBe(false);
    expect(layout.clippedVertically, `vertical clipping at ${width}px`).toBe(false);
    expect(layout.linkLeft, `left edge at ${width}px`).toBeGreaterThanOrEqual(layout.formLeft);
    expect(layout.linkRight, `right edge at ${width}px`).toBeLessThanOrEqual(layout.formRight);
  }
});

test("keeps the longest free-audit headline word intact on a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/free-audit", { waitUntil: "domcontentloaded" });

  const wordLineCount = await page.locator(".audit-top h1").evaluate((heading) => {
    const target = "репрезентативных";
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const start = node.textContent?.indexOf(target) ?? -1;
      if (start >= 0) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + target.length);
        return range.getClientRects().length;
      }
      node = walker.nextNode();
    }
    return 0;
  });

  expect(wordLineCount).toBe(1);
});

test("keeps small-screen controls comfortable to tap and prevents form zoom", async ({ page }) => {
  test.setTimeout(180_000);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });

    for (const path of ["/", "/pricing", "/blog", "/brief", "/calculator", "/contacts", "/free-audit", "/about"] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const report = await page.evaluate(() => {
        const visible = (element: HTMLElement) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none"
            && style.visibility !== "hidden"
            && Number.parseFloat(style.opacity) > 0
            && rect.width > 0
            && rect.height > 0;
        };
        const label = (element: HTMLElement) => element.getAttribute("aria-label")
          || element.textContent?.trim().replace(/\s+/gu, " ").slice(0, 42)
          || element.tagName.toLowerCase();
        const compactControls = [...document.querySelectorAll<HTMLElement>("#main-content button, #main-content input, #main-content select, #main-content textarea, #main-content .button")]
          .filter((element) => visible(element) && !element.matches("input[type='hidden'], input[type='checkbox'], input[type='radio']") && !element.closest("[aria-hidden='true'], .honeypot"))
          .filter((element) => element.getBoundingClientRect().height < 43.5)
          .slice(0, 8)
          .map(label);
        const smallFields = [...document.querySelectorAll<HTMLElement>("#main-content input, #main-content select, #main-content textarea")]
          .filter((element) => visible(element) && !element.matches("input[type='hidden']") && !element.closest(".honeypot"))
          .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
          .slice(0, 8)
          .map(label);
        return { compactControls, smallFields };
      });

      expect(report.compactControls, `${path} tap targets at ${width}px`).toEqual([]);
      expect(report.smallFields, `${path} form text at ${width}px`).toEqual([]);
    }
  }
});

test("keeps the home composition on the same desktop canvas at 2048px and 2560px", async ({ page }) => {
  test.setTimeout(120_000);

  const desktopLayouts: Array<{ width: number; titleFontSize: number; headerWidth: number }> = [];

  for (const width of [2_048, 2_560]) {
    await page.setViewportSize({ width, height: 1_440 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const layout = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".signal-hero .shell");
      const header = document.querySelector<HTMLElement>(".site-header .header-inner");
      const grid = document.querySelector<HTMLElement>(".signal-hero .hero-grid");
      const copy = document.querySelector<HTMLElement>(".signal-hero .hero-copy");
      const tool = document.querySelector<HTMLElement>(".signal-hero .hero-tool");
      const title = document.querySelector<HTMLElement>("#hero-title");
      if (!shell || !header || !grid || !copy || !tool || !title) throw new Error("Expected home hero composition");

      const shellRect = shell.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      const toolRect = tool.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const titleTextRight = Math.max(...Array.from(title.querySelectorAll(".hero-title-canvas__line"), (line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        return Math.max(...Array.from(range.getClientRects(), (rect) => rect.right));
      }));
      return {
        shellWidth: shellRect.width,
        headerWidth: headerRect.width,
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        gridColumns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        copyLeft: copyRect.left,
        titleRight: titleRect.right,
        titleTextRight,
        toolLeft: toolRect.left,
        toolRight: toolRect.right,
      };
    });

    expect(layout.shellWidth, `hero shell at ${width}px`).toBeLessThanOrEqual(1_600);
    expect(layout.headerWidth, `header surface at ${width}px`).toBeLessThanOrEqual(1_360);
    expect(layout.gridColumns, `hero columns at ${width}px`).toBe(2);
    expect(layout.copyLeft, `copy stays inside the viewport at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(layout.titleRight, `headline container clears the audit card at ${width}px`).toBeLessThanOrEqual(layout.toolLeft - 16);
    expect(layout.titleTextRight, `headline text clears the audit card at ${width}px`).toBeLessThanOrEqual(layout.toolLeft - 16);
    expect(layout.toolRight, `audit card stays inside the viewport at ${width}px`).toBeLessThanOrEqual(width);
    desktopLayouts.push({ width, titleFontSize: layout.titleFontSize, headerWidth: layout.headerWidth });
  }

  expect(Math.abs(desktopLayouts[0].titleFontSize - desktopLayouts[1].titleFontSize), "headline must not jump at the 2000px breakpoint").toBeLessThanOrEqual(1);
  expect(Math.abs(desktopLayouts[0].headerWidth - desktopLayouts[1].headerWidth), "header must use the same desktop canvas").toBeLessThanOrEqual(1);
});

async function getViewportLayout(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) throw new Error("Expected shared site header");
    const rect = header.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const offscreenElements = [...document.querySelectorAll<HTMLElement>([
      "#main-content h1",
      "#main-content h2",
      "#main-content h3",
      "#main-content button",
      "#main-content input",
      "#main-content select",
      "#main-content textarea",
    ].join(","))]
      .filter((element) => {
        if (element.matches("input[type='hidden'], .visually-hidden, [aria-hidden='true']") || element.closest("[aria-hidden='true'], .honeypot")) return false;
        if (element.closest(".home-case-explorer__switch, .home-article-carousel__viewport, .cp-category-tabs, .svc-page-nav__inner, .article-topic-filter")) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) === 0) return false;
        const elementRect = element.getBoundingClientRect();
        if (elementRect.width === 0 || elementRect.height === 0) return false;
        if (elementRect.left >= -1 && elementRect.right <= viewportWidth + 1) return false;
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (overflowX === "auto" || overflowX === "scroll") return false;
          parent = parent.parentElement;
        }
        return true;
      })
      .slice(0, 5)
      .map((element) => element.textContent?.trim().replace(/\s+/gu, " ").slice(0, 48) || element.tagName.toLowerCase());
    return {
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerLeft: rect.left,
      headerRight: rect.right,
      offscreenElements,
    };
  });
}
