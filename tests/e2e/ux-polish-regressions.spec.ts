import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("uses one clean marketplace logo in a shared container in every theme", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marketplaces");

  const marks = page.locator(".marketplace-card .platform-mark");
  await expect(marks).toHaveCount(3);
  await expect(marks.locator(".platform-mark__fallback")).toHaveCount(0);
  await expect(marks.locator("img")).toHaveCount(3);

  for (const theme of ["dark", "signal", "light"] as const) {
    await page.evaluate((value) => {
      window.localStorage.setItem("kileni:theme:v1", value);
      document.documentElement.dataset.kileniTheme = value;
    }, theme);
    const dimensions = await marks.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const image = node.querySelector("img") as HTMLImageElement;
      const imageBox = image.getBoundingClientRect();
      return {
        ratio: box.width / box.height,
        contained: imageBox.width <= box.width && imageBox.height <= box.height,
      };
    }));
    expect(dimensions.every(({ ratio, contained }) => Math.abs(ratio - 8 / 3) < 0.04 && contained)).toBe(true);
  }
});

test("keeps the floating header clear of anchored content and legible in light theme", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "light"));
  await page.goto("/marketplaces#platforms");

  const header = page.locator(".site-header .header-inner");
  const target = page.locator("#platforms");
  const [headerBox, targetBox] = await Promise.all([header.boundingBox(), target.boundingBox()]);
  expect(headerBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height + 12);

  const contrast = await page.locator(".site-header .desktop-nav").evaluate((node) => {
    const link = node.querySelector("a") ?? node.querySelector("button");
    if (!(link instanceof HTMLElement)) return 0;
    const parse = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = luminance(parse(getComputedStyle(link).color));
    const background = luminance(parse(getComputedStyle(node.closest(".header-inner")!).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("uses balanced shared grids for about and brief sections", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");

  for (const selector of [".about-action-list", ".about-start-route"] as const) {
    const geometry = await page.locator(selector).evaluate((list) => {
      const items = [...list.children] as HTMLElement[];
      const tops = items.map((item) => Math.round(item.getBoundingClientRect().top));
      return { firstRow: tops.filter((top) => top === tops[0]).length, rows: new Set(tops).size };
    });
    expect(geometry).toEqual({ firstRow: 4, rows: 2 });
  }

  const roleRows = page.locator(".about-roles li");
  const roleGeometry = await roleRows.evaluateAll((rows) => rows.map((row) => {
    const number = row.firstElementChild!.getBoundingClientRect();
    return { height: Math.round(row.getBoundingClientRect().height), numberWidth: Math.round(number.width) };
  }));
  expect(new Set(roleGeometry.map(({ height }) => height)).size).toBe(1);
  expect(new Set(roleGeometry.map(({ numberWidth }) => numberWidth)).size).toBe(1);

  await page.goto("/brief#downloads");
  const widths = await page.locator(".brief-downloads .shell").evaluate((shell) => {
    const selector = shell.querySelector<HTMLElement>(".brief-download-selector")!;
    return { shell: shell.getBoundingClientRect().width, selector: selector.getBoundingClientRect().width };
  });
  expect(Math.abs(widths.shell - widths.selector)).toBeLessThanOrEqual(2);
});

test("keeps every homepage format fact readable without splitting words", async ({ page }) => {
  for (const width of [1440, 1920] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const tabs = page.locator(".home-decision__tab");

    for (let index = 0; index < 3; index += 1) {
      await tabs.nth(index).click();
      const facts = page.locator(`.home-decision__panel[data-route="${index}"] dl > div`);
      await expect(facts).toHaveCount(2);
      const geometry = await facts.evaluateAll((nodes) => nodes.map((node) => {
        const value = node.querySelector<HTMLElement>("dd")!;
        const style = getComputedStyle(value);
        return {
          cellWidth: node.getBoundingClientRect().width,
          overflowWrap: style.overflowWrap,
          wordBreak: style.wordBreak,
          clipped: value.scrollWidth > value.clientWidth + 1,
        };
      }));
      expect(geometry.every(({ cellWidth, overflowWrap, wordBreak, clipped }) => (
        cellWidth >= 96 && overflowWrap === "normal" && wordBreak === "normal" && !clipped
      )), JSON.stringify({ width, index, geometry }, null, 2)).toBe(true);
    }
  }
});

test("keeps glossary continuation compact and gives cards a real gap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/glossary/ctr");

  const primaryCards = page.locator(".glossary-hero + .glossary-grid .glossary-item");
  const cardBoxes = await primaryCards.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect()));
  expect(cardBoxes[1].left - cardBoxes[0].right).toBeGreaterThanOrEqual(16);

  const continuation = page.locator("section[aria-labelledby='related-glossary-title']");
  const relatedCount = await continuation.locator(".glossary-item").count();
  const relatedWidth = await continuation.locator(".glossary-item").first().evaluate((card) => card.getBoundingClientRect().width);
  if (relatedCount === 1) expect(relatedWidth).toBeGreaterThan(700);
  const continuationHeight = await continuation.evaluate((section) => section.getBoundingClientRect().height);
  expect(continuationHeight).toBeLessThan(620);
});

test("presents the case graph as growth in search visibility instead of falling errors", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cases");

  const chart = page.locator(".analytics-errors-card");
  await expect(chart).toHaveAttribute("aria-label", /рост.*(?:показ|видим)/iu);
  await expect(chart).not.toContainText(/ошибк|устранено/iu);
  await expect(chart).toContainText(/показ|видим|переход/iu);

  const points = await chart.locator(".analytics-detail-trend svg .analytics-visibility-detail__point").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("cy"))),
  );
  expect(points.at(-1)!).toBeLessThan(points[0]);
});

test("keeps the intro semantic and puts the free-audit action in the first mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?intro=1&preview=hold");
  await expect(page.locator(".brand-intro-v10__wordmark")).not.toHaveAttribute("aria-label");
  await expect(page.locator(".brand-intro-v10__wordmark")).toContainText("KILENI");

  await page.goto("/free-audit");
  const field = page.getByLabel("Адрес сайта");
  const action = page.getByRole("button", { name: "Проверить бесплатно до 10 репрезентативных страниц сайта" });
  await expect(field).toBeVisible();
  await expect(action).toBeVisible();
  const [fieldBox, actionBox] = await Promise.all([field.boundingBox(), action.boundingBox()]);
  expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(844);
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(844);
});

test("isolates the page while the mobile navigation dialog is open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  const isolatedPage = page.locator(".site-tracing-beam");
  await expect(isolatedPage).toHaveAttribute("inert", "");
  await expect(isolatedPage).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#mobile-menu")).toContainText("Услуги");
});

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("does not overflow the corrected public layouts on narrow screens", async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/about", "/brief#downloads", "/glossary/ctr", "/marketplaces", "/cases"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await noHorizontalOverflow(page);
    }
  }
});
