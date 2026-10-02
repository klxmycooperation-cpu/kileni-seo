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

test("uses the canvas text treatment on key public page headings only", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const routes = [
    ["/", "Сайт есть"],
    ["/services?direction=seo", "От проблемы"],
    ["/marketplaces", "Карточки, которые"],
    ["/free-audit", "Бесплатная экспресс-проверка"],
  ] as const;

  for (const [route, expectedHeading] of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const title = page.locator("h1 [data-canvas-text='true']");
    await expect(title).toBeVisible();
    await expect(title).toContainText(expectedHeading);
    await expect.poll(() => title.evaluate((element) => getComputedStyle(element).getPropertyValue("--canvas-text-pattern").startsWith("url("))).toBe(true);
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: testInfo.outputPath("home-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/services?direction=seo", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1 [data-canvas-text='true']")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("services-mobile.png") });
  await expect(page.locator("main h2 [data-canvas-text='true']")).toHaveCount(0);
});

test("keeps the home navigation available immediately on a compact desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1167, height: 540 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const menu = page.getByRole("button", { name: /Открыть меню/i });
  await expect(menu).toBeVisible({ timeout: 500 });
  await expect(menu).toBeEnabled();
  await menu.click();
  const cases = page.getByRole("link", { name: "Кейсы", exact: true }).last();
  await expect(cases).toBeVisible();
  await cases.click();
  await expect(page).toHaveURL(/\/cases$/);
});

test("keeps the requested brief and development hero composition on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1354 });

  await page.goto("/web-development", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".svc-detail-copy h1")).toHaveText("Спроектируем\nи сделаем сайт,\nготовый к рекламе и поиску");
  expect(await page.locator(".svc-detail-copy h1 .canvas-text").evaluate((element) => element.getClientRects().length)).toBe(3);

  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.goto("/brief", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".brief-hero-grid h1")).toHaveText("Расскажите о задаче\nСоберём предложение");
  expect(await page.locator(".brief-hero-grid h1 .canvas-text").evaluate((element) => element.getClientRects().length)).toBe(2);
  await expect(page.locator(".brief-hero-outcomes > li")).toHaveCount(5);
  await expect(page.locator(".brief-mobile-summary .brief-service-summary > span")).toHaveCount(0);

  const heroMetrics = await page.locator(".brief-hero-grid").evaluate((hero) => {
    const kicker = hero.querySelector<HTMLElement>(".brief-kicker")!;
    const title = hero.querySelector<HTMLElement>("h1")!;
    const note = hero.querySelector<HTMLElement>(".brief-hero-note")!;
    const outcomes = hero.querySelector<HTMLElement>(".brief-hero-outcomes")!;
    const summary = document.querySelector<HTMLElement>(".brief-mobile-summary .brief-service-summary")!;
    const kickerBox = kicker.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const outcomeBox = outcomes.getBoundingClientRect();
    const noteStyle = getComputedStyle(note);
    return {
      kickerOffset: kickerBox.left - titleBox.left,
      outcomesFillHeroColumn: outcomeBox.width / title.parentElement!.getBoundingClientRect().width,
      outcomeColumns: getComputedStyle(outcomes).gridTemplateColumns.split(" ").length,
      noteBackground: noteStyle.backgroundColor,
      summaryColumns: getComputedStyle(summary).gridTemplateColumns.split(" ").length,
    };
  });
  expect(heroMetrics.kickerOffset).toBeGreaterThanOrEqual(2);
  expect(heroMetrics.outcomesFillHeroColumn).toBeGreaterThanOrEqual(.95);
  expect(heroMetrics.outcomeColumns).toBe(5);
  expect(heroMetrics.noteBackground).not.toBe("rgb(247, 248, 252)");
  expect(heroMetrics.summaryColumns).toBe(1);
});

test("keeps the home hero density and canvas raster consistent across desktop displays", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const inspect = async (width: number, height: number, deviceScaleFactor: number, evidenceName: string) => {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.sessionStorage.setItem("kileni:intro:v9", "1");
      window.localStorage.setItem("kileni:theme:v1", "light");
      window.localStorage.setItem(
        "kileni-cookie-preferences:v2",
        JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
      );
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator("#hero-title .hero-title-canvas").evaluate((element) => (
      getComputedStyle(element).getPropertyValue("--canvas-text-pattern").startsWith("url(")
    ))).toBe(true);

    const metrics = await page.locator("#hero-title .hero-title-canvas").evaluate(async (element) => {
      const styles = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const shell = document.querySelector<HTMLElement>(".signal-hero .shell")?.getBoundingClientRect();
      const header = document.querySelector<HTMLElement>(".site-header .header-inner")?.getBoundingClientRect();
      const pattern = styles.getPropertyValue("--canvas-text-pattern");
      const patternUrl = pattern.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
      if (!shell || !header || !patternUrl) throw new Error("Hero density landmarks are missing");
      const raster = new Image();
      raster.src = patternUrl;
      await raster.decode();

      return {
        devicePixelRatio: window.devicePixelRatio,
        fontSize: Number.parseFloat(styles.fontSize),
        titleWidth: bounds.width,
        titleHeight: bounds.height,
        shellWidth: shell.width,
        headerWidth: header.width,
        rasterWidth: raster.naturalWidth,
        rasterHeight: raster.naturalHeight,
      };
    });
    await page.screenshot({ path: testInfo.outputPath(evidenceName), fullPage: false, caret: "initial" });
    await context.close();
    return metrics;
  };

  const retinaLaptop = await inspect(1728, 1117, 2, "home-retina-laptop.png");
  const wideDesktop = await inspect(2560, 1354, 1, "home-wide-desktop.png");

  expect(retinaLaptop.rasterWidth).toBeGreaterThanOrEqual(Math.floor(retinaLaptop.titleWidth * retinaLaptop.devicePixelRatio));
  expect(retinaLaptop.rasterHeight).toBeGreaterThanOrEqual(Math.floor(retinaLaptop.titleHeight * retinaLaptop.devicePixelRatio));
  expect(wideDesktop.fontSize / retinaLaptop.fontSize).toBeGreaterThanOrEqual(1.3);
  expect(wideDesktop.shellWidth / retinaLaptop.shellWidth).toBeGreaterThanOrEqual(1.35);
  expect(wideDesktop.headerWidth / retinaLaptop.headerWidth).toBeGreaterThanOrEqual(1.4);
});
