import { expect, test, type Page } from "@playwright/test";

async function useLightTheme(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "light");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
}

async function useDarkTheme(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "dark");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
}

test("aligns the audit page and gives its light pricing cards clear visual hierarchy", async ({ page }, testInfo) => {
  await useLightTheme(page);
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const heroTitle = page.locator(".service-10-seo-audit .svc-detail-copy h1 .canvas-text");
  await expect(heroTitle).toHaveText("Проверим сайт\nСоставим список работ");
  const heroMetrics = await heroTitle.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  expect(heroMetrics.fontSize).toBeGreaterThanOrEqual(80);
  expect(heroMetrics.height / heroMetrics.lineHeight).toBeGreaterThanOrEqual(1.9);
  expect(heroMetrics.height / heroMetrics.lineHeight).toBeLessThanOrEqual(2.1);
  await page.screenshot({ path: testInfo.outputPath("seo-audit-hero-desktop.png") });

  const cards = page.locator(".svc-package-grid > article");
  await expect(cards).toHaveCount(3);

  const secondCardLeft = await cards.nth(1).evaluate((element) => element.getBoundingClientRect().left);
  const alignedLeftEdges = await Promise.all([
    page.locator("#svc-overview-title").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#overview .svc-compact-heading > p:last-child").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#variants .svc-section-heading__copy").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#svc-assurance-title").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#assurance header > p:last-child").evaluate((element) => element.getBoundingClientRect().left),
    page.locator(".svc-faq-section .faq-list").evaluate((element) => element.getBoundingClientRect().left),
  ]);
  for (const left of alignedLeftEdges) expect(Math.abs(left - secondCardLeft)).toBeLessThanOrEqual(2);

  const heroColumns = await page.locator(".service-10-seo-audit .svc-detail-hero-grid").evaluate((element) => {
    const title = element.querySelector(".svc-detail-copy h1 .canvas-text");
    const kicker = element.querySelector(".svc-detail-copy .svc-kicker");
    const visual = element.querySelector(".svc-audit-journey");
    const titleRect = title?.getBoundingClientRect();
    const kickerRect = kicker?.getBoundingClientRect();
    const visualRect = visual?.getBoundingClientRect();
    return {
      titleBottom: titleRect?.bottom ?? 0,
      titleLeft: titleRect?.left ?? 0,
      kickerLeft: kickerRect?.left ?? 0,
      visualLeft: visualRect?.left ?? 0,
      visualTop: visualRect?.top ?? 0,
      titleTop: titleRect?.top ?? 0,
    };
  });
  expect(Math.abs(heroColumns.titleLeft - heroColumns.kickerLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(heroColumns.visualTop - heroColumns.titleTop)).toBeLessThanOrEqual(56);
  expect(heroColumns.visualLeft).toBeGreaterThan(heroColumns.titleLeft);

  await expect(cards.locator(".svc-package-highlights")).toHaveCount(3);
  await expect(cards.locator(".svc-package-highlight")).toHaveCount(6);
  await expect(cards.nth(0)).toContainText("Получите список найденных проблем на открытых страницах");
  await expect(cards.nth(1)).toContainText("задачи с адресами и критериями проверки");
  await expect(cards.nth(2)).toContainText("повторно проверим затронутые страницы");

  const cardSurfaces = await cards.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundImage,
      border: style.borderTopColor,
      overlay: getComputedStyle(element, "::before").content,
    };
  }));
  expect(new Set(cardSurfaces.map((surface) => surface.background)).size).toBeGreaterThanOrEqual(3);
  expect(new Set(cardSurfaces.map((surface) => surface.border)).size).toBeGreaterThanOrEqual(3);
  expect(cardSurfaces.every((surface) => surface.overlay === "none")).toBe(true);

  await expect(page.locator("#assurance .svc-assurance-grid article").nth(1).locator("li")).toHaveCount(4);
  await expect(page.locator("#assurance .svc-assurance-grid article").nth(1).locator("li").filter({ hasText: "Подтверждаем результат и оставшиеся ограничения." })).toBeVisible();

  const footerBlend = await page.locator(".site-footer").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      top: style.getPropertyValue("--footer-blend-top").trim(),
      background: style.backgroundImage,
      shadow: style.boxShadow,
    };
  });
  expect(footerBlend.top).toBe("#264cb2");
  expect(footerBlend.background).toContain("linear-gradient");
  expect(footerBlend.shadow).not.toBe("none");

  await page.locator("#overview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-overview-axis-desktop.png") });
  await page.locator("#variants").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-light-pricing-desktop.png") });
  await page.locator("#assurance").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-assurance-faq-desktop.png") });
  await page.locator("#request").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-footer-blend-desktop.png") });
});

test("keeps every line of the SEO-audit hero on one left axis", async ({ page }, testInfo) => {
  await useLightTheme(page);
  await page.setViewportSize({ width: 1280, height: 880 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const copy = page.locator(".service-10-seo-audit .svc-detail-copy");
  const title = copy.locator("h1 .canvas-text");
  const lines = title.locator(".svc-audit-title-line");

  await expect(lines).toHaveCount(2);

  const leftEdges = await Promise.all([
    copy.locator(".svc-kicker").evaluate((element) => element.getBoundingClientRect().left),
    lines.nth(0).evaluate((element) => element.getBoundingClientRect().left),
    lines.nth(1).evaluate((element) => element.getBoundingClientRect().left),
    copy.locator("h1 + p").evaluate((element) => element.getBoundingClientRect().left),
  ]);

  for (const left of leftEdges) expect(Math.abs(left - leftEdges[0])).toBeLessThanOrEqual(0.5);

  const [lastLineRight, journeyLeft] = await Promise.all([
    lines.nth(1).evaluate((element) => element.getBoundingClientRect().right),
    page.locator(".service-10-seo-audit .svc-audit-journey").evaluate((element) => element.getBoundingClientRect().left),
  ]);
  expect(lastLineRight).toBeLessThanOrEqual(journeyLeft - 16);

  await page.locator(".service-10-seo-audit .svc-detail-hero").screenshot({
    path: testInfo.outputPath("seo-audit-copy-axis-1280.png"),
  });
});

test("подсвечивает каждую цену SEO-аудита одинаково заметно в тёмной теме", async ({ page }, testInfo) => {
  await useDarkTheme(page);
  await page.setViewportSize({ width: 2560, height: 1354 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const cards = page.locator("#variants .svc-package-grid > article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Получите список найденных проблем на открытых страницах");
  await expect(cards.nth(1)).toContainText("задачи с адресами и критериями проверки");
  await expect(cards.nth(2)).toContainText("повторно проверим затронутые страницы");

  const priceStyles = await cards.locator(".svc-package-price").evaluateAll((prices) => prices.map((price) => {
    const style = getComputedStyle(price);
    return {
      color: style.color,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      textShadow: style.textShadow,
    };
  }));

  expect(priceStyles).toHaveLength(3);
  expect(new Set(priceStyles.map((price) => price.color)).size).toBe(3);
  expect(new Set(priceStyles.map((price) => price.fontSize)).size).toBe(1);
  expect(new Set(priceStyles.map((price) => price.fontWeight)).size).toBe(1);
  expect(priceStyles.every((price) => price.textShadow !== "none")).toBe(true);

  await page.locator("#variants").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-dark-pricing-desktop.png") });
});

test("keeps the polished audit composition readable on mobile", async ({ page }, testInfo) => {
  await useLightTheme(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const title = page.locator(".service-10-seo-audit .svc-detail-copy h1 .canvas-text");
  const mobileTitleMetrics = await title.evaluate((element) => {
    const heading = element.closest("h1");
    return {
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      titleWidth: element.getBoundingClientRect().width,
      availableWidth: heading?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(mobileTitleMetrics.fontSize).toBeGreaterThanOrEqual(34);
  expect(mobileTitleMetrics.titleWidth).toBeLessThanOrEqual(mobileTitleMetrics.availableWidth + 1);
  await expect(page.locator(".svc-package-highlight")).toHaveCount(6);
  await expect(page.locator("#assurance .svc-assurance-grid article").nth(1).locator("li")).toHaveCount(4);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);

  await page.locator("#variants").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-light-pricing-mobile.png") });
});

test("keeps the shared axis on laptop and stacks cleanly on tablet", async ({ page }, testInfo) => {
  await useLightTheme(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const laptopSecondCardLeft = await page.locator(".svc-package-grid > article").nth(1).evaluate((element) => element.getBoundingClientRect().left);
  const laptopAxis = await Promise.all([
    page.locator("#svc-overview-title").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#variants .svc-section-heading__copy").evaluate((element) => element.getBoundingClientRect().left),
    page.locator("#svc-assurance-title").evaluate((element) => element.getBoundingClientRect().left),
  ]);
  for (const left of laptopAxis) expect(Math.abs(left - laptopSecondCardLeft)).toBeLessThanOrEqual(2);

  const laptopHero = await page.locator(".service-10-seo-audit .svc-detail-hero-grid").evaluate((element) => {
    const title = element.querySelector(".svc-detail-copy h1 .canvas-text")?.getBoundingClientRect();
    const visual = element.querySelector(".svc-audit-journey")?.getBoundingClientRect();
    return { titleRight: title?.right ?? 0, visualLeft: visual?.left ?? 0 };
  });
  expect(laptopHero.visualLeft - laptopHero.titleRight).toBeGreaterThanOrEqual(20);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator("#overview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-laptop-axis.png") });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".service-10-seo-audit .svc-audit-journey")).toBeVisible();
  await page.locator("#overview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("seo-audit-tablet-axis.png") });
});

test("keeps the two-line audit title inside the tablet canvas", async ({ page }) => {
  await useLightTheme(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/seo-audit", { waitUntil: "domcontentloaded" });

  const titleMetrics = await page.locator(".service-10-seo-audit .svc-detail-copy h1").evaluate((heading) => {
    const title = heading.querySelector(".canvas-text");
    return {
      availableWidth: heading.getBoundingClientRect().width,
      titleWidth: title?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(titleMetrics.titleWidth).toBeLessThanOrEqual(titleMetrics.availableWidth + 1);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});
